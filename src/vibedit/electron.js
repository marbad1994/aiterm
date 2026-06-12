// vibedit electron — connects to an already-running Electron app via CDP,
// injects the overlay into the renderer, and runs the control WebSocket server.
//
// Usage: Launch your Electron app first:
//   electron --remote-debugging-port=9222 path/to/app
// Then:
//   shmakk vibedit-electron ./path/to/project
//   shmakk vibedit-electron --port=9222 ./path/to/project

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { startControlServer } = require('./control');

const VIBEDIT_CONTROL_PORT = 3947;
const DEFAULT_CDP_PORT = 9222;

async function startVibeditElectron(opts) {
  let { projectDir, debugPort, onSpec } = opts;

  const cdpPort = debugPort || DEFAULT_CDP_PORT;
  const stateDir = path.join(projectDir, '.vibedit');
  fs.mkdirSync(path.join(stateDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(stateDir, 'backups'), { recursive: true });

  const port = opts.port || VIBEDIT_CONTROL_PORT;
  const wsEndpoint = `http://127.0.0.1:${cdpPort}`;

  console.log(`[shmakk vibedit electron] connecting to Electron on port ${cdpPort}...`);

  // Connect to the running Electron app.
  let browser;
  try {
    browser = await chromium.connectOverCDP(wsEndpoint);
  } catch (e) {
    console.error(`[shmakk vibedit electron] Cannot connect to Electron at port ${cdpPort}.`);
    console.error(`[shmakk vibedit electron] Make sure the app is running with:`);
    console.error(`[shmakk vibedit electron]   electron --remote-debugging-port=${cdpPort} path/to/app`);
    console.error(`[shmakk vibedit electron] Details: ${e.message}`);
    return null;
  }

  // Grab the default context and page.
  const contexts = browser.contexts();
  const ctx = contexts[0];
  const pages = ctx.pages();
  const page = pages[0];

  if (!page) {
    console.error('[shmakk vibedit electron] No page found in Electron app.');
    await browser.close();
    return null;
  }

  console.log(`[shmakk vibedit electron] connected: ${page.url()}`);

  // Start the control server (reuses the same WebSocket + HTTP stack).
  const control = await startControlServer({
    port,
    stateDir,
    page,
    projectDir,
    onSpec,
  });
  console.log(`[shmakk vibedit electron] control: ws://127.0.0.1:${port}`);

  // Inject overlay. Since the Electron page is already loaded, we can't use
  // addInitScript for the existing page, but we register it for any new pages
  // and manually inject into the current page.
  const overlayJs = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8');
  const boot = `window.__VIBEDIT__ = { port: ${port} };\n${overlayJs}`;

  // Register init script for future navigations / new pages.
  await ctx.addInitScript({ content: boot });

  // Inject into all already-loaded pages (Electron apps can have multiple renderers).
  for (const p of pages) {
    await p.evaluate(boot).catch((e) => console.warn(`[shmakk vibedit electron] injection skipped for ${p.url()}: ${e.message}`));
  }

  // Watch for new pages that appear later.
  ctx.on('page', async (newPage) => {
    await newPage.evaluate(boot).catch(() => {});
  });

  await page.waitForTimeout(500);

  const shutdown = async () => {
    console.log('\n[shmakk vibedit electron] shutting down');
    try { await browser.close(); } catch {}
    control.close();
  };

  return { browser, control, shutdown };
}

module.exports = { startVibeditElectron, VIBEDIT_CONTROL_PORT, DEFAULT_CDP_PORT };
