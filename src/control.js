// Control commands run from *inside* an shmakk session (the orchestrator
// puts its own PID in SHMAKK_PID for the child shell's environment).

function getParentPid() {
  const pid = parseInt(process.env.SHMAKK_PID || '0', 10);
  return pid > 0 ? pid : 0;
}

function profileSignalPath(pid) {
  return `/tmp/shmakk-profile-${pid}.txt`;
}

function taskJournalPath(cwd = process.cwd()) {
  return require('path').join(cwd, '.shmakk', 'state', 'task-journal.json');
}

function activeSkillMetaPath(cwd = process.cwd()) {
  return require('path').join(cwd, '.shmakk', 'state', 'active-skill.json');
}

function activePlanPath(cwd = process.cwd()) {
  return require('path').join(cwd, '.shmakk', 'state', 'active-plan.json');
}

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function status() {
  const pid = getParentPid();
  if (!pid) {
    process.stdout.write('shmakk: not running (this terminal is not inside shmakk)\n');
    return 1;
  }
  if (!isAlive(pid)) {
    process.stdout.write(`shmakk: stale SHMAKK_PID=${pid} (parent not alive)\n`);
    return 2;
  }
  process.stdout.write(`shmakk: running, parent pid ${pid}\n`);
  return 0;
}

function exitParent() {
  const pid = getParentPid();
  if (!pid || !isAlive(pid)) {
    process.stderr.write('shmakk --exit: not inside an shmakk session\n');
    return 1;
  }
  try { process.kill(pid, 'SIGTERM'); } catch (e) {
    process.stderr.write(`shmakk --exit: ${e.message}\n`); return 1;
  }
  return 0;
}

function restartParent() {
  const pid = getParentPid();
  if (!pid || !isAlive(pid)) {
    process.stderr.write('shmakk --restart: not inside an shmakk session\n');
    return 1;
  }
  try { process.kill(pid, 'SIGUSR1'); } catch (e) {
    process.stderr.write(`shmakk --restart: ${e.message}\n`); return 1;
  }
  return 0;
}

function resetConversation() {
  const pid = getParentPid();
  if (!pid || !isAlive(pid)) {
    process.stderr.write('shmakk --reset: not inside an shmakk session\n');
    return 1;
  }
  try { process.kill(pid, 'SIGUSR2'); } catch (e) {
    process.stderr.write(`shmakk --reset: ${e.message}\n`); return 1;
  }
  return 0;
}

function setProfileAndRestart(profileName) {
  const pid = getParentPid();
  if (!pid || !isAlive(pid)) {
    process.stderr.write('shmakk --profile-set: not inside an shmakk session\n');
    return 1;
  }
  const name = String(profileName || '').trim().toLowerCase();
  if (!name) {
    process.stderr.write('shmakk --profile-set: missing profile name\n');
    return 1;
  }
  try {
    require('fs').writeFileSync(profileSignalPath(pid), name + '\n', 'utf8');
    process.kill(pid, 'SIGUSR1');
  } catch (e) {
    process.stderr.write(`shmakk --profile-set: ${e.message}\n`);
    return 1;
  }
  return 0;
}

function resumeStatus() {
  const p = taskJournalPath();
  try {
    const fs = require('fs');
    if (!fs.existsSync(p)) {
      process.stdout.write('shmakk: no resume journal found\n');
      return 0;
    }
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    process.stdout.write('shmakk resume status\n');
    process.stdout.write('--------------------\n');
    process.stdout.write(`status: ${j.status || 'unknown'}\n`);
    process.stdout.write(`profile: ${j.profile || 'unknown'}\n`);
    process.stdout.write(`updated: ${j.updatedAt || 'unknown'}\n`);
    process.stdout.write(`input: ${String(j.input || '').slice(0, 120)}\n`);
    process.stdout.write(`touched_files: ${Array.isArray(j.touchedFiles) ? j.touchedFiles.length : 0}\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`shmakk --resume-status: ${e.message}\n`);
    return 1;
  }
}

function compactContext() {
  const pid = getParentPid();
  if (pid && isAlive(pid)) {
    try { process.kill(pid, 'SIGUSR2'); } catch (e) {
      process.stderr.write(`shmakk --compact: ${e.message}\n`);
      return 1;
    }
    process.stdout.write('shmakk: compact requested (conversation + task journal cleared)\n');
    return 0;
  }

  try {
    const fs = require('fs');
    fs.rmSync(taskJournalPath(), { force: true });
    process.stdout.write('shmakk: compacted local task journal (no active session)\n');
    return 0;
  } catch (e) {
    process.stderr.write(`shmakk --compact: ${e.message}\n`);
    return 1;
  }
}

function stats() {
  const fs = require('fs');
  const audit = require('./audit');
  const pid = getParentPid();
  const running = !!(pid && isAlive(pid));
  let journal = null;
  let activeSkill = null;
  let auditLines = 0;

  try {
    const p = taskJournalPath();
    if (fs.existsSync(p)) journal = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  try {
    const p = activeSkillMetaPath();
    if (fs.existsSync(p)) activeSkill = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  try {
    const p = audit.logPath();
    if (fs.existsSync(p)) auditLines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).length;
  } catch {}

  process.stdout.write('shmakk stats\n');
  process.stdout.write('-----------\n');
  process.stdout.write(`session_running: ${running ? 'yes' : 'no'}\n`);
  process.stdout.write(`session_pid: ${running ? pid : 'n/a'}\n`);
  process.stdout.write(`resume_status: ${journal?.status || 'none'}\n`);
  process.stdout.write(`resume_updated: ${journal?.updatedAt || 'n/a'}\n`);
  process.stdout.write(`resume_touched_files: ${Array.isArray(journal?.touchedFiles) ? journal.touchedFiles.length : 0}\n`);
  process.stdout.write(`profile: ${journal?.profile || 'n/a'}\n`);
  process.stdout.write(`active_skill: ${activeSkill?.name || 'none'}\n`);
  process.stdout.write(`active_skill_loaded_at: ${activeSkill?.loadedAt || 'n/a'}\n`);
  process.stdout.write(`audit_events_total: ${auditLines}\n`);
  process.stdout.write('token_stats: unavailable (provider usage streaming not persisted yet)\n');
  return 0;
}

function loadSkill(name, global = false) {
  const skills = require('./skills');
  const fn = global ? skills.loadSkillGlobally : skills.loadSkillToWorkspace;
  const res = global ? fn(name) : fn(name, process.cwd());
  if (!res.ok) {
    process.stderr.write(`shmakk --load-skill: ${res.error}\n`);
    if (res.searched) process.stderr.write(`searched:\n- ${res.searched.join('\n- ')}\n`);
    return 1;
  }
  process.stdout.write(`shmakk: loaded skill '${res.name}' (${global ? 'global' : 'workspace'})\n`);
  process.stdout.write(`source: ${res.source}\n`);
  process.stdout.write(`local: ${res.localPath}\n`);
  return 0;
}

function listSkills() {
  const skills = require('./skills');
  const workspace = skills.listSkills(process.cwd());
  const global = skills.listSkillsGlobally();

  if (!workspace.length && !global.length) {
    process.stdout.write('shmakk: no skills loaded\n');
    return 0;
  }

  process.stdout.write('shmakk skills\n');
  process.stdout.write('--------------\n');

  if (workspace.length) {
    process.stdout.write('[workspace]\n');
    for (const s of workspace) {
      process.stdout.write(`- ${s.name}${s.version ? ` v${s.version}` : ''}${s.active ? ' [active]' : ''}\n`);
    }
  }

  if (global.length) {
    if (workspace.length) process.stdout.write('\n');
    process.stdout.write('[global]\n');
    for (const s of global) {
      process.stdout.write(`- ${s.name}${s.version ? ` v${s.version}` : ''}${s.active ? ' [active]' : ''}\n`);
    }
  }

  return 0;
}

function skillStatus() {
  const skills = require('./skills');
  const wst = skills.skillStatus(process.cwd());
  const gst = skills.skillStatusGlobally();
  const total = wst.total + gst.total;
  const active = wst.active || gst.active;

  process.stdout.write('shmakk skill status\n');
  process.stdout.write('-------------------\n');
  process.stdout.write(`total: ${total}\n`);
  if (!active) {
    process.stdout.write('active: none\n');
    return 0;
  }
  process.stdout.write(`active: ${active.name}\n`);
  process.stdout.write(`version: ${active.version}\n`);
  process.stdout.write(`loaded_at: ${active.loadedAt || 'n/a'}\n`);
  process.stdout.write(`bytes: ${active.bytes || 0}\n`);
  process.stdout.write(`source: ${active.source || 'n/a'}\n`);
  return 0;
}

function unloadSkill(name) {
  const skills = require('./skills');
  // Try workspace first
  let res = skills.unloadSkill(name, process.cwd());
  let location = 'workspace';
  // If not in workspace, try global
  if (!res.ok) {
    res = skills.unloadSkillGlobally(name);
    location = 'global';
  }
  if (!res.ok) {
    process.stderr.write(`shmakk --unload-skill: ${res.error}\n`);
    return 1;
  }
  process.stdout.write(`shmakk: unloaded skill '${res.name}' from ${location}\n`);
  return 0;
}

async function installSkill(url, global = false) {
  const skills = require('./skills');
  const fn = global ? skills.installSkillFromUrlGlobally : skills.installSkillFromUrl;
  const res = global ? await fn(url) : await fn(url, process.cwd());
  if (!res.ok) {
    process.stderr.write(`shmakk --install-skill: ${res.error}\n`);
    return 1;
  }
  process.stdout.write(`shmakk: installed + loaded skill '${res.name}' (${global ? 'global' : 'workspace'})\n`);
  process.stdout.write(`source: ${res.source}\n`);
  process.stdout.write(`local: ${res.localPath}\n`);
  return 0;
}

function showPlan() {
  const fs = require('fs');
  const p = activePlanPath();
  try {
    if (!fs.existsSync(p)) {
      process.stdout.write('shmakk: no active plan\n');
      return 0;
    }
    const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
    const STATUS_CHAR = { completed: '✓', failed: '✗', skipped: '–', in_progress: '▸', pending: ' ' };
    process.stdout.write(`shmakk plan: ${plan.title}\n`);
    process.stdout.write(`status: ${plan.status || 'unknown'} · updated: ${(plan.updatedAt || '').slice(0, 19)}\n`);
    process.stdout.write('─'.repeat(44) + '\n');
    for (const t of plan.tasks || []) {
      const icon = STATUS_CHAR[t.status] || ' ';
      process.stdout.write(`  ${icon} ${t.id}. ${t.title}\n`);
    }
    const done = (plan.tasks || []).filter((t) => t.status === 'completed').length;
    const total = (plan.tasks || []).length;
    process.stdout.write(`\n${done}/${total} tasks completed\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`shmakk --show-plan: ${e.message}\n`);
    return 1;
  }
}

function mcpStatus() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const globalPath = path.join(os.homedir(), '.config', 'shmakk', 'mcp.json');
  const workspacePath = path.join(process.cwd(), '.shmakk', 'mcp.json');
  let globalConfig = null;
  let workspaceConfig = null;

  try {
    if (fs.existsSync(globalPath)) globalConfig = JSON.parse(fs.readFileSync(globalPath, 'utf8'));
  } catch {}
  try {
    if (fs.existsSync(workspacePath)) workspaceConfig = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
  } catch {}

  const globalServers = globalConfig?.mcpServers || {};
  const workspaceServers = workspaceConfig?.mcpServers || {};
  const merged = { ...globalServers, ...workspaceServers };
  const names = Object.keys(merged);

  process.stdout.write('shmakk MCP status\n');
  process.stdout.write('─────────────────\n');
  process.stdout.write(`config (global):    ${fs.existsSync(globalPath) ? globalPath : 'not found'}\n`);
  process.stdout.write(`config (workspace): ${fs.existsSync(workspacePath) ? workspacePath : 'not found'}\n`);
  process.stdout.write(`servers configured: ${names.length}\n`);

  if (!names.length) {
    process.stdout.write('\nNo MCP servers configured.\n');
    process.stdout.write(`Create ${globalPath} with:\n`);
    process.stdout.write('  { "mcpServers": { "name": { "command": "...", "args": [...] } } }\n');
    return 0;
  }

  process.stdout.write('\n');
  for (const name of names) {
    const cfg = merged[name];
    const disabled = cfg.disabled ? ' [disabled]' : '';
    const source = workspaceServers[name] ? 'workspace' : 'global';
    process.stdout.write(`  ${name}${disabled} (${source})\n`);
    process.stdout.write(`    command: ${cfg.command} ${(cfg.args || []).join(' ')}\n`);
    if (cfg.safety) process.stdout.write(`    safety:  ${cfg.safety}\n`);
    if (cfg.safeTools?.length) process.stdout.write(`    safe:    ${cfg.safeTools.join(', ')}\n`);
    if (cfg.env && Object.keys(cfg.env).length) {
      process.stdout.write(`    env:     ${Object.keys(cfg.env).join(', ')}\n`);
    }
  }

  process.stdout.write('\nNote: tool counts are only available during an active shmakk session.\n');
  return 0;
}

module.exports = { status, exitParent, restartParent, resetConversation, setProfileAndRestart, profileSignalPath, resumeStatus, compactContext, stats, loadSkill, listSkills, skillStatus, unloadSkill, installSkill, showPlan, mcpStatus };
