---
name: code-review
version: 1
---

# Code Review

Systematic code review covering correctness, security, performance, and maintainability.

## When to use this skill

- User asks for a code review or feedback on code
- User wants to find bugs, security issues, or performance problems
- User wants to improve code quality or readability
- User mentions "review", "check this code", "what's wrong with", "is this safe"

## Procedure

### Step 1: Understand context first

Before reviewing, establish:
- What does this code do? (if not obvious from reading)
- What language/framework?
- What's the most important concern: correctness, security, performance, readability?
- Is this production code or a prototype?

Read the code fully before commenting. Avoid reacting to the first issue found.

### Step 2: Correctness

Check for logic errors:
- Off-by-one errors in loops and array indexing
- Incorrect boundary conditions
- Missing null/undefined/empty checks
- Wrong operator precedence
- Incorrect handling of edge cases (empty input, very large numbers, special characters)
- Race conditions in concurrent code
- Missing error handling for operations that can fail (file I/O, network, parsing)

### Step 3: Security

Check for common vulnerabilities:

**Injection:**
- SQL injection: are queries parameterized, or is user input concatenated?
- Command injection: is user input passed to `exec`, `system`, `eval`?
- XSS: is user input escaped before rendering in HTML?
- Path traversal: is user input used to construct file paths without sanitization?

**Authentication/Authorization:**
- Are authentication checks present on all protected endpoints?
- Is authorization checked (not just authentication)?
- Are secrets hardcoded? (passwords, API keys, tokens in source)
- Are tokens/sessions validated properly?

**Data handling:**
- Is sensitive data (passwords, PII) logged?
- Are passwords stored hashed (bcrypt, argon2) not plaintext or MD5?
- Is sensitive data transmitted over encrypted channels?

**Dependencies:**
- Check `package.json`, `requirements.txt`, etc. for known-vulnerable packages

### Step 4: Performance

Look for obvious performance issues:
- N+1 query patterns in database code
- Unnecessary computation inside loops
- Missing indexes for database queries on large tables
- Large in-memory operations that could be streamed
- Unbounded data fetching without pagination

### Step 5: Maintainability

- Are functions doing too many things? (>20-30 lines is often a warning sign)
- Are variable and function names descriptive?
- Is there duplicated logic that could be extracted?
- Are magic numbers/strings named as constants?
- Is complex logic explained (non-obvious invariants, workarounds)?

### Step 6: Tests (if test code included)

- Are edge cases covered?
- Are tests testing behavior or implementation details?
- Is test coverage meaningful or just hitting lines?

## Output format

Organize feedback by severity:

```
CODE REVIEW: [filename or description]

CRITICAL — Must fix before shipping
• [Line 34] SQL injection: user input concatenated into query. Use parameterized queries.
• [Line 67] Hardcoded API key. Move to environment variable.

IMPORTANT — Should fix
• [Line 12] No null check before accessing user.profile.name. Will throw if user has no profile.
• [Line 89] N+1 query inside loop. Fetch all records in one query before the loop.

SUGGESTIONS — Consider
• [Lines 45-78] This function is doing three things. Consider splitting into smaller functions.
• [Line 23] Magic number 86400. Name it SECONDS_PER_DAY for clarity.

LOOKS GOOD
• Error handling is thorough and consistent
• Authentication checks present on all routes
• Input validation at API boundary
```

## Pitfalls

- Don't nitpick style when there are real issues — prioritize
- Be specific: "this could be a security issue" is less useful than quoting the exact line and explaining the attack vector
- Acknowledge tradeoffs: a slightly slower but simpler approach may be the right call
- Don't rewrite the whole thing — focus on actual issues
- Context matters: prototype code doesn't need production hardening

## Verification

After review: confirm that each CRITICAL issue is real (not a false positive based on missing context) before presenting it.
