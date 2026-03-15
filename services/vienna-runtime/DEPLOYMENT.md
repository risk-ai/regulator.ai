# Vienna Runtime Deployment Guide (Stage 6)

**Date:** 2026-03-14  
**Platform:** Fly.io  
**Status:** ✅ CONFIGURATION READY

---

## Overview

Vienna Runtime is deployed as a containerized service on Fly.io with support for both preview (development) and production (scaled) configurations.

**Deployment architecture:**
```
GitHub Repo
  ↓
Docker Build (Dockerfile)
  ↓
Fly.io Registry
  ↓
Fly.io Container Runtime
  ↓
Vienna Persistent Volume (/app/data)
  ↓
Neon Postgres (production) or SQLite (preview)
  ↓
S3 Artifact Storage (production) or Filesystem (preview)
```

---

## Build Steps

### Prerequisites

- Node.js 22+ (for local validation)
- Docker (for local testing)
- Fly.io CLI (`flyctl` installed)
- Fly.io account and app created

### Local Build

**Build image:**
```bash
cd services/vienna-runtime

# Build with Docker
docker build -t vienna-runtime:latest .

# Test locally
docker run \
  -p 3001:3001 \
  -e PORT=3001 \
  -e NODE_ENV=development \
  -e ARTIFACT_STORAGE_TYPE=filesystem \
  -v $(pwd)/data:/app/data \
  vienna-runtime:latest

# Check health
curl http://localhost:3001/health
```

### Fly.io Build

**Fly.io automatically builds from Dockerfile:**
```bash
# First time: initialize app
fly launch --no-deploy

# Check app exists
fly apps list | grep vienna-runtime

# Deploy
fly deploy
```

---

## Deploy Steps

### 1. Create Fly App (First Time Only)

```bash
cd services/vienna-runtime

# Initialize Fly app
fly launch --no-deploy

# This creates:
# - fly.toml configuration
# - App in Fly.io dashboard
# - Does NOT deploy yet
```

### 2. Create Persistent Volume (First Time Only)

```bash
# Create 10GB persistent volume for SQLite + artifacts (preview)
fly volumes create vienna_data \
  --region iad \
  --size 10

# Production: consider larger volume
fly volumes create vienna_data \
  --region iad \
  --size 50  # 50GB for production artifacts
```

**Verify volume created:**
```bash
fly volumes list
```

### 3. Configure Secrets

**Required secrets for deployment:**

```bash
# Basic runtime config
fly secrets set PORT=3001
fly secrets set NODE_ENV=production

# Artifact storage (preview uses filesystem)
fly secrets set ARTIFACT_STORAGE_TYPE=filesystem

# Or for production (S3)
fly secrets set ARTIFACT_STORAGE_TYPE=s3
fly secrets set AWS_S3_BUCKET=vienna-artifacts-prod
fly secrets set AWS_REGION=us-east-1
fly secrets set AWS_ACCESS_KEY_ID=<your-key>
fly secrets set AWS_SECRET_ACCESS_KEY=<your-secret>

# Database (preview uses SQLite)
# (No DATABASE_URL needed, defaults to SQLite)

# Or for production (Neon Postgres)
fly secrets set DATABASE_URL=postgresql://user:pass@ep-name.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# CORS configuration (point to your shell domain)
fly secrets set CORS_ORIGINS=https://your-app.vercel.app,https://your-app-staging.vercel.app
```

**View secrets:**
```bash
fly secrets list
```

### 4. Deploy to Fly.io

```bash
# Initial deployment
fly deploy

# Or deploy specific image
fly deploy --image ghcr.io/your-org/vienna-runtime:latest

# Check deployment progress
fly status

# View recent logs
fly logs --lines 100
```

**Verify deployment:**
```bash
# Check app is running
fly status

# Check health endpoint
fly ssh console -C "curl http://localhost:3001/health"

# Or from outside
curl https://vienna-runtime.fly.dev/health
```

### 5. Configure Shell Runtime URL

In the product shell (Vercel), set environment variable:

```bash
# .env.production
VIENNA_RUNTIME_URL=https://vienna-runtime.fly.dev

# Or your custom domain
VIENNA_RUNTIME_URL=https://runtime.your-domain.com
```

Then redeploy product shell:
```bash
# Vercel will redeploy with new VIENNA_RUNTIME_URL
git push origin main
```

---

## Required Secrets

| Secret | Required | Example | Notes |
|--------|----------|---------|-------|
| `PORT` | ✅ | `3001` | Runtime port |
| `NODE_ENV` | ✅ | `production` | Environment mode |
| `ARTIFACT_STORAGE_TYPE` | ✅ | `filesystem` or `s3` | Storage backend |
| `DATABASE_URL` | ❌ | `postgresql://...` | Neon (production only) |
| `AWS_S3_BUCKET` | ❌* | `vienna-artifacts` | S3 bucket name |
| `AWS_REGION` | ❌* | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | ❌* | `AKIAIOSFODNN7EXAMPLE` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ❌* | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | AWS credentials |
| `CORS_ORIGINS` | ❌ | `https://app.vercel.app` | Browser CORS whitelist |

*Required only if `ARTIFACT_STORAGE_TYPE=s3`

---

## Environment Variables

### Database Configuration

**Preview (SQLite):**
```bash
# No DATABASE_URL needed
# SQLite created automatically at /app/data/vienna.db
```

**Production (Postgres):**
```bash
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-purple-smoke.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Artifact Storage Configuration

**Preview (Filesystem):**
```bash
ARTIFACT_STORAGE_TYPE=filesystem
# Files stored in /app/data/artifacts/
```

**Production (S3):**
```bash
ARTIFACT_STORAGE_TYPE=s3
AWS_S3_BUCKET=vienna-artifacts
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

### Optional Configuration

```bash
# CORS origins (comma-separated)
CORS_ORIGINS=https://app.vercel.app,https://staging.vercel.app

# Logging level
LOG_LEVEL=info  # error|warn|info|debug
```

---

## Health Checks

### Endpoint

**GET** `/health`

**Response (healthy):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "sqlite",
      "configured": true,
      "path": "/app/data/vienna.db"
    },
    "artifact_storage": {
      "status": "healthy",
      "disk_usage": "N/A (dev mode)"
    }
  }
}
```

**Response (degraded - Postgres unavailable):**
```json
{
  "status": "degraded",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "components": {
    "state_graph": {
      "status": "unhealthy",
      "type": "postgres",
      "configured": true
    }
  }
}
```

### Fly.io Health Check Configuration

Defined in `fly.toml`:
```toml
[[services.http_checks]]
  protocol = "http"
  method = "GET"
  path = "/health"
  interval = "30s"
  timeout = "10s"
  grace_period = "5s"
```

**Behavior:**
- Every 30 seconds, Fly.io requests `/health`
- Expects 200 status within 10 seconds
- Gives container 5 seconds to start before checking
- Automatically restarts if unhealthy for threshold period

---

## Smoke Tests

### Local Testing (Pre-deployment)

```bash
# 1. Build Docker image
docker build -t vienna-runtime:test .

# 2. Run container
docker run -d \
  --name vienna-test \
  -p 3001:3001 \
  -e PORT=3001 \
  -e NODE_ENV=development \
  -e ARTIFACT_STORAGE_TYPE=filesystem \
  -v $(pwd)/data:/app/data \
  vienna-runtime:test

# 3. Wait for startup
sleep 3

# 4. Check health
curl http://localhost:3001/health

# 5. Test investigations list
curl http://localhost:3001/api/investigations

# 6. Check logs
docker logs vienna-test

# 7. Cleanup
docker stop vienna-test
docker rm vienna-test
```

### Post-deployment Testing

```bash
# 1. Check app status
fly status

# 2. Tail logs
fly logs --lines 50

# 3. SSH into container
fly ssh console

# 4. Inside container, check processes
ps aux

# 5. Check health endpoint
curl http://localhost:3001/health

# 6. Exit SSH
exit

# 7. Test from outside
curl https://vienna-runtime.fly.dev/health

# 8. Test with auth (shell will include header)
curl -H "Authorization: Bearer <token>" \
  https://vienna-runtime.fly.dev/api/investigations
```

### Full End-to-End Test

```bash
# 1. Deploy shell with VIENNA_RUNTIME_URL pointing to Fly app
# 2. Access shell at https://your-app.vercel.app
# 3. Navigate to /workspace/investigations
# 4. Should see investigations loaded from runtime
# 5. Click detail to load single investigation
# 6. Check shell network tab confirms requests to runtime
# 7. Check runtime health remains "healthy"
```

---

## Rollback Notes

### Rollback to Previous Deployment

**Fly.io keeps recent deployments:**
```bash
# List recent deployments
fly releases list

# Rollback to specific release
fly releases rollback <release-version>

# Or rollback one version back
fly releases rollback -v 1
```

### Data Safety During Rollback

- **Persistent volume** (`/app/data`) persists across rollbacks
- SQLite database and artifacts are never lost
- Rollback is safe for state recovery

### Manual Rollback Steps

1. **If deployment fails but old version running:**
   ```bash
   fly releases rollback
   ```

2. **If bad data in SQLite, restore from backup:**
   ```bash
   # SSH into container
   fly ssh console
   
   # Stop app
   kill <pid>
   
   # Restore backup
   cp /app/data/vienna.db.backup /app/data/vienna.db
   
   # Restart
   fly apps restart
   ```

3. **If S3 corrupted, restore from S3 versioning:**
   ```bash
   # Via AWS console or CLI
   aws s3api list-object-versions \
     --bucket vienna-artifacts \
     --prefix artifacts/
   
   # Restore old version
   aws s3api copy-object \
     --bucket vienna-artifacts \
     --copy-source vienna-artifacts/artifacts/id?versionId=XXX \
     --key artifacts/id
   ```

---

## Scale and Resize

### Increase Resources

```bash
# Check current VM size
fly status -d

# Resize to larger VM
fly scale vm performance-2

# Or back to standard
fly scale vm shared-cpu-2x
```

### Add Additional Regions

```bash
# Deploy to additional region
fly scale count 2 --region iad,lax

# Check status
fly status
```

### Monitor Resource Usage

```bash
fly status -d
fly metrics
```

---

## Monitoring and Alerts

### Fly.io Monitoring

- **Dashboard:** https://fly.io/dashboard
- **Metrics:** fly.io provides CPU, memory, network metrics
- **Logs:** Accessible via `fly logs` CLI

### Health Monitoring

```bash
# Continuous health check
while true; do
  curl -s https://vienna-runtime.fly.dev/health | jq .status
  sleep 30
done
```

### Recommended Observability (Future)

- Sentry for error tracking
- Prometheus for metrics
- Datadog for observability
- PagerDuty for alerts

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
fly logs --lines 100

# SSH in to debug
fly ssh console

# Check environment variables
env | grep -E 'DATABASE|ARTIFACT|AWS'

# Check file permissions
ls -la /app/data
```

### Health Check Failing

```bash
# Check health endpoint manually
curl https://vienna-runtime.fly.dev/health

# Check if Postgres connection works (if using Postgres)
fly ssh console -C "curl postgresql://..."

# Check S3 connectivity (if using S3)
fly ssh console -C "aws s3 ls"
```

### Performance Issues

```bash
# Check CPU/memory usage
fly metrics

# View request logs
fly logs --lines 200

# Check slow queries
fly ssh console
# Inside: check process logs for slow operations
```

### Disk Space Issues

```bash
# Check volume usage
fly volumes list

# SSH in and check
fly ssh console -C "df -h"

# Remove old artifacts if needed
fly ssh console -C "find /app/data/artifacts -mtime +30 -delete"
```

---

## Production Checklist

Before promoting to production:

- [ ] PostgreSQL connection tested
- [ ] S3 bucket created and credentials configured
- [ ] Environment variables set via `fly secrets`
- [ ] Health endpoint returning 200
- [ ] Smoke tests passing
- [ ] CORS configured for production shell domain
- [ ] Backups configured (if needed)
- [ ] Monitoring/alerting set up
- [ ] Team trained on rollback procedures
- [ ] Runbook documented (this file)

---

## Support & Escalation

**For Fly.io issues:**
- Check Fly.io status: https://status.fly.io
- Consult Fly.io docs: https://fly.io/docs
- Contact Fly.io support

**For Vienna Runtime issues:**
- Check runtime logs: `fly logs`
- Review OBSERVABILITY.md for logging details
- File issue on GitHub

---

## Next Steps

1. **Create Fly app** (if not already done)
2. **Create persistent volume**
3. **Set secrets** for your environment
4. **Deploy** via `fly deploy`
5. **Test** health endpoint and workspace
6. **Configure shell** with VIENNA_RUNTIME_URL
7. **Monitor** health checks and logs
