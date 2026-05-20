#!/usr/bin/env node
// shmakk JSON-RPC stdio server — spawned by the VS Code extension.
// Communicates via newline-delimited JSON on stdin/stdout.

const path = require('path');
const { runAgent } = require('./agent');
const { normalizeProfile } = require('./profiles');

const pending = new Map(); // id -> AbortController

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});

process.stdin.on('end', () => {
  for (const [id, ctrl] of pending) {
    ctrl.abort();
    pending.delete(id);
  }
  process.exit(0);
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function handle(msg) {
  switch (msg.type) {
    case 'agent': {
      const id = msg.id;
      const ctrl = new AbortController();
      pending.set(id, ctrl);

      const profile = normalizeProfile(msg.profile || 'balanced');

      try {
        const history = await runAgent({
          input: msg.prompt,
          roots: [msg.workspaceRoot || process.cwd()],
          glossary: null,
          confirmTool: async () => true, // VS Code context: auto-approve
          write: (text) => send({ type: 'chunk', id, text }),
          signal: ctrl.signal,
          history: msg.history || [],
          profile: msg.profile || 'balanced',
          colors: false,
          voiceMode: false,
        });

        send({
          type: 'done',
          id,
          history: history.map((h) => ({
            role: h.role,
            content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
          })),
        });
      } catch (err) {
        send({ type: 'error', id, error: err.message });
      } finally {
        pending.delete(id);
      }
      break;
    }

    case 'abort': {
      const ctrl = pending.get(msg.id);
      if (ctrl) {
        ctrl.abort();
        pending.delete(msg.id);
        send({ type: 'aborted', id: msg.id });
      }
      break;
    }

    default:
      send({ type: 'error', id: msg.id || 'unknown', error: `Unknown message type: ${msg.type}` });
  }
}
