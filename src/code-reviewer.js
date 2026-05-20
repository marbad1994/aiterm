// Post-plan code review — runs automatically after a plan completes.
// Gets the git diff of what changed, then runs a focused review agent
// that looks for bugs, security issues, and quality problems.

const { execFileSync } = require('child_process');
const { runAgent } = require('./agent');

// Capture the current git HEAD SHA — call before and after plan execution.
function captureGitSha(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Get a summary of what changed between two SHAs.
function getGitDiff(root, baseSha, headSha) {
  if (!baseSha || !headSha || baseSha === headSha) return null;
  try {
    // Stat first — just the filenames and line counts
    const stat = execFileSync(
      'git', ['diff', '--stat', `${baseSha}..${headSha}`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();

    // Full diff, capped to avoid blowing the context window
    let diff = '';
    try {
      diff = execFileSync(
        'git', ['diff', `${baseSha}..${headSha}`],
        { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
      if (diff.length > 20000) {
        diff = diff.slice(0, 20000) + '\n\n[... diff truncated — use read_file for full context ...]';
      }
    } catch {}

    return { stat, diff };
  } catch {
    return null;
  }
}

// Run the code review agent after a plan completes.
// agentOpts: same opts object used during plan execution (roots, confirmTool, etc.)
async function runPostPlanReview({ plan, baseSha, agentOpts, write }) {
  const root = agentOpts.roots[0];
  const headSha = captureGitSha(root);

  if (!baseSha || !headSha) {
    write('\x1b[2m[shmakk · review] no git repo detected — skipping code review\x1b[0m\r\n');
    return;
  }

  if (baseSha === headSha) {
    write('\x1b[2m[shmakk · review] no commits made — skipping code review\x1b[0m\r\n');
    return;
  }

  const changes = getGitDiff(root, baseSha, headSha);
  if (!changes || !changes.stat) {
    write('\x1b[2m[shmakk · review] no file changes detected — skipping code review\x1b[0m\r\n');
    return;
  }

  write('\x1b[36m[shmakk · review]\x1b[0m Running post-plan code review…\r\n\r\n');

  const completedTasks = plan.tasks
    .filter((t) => t.status === 'completed')
    .map((t) => `- ${t.title}`)
    .join('\n');

  const reviewInput = `You are a code reviewer. A plan just completed — review the changes for correctness, bugs, and quality.

Plan: ${plan.title}
Completed tasks:
${completedTasks}

Files changed:
${changes.stat}

${changes.diff ? `Diff:\n\`\`\`diff\n${changes.diff}\n\`\`\`` : ''}

Review guidelines:
- Flag CRITICAL issues (bugs, security vulnerabilities, data loss risks) immediately
- Flag IMPORTANT issues (logic errors, missing error handling, performance problems)
- Flag MINOR issues (style, naming, missing tests) briefly
- If no issues found, say so clearly

For each issue: state the file, line range, what's wrong, and how to fix it.
Use read_file to check any file for more context before flagging an issue.
Keep the review focused and actionable. No fluff.`;

  try {
    await runAgent({
      ...agentOpts,
      input: reviewInput,
      history: [],         // fresh context — reviewer shouldn't see plan execution history
      profile: 'deep',     // deep reasoning for code review
      specialistHint: `
Specialist mode: Post-Plan Code Reviewer
You are reviewing changes just made by an agent executing a plan.
Focus: correctness first, then security, then quality.
Approach:
- Read the diff carefully. Check every changed function for logic errors.
- Verify error paths are handled (what happens when this fails?).
- Look for hardcoded values, missing validations, and off-by-one errors.
- Check that tests were added or updated for changed behavior.
- Be direct: state the problem, give the exact fix. Skip praise.`,
    });
  } catch (e) {
    if (e.name !== 'AbortError') {
      write(`\x1b[33m[shmakk · review] review error: ${e.message}\x1b[0m\r\n`);
    }
  }
}

module.exports = { captureGitSha, runPostPlanReview };
