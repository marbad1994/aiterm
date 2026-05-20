# shmakk VS Code Extension

Bring shmakk into VS Code Chat — type `@shmakk` to code, fix, or explain anything in your workspace.

## Features

- **Chat participant**: `@shmakk <prompt>` in VS Code Chat invokes the shmakk agent
- **Session persistence**: All sessions saved to `~/.local/state/shmakk/sessions/`
- **Session viewer**: `shmakk: List Sessions` command to browse past sessions
- **Follow-up prompts**: Quick follow-ups after each response

## Requirements

- VS Code 1.93+
- GitHub Copilot Chat extension (provides the Chat infrastructure)
- shmakk CLI configured with an AI backend (`SHMAKK_BASE_URL`)

## Build from source

```bash
cd vscode
npm install
npm run build
```

Then press F5 to launch a new VS Code window with the extension loaded.

## How it works

The extension spawns `src/shmakk-server.js` as a child process and communicates via newline-delimited JSON on stdio. The server runs shmakk's `runAgent()` with the user's prompt, streaming results back to the chat panel.
