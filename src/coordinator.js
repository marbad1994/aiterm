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

// route analyzes the input and returns a specialist config.
// If no specialist matches, returns the general config (no hint, use opts.profile).
function route(input) {
  const text = String(input || '');

  for (const [name, spec] of Object.entries(SPECIALISTS)) {
    if (spec.patterns.some((p) => p.test(text))) {
      return {
        specialist: name,
        profile: spec.profile,
        specialistHint: spec.hint,
        indicator: spec.indicator,
      };
    }
  }

  return {
    specialist: 'general',
    profile: null,
    specialistHint: null,
    indicator: null,
  };
}

module.exports = { route, SPECIALISTS };
