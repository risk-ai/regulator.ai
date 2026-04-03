# Runbook: Deploy Vienna Runtime

**Purpose:** Deploy Vienna Runtime to Fly.io (preview or production)  
**Audience:** DevOps, Platform Engineers  
**Prerequisite:** Fly.io CLI installed, Fly.io account active

---

## Quick Reference

**Build and deploy:**
```bash
cd services/vienna-runtime
fly deploy
```

**Check health:**
```bash
curl https://vienna-runtime.fly.dev/health
```

---

## Step 1: Prerequisites

**Verify Fly.io CLI installed:**
```bash
fly version
# Should show: flyctl v0.x.x
```

**Login to Fly.io:**
```bash
fly auth login
```

**Verify logged in:**
```bash
fly auth whoami
```

---

## Step 2: Create Fly App (First Time Only)

**Navigate to runtime directory:**
```bash
cd services/vienna-runtime
```

**Initialize Fly app:**
```bash
fly launch --no-deploy

# Follow prompts:
# - App name: vienna-runtime-preview (or vienna-runtime-prod)
# - Region: iad (us-east-1) or nearest
# - Postgres: No (we'll use Neon)
# - Redis: No
# - Deploy: No (we'll configure first)
```

**Verify app created:**
```bash
fly apps list | grep vienna-runtime
```

---

## Step 3: Create Persistent Volume (First Time Only)

**For preview (10GB):**
```bash
fly volumes create vienna_data \
  --region iad \
  --size 10 \
  --app vienna-runtime-preview
```

**For production (50GB):**
```bash
fly volumes create vienna_data \
  --region iad \
  --size 50 \
  --app vienna-runtime-prod
```

**Verify volume created:**
```bash
fly volumes list --app vienna-runtime-preview
```

**Expected output:**
```
ID              STATE   NAME          SIZE    REGION  ATTACHED VM
vol_abc123...   created vienna_data   10GB    iad     -
```

---

## Step 4: Configure Secrets

### Preview Configuration (SQLite + Filesystem)

```bash
fly secrets set \
  PORT=4001 \
  NODE_ENV=preview \
  ARTIFACT_STORAGE_TYPE=filesystem \
  CORS_ORIGINS=https://preview.vercel.app,https://*.vercel.app \
  --app vienna-runtime-preview

# No DATABASE_URL needed (will use SQLite)
```

### Production Configuration (Postgres + S3)

```bash
fly secrets set \
  PORT=4001 \
  NODE_ENV=production \
  DATABASE_URL=postgresql://user:pass@ep-name.c-2.us-east-1.aws.neon.tech/vienna?sslmode=require \
  ARTIFACT_STORAGE_TYPE=s3 \
  AWS_S3_BUCKET=vienna-artifacts-prod \
  AWS_REGION=us-east-1 \
  AWS_ACCESS_KEY_ID=<your-key> \
  AWS_SECRET_ACCESS_KEY=<your-secret> \
  CORS_ORIGINS=https://app.your-domain.com \
  --app vienna-runtime-prod
```

**Verify secrets set:**
```bash
fly secrets list --app vienna-runtime-preview
```

**Expected output:**
```
NAME                    DIGEST                          CREATED AT
PORT                    abc123...                       2026-03-14
NODE_ENV                def456...                       2026-03-14
...
```

---

## Step 5: Deploy to Fly.io

**Deploy:**
```bash
fly deploy --app vienna-runtime-preview

# Or for production:
fly deploy --app vienna-runtime-prod
```

**Monitor deployment:**
```bash
fly status --app vienna-runtime-preview
```

**Expected output:**
```
App
  Name     = vienna-runtime-preview
  Owner    = personal
  Hostname = vienna-runtime-preview.fly.dev
  Platform = machines
  
Machines
ID              STATE   REGION  HEALTH CHECKS   LAST UPDATED
abc123...       started iad     3 total, 3 passing  2026-03-14T22:54:00Z
```

---

## Step 6: Verify Health

**Check health endpoint:**
```bash
curl https://vienna-runtime-preview.fly.dev/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 30,
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "sqlite",
      "configured": true,
      "path": "/app/data/vienna.db"
    },
    "artifact_storage": {
      "status": "healthy"
    }
  }
}
```

**For production (Postgres + S3):**
```json
{
  "status": "healthy",
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "postgres",
      "configured": true
    }
  }
}
```

---

## Step 7: Verify Connectivity

**Test investigations endpoint:**
```bash
curl https://vienna-runtime-preview.fly.dev/api/investigations
```

**Expected response:**
```json
[]
```
or
```json
[
  {
    "id": "inv_001",
    "name": "Example Investigation",
    ...
  }
]
```

**Check logs:**
```bash
fly logs --lines 50 --app vienna-runtime-preview
```

**Expected logs:**
```
🏛 Vienna Runtime Service
   Port: 4001
   Environment: preview
   Database Backend: sqlite (/app/data/vienna.db)
   Artifact Backend: filesystem
   Health: http://localhost:4001/health

✓ Ready for requests
```

---

## Step 8: Update Shell Configuration

After runtime is deployed, configure product shell to use runtime URL.

**In Vercel:**

1. Go to Project Settings → Environment Variables
2. Add/update `VIENNA_RUNTIME_URL`:
   - Preview: `https://vienna-runtime-preview.fly.dev`
   - Production: `https://vienna-runtime-prod.fly.dev`
3. Redeploy shell

**Or via Vercel CLI:**
```bash
vercel env add VIENNA_RUNTIME_URL preview
# Enter: https://vienna-runtime-preview.fly.dev

vercel env add VIENNA_RUNTIME_URL production
# Enter: https://vienna-runtime-prod.fly.dev
```

---

## Smoke Tests

### Test 1: Health Check

```bash
curl https://vienna-runtime-preview.fly.dev/health
# Expected: {"status":"healthy",...}
```

### Test 2: Investigations List

```bash
curl https://vienna-runtime-preview.fly.dev/api/investigations
# Expected: [] or [{...}]
```

### Test 3: Incidents List

```bash
curl https://vienna-runtime-preview.fly.dev/api/incidents
# Expected: [] or [{...}]
```

### Test 4: Shell Proxy Connection

```bash
# From shell deployment:
curl https://preview.vercel.app/api/workspace/investigations
# Should proxy to runtime and return data
```

---

## Rollback

**If deployment fails:**

```bash
# List recent releases
fly releases list --app vienna-runtime-preview

# Rollback to previous release
fly releases rollback <version> --app vienna-runtime-preview

# Or rollback one version
fly releases rollback -v 1 --app vienna-runtime-preview
```

**Verify rollback:**
```bash
fly status --app vienna-runtime-preview
curl https://vienna-runtime-preview.fly.dev/health
```

---

## Troubleshooting

### App won't start

**Check logs:**
```bash
fly logs --lines 100 --app vienna-runtime-preview
```

**Common issues:**
- Missing secrets (PORT, NODE_ENV)
- Invalid DATABASE_URL
- S3 credentials wrong
- Docker build failure

**Solution:**
```bash
# Verify secrets
fly secrets list --app vienna-runtime-preview

# Set missing secrets
fly secrets set PORT=4001 --app vienna-runtime-preview

# Redeploy
fly deploy --app vienna-runtime-preview
```

### Health check failing

**SSH into container:**
```bash
fly ssh console --app vienna-runtime-preview
```

**Inside container:**
```bash
# Check process
ps aux

# Check health locally
curl http://localhost:4001/health

# Check environment
env | grep -E 'DATABASE|ARTIFACT|AWS'

# Check data directory
ls -la /app/data
```

### Database connection failing

**For Postgres:**
```bash
# Test connection string
fly ssh console --app vienna-runtime-preview -C \
  "node -e \"const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URL}); c.connect().then(()=>console.log('OK')).catch(e=>console.error(e))\""
```

**Common issues:**
- Invalid DATABASE_URL format
- Wrong password
- SSL mode mismatch
- Neon database paused (free tier)

### S3 connection failing

**Check credentials:**
```bash
fly ssh console --app vienna-runtime-preview

# Inside container:
node -e "const {S3Client}=require('@aws-sdk/client-s3'); const s3=new S3Client({region:process.env.AWS_REGION}); console.log('S3 client created')"
```

**Common issues:**
- Wrong AWS_ACCESS_KEY_ID
- Wrong AWS_SECRET_ACCESS_KEY
- Bucket doesn't exist
- Permissions missing (s3:PutObject, s3:GetObject)

---

## Monitoring

**Check app status:**
```bash
fly status --app vienna-runtime-preview
```

**Tail logs:**
```bash
fly logs --app vienna-runtime-preview
```

**View metrics:**
```bash
fly dashboard --app vienna-runtime-preview
# Opens Fly.io dashboard in browser
```

---

## Scaling

**Scale up (more resources):**
```bash
fly scale vm performance-2 --app vienna-runtime-preview
```

**Scale down (back to shared):**
```bash
fly scale vm shared-cpu-2x --app vienna-runtime-preview
```

**Add regions (multi-region):**
```bash
fly scale count 2 --region iad,lax --app vienna-runtime-prod
```

**Check current scale:**
```bash
fly scale show --app vienna-runtime-preview
```

---

## Cleanup (Delete Deployment)

**⚠️ WARNING:** This deletes the app and persistent volume permanently.

```bash
# Delete app (keeps volume)
fly apps destroy vienna-runtime-preview

# Delete volume
fly volumes delete <volume-id> --app vienna-runtime-preview
```

---

## Cheat Sheet

| Task | Command |
|------|---------|
| Deploy | `fly deploy --app <app-name>` |
| Check status | `fly status --app <app-name>` |
| View logs | `fly logs --app <app-name>` |
| SSH into container | `fly ssh console --app <app-name>` |
| Rollback | `fly releases rollback <version> --app <app-name>` |
| Set secret | `fly secrets set KEY=value --app <app-name>` |
| List secrets | `fly secrets list --app <app-name>` |
| Check health | `curl https://<app-name>.fly.dev/health` |

---

## Next Steps

After successful deployment:

1. Configure shell to use runtime URL
2. Test end-to-end from shell
3. Monitor logs for errors
4. Set up alerts (future)
5. Document any deployment-specific issues
