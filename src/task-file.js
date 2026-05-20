// Task file management — reads and writes TASKS.md in the workspace root.
// Used during plan execution to track progress visibly in the project.
//
// Format:
//   # Tasks
//   ## Active
//   - [ ] **Title** — description
//   ## Done
//   - [x] ~~**Title**~~ (date)

const fs = require('fs');
const path = require('path');

const TEMPLATE = `# Tasks

## Active

## Waiting On

## Someday

## Done
`;

function taskFilePath(root) {
  return path.join(root, 'TASKS.md');
}

function ensureTaskFile(root) {
  const p = taskFilePath(root);
  if (!fs.existsSync(p)) {
    try { fs.writeFileSync(p, TEMPLATE, 'utf8'); } catch {}
  }
  return p;
}

function readContent(root) {
  const p = taskFilePath(root);
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : TEMPLATE;
  } catch { return TEMPLATE; }
}

function writeContent(root, content) {
  try { fs.writeFileSync(taskFilePath(root), content, 'utf8'); } catch {}
}

// Write all plan tasks into the Active section.
// Creates TASKS.md if it doesn't exist.
function addPlanTasks(root, plan) {
  ensureTaskFile(root);
  let content = readContent(root);

  const lines = [
    `\n**${plan.title}**`,
    ...plan.tasks.map((t) => `- [ ] **${t.title}**${t.description ? ` — ${t.description}` : ''}`),
    '',
  ].join('\n');

  // Insert after the ## Active heading (or append if not found)
  if (/^## Active$/m.test(content)) {
    content = content.replace(/^(## Active)$/m, `$1\n${lines}`);
  } else {
    content += `\n## Active\n${lines}`;
  }

  writeContent(root, content);
}

// Move a task from Active to Done (strikethrough + date).
function markTaskComplete(root, taskTitle, completedAt) {
  let content = readContent(root);
  if (!content) return;

  const date = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Escape regex special chars in title
  const esc = taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const activeRe = new RegExp(`^- \\[ \\] \\*\\*${esc}\\*\\*.*$`, 'm');
  const doneEntry = `- [x] ~~**${taskTitle}**~~ (${date})`;

  if (!activeRe.test(content)) return;

  // Remove from Active
  content = content.replace(activeRe, '');

  // Add to Done section (or append)
  if (/^## Done$/m.test(content)) {
    content = content.replace(/^(## Done)$/m, `$1\n${doneEntry}`);
  } else {
    content += `\n## Done\n${doneEntry}\n`;
  }

  // Clean up double blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  writeContent(root, content);
}

// Mark a task as skipped (note inline, leave in Active).
function markTaskSkipped(root, taskTitle) {
  let content = readContent(root);
  if (!content) return;

  const esc = taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  content = content.replace(
    new RegExp(`^(- \\[ \\] \\*\\*${esc}\\*\\*.*)$`, 'm'),
    `$1 ~~skipped~~`,
  );
  writeContent(root, content);
}

module.exports = { addPlanTasks, markTaskComplete, markTaskSkipped, taskFilePath, ensureTaskFile };
