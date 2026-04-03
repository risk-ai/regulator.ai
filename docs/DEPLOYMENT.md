# Vienna OS Deployment Guide

**Last Updated:** 2026-04-03  
**Maintainer:** Vienna OS Core Team

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Health Checks](#health-checks)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js** 20+ or 22+ (LTS recommended)
- **npm** or **pnpm** 9+
- **Vercel CLI** (optional, for manual deploys)

### Required Accounts

- **Vercel account** (for serverless deployment)
- **Anthropic API key** (for Claude models)
- **GitHub account** (for repository access and auto-deploy)
- **Neon account** (for Postgres database)

---

## Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2: Fill Required Variables

**Minimum required for deployment:**

```env
# Server
PORT=3100
HOST=0.0.0.0
NODE_ENV=production

# AI Provider
ANTHROPIC_API_KEY=sk-ant-...

# Security
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# CORS
CORS_ORIGIN=https://console.regulator.ai,https://vienna-os.fly.dev
```

**Optional but recommended:**

```env
# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/vienna_os

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...

# Integrations
SLACK_BOT_TOKEN=xoxb-...
```

### Step 3: Set Vercel Environment Variables

**Set environment variables in Vercel dashboard or CLI:**

```bash
# Via Vercel CLI
vercel env add ANTHROPIC_API_KEY production
vercel env add SESSION_SECRET production
vercel env add JWT_SECRET production
vercel env add DATABASE_URL production

# Or via Vercel Dashboard
# Project Settings → Environment Variables → Add New
```

**Generate secrets locally:**

```bash
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 32  # For JWT_SECRET
```

---

## Database Setup

### Neon PostgreSQL (Production)

Vienna OS uses Neon Postgres with auto-scaling on the Launch plan.

**Step 1: Create Neon Database**

1. Go to https://console.neon.tech
2. Create new project: `vienna-os-production`
3. Region: `us-east-1` (recommended for lowest latency to Vercel)
4. Plan: Launch (auto-scaling, pooled connections)

**Step 2: Get Connection String**

From Neon dashboard, copy the pooled connection string:

```
postgresql://user:password@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb
```

**Step 3: Set DATABASE_URL in Vercel**

```bash
vercel env add DATABASE_URL production
# Paste the connection string when prompted
```

**Step 4: Run Migrations**

Migrations run automatically on first deployment. Verify in Vercel deployment logs:

```bash
vercel logs --follow
```

Look for: `Running migrations... ✓`

---

## Vercel Deployment

### Initial Setup

**Step 1: Connect GitHub Repository**

1. Go to https://vercel.com/new
2. Import Git Repository: `risk-ai/regulator.ai`
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: `./` (monorepo auto-detected)

**Step 2: Configure Build Settings**

Vercel auto-detects the monorepo structure. Verify:

```
Build Command: pnpm build
Output Directory: .next (auto)
Install Command: pnpm install
```

**Step 3: Add Environment Variables**

In Vercel dashboard → Settings → Environment Variables:

```
ANTHROPIC_API_KEY=sk-ant-...
SESSION_SECRET=<generated-secret>
JWT_SECRET=<generated-secret>
DATABASE_URL=postgresql://...
NODE_ENV=production
```

**Step 4: Deploy**

```bash
# Push to main triggers auto-deploy
git push origin main

# Or deploy manually
vercel --prod
```

### Deploy Updates

**Automated deployment (recommended):**

Every push to `main` automatically triggers a production deployment.

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

**Manual deployment:**

```bash
# Deploy current branch to production
vercel --prod

# Deploy specific branch
vercel --prod --branch feature-branch
```

### Deployment Monitoring

**View deployment status:**

```bash
vercel ls
```

**Inspect deployment:**

```bash
vercel inspect <deployment-url>
```

**View logs:**

```bash
vercel logs --follow
vercel logs <deployment-url>
```

### Rollback

**Rollback to previous deployment:**

1. Go to Vercel dashboard → Deployments
2. Find last known good deployment
3. Click "Promote to Production"

**Or via CLI:**

```bash
vercel rollback
```

---

## Health Checks

### Health Endpoint

**GET `/health`**

**Expected response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T15:30:00.000Z",
  "version": "0.10.1",
  "uptime_seconds": 3456789
}
```

**Failure indicators:**
- **503 Service Unavailable:** Database connection failed
- **500 Internal Server Error:** Unhandled exception
- **Timeout:** Server not responding (likely crashed)

### Manual Health Check

```bash
# Production API health
curl https://console.regulator.ai/api/v1/health

# Detailed health (includes DB latency, memory, CPU)
curl https://console.regulator.ai/api/v1/system/health/detailed

# Marketing site status page
curl https://regulator.ai/status
```

### Vercel Health Monitoring

Vercel provides automatic health monitoring via:
  timeout = '10s'            # Fail if no response in 10s
  grace_period = '30s'       # Allow 30s warmup on startup
  method = 'GET'
  path = '/health'
```

**View health check logs:**

```bash
fly checks list
```

---

## Troubleshooting

### Issue: Deployment Fails with "Health Checks Failed"

**Symptoms:**
- Machine starts but health checks timeout
- Machine stops after deployment
- `/health` endpoint not responding

**Diagnosis:**

```bash
# Check machine status
fly status

# View logs
fly logs --app vienna-os

# SSH into machine
fly ssh console --app vienna-os

# Check if server is running
$ ps aux | grep node

# Test health endpoint locally
$ curl http://localhost:3100/health
```

**Common causes:**

1. **Database connection failed**
   - Verify `DATABASE_URL` secret is set
   - Check database is running: `fly postgres status`

2. **Missing required environment variable**
   - Check `fly secrets list`
   - Verify `.env.example` variables are set

3. **Port mismatch**
   - Server listening on wrong port
   - Check `PORT` environment variable

4. **Server crashed on startup**
   - Check logs for stack traces
   - Missing dependencies (native modules)

**Resolution:**

```bash
# Fix environment variables
fly secrets set MISSING_VAR=value

# Restart machine
fly machine restart <machine-id>

# Force redeploy
fly deploy --config fly.toml --force
```

### Issue: Build Fails with Missing Files

**Symptoms:**
- Docker build fails with "file not found"
- Example: `turbo.json: not found`

**Diagnosis:**

Check Dockerfile COPY commands reference existing files:

```bash
cd ~/.openclaw/workspace/regulator-ai-repo
cat apps/console/server/Dockerfile | grep COPY
```

**Resolution:**

Remove or conditionally copy missing files:

```dockerfile
# Instead of:
COPY turbo.json ./

# Use (if optional):
COPY turbo.json ./ || true

# Or remove line if file doesn't exist
```

### Issue: Machine Lease Conflicts

**Symptoms:**
- Error: `failed to get lease on VM`
- Error: `lease currently held by <id>`

**Diagnosis:**

```bash
fly status  # Check machine state
```

**Resolution:**

```bash
# Wait 5 minutes for lease to expire, OR:
fly machine stop <machine-id>
fly machine start <machine-id>
```

### Issue: Out of Memory (OOM)

**Symptoms:**
- Machine stops unexpectedly
- Logs show "out of memory"

**Diagnosis:**

```bash
fly logs | grep -i "memory\|oom"
```

**Resolution:**

```bash
# Increase memory allocation
fly scale memory 4096  # 4 GB

# Or optimize code (reduce memory usage)
```

### Issue: Slow Performance

**Symptoms:**
- Health checks timeout intermittently
- High latency (>1s)

**Diagnosis:**

```bash
# Check machine metrics
fly metrics

# Check machine size
fly status
```

**Resolution:**

```bash
# Vertical scaling
fly scale cpu 4
fly scale memory 4096

# Or optimize queries (add database indexes)
```

---

## Monitoring

### View Logs

**Real-time:**

```bash
fly logs --app vienna-os
```

**Filtered:**

```bash
fly logs --app vienna-os | grep ERROR
```

**Specific machine:**

```bash
fly logs --instance <machine-id>
```

### Metrics Dashboard

```bash
fly dashboard
```

Opens Fly.io web dashboard with:
- Request rate
- Response time
- Error rate
- Memory usage
- CPU usage

### Alerts (Optional)

**Set up monitoring alerts:**

1. Fly.io → App → Monitoring
2. Add alert rules:
   - Health check failures (>3 consecutive)
   - High error rate (>5% of requests)
   - High memory usage (>80%)

---

## Rollback

### Rollback to Previous Deployment

```bash
# List recent deployments
fly releases

# Rollback to specific version
fly releases rollback <version-number>
```

### Emergency Rollback

```bash
# Stop current machine
fly machine stop <machine-id>

# Start previous known-good image
fly deploy --image registry.fly.io/vienna-os:deployment-<old-id>
```

---

## Production Checklist

Before deploying to production:

- [ ] All required environment variables set (`fly secrets list`)
- [ ] Database configured and migrated
- [ ] Health endpoint responding (`curl https://vienna-os.fly.dev/health`)
- [ ] CORS origins configured correctly
- [ ] SSL/TLS certificate valid (automatic with Fly.io)
- [ ] Monitoring alerts configured
- [ ] Backup strategy defined (database dumps)
- [ ] Incident response plan documented
- [ ] Rollback procedure tested

---

## Support

**Documentation:** https://docs.vienna-os.com  
**GitHub Issues:** https://github.com/vienna-os/core/issues  
**Discord:** https://discord.gg/vienna-os  
**Email:** support@vienna-os.com

---

**Last Updated:** 2026-03-26  
**Version:** 8.0.0
