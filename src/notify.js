// Desktop notification support via notify-send (libnotify).
// Falls back silently if notify-send is not available or no notification
// daemon is running.

const { execFile, execFileSync } = require('child_process');
const { existsSync } = require('fs');

const NOTIFY_BIN = 'notify-send';

function available() {
  try {
    // Prefer direct path check; fall back to `command -v` if not at known paths
    if (existsSync('/usr/bin/notify-send')) return true;
    if (existsSync('/usr/local/bin/notify-send')) return true;
    execFileSync('command', ['-v', NOTIFY_BIN], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Fire a desktop notification. Never throws — failures are silent.
// Delegates to a subprocess so the main loop isn't blocked.
function notify(summary, body, urgency) {
  if (!available()) return;
  const args = [summary || 'shmakk'];
  if (body) args.push(body);
  args.push('--app-name=shmakk', '--category=im.received');
  if (urgency === 'critical') args.push('--urgency=critical');
  if (urgency === 'low') args.push('--urgency=low');
  execFile(NOTIFY_BIN, args, (err) => {
    // Silently ignore — notification daemon may not be running.
    void err;
  });
}

module.exports = { notify, available };
