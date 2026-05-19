---
name: test-coverage
version: 1
---

# Test Coverage Analysis

Analyze test coverage, identify untested code paths, and improve test quality.

## When to use this skill

- User wants to know how much of their code is tested
- User wants to find untested functions or code paths
- User wants to improve their test suite
- User mentions "test coverage", "tests", "unit tests", "missing tests", "what's not tested"

## Procedure

### Step 1: Run existing tests with coverage

**JavaScript / Node.js (Jest):**
```
npx jest --coverage
npx jest --coverage --coverageReporters=text-summary
```

**JavaScript / Node.js (Mocha + c8 or nyc):**
```
npx c8 mocha
npx nyc mocha
```

**Python (pytest-cov):**
```
pip install pytest-cov 2>/dev/null
pytest --cov=. --cov-report=term-missing
pytest --cov=. --cov-report=html   # generates htmlcov/
```

**Go:**
```
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out         # per-function report
go tool cover -html=coverage.out         # HTML report
```

**Rust:**
```
cargo tarpaulin --out Lcov
```

### Step 2: Read and interpret coverage output

Key metrics:
- **Line coverage**: % of lines executed during tests (most common)
- **Branch coverage**: % of if/else branches taken (higher quality metric)
- **Function coverage**: % of functions called at all

Targets (context-dependent):
- 80%+ overall is a good baseline for business logic
- Critical paths (auth, payments, data processing): 95%+
- Utilities: 70%+ is acceptable
- 100% is rarely worth chasing — focus on important paths

### Step 3: Identify the most important gaps

Don't chase raw coverage numbers. Find the highest-risk uncovered code:

```
# Jest: look at the "Uncovered Lines" column in output
# Focus on files with LOW coverage AND HIGH CRITICALITY

# Example: auth/session.js at 42% coverage is more important to fix
# than utils/format.js at 65% coverage
```

Prioritize coverage for:
1. Authentication and authorization logic
2. Payment/financial calculations
3. Data validation and sanitization
4. Error handling paths
5. Public API endpoints

### Step 4: Analyze test quality (not just quantity)

High line coverage can hide poor tests. Check:

**Are edge cases covered?**
- Empty input (empty string, [], {}, null, undefined)
- Boundary values (0, -1, max int, very long strings)
- Error conditions (what happens when the DB is down?)
- Concurrent access (if applicable)

**Are tests testing behavior or implementation?**
- Good: tests call public functions and verify observable outcomes
- Bad: tests access private methods or internal state

**Are tests independent?**
- Each test should set up its own data; no test should depend on another test running first

**Are mocks overused?**
- Mocking the DB is fast but can hide real bugs; integration tests matter

### Step 5: Write targeted new tests

For each uncovered critical path:
1. Identify what the function is supposed to do
2. List the cases: happy path, edge cases, error conditions
3. Write the simplest possible test for each case

**Test naming pattern:**
```javascript
describe('functionName', () => {
  it('returns X when given Y', () => { ... });
  it('throws error when input is null', () => { ... });
  it('handles empty array gracefully', () => { ... });
});
```

### Step 6: Set coverage thresholds (prevent regression)

**Jest (in jest.config.js or package.json):**
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "lines": 80,
        "functions": 80,
        "branches": 70
      },
      "./src/auth/": {
        "lines": 95
      }
    }
  }
}
```

**pytest (in pyproject.toml):**
```toml
[tool.pytest.ini_options]
addopts = "--cov-fail-under=80"
```

## Output format

```
TEST COVERAGE ANALYSIS: my-project

OVERALL: 74% line coverage, 61% branch coverage

HIGH PRIORITY — Low coverage on critical code
  src/auth/token.js         38%  ← authentication! Missing: token expiry, refresh logic
  src/payments/stripe.js    52%  ← payments! Missing: webhook handler, error paths
  src/api/middleware.js      61%  ← Missing: rate limit exceeded, malformed request

MEDIUM PRIORITY — Business logic undertested
  src/models/user.js        67%  ← Missing: password reset flow, account deletion
  src/services/email.js     71%  ← Missing: bounce handling, template errors

ACCEPTABLE — Well covered or low-risk
  src/utils/format.js       91% ✓
  src/config/index.js       88% ✓
  src/db/migrations/        N/A  (migration files, coverage not meaningful)

RECOMMENDED TEST ADDITIONS (by impact)
1. auth/token.js — add: token expiry test, invalid signature test, refresh token test
2. payments/stripe.js — add: webhook signature verification, payment failure handling
3. api/middleware.js — add: rate limit response, missing auth header handling

QUALITY CONCERNS
• 23 tests are currently skipped (xit/xtest) — review if still relevant
• payments.test.js mocks Stripe entirely — consider at least one integration test
```

## Pitfalls

- High coverage doesn't mean good tests — a test that doesn't assert anything still counts as "covered"
- Don't write tests just to hit a number — write tests that would catch real bugs
- Generated code (migrations, schemas) doesn't need coverage; exclude it from reports
- Integration and E2E tests contribute to coverage but run slower — balance with unit tests

## Verification

After adding tests: re-run coverage and confirm the specific lines/branches that were flagged as missing are now covered.
Run the full test suite to confirm no regressions from test setup changes.
