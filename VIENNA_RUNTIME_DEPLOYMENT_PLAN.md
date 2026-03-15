# Vienna Runtime Deployment Plan

**Date:** 2026-03-14  
**Branch:** `feat/vienna-integration-phase1`  
**Purpose:** Define deployment strategy for Vienna Runtime service

---

## Required Capabilities

Vienna Runtime requires a platform that supports:

### Core Requirements

✅ **Always-on HTTP service**
- Not serverless (persistent process required)
- WebSocket-compatible (future requirement)
- HTTP/HTTPS endpoints

✅ **Persistent volume or attached storage**
- SQLite database file must persist across restarts
- Artifact directory must persist
- Minimum 1GB storage, recommend 10GB for production

✅ **Environment variable support**
- Runtime configuration via env vars
- Secrets management for future Postgres credentials

✅ **Future Postgres support**
- Connection pooling support
- TLS/SSL connection support
- Neon Serverless Postgres compatibility

✅ **Filesystem or object storage compatibility**
- Local filesystem for preview/dev
- S3 API-compatible storage for production
- Seamless migration path from filesystem → object storage

### Operational Requirements

✅ **Port binding**
- Configurable port (default 3001)
- Platform-assigned port support via `$PORT` env var

✅ **Health checks**
- `GET /health` endpoint support
- Startup probes and readiness checks

✅ **Resource limits**
- Node.js 18+ runtime
- Minimum 512MB memory, recommend 1GB
- Minimal CPU requirements (1 core sufficient for preview)

---

## Recommended Preview/Staging Path

### Platform: **Fly.io** (Recommended)

**Why Fly.io:**
- First-class persistent volumes
- Simple Docker deployment
- Free tier available (suitable for preview)
- Global edge network (low latency)
- Built-in secret management
- Native Postgres (Fly Postgres) available
- Neon Postgres fully supported

**Deployment steps:**

1. **Create Fly app:**
```bash
cd services/vienna-runtime
fly launch --no-deploy
```

2. **Create persistent volume:**
```bash
fly volumes create vienna_data --region iad --size 10
```

3. **Configure env vars:**
```bash
fly secrets set PORT=3001
fly secrets set VIENNA_STATE_BACKEND=sqlite
fly secrets set VIENNA_ARTIFACT_BACKEND=filesystem
fly secrets set VIENNA_DATA_DIR=/data
fly secrets set CORS_ORIGIN=https://your-preview.vercel.app
```

4. **Update `fly.toml`:**
```toml
[mounts]
  source = "vienna_data"
  destination = "/data"

[[services.ports]]
  handlers = ["http"]
  port = 80

[[services.ports]]
  handlers = ["tls", "http"]
  port = 443
```

5. **Deploy:**
```bash
fly deploy
```

**Expected outcome:**
- Vienna Runtime available at `https://vienna-runtime.fly.dev`
- SQLite persisted in `/data/vienna.db`
- Artifacts persisted in `/data/artifacts/`

---

## Alternative Platforms

### Railway.app

**Pros:**
- Simple GitHub deployment
- Persistent volumes
- Free tier
- Good DX

**Cons:**
- More expensive at scale
- Fewer regions

**Deployment:**
```bash
# Link GitHub repo
railway link

# Add env vars via dashboard
# Deploy triggers on git push
```

### Render.com

**Pros:**
- Free tier
- Simple setup
- Postgres included

**Cons:**
- Slower cold starts
- Limited regions

---

## Recommended Production Path

### Platform: **Fly.io** (Same as preview)

**Why keep Fly.io for production:**
- Preview → production migration is trivial
- Persistent volumes scale well
- Multi-region deployment supported
- Cost-effective ($5-10/month for small workload)

**Production changes:**

1. **Migrate to Neon Postgres:**
```bash
fly secrets set VIENNA_STATE_BACKEND=postgres
fly secrets set DATABASE_URL=postgresql://...@neon.tech/vienna
```

2. **Migrate artifacts to S3 or Vercel Blob:**
```bash
fly secrets set VIENNA_ARTIFACT_BACKEND=s3
fly secrets set AWS_S3_BUCKET=vienna-artifacts
fly secrets set AWS_ACCESS_KEY_ID=...
fly secrets set AWS_SECRET_ACCESS_KEY=...
```

3. **Enable multi-region:**
```bash
fly scale count 2 --region iad,lax
```

4. **Add metrics and monitoring:**
- Fly.io native metrics
- Sentry for error tracking
- Custom health check dashboard

---

## Non-Goals for Stage 5

The following are **intentionally deferred** beyond Stage 5:

❌ **Production runtime deployment** — Preview validation only  
❌ **Postgres migration** — SQLite acceptable for preview  
❌ **S3 artifact backend** — Filesystem acceptable for preview  
❌ **Multi-region replication** — Single region for preview  
❌ **High availability** — Single instance for preview  
❌ **CDN for artifacts** — Direct serving for preview  
❌ **Background workers** — Not needed for preview  
❌ **Rate limiting** — Not needed for preview  

---

## Preview Deployment Checklist

For Stage 5 completion, Vienna Runtime deployment requires:

✅ Platform selected (Fly.io recommended)  
✅ Persistent volume configured  
✅ Environment variables set  
✅ CORS configured for Vercel preview domain  
✅ Health endpoint reachable  
✅ SQLite database initialized  
✅ Artifacts directory writable  
✅ Product shell proxy routes configured with runtime URL  

---

## Migration Path: Preview → Production

**Stage 5 (Preview):**
- Fly.io single region
- SQLite state backend
- Filesystem artifact backend
- Free tier / minimal resources

**Stage 6+ (Production):**
- Fly.io multi-region (or same platform)
- Neon Postgres state backend
- S3 artifact backend
- Production resources (1GB memory, 2 CPU)
- Observability integration
- Backup/restore workflows

**Key advantage:** Zero platform migration, only configuration changes.

---

## Cost Estimates

### Preview (Fly.io)
- App: Free tier
- Volume (10GB): $1.50/month
- **Total: ~$2/month**

### Production (Fly.io)
- App (1GB memory, 2 CPU): $5-10/month
- Volume (50GB): $7.50/month
- Neon Postgres: $19/month (Launch plan)
- S3 (100GB): $2.50/month
- **Total: ~$35-40/month**

---

## Alternative: Hybrid Model

**Option:** Vercel for product shell + Railway for runtime

**Pros:**
- Single dashboard for preview deployments
- GitHub integration for both

**Cons:**
- More expensive (~$20/month vs $2/month)
- Less control over runtime infrastructure

**Recommendation:** Start with Fly.io for cost efficiency, migrate only if needed.

---

## Conclusion

**Recommended path:** Fly.io for both preview and production

**Preview readiness:** Can deploy today with:
```bash
fly launch
fly volumes create vienna_data --size 10
fly secrets set ...
fly deploy
```

**Production readiness:** Configuration changes only (no platform migration)

**Next steps for Stage 5:**
1. Deploy Vienna Runtime to Fly.io preview
2. Configure CORS for Vercel preview domain
3. Update product shell `VIENNA_RUNTIME_BASE_URL` env var
4. Validate end-to-end preview flow
