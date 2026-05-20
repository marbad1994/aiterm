// User rules loader.
//
// Loads ~/.config/shmakk/rules.md (global) and .shmakk/rules.md (workspace)
// and merges them into a single block that gets injected near the top of
// the system prompt — so they take priority over default agent behavior.
//
// Workspace rules apply ON TOP of global rules (additive, not replacing).
// If both define conflicting guidance, workspace wins because it appears
// later in the prompt and is more specific to the current context.

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_RULES_BYTES = 16 * 1024; // 16KB hard cap per file

function globalRulesPath() {
  return path.join(os.homedir(), '.config', 'shmakk', 'rules.md');
}

function workspaceRulesPath(cwd = process.cwd()) {
  return path.join(cwd, '.shmakk', 'rules.md');
}

function readRulesFile(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const stat = fs.statSync(p);
    let raw = fs.readFileSync(p, 'utf8');
    if (stat.size > MAX_RULES_BYTES) {
      raw = raw.slice(0, MAX_RULES_BYTES) + '\n\n[... rules truncated at 16KB ...]';
    }
    raw = raw.trim();
    return raw || null;
  } catch {
    return null;
  }
}

// Returns the concatenated, raw rules text (for display via self-command).
function loadRules(cwd = process.cwd()) {
  const global = readRulesFile(globalRulesPath());
  const workspace = readRulesFile(workspaceRulesPath(cwd));
  if (!global && !workspace) return '';
  const parts = [];
  if (global) parts.push(`# Global rules (~/.config/shmakk/rules.md)\n\n${global}`);
  if (workspace) parts.push(`# Workspace rules (.shmakk/rules.md)\n\n${workspace}`);
  return parts.join('\n\n');
}

// Returns the rules block formatted for injection into the system prompt.
// Empty string if no rules — caller should append this with a leading
// newline so the prompt stays clean when there are no rules.
function renderRulesForPrompt(cwd = process.cwd()) {
  const global = readRulesFile(globalRulesPath());
  const workspace = readRulesFile(workspaceRulesPath(cwd));
  if (!global && !workspace) return '';
  const blocks = [];
  if (global) blocks.push(global);
  if (workspace) blocks.push(`(workspace-specific, takes precedence over global):\n${workspace}`);
  return `USER RULES — highest priority. Follow these in every response, every tool call, every code suggestion. They override the default agent behavior described later in this prompt.

${blocks.join('\n\n')}`;
}

// Returns a tiny diagnostic summary — used by `show rules` self-command.
function rulesStatus(cwd = process.cwd()) {
  const gp = globalRulesPath();
  const wp = workspaceRulesPath(cwd);
  const globalExists = fs.existsSync(gp);
  const workspaceExists = fs.existsSync(wp);
  const globalBytes = globalExists ? fs.statSync(gp).size : 0;
  const workspaceBytes = workspaceExists ? fs.statSync(wp).size : 0;
  return {
    globalPath: gp,
    workspacePath: wp,
    globalExists,
    workspaceExists,
    globalBytes,
    workspaceBytes,
  };
}

module.exports = {
  loadRules,
  renderRulesForPrompt,
  rulesStatus,
  globalRulesPath,
  workspaceRulesPath,
};
