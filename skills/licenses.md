---
name: licenses
version: 1
category: business
---

# Software License Analysis

Analyze dependency licenses for compatibility, generate NOTICE files, and flag compliance risks.

## When to use this skill

- User wants to know what licenses their dependencies use
- User wants to check if licenses are compatible with their project's license
- User wants to generate a NOTICE or ATTRIBUTIONS file
- User is preparing for open-source release or commercial distribution
- User mentions "license", "GPL", "MIT", "open source compliance", "attribution"

## License Compatibility Quick Reference

| Dependency License | Can use in MIT project? | Can use in commercial closed-source? |
|-------------------|------------------------|-------------------------------------|
| MIT               | ✅ Yes                  | ✅ Yes (attribution required)        |
| ISC               | ✅ Yes                  | ✅ Yes (attribution required)        |
| Apache-2.0        | ✅ Yes                  | ✅ Yes (attribution + NOTICE required)|
| BSD-2/3-Clause    | ✅ Yes                  | ✅ Yes (attribution required)        |
| MPL-2.0           | ⚠️ Check               | ⚠️ Modified MPL files must stay open |
| LGPL-2.1/3.0      | ⚠️ Check               | ⚠️ OK if dynamically linked, complex otherwise |
| GPL-2.0/3.0       | ❌ Copyleft             | ❌ Forces project to go GPL          |
| AGPL-3.0          | ❌ Strong copyleft      | ❌ Also covers network use           |
| CC-BY-SA          | ❌ For data/content     | ❌ Copyleft, requires same license   |
| Proprietary       | ❌ Check terms          | ❌ Need commercial license           |

## Procedure

### Step 1: Extract all dependency licenses

**npm / Node.js:**
```
npx license-checker --json --out licenses.json
npx license-checker --summary
npx license-checker --csv --out licenses.csv
```

**Python:**
```
pip install pip-licenses 2>/dev/null
pip-licenses --format=json --output-file=licenses.json
pip-licenses --format=table
```

**Go:**
```
go-licenses report ./... 2>/dev/null
# or: golicense .
```

**Cargo (Rust):**
```
cargo license
cargo license --json
```

### Step 2: Check for problematic licenses

**npm — fail on copyleft:**
```
npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0;LGPL-2.1;LGPL-3.0"
```

**Scan the output JSON for anything that isn't in the safe list:**

Safe licenses (permissive): MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, CC0-1.0, Unlicense, 0BSD

Review carefully: MPL-2.0, LGPL-*, CC-BY-*, EUPL-1.2

Red flag: GPL-*, AGPL-*, CC-BY-SA-*, SSPL

### Step 3: Investigate "Unknown" licenses

For packages with unknown or unusual licenses:
1. Find the package's repository URL
2. Look for a LICENSE or COPYING file in the repo root
3. Identify the license and add it to your records

### Step 4: Generate NOTICE / ATTRIBUTIONS file

For projects using Apache-licensed dependencies (required) or for general attribution:

```python
import json

with open('licenses.json') as f:
    deps = json.load(f)

lines = ["THIRD-PARTY SOFTWARE NOTICES\n", "=" * 40 + "\n\n"]
for name, info in sorted(deps.items()):
    lines.append(f"Package: {name}\n")
    if info.get('licenseFile'):
        lines.append(f"License: {info.get('licenses', 'Unknown')}\n")
        lines.append(f"Repository: {info.get('repository', 'N/A')}\n")
    lines.append("\n")

with open('NOTICE', 'w') as f:
    f.writelines(lines)
```

### Step 5: For LGPL dependencies

LGPL is acceptable IF:
- You dynamically link to the library (not statically embed it)
- You allow users to relink with a modified version of the library
- You include a copy of the LGPL license text

Verify your build system uses dynamic linking for LGPL packages.

## Output format

```
LICENSE ANALYSIS: my-project (MIT)

SUMMARY
  Total packages: 142
  License types:  MIT (89), ISC (23), Apache-2.0 (18), BSD-3-Clause (8), Other (4)

✅ COMPATIBLE — No action needed
  MIT, ISC, BSD-*, Apache-2.0 packages are all compatible with MIT license.

⚠️  REVIEW REQUIRED
  • lodash-addons@2.4.2 — license: "Unlicense" — generally permissive, but verify.
  • uuid-tool@1.0.0 — license listed as "WTFPL" — effectively public domain, but
    double-check company policy.

❌ POTENTIAL ISSUES
  • analytics-lib@3.1.0 — GPL-3.0 — INCOMPATIBLE with closed-source commercial use.
    Alternatives: consider mixpanel-browser (MIT) or custom implementation.

REQUIRED ATTRIBUTIONS
  Apache-2.0 packages require inclusion of NOTICE file in distributions:
  • typescript-eslint@6.0.0 (Apache-2.0)
  • @aws-sdk/client-s3@3.0.0 (Apache-2.0)

ACTION ITEMS
1. Replace analytics-lib with a MIT/Apache-2.0 alternative
2. Generate NOTICE file before next commercial release
3. Verify Unlicense/WTFPL packages are acceptable under company IP policy
```

## Pitfalls

- "MIT OR Apache-2.0" means you can choose either — pick MIT for simplicity
- Some packages declare one license in package.json but include a different LICENSE file — the file takes precedence
- LGPL compliance is complex: consult legal counsel for commercial products that embed LGPL libraries
- This analysis informs decisions but is not legal advice — for significant commercial products, have a lawyer review

## Verification

After generating NOTICE file: verify it includes entries for all Apache-2.0 packages (which require it).
Cross-check the flagged GPL packages actually appear in `npm ls` to confirm they're truly in your dependency tree (not just listed in package.json but tree-shaken).
