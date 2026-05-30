function parseArgs(argv) {
  const opts = {
    review: false,
    yesFiles: false,
    updateGlossary: false,
    help: false,
    debug: false,
    workspace: null,
    noAi: false,
    noCorrection: false,
    printConfig: false,
    status: false,
    buildHistory: null,
    stats: false,
    compact: false,
    loadSkill: null,
    listSkills: false,
    skillStatus: false,
    unloadSkill: null,
    installSkill: null,
    globalSkills: false,
    resumeStatus: false,
    showPlan: false,
    mcpStatus: false,
    exitNow: false,
    restart: false,
    profile: null,
    profileSet: null,
    colors: null,
    markdown: null,
    endpoint: null,
    modelRecommendation: false,
    voice: false,
    stt: false,
    tts: false,
    sts: false,
    voiceLanguage: null,
    voiceMaxDuration: null,
    voiceSilenceSec: null,
    voiceSilenceThreshold: null,
    voiceSilenceStartSec: null,
    voicePadStartSec: null,
    ttsVoice: null,
    notify: false,
    completion: null,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--review': opts.review = true; break;
      case '--yes-files': opts.yesFiles = true; break;
      case '--update-command-glossary': opts.updateGlossary = true; break;
      case '-h':
      case '--help': opts.help = true; break;
      case '--debug': opts.debug = true; break;
      case '--no-ai': opts.noAi = true; break;
      case '--no-correction': opts.noCorrection = true; break;
      case '--print-config': opts.printConfig = true; break;
      case '--workspace': opts.workspace = argv[++i] || null; break;
      case '--status': opts.status = true; break;
      case '--stats': opts.stats = true; break;
      case '--compact': opts.compact = true; break;
      case '-G':
      case '--global': opts.globalSkills = true; break;
      case '--load-skill': opts.loadSkill = argv[++i] || null; break;
      case '--list-skills': opts.listSkills = true; break;
      case '--skill-status': opts.skillStatus = true; break;
      case '--unload-skill': opts.unloadSkill = argv[++i] || null; break;
      case '--install-skill': opts.installSkill = argv[++i] || null; break;
      case '--resume-status': opts.resumeStatus = true; break;
      case '--show-plan': opts.showPlan = true; break;
      case '--mcp-status': opts.mcpStatus = true; break;
      case '--exit': opts.exitNow = true; break;
      case '--restart': opts.restart = true; break;
      case '--reset': opts.reset = true; break;
      case '--profile': opts.profile = argv[++i] || null; break;
      case '--profile-set': opts.profileSet = argv[++i] || null; break;
      case '--build-history':
        opts.buildHistory = [];
        // Collect remaining args as file paths until next flag
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          opts.buildHistory.push(argv[++i]);
        }
        if (!opts.buildHistory.length) opts.buildHistory = null; // flag with no files = auto-detect
        break;
      case '--stt': opts.stt = true; opts.voice = true; break;
      case '--tts': opts.tts = true; break;
      case '--sts': opts.sts = true; opts.stt = true; opts.tts = true; opts.voice = true; break;
      case '--voice': opts.stt = true; opts.voice = true; break;
      case '--voice-language': opts.voiceLanguage = argv[++i] || null; break;
      case '--voice-max-sec': opts.voiceMaxDuration = parseInt(argv[++i], 10) || null; break;
      case '--voice-silence-sec': opts.voiceSilenceSec = argv[++i] || null; break;
      case '--voice-silence-threshold': opts.voiceSilenceThreshold = argv[++i] || null; break;
      case '--voice-silence-start-sec': opts.voiceSilenceStartSec = argv[++i] || null; break;
      case '--voice-pad-start-sec': opts.voicePadStartSec = argv[++i] || null; break;
      case '--tts-voice': opts.ttsVoice = argv[++i] || null; break;
      case '--notify': opts.notify = true; break;
      case '--completion': opts.completion = argv[++i] || null; break;
      case '--colors': opts.colors = argv[++i] || null; break;
      case '--markdown': opts.markdown = argv[++i] || null; break;
      case '--endpoint': opts.endpoint = argv[++i] || null; break;
      case '--model-recommendation': opts.modelRecommendation = true; break;
      default: opts.unknown.push(a);
    }
  }
  return opts;
}

const HELP = `shmakk - AI-supervised terminal wrapper

  Launch shmakk, then type commands as usual. shmakk watches the shell, catches
  failures, and calls an LLM to fix them, plan tasks, and edit files.

  You can also type natural-language self-commands directly into the session
  (e.g. "list skills", "agent overview", "compact"). See SELF-COMMANDS below.

  Type "help" inside a session to see this same text.

═══════════════════════════════════════════════════════════════════════════
  LAUNCH OPTIONS
═══════════════════════════════════════════════════════════════════════════

  shmakk                           Launch in auto mode (AI acts on failures)
  shmakk --review                  Launch in review mode (confirm every AI action)
  shmakk --yes-files               Auto-accept file writes, edits, mkdir

  shmakk --help                    Show this help
  shmakk --build-history [files]   Parse shell history for better corrections
  shmakk --update-command-glossary Scan PATH and build local command glossary

  --no-ai                          Disable AI entirely (pure passthrough)
  --no-correction                  Disable command correction
  --debug                          Verbose logging to stderr
  --print-config                   Print resolved configuration and exit

  --workspace <path>               Override workspace root
  --profile <name>                 Startup profile: tiny|balanced|deep|builder|large-app
  --colors <true|false>            Enable or disable ANSI colors
  --markdown <true|false>          Enable or disable markdown rendering
  --notify                         Desktop notifications for Y/n prompts

═══════════════════════════════════════════════════════════════════════════
  MODEL PROVIDERS
═══════════════════════════════════════════════════════════════════════════

  --endpoint <name>                Use model preset from ~/.config/shmakk/endpoints.json
  --model-recommendation           Main model chooses best model per call

  Providers: openai-compatible | codex | anthropic | google
  Configure in ~/.config/shmakk/endpoints.json:
    {
      "main": "claude",
      "models": {
        "claude":       { "provider":"anthropic", "model":"claude-sonnet-4-5-...", "api_key":"..." },
        "gpt5":         { "provider":"codex",     "model":"gpt-5-codex",        "api_key":"..." },
        "local-qwen":   { "provider":"openai-compatible", "base_url":"http://127.0.0.1:1234/v1",
                          "model":"qwen/qwen3.5-9b" }
      }
    }

═══════════════════════════════════════════════════════════════════════════
  SESSION CONTROL  (shmakk --flag  from another terminal)
═══════════════════════════════════════════════════════════════════════════

  shmakk --status                  Is this terminal inside shmakk?
  shmakk --stats                   Session/task stats (journal, audit, skill)
  shmakk --show-plan               Current plan: tasks and progress
  shmakk --resume-status           Task journal summary for continuity
  shmakk --mcp-status              MCP servers and their tools

  shmakk --compact                 Clear conversation + task journal
  shmakk --reset                   Clear AI conversation history (keep session)
  shmakk --restart                 Restart the inner shell (keeps window)
  shmakk --exit                    Cleanly exit the parent shmakk

  shmakk --profile-set <name>      Switch profile and restart

  shmakk --load-skill <name>       Load a skill into workspace state
  shmakk --install-skill <url>     Download skill markdown from URL, validate, load
  shmakk -G, --global              Use global (~/.config/shmakk) with --load-skill / --install-skill
  shmakk --list-skills             List all registered skills (workspace + global)
  shmakk --skill-status            Active skill and registry status
  shmakk --unload-skill <name>     Remove skill from whichever registry has it

═══════════════════════════════════════════════════════════════════════════
  SELF-COMMANDS  (type inside an shmakk session)
═══════════════════════════════════════════════════════════════════════════

  ── Skills ──
  list skills                      List all registered skills
  list skills <category>           List skills in a specific category
  list skill categories            Show available skill categories
  find skills <query>              Search skills by name/description
  load skill <name>                Load a skill into the active workspace
  unload skill <name>              Remove a skill from its registry
  skill status                     Show active skill and registry state

  ── Agents & Team ──
  agent overview                   Show all agents and their specialisms
  agent skills                     List all agent skills
  agent <name>                     Show detail for a specific agent
  list agents                      Alias for agent overview

  ── Context & Session ──
  status                           Show session status
  stats                            Show session/task statistics
  resume status                    Show task journal for resume continuity
  show plan                        Display current plan and progress
  compact                          Clear conversation + task journal
  reset                            Clear AI conversation history

  ── Memory & Search ──
  recall <query>                   Search past sessions by content
  find session <query>             Find a session by topic
  last sessions                    Show recent sessions
  search db status                 Display session search DB info
  show memory                      List stored memories
  forget <query>                   Remove matching memories

  ── Configuration ──
  show config                      Print resolved configuration
  mcp status                       Show MCP servers and tools
  show rules                       Display active workspace rules
  list endpoints                   List configured model endpoints
  use endpoint <name>              Switch to a named model endpoint
  set model to <name>              Change the active model
  set url to <url>                 Change the base URL
  set api key to <key>             Change the API key

  ── Toggles ──
  enable review  |  disable review
  enable correction  |  disable correction
  enable yes-files  |  disable yes-files
  enable colors  |  disable colors
  enable debug  |  disable debug

  ── Workflows ──
  list workflows                   Show available automation workflows
  run workflow <name>              Execute a named workflow

  ── Edits ──
  review edits                     Step through pending file changes

  ── Meta ──
  sidebar <query>                  Out-of-band agent query (not added to history)
  help                             Show this help

═══════════════════════════════════════════════════════════════════════════
  VOICE  (Speech-to-Text / Text-to-Speech)
═══════════════════════════════════════════════════════════════════════════

  --sts                            Speech-to-Speech: always-on mic + TTS
  --stt                            Speech-to-Text: mic input, text output
  --tts                            Text-to-Speech: text input, spoken output

  --voice-language <code>          Language hint (e.g. en, es, fr)
  --voice-max-sec <sec>            Max recording seconds (default: 30)
  --voice-silence-sec <sec>        Silence before stopping (default: 1.0)
  --voice-silence-threshold <%>    VAD amplitude threshold (default: 1%)
  --voice-silence-start-sec <sec>  Sound required before start (default: 0.5)
  --voice-pad-start-sec <sec>      Padding at start of recording (default: 0.3)
  --tts-voice <name>               Override daily voice rotation

  STT: Whisper-base ONNX in-process. No Python, no server, no API key.
  TTS: kokoro-js (Kokoro-82M ONNX, ~334MB fp16). Auto-download on first use.
  Requires aplay, paplay, or afplay for audio. 28 voices, rotated daily.

═══════════════════════════════════════════════════════════════════════════
  ENVIRONMENT
═══════════════════════════════════════════════════════════════════════════

  SHMAKK_BASE_URL                  OpenAI-compatible base URL
  SHMAKK_API_KEY                   API key
  SHMAKK_MODEL                     Default model
  SHMAKK_PROVIDER                  Provider: openai-compatible|codex|anthropic|google
  SHMAKK_HEADERS                   Extra headers: k=v,k=v
  SHMAKK_REGISTRY                  Model registry filter (comma-separated)
  SHMAKK_MODEL_RECOMMENDATION      Set to 1 to let main model choose per call

  SHMAKK_HF_CACHE                  HuggingFace cache directory (voice models)
  SHMAKK_TTS_VOICE                 Pin a specific TTS voice
  SHMAKK_TTS_DTYPE                 Kokoro dtype: fp32|fp16|q8|q4|q4f16 (default: fp16)
  SHMAKK_VOICE_LANGUAGE            Language hint for STT
  SHMAKK_VOICE_MAX_SEC             Max recording seconds
  SHMAKK_VOICE_SILENCE_SEC         VAD silence threshold seconds
  SHMAKK_VOICE_SILENCE_THRESHOLD   VAD amplitude threshold
  SHMAKK_VOICE_PAD_START_SEC       Start-of-recording padding

═══════════════════════════════════════════════════════════════════════════
  MCP & BROWSER
═══════════════════════════════════════════════════════════════════════════

  MCP servers: configure in ~/.config/shmakk/mcp.json or .shmakk/mcp.json
    { "mcpServers": { "name": { "command": "...", "args": [...] } } }

  Browser automation: requires playwright
    npm install playwright && npx playwright install chromium
  Tools: navigate, click, type, read_page, screenshot, evaluate, select,
  wait, scroll, close.

═══════════════════════════════════════════════════════════════════════════
  REMOTE HOSTS (SSH)
═══════════════════════════════════════════════════════════════════════════

  The agent can run commands on remote hosts and transfer files via SSH.
  Configure hosts in .shmakk/hosts.json or ~/.config/shmakk/hosts.json:

    {
      "hosts": {
        "devbox": {
          "host": "user@192.168.1.100",
          "port": 22,
          "auto_approve": false,
          "timeout_sec": 30
        }
      },
      "allow_ssh_config": false,
      "default_timeout_sec": 30
    }

  Agent tools: ssh_run (run command), ssh_push (upload), ssh_pull (download).
  For persistent connections, use ControlMaster in ~/.ssh/config:
    Host *
      ControlMaster auto
      ControlPath ~/.ssh/controlmasters/%r@%h:%p
      ControlPersist 600

`;

module.exports = { parseArgs, HELP };
