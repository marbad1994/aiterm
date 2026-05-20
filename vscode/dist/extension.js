"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var import_child_process = require("child_process");
var PARTICIPANT_ID = "shmakk.agent";
function globalConfigDir() {
  return path.join(os.homedir(), ".config", "shmakk");
}
function workspaceConfigDir() {
  return path.join(workspaceRoot(), ".shmakk");
}
function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
}
function sessionsDir() {
  const base = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(base, "shmakk", "sessions");
}
function listSessions() {
  const dir = sessionsDir();
  if (!fs.existsSync(dir)) return [];
  const sessions = [];
  for (const f of fs.readdirSync(dir).filter((f2) => f2.endsWith(".json"))) {
    try {
      sessions.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    } catch {
    }
  }
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions;
}
function saveSession(session) {
  const dir = sessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${session.id}.json`), JSON.stringify(session, null, 2));
}
var serverProcess = null;
var serverCallbacks = /* @__PURE__ */ new Map();
function startServer() {
  if (serverProcess && !serverProcess.killed) return serverProcess;
  const serverPath = path.resolve(__dirname, "..", "..", "src", "shmakk-server.js");
  const state = readWorkspaceState();
  const env = { ...process.env };
  if (state.endpoint?.base_url) env.SHMAKK_BASE_URL = state.endpoint.base_url;
  if (state.endpoint?.api_key) env.SHMAKK_API_KEY = state.endpoint.api_key;
  if (state.model) env.SHMAKK_MODEL = state.model;
  env.FORCE_COLOR = "0";
  env.NO_COLOR = "1";
  env.SHMAKK_NO_SPINNER = "1";
  serverProcess = (0, import_child_process.spawn)(process.execPath, [serverPath], {
    cwd: workspaceRoot(),
    env,
    stdio: ["pipe", "pipe", "pipe"]
  });
  let buffer = "";
  serverProcess.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const cb = serverCallbacks.get(msg.id);
        if (!cb) continue;
        switch (msg.type) {
          case "chunk":
            cb.onChunk(msg.text);
            break;
          case "done":
            cb.resolve({ messages: msg.history || [] });
            serverCallbacks.delete(msg.id);
            break;
          case "error":
            cb.reject(new Error(msg.error));
            serverCallbacks.delete(msg.id);
            break;
          case "aborted":
            serverCallbacks.delete(msg.id);
            break;
        }
      } catch {
      }
    }
  });
  serverProcess.stderr.on("data", (data) => {
    console.error(`[shmakk-server] ${data.toString()}`);
  });
  serverProcess.on("exit", () => {
    for (const cb of serverCallbacks.values()) {
      cb.reject(new Error("shmakk server exited"));
    }
    serverCallbacks.clear();
    serverProcess = null;
  });
  return serverProcess;
}
function sendToServer(msg) {
  startServer().stdin.write(JSON.stringify(msg) + "\n");
}
function abortServerRequest(id) {
  sendToServer({ type: "abort", id });
}
function restartServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
function registerChatParticipant(context) {
  const handler = async (request, _chatContext, stream, token) => {
    const root = workspaceRoot();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: sessionId,
      workspace: root,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      messages: [],
      status: "running"
    };
    stream.progress("shmakk is thinking\u2026");
    try {
      let fullResponse = "";
      await new Promise((resolve2, reject) => {
        serverCallbacks.set(sessionId, {
          onChunk: (text) => {
            fullResponse += text;
            stream.markdown(text);
          },
          resolve: resolve2,
          reject
        });
        sendToServer({
          type: "agent",
          id: sessionId,
          prompt: request.prompt,
          workspaceRoot: root,
          history: [],
          profile: readWorkspaceState().profile || "balanced"
        });
        token.onCancellationRequested(() => {
          abortServerRequest(sessionId);
          serverCallbacks.delete(sessionId);
        });
      });
      session.messages = [
        { role: "user", content: request.prompt },
        { role: "assistant", content: fullResponse }
      ];
      session.status = "completed";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      saveSession(session);
      return { metadata: { sessionId, command: "" } };
    } catch (err) {
      session.status = token.isCancellationRequested ? "aborted" : "completed";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      saveSession(session);
      if (!token.isCancellationRequested) {
        stream.markdown(`**shmakk error:** ${err.message}`);
      }
      return { metadata: { sessionId, command: "" }, errorDetails: { message: err.message } };
    }
  };
  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "icon.png");
  participant.followupProvider = {
    provideFollowups() {
      return [
        { prompt: "explain the changes", label: "Explain changes" },
        { prompt: "run the tests", label: "Run tests" },
        { prompt: "summarize this session", label: "Summarize" }
      ];
    }
  };
  context.subscriptions.push(participant);
}
function loadEndpoints() {
  const merged = {};
  for (const dir of [globalConfigDir(), workspaceConfigDir()]) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, "endpoints.json"), "utf8"));
      Object.assign(merged, data);
    } catch {
    }
  }
  return merged;
}
function loadSkills() {
  const skills = [];
  let activeName = "";
  try {
    activeName = JSON.parse(fs.readFileSync(
      path.join(workspaceConfigDir(), "state", "active-skill.json"),
      "utf8"
    )).name || "";
  } catch {
  }
  for (const source of ["workspace", "global"]) {
    const dir = source === "global" ? path.join(globalConfigDir(), "skills") : path.join(workspaceConfigDir(), "skills");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f2) => f2.endsWith(".md"))) {
      const name = f.replace(/\.md$/, "");
      let description = "";
      try {
        const content = fs.readFileSync(path.join(dir, f), "utf8");
        const m = /^---\n[\s\S]*?\ndescription:\s*(.+)\n[\s\S]*?\n---/.exec(content);
        if (m) description = m[1].trim();
      } catch {
      }
      skills.push({ name, active: name === activeName, description, source });
    }
  }
  return skills;
}
function stateFilePath() {
  return path.join(workspaceConfigDir(), "state", "vscode-state.json");
}
function readWorkspaceState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function writeWorkspaceState(patch) {
  const dir = path.dirname(stateFilePath());
  fs.mkdirSync(dir, { recursive: true });
  const current = readWorkspaceState();
  const next = { ...current, ...patch };
  for (const k of Object.keys(next)) {
    if (next[k] === void 0) delete next[k];
  }
  fs.writeFileSync(stateFilePath(), JSON.stringify(next, null, 2));
}
var currentPanel;
function getWebviewHtml(webview) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
  <title>shmakk</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size,13px); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; opacity: 0.6; padding: 10px 12px 4px; }
    .section { border-bottom: 1px solid var(--vscode-panel-border); padding: 0 12px 8px; }
    .row { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
    label { font-size: 12px; opacity: 0.8; min-width: 55px; }
    input, select { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 4px 8px; font-family: inherit; font-size: 12px; }
    input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.sec { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.sec:hover { background: var(--vscode-button-secondaryHoverBackground); }
    ul { list-style: none; margin: 4px 0; }
    li { padding: 3px 6px; font-size: 12px; cursor: pointer; border-radius: 3px; display: flex; align-items: center; gap: 6px; }
    li:hover { background: var(--vscode-list-hoverBackground); }
    li.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .badge { font-size: 9px; padding: 1px 5px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .tag { font-size: 9px; padding: 1px 5px; border-radius: 3px; opacity: 0.6; }
    .status { font-size: 11px; opacity: 0.6; padding: 4px 0; }
  </style>
</head>
<body>
  <h3>Endpoint</h3>
  <div class="section">
    <div class="row">
      <select id="epSelect" onchange="switchEndpoint()">
        <option value="">-- select --</option>
      </select>
      <button onclick="refreshEndpoints()" class="sec">\u21BB</button>
    </div>
    <div class="status" id="epStatus"></div>
  </div>

  <h3>Model & Profile</h3>
  <div class="section">
    <div class="row"><label>Model</label><input type="text" id="modelInput" placeholder="gpt-4o-mini"></div>
    <div class="row">
      <label>Profile</label>
      <select id="profileSelect">
        <option value="tiny">tiny</option>
        <option value="balanced" selected>balanced</option>
        <option value="deep">deep</option>
        <option value="builder">builder</option>
      </select>
    </div>
    <div class="row"><button onclick="saveSettings()">Save</button></div>
    <div class="status" id="cfgStatus"></div>
  </div>

  <h3>Skills</h3>
  <div class="section">
    <ul id="skillsList"><li>Loading\u2026</li></ul>
    <div class="row"><button onclick="refreshSkills()" class="sec">Refresh</button></div>
    <div class="status" id="skillStatus"></div>
  </div>

  <h3>Sessions</h3>
  <div class="section">
    <ul id="sessionsList"><li>Loading\u2026</li></ul>
    <div class="row" style="gap:4px">
      <button onclick="refreshSessions()" class="sec">Refresh</button>
      <button onclick="clearAllSessions()" class="sec">Clear All</button>
    </div>
  </div>

  <script>
    const vsc = acquireVsCodeApi();
    const el = (id) => document.getElementById(id);

    window.addEventListener('load', () => { vsc.postMessage({ type: 'init' }); });

    window.addEventListener('message', (e) => {
      const m = e.data;
      switch (m.type) {
        case 'endpoints':
          el('epSelect').innerHTML = '<option value="">-- select --</option>' +
            Object.entries(m.endpoints || {}).map(([k]) => '<option value="'+k+'"'+(m.current===k?' selected':'')+'>'+k+'</option>').join('');
          if (m.current) el('epStatus').textContent = 'Active: ' + m.current;
          break;
        case 'skills':
          el('skillsList').innerHTML = (m.skills||[]).length
            ? m.skills.map(s => '<li class="'+(s.active?'active':'')+'" onclick="toggleSkill(''+s.name+'',''+s.source+'')">'+s.name+(s.active?' <span class="badge">active</span>':'')+'<span class="tag">'+s.source+'</span>'+(s.description?'<br><small>'+s.description+'</small>':'')+'</li>').join('')
            : '<li>No skills</li>';
          break;
        case 'sessions':
          el('sessionsList').innerHTML = (m.sessions||[]).length
            ? m.sessions.map(s => '<li onclick="loadSession(''+s.id+'')"><strong>'+s.status+'</strong> '+new Date(s.updatedAt).toLocaleDateString()+'<span class="badge">'+s.messages.length+'</span><br><small>'+s.id+'</small></li>').join('')
            : '<li>No sessions</li>';
          break;
        case 'settings':
          if (m.s.model) el('modelInput').value = m.s.model;
          if (m.s.profile) el('profileSelect').value = m.s.profile;
          break;
        case 'status': el('epStatus').textContent = m.text; break;
        case 'skillToggled': el('skillStatus').textContent = m.text; refreshSkills(); break;
        case 'sessionsCleared': el('sessionsList').innerHTML = '<li>No sessions</li>'; break;
      }
    });

    function switchEndpoint() {
      const v = el('epSelect').value;
      if (v) vsc.postMessage({ type: 'switchEndpoint', name: v });
    }
    function toggleSkill(name, source) {
      vsc.postMessage({ type: 'toggleSkill', name, source });
    }
    function loadSession(id) { vsc.postMessage({ type: 'loadSession', id }); }
    function clearAllSessions() { vsc.postMessage({ type: 'clearSessions' }); }
    function refreshEndpoints() { vsc.postMessage({ type: 'init' }); }
    function refreshSkills() { vsc.postMessage({ type: 'getSkills' }); }
    function refreshSessions() { vsc.postMessage({ type: 'getSessions' }); }
    function saveSettings() {
      vsc.postMessage({ type: 'saveSettings', s: { model: el('modelInput').value.trim(), profile: el('profileSelect').value } });
      el('cfgStatus').textContent = 'Saved \u2713';
      setTimeout(() => el('cfgStatus').textContent = '', 2000);
    }
  </script>
</body>
</html>`;
}
function openSettingsPanel(context) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Two);
    return;
  }
  currentPanel = vscode.window.createWebviewPanel(
    "shmakkSettings",
    "shmakk Settings",
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  currentPanel.webview.html = getWebviewHtml(currentPanel.webview);
  currentPanel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.type) {
      case "init":
      case "getEndpoints": {
        const eps = loadEndpoints();
        const state = readWorkspaceState();
        const current = state.endpointName || null;
        currentPanel?.webview.postMessage({ type: "endpoints", endpoints: eps, current });
        currentPanel?.webview.postMessage({
          type: "settings",
          s: { model: state.model || "", profile: state.profile || "" }
        });
        break;
      }
      case "switchEndpoint": {
        const eps = loadEndpoints();
        const cfg = eps[msg.name];
        if (cfg) {
          writeWorkspaceState({
            endpointName: msg.name,
            endpoint: cfg,
            model: cfg.model || readWorkspaceState().model
          });
          restartServer();
          currentPanel?.webview.postMessage({ type: "status", text: `Switched to: ${msg.name}` });
        }
        break;
      }
      case "getSkills": {
        currentPanel?.webview.postMessage({ type: "skills", skills: loadSkills() });
        break;
      }
      case "getSessions": {
        currentPanel?.webview.postMessage({ type: "sessions", sessions: listSessions() });
        break;
      }
      case "saveSettings": {
        const s = msg.s;
        writeWorkspaceState({
          model: s.model || void 0,
          profile: s.profile || void 0
        });
        restartServer();
        break;
      }
      case "toggleSkill": {
        const stateDir = path.join(workspaceConfigDir(), "state");
        const activePath = path.join(stateDir, "active-skill.json");
        fs.mkdirSync(stateDir, { recursive: true });
        const skills = loadSkills();
        const currentActive = skills.find((s) => s.active);
        if (msg.name === currentActive?.name) {
          fs.writeFileSync(activePath, "{}");
          currentPanel?.webview.postMessage({ type: "skillToggled", text: `Unloaded: ${msg.name}` });
        } else {
          fs.writeFileSync(activePath, JSON.stringify({ name: msg.name, active: true }));
          currentPanel?.webview.postMessage({ type: "skillToggled", text: `Loaded: ${msg.name}` });
        }
        break;
      }
      case "loadSession": {
        const session = listSessions().find((s) => s.id === msg.id);
        if (session) {
          const doc = await vscode.workspace.openTextDocument({
            content: formatSession(session),
            language: "markdown"
          });
          await vscode.window.showTextDocument(doc);
        }
        break;
      }
      case "clearSessions": {
        const answer = await vscode.window.showWarningMessage(
          "Delete all shmakk sessions?",
          { modal: true },
          "Delete All"
        );
        if (answer === "Delete All") {
          const dir = sessionsDir();
          if (fs.existsSync(dir)) {
            for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
          }
          currentPanel?.webview.postMessage({ type: "sessionsCleared" });
        }
        break;
      }
    }
  });
  currentPanel.onDidDispose(() => {
    currentPanel = void 0;
  });
}
function activate(context) {
  registerChatParticipant(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("shmakk.openSettings", () => openSettingsPanel(context)),
    vscode.commands.registerCommand("shmakk.toggleSettings", () => {
      currentPanel ? currentPanel.dispose() : openSettingsPanel(context);
    }),
    vscode.commands.registerCommand("shmakk.switchEndpoint", async () => {
      const eps = loadEndpoints();
      const names = Object.keys(eps);
      if (!names.length) {
        vscode.window.showInformationMessage(
          "No endpoints configured. Create ~/.config/shmakk/endpoints.json or .shmakk/endpoints.json"
        );
        return;
      }
      const picked = await vscode.window.showQuickPick(names, { placeHolder: "Select endpoint" });
      if (picked) {
        const cfg = eps[picked];
        writeWorkspaceState({
          endpointName: picked,
          endpoint: cfg,
          model: cfg.model || readWorkspaceState().model
        });
        restartServer();
        vscode.window.showInformationMessage(`Switched to: ${picked}`);
      }
    }),
    vscode.commands.registerCommand("shmakk.loadSkill", async () => {
      const skills = loadSkills();
      if (!skills.length) {
        vscode.window.showInformationMessage(
          "No skills found in ~/.config/shmakk/skills/ or .shmakk/skills/"
        );
        return;
      }
      const items = skills.map((s) => ({
        label: s.name,
        description: `${s.source}${s.active ? " $(check) active" : ""}`,
        detail: s.description
      }));
      const picked = await vscode.window.showQuickPick(items, { placeHolder: "Select a skill" });
      if (picked) {
        const stateDir = path.join(workspaceConfigDir(), "state");
        const activePath = path.join(stateDir, "active-skill.json");
        fs.mkdirSync(stateDir, { recursive: true });
        if (skills.find((s) => s.name === picked.label)?.active) {
          fs.writeFileSync(activePath, "{}");
          vscode.window.showInformationMessage(`Unloaded: ${picked.label}`);
        } else {
          fs.writeFileSync(activePath, JSON.stringify({ name: picked.label, active: true }));
          vscode.window.showInformationMessage(`Loaded: ${picked.label}`);
        }
      }
    }),
    vscode.commands.registerCommand("shmakk.listSessions", async () => {
      const sessions = listSessions();
      if (!sessions.length) {
        vscode.window.showInformationMessage("No sessions.");
        return;
      }
      const items = sessions.map((s) => ({
        label: `$(comment-discussion) ${s.id}`,
        description: `${s.status} \u2014 ${path.basename(s.workspace)}`,
        detail: `${s.messages.length} msgs \xB7 ${new Date(s.updatedAt).toLocaleString()}`,
        session: s
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a session",
        matchOnDescription: true
      });
      if (picked) {
        const doc = await vscode.workspace.openTextDocument({
          content: formatSession(picked.session),
          language: "markdown"
        });
        await vscode.window.showTextDocument(doc);
      }
    }),
    vscode.commands.registerCommand("shmakk.clearSessions", async () => {
      const answer = await vscode.window.showWarningMessage(
        "Delete all shmakk sessions?",
        { modal: true },
        "Delete All"
      );
      if (answer === "Delete All") {
        const dir = sessionsDir();
        if (fs.existsSync(dir)) {
          for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
        }
        vscode.window.showInformationMessage("All sessions cleared.");
      }
    })
  );
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(comment-discussion) shmakk";
  statusBarItem.tooltip = "shmakk Settings";
  statusBarItem.command = "shmakk.toggleSettings";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  vscode.window.showInformationMessage("shmakk ready \u2014 type @shmakk in chat");
}
function formatSession(session) {
  let md = `# shmakk session

`;
  md += `**ID:** ${session.id}
`;
  md += `**Workspace:** ${session.workspace}
`;
  md += `**Status:** ${session.status}
`;
  md += `**Started:** ${session.startedAt}
`;
  md += `**Updated:** ${session.updatedAt}

---

`;
  for (const msg of session.messages) {
    md += `### ${msg.role}

${msg.content}

`;
  }
  return md;
}
function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
