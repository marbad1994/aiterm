# shmakk

AI-supervised terminal wrapper — command correction, tool-driven task execution, safety confirmations, and profile-based runtime modes.

Your terminal, supercharged by AI. Optionally: talk to it.

**[Live demo →](https://marbad1994.github.io/shmakk/)**

## Requirements

- **Node.js 18+**
- **Linux or macOS** shell environment

## Install

```bash
npm install -g shmakk
```

That's it. Once installed, use `shmakk` anywhere:

```bash
shmakk --help
```

## Quick start

### 1. Set up an AI provider

```bash
export SHMAKK_BASE_URL="https://your-provider.example/v1"
export SHMAKK_API_KEY="your-api-key"
export SHMAKK_MODEL="gpt-4o-mini"
```

Or configure multiple native model providers in `~/.config/shmakk/endpoints.json`:

```json
{
  "main": "gpt5-codex",
  "fast": "flash",
  "models": {
    "gpt5-codex": {
      "provider": "codex",
      "model": "gpt-5-codex",
      "api_key": "OPENAI_API_KEY"
    },
    "local": {
      "provider": "openai-compatible",
      "base_url": "http://127.0.0.1:1234/v1",
      "model": "qwen/qwen3.5-9b"
    },
    "claude": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "api_key": "ANTHROPIC_API_KEY"
    },
    "flash": {
      "provider": "google",
      "model": "gemini-flash",
      "api_key": "GOOGLE_API_KEY"
    }
  }
}
```

```bash
shmakk --endpoint claude
shmakk --model-recommendation
```

### 2. Launch

```bash
shmakk
```

You're now in an AI-supervised terminal. Type commands as normal. shmakk will:

- **Correct mistakes** — typo in `gti status`? shmakk suggests `git status`. If the correction succeeds, shmakk follows up with the agent using your *original* intent, not just the fixed command.
- **Execute tasks** — ask "set up a new React project" and shmakk handles the steps
- **Keep you safe** — confirms risky commands before running them

## Vim / vi mode

By default, shmakk intercepts `vi` inside a shmakk session. Use `--vim vim` to intercept `vim`, or `--vim disable` to leave both commands untouched.

```bash
shmakk --vim vi
shmakk --vim vim
shmakk --vim disable
```

The shim launches your real Vim with your normal config, then loads shmakk commands:

| Vim command | What it does |
|-------------|--------------|
| `:G <prompt>` | Generate code at the cursor |
| `:Tw <prompt>` | Write prose or documentation |
| `:Cmd <command>` | Run a shell command in a scratch buffer |
| `<C-Space>` / `:ShmakkSuggest` | Full-block AI suggestion with preview + Accept/Deny |
| `:ShmakkAccept` / `:ShmakkPreview` / `:ShmakkDeny` | Handle pending auto-suggestions |

Lowercase `:g` remains Vim's native `:global`; use uppercase `:G` for shmakk. Regular Vim commands such as `:%s/foo/bar/g` continue to work.

Optional automatic suggestions:

```vim
let g:shmakk_auto_suggest = 1
let g:shmakk_auto_suggest_delay_ms = 2000
let g:shmakk_auto_suggest_min_chars = 20
```

Suggestions prefer a fast model endpoint. Configure `"fast"` in `endpoints.json`, or set `SHMAKK_FAST_ENDPOINT` / `SHMAKK_VIM_SUGGEST_ENDPOINT`.

→ Full Vim documentation: [docs/vim.md](docs/vim.md)

## Voice (optional)

speak naturally — shmakk listens, transcribes, responds, and reads its answer aloud. No push-to-talk.

```bash
# Install system dependency
sudo pacman -S sox        # Arch/EndeavourOS
sudo apt install sox      # Debian/Ubuntu
brew install sox          # macOS

# Install voice deps and run preflight check
npm run setup:voice

# Launch in speech-to-speech mode
shmakk --sts
```

Say **"stop"** or **"quiet"** to interrupt TTS mid-sentence.

→ Full voice documentation: [docs/voice.md](docs/voice.md)

## Profiles

Choose a profile to match your workflow:

| Profile | Use case |
|---------|----------|
| `tiny` | Minimal context, fastest responses |
| `balanced` | Default — good for daily work |
| `deep` | Larger investigations, multi-step tasks |
| `builder` / `large-app` | Editing and building large projects |

```bash
shmakk --profile builder
```

Switch profiles mid-session:

```bash
shmakk --profile-set deep
```

## Skills

Skills are task-specific markdown files loaded into the agent's context on demand. The `skills/` directory contains 32 built-in skills covering areas like `code-review`, `research`, `backend`, `devops`, `sysmon`, `logs`, and more.

```bash
shmakk --install-skill <name>   # install a skill from the built-in library
shmakk --load-skill <name>      # load an installed skill for this session
shmakk --list-skills            # show currently loaded skills
```

## Coordinator & Multi-step workflows

The coordinator system enables complex, multi-step task execution with plan-first workflows. When tackling large projects or intricate tasks, shmakk breaks them into manageable steps, validates each stage, and maintains context across the entire workflow.

## Environment variables

| Variable | Description |
|----------|-------------|
| `SHMAKK_BASE_URL` | OpenAI-compatible base URL |
| `SHMAKK_API_KEY` | API key |
| `SHMAKK_MODEL` | Default model |
| `SHMAKK_FAST_ENDPOINT` | Named endpoint for low-latency tasks |
| `SHMAKK_VIM_SUGGEST_ENDPOINT` | Named endpoint for Vim suggestions |
| `SHMAKK_PROVIDER` | `openai-compatible`, `codex`, `anthropic`, or `google` |
| `SHMAKK_HEADERS` | Extra headers (k=v,k=v) |
| `SHMAKK_MODEL_RECOMMENDATION` | Set to `1` to let the configured `main` model route each call |
| `SHMAKK_VIM_SUGGEST_MAX_CHARS` | Max context chars sent for Vim suggestions |
| `SHMAKK_VIM_SUGGEST_BEFORE_LINES` | Context lines before cursor for Vim suggestions |
| `SHMAKK_VIM_SUGGEST_AFTER_LINES` | Context lines after cursor for Vim suggestions |

## Useful commands

| Command | What it does |
|---------|-------------|
| `shmakk --help` | Show help |
| `shmakk --status` | Check if inside shmakk |
| `shmakk --stats` | Session statistics |
| `shmakk --compact` | Clear conversation history |
| `shmakk --install-skill <name>` | Install a skill from the built-in library |
| `shmakk --load-skill <name>` | Load an installed skill for this session |
| `shmakk --list-skills` | List loaded skills |
| `shmakk --reset` | Reset conversation + task journal |
| `shmakk --restart` | Restart the inner shell |
| `shmakk --exit` | Exit shmakk |
| `shmakk --review` | Confirm every AI action |
| `shmakk --yes-files` | Auto-accept file writes |
| `shmakk --no-correction` | Disable command correction |
| `shmakk --colors true\|false` | Toggle colored output |
| `shmakk --sts` | Speech-to-speech mode |
| `shmakk --stt` | Mic input, text responses |
| `shmakk --tts` | Text input, spoken responses |
| `shmakk --vim vi\|vim\|disable` | Select vi/vim interception mode |
| `shmakk --mcp-status` | Show MCP server/tool status |

## MCP tools

shmakk can connect to Model Context Protocol servers over stdio. Configure servers in `.shmakk/mcp.json` for a workspace or `~/.config/shmakk/mcp.json` globally:

```json
{
  "mcpServers": {
    "example": {
      "command": "node",
      "args": ["server.js"],
      "env": { "TOKEN": "${TOKEN}" },
      "safety": "uncertain",
      "safeTools": ["read_status"],
      "unsafeTools": ["delete_item"],
      "timeout": 30000,
      "disabled": false
    }
  }
}
```

Use `shmakk --mcp-status` or the in-session `mcp status` command to inspect discovered servers and tools. MCP tools participate in the same safety confirmation system as built-in tools.

→ Full MCP documentation: [docs/mcp.md](docs/mcp.md)

## Safety

- shmakk prompts you before running commands flagged as risky (writes, deletes, network, installs)
- Secrets (`.env`, keys, tokens) are never sent to the AI
- Workspace root is enforced — tools can't access files outside it

## Remote SSH

The agent can run commands and transfer files on remote hosts via SSH. Configure hosts in `.shmakk/hosts.json` (per-project) or `~/.config/shmakk/hosts.json` (global):

```json
{
  "hosts": {
    "devbox": {
      "host": "marcus@192.168.1.100",
      "port": 22,
      "auto_approve": false,
      "timeout_sec": 30
    },
    "staging": {
      "host": "deploy@10.0.0.5",
      "port": 2247
    }
  },
  "allow_ssh_config": false,
  "default_timeout_sec": 30
}
```

| Tool | Description |
|------|-------------|
| `ssh_run` | Run a shell command on a remote host |
| `ssh_push` | Copy a local workspace file to a remote host |
| `ssh_pull` | Copy a remote file into the local workspace |

SSH key auth via `~/.ssh` is assumed. For persistent connections (avoid re-auth on every call), add to `~/.ssh/config`:

```
Host *
  ControlMaster auto
  ControlPath ~/.ssh/controlmasters/%r@%h:%p
  ControlPersist 600
```

Then `mkdir -p ~/.ssh/controlmasters` once.

→ Full SSH documentation: [docs/ssh.md](docs/ssh.md)

## How it works

shmakk wraps your shell in a PTY (pseudo-terminal). Every command that fails is checked against a deterministic correction engine (no LLM, no API call). If a correction matches and the fixed command succeeds, shmakk feeds the agent your **original input** (not the fixed command) so the agent can address your full intent — not just the typo. You can also give task instructions in natural language — shmakk uses tools to read files, write code, list directories, and run commands, all constrained to your workspace.

## License

MIT
