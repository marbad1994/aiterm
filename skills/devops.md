---
name: devops
version: 1
category: devops
---

# DevOps & Infrastructure

CI/CD pipelines, containers, orchestration, infrastructure as code, observability, and deployment safety.

## When to use this skill

- User is setting up or fixing CI/CD (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- User mentions Docker, Kubernetes, Helm, Terraform, Ansible, Pulumi
- User is deploying to AWS/GCP/Azure/Fly/Render/Vercel
- User wants observability: logs, metrics, traces, alerts
- User asks about scaling, load balancing, autoscaling
- User mentions production incidents, rollbacks, blue/green, canary

## Procedure

### Step 1: Verify current state before changing
Never propose infrastructure changes without first checking what exists:
```bash
kubectl get all --all-namespaces
docker ps
terraform state list
gh workflow list
```

### Step 2: Identify the deployment model
- Self-hosted (k8s cluster, VPS) vs managed (Vercel, Render, Fly, Heroku, App Engine)
- Container vs serverless vs traditional VM
- IaC tool: Terraform, Pulumi, CDK, Ansible — match what's in use

### Step 3: CI/CD pipeline anatomy
Every pipeline should have these stages:
1. **Lint** — format + static analysis (fast feedback)
2. **Build** — compile/bundle, fail fast on errors
3. **Test** — unit + integration; e2e only if fast enough
4. **Security** — dependency scan, SAST, secret scan
5. **Package** — container image, artifact upload
6. **Deploy** — manual gate for prod, automatic for staging

Cache aggressively (deps, build outputs). Pin tool versions.

### Step 4: Container best practices
- Multi-stage Dockerfile: build stage + slim runtime stage
- Non-root user in the runtime stage
- `.dockerignore` to avoid leaking secrets/build context
- Pin base image versions (no `:latest`)
- Healthchecks (`HEALTHCHECK` or k8s liveness/readiness probes)

### Step 5: Kubernetes essentials (if applicable)
- Liveness probe (restart if unhealthy)
- Readiness probe (remove from load balancer if not ready)
- Resource requests + limits (never unlimited)
- HPA for autoscaling (CPU/memory/custom metrics)
- PodDisruptionBudget for stateful services

### Step 6: Observability
- **Logs**: structured (JSON), centralized (Loki/Cloudwatch/Datadog), 30-90 day retention
- **Metrics**: Prometheus + Grafana or equivalent. Track RED (Rate, Errors, Duration).
- **Traces**: OpenTelemetry. Sample at 1-10% in prod.
- **Alerts**: page on USER-VISIBLE failures (5xx rate, latency), not on infrastructure noise

### Step 7: Deploy safely
- Always preview changes (`terraform plan`, `helm diff`, `kubectl diff`)
- Rollouts: progressive (canary or rolling, not all-at-once)
- Rollback plan documented before each prod deploy
- Database migrations: backward-compatible (add column, deploy app, then drop old column in next release)

## Red flags
- Secrets committed to git (or in env file in repo)
- No rollback path documented for a destructive migration
- `:latest` tags in production manifests
- Unbounded resource limits (one pod can starve the cluster)
- CI pipeline that auto-deploys to prod on every commit without gates
- No staging environment that mirrors prod
- Missing healthchecks (services restart unnecessarily or stay in load balancer when broken)
- Cron jobs without leader election (multiple replicas run the same job)
