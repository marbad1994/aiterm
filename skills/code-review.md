---
name: code-review
version: 2
category: dev
---

# Code Review

Systematic review of code changes — correctness first, then security, then quality. shmakk runs this automatically after every plan completes, and the agent should also use it on demand when asked.

## When to use this skill

- After a plan completes (shmakk triggers automatically via `runPostPlanReview`)
- User asks for a code review, audit, or "what's wrong with this"
- Before a merge to main / before publishing
- After fixing a complex bug — verify the fix doesn't introduce new issues
- When stuck — a structured review often surfaces the missing piece

## Procedure

### Step 1: Identify the scope

Determine what to review:
- **Post-plan**: shmakk passes you the git diff between base SHA and head SHA
- **PR review**: `git diff origin/main...HEAD`
- **Single file**: `read_file` the specific file
- **Working tree**: `git diff` (uncommitted changes)

Read the actual diff first — never review based on the user's description alone.

### Step 2: Correctness

Check for logic errors:
- Off-by-one errors in loops, slices, and array indexing
- Wrong boundary conditions (`< vs <=`, `>= 0 vs > 0`)
- Missing null/undefined/empty checks
- Wrong operator precedence
- Edge cases: empty input, very large numbers, special characters, unicode
- Race conditions in concurrent code
- Missing error handling for operations that can fail (file I/O, network, parsing)
- Functions that quietly return on error instead of surfacing the failure

### Step 3: Security

Check for common vulnerabilities:

**Injection:**
- SQL injection: parameterized queries, never string concatenation
- Command injection: user input passed to `exec`, `system`, `eval`, `child_process.exec`
- XSS: user input escaped before HTML rendering, `dangerouslySetInnerHTML` audited
- Path traversal: user input sanitized before constructing file paths

**Authentication / authorization:**
- Tokens validated on every protected route, not just at login
- Sessions stored in HttpOnly + Secure + SameSite cookies (never localStorage)
- Password hashes use bcrypt/argon2/scrypt (never MD5 or SHA1)
- Authorization checks at the action level, not just the navigation level

**Secrets:**
- No hardcoded API keys, tokens, or passwords in the diff
- `.env`, `.env.local`, credentials files in `.gitignore`
- Check `git log -p` for accidentally committed secrets

**File operations:**
- Path traversal via `../`
- Symlink attacks
- TOCTOU (time-of-check vs time-of-use) races

### Step 4: Performance

- N+1 query patterns (loop body that calls the database)
- Unbounded computation inside hot paths
- Missing indexes on filter / join / sort columns
- Memory leaks: event listeners attached without cleanup, retained closures
- Bundle bloat: full library imports when one function is needed

### Step 5: Quality

- **Single responsibility**: does this function / class do one thing?
- **Cyclomatic complexity**: nested conditionals that should be extracted
- **Duplication**: same logic copied across files — extract a helper
- **Naming**: do names accurately describe behavior, not implementation?
- **Tests**: was test coverage added or updated for changed behavior?
- **Comments**: do they explain *why* (non-obvious constraints) rather than *what*?

### Step 6: Report findings

Structure as:

```
CRITICAL
  - file.js:42 — [issue], [fix]

IMPORTANT
  - file.js:80 — [issue], [fix]

MINOR
  - file.js:120 — [issue], [fix]

Assessment: <ready to ship | fix critical first | needs significant rework>
```

For each issue:
- **Cite file:line** — never vague locations
- **State the problem**, not just the symptom
- **Propose the fix** — exact code change when possible

If no issues found at any severity, say so plainly: `No issues found. Ready to proceed.`

## Severity definitions

- **CRITICAL** — bug that loses data, security vulnerability, breaks production
- **IMPORTANT** — logic error that breaks a feature, missing error handling, performance regression
- **MINOR** — style, naming, missing test for a non-critical path

Never invent CRITICAL findings to look thorough. Most diffs have zero critical issues.

## Tone

- Direct, technical, specific
- No praise sandwich — the user wants signal, not validation
- Push back on the original author's choices when wrong, with technical reasoning
- Acknowledge uncertainty when present ("If X is also true elsewhere, this becomes a problem")

## Anti-patterns to avoid

- Reviewing the description instead of the actual diff
- Listing 20 minor nits when there's a critical bug present (signal vs noise)
- Suggesting rewrites instead of minimal fixes
- Citing best practices without explaining why they matter for THIS code
