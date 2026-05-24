---
name: backend
version: 1
category: backend
---

# Backend Engineering

API design, database modeling, authentication, caching, error handling, observability, and security for server-side code.

## When to use this skill

- User is building or modifying an API (REST, GraphQL, gRPC)
- User is designing database schema, models, or queries
- User mentions Node.js, Python (FastAPI/Django/Flask), Go, Java/Spring, Rails, NestJS, Express
- User wants to add authentication/authorization
- User mentions caching, queues, jobs, workers, or background tasks
- User asks about API performance, N+1 queries, or database optimization

## Procedure

### Step 1: Understand the stack
- Identify framework, language version, database, and ORM/query layer (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, etc.)
- Check for existing patterns: route definitions, controllers, services, repositories
- Note auth approach: JWT, sessions, OAuth, API keys

### Step 2: Match existing conventions
Read 2-3 existing routes/handlers before adding new ones. Match:
- Route naming (`/users/:id` vs `/user/{id}` vs `/api/v1/users/:id`)
- Response shape (envelope `{data, error}` vs flat objects)
- Error format (HTTP status + JSON body)
- Validation approach (zod, joi, pydantic, JSON Schema)

### Step 3: Design the endpoint
For every new endpoint:
- **Input validation** at the boundary (validate before processing)
- **Auth check** explicit per route, not just middleware-implicit
- **Error responses** with appropriate HTTP status and a stable error code
- **Idempotency** for mutations where the client might retry
- **Pagination** for list endpoints (offset+limit or cursor)
- **Rate limiting** consideration (where? per-user? per-endpoint?)

### Step 4: Database
- **Schema**: foreign keys with proper indexes, soft delete vs hard delete decision, timestamps (`created_at`, `updated_at`)
- **Queries**: check for N+1 (the loop body calling the DB). Use eager loading / batch fetches.
- **Indexes**: every column used in `WHERE`, `JOIN`, or `ORDER BY` filter needs an index
- **Migrations**: reversible, idempotent, additive when possible

### Step 5: Auth & security
- Tokens: HttpOnly + Secure + SameSite=Strict for sessions
- Hashes: bcrypt/argon2/scrypt (never MD5/SHA1)
- Validate tokens on every protected route — don't trust middleware alone
- No secrets in source — use env vars or secret manager
- Rate limit auth endpoints (login, password reset, registration)

### Step 6: Error handling
- Distinguish 4xx (client error) from 5xx (server error)
- Never expose stack traces in production responses
- Log errors with context (request ID, user ID, parameters)
- For async: always `.catch()` or `try/catch` — silent failures hide bugs

### Step 7: Observability
- Structured logs (JSON), not free-text
- Correlation/request IDs propagate across services
- Metrics: request rate, error rate, p50/p95/p99 latency
- Traces for slow paths (any request > 1s)

## Red flags
- String concatenation in SQL (injection risk)
- User input passed directly to `exec`/`system`/`eval`
- Unvalidated request bodies reaching the database layer
- Auth check only in middleware on a public-by-default app
- Long-running synchronous work blocking the event loop
- Missing indexes on foreign keys
- Cron jobs without locking (multiple instances run the same job)
- Tokens stored in localStorage instead of HttpOnly cookies
