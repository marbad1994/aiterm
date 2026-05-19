// Named endpoint presets. Loads ~/.config/shmakk/endpoints.js (or
// ~/.config/shmakk/endpoints.json for backwards compat) and applies the
// selected preset by setting process.env.SHMAKK_* variables before any
// other module reads them.
//
// Format (~/.config/shmakk/endpoints.js):
// {
//   "makkorch": {
//     "base_url": "https://api.example.com/v1",
//     "api_key": "sk-...",
//     "model": "gpt-4o-mini",
//     "headers": "x-custom=value"
//   }
// }

const fs = require('fs');
const path = require('path');
const os = require('os');

function configPath(cwd) {
  const configDir = path.join(os.homedir(), '.config', 'shmakk');
  const jsPath = path.join(configDir, 'endpoints.js');
  const jsonPath = path.join(configDir, 'endpoints.json');

  // Try .js first, fall back to .json for backwards compatibility
  if (fs.existsSync(jsPath)) return jsPath;
  if (fs.existsSync(jsonPath)) return jsonPath;
  return jsPath; // Default to .js even if neither exists
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

function applyEndpoint(name, cwd) {
  const endpoints = loadEndpoints(cwd);
  if (!endpoints || !endpoints[name]) return false;

  const cfg = endpoints[name];
  if (cfg.base_url)  process.env.SHMAKK_BASE_URL  = cfg.base_url;
  if (cfg.api_key)   process.env.SHMAKK_API_KEY   = cfg.api_key;
  if (cfg.model)     process.env.SHMAKK_MODEL     = cfg.model;
  if (cfg.headers)   process.env.SHMAKK_HEADERS   = cfg.headers;

  return true;
}

function listEndpoints(cwd) {
  const endpoints = loadEndpoints(cwd);
  if (!endpoints) return [];
  return Object.keys(endpoints);
}

module.exports = { applyEndpoint, listEndpoints };
