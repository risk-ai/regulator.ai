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
- **npm** or **pnpm**
- **Vercel CLI** (`npm i -g vercel`)

### Required Accounts

- **Vercel account** (for serverless deployment)
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
# AI Provider
ANTHROPIC_API_KEY=sk-ant-...

# Database
POSTGRES_URL=postgresql://user:password@host:5432/vienna_os

# Security
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
```

**Optional but recommended:**

```env
# Logging
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...

# Integrations
SLACK_BOT_TOKEN=xoxb-...
```

### Step 3: Set Vercel Environment Variables

**Set environment variables in Vercel:**

```bash
# Using Vercel CLI
vercel env add ANTHROPIC_API_KEY production
vercel env add POSTGRES_URL production
vercel env add SESSION_SECRET production
vercel env add JWT_SECRET production

# Or via Vercel dashboard at vercel.com/project-name/settings/environment-variables
```

**Verify variables:**

```bash
vercel env ls
```

---

## Database Setup

### Neon Postgres (Production)

Vienna OS uses Neon Postgres Launch plan for production deployment.

**Step 1: Database is Pre-configured**

The database connection is already established via:
- Host: `ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech`
- Database: `neondb` 
- User: `neondb_owner`

**Step 2: Set Environment Variable**

```bash
# Set in Vercel environment variables
POSTGRES_URL=postgresql://neondb_owner:password@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb
```

**Step 3: Run Migrations**

Migrations run automatically on deployment. Monitor via Vercel function logs.

**Features:**
- Serverless-compatible connection pooling
- Automatic scaling
- Built-in backups and point-in-time recovery
- Shared across all portfolio sites

---

## Vercel Deployment

### Initial Setup

**Step 1: Connect Repository**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project to Vercel
vercel link

# Or import via dashboard at vercel.com/new
```

**Step 2: Configure Project**

Vienna OS is configured as a Next.js project with:
- Frontend: Static generation and serverless functions
- Backend API: Vercel serverless functions
- Database: Neon Postgres connection pooling

### Deploy Updates

**Automated deployment (recommended):**

```bash
# Git-based deployment (triggers automatically)
git push origin main
```

**Manual deployment:**

```bash
# Deploy to preview
vercel

# Deploy to production  
vercel --prod

# Deploy specific directory
cd apps/console && vercel --prod
```

### Configuration Reference

**vercel.json configuration:**

```json
{
  "builds": [
    {
      "src": "apps/console/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/apps/console/server/src/routes/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Domain Configuration

**Production domains:**
- **Marketing site:** `https://regulator.ai` → Vercel serverless
- **Console/API:** `https://console.regulator.ai` → Vercel serverless

**DNS Configuration:**
- A/AAAA records point to Vercel edge network
- SSL/TLS automatically managed by Vercel
- Global CDN distribution via Vercel Edge Network

### Monitoring & Logs

**View deployment logs:**

```bash
vercel logs --app regulator-ai
vercel logs --app console-regulator-ai
```

**Function logs:**

```bash
vercel logs --follow
```

**Performance monitoring:**
- Vercel Analytics (built-in)
- Function duration and memory usage
- Edge cache hit rates

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
# Production health check
curl https://console.regulator.ai/health
curl https://regulator.ai/api/health

# Preview deployment health check  
curl https://preview-deployment-url.vercel.app/health
```

### Vercel Health Monitoring

**Built-in monitoring:**
- Function execution logs via Vercel dashboard
- Performance metrics (duration, memory usage)
- Error tracking and stack traces

**View function logs:**

```bash
vercel logs --follow
```

**Custom health monitoring:**
- Implement `/api/health` endpoint
- Monitor via external services (Uptime Robot, Pingdom)
- Set up Vercel integration alerts

---

## Troubleshooting

### Issue: Function Deployment Fails

**Symptoms:**
- Build fails during deployment
- Function times out on startup
- 500 errors on API endpoints

**Diagnosis:**

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Test locally
vercel dev
```

**Common causes:**

1. **Build errors**
   - Missing dependencies in package.json
   - TypeScript compilation errors
   - Import path resolution issues

2. **Environment variables missing**
   - Verify `vercel env ls`
   - Check required variables are set

3. **Database connection failed**
   - Verify `POSTGRES_URL` is correct
   - Check Neon database status
   - Connection pool exhaustion

4. **Function timeout (10s limit)**
   - Optimize slow queries
   - Implement caching
   - Break into smaller functions

**Resolution:**

```bash
# Fix environment variables
vercel env add MISSING_VAR production

# Redeploy
vercel --prod --force

# Check function logs
vercel logs --follow
```

### Issue: Function Cold Starts

**Symptoms:**
- Slow initial response time (~2-3s)
- Timeout on first request after inactivity

**Diagnosis:**

Check function execution time in Vercel dashboard.

**Resolution:**

```javascript
// Implement function warming
export default async function handler(req, res) {
  // Keep database connections alive
  if (req.query.warm === 'true') {
    return res.json({ warm: true });
  }
  
  // Regular logic here
}
```

### Issue: Environment Variable Sync

**Symptoms:**
- Functions work locally but fail in production
- "undefined" values for environment variables

**Diagnosis:**

```bash
# Check environment variables
vercel env ls

# Compare with local .env
cat .env
```

**Resolution:**

```bash
# Sync missing variables
vercel env add MISSING_VAR production

# Pull latest environment
vercel env pull .env.local
```

### Issue: Database Connection Pool Exhaustion

**Symptoms:**
- "Connection pool exhausted" errors
- Functions timeout randomly

**Diagnosis:**

Check Neon dashboard for active connections.

**Resolution:**

```javascript
// Use connection pooling
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10, // Limit concurrent connections
  idleTimeoutMillis: 30000,
});

// Always release connections
const client = await pool.connect();
try {
  // Query here
} finally {
  client.release();
}
```

---

## Monitoring

### View Logs

**Real-time:**

```bash
vercel logs --follow
```

**Filtered:**

```bash
vercel logs | grep ERROR
```

**Specific function:**

```bash
vercel logs --app console-regulator-ai
```

### Metrics Dashboard

```bash
vercel dashboard
```

Opens Vercel dashboard with:
- Function invocations
- Response time
- Error rate
- Bandwidth usage
- Edge cache performance

### Alerts (Optional)

**Set up monitoring alerts:**

1. Vercel → Project → Settings → Integrations
2. Add alert integrations:
   - PagerDuty for function failures
   - Slack for deployment notifications
   - DataDog for performance monitoring

---

## Rollback

### Rollback to Previous Deployment

```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url> --yes

# Or rollback via Git
git revert <commit-hash>
git push origin main  # Triggers new deployment
```

### Emergency Rollback

```bash
# Instant rollback to last known good deployment
vercel rollback

# Or promote specific deployment URL
vercel promote https://deployment-abc123.vercel.app
```

---

## Production Checklist

Before deploying to production:

- [ ] All required environment variables set (`vercel env ls`)
- [ ] Database configured and migrated (Neon Postgres)
- [ ] Health endpoints responding (`curl https://console.regulator.ai/health`)
- [ ] DNS configured correctly (regulator.ai, console.regulator.ai)
- [ ] SSL/TLS certificate valid (automatic with Vercel)
- [ ] Function monitoring configured
- [ ] Database backup strategy confirmed (Neon automatic backups)
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
