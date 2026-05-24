---
name: dependency-audit
version: 1
category: security
---

# Dependency Audit

Check dependencies for security vulnerabilities, outdated packages, license issues, and bloat.

## When to use this skill

- User wants to audit, update, or clean up dependencies
- User asks "are my dependencies secure", "what needs updating", "what licenses do I have"
- User is preparing for a release or security review
- User mentions "dependencies", "packages", "npm", "pip", "vulnerabilities", "outdated"

## Procedure

### Step 1: Identify the package manager

```
ls package.json package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null  # Node
ls requirements.txt pyproject.toml Pipfile setup.py 2>/dev/null           # Python
ls Cargo.toml 2>/dev/null                                                  # Rust
ls go.mod 2>/dev/null                                                      # Go
ls Gemfile 2>/dev/null                                                     # Ruby
```

### Step 2: Security audit

**npm / Node.js:**
```
npm audit
npm audit --json | python3 -c "
import json,sys
data = json.load(sys.stdin)
vulns = data.get('vulnerabilities', {})
for name, v in vulns.items():
    print(f\"{v['severity'].upper()}: {name} — {v.get('title', '')}\")
"
```

**Python (pip):**
```
pip install pip-audit 2>/dev/null
pip-audit
```

Or check with safety:
```
pip install safety 2>/dev/null
safety check
```

**Go:**
```
govulncheck ./...
```

**Rust:**
```
cargo audit
```

### Step 3: Check for outdated packages

**npm:**
```
npm outdated
```

**Python:**
```
pip list --outdated
```

**Go:**
```
go list -m -u all 2>/dev/null | grep '\['
```

### Step 4: License analysis

**npm:**
```
npx license-checker --summary
npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0" 2>/dev/null
```

**Python:**
```
pip install pip-licenses 2>/dev/null
pip-licenses --format=table
```

Flag licenses that may conflict with your project's license:
- GPL/AGPL: "copyleft" — may require open-sourcing your code
- LGPL: generally OK for linking, but check specifics
- MIT, Apache-2.0, BSD: permissive, generally safe for commercial use
- Unknown/proprietary: investigate before shipping

### Step 5: Identify unused dependencies (Node.js)

```
npx depcheck
```

This identifies packages in `package.json` not actually imported in code.

### Step 6: Check for notably large packages

```
du -sh node_modules/* 2>/dev/null | sort -rh | head -20
```

Or for detailed bundle impact: `npx bundlephobia <package-name>` (check web)

## Output format

```
DEPENDENCY AUDIT: my-project (npm)

SECURITY — 3 vulnerabilities
  CRITICAL  lodash@4.17.11 — Prototype Pollution (CVE-2021-23337)
            Fix: npm update lodash → 4.17.21
  HIGH      axios@0.21.0  — SSRF vulnerability (CVE-2020-28168)
            Fix: npm install axios@1.6.0

OUTDATED — 12 packages behind
  Major updates (breaking changes possible):
    react       17.0.2  →  18.2.0
    webpack     4.46.0  →  5.88.0

  Minor/patch (generally safe):
    eslint      8.0.0   →  8.53.0
    typescript  4.9.5   →  5.3.2
    [+ 8 more]

LICENSES
  MIT: 45 packages ✓
  Apache-2.0: 12 packages ✓
  ISC: 8 packages ✓
  ⚠️  GPL-3.0: 1 package (some-lib) — verify this is acceptable for your use case

UNUSED (via depcheck)
  colors, moment — appear unused. Review before removing.

RECOMMENDED ACTIONS
1. Fix CRITICAL and HIGH vulnerabilities immediately (run: npm update lodash axios)
2. Evaluate React 18 upgrade — significant but well-documented migration path
3. Investigate GPL-3.0 dependency before commercial distribution
```

## Pitfalls

- Major version updates can be breaking — don't blindly `npm update` everything; review changelogs
- `npm audit` sometimes flags vulnerabilities in dev-only packages that don't affect production
- Some "unused" dependencies flagged by depcheck are loaded dynamically or via config — verify before removing
- License analysis may miss packages with non-standard license declarations — review any `Unknown` entries manually

## Verification

After fixing vulnerabilities: re-run `npm audit` and confirm the specific CVEs no longer appear.
After updating packages: run your test suite to catch any regressions from version bumps.
