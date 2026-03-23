# Environment Contract (Stage 6)

**Date:** 2026-03-14  
**Purpose:** Define production environment variable contract for shell + runtime

---

## Overview

The regulator.ai integration includes **two separate services** with distinct environment contracts:

1. **Product Shell** (Next.js on Vercel)
2. **Vienna Runtime** (Node.js on Fly.io)

Each service has its own environment variables. They communicate via HTTP, not shared environment.

---

## Product Shell (Vercel)

### Required Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | `postgresql://...@neon.tech/neondb` | Shell database (proposals, warrants) |
| `VIENNA_RUNTIME_URL` | ✅ | `https://vienna-runtime.fly.dev` | Runtime service URL |

### Optional Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `WORKSPACE_AUTH_TOKEN` | ❌* | `<base64-token>` | Workspace auth (staging/prod only) |
| `NEXTAUTH_SECRET` | ❌** | `<secret>` | NextAuth session secret |
| `NEXTAUTH_URL` | ❌** | `https://app.example.com` | NextAuth callback URL |
| `GOOGLE_CLIENT_ID` | ❌** | `<client-id>` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌** | `<client-secret>` | Google OAuth client secret |

*Required for staging/production. Not needed for local development.  
**Future feature (NextAuth integration), not yet implemented.

### Local Development (.env.local)

```bash
# Database (shell)
DATABASE_URL=postgresql://user:pass@localhost:5432/regulator_dev

# Vienna Runtime (local)
VIENNA_RUNTIME_URL=http://localhost:4001

# Auth (optional - disabled when not set)
# WORKSPACE_AUTH_TOKEN=  # Intentionally not set for local dev
```

### Vercel Preview Deployment

Set in Vercel project settings → Environment Variables → Preview:

```bash
DATABASE_URL=<neon-preview-url>
VIENNA_RUNTIME_URL=https://vienna-runtime-preview.fly.dev
WORKSPACE_AUTH_TOKEN=<preview-token>
```

### Vercel Production Deployment

Set in Vercel project settings → Environment Variables → Production:

```bash
DATABASE_URL=<neon-production-url>
VIENNA_RUNTIME_URL=https://vienna-runtime.fly.dev
WORKSPACE_AUTH_TOKEN=<production-token>
```

---

## Vienna Runtime (Fly.io)

### Required Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `PORT` | ✅ | `3001` | HTTP port (set by Fly.io) |
| `NODE_ENV` | ✅ | `production` | Environment mode |
| `ARTIFACT_STORAGE_TYPE` | ✅ | `filesystem` or `s3` | Storage backend |

### Optional Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ❌* | `postgresql://...@neon.tech/vienna` | Postgres (production only) |
| `AWS_S3_BUCKET` | ❌** | `vienna-artifacts` | S3 bucket name |
| `AWS_REGION` | ❌** | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | ❌** | `AKIA...` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ❌** | `wJalr...` | AWS credentials |
| `AWS_ENDPOINT_URL` | ❌ | `https://r2.example.com` | S3-compatible endpoint |
| `CORS_ORIGINS` | ❌ | `https://app.vercel.app` | CORS whitelist |
| `LOG_LEVEL` | ❌ | `info` | Log verbosity |

*Not required for preview (uses SQLite). Required for production.  
**Required only if `ARTIFACT_STORAGE_TYPE=s3`.

### Local Development (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# Storage (local defaults)
ARTIFACT_STORAGE_TYPE=filesystem
# DATABASE_URL not set → Uses SQLite at ./data/vienna.db

# CORS (optional, defaults to localhost:3000)
CORS_ORIGINS=http://localhost:3000
```

### Fly.io Preview Deployment

Set via `fly secrets`:

```bash
fly secrets set PORT=3001
fly secrets set NODE_ENV=preview
fly secrets set ARTIFACT_STORAGE_TYPE=filesystem
fly secrets set CORS_ORIGINS=https://preview.vercel.app
# DATABASE_URL not set → Uses SQLite
```

### Fly.io Production Deployment

Set via `fly secrets`:

```bash
fly secrets set PORT=3001
fly secrets set NODE_ENV=production

# Database (Postgres)
fly secrets set DATABASE_URL=postgresql://user:pass@ep-name.c-2.us-east-1.aws.neon.tech/vienna?sslmode=require

# Artifact Storage (S3)
fly secrets set ARTIFACT_STORAGE_TYPE=s3
fly secrets set AWS_S3_BUCKET=vienna-artifacts-prod
fly secrets set AWS_REGION=us-east-1
fly secrets set AWS_ACCESS_KEY_ID=<key>
fly secrets set AWS_SECRET_ACCESS_KEY=<secret>

# CORS
fly secrets set CORS_ORIGINS=https://app.your-domain.com
```

---

## Secret Management

### Where Secrets Live

**Product Shell (Vercel):**
- Set via Vercel dashboard: Project → Settings → Environment Variables
- Never commit to `.env.local` (gitignored)
- Preview/Production isolated

**Vienna Runtime (Fly.io):**
- Set via `fly secrets set KEY=value`
- Encrypted at rest in Fly.io
- Never in `fly.toml` (public config only)

### Secret Rotation

**WORKSPACE_AUTH_TOKEN:**
```bash
# Generate new token
NEW_TOKEN=$(openssl rand -base64 32)

# Update in Vercel
# (via dashboard or vercel CLI)

# No restart needed (Next.js reads env on request)
```

**AWS Credentials:**
```bash
# Rotate in AWS IAM
# Update in Fly.io
fly secrets set AWS_ACCESS_KEY_ID=<new-key>
fly secrets set AWS_SECRET_ACCESS_KEY=<new-secret>

# Restart runtime
fly apps restart
```

**DATABASE_URL:**
```bash
# Rotate in Neon/Postgres
# Update in Vercel + Fly.io
fly secrets set DATABASE_URL=<new-url>

# Restart runtime
fly apps restart
```

---

## Cross-Environment Isolation

### Rule: Never Share Secrets Across Environments

❌ **WRONG:**
```bash
# Using production DATABASE_URL in preview
DATABASE_URL=<prod-url>  # DON'T DO THIS
```

✅ **CORRECT:**
```bash
# Separate databases per environment
# Local: postgresql://localhost/regulator_dev
# Preview: postgresql://.../regulator_preview
# Production: postgresql://.../regulator_prod
```

### Environment Boundaries

```
Local Development
  Shell DB: Local Postgres or SQLite
  Runtime DB: SQLite (./data/vienna.db)
  Runtime Artifacts: Filesystem (./data/artifacts/)
  Auth: Disabled (no WORKSPACE_AUTH_TOKEN)

Preview Deployment
  Shell DB: Neon Preview Branch
  Runtime DB: SQLite (Fly volume /app/data/vienna.db)
  Runtime Artifacts: Filesystem (Fly volume /app/data/artifacts/)
  Auth: Enabled (preview token)

Production Deployment
  Shell DB: Neon Production
  Runtime DB: Neon Production (separate database)
  Runtime Artifacts: S3 (vienna-artifacts-prod bucket)
  Auth: Enabled (production token)
```

---

## Environment Variable Validation

### Shell Startup Checks

```typescript
// src/lib/env-validation.ts (future enhancement)
if (!process.env.VIENNA_RUNTIME_URL) {
  throw new Error('VIENNA_RUNTIME_URL is required');
}

if (process.env.NODE_ENV === 'production' && !process.env.WORKSPACE_AUTH_TOKEN) {
  console.warn('WARNING: WORKSPACE_AUTH_TOKEN not set in production');
}
```

### Runtime Startup Checks

```typescript
// services/vienna-runtime/src/index.ts
const backend = getDatabaseBackend();
console.log(`Database Backend: ${backend}`);

if (backend === 'postgres' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL required for Postgres backend');
}

const artifactBackend = getArtifactBackend();
console.log(`Artifact Backend: ${artifactBackend}`);

if (artifactBackend === 's3' && !process.env.AWS_S3_BUCKET) {
  throw new Error('AWS_S3_BUCKET required for S3 backend');
}
```

**Startup logs validate configuration:**
```
[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Artifact Storage] Initializing S3 backend
✓ Ready for requests
```

---

## Common Mistakes

### ❌ Wrong: Sharing shell DATABASE_URL with runtime

Shell and runtime have **separate databases**:
- Shell DB: proposals, policies, warrants, audit_log
- Runtime DB: investigations, incidents, artifacts, traces

Each service connects to its own database.

### ❌ Wrong: Hardcoding VIENNA_RUNTIME_URL in code

```typescript
// ❌ DON'T DO THIS
const runtimeUrl = 'https://vienna-runtime.fly.dev';
```

```typescript
// ✅ DO THIS
const runtimeUrl = process.env.VIENNA_RUNTIME_URL;
```

### ❌ Wrong: Committing secrets to .env.local

`.env.local` is gitignored. Never commit it. Use `.env.example` as template.

### ❌ Wrong: Using production secrets in preview

Always isolate preview and production secrets.

---

## Backup and Disaster Recovery

### Shell Database Backup

Neon provides:
- Point-in-time recovery (7 days free tier, 30 days paid)
- Manual backups via Neon dashboard
- Database branching for safe migrations

**Backup frequency:** Automatic (Neon managed)

### Runtime Database Backup

**SQLite (preview):**
- Backup via Fly volume snapshot: `fly volumes snapshots create <volume-id>`
- Or manual: `fly ssh console -C "cp /app/data/vienna.db /app/data/vienna.db.backup"`

**Postgres (production):**
- Neon automatic backups (same as shell)
- Or pg_dump for manual backups

**Backup frequency:** Daily recommended

### Artifact Backup

**Filesystem (preview):**
- Fly volume snapshots
- Or manual tar/zip via SSH

**S3 (production):**
- S3 versioning enabled (immutable versions)
- S3 lifecycle policy for archival (Glacier after 90 days)
- Cross-region replication (optional, for HA)

**Backup frequency:** Continuous (S3 versioning)

---

## Secrets Inventory

### Critical Secrets (Never Share)

1. `DATABASE_URL` (shell + runtime, separate databases)
2. `AWS_SECRET_ACCESS_KEY` (runtime only)
3. `NEXTAUTH_SECRET` (shell only, future)
4. `WORKSPACE_AUTH_TOKEN` (shell only, rotatable)

### Non-Secret Config (Safe to Version Control)

1. `VIENNA_RUNTIME_URL` (public URL, can be in code)
2. `AWS_REGION` (not secret)
3. `AWS_S3_BUCKET` (bucket name, not secret)
4. `PORT` (not secret)
5. `NODE_ENV` (not secret)
6. `ARTIFACT_STORAGE_TYPE` (not secret)

---

## Health Check URLs

**Shell:**
- Local: http://localhost:3000
- Preview: https://preview-branch.vercel.app
- Production: https://app.your-domain.com

**Runtime:**
- Local: http://localhost:3001/health
- Preview: https://vienna-runtime-preview.fly.dev/health
- Production: https://vienna-runtime.fly.dev/health

---

## Exit Criteria (Stage 6)

✅ **Shell `.env.example` documents all variables**  
✅ **Runtime `.env.example` documents all variables**  
✅ **ENVIRONMENT_CONTRACT.md created**  
✅ **Secret isolation documented**  
✅ **Rotation procedures documented**  
✅ **Environment-specific guidance provided**  

**Stage 6 environment hardening requirement met.**

---

## Next Steps (Post-Stage 6)

1. **Validate environment setup** in both local and deployed contexts
2. **Test secret rotation** procedures
3. **Add startup validation** for required env vars
4. **Implement secret scanning** in CI/CD (detect committed secrets)
5. **Document incident response** for secret exposure
ecret exposure
