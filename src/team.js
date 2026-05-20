// Multi-agent project team orchestration.
//
// When a task spans multiple domains (frontend + backend, design + code, etc.)
// the Project Manager (PM) agent plans the team, spawns specialists in parallel,
// and synthesizes a unified result.
//
// Architecture:
//   session.js detects multi-domain task
//     → runTeam() called
//     → PM makes one LLM call → produces JSON team plan
//     → specialists run in parallel (Promise.all, each with buffered write)
//     → PM makes one final LLM call → synthesizes results
//     → summary written to terminal
//
// runTeam() returns true if team handled the task, false if PM declined
// (caller should fall through to single-agent execution).

const { makeClient, modelFor, isConfigured } = require('./llm');
const { runAgent } = require('./agent');
const { matchWorkflow, expandWorkflow } = require('./workflows');

// ── Specialist catalog ────────────────────────────────────────────────────────

const AGENT_ROSTER = {
  frontend: {
    profile: 'builder',
    hint: `Specialist: Frontend Engineer
Languages/frameworks: React, Vue, Angular, Svelte, Next.js, HTML5, CSS3, TypeScript.
Focus: component architecture, state management, responsive layouts, accessibility (WCAG 2.1), Core Web Vitals, bundle size.
Guidelines:
- Inspect existing component structure before creating new ones. Match conventions in use.
- Prefer composition. Keep components small and single-purpose.
- Follow the project's styling methodology (Tailwind, CSS modules, styled-components, SCSS, BEM).
- Every interactive element: keyboard-accessible, correct ARIA, visible focus state.
- Check for unnecessary re-renders, missing memoization, large lists without virtualization.`,
  },

  backend: {
    profile: 'builder',
    hint: `Specialist: Backend Engineer
Languages/frameworks: Node.js, Python, Go, Java, FastAPI, Express, NestJS, Django, Rails.
Focus: API design (REST/GraphQL), database modeling, authentication, caching, error handling, security.
Guidelines:
- Read existing routes, models, and middleware before adding new ones.
- Every endpoint: input validation, meaningful error responses, rate limiting consideration.
- Databases: check for N+1 queries, missing indexes on foreign keys and filter columns.
- Auth: prefer established libraries. Validate tokens on every protected route.
- Async: always handle rejections, use retry logic with exponential backoff.`,
  },

  ux: {
    profile: 'balanced',
    hint: `Specialist: UX/UI Designer
Focus: user flows, information architecture, interaction design, usability, accessibility, design critique.
Guidelines:
- Start with the user's goal and work backwards to the interface.
- Map the full journey before designing individual screens: entry → action → exit.
- For every decision: what is the user trying to do? What could go wrong? How do they recover?
- Identify friction: too many steps, ambiguous labels, inconsistent patterns, missing feedback.
- Accessibility: sufficient contrast (≥4.5:1), keyboard navigation, screen reader support, 44px touch targets.
- Propose 2–3 alternatives for significant interaction patterns, with tradeoffs.`,
  },

  design: {
    profile: 'balanced',
    hint: `Specialist: Visual Designer & Design Systems
Focus: design tokens, color systems, typography, spacing, component libraries, CSS architecture, brand consistency, dark mode.
Guidelines:
- Audit existing design decisions before introducing anything new.
- Define tokens centrally (colors, spacing, radii, shadows) — never hardcode visual values inline.
- Typography: establish a clear type scale. Check line-height and max-width for readability.
- Color: verify contrast ratios. Build semantic aliases (primary, success, danger) not raw hex.
- Components: document variants and all interactive states (default, hover, active, disabled, error).`,
  },

  mobile: {
    profile: 'builder',
    hint: `Specialist: Mobile Engineer
Platforms: React Native, Flutter, Expo, Swift/SwiftUI (iOS), Kotlin/Jetpack Compose (Android).
Focus: native UI, gestures, navigation, offline support, push notifications, app store compliance, low-end device performance.
Guidelines:
- Distinguish cross-platform vs. native requirements early.
- React Native: prefer Fabric/JSI new architecture. Use FlatList/SectionList, never ScrollView for lists.
- Navigation: stack/tab/drawer patterns, validate deep link handling.
- Offline: identify which data needs local persistence; choose appropriate storage.
- Performance: no heavy computation on JS/main thread during animations.`,
  },

  web: {
    profile: 'builder',
    hint: `Specialist: Full-Stack Web Developer
Focus: SSR/SSG frameworks (Next.js, Nuxt, SvelteKit, Remix, Astro), routing, Core Web Vitals, SEO, forms, auth flows.
Guidelines:
- Understand the rendering strategy first (CSR/SSR/SSG/ISR) — it affects every decision.
- Performance: measure first, then optimize. Target LCP < 2.5s, CLS < 0.1, INP < 200ms.
- SEO: meta tags, structured data, canonical URLs, sitemap.
- Forms: validate both client-side AND server-side. Inline error messages.
- Auth: HttpOnly cookies for session tokens (not localStorage). Rate limit auth endpoints.`,
  },

  devops: {
    profile: 'builder',
    hint: `Specialist: DevOps & Infrastructure Engineer
Focus: containers, orchestration (Kubernetes), CI/CD, infrastructure as code (Terraform, Ansible), observability, reliability.
Guidelines:
- Verify current running state before proposing changes (kubectl get, docker ps, terraform state).
- Flag any action affecting production availability before proceeding.
- Kubernetes: check events and logs before editing manifests.
- CI/CD: prefer additive changes; be cautious with shared pipeline stages.
- Infrastructure changes: prefer plan/dry-run before apply.
- Observability: correlate metrics, logs, and traces by request ID.`,
  },

  security: {
    profile: 'deep',
    hint: `Specialist: Security Engineer
Focus: OWASP Top 10, authentication, secrets management, dependency audits, threat modeling.
Guidelines:
- Check for injection flaws (SQL, command, LDAP, XSS, SSTI) in all user-controlled inputs.
- Auth: verify token expiry, rotation, and storage (HttpOnly+Secure+SameSite cookies for session tokens).
- Secrets: scan for hardcoded credentials/API keys/PII. Check .gitignore and git history.
- Dependencies: flag known CVEs, unmaintained packages, overly permissive version ranges.
- Every vulnerability: state severity (Critical/High/Medium/Low), exploitability, and remediation.`,
  },

  testing: {
    profile: 'deep',
    hint: `Specialist: QA & Test Engineering
Focus: test strategy, unit/integration/e2e tests, coverage gaps, test quality, CI integration.
Guidelines:
- Assess coverage gap first — what critical paths are untested?
- Unit tests: one assertion per test, test behavior not implementation details.
- Integration: happy path + at least 2 error paths per endpoint.
- E2E: focus on critical user journeys, not every edge case (that's for unit tests).
- Mocking: mock external services, not your own modules. Over-mocking hides bugs.
- Each test owns its setup and teardown. Never share mutable state between tests.`,
  },

  code: {
    profile: 'deep',
    hint: `Specialist: Code Analyst & Reviewer
Focus: code quality, performance, security vulnerabilities, refactoring, architecture.
Guidelines:
- Inspect actual code before conclusions — never assume.
- Report by severity: CRITICAL → IMPORTANT → SUGGESTIONS.
- Cite file:line for every issue.
- Security: injection, auth bypass, hardcoded secrets, path traversal.
- Performance: N+1 queries, unbounded computation in loops, memory leaks.
- Quality: cyclomatic complexity, duplication, naming, single-responsibility violations.
- After identifying issues, propose the minimal safe fix.`,
  },

  docs: {
    profile: 'balanced',
    hint: `Specialist: Technical Writer
Focus: API docs, READMEs, user guides, code comments, changelogs, onboarding documentation.
Guidelines:
- Read the actual implementation before documenting it — docs must match reality.
- Clarity over completeness. Shorter is better.
- Match existing style (format, voice, level of detail).
- Structure: overview → why → how → examples → edge cases.
- Code comments: explain WHY (non-obvious constraints, workarounds), not WHAT.`,
  },

  research: {
    profile: 'balanced',
    hint: `Specialist: Research Analyst
Focus: web research, technology evaluation, competitive analysis, source verification.
Guidelines:
- Start broad (2–3 queries to map the landscape), then narrow (targeted follow-ups).
- Evaluate sources: authority, currency, accuracy, potential bias.
- Key facts need two independent sources before stating as established.
- Surface disagreements between sources.
- Structure: bottom line → key findings → nuances/caveats → gaps → sources.`,
  },

  marketing: {
    profile: 'balanced',
    hint: `Specialist: Marketing & Growth
Focus: copy, content strategy, SEO, campaigns, positioning, brand voice.
Guidelines:
- Establish target audience, primary benefit, tone, and CTA before writing.
- Lead with benefit, not feature. Use specific claims, not superlatives.
- Provide 3+ copy variations for the user to choose from.
- For campaigns: every item needs an owner, a deadline, and a measurable success metric.`,
  },

  system: {
    profile: 'balanced',
    hint: `Specialist: System & File Operations
Focus: system health, log analysis, file operations, backup management, process monitoring.
Guidelines:
- Inspect before acting. Run diagnostic commands before proposing changes.
- Performance: check load average → memory → disk → network → application logs.
- Bulk file ops: always preview before executing. Use dry-run flags where available.
- Log analysis: search for errors first, then build timeline.
- Backups: verify integrity after creation.`,
  },
};

// ── PM prompt ────────────────────────────────────────────────────────────────

const PM_PLAN_PROMPT = `You are the Project Manager for shmakk, an AI terminal assistant.
Your job: analyze a task, pick the right execution topology, and assemble a specialist team.

Available specialists: ${Object.keys(AGENT_ROSTER).join(', ')}

Topologies:
- "parallel"  — agents are independent, run simultaneously, results synthesized at the end. Use when subtasks don't depend on each other (e.g., security audit covering multiple vectors).
- "pipeline"  — agents run in order, each sees the previous agent's output. Use when there are dependencies (e.g., design must finish before frontend can implement, code must be written before tests can be added).

Respond with ONLY a JSON object — no markdown, no explanation, no code fences:
{
  "needsTeam": true,
  "topology": "parallel",
  "reason": "one sentence explaining why this warrants a multi-agent team",
  "agents": [
    {
      "role": "frontend",
      "task": "specific, concrete task for this agent (1–2 sentences)",
      "fileScope": "src/components/, src/styles/"
    }
  ]
}

If the task does NOT warrant a team (single-domain, simple, conversational, a quick question, or a single-file change), respond:
{ "needsTeam": false }

Planning rules:
- Only assign agents that are genuinely needed for THIS specific task.
- 2–5 agents max. Never over-staff — a focused 2-agent team beats a bloated 5-agent one.
- For "parallel": fileScope must be non-overlapping — agents should not conflict over the same files.
- For "pipeline": agents run in the order you list them. The first agent's output becomes context for the second, etc. Order matters.
- Each agent's task must be specific and actionable. "Build the frontend" is too vague; "Build the login form and dashboard layout in src/components/auth/ using the existing Tailwind config" is correct.
- A task that only touches code quality, tests, or docs for an existing feature is a single-agent task.`;

// ── Multi-domain heuristic ────────────────────────────────────────────────────

// Fast heuristic check — runs before making any LLM call.
// Returns true if the task plausibly spans multiple domains.
function looksMultiDomain(input) {
  const s = String(input || '');
  if (s.length < 40) return false;

  const domainSignals = [
    /\b(react|vue|angular|svelte|next\.?js|nuxt|components?|frontend|tsx?|jsx?|tailwind)\b/i,
    /\b(backend|api|server|database|db|orm|endpoint|rest|graphql|auth(entication)?|middleware)\b/i,
    /\b(test(ing|s)?|spec|coverage|jest|cypress|playwright|vitest|e2e)\b/i,
    /\b(doc(s|umentation)?|readme|changelog|jsdoc|docstring|wiki)\b/i,
    /\b(deploy|ci\/cd|docker|kubernetes|k8s|pipeline|infra(structure)?|terraform|helm)\b/i,
    /\b(design|ux|ui|wireframe|figma|prototype|dark\s+mode|theme|design.?system|design.?token)\b/i,
    /\b(mobile|ios|android|react.?native|flutter|expo|app.?store)\b/i,
    /\b(security|vuln(erability)?|owasp|csrf|xss|injection|pentest)\b/i,
  ];

  let hits = 0;
  for (const re of domainSignals) { if (re.test(s)) hits++; }

  const broadTask = /\b(full.?stack|complete\s+(system|app|feature|solution)|end.?to.?end|from\s+(scratch|the\s+ground\s+up)|build\s+(a|an|the)\s+\w+\s*(app|application|system|platform|product|service|website|site))\b/i;

  return hits >= 2 || (hits >= 1 && broadTask.test(s));
}

// ── PM planning ───────────────────────────────────────────────────────────────

async function planTeam(input, client, roots, signal) {
  try {
    const resp = await client.chat.completions.create({
      model: modelFor('agent'),
      temperature: 0,
      stream: false,
      tool_choice: 'none',
      messages: [
        { role: 'system', content: PM_PLAN_PROMPT },
        { role: 'user', content: `Workspace: ${roots.join(', ')}\n\nTask: ${input}` },
      ],
    }, { signal });

    let text = String(resp.choices?.[0]?.message?.content || '').trim();
    // Strip markdown code fences in case the model wraps the JSON anyway
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    return JSON.parse(text);
  } catch {
    return { needsTeam: false };
  }
}

// ── Sub-agent execution ───────────────────────────────────────────────────────

async function runSubAgent({
  role, task, fileScope, overallInput, roots, signal, mcpManager,
  handoffs = null,     // [{ role, output }] — outputs from prior pipeline agents
  topology = 'parallel',
}) {
  const roster = AGENT_ROSTER[role];
  if (!roster) {
    return { role, task, output: '', toolCount: 0, error: `Unknown role: ${role}` };
  }

  const lines = [];
  const bufWrite = (s) => lines.push(s);
  let toolCount = 0;

  // Sub-agents: auto-accept safe and uncertain tools within their domain.
  // Unsafe tools (delete, dangerous shell) are rejected to prevent surprises.
  const confirmTool = async ({ safety }) => {
    toolCount++;
    return safety !== 'unsafe';
  };

  const teamDescription = topology === 'pipeline'
    ? 'You are running in a PIPELINE — prior specialists have completed their steps and their output is below. Your work builds on theirs.'
    : 'Other specialists are handling the rest in parallel.';

  // Pipeline handoff: include prior agents' summarized output
  const handoffBlock = (handoffs && handoffs.length)
    ? '\n\nPrior agent output (use as input for your work):\n' +
      handoffs.map((h) => {
        const out = stripAnsi(h.output).trim().slice(0, 2000);
        return `--- ${h.role.toUpperCase()} completed ---\n${out || '(no output captured)'}\n`;
      }).join('\n')
    : '';

  const subInput = [
    `You are the ${role} specialist on a multi-agent project team.`,
    ``,
    `Overall project task: ${overallInput}`,
    ``,
    `Your specific assignment: ${task}`,
    fileScope ? `\nYour file scope (stay within these paths): ${fileScope}` : '',
    handoffBlock,
    ``,
    `${teamDescription}`,
    `Be concrete: produce actual code, content, or configs — not plans or descriptions.`,
  ].filter(Boolean).join('\n');

  try {
    await runAgent({
      input: subInput,
      roots,
      glossary: null,
      confirmTool,
      write: bufWrite,
      signal,
      history: [],
      profile: roster.profile,
      colors: false,
      voiceMode: false,
      specialistHint: roster.hint,
      mcpManager,
    });
    return { role, task, output: lines.join(''), toolCount, error: null };
  } catch (e) {
    return { role, task, output: lines.join(''), toolCount, error: e.message };
  }
}

// ── PM synthesis ─────────────────────────────────────────────────────────────

function stripAnsi(s) {
  return String(s || '').replace(/\x1b\[[0-9;]*m/g, '');
}

async function synthesizeResults({ overallInput, agentResults, client, signal }) {
  const context = agentResults.map((r) => {
    const status = r.error ? `ERROR: ${r.error}` : `✓ completed (${r.toolCount} tool calls)`;
    const preview = stripAnsi(r.output).trim().slice(0, 1500);
    return `## ${r.role.toUpperCase()} — ${r.task}\nStatus: ${status}\n${preview ? `Output:\n${preview}` : '(no output)'}`;
  }).join('\n\n---\n\n');

  try {
    const resp = await client.chat.completions.create({
      model: modelFor('agent'),
      temperature: 0,
      stream: false,
      tool_choice: 'none',
      messages: [
        {
          role: 'system',
          content: `You are the Project Manager delivering the final summary to the user.
Write concisely (max 250 words):
- What each specialist accomplished (reference actual files/components where known)
- Any issues or blockers encountered
- Clear next steps for the user (if any)
Be specific. No fluff. No restating the task.`,
        },
        {
          role: 'user',
          content: `Original task: ${overallInput}\n\nAgent results:\n\n${context}`,
        },
      ],
    }, { signal });
    return String(resp.choices?.[0]?.message?.content || '').trim();
  } catch {
    return agentResults
      .map((r) => `[${r.role}] ${r.error ? `✗ ${r.error}` : '✓ done'}`)
      .join('\n');
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

// Run agents sequentially with handoffs — each agent sees prior outputs.
async function runPipelineAgents({ agents, overallInput, roots, signal, mcpManager, write }) {
  const handoffs = [];
  const results = [];
  const startTime = Date.now();

  for (const a of agents) {
    if (signal && signal.aborted) break;

    write(`\x1b[36m[shmakk · ${a.role}]\x1b[0m \x1b[2m starting (step ${results.length + 1}/${agents.length})…\x1b[0m\r\n`);

    const result = await runSubAgent({
      role: a.role,
      task: a.task,
      fileScope: a.fileScope,
      overallInput,
      roots,
      signal,
      mcpManager,
      handoffs: [...handoffs],   // pass copy of prior outputs
      topology: 'pipeline',
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const icon = result.error ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
    const info = result.error
      ? result.error
      : `done · ${result.toolCount} tool calls · ${elapsed}s`;
    write(`\x1b[36m[shmakk · ${result.role}]\x1b[0m ${icon} ${info}\r\n`);

    results.push(result);

    // Stop pipeline on hard error (don't pass broken state to next agent)
    if (result.error && !result.output) {
      write(`\x1b[33m[shmakk · pm]\x1b[0m Pipeline halted at ${a.role} — downstream agents skipped\r\n`);
      break;
    }

    handoffs.push({ role: result.role, output: result.output });
  }

  return results;
}

// Run agents simultaneously via Promise.all.
async function runParallelAgents({ agents, overallInput, roots, signal, mcpManager, write }) {
  const startTime = Date.now();

  return Promise.all(
    agents.map(async (a) => {
      const result = await runSubAgent({
        role: a.role,
        task: a.task,
        fileScope: a.fileScope,
        overallInput,
        roots,
        signal,
        mcpManager,
        topology: 'parallel',
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const icon = result.error ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
      const info = result.error
        ? result.error
        : `done · ${result.toolCount} tool calls · ${elapsed}s`;
      write(`\x1b[36m[shmakk · ${result.role}]\x1b[0m ${icon} ${info}\r\n`);
      return result;
    }),
  );
}

// Returns true  → team handled the task (caller should not invoke single-agent).
// Returns false → PM declined (caller falls through to single-agent execution).
async function runTeam({ input, roots, write, signal, mcpManager }) {
  if (!isConfigured()) return false;

  const client = makeClient();

  // Phase 1: Check for a matching workflow template first (no LLM call)
  let agents = null;
  let topology = 'parallel';
  let reason = null;
  let source = 'pm';

  const matchedWorkflow = matchWorkflow(input);
  if (matchedWorkflow) {
    agents = expandWorkflow(matchedWorkflow, input);
    topology = matchedWorkflow.topology;
    reason = `Matched workflow template "${matchedWorkflow.id}" — ${matchedWorkflow.description}`;
    source = `workflow:${matchedWorkflow.id}`;
    write(`\x1b[36m[shmakk · pm]\x1b[0m Matched workflow template: \x1b[1m${matchedWorkflow.id}\x1b[0m\r\n`);
  } else {
    // Phase 1b: PM plans a custom team via LLM
    write('\x1b[36m[shmakk · pm]\x1b[0m Planning team…\r\n');
    const plan = await planTeam(input, client, roots, signal);

    if (!plan.needsTeam || !Array.isArray(plan.agents) || plan.agents.length < 2) {
      write('\x1b[2m[shmakk · pm] Routing to single agent\x1b[0m\r\n');
      return false;
    }

    agents = plan.agents.filter((a) => AGENT_ROSTER[a.role] && a.task);
    topology = (plan.topology === 'pipeline') ? 'pipeline' : 'parallel';
    reason = plan.reason || 'Multi-domain task — assembling team';

    if (agents.length < 2) {
      write('\x1b[2m[shmakk · pm] Insufficient valid agents — routing to single agent\x1b[0m\r\n');
      return false;
    }
  }

  // Validate roles regardless of source
  agents = agents.filter((a) => AGENT_ROSTER[a.role] && a.task);
  if (agents.length < 2) return false;

  // Show team composition
  write(`\x1b[36m[shmakk · pm]\x1b[0m ${reason}\r\n`);
  const verb = topology === 'pipeline' ? 'sequentially (pipeline)' : 'in parallel';
  write(`\x1b[36m[shmakk · pm]\x1b[0m Running ${agents.length} agents ${verb}:\r\n`);
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const prefix = topology === 'pipeline' ? `${i + 1}.` : '↳ ';
    write(`  \x1b[2m${prefix}\x1b[0m \x1b[36m${a.role.padEnd(10)}\x1b[0m ${a.task}\r\n`);
    if (a.fileScope) write(`  \x1b[2m             scope: ${a.fileScope}\x1b[0m\r\n`);
  }
  write('\r\n');

  // Phase 2: Execute based on topology
  const agentResults = topology === 'pipeline'
    ? await runPipelineAgents({ agents, overallInput: input, roots, signal, mcpManager, write })
    : await runParallelAgents({ agents, overallInput: input, roots, signal, mcpManager, write });

  write('\r\n');

  // Phase 3: PM synthesizes
  write('\x1b[36m[shmakk · pm]\x1b[0m Synthesizing results…\r\n\r\n');
  const summary = await synthesizeResults({ overallInput: input, agentResults, client, signal });
  write(summary + '\r\n');

  return true;
}

module.exports = { runTeam, looksMultiDomain, AGENT_ROSTER };
