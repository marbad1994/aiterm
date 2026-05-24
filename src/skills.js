const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_SKILL_BYTES = 64 * 1024;
const DEFAULT_RENDER_BYTES = 12 * 1024;

// Known categories. Anything else falls under 'general'.
// Category id → human label + description (shown in `list skill categories`).
const CATEGORIES = {
  dev:           { label: 'Development',    blurb: 'code review, refactor, debugging, testing patterns' },
  frontend:      { label: 'Frontend',       blurb: 'React/Vue/Angular/Svelte UI engineering' },
  backend:       { label: 'Backend',        blurb: 'APIs, databases, server-side logic' },
  mobile:        { label: 'Mobile',         blurb: 'iOS, Android, React Native, Flutter, Expo' },
  devops:        { label: 'DevOps',         blurb: 'CI/CD, Docker, deploy, infrastructure' },
  security:      { label: 'Security',       blurb: 'vulnerability scanning, auditing, compliance' },
  design:        { label: 'Design',         blurb: 'UX/UI, design systems, visual design' },
  docs:          { label: 'Documentation',  blurb: 'technical writing, API docs, READMEs' },
  research:      { label: 'Research',       blurb: 'web research, summarization, source analysis' },
  files:         { label: 'Files & Docs',   blurb: 'PDF, DOCX, XLSX, PPTX manipulation' },
  system:        { label: 'System',         blurb: 'OS admin, logs, monitoring, file ops, terminal' },
  business:      { label: 'Business',       blurb: 'budget, invoices, expenses, compliance, contracts' },
  productivity:  { label: 'Productivity',   blurb: 'tasks, calendar, notes, email, reminders' },
  media:         { label: 'Media',          blurb: 'audio, video, image processing' },
  planning:      { label: 'Planning',       blurb: 'PRD, architecture, brainstorming, breakdowns' },
  workflow:      { label: 'Workflow',       blurb: 'agents, coordination, pair programming, TDD' },
  diagrams:      { label: 'Diagrams',       blurb: 'excalidraw, drawio, plantuml, mermaid' },
  database:      { label: 'Database',       blurb: 'SQL, Postgres, optimization, schema' },
  general:       { label: 'General',        blurb: 'uncategorized' },
};

function knownCategories() { return Object.keys(CATEGORIES); }
function categoryInfo(id) { return CATEGORIES[id] || null; }

// Normalize a category value from frontmatter. Empty/missing → 'general'.
function normalizeCategory(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 'general';
  return CATEGORIES[v] ? v : v;  // allow user-defined categories too
}

function safeName(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
}

function candidatePaths(name, cwd = process.cwd()) {
  const n = safeName(name);
  const home = os.homedir();
  const globalRoot = path.join(home, '.config', 'shmakk', 'skills');

  // The global skills directory is now organized into category subdirectories.
  // Scan all subdirs at startup so `load skill <name>` finds it regardless of
  // which category folder it lives in.
  const globalSubdirHits = [];
  try {
    if (fs.existsSync(globalRoot)) {
      for (const entry of fs.readdirSync(globalRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          globalSubdirHits.push(path.join(globalRoot, entry.name, `${n}.md`));
        }
      }
    }
  } catch {}

  return [
    // Workspace-level
    path.join(cwd, '.shmakk', 'skills', `${n}.md`),
    path.join(cwd, '.shmakk', 'skills', n, 'SKILL.md'),
    path.join(cwd, '.claude', 'skills', `${n}.md`),
    path.join(cwd, '.claude', 'skills', n, 'SKILL.md'),
    path.join(cwd, '.codex', 'skills', `${n}.md`),
    path.join(cwd, '.codex', 'skills', n, 'SKILL.md'),
    // User home
    path.join(home, '.shmakk', 'skills', `${n}.md`),
    path.join(home, '.shmakk', 'skills', n, 'SKILL.md'),
    path.join(home, '.claude', 'skills', `${n}.md`),
    path.join(home, '.claude', 'skills', n, 'SKILL.md'),
    path.join(home, '.codex', 'skills', `${n}.md`),
    path.join(home, '.codex', 'skills', n, 'SKILL.md'),
    // Global config — flat layout + category subdirectories
    path.join(globalRoot, `${n}.md`),
    ...globalSubdirHits,
    // Package-bundled fallback (last resort)
    path.join(__dirname, '..', 'skills', `${n}.md`),
  ];
}

function stateDir(cwd = process.cwd()) {
  return path.join(cwd, '.shmakk', 'state');
}

function skillsDir(cwd = process.cwd()) {
  return path.join(cwd, '.shmakk', 'skills');
}

function registryPath(cwd = process.cwd()) {
  return path.join(stateDir(cwd), 'skills-registry.json');
}

function activeSkillPath(cwd = process.cwd()) {
  return path.join(stateDir(cwd), 'active-skill.json');
}

// Global skill paths (~/.config/shmakk)
function globalSkillsDir() {
  return path.join(os.homedir(), '.config', 'shmakk', 'skills');
}

function globalStateDir() {
  return path.join(os.homedir(), '.config', 'shmakk', 'state');
}

function globalRegistryPath() {
  return path.join(globalStateDir(), 'skills-registry.json');
}

function globalActiveSkillPath() {
  return path.join(globalStateDir(), 'active-skill.json');
}

function ensureGlobalDirs() {
  fs.mkdirSync(globalStateDir(), { recursive: true });
  fs.mkdirSync(globalSkillsDir(), { recursive: true });
}

function ensureDirs(cwd = process.cwd()) {
  fs.mkdirSync(stateDir(cwd), { recursive: true });
  fs.mkdirSync(skillsDir(cwd), { recursive: true });
}

function sha256(s) {
  return require('crypto').createHash('sha256').update(String(s || ''), 'utf8').digest('hex');
}

function parseFrontmatter(raw) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(String(raw || ''));
  if (!m) return { meta: {}, body: String(raw || '') };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = /^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/.exec(line.trim());
    if (!mm) continue;
    meta[mm[1].toLowerCase()] = mm[2].trim();
  }
  return { meta, body: m[2] };
}

function validateSkill(raw, sourcePath = '') {
  const text = String(raw || '');
  const issues = [];
  if (!text.trim()) issues.push('empty skill content');
  if (Buffer.byteLength(text, 'utf8') > MAX_SKILL_BYTES) issues.push(`skill exceeds ${MAX_SKILL_BYTES} bytes`);
  if (!/^#\s+/m.test(text)) issues.push('missing markdown heading');
  if (!/(instruction|rule|guideline|workflow|steps?|when to use|pattern|quick start|core concepts?)/i.test(text)) {
    issues.push('no obvious instruction sections found');
  }
  if (/\b(ignore previous|bypass safety|exfiltrate|leak secret|disable security)\b/i.test(text)) {
    issues.push('contains potentially unsafe instruction phrases');
  }
  const fm = parseFrontmatter(text);
  const name = safeName(fm.meta.name || path.basename(sourcePath || '', path.extname(sourcePath || '')) || 'skill');
  const version = String(fm.meta.version || '1').trim();
  return {
    ok: issues.length === 0,
    issues,
    normalizedName: name,
    version,
    body: fm.body,
    raw: text,
  };
}

function loadRegistry(cwd = process.cwd()) {
  try {
    const p = registryPath(cwd);
    if (!fs.existsSync(p)) return { skills: {}, updatedAt: null };
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { skills: j.skills || {}, updatedAt: j.updatedAt || null };
  } catch {
    return { skills: {}, updatedAt: null };
  }
}

function saveRegistry(cwd, registry) {
  ensureDirs(cwd);
  const p = registryPath(cwd);
  fs.writeFileSync(p, JSON.stringify({
    skills: registry.skills || {},
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

function loadSkillToWorkspace(name, cwd = process.cwd()) {
  const n = safeName(name);
  if (!n) return { ok: false, error: 'missing skill name' };
  const found = candidatePaths(n, cwd).find((p) => fs.existsSync(p));
  if (!found) {
    return {
      ok: false,
      error: `skill not found: ${n}`,
      searched: candidatePaths(n, cwd),
    };
  }

  const raw = fs.readFileSync(found, 'utf8');
  const validation = validateSkill(raw, found);
  if (!validation.ok) {
    return { ok: false, error: `skill failed validation: ${validation.issues.join('; ')}` };
  }

  ensureDirs(cwd);
  const localSkillPath = path.join(skillsDir(cwd), `${validation.normalizedName}.md`);
  fs.writeFileSync(localSkillPath, validation.raw, 'utf8');

  const registry = loadRegistry(cwd);
  const checksum = sha256(validation.raw);
  registry.skills[validation.normalizedName] = {
    name: validation.normalizedName,
    version: validation.version,
    source: found,
    localPath: localSkillPath,
    checksum,
    bytes: Buffer.byteLength(validation.raw, 'utf8'),
    loadedAt: new Date().toISOString(),
    active: true,
  };

  for (const k of Object.keys(registry.skills)) {
    if (k !== validation.normalizedName) registry.skills[k].active = false;
  }

  saveRegistry(cwd, registry);
  fs.writeFileSync(activeSkillPath(cwd), JSON.stringify(registry.skills[validation.normalizedName], null, 2));

  return { ok: true, name: validation.normalizedName, source: found, localPath: localSkillPath, version: validation.version };
}

function importSkillContent(raw, sourceLabel, cwd = process.cwd(), fallbackName = 'downloaded-skill') {
  const validation = validateSkill(raw, sourceLabel);
  if (!validation.ok) {
    return { ok: false, error: `skill failed validation: ${validation.issues.join('; ')}` };
  }

  const name = validation.normalizedName || safeName(fallbackName) || 'downloaded-skill';
  ensureDirs(cwd);
  const localSkillPath = path.join(skillsDir(cwd), `${name}.md`);
  fs.writeFileSync(localSkillPath, validation.raw, 'utf8');

  const registry = loadRegistry(cwd);
  registry.skills[name] = {
    name,
    version: validation.version,
    source: sourceLabel,
    localPath: localSkillPath,
    checksum: sha256(validation.raw),
    bytes: Buffer.byteLength(validation.raw, 'utf8'),
    loadedAt: new Date().toISOString(),
    active: true,
  };
  for (const k of Object.keys(registry.skills)) {
    if (k !== name) registry.skills[k].active = false;
  }
  saveRegistry(cwd, registry);
  fs.writeFileSync(activeSkillPath(cwd), JSON.stringify(registry.skills[name], null, 2));
  return { ok: true, name, source: sourceLabel, localPath: localSkillPath, version: validation.version };
}

function readActiveSkill(cwd = process.cwd()) {
  try {
    const p = activeSkillPath(cwd);
    if (!fs.existsSync(p)) return null;
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!meta || !meta.localPath || !fs.existsSync(meta.localPath)) return null;
    const content = fs.readFileSync(meta.localPath, 'utf8');
    return { ...meta, content };
  } catch {
    return null;
  }
}

// Simple mtime-based cache for renderActiveSkillForPrompt.
// Invalidated when the underlying skill file changes on disk.
const _skillPromptCache = { key: '', value: '' };

function renderActiveSkillForPrompt(cwd = process.cwd(), maxBytes = DEFAULT_RENDER_BYTES) {
  const skill = readActiveSkill(cwd);
  if (!skill || !skill.content) {
    _skillPromptCache.key = '';
    _skillPromptCache.value = '';
    return '';
  }
  let mtime = 0;
  try { mtime = fs.statSync(skill.localPath).mtimeMs; } catch {}
  const cacheKey = `${cwd}|${skill.localPath}|${mtime}|${maxBytes}`;
  if (_skillPromptCache.key === cacheKey) return _skillPromptCache.value;

  const body = String(skill.content || '').slice(0, Math.max(1000, Number(maxBytes) || DEFAULT_RENDER_BYTES));
  const prompt = `Active loaded skill (${skill.name}${skill.version ? ` v${skill.version}` : ''}) instructions:\n${body}`;
  _skillPromptCache.key = cacheKey;
  _skillPromptCache.value = prompt;
  return prompt;
}

function listSkills(cwd = process.cwd()) {
  const r = loadRegistry(cwd);
  return Object.values(r.skills || {})
    .map((s) => ({
      ...s,
      category: normalizeCategory(s.category),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

// Return ALL skills available across workspace + global, deduplicated by name.
// Workspace entries take precedence (they have active state).
function listAllSkills(cwd = process.cwd()) {
  const workspace = listSkills(cwd);
  const global = listSkillsGlobally();
  const byName = new Map();
  for (const s of global) byName.set(s.name, { ...s, scope: 'global' });
  for (const s of workspace) byName.set(s.name, { ...s, scope: 'workspace' });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function unloadSkill(name, cwd = process.cwd()) {
  const n = safeName(name);
  const registry = loadRegistry(cwd);
  const entry = registry.skills[n];
  if (!entry) return { ok: false, error: `skill not found in registry: ${n}` };
  delete registry.skills[n];
  if (entry.localPath) {
    try { fs.rmSync(entry.localPath, { force: true }); } catch {}
  }
  const active = readActiveSkill(cwd);
  if (active && safeName(active.name) === n) {
    try { fs.rmSync(activeSkillPath(cwd), { force: true }); } catch {}
  }
  saveRegistry(cwd, registry);
  return { ok: true, name: n };
}

function skillStatus(cwd = process.cwd()) {
  const active = readActiveSkill(cwd);
  const all = listSkills(cwd);
  return {
    active: active ? {
      name: active.name,
      version: active.version || '1',
      source: active.source,
      loadedAt: active.loadedAt,
      bytes: active.bytes || Buffer.byteLength(String(active.content || ''), 'utf8'),
    } : null,
    total: all.length,
  };
}

async function installSkillFromUrl(url, cwd = process.cwd()) {
  let u;
  try { u = new URL(String(url || '')); } catch { return { ok: false, error: 'invalid URL' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, error: 'only http(s) URLs are supported' };

  async function resolveGitHubUrl(inputUrl) {
    try {
      const gu = new URL(inputUrl);
      if (!/^(www\.)?github\.com$/i.test(gu.host)) return inputUrl;
      const parts = gu.pathname.split('/').filter(Boolean);
      // /owner/repo/tree/ref/path...
      if (parts.length >= 5 && (parts[2] === 'tree' || parts[2] === 'blob')) {
        const owner = parts[0];
        const repo = parts[1];
        const ref = parts[3];
        const relPath = parts.slice(4).join('/');
        if (parts[2] === 'blob') {
          return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${relPath}`;
        }
        // tree: if direct markdown path, convert to raw
        if (/\.(md|markdown)$/i.test(relPath)) {
          return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${relPath}`;
        }
        // tree directory: discover SKILL.md first, then first markdown fallback
        const api = `https://api.github.com/repos/${owner}/${repo}/contents/${relPath}?ref=${encodeURIComponent(ref)}`;
        const resp = await fetch(api, { headers: { 'user-agent': 'shmakk-skill-installer/1.0' } });
        if (!resp.ok) return inputUrl;
        const arr = await resp.json();
        if (!Array.isArray(arr)) return inputUrl;
        const skillFile = arr.find((x) => x && x.type === 'file' && /^SKILL\.md$/i.test(String(x.name || '')) && x.download_url)
          || arr.find((x) => x && x.type === 'file' && /\.(md|markdown)$/i.test(String(x.name || '')) && x.download_url);
        return skillFile?.download_url || inputUrl;
      }
      return inputUrl;
    } catch {
      return inputUrl;
    }
  }

  const resolvedUrl = await resolveGitHubUrl(u.href);
  let finalUrl;
  try { finalUrl = new URL(resolvedUrl); } catch { finalUrl = u; }

  let text = '';
  try {
    const resp = await fetch(finalUrl.href, {
      headers: { 'user-agent': 'shmakk-skill-installer/1.0' },
    });
    if (!resp.ok) return { ok: false, error: `download failed: HTTP ${resp.status}` };
    text = await resp.text();
  } catch (e) {
    return { ok: false, error: `download failed: ${e.message}` };
  }

  const derived = safeName(path.basename(finalUrl.pathname || '', path.extname(finalUrl.pathname || '')) || 'downloaded-skill');
  return importSkillContent(text, finalUrl.href, cwd, derived);
}

// ── Global skill management (stored in ~/.config/shmakk) ──

function loadGlobalRegistry() {
  try {
    const p = globalRegistryPath();
    if (!fs.existsSync(p)) return { skills: {} };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { skills: {} };
  }
}

function saveGlobalRegistry(registry) {
  ensureGlobalDirs();
  fs.writeFileSync(globalRegistryPath(), JSON.stringify(registry, null, 2));
}

function loadSkillGlobally(name) {
  const n = safeName(name);
  if (!n) return { ok: false, error: 'missing skill name' };
  const found = candidatePaths(n, os.homedir()).find((p) => fs.existsSync(p));
  if (!found) {
    return {
      ok: false,
      error: `skill not found: ${n}`,
      searched: candidatePaths(n, os.homedir()),
    };
  }

  const raw = fs.readFileSync(found, 'utf8');
  const validation = validateSkill(raw, found);
  if (!validation.ok) {
    return { ok: false, error: `skill failed validation: ${validation.issues.join('; ')}` };
  }

  ensureGlobalDirs();
  const localSkillPath = path.join(globalSkillsDir(), `${validation.normalizedName}.md`);
  fs.writeFileSync(localSkillPath, validation.raw, 'utf8');

  const registry = loadGlobalRegistry();
  const checksum = sha256(validation.raw);
  // Global registry: skills are "available", never auto-active.
  // active-skill.json is workspace-only — a global skill must be explicitly
  // loaded into a workspace session to become active.
  registry.skills[validation.normalizedName] = {
    name: validation.normalizedName,
    version: validation.version,
    source: found,
    localPath: localSkillPath,
    checksum,
    bytes: Buffer.byteLength(validation.raw, 'utf8'),
    registeredAt: new Date().toISOString(),
    active: false,
  };

  saveGlobalRegistry(registry);

  return { ok: true, name: validation.normalizedName, source: found, localPath: localSkillPath, version: validation.version };
}

function importGlobalSkillContent(raw, sourceLabel, fallbackName = 'downloaded-skill') {
  const validation = validateSkill(raw, sourceLabel);
  if (!validation.ok) {
    return { ok: false, error: `skill failed validation: ${validation.issues.join('; ')}` };
  }

  const name = validation.normalizedName || safeName(fallbackName) || 'downloaded-skill';
  ensureGlobalDirs();
  const localSkillPath = path.join(globalSkillsDir(), `${name}.md`);
  fs.writeFileSync(localSkillPath, validation.raw, 'utf8');

  const registry = loadGlobalRegistry();
  registry.skills[name] = {
    name,
    version: validation.version,
    source: sourceLabel,
    localPath: localSkillPath,
    checksum: sha256(validation.raw),
    bytes: Buffer.byteLength(validation.raw, 'utf8'),
    registeredAt: new Date().toISOString(),
    active: false,
  };
  saveGlobalRegistry(registry);
  return { ok: true, name, source: sourceLabel, localPath: localSkillPath, version: validation.version };
}

async function installSkillFromUrlGlobally(url) {
  let u;
  try { u = new URL(String(url || '')); } catch { return { ok: false, error: 'invalid URL' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, error: 'only http(s) URLs are supported' };

  async function resolveGitHubUrl(inputUrl) {
    try {
      const gu = new URL(inputUrl);
      if (!/^(www\.)?github\.com$/i.test(gu.host)) return inputUrl;
      const parts = gu.pathname.split('/').filter(Boolean);
      if (parts.length >= 5 && (parts[2] === 'tree' || parts[2] === 'blob')) {
        const owner = parts[0];
        const repo = parts[1];
        const ref = parts[3];
        const relPath = parts.slice(4).join('/');
        if (parts[2] === 'blob') {
          return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${relPath}`;
        }
        if (/\.(md|markdown)$/i.test(relPath)) {
          return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${relPath}`;
        }
        const api = `https://api.github.com/repos/${owner}/${repo}/contents/${relPath}?ref=${encodeURIComponent(ref)}`;
        const resp = await fetch(api, { headers: { 'user-agent': 'shmakk-skill-installer/1.0' } });
        if (!resp.ok) return inputUrl;
        const arr = await resp.json();
        if (!Array.isArray(arr)) return inputUrl;
        const skillFile = arr.find((x) => x && x.type === 'file' && /^SKILL\.md$/i.test(String(x.name || '')) && x.download_url)
          || arr.find((x) => x && x.type === 'file' && /\.(md|markdown)$/i.test(String(x.name || '')) && x.download_url);
        return skillFile?.download_url || inputUrl;
      }
      return inputUrl;
    } catch {
      return inputUrl;
    }
  }

  const resolvedUrl = await resolveGitHubUrl(u.href);
  let finalUrl;
  try { finalUrl = new URL(resolvedUrl); } catch { finalUrl = u; }

  let text = '';
  try {
    const resp = await fetch(finalUrl.href, {
      headers: { 'user-agent': 'shmakk-skill-installer/1.0' },
    });
    if (!resp.ok) return { ok: false, error: `download failed: HTTP ${resp.status}` };
    text = await resp.text();
  } catch (e) {
    return { ok: false, error: `download failed: ${e.message}` };
  }

  const derived = safeName(path.basename(finalUrl.pathname || '', path.extname(finalUrl.pathname || '')) || 'downloaded-skill');
  return importGlobalSkillContent(text, finalUrl.href, derived);
}

function unloadSkillGlobally(name) {
  const n = safeName(name);
  const registry = loadGlobalRegistry();
  const entry = registry.skills[n];
  if (!entry) return { ok: false, error: `skill not found in registry: ${n}` };
  delete registry.skills[n];
  if (entry.localPath) {
    try { fs.rmSync(entry.localPath, { force: true }); } catch {}
  }
  const active = readActiveSkillGlobally();
  if (active && safeName(active.name) === n) {
    try { fs.rmSync(globalActiveSkillPath(), { force: true }); } catch {}
  }
  saveGlobalRegistry(registry);
  return { ok: true, name: n };
}

function readActiveSkillGlobally() {
  try {
    const p = globalActiveSkillPath();
    if (!fs.existsSync(p)) return null;
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!meta || !meta.localPath || !fs.existsSync(meta.localPath)) return null;
    const content = fs.readFileSync(meta.localPath, 'utf8');
    return { ...meta, content };
  } catch {
    return null;
  }
}

// Walk skills directory one level deep. Returns array of { skillPath, subdir }.
// subdir is the immediate parent directory name (or null if at top level).
function _scanSkillsDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push({ skillPath: path.join(dir, entry.name), subdir: null });
    } else if (entry.isDirectory()) {
      // One level deep — category subdirectory
      const subDir = path.join(dir, entry.name);
      try {
        for (const inner of fs.readdirSync(subDir)) {
          if (inner.endsWith('.md')) {
            found.push({ skillPath: path.join(subDir, inner), subdir: entry.name });
          }
        }
      } catch {}
    }
  }
  return found;
}

function listSkillsGlobally() {
  // Scan the global skills directory directly — the install script copies .md files
  // but does not write to the registry, so registry-only lookup would miss them.
  // Now walks one level of subdirectories (used as category folders).
  const dir = globalSkillsDir();
  const registryEntries = loadGlobalRegistry().skills || {};
  const available = {};

  for (const { skillPath, subdir } of _scanSkillsDir(dir)) {
    try {
      const raw = fs.readFileSync(skillPath, 'utf8');
      const fm = parseFrontmatter(raw);
      const name = safeName(fm.meta.name || path.basename(skillPath, '.md'));
      // Category source priority: subdirectory > frontmatter > 'general'
      const cat = subdir ? normalizeCategory(subdir) : normalizeCategory(fm.meta.category);
      // First non-blank paragraph of body = short description for catalog
      const desc = String(fm.meta.description || fm.body || '').trim().split(/\n\s*\n/)[0]
        .replace(/^#+\s*[^\n]*\n+/, '')
        .replace(/\n+/g, ' ')
        .slice(0, 240);
      available[name] = {
        name,
        version: String(fm.meta.version || '1').trim(),
        category: cat,
        description: desc,
        source: skillPath,
        localPath: skillPath,
        bytes: Buffer.byteLength(raw, 'utf8'),
        active: false,  // global skills are never auto-active
      };
    } catch {}
  }

  // Overlay registry entries (they may have richer metadata)
  for (const [k, v] of Object.entries(registryEntries)) {
    available[k] = { ...(available[k] || {}), ...v, active: false };
  }

  return Object.values(available).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

// Group an array of skill entries by category. Returns Map<categoryId, skills[]>.
function groupByCategory(skills) {
  const groups = new Map();
  for (const s of skills) {
    const cat = s.category || 'general';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(s);
  }
  // Sort categories: known ones in CATEGORIES order, unknown after
  const known = Object.keys(CATEGORIES);
  const sorted = new Map();
  for (const k of known) if (groups.has(k)) sorted.set(k, groups.get(k));
  for (const [k, v] of groups) if (!sorted.has(k)) sorted.set(k, v);
  return sorted;
}

// Search skills by substring in name or description (case-insensitive).
function searchSkills(query, skills) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  return skills.filter((s) =>
    s.name.toLowerCase().includes(q) ||
    String(s.description || '').toLowerCase().includes(q) ||
    String(s.category || '').toLowerCase().includes(q)
  );
}

function skillStatusGlobally() {
  const active = readActiveSkillGlobally();
  const all = listSkillsGlobally();
  return {
    active: active ? {
      name: active.name,
      version: active.version || '1',
      source: active.source,
      loadedAt: active.loadedAt,
      bytes: active.bytes || Buffer.byteLength(String(active.content || ''), 'utf8'),
    } : null,
    total: all.length,
  };
}

module.exports = {
  loadSkillToWorkspace,
  importSkillContent,
  readActiveSkill,
  renderActiveSkillForPrompt,
  listSkills,
  listAllSkills,
  unloadSkill,
  skillStatus,
  installSkillFromUrl,
  safeName,
  loadSkillGlobally,
  importGlobalSkillContent,
  readActiveSkillGlobally,
  listSkillsGlobally,
  unloadSkillGlobally,
  skillStatusGlobally,
  installSkillFromUrlGlobally,
  // Category + search helpers
  CATEGORIES,
  knownCategories,
  categoryInfo,
  normalizeCategory,
  groupByCategory,
  searchSkills,
};
