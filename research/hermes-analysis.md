# Hermes Agent — Research Analysis

Source: https://github.com/NousResearch/hermes-agent

---

## What Hermes Is

Hermes is a self-improving AI agent framework that "creates skills from experience, improves them during use, and runs anywhere." It's built in Python and runs as a CLI that also bridges 15+ messaging platforms (Discord, Telegram, Slack, email, etc.).

It's the best public reference for what a capable desktop/life assistant looks like at scale: 130+ built-in tools, 23 core skill categories, 17 optional skill packs.

---

## Skill Architecture

### What a skill is

A skill is a markdown file with YAML frontmatter. Skills are **knowledge injected into the agent's system prompt** — they teach the agent what to do and how, using existing tools (terminal, web, file operations) to execute. They do not contain runnable code.

**Skill file format:**

```yaml
name: skill-name
description: "Single sentence, max 60 chars, must end with period."
version: X.Y.Z
author: Name
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [relevant, tags]
    related_skills: [other-skill-name]
```

**Mandatory content sections (in order):**
1. Brief intro (what it enables)
2. When to Use — decision criteria for when this skill is relevant
3. Prerequisites — any setup the user needs to do first
4. How to Run — quick start
5. Quick Reference — a cheat sheet of key commands/patterns
6. Procedure — step-by-step workflows
7. Pitfalls — common mistakes and how to avoid them
8. Verification — how to confirm success

### Key constraint: 60-char description max

This is strict and enforced. The description must fit in one sentence ending with a period. No marketing language. This prevents bloat when multiple skills load simultaneously and preserves model attention.

### Skills vs tools

- **Skills**: Wrap external CLIs or web APIs the agent invokes via terminal. Default choice. Low maintenance.
- **Tools**: Deep API integration in code (auth flows, binary data, streaming, synchronized state). Only when shell/web isn't enough.

Contribution priority: bug fixes > cross-platform compat > security > performance > **new skills** > new tools > docs.

Skills are preferred because they compose from existing CLI tools and require no code maintenance.

---

## Tool Architecture

### 130+ built-in tools, organized by category

| Category | Examples |
|----------|---------|
| Terminal/Code | `terminal_tool`, `code_execution_tool` |
| File | `file_operations`, `file_state` |
| Web/Browser | `browser_tool`, `web_tools`, `web_search_registry` |
| Communication | `send_message_tool`, `discord_tool`, `microsoft_graph_client` |
| Vision/Media | `vision_tools`, `image_generation_tool`, `tts_tool` |
| AI/Models | `mixture_of_agents_tool` |
| Productivity | `kanban_tools`, `todo_tool`, `cronjob_tools` |
| Memory | `memory_tool`, `tool_result_storage` |
| Integration | `mcp_tool`, `homeassistant_tool` |
| Security | `skills_guard`, `credential_files` |

### Self-registering tool registry

Each tool lives in a single file that self-registers on import. No central manifest. Auto-discovered from filesystem. A `toolsets.py` file groups tools into composable sets.

All tool handlers must return JSON strings.

### Toolsets — dynamic tool composition

Toolsets group tools and can include other toolsets recursively:

```python
TOOLSETS = {
    "web": { "tools": ["browser", "web_extract"] },
    "debugging": { "tools": ["terminal", "code_debugger"], "includes": ["web", "file"] },
    "_HERMES_CORE_TOOLS": { "tools": ["terminal", "memory", "skill_manager"] }
}
```

`resolve_toolset(name)` recursively expands to a full tool list with cycle detection. Platform-specific agents (Telegram, Discord) each start from `_HERMES_CORE_TOOLS` and add platform-specific tools.

---

## Skill Categories (23 core + 17 optional)

**Core (ships with every install):**
- Development, DevOps, MLOps
- Data science, AI agents, inference
- Creative, media, GIFs, diagramming
- Productivity, note-taking, email
- GitHub, MCP, domain-specific
- Apple ecosystem, gaming, smart home, social media, research

**Optional skill packs (user opt-in):**
- Blockchain (Ethereum, Solana, Hyperliquid)
- Communication, creative, DevOps, email, finance
- Health, MCP, migration, MLOps, productivity
- Research, security, software development, web development

**Takeaway**: Broad coverage, tiered delivery. Prevents bloat while enabling specialization.

---

## Agent Loop Design

1. User message → build ephemeral system prompt (never persisted)
2. Inject enabled toolsets + active skills into prompt
3. LLM call with tools
4. Execute tools (parallel where safe, sequential for interactive)
5. Classify results, detect loops
6. Repeat up to budget (default: 90 iterations)
7. Refund iterations for programmatic (non-interactive) tool calls

**Notable:**
- Prompt caching for ~75% cost reduction on multi-turn conversations
- Automatic context compression at 75% of token limit
- Multi-provider support (OpenAI, Anthropic, Bedrock, OpenRouter) with fallback chains
- Message sanitization: malformed JSON repair, surrogate chars, prompt injection filtering
- Session trajectories saved to SQLite with search

---

## Key Design Principles Worth Adopting

### 1. Skills are knowledge, tools are execution
Keep skill files as pure markdown strategy. Let existing tools (run, read_file, fetch_url) handle execution. Don't add new tools unless you genuinely can't do it with shell commands.

### 2. Mandatory structured sections
Every skill should have: When to use / Prerequisites / Procedure / Pitfalls / Verification. This is what separates a useful skill from vague advice.

### 3. 60-char description discipline
Forces you to be precise about what a skill actually does. If you can't say it in 60 chars, the skill is too broad.

### 4. Platform declarations
If a skill uses Linux-only commands (e.g. `notify-send`, `aplay`), declare it. Prevents confusion.

### 5. Related skills metadata
Link skills that complement each other. E.g. `research` → `writing` → `documents`.

### 6. Toolsets for specialist agents
When routing a task to a specialist (the coordinator pattern), compose tool subsets rather than exposing everything. A documentation specialist doesn't need `delete_file`.

### 7. Prefer breadth through modularity
Don't build one massive skill. Build 20 focused ones. Load the relevant one per context.

---

## What Shmakk Should Do Differently

1. **Shmakk skills are already markdown** — the infrastructure matches Hermes' pattern. Good.

2. **No need for YAML frontmatter complexity** — shmakk only needs `name` and `version`. Keep it simple.

3. **Shmakk is terminal-native** — lean into shell tool composition. Hermes has to abstract over 15 platforms; shmakk can assume a Linux terminal and be more direct.

4. **One active skill at a time** — shmakk's current model injects one skill. For a desktop assistant, the coordinator (Task 2) should auto-select the right skill based on context rather than requiring manual `--load-skill`.

5. **Skill files belong in the repo** — put them in `skills/` at the repo root so users can install directly or reference by URL.
