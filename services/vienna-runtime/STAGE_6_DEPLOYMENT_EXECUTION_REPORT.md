# Stage 6 Deployment Execution Report

**Execution Date:** 2026-03-15 12:10–12:22 EDT  
**Status:** ✅ Preview Deployment Successful

---

## Runtime Deployment

**Fly App Name:** `vienna-runtime-preview`  
**Region:** `iad` (US East)  
**Machine ID:** `286ed05a53e058`  
**Machine Status:** STARTED (v3)  
**Health Checks:** 3/3 PASSING  
**Deployed URL:** https://vienna-runtime-preview.fly.dev

**Deployment Commands Run:**
```bash
fly auth login                           # Authenticated as max@law.ai
fly apps create vienna-runtime-preview  # Created app
fly volumes create vienna_data --size 10 --region iad  # Created 10GB persistent volume
fly secrets set PORT=4001 NODE_ENV=preview ...  # Set environment config
fly deploy --app vienna-runtime-preview  # Deployed container
```

**Deploy Result:** ✅ SUCCESS
- Docker image built: 64 MB
- Pushed to registry.fly.io
- Machine launched and started
- Health endpoint responding

**Backend Selected:** SQLite (auto-selected, no DATABASE_URL configured)
- Database: `/app/data/vienna.db`
- Persistent Storage: `/app/data/artifacts/` (10GB volume)
- Status: Healthy

---

## Direct Runtime Health

**Endpoint:** `https://vienna-runtime-preview.fly.dev/health`

**Response (2026-03-15 16:21 UTC):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 9,
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

**Status:** ✅ HEALTHY

---

## Issues Encountered

### Issue 1: Fly CLI Not Installed
**Symptom:** `fly: command not found`  
**Fix:** Installed Fly CLI from https://fly.io/install.sh  
**Impact:** None after resolution

### Issue 2: Invalid Buildpack Configuration
**Symptom:** `json: cannot unmarshal object into Go struct field Service.services.processes`  
**Root Cause:** fly.toml had invalid `[[services.processes]]` array syntax  
**Fix:** Removed invalid config, used standard Docker build (`dockerfile = "Dockerfile"`)  
**Impact:** None after resolution

### Issue 3: Dumb-init Not Found in Fly Environment
**Symptom:** Machine crash loop with `Error: failed to spawn command: /sbin/dumb-init -- node dist/index.js: No such file or directory`  
**Root Cause:** Fly.io's boot system cannot execute /sbin/dumb-init from ENTRYPOINT. Fly handles init directly.  
**Fix:** Removed dumb-init ENTRYPOINT, used direct CMD `["node", "dist/index.js"]`  
**Impact:** Dockerfile corrected, deployment succeeded

### Issue 4: PORT Environment Variable Mismatch
**Symptom:** Secrets set PORT=4001 but Dockerfile/fly.toml expected 3001  
**Fix:** Removed PORT secret (Fly defaults to 3001 for internal port, 443 for external)  
**Impact:** Machine healthchecks now passing

---

## Shell Configuration

**Status:** ⏳ PENDING (Manual Vercel Configuration)

**Required Environment Variables for Shell:**
```bash
VIENNA_RUNTIME_BASE_URL=https://vienna-runtime-preview.fly.dev
```

**Additional Required Vars (based on Stage 6 auth model):**
- Check `services/shell/.env.example` for auth-related vars
- Check `WORKSPACE_AUTH_MODEL.md` for complete auth requirements

**Next Steps:**
1. Set VIENNA_RUNTIME_BASE_URL in Vercel project settings
2. Set any additional auth vars required by merged code
3. Trigger Vercel redeploy
4. Test shell routes

---

## Validation Results

### 7.1 Runtime Direct Health
**Test:** `curl https://vienna-runtime-preview.fly.dev/health`  
**Result:** ✅ PASS
- Status: healthy
- Components: state_graph healthy (SQLite), artifact_storage healthy
- Version: 1.0.0

### 7.2 Shell Proxy Routes
**Status:** ⏳ PENDING
- Requires shell environment configuration
- Will validate after Vercel redeploy

### 7.3 Browser Workspace Validation
**Status:** ⏳ PENDING
- Requires shell URL
- Will validate after Vercel redeploy

### 7.4 Authorization Behavior
**Status:** ⏳ PENDING
- Requires shell auth setup
- Will validate after Vercel redeploy

---

## Final Judgment

**Preview Deployment:** ✅ SUCCESSFUL

✅ Runtime deployed to Fly.io  
✅ All health checks passing  
✅ Persistent storage configured  
✅ Direct API endpoints responding  
⏳ Shell integration pending manual Vercel configuration

**Next Action:** Configure shell environment variables in Vercel, trigger redeploy, validate end-to-end.

---

## Code Changes During Deployment

**Files Modified:**
1. `fly.toml` — Updated app name from `vienna-runtime` to `vienna-runtime-preview`, fixed buildpack config
2. `Dockerfile` — Removed dumb-init ENTRYPOINT (Fly.io incompatible)

**Commits Needed:** Yes
- Commit message: "Stage 6: Fix Fly.io deployment — remove dumb-init, update app name"
- Affected files: Dockerfile, fly.toml

---

## Deployment Checklist

- [x] Fly CLI installed and authenticated
- [x] Deployment files verified (Dockerfile, fly.toml, .env.example, DEPLOYMENT.md)
- [x] Preview Fly app created
- [x] Persistent volume configured (10GB)
- [x] Environment secrets staged
- [x] Runtime deployed and launched
- [x] Machine healthy (all checks passing)
- [x] Direct health endpoint validated
- [ ] Shell environment variables configured
- [ ] Shell redeploy triggered
- [ ] Proxy routes validated
- [ ] Browser workspace validated
- [ ] Auth behavior validated

---

**Deployed by:** Vienna Conductor  
**Runtime:** Fly.io Machines  
**Backend:** SQLite + Filesystem  
**Status:** Live and healthy at https://vienna-runtime-preview.fly.dev
