# Vienna OS Deployment Guide

**Last Updated:** 2026-03-28  
**Maintainer:** Vienna OS Core Team

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [NUC Deployment](#nuc-deployment)
5. [Health Checks](#health-checks)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js** 20+ or 22+ (LTS recommended)
- **npm** 10+
- **systemd** (for service management)
- **Cloudflare Tunnel** (cloudflared binary)

### Required Accounts

- **Cloudflare account** (for tunnel management)
- **Anthropic API key** (for Claude models)
- **GitHub account** (for repository access)
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

### Step 3: Set Fly.io Secrets

**Set secrets in Fly.io (NOT in fly.toml):**

```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set SESSION_SECRET=$(openssl rand -hex 32)
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set DATABASE_URL=postgresql://...  # if using Postgres
```

**Verify secrets:**

```bash
fly secrets list
```

---

## Database Setup

### Option A: SQLite (Default, Good for Development)

**No additional setup required.**

Vienna OS will automatically create `state-graph.db` at startup.

**Pros:**
- Zero configuration
- Fast local development
- Easy backups (single file)

**Cons:**
- Not recommended for multi-instance deployments
- Limited concurrency

**Location:** `/app/data/state/state-graph.db` (inside container)

### Option B: PostgreSQL (Recommended for Production)

**Step 1: Create Fly Postgres Database**

```bash
fly postgres create --name vienna-os-db --region iad
```

**Step 2: Attach to App**

```bash
fly postgres attach vienna-os-db --app vienna-os
```

This automatically sets `DATABASE_URL` secret.

**Step 3: Verify Connection**

```bash
fly ssh console --app vienna-os
$ echo $DATABASE_URL
```

**Step 4: Run Migrations**

Migrations run automatically on startup. Verify with:

```bash
fly logs --app vienna-os | grep "Running migrations"
```

---

## NUC Deployment

### Initial Setup

**Step 1: Clone Repository**

```bash
cd ~/.openclaw/workspace
git clone https://github.com/risk-ai/regulator.ai.git regulator-ai-repo
cd regulator-ai-repo
```

**Step 2: Install Dependencies**

```bash
cd apps/console/server
npm install
```

**Step 3: Build Production**

```bash
npm run build:prod
```

### Deploy Updates

**Automated deployment (recommended):**

```bash
# Auto-deploy script runs every 10 minutes via cron
~/vienna-auto-deploy.sh
```

**Manual deployment:**

```bash
cd ~/.openclaw/workspace/regulator-ai-repo
git pull origin main
cd apps/console/server
npm install
npm run build:prod
sudo systemctl restart vienna-console
```

### Configuration Reference

**systemd service file (`/etc/systemd/system/vienna-console.service`):**

```ini
[Unit]
Description=Vienna OS Console
After=network.target

[Service]
Type=simple
User=maxlawai
WorkingDirectory=/home/maxlawai/.openclaw/workspace/regulator-ai-repo/apps/console/server
ExecStart=/usr/bin/node build/server.cjs
EnvironmentFile=/home/maxlawai/.openclaw/workspace/regulator-ai-repo/.env.console
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Cloudflare Tunnel service (`/etc/systemd/system/cloudflared-vienna.service`):**

```ini
[Unit]
Description=Cloudflare Tunnel for Vienna Console
After=network.target

[Service]
Type=simple
User=maxlawai
ExecStart=/usr/local/bin/cloudflared tunnel run vienna-console
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Service Management

**Check service status:**

```bash
sudo systemctl status vienna-console
sudo systemctl status cloudflared-vienna
```

**View logs:**

```bash
sudo journalctl -u vienna-console -f
sudo journalctl -u cloudflared-vienna -f
```

**Restart services:**

```bash
sudo systemctl restart vienna-console
sudo systemctl restart cloudflared-vienna
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
# External (via Cloudflare Tunnel)
curl https://console.regulator.ai/health

# Local (direct to NUC)
curl http://localhost:3100/health
```

### Fly.io Health Check Configuration

**In `fly.toml`:**

```toml
[[http_service.checks]]
  interval = '15s'           # Check every 15 seconds
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
