// Agent-curated memory.
//
// `memory.md` is a free-form list of durable facts the agent accumulates
// across sessions. Unlike `rules.md` (user-curated, fixed), memory is
// written by the agent itself via the `remember` tool and surfaces in the
// system prompt for every subsequent run.
//
// Two scopes:
//   - global    : ~/.config/shmakk/memory.md         — applies to all workspaces
//   - workspace : <cwd>/.shmakk/memory.md            — only this project
//
// Format (free-form markdown, agent picks sections):
//   ## Codebase
//   - [2026-05-20] Auth uses JWT signed with HS256, secret in $JWT_SECRET
//   - [2026-05-21] User table has soft-delete via `deleted_at` column
//
//   ## Gotchas
//   - [2026-05-22] vite.config.js needs base:'/foo/' for prod, '/' for dev

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_MEMORY_BYTES = 32 * 1024;   // 32KB hard cap per file
const MAX_FACT_LENGTH = 500;          // single fact length cap

function globalMemoryPath() {
  return path.join(os.homedir(), '.config', 'shmakk', 'memory.md');
}

function workspaceMemoryPath(cwd = process.cwd()) {
  return path.join(cwd, '.shmakk', 'memory.md');
}

function readMemoryFile(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const stat = fs.statSync(p);
    let raw = fs.readFileSync(p, 'utf8');
    if (stat.size > MAX_MEMORY_BYTES) {
      // Keep the most recent (bottom) entries
      raw = raw.slice(-MAX_MEMORY_BYTES);
      const firstHeading = raw.indexOf('\n## ');
      if (firstHeading >= 0) raw = raw.slice(firstHeading + 1);
    }
    raw = raw.trim();
    return raw || null;
  } catch {
    return null;
  }
}

// Returns combined memory text from both scopes (for display via `show memory`).
function loadMemory(cwd = process.cwd()) {
  const global = readMemoryFile(globalMemoryPath());
  const workspace = readMemoryFile(workspaceMemoryPath(cwd));
  if (!global && !workspace) return '';
  const parts = [];
  if (global) parts.push(`# Global memory (~/.config/shmakk/memory.md)\n\n${global}`);
  if (workspace) parts.push(`# Workspace memory (.shmakk/memory.md)\n\n${workspace}`);
  return parts.join('\n\n');
}

// Returns the memory block formatted for system prompt injection.
function renderMemoryForPrompt(cwd = process.cwd()) {
  const global = readMemoryFile(globalMemoryPath());
  const workspace = readMemoryFile(workspaceMemoryPath(cwd));
  if (!global && !workspace) return '';
  const blocks = [];
  if (global) blocks.push(global);
  if (workspace) blocks.push(`(workspace-specific):\n${workspace}`);
  return `AGENT MEMORY — facts accumulated from prior sessions. Use these to inform your work without re-discovering them. If a fact is wrong, use the \`remember\` tool to replace it.

${blocks.join('\n\n')}`;
}

// Append a fact to memory. Returns { ok, path, error }.
//   category : free-form section name (e.g. "Codebase", "Gotchas", "API quirks")
//   fact     : short single-line statement
//   scope    : 'global' | 'workspace'
function appendMemory({ category, fact, scope = 'global', cwd = process.cwd() }) {
  const cat = String(category || 'Notes').trim().replace(/[#\r\n]/g, '').slice(0, 60);
  const text = String(fact || '').trim().replace(/[\r\n]+/g, ' ').slice(0, MAX_FACT_LENGTH);
  if (!text) return { ok: false, error: 'fact is empty' };

  const target = scope === 'workspace'
    ? workspaceMemoryPath(cwd)
    : globalMemoryPath();

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    let current = '';
    if (fs.existsSync(target)) current = fs.readFileSync(target, 'utf8');
    if (!current.trim()) {
      current = '# shmakk memory\n\nFacts the agent has learned. Newest entries last.\n\n';
    }

    const date = new Date().toISOString().slice(0, 10);
    const line = `- [${date}] ${text}`;
    const heading = `## ${cat}`;

    // Append under existing heading or create new section at end
    if (current.includes(`\n${heading}\n`) || current.startsWith(`${heading}\n`)) {
      const re = new RegExp(`(^|\\n)(${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\n(?:[\\s\\S]*?))(\\n##\\s|$)`, 'm');
      current = current.replace(re, (_m, pre, body, after) => {
        const trimmed = body.replace(/\n+$/, '');
        return `${pre}${trimmed}\n${line}\n${after}`;
      });
    } else {
      if (!current.endsWith('\n')) current += '\n';
      current += `\n${heading}\n${line}\n`;
    }

    // Enforce size cap by trimming oldest
    if (Buffer.byteLength(current, 'utf8') > MAX_MEMORY_BYTES) {
      const lines = current.split('\n');
      while (Buffer.byteLength(lines.join('\n'), 'utf8') > MAX_MEMORY_BYTES && lines.length > 10) {
        // remove the first content line that isn't a heading
        let removed = false;
        for (let i = 4; i < lines.length; i++) {
          if (lines[i].startsWith('- ')) {
            lines.splice(i, 1);
            removed = true;
            break;
          }
        }
        if (!removed) break;
      }
      current = lines.join('\n');
    }

    fs.writeFileSync(target, current, 'utf8');
    return { ok: true, path: target, line };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Remove memory lines matching a substring or regex. Returns { removed, scopes }.
function forgetMemory(pattern, cwd = process.cwd()) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i');
  let removed = 0;
  const scopes = [];

  for (const [scope, target] of [['global', globalMemoryPath()], ['workspace', workspaceMemoryPath(cwd)]]) {
    if (!fs.existsSync(target)) continue;
    try {
      const lines = fs.readFileSync(target, 'utf8').split('\n');
      const kept = lines.filter((l) => {
        if (!l.startsWith('- ')) return true;  // keep non-fact lines (headings, etc.)
        if (re.test(l)) { removed++; return false; }
        return true;
      });
      fs.writeFileSync(target, kept.join('\n'), 'utf8');
      scopes.push({ scope, target });
    } catch {}
  }
  return { removed, scopes };
}

function memoryStatus(cwd = process.cwd()) {
  const gp = globalMemoryPath();
  const wp = workspaceMemoryPath(cwd);
  return {
    globalPath: gp,
    workspacePath: wp,
    globalExists: fs.existsSync(gp),
    workspaceExists: fs.existsSync(wp),
    globalBytes: fs.existsSync(gp) ? fs.statSync(gp).size : 0,
    workspaceBytes: fs.existsSync(wp) ? fs.statSync(wp).size : 0,
  };
}

module.exports = {
  loadMemory,
  renderMemoryForPrompt,
  appendMemory,
  forgetMemory,
  memoryStatus,
  globalMemoryPath,
  workspaceMemoryPath,
};
