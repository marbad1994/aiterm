let OpenAI;
try { OpenAI = require('openai'); } catch { OpenAI = null; }

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const { getCurrentEndpoint } = require('./endpoints');

function parseHeaders(s) {
  const out = {};
  if (!s) return out;
  for (const part of s.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function buildHeaders(customHeaders, registry) {
  const headers = parseHeaders(customHeaders);
  if (registry) {
    headers['x-registry'] = registry;
  }
  return headers;
}

function envForProvider() {
  // Check active endpoint first (allows hotswap)
  const activeEndpoint = getCurrentEndpoint();
  if (activeEndpoint) {
    return {
      baseURL: activeEndpoint.base_url,
      apiKey: activeEndpoint.api_key,
      headers: activeEndpoint.headers,
      registry: activeEndpoint.registry,
      model: activeEndpoint.model,
    };
  }
  // Fall back to env vars for backwards compatibility
  return {
    baseURL: process.env.SHMAKK_BASE_URL,
    apiKey: process.env.SHMAKK_API_KEY,
    headers: process.env.SHMAKK_HEADERS,
    registry: process.env.SHMAKK_REGISTRY,
    model: process.env.SHMAKK_MODEL,
  };
}

function isConfigured() {
  const cfg = envForProvider();
  return !!cfg.baseURL && !!OpenAI;
}

function makeClient() {
  if (!OpenAI) throw new Error('openai sdk not installed');
  const cfg = envForProvider();
  return new OpenAI({
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey || 'not-needed',
    defaultHeaders: buildHeaders(cfg.headers, cfg.registry),
  });
}

function modelFor() {
  return process.env.SHMAKK_MODEL || 'gpt-4o-mini';
}

async function isMakkorch(baseURL) {
  return baseURL && (baseURL.includes('localhost:8787') || baseURL.includes('127.0.0.1:8787'));
}

async function checkMakkorch(port = 8787, timeout = 5000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      clearTimeout(timeoutId);
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

async function startMakkorch() {
  try {
    const makkorch = spawn('makkorch', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    makkorch.unref();

    // Wait for it to be ready (up to 15 seconds)
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      if (await checkMakkorch(8787, 2000)) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  } catch {
    return false;
  }
}

async function ensureMakkorch() {
  const cfg = envForProvider();
  const isMakk = await isMakkorch(cfg.baseURL);
  if (!isMakk) return;

  const isRunning = await checkMakkorch(8787, 2000);
  if (!isRunning) {
    process.stderr.write('[shmakk] Starting makkorch...\n');
    const started = await startMakkorch();
    if (started) {
      process.stderr.write('[shmakk] Makkorch started.\n');
    } else {
      process.stderr.write('[shmakk] Warning: Could not start makkorch. Is "makkorch serve" available?\n');
    }
  }
}

module.exports = { makeClient, modelFor, isConfigured, ensureMakkorch };
