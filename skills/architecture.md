---
name: architecture
version: 1
category: planning
---

# Software Architecture Analysis

Analyze project structure, module relationships, dependencies, and architectural patterns.

## When to use this skill

- User wants to understand how a codebase is organized
- User wants to find architectural problems (coupling, circular deps, bloated modules)
- User wants to document or diagram the architecture
- User wants advice on how to reorganize or improve structure
- User mentions "architecture", "structure", "dependencies", "modules", "how does this connect"

## Procedure

### Step 1: Establish the landscape

Start by reading the top-level directory and key config files:
```
list_dir(".")
read_file("package.json")    # or pyproject.toml, Cargo.toml, go.mod, etc.
read_file("README.md")
```

Identify: language, framework, package manager, entry points.

### Step 2: Map the structure

List and read each major directory:
```
list_dir("src/")
list_dir("lib/")
list_dir("app/")
```

For each significant module/file, identify:
- What it exports (public API)
- What it imports (dependencies)
- What it's responsible for (single responsibility or mixed?)

### Step 3: Identify imports/dependencies

For JS/TS:
```
grep -r "^import\|^require" src/ --include="*.js" --include="*.ts" | head -100
```

For Python:
```
grep -r "^import\|^from" . --include="*.py" | grep -v __pycache__ | head -100
```

For Go:
```
grep -r "\"" --include="*.go" | grep import | head -100
```

### Step 4: Detect architectural patterns

**Identify which pattern is in use:**
- **Layered (N-tier)**: controllers → services → repositories → database
- **Feature-based / vertical slices**: feature-a/ (with its own controller, service, model)
- **Hexagonal / clean architecture**: domain/ + ports/ + adapters/
- **Event-driven**: events/, handlers/, dispatchers/
- **Monolith vs. modules vs. microservices**

**Signs of architectural problems:**
- Circular imports/dependencies: A imports B, B imports C, C imports A
- God files: one file with 1000+ lines doing everything
- Missing abstraction: business logic mixed into controllers or UI components
- Tight coupling: deep import chains across layers that shouldn't know about each other
- Inconsistent patterns: half the codebase using one pattern, half using another

### Step 5: Check for circular dependencies

For Node.js:
```
npx madge --circular src/
```

For Python:
```
pip show pydeps && pydeps module_name
```

Or manually trace: if module A imports B, search if B (or anything B imports) imports A.

### Step 6: Assess module responsibilities

For the 5-10 largest files, check if they're doing too much. A module should have one clear answer to: "what is this responsible for?"

Signs of violation: a service file that also does HTTP routing, template rendering, and database migrations.

## Output format

```
ARCHITECTURE ANALYSIS: my-project

OVERVIEW
Language: TypeScript (Node.js), React frontend
Pattern: Layered architecture (controllers → services → repositories)
Entry points: src/index.ts (API server), src/worker.ts (background jobs)

STRUCTURE
src/
  api/         HTTP controllers — good separation
  services/    Business logic — some mixing with persistence (see below)
  db/          Database models and migrations
  utils/       Shared utilities — well-contained
  types/       Type definitions

ISSUES

⚠️  [HIGH] Circular dependency: auth/service.ts → users/service.ts → auth/middleware.ts → auth/service.ts
   Resolution: Extract shared types to a separate module that neither imports from the other.

⚠️  [MEDIUM] src/services/payment.ts is 847 lines and handles: Stripe integration, webhook parsing,
   email notifications, and database writes. Should be split into:
   - payment-gateway.ts (Stripe API)
   - webhook-handler.ts
   - payment-repository.ts

ℹ️  [LOW] src/utils/ has grown to 23 files with no internal organization.
   Consider grouping into: utils/string/, utils/date/, utils/crypto/

STRENGTHS
• Clear separation between API and service layers
• Repository pattern consistently applied for database access
• Type definitions centralized in types/

RECOMMENDATIONS
1. Break circular dependency in auth (blocks safe refactoring of either module)
2. Split payment.ts into focused modules
3. Organize utils/ directory
```

## Pitfalls

- Don't redesign the entire architecture based on a read — focus on actual problems
- Some coupling is intentional — understand the design before calling it wrong
- Large files aren't always a problem — a well-organized 1000-line file may be fine
- Framework conventions may explain patterns that look wrong in isolation (e.g. Rails fat models)

## Verification

After identifying issues: trace at least one import path manually to confirm it's a real circular dependency before reporting it.
