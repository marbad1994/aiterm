// Named model endpoints with hotswap support.
// Loads ~/.config/shmakk/endpoints.json (or .js for backwards compat).
// Can switch models mid-session without restarting.
//
// Preferred format (~/.config/shmakk/endpoints.json):
// {
//   "main": "gpt-5",
//   "models": {
//     "gpt-5": {
//       "provider": "codex",
//       "model": "gpt-5-codex",
//       "api_key": "sk-..."
//     },
//     "claude": {
//       "provider": "anthropic",
//       "model": "claude-sonnet-4-5-20250929",
//       "api_key": "sk-ant-..."
//     },
//     "local": {
//       "provider": "openai-compatible",
//       "base_url": "http://127.0.0.1:1234/v1",
//       "model": "qwen/qwen3.5-9b"
//     }
//   }
// }

const fs = require('fs');
const path = require('path');
const os = require('os');

let currentEndpointName = null;
let currentEndpointConfig = null;
let endpointsCwd = null;

function configPath(cwd) {
  const configDir = path.join(os.homedir(), '.config', 'shmakk');
  const jsonPath = path.join(configDir, 'endpoints.json');
  const jsPath = path.join(configDir, 'endpoints.js');

  // Prefer JSON for user-editable model registries; keep .js compatibility.
  if (fs.existsSync(jsonPath)) return jsonPath;
  if (fs.existsSync(jsPath)) return jsPath;
  return jsonPath;
}

function loadEndpoints(cwd) {
  const cfgPath = configPath(cwd || process.cwd());
  try {
    if (cfgPath.endsWith('.js')) {
      // Clear require cache to get fresh data on each load
      if (require.cache[cfgPath]) delete require.cache[cfgPath];
      return require(cfgPath);
    } else {
      // JSON format
      const raw = fs.readFileSync(cfgPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
}

function normalizeModelConfig(name, cfg) {
  if (!cfg || typeof cfg !== 'object') return null;

  const provider = String(cfg.provider || cfg.type || 'openai-compatible').toLowerCase();
  return {
    name,
    provider,
    base_url: cfg.base_url || cfg.baseUrl || cfg.host || cfg.url || null,
    api_key: cfg.api_key || cfg.apiKey || cfg.key || null,
    model: cfg.model || name,
    headers: cfg.headers || cfg.headears || null,
    registry: cfg.registry || null,
    main: !!cfg.main,
    vision: !!cfg.vision,
  };
}

function normalizeRegistry(raw) {
  if (!raw || typeof raw !== 'object') {
    return { main: null, models: {} };
  }

  const explicitModels = raw.models || raw.endpoints;
  const source = explicitModels && typeof explicitModels === 'object'
    ? explicitModels
    : Object.fromEntries(
      Object.entries(raw).filter(([key, value]) => {
        return key !== 'main' && value && typeof value === 'object' && !Array.isArray(value);
      }),
    );

  const models = {};
  for (const [name, cfg] of Object.entries(source)) {
    const normalized = normalizeModelConfig(name, cfg);
    if (normalized) models[name] = normalized;
  }

  let main = typeof raw.main === 'string' ? raw.main : null;
  if (!main) {
    const marked = Object.values(models).find((cfg) => cfg.main);
    if (marked) main = marked.name;
  }
  if (!main && Object.keys(models).length === 1) {
    main = Object.keys(models)[0];
  }

  return { main, models };
}

function loadModelRegistry(cwd) {
  return normalizeRegistry(loadEndpoints(cwd));
}

function applyEndpoint(name, cwd) {
  const registry = loadModelRegistry(cwd);
  const selected = name === 'main' ? registry.main : name;
  if (!selected || !registry.models[selected]) return false;

  const normalized = registry.models[selected];
  currentEndpointName = selected;

  currentEndpointConfig = normalized;
  endpointsCwd = cwd;

  // Also update env vars for backwards compatibility
  if (normalized.provider)  process.env.SHMAKK_PROVIDER  = normalized.provider;
  if (normalized.base_url)  process.env.SHMAKK_BASE_URL  = normalized.base_url;
  if (normalized.api_key)   process.env.SHMAKK_API_KEY   = normalized.api_key;
  if (normalized.model)     process.env.SHMAKK_MODEL     = normalized.model;
  if (normalized.headers)   process.env.SHMAKK_HEADERS   = normalized.headers;
  if (normalized.registry)  process.env.SHMAKK_REGISTRY  = normalized.registry;

  return true;
}

function getCurrentEndpoint() {
  // Returns current endpoint config if one is active
  return currentEndpointConfig ? { ...currentEndpointConfig } : null;
}

function getCurrentEndpointName() {
  return currentEndpointName;
}

function supportsVision() {
  return !!(currentEndpointConfig && currentEndpointConfig.vision);
}

function listEndpoints(cwd) {
  return Object.keys(loadModelRegistry(cwd).models);
}

function getModelRegistry(cwd) {
  const registry = loadModelRegistry(cwd || endpointsCwd || process.cwd());
  return {
    main: registry.main,
    models: Object.fromEntries(Object.entries(registry.models).map(([name, cfg]) => [name, { ...cfg }])),
  };
}

module.exports = {
  applyEndpoint,
  listEndpoints,
  getCurrentEndpoint,
  getCurrentEndpointName,
  supportsVision,
  getModelRegistry,
};
