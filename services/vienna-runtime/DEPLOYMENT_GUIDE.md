# Vienna OS Deployment Guide

**Status:** Ready for Phase 6 deployment  
**Repository:** https://github.com/MaxAnderson-code/vienna-os  
**Version:** 2.0 (Phase 12 Complete)

---

## Prerequisites

- [x] Git repository initialized
- [x] GitHub repository created (private)
- [x] Vercel CLI installed
- [x] Fly.io CLI installed
- [ ] Environment secrets configured

---

## Deployment Options

### Option 1: Vercel (Frontend + Serverless API)

**Best for:** Quick deployment with automatic HTTPS and global CDN

**Steps:**

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Link repository**
   ```bash
   cd ~/.openclaw/workspace/vienna-core
   vercel link
   ```

3. **Set environment variables**
   ```bash
   vercel env add VIENNA_OPERATOR_PASSWORD
   vercel env add VIENNA_SESSION_SECRET
   vercel env add ANTHROPIC_API_KEY
   vercel env add OLLAMA_BASE_URL
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

**Notes:**
- Vercel provides automatic HTTPS
- Serverless functions have 10s timeout limit (may need streaming for long operations)
- Database stored in ephemeral `/tmp` (consider external SQLite hosting)

---

### Option 2: Fly.io (Full Node.js Runtime)

**Best for:** Long-running processes, full control, persistent storage

**Steps:**

1. **Login to Fly.io**
   ```bash
   export PATH="$HOME/.fly/bin:$PATH"
   flyctl auth login
   ```

2. **Create app**
   ```bash
   cd ~/.openclaw/workspace/vienna-core
   flyctl apps create vienna-os
   ```

3. **Set secrets**
   ```bash
   flyctl secrets set VIENNA_OPERATOR_PASSWORD="your-password"
   flyctl secrets set VIENNA_SESSION_SECRET="$(openssl rand -hex 32)"
   flyctl secrets set ANTHROPIC_API_KEY="your-key"
   flyctl secrets set OLLAMA_BASE_URL="http://127.0.0.1:11434"
   ```

4. **Deploy**
   ```bash
   flyctl deploy
   ```

5. **Check status**
   ```bash
   flyctl status
   flyctl logs
   ```

**Notes:**
- Fly.io provides persistent volumes for SQLite
- Full Node.js runtime (no timeout limits)
- Supports background services (evaluation loop, health checks)

---

## Environment Variables

**Required:**
- `VIENNA_OPERATOR_PASSWORD` — Operator authentication password
- `VIENNA_SESSION_SECRET` — Session encryption key (32-byte hex)
- `ANTHROPIC_API_KEY` — Primary Anthropic API key

**Optional:**
- `ANTHROPIC_API_KEY_BACKUP` — Backup Anthropic API key (rate limit failover)
- `OLLAMA_BASE_URL` — Local Ollama endpoint (default: http://127.0.0.1:11434)
- `OLLAMA_MODEL` — Local model name (default: qwen2.5:0.5b)
- `CORS_ORIGIN` — Allowed CORS origins (comma-separated)
- `PORT` — Server port (default: 3100)

---

## Post-Deployment Validation

1. **Check health endpoint**
   ```bash
   curl https://your-app.vercel.app/health
   # or
   curl https://vienna-os.fly.dev/health
   ```

2. **Login to dashboard**
   - Navigate to deployment URL
   - Enter operator password
   - Verify dashboard loads

3. **Test chat**
   - Send test message: "show status"
   - Verify response from Vienna

4. **Check providers**
   - Navigate to Runtime page
   - Verify Anthropic/Ollama status

---

## Persistence Strategy

### Vercel (Ephemeral)
- Database: `/tmp/state-graph.db` (cleared on redeploy)
- **Recommendation:** Use external SQLite host (Turso, LiteFS)

### Fly.io (Persistent)
- Database: `/app/runtime/prod/state/state-graph.db`
- **Recommendation:** Add Fly.io volume for persistence

**Add persistent volume:**
```bash
flyctl volumes create vienna_data --region iad --size 10
```

Update `fly.toml`:
```toml
[mounts]
  source = "vienna_data"
  destination = "/app/runtime"
```

---

## Rollback Procedure

### Vercel
```bash
vercel rollback
```

### Fly.io
```bash
flyctl releases
flyctl releases rollback <version>
```

---

## Monitoring

**Health checks:**
- `/health` — Runtime + provider status
- `/api/v1/system/now` — Operator visibility surface

**Logs:**

**Vercel:**
```bash
vercel logs
```

**Fly.io:**
```bash
flyctl logs
flyctl logs --app vienna-os
```

---

## Cost Estimates

### Vercel
- **Free tier:** 100GB bandwidth, 100GB-hours compute
- **Pro ($20/month):** Unlimited bandwidth, better performance
- **Enterprise:** Custom pricing

### Fly.io
- **Free tier:** 3 shared-CPU VMs, 3GB RAM
- **Paid:** ~$5-10/month for 2CPU/2GB VM
- **Storage:** $0.15/GB/month for volumes

---

## Security Checklist

- [ ] Strong operator password set
- [ ] Session secret is 32-byte random hex
- [ ] HTTPS enforced
- [ ] API keys stored as secrets (not in code)
- [ ] CORS origins restricted
- [ ] Database access restricted
- [ ] Auth middleware active on all protected routes

---

## Current Status

- [x] Git repository initialized
- [x] GitHub repository created (private)
- [x] Deployment configs created
- [x] Dockerfile ready
- [ ] Vercel deployment pending
- [ ] Fly.io deployment pending
- [ ] Production secrets configured
- [ ] SSL certificates configured
- [ ] Custom domain configured (optional)

**Next Step:** Choose deployment platform (Vercel or Fly.io) and execute deployment steps.
