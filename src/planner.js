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

// Questions and conversational inputs that should bypass planning.
// These get direct answers from the agent without plan overhead.
const SKIP_PLAN = [
  // Wh-questions: "what does X do", "how does Y work"
  /^(?:what|how|why|when|where|who|which)\s+(?:is|are|does|do|did|was|were|can|could|should|would|will)\b/i,
  // Ends with question mark (most natural questions)
  /\?$/,
  // Explanation requests without action
  /^(?:explain|describe|tell\s+me\s+(?:about|what|how)|show\s+me\s+(?:what|how)|what\s+is\s+(?:a\s+)?|what\s+are\s+|how\s+does\s+|how\s+do\s+)/i,
  // Conversational acknowledgements
  /^(?:yes|no|ok|okay|sure|thanks|thank\s+you|got\s+it|sounds\s+good|alright|great|perfect|cool|nice|agreed)\b/i,
  // Very short (one-liners under 30 chars almost never need a plan)
];

// Action verbs that signal implementation work — these get a plan.
const PLAN_SIGNALS = [
  /\b(?:add|create|build|implement|write|develop|generate)\b/i,
  /\b(?:fix|debug|resolve|solve|repair|patch|correct|handle)\b/i,
  /\b(?:refactor|rewrite|migrate|convert|update|upgrade|replace|rename|move)\b/i,
  /\b(?:set\s+up|configure|install|integrate|deploy|connect|wire\s+up|hook\s+up)\b/i,
  /\b(?:remove|delete|clean(?:\s+up)?|purge|strip|drop)\b/i,
  /\b(?:test|spec|cover|mock|stub|end.to.end)\b/i,
  /\b(?:document|comment|annotate|readme)\b/i,
  /\b(?:make|change|modify|edit|adjust|tweak)\b/i,
  /\b(?:optimize|improve|enhance|speed\s+up|reduce|minimize)\b/i,
  /\b(?:extract|split|merge|combine|consolidate|reorganize|restructure)\b/i,
  /\b(?:audit|review|inspect|analyse|analyze|scan)\b/i,
  /\b(?:enable|disable|toggle|switch|turn\s+on|turn\s+off)\b/i,
];

// shouldPlan returns true for any implementation/action task.
// Prefix input with '!' to bypass planning for any request.
function shouldPlan(input) {
  const text = String(input || '').trim();
  if (text.startsWith('!')) return false;          // explicit bypass
  if (text.length < 30) return false;              // definitely too short
  if (SKIP_PLAN.some((p) => p.test(text))) return false;  // question/conversational

  // Anything with an action signal gets a plan
  if (PLAN_SIGNALS.some((p) => p.test(text))) return true;

  // Long inputs that don't match skip patterns almost always need a plan
  return text.length >= 80;
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
