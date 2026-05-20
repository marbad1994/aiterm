// Postinstall script: copies bundled skill markdown files to
// ~/.config/shmakk/skills/ so they're available globally after npm install.
// Existing user-modified skills are preserved (only overwrites if the
// bundled version has a different checksum).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKILLS_SRC = path.join(__dirname, '..', 'skills');
const DEST_DIR = path.join(require('os').homedir(), '.config', 'shmakk', 'skills');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function main() {
  // Bundled skills directory might not exist in dev (e.g. clean clone
  // before skills are written). Silently skip.
  if (!fs.existsSync(SKILLS_SRC)) return;

  const files = fs.readdirSync(SKILLS_SRC).filter((f) => f.endsWith('.md'));
  if (!files.length) return;

  fs.mkdirSync(DEST_DIR, { recursive: true });

  let installed = 0;
  let skipped = 0;

  for (const file of files) {
    const src = path.join(SKILLS_SRC, file);
    const dest = path.join(DEST_DIR, file);

    const srcBuf = fs.readFileSync(src);
    const srcHash = sha256(srcBuf);

    // If destination exists with identical content, skip.
    if (fs.existsSync(dest)) {
      const destHash = sha256(fs.readFileSync(dest));
      if (srcHash === destHash) {
        skipped++;
        continue;
      }
    }

    fs.writeFileSync(dest, srcBuf);
    installed++;
  }

  if (installed > 0) {
    process.stdout.write(`[shmakk] installed ${installed} skill(s) to ${DEST_DIR}\n`);
  }
  if (skipped > 0 && installed > 0) {
    process.stdout.write(`[shmakk] ${skipped} skill(s) unchanged, skipped\n`);
  }
}

try {
  main();
} catch (e) {
  // Non-fatal — don't break npm install if skill copy fails
  // (e.g. read-only filesystem, CI environment)
  process.stderr.write(`[shmakk] skill install warning: ${e.message}\n`);
}
