#!/usr/bin/env node
// Selective skill importer.
//
// Scans /home/marcus/collect_all_skills/ for skill markdown files, filters
// out:
//   - placeholders (e.g. "Agent skill for X - invoke with $agent-X")
//   - tiny/empty content
//   - duplicates of shmakk's bundled skills
//   - claude-code-specific skills that won't run inside shmakk (reference
//     .claude/, AGENTS.md, copilot-specific frontmatter, plugin manifest, etc.)
//   - vendor-locked skills that require external API keys shmakk doesn't have
//     (Twilio, SendGrid, Stripe Connect, Vercel deploy APIs, etc.)
//
// Then categorizes each by name pattern and writes to
// ~/.config/shmakk/skills/<category>/<name>.md
//
// Dry run by default:
//   node scripts/import-skills.js
// Apply changes:
//   node scripts/import-skills.js --apply

const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = '/home/marcus/collect_all_skills';
const DEST = path.join(os.homedir(), '.config', 'shmakk', 'skills');
const SHMAKK_SKILLS_DIR = path.join(__dirname, '..', 'skills');
const APPLY = process.argv.includes('--apply');

// ── Existing shmakk skills (do not duplicate) ──────────────────────────────
const SHMAKK_SKILLS = new Set(
  fs.readdirSync(SHMAKK_SKILLS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'))
);

// ── Compatibility filters ─────────────────────────────────────────────────
const PLACEHOLDER_DESC = /^Agent skill for \S+\s*-\s*invoke with \$agent-/i;
// These patterns make a skill *primarily* incompatible (it's about another
// ecosystem). A passing mention of AGENTS.md in body text is fine — we used
// to flag those by mistake, dropping useful security/research skills.
const INCOMPAT_PATTERNS = [
  /\.claude\/(?:skills|agents|commands)/i,     // Claude Code plugin paths
  /\bClaudePluginsRepo\b/,                     // Claude Code plugin manifests
  /\bclaude-code-plugins\b/,
  /\bclaude-flow@/i,                           // claude-flow CLI dependency
  /npx (?:claude-flow|ruv-swarm)@/i,           // claude-flow CLI dependency
  /\bagentic-flow hooks\b/i,                   // agentic-flow CLI dependency
  /\$\{CLAUDE_PLUGIN_ROOT\}/,
  /^applyTo:/m,                                // VS Code skill frontmatter
  /^chatmode:/m,                               // Copilot chatmode
];

// ── Vendor-locked skills to skip (need external API keys/auth) ─────────────
const VENDOR_PREFIXES = [
  'twilio-', 'twilio_',
  'vercel-', 'netlify-', 'render-', 'render_', 'cloudflare', 'wrangler',
  'supabase', 'stripe', 'salesforce-',
  'sharepoint', 'outlook-', 'teams-', 'gmail', 'google-',
  'dataverse-', 'power-bi-', 'powerbi-', 'power-platform-', 'power-apps-', 'flowstudio-',
  'azure-', 'aws-cdk-', 'oracle', 'msstore-', 'fluentui-',
  'github-copilot-', 'copilot-', 'copilot_',
  'canva-', 'figma', 'figma-',
  'notion', 'notion-',
  'slack', 'slack-',
  'sherpa-onnx-', 'spotify-player', 'openhue', 'wacli', 'xurl',
  'discord', 'bluebubbles',
  // AI / observability vendors with paid SaaS
  'arize-',
  'aidefence-',
  'qdrant-',
  'foundry-',
  'feishu-', 'box-', 'box_', 'trello',
  'horizon-', 'taskflow', 'taskflow-',
  // Device-specific
  'cardputer-', 'cardputer_', 'm5-',
  // Single-vendor / niche frameworks
  'gradio', 'remotion', 'transformers.js', 'wasm-gallery', 'wasm-agent',
  'turborepo', 'turbopack', 'beta', 'alpha',
  '1password',
  'sentry',
  'temporal-developer',
  'jupyter-notebook',
  'shadcn',
  'vision-trainer',
  // Microsoft-specific stacks
  'mcp-create-', 'mcp-deploy-', 'mcp-cli',
  'winapp-', 'winmd-', 'winui-', 'winui3-',
  'microsoft-', 'aspect-',
  'msstore', 'mcp-integration', 'mcp-create-declarative-agent', 'mcp-create-adaptive-cards',
  // Salesforce/Slack/Atlassian/Trello/Notion etc
  'paddle', 'patterns-fix',
];

// ── Pure templates / non-knowledge skills to skip ─────────────────────────
const TEMPLATE_PREFIXES = [
  'html-ppt-', 'html-ppt',
  'dating-web', 'gamified-app', 'finance-report', 'magazine-poster',
  'web-prototype', 'kami-deck', 'replit-deck',
  'mobile-onboarding', 'saas-landing', 'pricing-page',
  'social-carousel', 'design-brief', 'ad-campaign-best-practices',
  'liquid-glass', 'docs-page', 'dashboard',
];

// ── Placeholder-style agent stubs ──────────────────────────────────────────
const AGENT_STUB_PREFIX = 'agent-';   // Most agent-X are stubs but some are real
// We'll check description for the placeholder pattern explicitly.

// Skip bio-databases (1-line wrappers for biology APIs)
const BIO_PATTERNS = [
  /-skill$/,  // catches alphafold-skill, chembl-skill, etc. (all suffix)
];

// ── Always-skip: explicitly known not-useful ───────────────────────────────
const HARD_SKIP = new Set([
  'README',
  'open-design-landing',     // has yaml parse error
  'browser-scrape',          // deprecated shim
  // Browser-* skills overlap with shmakk's built-in browser tool
  'browser-auth-flow', 'browser-extract', 'browser-form-fill', 'browser-login',
  'browser-record', 'browser-replay', 'browser-screenshot-diff', 'browser-test',
  'browser', 'playwright-explore-website', 'playwright-automation-fill-in-form',
  'playwright-interactive',
  // Misc niche / placeholder
  'finnish-humanizer', 'linkedin-post-formatter', 'sponsor-finder',
  'configure', 'sag', 'banner-design', 'blog-post', 'critique',
  'camsnap', 'blogwatcher', 'paper-publisher', 'audio-jingle',
  // Already-handled-by-shmakk concepts (cost tracking, memory, audit)
  'cost-track', 'cost-summary', 'cost-conversation', 'cost-budget-check',
  'cost-benchmark', 'cost-booster-edit', 'cost-compact-context', 'cost-export',
  'cost-federation', 'cost-optimize', 'cost-trend',
  // Niche claude-flow / agent-flow specific (would need their CLI)
  'hive-mind', 'flow-nexus-platform', 'flow-nexus-neural', 'flow-nexus-swarm',
  'workflow-create', 'workflow-automation', 'workflow',
  'swarm-init', 'swarm-orchestration', 'swarm-advanced',
  'memory-bridge', 'memory-merger', 'memory-search', 'memory-management',
  'consolidate-memory',
  'agentdb-advanced', 'agentdb-learning', 'agentdb-optimization', 'agentdb-query',
  'federation-init', 'federation-audit', 'agent-coordination',
  'chat-format', 'cognitive-pattern', 'cron-schedule', 'stream-chain',
  'goal-plan', 'github-project-management', 'github-workflow-automation',
  'agentic-eval', 'rvf-manage', 'declarative-agents', 'tweaks',
  'autopilot-loop', 'autopilot-predict',
  'reasoningbank-intelligence', 'reasoningbank-with-agentdb',
  'mcp-create-adaptive-cards', 'mcp-create-declarative-agent', 'mcp-deploy-manage-agents',
  '_chain-audit', 'chain-audit',
  // v3-* are usually project-specific milestones
  'v3-cli-modernization', 'v3-core-implementation', 'v3-ddd-architecture',
  'v3-deep-integration', 'v3-integration-deep', 'v3-mcp-optimization',
  'v3-memory-unification', 'v3-performance-optimization', 'v3-security-overhaul',
  'v3-swarm-coordination',
  // Trading bot stuff (not in shmakk's scope)
  'trader-backtest', 'trader-portfolio', 'trader-regime', 'trader-risk',
  'trader-signal', 'trader-train',
  'market-ingest', 'market-pattern', 'market-skill',
  // Skill / plugin ecosystem meta (specific to Claude Code / Copilot)
  'using-superpowers', 'skill-creator', 'skill-builder', 'skill-development',
  'skill-installer', 'skill-audit', 'skills-tutorial', 'find-skills',
  'skillflag', 'update-skills', 'evaluate-skill', 'example-skill',
  'agent-customization', 'agent-development', 'command-development', 'hook-development',
  'create-hook', 'create-agent', 'create-plugin', 'create-cowork-plugin',
  'create-prompt', 'create-instructions', 'create-agentsmd', 'plugin-creator',
  'plugin-eval', 'plugin-settings', 'validate-plugin', 'evaluate-plugin',
  'community-evals',
  'minimal-plugin-skill', 'example-command', 'make-skill-template',
  'tldr-prompt', 'create-tldr-page',
  'declarative-agents', 'agents-sdk', 'mcp-create-declarative-agent',
  'install-vscode-extension',
  'lsp-setup', 'vscode-ext-localization', 'settings-precedence',
  'roundup', 'roundup-setup',
  'troubleshoot', // there's also our own troubleshoot — keep ours
  // Specific game/media tools
  'phaser-2d-game', 'three-webgl-game', 'react-three-fiber-game',
  'web-3d-asset-pipeline', 'web-game-foundations', 'game-engine', 'game-studio',
  'game-ui-frontend', 'develop-web-game',
  'sprite-animation', 'sora', 'website-to-hyperframes', 'hyperframes', 'hyperframes-cli',
  'transloadit-media-processing', 'video-shortform', 'image-poster', 'motion-frames',
  // Niche editor tools
  'tmux',  // We already add this from top tier as user-editable system tool — but tmux skill ships with shmakk anyway
  // Note: keep tmux off here so it isn't double-handled; we'll just rely on the source file
  // Already implemented as features in shmakk
  'remember', 'remember-interactive-programming',
  'session-persist', 'session-logs',
  // SPARC methodology stuff (claude-flow specific)
  'sparc-methodology', 'sparc-spec', 'sparc-refine',
  // Highly specific frameworks/methodologies we won't support cleanly
  'micro', 'himalaya', 'sonoscli',
  'plantuml-ascii',  // very specific
  'react-audit-grep-patterns',  // overly narrow
  'react18-batching-patterns', 'react18-enzyme-to-rtl', 'react18-legacy-context',
  'react18-lifecycle-patterns', 'react18-string-refs',
  'react19-concurrent-patterns', 'react19-source-patterns',
  // Things we'd want a different version of (we already have / replaced)
  'consolidate-memory', // shmakk's memory.md replaces this
]);

// Long-tail vendor / niche / template / unknown CLI tools that slipped through
[
  // ckm:* claude-flow workflow namespace
  'ckm:slides', 'ckm:ui-styling', 'ckm:design-system', 'ckm:design', 'ckm:brand',
  'ckm:banner-design',
  // Vendor-specific
  'sentry', 'tavily', 'satori', 'sign-in-with-vercel', 'v0-dev',
  'snowflake-semanticview', 'huggingface-trackio', 'huggingface-vision-trainer',
  'web-artifacts-builder',
  'theme-factory',  // claude.ai artifact theming
  'worker-benchmarks', 'worker-integration', 'workers-best-practices',  // Cloudflare workers
  'sandbox-sdk', 'sandbox-npm-install',  // Vercel Sandbox
  // Vector DB / RAG vendor noise
  'vector-cluster', 'vector-embed', 'vector-hyperbolic', 'vector-search', 'vector-setup',
  // TypeSpec / MS Typespec
  'typespec-api-operations', 'typespec-create-agent', 'typespec-create-api-plugin',
  // Templates / decks
  'simple-deck', 'kami-deck', 'weekly-update', 'wireframe-sketch',
  // Niche CLI tools / unknowns
  'songsee', 'sprite-pipeline', 'sprite-animation', 'ruflo-doctor', 'ruflo-tutor',
  'yeet', 'safety-scan', 'scoutqa-test', 'workflow-run', 'workiq-copilot',
  'voice-call', 'weather', 'zotero', 'conversation-intelligence',
  'box-content-api', 'vscode-ext-commands', 'shuffle-json-data',
  'setup-cowork', 'foundry-agent-sync', 'foundry-spaces',
  'search-company-knowledge', 'suggest-awesome-github-copilot-skills',
  'suggest-awesome-github-copilot-agents',
  // SPARC methodology variants we already filter — quotes-stripped names
  'sparc-implement',
  // VS Code / IDE specific
  'install-vscode-extension', 'vscode-ext-localization', 'vscode-ext-commands',
  // Improve-skill operates on Codex skills
  'improve-skill',
  // Web prototype taste variants
  'web-prototype', 'open-design-landing-deck',
  // Microsoft AI Foundry / Copilot SDK
  'microsoft-agent-framework', 'microsoft-code-reference', 'microsoft-docs',
  'copilot-spaces', 'copilot-usage-metrics', 'gh-issues',
  // Aggressive — these aren't broadly useful
  'paddle', 'patterns-fix', 'paper-publisher', 'broken-links',
  'access', 'claims', 'finishing-a-development-branch',
  'jobs',  // looks like a CLI tool, not a workflow
  'gh-fix-ci', 'gh-address-comments',  // copilot-specific PR workflows
  'apple-appstore-reviewer',
  // Twilio-adjacent
  'taskflow', 'taskflow-inbox-triage',
].forEach((n) => HARD_SKIP.add(n));

// Final cleanup pass for items still in 'general' that are vendor/niche
[
  // claude-flow / agentdb internals
  'agentdb-advanced-features', 'agentdb-learning-plugins', 'agentdb-memory-patterns',
  'agentdb-performance-optimization', 'agentdb-vector-search', 'agentic-jujutsu',
  'federation-status', 'finalize-agent-prompt', 'cost-booster-route', 'cost-report',
  'intelligence-route', 'intelligence-transfer', 'loop-worker', 'router-debug',
  'neural-train', 'neural-training', 'phoenix-evals',
  // Vendor SDKs / clouds
  'appkit-interop', 'circleci-builds', 'circleci-config', 'codeql', 'codex-expo-run-actions',
  'codex-result-handling', 'dependabot', 'gh-cli', 'github', 'geist', 'gemini',
  'gog', 'goplaces', 'gsap', 'huggingface-community-evals', 'huggingface-gradio',
  'huggingface-jobs', 'huggingface-llm-trainer', 'huggingface-paper-publisher',
  'huggingface-papers', 'hf-cli', 'hyperframes-registry', 'integrate-context-matic',
  'onboard-context-matic', 'linear', 'live-artifact', 'mcp-copilot-studio-server-generator',
  'mcporter', 'model-usage', 'monitor-stream', 'nano-banana-pro-openrouter',
  'ncc', 'nuget-manager', 'openai-api-troubleshooting', 'openai-platform-api-key',
  'penpot-uiux-design', 'qqbot-channel', 'qqbot-media', 'qqbot-remind',
  'sandbox-sdk', 'sandbox-npm-install',
  // Empty / vague / unknown CLI tools
  'acp-router', 'acpx', 'blucli', 'bootstrap', 'cli-creator', 'cli-mastery', 'cms',
  'clawhub', 'contributing', 'cowork-plugin-customizer', 'cross-platform-paths',
  'daa-agent', 'datasets', 'digital-eguide', 'discover-plugins', 'eightctl',
  'embeddings', 'eng-runbook', 'entra-agent-user', 'exam-ready',
  'freecad-scripts', 'from-the-other-side-vega', 'game-playtest', 'generate-custom-instructions-from-codebase',
  'generate-run-commands', 'get-search-view-results', 'gifgrep', 'hatch-pet',
  'imsg', 'init-project', 'invoice', 'issue-fields-migration', 'kanban-board', 'kg-traverse',
  'legacy-circuit-mockups', 'links', 'magazine-web-ppt',
  'math-olympiad', 'meeting-minutes', 'meeting-notes', 'mobile-app',
  'napkin', 'node-connect', 'non-json-content-types', 'noob-mode', 'oo-component-documentation',
  'ordercli', 'penpot-uiux-design', 'playground', 'polyglot-test-agent',
  'project-setup-info-context7', 'quasi-coder', 'readme', 'research-add-fields',
  'runtime-cache', 'schedule', 'secure-review', 'security-audit',
  'structured-autonomy-implement', 'structured-autonomy-plan', 'systematic-debugging',
  'team-okrs', 'teams', 'triage-issue', 'ui-ux-pro-max', 'update-pr',
  'upgrade-stripe', 'verification-before-completion', 'view-refactor',
  // Version-pinned react patterns (too narrow)
  'react18-dep-compatibility', 'react19-test-patterns',
  // Oracle migration project series (very project specific)
  'creating-oracle-to-postgres-master-migration-plan',
  'creating-oracle-to-postgres-migration-bug-report',
  'creating-oracle-to-postgres-migration-integration-tests',
  'migrating-oracle-to-postgres-stored-procedures',
  'create-github-issue-feature-from-specification',
  // Niche / not broadly useful
  'datanalysis-credit-risk', 'editorconfig',
].forEach((n) => HARD_SKIP.add(n));

// Re-allow tmux explicitly (we want this as a system skill)
HARD_SKIP.delete('tmux');

// ── GTM (business strategy) — bring as 'business' but only the strongest ───
const GTM_KEEP = new Set([
  'gtm-0-to-1-launch', 'gtm-positioning-strategy', 'gtm-product-led-growth',
  'gtm-operating-cadence',  // operating cadence is broadly useful
]);

// Map weird frontmatter categories from upstream skills to our scheme
const CATEGORY_REMAP = {
  'brand-deck': 'design', 'brand-page': 'design',
  'github': 'dev', 'machine-learning': 'research',
  'testing': 'dev', 'web-prototype': 'frontend',
  'document-creation': 'docs',
};

// ── Category resolver ─────────────────────────────────────────────────────
function categorize(name, frontmatterCat) {
  const n = name.toLowerCase();

  // Explicit frontmatter wins if recognized — but remap odd values
  if (frontmatterCat) {
    const fc = String(frontmatterCat).toLowerCase().trim();
    return CATEGORY_REMAP[fc] || fc;
  }

  // Highest priority specific patterns
  if (/-linux-triage$/.test(n)) return 'system';
  if (n === 'tmux') return 'system';
  if (/^(commit|conventional-commit|git-commit|git-workflow|git-flow-branch-creator|using-git-worktrees|create-pr|create-draft-pr|gh-fix-ci|gh-address-comments|gh-issues|github-code-review|github-multi-repo|github-automation|github-issues|finishing-a-development-branch|sync-upstream|merge|diff-analyze|diffs|sync)$/.test(n)) return 'dev';
  if (/^(refactor|refactor-plan|refactor-method-complexity-reduce|review-and-refactor|debug|debugging|debug-failing-test|test-triage|test-gaps|fix-finding|finding-discovery|explain-error|context-map|investigation-mode|doublecheck|validation|verification|verification-quality|claude-md-improver|chunk|create-readme|readme-blueprint-generator|create-architectural-decision-record|adr-review|run-pre-commit-checks|run-smoke-tests|run-e2e-tests|java-refactoring-extract-method|java-refactoring-remove-parameter|ruff-recursive-fix|unified-diff-edit|full-file-edit|comment-code-generate-a-tutorial|write-coding-standards-from-file)$/.test(n)) return 'dev';
  if (/^test-driven|^tdd-|^write-tests$|^pytest-coverage$|^webapp-testing$|^csharp-(mstest|tunit|nunit|xunit)$|^spring-boot-testing$|^unit-test-/.test(n)) return 'dev';
  if (/^(security-scan|security-best-practices|security-ownership-map|security-review|security-threat-model|threat-model-analyst|attack-path-analysis|mcp-security-audit|gdpr-compliant|pii-detect|ai-prompt-engineering-safety-review|secret-scanning)$/.test(n)) return 'security';
  if (/^(pdf|pdftk-server|nano-pdf|xlsx|pptx|pptx-html-fidelity-audit|docx|doc|markdown-to-html|convert-plaintext-to-md)$/.test(n)) return 'files';
  if (/^(transcribe|video-frames|image-manipulation-image-magick|imagegen|image-poster|motion-frames|speech|openai-whisper|openai-whisper-api|audio-jingle|sora|peekaboo|screenshot)$/.test(n)) return 'media';
  if (/^(sql-|postgresql-|neon-postgres|ef-core|cosmosdb-datamodeling|bigquery-pipeline-audit|durable-objects|fabric-lakehouse|indexing-performance-optimization|search-speed-optimization)/.test(n)) return 'database';
  if (/^playwright/.test(n) || /^webapp-testing$/.test(n)) return 'dev';
  if (/^(brainstorming|prd|breakdown-|generate-snapshot|generate-status-report|project-assessment|folder-structure-blueprint-generator|technology-stack-blueprint-generator|architecture-blueprint-generator|project-workflow-analysis-blueprint-generator|cloud-design-patterns|service-oriented-architecture|design-system|design-brief|content-brief|content-strategy|content-translation|create-implementation-plan|create-specification|update-specification|update-implementation-plan|spec-to-backlog|paper-publisher|writing-plans|writing-rules|jobs|first-ask|what-context-needed|search-strategies|investigation-mode)$/.test(n)) return 'planning';
  if (/^(pair-programming|subagent-driven-development|troubleshoot|session-report|session-logs|session-persist|automate-this|autoresearch|deep-research|coding-agent|dispatching-parallel-agents|executing-plans|mentoring-juniors|requesting-code-review|receiving-code-review|repo-story-time|structured-autonomy-generate|verification-quality|sparc-methodology|sparc-spec|sparc-refine|eval-driven-dev|debugging|investigation-mode|first-ask|search-strategies|what-context-needed)$/.test(n)) return 'workflow';
  if (/^(multi-stage-dockerfile|fastapi|nestjs|build-mcp-server|build-mcp-app|build-mcpb|build-chatgpt-app|chatgpt-apps|chatgpt-app-submission|adapter-express|adapter-fastify|adapter-aws-lambda|adapter-fetch|aspnet-core|aspire|spring-boot-testing|create-spring-boot-(kotlin|java)-project|containerize-aspnet-framework|csharp-async|csharp-docs|temporal-developer|trpc-router|api-docs|server-side-calls|server-setup|client-setup|middlewares|routing-middleware|caching|env-vars|dotenv|dotenvx|http-server|http-helpers|subscriptions|next-forge|nextjs|openapi-to-application-code|error-handling|validators|access|claims)$/.test(n)) return 'backend';
  if (/(?:python|java|ruby|swift|rust|kotlin|php|csharp|go|typescript)-mcp-server-generator$/.test(n)) return 'backend';
  if (/^(react-best-practices|react18-|react19-|web-perf|web-design-reviewer|web-coder|chrome-devtools|frontend-testing-debugging|swr|use-dom|json-render|shadcn|shadcn-best-practices|gsap-framer-scroll-animation|next-intl-add-language|frontend-design|frontend-skill|frontend-app-builder|premium-frontend-ui|turbopack|turborepo|ai-elements|ai-sdk|on-page-seo|technical-seo|seo-audit|schema-markup|keyword-clustering|ai-visibility|internal-linking)$/.test(n)) return 'frontend';
  if (/^(excalidraw-diagram-generator|draw-io-diagram-generator|plantuml-ascii|graphify|canvas|mermaid)$/.test(n)) return 'diagrams';
  if (/^(wiki-maintainer|obsidian|obsidian-vault-maintainer|documentation-writer|doc-gen|create-llms|update-llms|mkdocs-translations|update-markdown-file-index|llm-config)$/.test(n)) return 'docs';
  if (/^(deep-research|research|research-add-items|research-report|research-router-skill|research-synthesize|summarize|kg-extract|dossier-collect)$/.test(n)) return 'research';
  if (/^(calendar|tasks|task-management|reminders|notes|email|email-drafter|apple-notes|apple-reminders|things-mac|capture-tasks-from-meeting-notes|update)$/.test(n)) return 'productivity';
  if (/^(gtm-)/.test(n)) return 'business';
  if (/^acquire-codebase-knowledge$|^code-tour$|^code-exemplars-blueprint-generator$|^analyze-code-quality$/.test(n)) return 'dev';
  if (/^(typescript-setup|python-pypi-package-builder|python-manager-discovery|jupyter-notebook|dotnet-best-practices|dotnet-design-pattern-review|dotnet-upgrade|dotnet-timezone|java-add-graalvm-native-image-support|java-docs|aspire|csharp-(async|docs))$/.test(n)) return 'dev';
  if (/^ios-|^swiftui-|^android-performance$|^use-dom$|^expo-|^upgrading-expo$|^react-native-|^building-native-ui$|^native-data-fetching$|^building-mcp-server-on-cloudflare$|^remotion$|^packaging-notarization$|^signing-entitlements$|^msstore-cli$|^apple-appstore-reviewer$/.test(n)) return 'mobile';
  if (/^(observability|observe-trace|observe-metrics|telemetry|sentry|arize-|phoenix-cli|phoenix-tracing|az-cost-optimize)$/.test(n)) return 'devops';
  if (/^(deployments-cicd|devops-rollout-plan|wrangler|build-mcpb)$/.test(n)) return 'devops';

  // Fallback by suffix
  if (/^iot-/.test(n)) return 'system';

  // Bulk fallbacks for the long tail
  if (/^(angular-developer|aspnet-(minimal-api-openapi|core)|aspire|chat-sdk|ai-(elements|sdk|gateway|generation-persistence)|next-(forge|intl-add-language)|nextjs|use-dom|swr|chatgpt-apps|chatgpt-app-submission|chat-format|gradio|transformers\.js)$/.test(n)) return 'frontend';
  if (/^(api-docs|caching|ef-core|express|adapter-|aspire|aspnet|durable-objects|env-vars|dotenv|dotenvx|temporal-developer|trpc-router|subscriptions|server-side-calls|server-setup|client-setup|middlewares|routing-middleware|http-helpers|http-server|http-helpers|http-helpers|validators|access|claims|error-handling|next-forge|nextjs|graphql|aspect-|microsoft-agent-framework|semantic-kernel|webhook|webhook-development|openapi-to-application-code|fluentui-blazor|build-mcp-server|build-mcp-app|build-mcpb|build-chatgpt-app|building-mcp-server-on-cloudflare|building-ai-agent-on-cloudflare|cosmosdb-datamodeling|bigquery-pipeline-audit)$/.test(n)) return 'backend';
  if (/(?:python|java|ruby|swift|rust|kotlin|php|csharp|go|typescript)-mcp-server-generator$/.test(n)) return 'backend';
  if (/^(arch-linux-triage|debian-linux-triage|centos-linux-triage|m5-onboard|peekaboo|geofeed-tuner|window-management|server-side-calls|server-setup)$/.test(n)) return 'system';
  if (/^(security-best-practices|security-ownership-map|security-review|security-threat-model|threat-model-analyst|attack-path-analysis|secret-scanning|secret-scan|mcp-security-audit|ai-prompt-engineering-safety-review|aidefence-|federation-audit|pii-detect|gdpr-compliant|find-secrets)$/.test(n)) return 'security';
  if (/^(adr-(create|index|review)|create-architectural-decision-record|breakdown-(epic-arch|epic-pm|feature-implementation|feature-prd|plan|test|spec)|brainstorming|prd|pm-spec|project-assessment|project-setup-info-local|generate-snapshot|generate-status-report|folder-structure-blueprint-generator|technology-stack-blueprint-generator|architecture-blueprint-generator|copilot-instructions-blueprint-generator|readme-blueprint-generator|project-workflow-analysis-blueprint-generator|service-oriented-architecture|cloud-design-patterns|design-system|create-readme|create-implementation-plan|create-specification|update-specification|update-implementation-plan|spec-to-backlog|writing-plans|writing-rules|jobs|first-ask|what-context-needed|search-strategies|investigation-mode|content-strategy|content-brief|content-translation|capture-tasks-from-meeting-notes|breakdown-epic-arch|breakdown-epic-pm|adr-create|adr-index|adr-review|create-github-issues-feature-from-implementation-plan|create-github-issues-for-unmet-specification-requirements|create-github-action-workflow-specification|create-github-pull-request-from-specification|gen-specs-as-issues|notion-spec-to-implementation|metric-pack-designer|design-brief)$/.test(n)) return 'planning';
  if (/^(autoresearch|deep-research|research|research-add-items|research-report|research-router-skill|research-synthesize|summarize|kg-extract|dossier-collect|paper-publisher|microsoft-docs|openai-docs)$/.test(n)) return 'research';
  if (/^(commit|conventional-commit|git-commit|git-workflow|git-flow-branch-creator|using-git-worktrees|create-pr|create-draft-pr|finishing-a-development-branch|sync|sync-upstream|merge|diff-analyze|diffs|gen-specs-as-issues|github-multi-repo|github-automation|github-issues|github-code-review|my-issues|my-pull-requests|gh-issues|gh-fix-ci|gh-address-comments|repo-story-time|broken-links|build-run-debug|run-pre-commit-checks|run-smoke-tests|run-e2e-tests|refactor|refactor-plan|refactor-method-complexity-reduce|review-and-refactor|debug|debugging|debug-failing-test|debug-test-failure|debugging-tests|test-triage|test-gaps|fix-finding|finding-discovery|explain-error|context-map|investigation-mode|doublecheck|validation|verification|verification-quality|claude-md-improver|chunk|create-readme|run-pre-commit-checks|java-refactoring-(extract-method|remove-parameter)|ruff-recursive-fix|unified-diff-edit|full-file-edit|comment-code-generate-a-tutorial|write-coding-standards-from-file|acquire-codebase-knowledge|code-tour|code-exemplars-blueprint-generator|analyze-code-quality|reviewing-oracle-to-postgres-migration|migrate-create|migrate-validate|scaffolding-oracle-to-postgres-migration-test-project|planning-oracle-to-postgres-migration-integration-testing|terraform-azurerm-set-diff-analyzer)$/.test(n)) return 'dev';
  if (/^test-driven|^tdd-|^write-tests$|^pytest-coverage$|^webapp-testing$|^csharp-(mstest|tunit|nunit|xunit)$|^spring-boot-testing$|^unit-test-/.test(n)) return 'dev';
  if (/^playwright/.test(n)) return 'dev';
  if (/^(boost-prompt|sandbox-(npm-install|sdk)|create-spring-boot-(kotlin|java)-project|containerize-aspnet-framework|update-llms|create-llms|llm-config|typer|typescript-setup|aws-cdk-python-setup|python-pypi-package-builder|python-manager-discovery|java-add-graalvm-native-image-support|java-docs|csharp-(async|docs|mstest|tunit|nunit|xunit|docs)|dotnet-(best-practices|design-pattern-review|upgrade|timezone)|signing-entitlements|packaging-notarization|next-intl-add-language|winui3-migration-guide|broken-links|conventional-commit|gpt-5-4-prompting|prompt-builder|add-educational-comments|add-model-descriptions)$/.test(n)) return 'dev';
  if (/^(observability|observe-trace|observe-metrics|telemetry|appinsights-instrumentation|deployments-cicd|devops-rollout-plan|chronicle|sherpa-onnx-tts|update-avm-modules-in-bicep|geistdocs|publish-to-pages|building-mcp-server-on-cloudflare|building-ai-agent-on-cloudflare|build-mcpb|render-workflows|github-release-management|github-multi-repo|github-automation|github-issues|hooks-automation|gh-issues|gh-address-comments|gh-fix-ci)$/.test(n)) return 'devops';
  if (/^(documentation-writer|doc-gen|create-llms|update-llms|mkdocs-translations|update-markdown-file-index|llm-config|json-render|api-docs|create-readme|readme-blueprint-generator|copilot-instructions-blueprint-generator)$/.test(n)) return 'docs';
  if (/^(wiki-maintainer|obsidian|obsidian-vault-maintainer|bear-notes|apple-notes|prose|notion|update)$/.test(n)) return 'docs';
  if (/^(chrome-devtools|frontend-testing-debugging|web-perf|web-design-reviewer|web-coder|technical-seo|seo-audit|on-page-seo|schema-markup|keyword-clustering|ai-visibility|internal-linking|gsap-framer-scroll-animation|premium-frontend-ui|frontend-app-builder|frontend-design|frontend-skill|shadcn-best-practices|swr|use-dom|json-render|json-render-react|next-intl-add-language|nextjs|next-forge|chat-sdk|ai-(elements|sdk|gateway|generation-persistence)|angular-developer|aspnet-(minimal-api-openapi|core)|aspire|turbopack|turborepo|fluentui-blazor|bencium-innovative-ux-designer|critique)$/.test(n)) return 'frontend';
  if (/^(pair-programming|subagent-driven-development|session-report|automate-this|coding-agent|dispatching-parallel-agents|executing-plans|mentoring-juniors|requesting-code-review|receiving-code-review|repo-story-time|structured-autonomy-generate|sparc-methodology|sparc-spec|sparc-refine|eval-driven-dev|jobs|first-ask|search-strategies|what-context-needed|investigation-mode|debugging|finishing-a-development-branch|conventional-commit|doublecheck|validation|verification|verification-quality|chronicle|act-on-feedback|breakdown-feature-implementation|breakdown-feature-prd|breakdown-plan|breakdown-test|claude-md-improver|create-tldr-page|update|update-skills|finishing-a-development-branch|create-pr|create-draft-pr|using-git-worktrees|micro)$/.test(n)) return 'workflow';
  if (/^(calendar|tasks|task-management|reminders|notes|email|email-drafter|apple-(notes|reminders|appstore-reviewer)|things-mac|capture-tasks-from-meeting-notes|update|hr-onboarding|daily-prep)$/.test(n)) return 'productivity';
  if (/^ios-|^swiftui-|^android-performance$|^android-emulator-qa$|^use-dom$|^expo-|^upgrading-expo$|^react-native-|^building-native-ui$|^native-data-fetching$|^packaging-notarization$|^signing-entitlements$|^msstore-cli$|^apple-appstore-reviewer$/.test(n)) return 'mobile';

  return 'general';
}

// ── Helpers ──────────────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(String(raw || ''));
  if (!m) return { meta: {}, body: String(raw || '') };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = /^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/.exec(line.trim());
    if (!mm) continue;
    let v = mm[2].trim();
    // Strip surrounding quotes (some skills wrap names/categories in "...")
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).trim();
    }
    meta[mm[1].toLowerCase()] = v;
  }
  return { meta, body: m[2] };
}

function shouldSkip(name, raw, fm) {
  const n = name.toLowerCase();
  if (HARD_SKIP.has(name) || HARD_SKIP.has(n)) return 'hard-skip';
  if (SHMAKK_SKILLS.has(n)) return 'redundant (in shmakk)';
  if (!raw || raw.trim().length < 200) return 'too small/empty';

  // GTM filter (keep only the broad ones)
  if (/^gtm-/.test(n) && !GTM_KEEP.has(n)) return 'gtm-not-in-keep-list';

  // Placeholder agent stubs
  const desc = String(fm.meta.description || '');
  if (PLACEHOLDER_DESC.test(desc)) return 'placeholder';
  if (/^agent-/.test(n)) {
    // Almost all agent-* are claude-flow internals or stubs
    return 'agent-stub';
  }

  // Vendor-locked
  for (const p of VENDOR_PREFIXES) {
    if (n.startsWith(p)) return `vendor (${p})`;
  }

  // Templates
  for (const p of TEMPLATE_PREFIXES) {
    if (n.startsWith(p) || n === p.replace(/-$/, '')) return `template (${p})`;
  }

  // Bio databases
  for (const re of BIO_PATTERNS) {
    if (re.test(n)) return 'bio-db';
  }

  // Compatibility patterns
  for (const re of INCOMPAT_PATTERNS) {
    if (re.test(raw)) return 'incompat (claude-code/copilot specific)';
  }

  return null;
}

function ensureCategory(raw, fm, category) {
  // If frontmatter has no category, inject it
  if (fm.meta.category) return raw;
  const fmEnd = raw.indexOf('\n---', 4);
  if (raw.startsWith('---\n') && fmEnd > 0) {
    return raw.slice(0, fmEnd) + `\ncategory: ${category}` + raw.slice(fmEnd);
  }
  // No frontmatter — add it
  return `---\nname: ${fm.meta.name || ''}\ncategory: ${category}\n---\n\n${raw}`;
}

// ── Main ─────────────────────────────────────────────────────────────────
function main() {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const byCategory = new Map();
  const skipped = { reasons: {}, examples: {} };
  let kept = 0;

  for (const file of files) {
    const filePath = path.join(SRC, file);
    let raw;
    try { raw = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
    const fm = parseFrontmatter(raw);
    const name = String(fm.meta.name || path.basename(file, '.md')).toLowerCase().trim().replace(/\s+/g, '-');

    const skip = shouldSkip(name, raw, fm);
    if (skip) {
      skipped.reasons[skip] = (skipped.reasons[skip] || 0) + 1;
      if (!skipped.examples[skip]) skipped.examples[skip] = [];
      if (skipped.examples[skip].length < 3) skipped.examples[skip].push(name);
      continue;
    }

    const category = categorize(name, fm.meta.category);

    // Bundled skills use flat category-prefixed filenames (e.g. backend-api-docs.md).
    // Check that too so we don't re-import a skill already bundled under its category prefix.
    if (SHMAKK_SKILLS.has(category + '-' + name)) {
      const reason = 'redundant (in shmakk, category-prefixed)';
      skipped.reasons[reason] = (skipped.reasons[reason] || 0) + 1;
      if (!skipped.examples[reason]) skipped.examples[reason] = [];
      if (skipped.examples[reason].length < 3) skipped.examples[reason].push(category + '/' + name);
      continue;
    }

    const entry = { name, category, filePath, raw, fm };
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(entry);
    kept++;
  }

  // Report
  console.log(`\n=== Import plan ===`);
  console.log(`Source:      ${SRC} (${files.length} files)`);
  console.log(`Destination: ${DEST}`);
  console.log(`Kept:        ${kept}`);
  console.log(`Skipped:     ${files.length - kept}`);
  console.log(`\nSkip reasons:`);
  for (const [reason, count] of Object.entries(skipped.reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${reason}  ${(skipped.examples[reason] || []).slice(0, 3).join(', ')}`);
  }
  console.log(`\nBy category:`);
  const sortedCats = Array.from(byCategory.keys()).sort();
  for (const cat of sortedCats) {
    console.log(`  ${cat.padEnd(14)} ${byCategory.get(cat).length} skills`);
  }

  if (process.argv.includes('--dump')) {
    const target = process.argv[process.argv.indexOf('--dump') + 1] || 'general';
    const list = byCategory.get(target) || [];
    console.log(`\n=== ${target} (${list.length}) ===`);
    for (const e of list) console.log(`  ${e.name}`);
    return;
  }

  if (!APPLY) {
    console.log(`\nDry run. Run with --apply to copy files.`);
    return;
  }

  // Apply: write all entries
  let written = 0;
  let collisions = 0;
  for (const [cat, entries] of byCategory) {
    const catDir = path.join(DEST, cat);
    fs.mkdirSync(catDir, { recursive: true });
    for (const e of entries) {
      const destFile = path.join(catDir, `${e.name}.md`);
      const content = ensureCategory(e.raw, e.fm, cat);
      if (fs.existsSync(destFile)) {
        // Already there — only write if checksum differs
        const existing = fs.readFileSync(destFile, 'utf8');
        if (existing === content) continue;
        collisions++;
      }
      fs.writeFileSync(destFile, content, 'utf8');
      written++;
    }
  }
  console.log(`\nWrote ${written} files (${collisions} replacements). Total catalog under ${DEST}.`);
}

try { main(); } catch (e) {
  console.error(`[import-skills] ${e.message}`);
  process.exit(1);
}
