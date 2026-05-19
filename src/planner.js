// Planner — detects complex multi-step requests and generates approval-first
// execution plans. The agent only runs after the user sees and approves the plan.
//
// Flow:
//   session receives input
//     → shouldPlan(input)? yes
//     → generatePlan(input) → plan JSON (via LLM)
//     → formatPlan(plan)    → display string
//     → user approves in session.js
//     → plan saved to active-plan.json
//     → execute each task with runAgent

const fs = require('fs');
const path = require('path');
const { makeClient, modelFor } = require('./llm');

// Inputs that look like complex multi-step work. Short inputs and simple
// one-word commands skip planning even if they contain one of these words.
const PLAN_TRIGGERS = [
  /\brefactor\b/i,
  /\bmigrat(e|ion)\b/i,
  /\bset\s+up\b/i,
  /\bimplement\b/i,
  /\bredesign\b/i,
  /\brewrite\b/i,
  /\breorganize\b/i,
  /\boverhaul\b/i,
  /\bconvert\s+\w+\s+to\b/i,
  /\bupdate\s+all\b/i,
  /\badd\s+(a\s+)?(new\s+)?(feature|system|module|service|component)\b/i,
  /\bbuild\s+(a\s+)?(new\s+)?(system|service|module|feature|app)\b/i,
  /\bcreate\s+(a\s+)?(new\s+)?(system|service|module|app|pipeline)\b/i,
  /\bclean\s+up\s+the\b/i,
  /\baudit\s+\w+/i,
  /\bintegrate\b/i,
];

// shouldPlan returns true for complex multi-step requests.
// Prefix input with '!' to bypass planning for any request.
function shouldPlan(input) {
  const text = String(input || '').trim();
  if (text.startsWith('!')) return false; // explicit bypass
  if (text.length < 60) return false;     // one-liners skip planning
  return PLAN_TRIGGERS.some((p) => p.test(text));
}

// generatePlan calls the LLM to decompose the user's request into a plan.
// Returns a plan object or throws.
async function generatePlan(input, { signal } = {}) {
  const client = makeClient('agent');
  const model = modelFor('agent');

  const systemPrompt = `You are a planning assistant that decomposes complex tasks into ordered steps.
Each step must be:
- Atomic: completable in one focused work session
- Specific: clear about what action is taken and why
- Ordered: each step builds on the previous

Output ONLY valid JSON. No prose before or after the JSON block.`;

  const userPrompt = `Break this task into 5-10 ordered steps:

"${input}"

Output format (JSON only, no other text):
{
  "title": "Short overall goal (under 60 chars)",
  "tasks": [
    {
      "id": "1",
      "title": "Short action title (under 10 words)",
      "description": "What this step does and why it is needed"
    }
  ]
}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
    stream: false,
  }, { signal });

  const raw = response.choices?.[0]?.message?.content || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('plan generation returned no valid JSON');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.tasks) || !parsed.tasks.length) {
    throw new Error('plan has no tasks');
  }

  return {
    id: Math.random().toString(36).slice(2, 10),
    title: String(parsed.title || 'Plan').slice(0, 80),
    status: 'pending_approval',
    currentTaskIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalRequest: String(input).slice(0, 500),
    tasks: parsed.tasks.slice(0, 15).map((t, i) => ({
      id: String(t.id || i + 1),
      title: String(t.title || `Step ${i + 1}`).slice(0, 100),
      description: String(t.description || '').slice(0, 300),
      status: 'pending',
      completedAt: null,
    })),
  };
}

// formatPlan produces a terminal-friendly plan display string.
function formatPlan(plan) {
  const STATUS_ICON = {
    completed: '\x1b[32m✓\x1b[0m',
    failed:    '\x1b[31m✗\x1b[0m',
    skipped:   '\x1b[33m–\x1b[0m',
    in_progress: '\x1b[36m▸\x1b[0m',
    pending:   ' ',
  };
  const sep = '─'.repeat(44);
  const lines = [
    '',
    `\x1b[1mPLAN: ${plan.title}\x1b[0m`,
    sep,
  ];
  for (const t of plan.tasks) {
    const icon = STATUS_ICON[t.status] || ' ';
    lines.push(`  ${icon} ${t.id}. ${t.title}`);
    if (t.description) {
      lines.push(`       \x1b[2m${t.description}\x1b[0m`);
    }
  }
  lines.push('');
  return lines.join('\r\n');
}

// Plan persistence — stored separately from the task journal so --show-plan
// can read it without interfering with per-task resume behavior.

function activePlanPath(root) {
  return path.join(root, '.shmakk', 'state', 'active-plan.json');
}

function savePlan(root, plan) {
  try {
    const p = activePlanPath(root);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }, null, 2));
  } catch {}
}

function loadPlan(root) {
  try {
    const p = activePlanPath(root);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function clearPlan(root) {
  try { fs.rmSync(activePlanPath(root), { force: true }); } catch {}
}

module.exports = { shouldPlan, generatePlan, formatPlan, savePlan, loadPlan, clearPlan, activePlanPath };
