# Stage 6 Completion Steps

**Date:** 2026-03-21  
**Status:** Final Configuration Required  
**Current State:** Runtime deployed to Fly.io ✅ | Shell needs Vercel configuration ⏳

---

## Current Status

### ✅ Completed
- [x] Vienna Runtime deployed to Fly.io (https://vienna-runtime-preview.fly.dev)
- [x] Runtime health check passing (uptime: 6+ days)
- [x] SQLite backend operational
- [x] Filesystem artifact storage working
- [x] Code merged to `feat/vienna-stage6-production-integration` branch
- [x] All production infrastructure implemented

### ⏳ Pending
- [ ] Configure Vercel environment variables
- [ ] Trigger Vercel deployment
- [ ] Run 17 smoke tests
- [ ] Document final validation results
- [ ] Mark Stage 6 complete

---

## Step 1: Configure Vercel Environment

**Action Required:** Set environment variable in Vercel dashboard

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/maxanderson-code/regulator-ai
2. Navigate to **Settings** → **Environment Variables**
3. Add variable:
   - **Name:** `VIENNA_RUNTIME_URL`
   - **Value:** `https://vienna-runtime-preview.fly.dev`
   - **Environments:** Preview, Development
4. Click **Save**

### Option B: Via Vercel CLI

```bash
cd /home/maxlawai/regulator.ai

# Login to Vercel
vercel login

# Link project (if not already linked)
vercel link

# Set environment variable
vercel env add VIENNA_RUNTIME_URL preview
# When prompted, enter: https://vienna-runtime-preview.fly.dev

# Verify
vercel env ls
```

---

## Step 2: Trigger Vercel Deployment

### Option A: Via Git Push

```bash
cd /home/maxlawai/regulator.ai

# Create a commit to trigger deployment
git commit --allow-empty -m "chore: trigger Vercel deployment with VIENNA_RUNTIME_URL"
git push origin feat/vienna-stage6-production-integration
```

### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/maxanderson-code/regulator-ai
2. Navigate to **Deployments**
3. Find latest deployment from `feat/vienna-stage6-production-integration`
4. Click **...** → **Redeploy**
5. Select **Use existing Build Cache** (faster)
6. Click **Redeploy**

### Option C: Via Vercel CLI

```bash
cd /home/maxlawai/regulator.ai

# Deploy to preview
vercel --prod=false

# Or deploy to production (if ready)
vercel --prod
```

---

## Step 3: Validate Deployment

### 3A: Check Deployment Status

```bash
# Via CLI
vercel ls

# Look for deployment URL like:
# https://regulator-ai-git-feat-vienna-stage6-production-integration.vercel.app
```

### 3B: Test Shell Health

```bash
# Replace with your actual Vercel deployment URL
VERCEL_URL="https://regulator-ai-XXXXX.vercel.app"

# Check health
curl -i "$VERCEL_URL/api/health"

# Expected: 200 OK
```

### 3C: Test Shell → Runtime Connection

```bash
# Test workspace API (requires auth token)
curl -i "$VERCEL_URL/api/workspace/investigations"

# Expected (if auth not configured): 401 Unauthorized
# Expected (if auth configured): 200 OK with []
```

---

## Step 4: Run Smoke Tests

### Quick Validation (5 tests)

```bash
VERCEL_URL="https://regulator-ai-XXXXX.vercel.app"
RUNTIME_URL="https://vienna-runtime-preview.fly.dev"

echo "=== Test 1: Runtime Health ==="
curl -s "$RUNTIME_URL/health" | jq .

echo -e "\n=== Test 2: Shell Health ==="
curl -s "$VERCEL_URL/api/health" | jq .

echo -e "\n=== Test 3: Workspace Auth (No Token) ==="
curl -i "$VERCEL_URL/api/workspace/investigations" 2>&1 | head -1

echo -e "\n=== Test 4: Runtime State Graph ==="
curl -s "$RUNTIME_URL/api/state-graph/services" | jq .

echo -e "\n=== Test 5: CORS Headers ==="
curl -i -H "Origin: $VERCEL_URL" "$RUNTIME_URL/health" 2>&1 | grep -i "access-control"
```

### Full Test Suite (17 tests)

See `RUNBOOK_STAGE6_SMOKE_TESTS.md` for complete test suite.

**Key tests:**
1. ✅ Runtime health endpoint
2. ✅ Shell health endpoint
3. ✅ Workspace auth enforcement
4. ✅ Investigation list endpoint
5. ✅ Incident list endpoint
6. ✅ Artifact list endpoint
7. ✅ Runtime State Graph queries
8. ✅ CORS configuration
9. ✅ Error handling
10. ✅ Shell → Runtime proxy

---

## Step 5: Document Results

Create validation report:

```bash
cd /home/maxlawai/regulator.ai

cat > STAGE_6_FINAL_VALIDATION.md <<'EOF'
# Stage 6 Final Validation Report

**Date:** $(date +%Y-%m-%d)  
**Vercel URL:** [your-deployment-url]  
**Runtime URL:** https://vienna-runtime-preview.fly.dev

## Test Results

### Runtime Health
- Status: [PASS/FAIL]
- Uptime: [seconds]
- Backend: SQLite

### Shell Health
- Status: [PASS/FAIL]
- Connection to runtime: [PASS/FAIL]

### Workspace Auth
- 401 on missing token: [PASS/FAIL]
- Proxy routes protected: [PASS/FAIL]

### End-to-End Flow
- Shell → Runtime connectivity: [PASS/FAIL]
- Error handling: [PASS/FAIL]

## Issues Found
[List any issues]

## Stage 6 Status
[COMPLETE / NEEDS FIXES]

## Next Steps
[Stage 7 planning / bug fixes]
EOF

git add STAGE_6_FINAL_VALIDATION.md
git commit -m "docs(stage6): final validation report"
git push
```

---

## Step 6: Mark Stage 6 Complete

If all tests pass:

```bash
cd /home/maxlawai/regulator.ai

# Update status
echo "✅ COMPLETE — $(date +%Y-%m-%d)" >> STAGE_6_STATUS.md

git add STAGE_6_STATUS.md
git commit -m "docs(stage6): mark complete"
git push
```

---

## Troubleshooting

### Issue: Vercel can't reach Fly.io runtime

**Symptoms:**
- 502 Bad Gateway from shell
- "ECONNREFUSED" in Vercel logs

**Fixes:**
1. Verify `VIENNA_RUNTIME_URL` is set correctly in Vercel
2. Check Fly.io runtime is running: `fly status --app vienna-runtime-preview`
3. Test direct access: `curl https://vienna-runtime-preview.fly.dev/health`
4. Check Fly.io logs: `fly logs --app vienna-runtime-preview`

---

### Issue: CORS errors in browser

**Symptoms:**
- "CORS policy" errors in browser console
- Requests blocked

**Fixes:**
1. Check runtime `CORS_ORIGINS` includes Vercel URL
2. Update Fly.io secrets:
   ```bash
   fly secrets set CORS_ORIGINS="https://regulator-ai-*.vercel.app" --app vienna-runtime-preview
   ```
3. Restart runtime: `fly apps restart vienna-runtime-preview`

---

### Issue: Auth not working

**Symptoms:**
- 200 OK when expecting 401
- Token validation failing

**Fixes:**
1. Check `WORKSPACE_AUTH_TOKEN` is set in Vercel (if using auth)
2. Verify auth middleware is enabled (not dev mode)
3. Check token format: `Bearer <token>`

---

## Success Criteria

Stage 6 is complete when:

- ✅ Runtime deployed and healthy on Fly.io
- ✅ Shell deployed on Vercel with `VIENNA_RUNTIME_URL` configured
- ✅ Shell → Runtime connection working
- ✅ Auth enforced on workspace routes
- ✅ All smoke tests passing
- ✅ Validation report documented

---

## Timeline Estimate

- **Vercel configuration:** 5 minutes
- **Deployment trigger:** 2 minutes
- **Validation waiting:** 3-5 minutes (build time)
- **Smoke tests:** 10-15 minutes
- **Documentation:** 5 minutes

**Total:** 25-32 minutes

---

## Current Blockers

**None.** All infrastructure is ready. Only configuration steps remain.

**Action Required:** Operator must configure Vercel environment variable and trigger deployment.

---

## Next Stage After Completion

**Stage 7:** [Define based on project roadmap]

Possible directions:
- Enhanced observability (structured logging, APM)
- Multi-user authentication (NextAuth)
- Advanced workspace features
- Production hardening
- Performance optimization

---

## References

- `RUNBOOK_STAGE6_SMOKE_TESTS.md` — Full test suite
- `RUNBOOK_DEPLOY_RUNTIME.md` — Runtime deployment guide
- `RUNBOOK_CONFIGURE_VERCEL.md` — Shell configuration guide
- `STAGE_6_PRODUCTION_INTEGRATION_COMPLETE.md` — Code completion report
- `STAGE_6_DEPLOYMENT_EXECUTION_REPORT.md` — Deployment execution log

---

**Last Updated:** 2026-03-21  
**Status:** Awaiting Vercel configuration and final validation
