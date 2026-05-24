// Coordinator — routes user input to a specialist configuration before
// the main agent runs. Returns profile hints and specialist system prompt
// context that get merged into the runAgent call.
//
// This is NOT src/orchestrator.js (which handles SIGTERM/SIGUSR1/SIGUSR2
// lifecycle signals). This is purely a task-routing layer.
//
// Architecture:
//   session.js receives input
//     → coordinator.route(input) → { specialist, profile, specialistHint, indicator }
//     → runAgent({ ..., profile, specialistHint })
//     → agent builds system prompt with specialist context appended

const SPECIALISTS = {
  frontend: {
    patterns: [
      /\bcomponent\b/i, /\breact\b/i, /\bvue\b/i, /\bangular\b/i, /\bsvelte\b/i,
      /\bnext\.?js\b/i, /\bnuxt\b/i, /\btssx?\b/i, /\bjsx?\b/i,
      /\btailwind\b/i, /\bcss\s+module/i, /\bstyled.components\b/i,
      /\buse(State|Effect|Memo|Callback|Ref|Context)\b/,
      /\bprops?\b.*\bcomponent\b/i, /\brender(ing)?\b.*\bbug\b/i,
      /\bui\s+(bug|issue|fix|component)\b/i,
      /\bresponsive\b/i, /\bmobile.first\b/i, /\blayout\s+(issue|fix|bug)\b/i,
      /\ba11y\b/i, /\baccessib/i, /\baria.?label\b/i,
      /\bbundle\s+(size|split|chunk)\b/i, /\btree.?shaking\b/i,
    ],
    profile: 'builder',
    indicator: 'frontend',
    hint: `
Specialist mode: Frontend Engineering
Focus: components, state, styling, accessibility, and frontend performance.
Approach:
- Inspect existing components and conventions before creating new ones.
- Keep components small and single-purpose. Prefer composition over configuration.
- Follow the project's styling methodology (Tailwind, CSS modules, SCSS, styled-components).
- Every interactive element must be keyboard-accessible with correct ARIA attributes.
- Check for unnecessary re-renders, missing memoization, and unvirtualized long lists.
- Test at multiple breakpoints. Verify touch target sizes (≥44px) on mobile.`,
  },

  ux: {
    patterns: [
      /\bux\b/i, /\buser\s+experience\b/i, /\busability\b/i,
      /\bwireframe\b/i, /\bprototype\b/i, /\buser\s+(flow|journey|story)\b/i,
      /\binformation\s+architecture\b/i, /\bonboarding\b/i,
      /\bempty\s+state\b/i, /\berror\s+(message|state|ux)\b/i,
      /\bfriction\b/i, /\bconversion\s+rate\b/i, /\bdrop.?off\b/i,
      /\btoo\s+many\s+(steps|clicks)\b/i, /\bcta\s+(button|text|copy)\b/i,
      /\binteraction\s+design\b/i, /\bconfusing\s+(ui|interface|layout)\b/i,
    ],
    profile: 'balanced',
    indicator: 'ux',
    hint: `
Specialist mode: UX/UI Design
Focus: user flows, information architecture, interaction design, usability, accessibility.
Approach:
- Start with the user's goal and work backwards to the interface — never start with components.
- Map the full journey: entry → action → exit, including error paths.
- Identify friction: too many steps, ambiguous labels, missing feedback, confusing recovery.
- Accessibility: sufficient contrast (≥4.5:1), keyboard navigation, 44px touch targets, screen reader support.
- Propose 2–3 alternatives for significant interaction patterns, with tradeoffs explained.`,
  },

  design: {
    patterns: [
      /\bdesign\s+(system|token|language|kit)\b/i,
      /\bcolor\s+(system|palette|token|scheme)\b/i,
      /\btypograph(y|ic)\b/i, /\bfont.?scale\b/i, /\btype\s+scale\b/i,
      /\bspacing\s+(system|scale|token)\b/i,
      /\bdark\s+mode\b/i, /\btheme\b.*\b(switch|toggle|support)\b/i,
      /\bstorybook\b/i, /\bfigma\b/i, /\bdesign\s+token\b/i,
      /\bcss\s+(variable|custom\s+property)\b/i,
      /\bvisual\s+(consistency|hierarchy|design)\b/i,
      /\bbrand\s+(color|font|guideline|consistency)\b/i,
    ],
    profile: 'balanced',
    indicator: 'design',
    hint: `
Specialist mode: Visual Design & Design Systems
Focus: design tokens, color systems, typography, spacing, CSS architecture, dark mode, brand consistency.
Approach:
- Audit existing design decisions before introducing anything new. Find the pattern, don't break it.
- Define tokens centrally — never hardcode visual values (colors, spacing, radii) in components.
- Typography: establish a clear type scale. Verify line-height, max-width (65ch), and font loading.
- Color: verify contrast ratios (≥4.5:1 text, ≥3:1 UI). Build semantic aliases, not raw hex.
- Dark mode: every semantic token needs explicit light and dark values via CSS custom properties.`,
  },

  mobile: {
    patterns: [
      /\bmobile\s+app\b/i, /\breact\s+native\b/i, /\bflutter\b/i, /\bexpo\b/i,
      /\bios\b/i, /\bandroid\b/i, /\bswiftui\b/i, /\bjet(pack)?\s+compose\b/i,
      /\bapp\s+store\b/i, /\bplay\s+store\b/i, /\bpush\s+notification\b/i,
      /\bdeep\s+link\b/i, /\boffline\s+(mode|support|sync)\b/i,
      /\bflatlist\b/i, /\bnative\s+(module|component|bridge)\b/i,
      /\bjank\b/i, /\bui\s+thread\b/i, /\bjs\s+thread\b/i,
    ],
    profile: 'builder',
    indicator: 'mobile',
    hint: `
Specialist mode: Mobile Engineering
Focus: React Native, Flutter, iOS, Android — UI, navigation, offline, push, performance, app store.
Approach:
- Distinguish cross-platform (React Native, Flutter) and native requirements early.
- Lists: always FlatList/SectionList, never ScrollView for dynamic data.
- Navigation: stack/tab/drawer patterns. Validate deep link handling.
- Offline: identify data needing local persistence. Choose appropriate storage.
- Performance: no heavy computation on JS/main thread during animations. Profile on low-end devices.
- App store: check bundle IDs, version codes, required permissions, privacy manifests.`,
  },

  web: {
    patterns: [
      /\bnext\.?js\b/i, /\bnuxt\b/i, /\bsveltekit\b/i, /\bremix\b/i, /\bastro\b/i,
      /\bssr\b/i, /\bssg\b/i, /\bisr\b/i, /\bserver.?side\s+render\b/i,
      /\bcore\s+web\s+vital\b/i, /\blighthouse\b/i, /\blcp\b/i, /\bcls\b/i,
      /\bseo\b/i, /\bmeta\s+tag\b/i, /\bopen\s+graph\b/i, /\bcanonical\b/i,
      /\bweb\s+(app|application|site|performance|security)\b/i,
      /\bservice\s+worker\b/i, /\bpwa\b/i, /\bweb\s+manifest\b/i,
    ],
    profile: 'builder',
    indicator: 'web',
    hint: `
Specialist mode: Full-Stack Web Development
Focus: SSR/SSG frameworks, routing, Core Web Vitals, SEO, forms, auth, web security.
Approach:
- Understand the rendering strategy first (CSR/SSR/SSG/ISR) — it affects every decision.
- Performance: measure first (Lighthouse), then optimize. Target LCP < 2.5s, CLS < 0.1.
- SEO: title, meta description, canonical, Open Graph, structured data, sitemap.
- Forms: validate client-side AND server-side. Inline error messages, not summary-only.
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
- Auth: HttpOnly cookies for session tokens, rate limiting on auth endpoints.`,
  },

  code: {
    patterns: [
      /\brefactor\b/i, /\bcode\s*review\b/i, /\bdebugg?(?:ing)?\b/i,
      /\bsecurity\s+(issue|vuln|bug|flaw|hole)\b/i, /\bsql\s*inject/i,
      /\bxss\b/i, /\boptimis[ez]/i, /\bperformance\s+(issue|problem|bug)\b/i,
      /\bfix\s+(the\s+)?(bug|error|issue|crash|exception)\b/i,
      /\bunit\s+test\b/i, /\btest\s+coverage\b/i, /\bfailing\s+test\b/i,
      /\btest.*fail/i, /\bfix\s+(the\s+)?(broken|failing|failed)\b/i,
      /\bcode\s+quality\b/i,
      /\bduplication\b/i, /\bciclomatc?\b/i, /\bstatic\s+analysis\b/i,
    ],
    profile: 'deep',
    indicator: 'code',
    hint: `
Specialist mode: Code Analysis & Quality
Focus: bugs, security vulnerabilities, performance, test coverage, code quality.
Approach:
- Inspect actual code before drawing conclusions — never assume.
- Report issues by severity: CRITICAL → IMPORTANT → SUGGESTIONS.
- Always cite file:line for every issue raised.
- For security: check for injection (SQL, command, XSS), auth bypass, hardcoded secrets, path traversal.
- For performance: check for N+1 queries, unnecessary computation inside loops, unbounded fetches.
- For quality: complexity, duplication, naming, single-responsibility violations.
- After identifying issues, propose the minimal safe fix.`,
  },

  docs: {
    patterns: [
      /\bdocument(ation|ing|ation)?\b/i, /\bwrite\s+(a\s+)?(readme|doc|guide|spec)\b/i,
      /\bcomment(s|ing)?\b/i, /\bexplain\s+(this|the|how|what)\b/i,
      /\bsummari[sz]e?\b/i, /\bdraft\b/i, /\bchangelog\b/i, /\bapi\s+docs?\b/i,
      /\bjsdoc\b/i, /\bdocstring\b/i, /\bonboarding\b/i, /\bREADME\b/,
    ],
    profile: 'balanced',
    indicator: 'docs',
    hint: `
Specialist mode: Documentation & Writing
Focus: accurate documentation, clear explanations, correct tone for the audience.
Approach:
- Read the actual implementation before documenting it — docs must match reality.
- Prioritize clarity over completeness. If in doubt, be shorter.
- Match the existing documentation style (format, voice, level of detail).
- Structure: overview → why → how → examples → edge cases.
- For code comments: explain WHY (non-obvious constraints, workarounds), not WHAT.
- For user-facing docs: write for the intended reader's level, not the author's.`,
  },

  system: {
    patterns: [
      /\b(high\s+)?cpu\b/i, /\bmemory\s+(leak|usage|full)\b/i, /\bdisk\s+(full|space|usage)\b/i,
      /\bprocess(es)?\s+(running|hung|killed|crash)\b/i, /\blog\s*(file)?s?\b/i,
      /\bmonitor(ing)?\b/i, /\bbackup\b/i, /\borganize\s+files?\b/i,
      /\bbulk\s+rename\b/i, /\bduplicate\s+files?\b/i, /\bsystem\s+slow\b/i,
      /\bport\s+\d+\b/i, /\bservice\s+(running|stopped|failed)\b/i,
      /\brsync\b/i, /\bcrontab\b/i, /\bdaemon\b/i,
    ],
    profile: 'balanced',
    indicator: 'system',
    hint: `
Specialist mode: System & File Operations
Focus: system health, log analysis, file operations, backup management.
Approach:
- Inspect before acting. Run diagnostic commands before proposing changes.
- For performance issues: check load average → memory → disk → network → application logs (in that order).
- For bulk file operations: always preview before executing. Use -n (no-clobber) where available.
- For log analysis: search for errors first, then build timeline of events.
- For backups: verify integrity after creation, not just existence.
- Never use rm -rf or equivalent without explicit confirmation of scope.`,
  },

  devops: {
    patterns: [
      /\bdeploy(ment|ing)?\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bk8s\b/i,
      /\bci\/cd\b/i, /\bpipeline\b/i, /\bhelm\b/i, /\bcontainer(s|ize)?\b/i,
      /\binfrastructure\b/i, /\bterraform\b/i, /\bansible\b/i,
      /\bnginx\b/i, /\bload.?balanc/i, /\bcluster\b/i, /\bpod\s+(crash|error)\b/i,
      /\bingress\b/i, /\bconfigmap\b/i, /\bsecret\s+(yaml|manifest)\b/i,
    ],
    profile: 'builder',
    indicator: 'devops',
    hint: `
Specialist mode: DevOps & Infrastructure
Focus: containers, orchestration, CI/CD, infrastructure as code, operational reliability.
Approach:
- Verify current running state before proposing changes (kubectl get, docker ps, terraform state).
- Flag any action that could affect production availability before proceeding.
- For Kubernetes: check events and logs before editing manifests.
- For CI/CD: prefer additive changes; be cautious about modifying shared pipeline stages.
- For infrastructure changes: prefer plan/dry-run before apply.
- Always check resource limits and quotas when scaling.`,
  },

  marketing: {
    patterns: [
      /\bmarket(ing|er)?\b/i, /\bcopy(writing)?\b/i, /\blanding\s+page\b/i,
      /\bseo\b/i, /\bcampaign\b/i, /\bconversion\b/i, /\bcta\b/i,
      /\btarget\s+audience\b/i, /\bpositioning\b/i, /\bbrand(ing|voice)?\b/i,
      /\bheadline\b/i, /\bemail\s+(campaign|newsletter|blast)\b/i,
      /\bads?\s+(copy|creative|campaign)\b/i, /\bgrowth\b/i,
    ],
    profile: 'balanced',
    indicator: 'marketing',
    hint: `
Specialist mode: Marketing & Growth
Focus: copy, content strategy, SEO, campaigns, positioning, brand voice.
Approach:
- Always establish: target audience, primary benefit, tone, and CTA before writing copy.
- Lead with benefit, not feature. Use specific claims, not superlatives.
- For copy: provide 3+ variations so the user can choose and refine.
- For SEO: check title, meta, H1, content, and URL structure — all matter.
- For campaigns: every item needs an owner, a deadline, and a measurable success metric.
- Read aloud test: if it sounds stiff or unnatural, revise it.`,
  },

  research: {
    patterns: [
      /\bresearch\b/i, /\bwhat\s+is\b/i, /\bhow\s+does\b/i, /\bwho\s+is\b/i,
      /\bcompare\b/i, /\btradeoffs?\b/i, /\bpros?\s+and\s+cons?\b/i,
      /\bfind\s+(out|info|information)\b/i, /\blearn\s+about\b/i,
      /\bsummar(ize|y)\s+(this|the|an?\s+article)\b/i,
      /\bverify\b/i, /\bfact.?check\b/i, /\bsources?\b/i,
    ],
    profile: 'balanced',
    indicator: 'research',
    hint: `
Specialist mode: Research & Information Synthesis
Focus: web research, source evaluation, structured synthesis, fact verification.
Approach:
- Start broad (2-3 queries to map the landscape), then narrow (targeted follow-ups).
- Evaluate sources: authority, currency, accuracy, potential bias.
- Key facts should appear in at least two independent sources before stating them as established.
- Surface disagreements between sources rather than picking one without justification.
- Structure output: bottom line → key findings → nuances/caveats → gaps → sources.
- For medical, legal, financial topics: always note that a professional should be consulted.`,
  },
};

const { classifyTask } = require('./taskClassifier');

// route analyzes the input and returns a specialist config + task classification.
// If no specialist matches, returns the general config (no hint, use opts.profile).
function route(input, messages = []) {
  const text = String(input || '');
  const task = classifyTask(messages);

  for (const [name, spec] of Object.entries(SPECIALISTS)) {
    if (spec.patterns.some((p) => p.test(text))) {
      return {
        specialist: name,
        profile: spec.profile,
        specialistHint: spec.hint,
        indicator: spec.indicator,
        taskType: task.taskType,
        taskProfile: task,
      };
    }
  }

  return {
    specialist: 'general',
    profile: null,
    specialistHint: null,
    indicator: null,
    taskType: task.taskType,
    taskProfile: task,
  };
}

module.exports = { route, SPECIALISTS };
