# Stage 6 Deployment Validation Report

**Date:** 2026-03-16 16:55 EDT  
**Objective:** Validate existing regulator.ai + Vienna Runtime integration

---

## Realignment Summary

**Error identified:** Previous session went off-plan and created:
- Unrelated repository: `MaxAnderson-code/vienna-os`
- Deployment configs for `vienna-core` (wrong system)

**Correct system:**
- Repository: `github.com/risk-ai/regulator.ai`
- Runtime: `services/vienna-runtime`
- Deployed runtime: `https://vienna-runtime-preview.fly.dev`
- Deployed shell: `https://regulator-ai.vercel.app`

---

## Validation Results

### ✅ Step 1: Repository Verification

**Status:** PASS

```bash
cd ~/regulator.ai
git remote -v
```

**Result:**
```
origin https://github.com/risk-ai/regulator.ai.git (fetch)
origin https://github.com/risk-ai/regulator.ai.git (push)
```

**Conclusion:** Correct repository confirmed

---

### ✅ Step 2: Runtime Directory Structure

**Status:** PASS

```bash
ls -la services/vienna-runtime
```

**Result:**
- Runtime exists at correct path
- Contains Dockerfile, fly.toml
- Has deployment documentation
- Contains src/ directory with routes

**Conclusion:** Runtime structure intact

---

### ✅ Step 3: Runtime Health Check

**Status:** PASS

```bash
curl https://vienna-runtime-preview.fly.dev/health
```

**Result:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 102785,
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

**Conclusion:**
- Runtime is healthy
- Uptime: ~28.5 hours (no crashes)
- State Graph: Operational
- Artifact storage: Configured

---

### ❌ Step 4: Shell Environment Variable

**Status:** FAIL

**Expected variable:**
```
VIENNA_RUNTIME_URL=https://vienna-runtime-preview.fly.dev
```

**Actual variable:**
```typescript
// src/lib/vienna-runtime-client.ts
const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';
```

**Issue:** Environment variable not set in Vercel deployment

**Evidence:**
```bash
curl https://regulator-ai.vercel.app/api/workspace/investigations
```

**Result:**
```json
{
  "error": "runtime_error",
  "message": "Vienna Runtime is currently unavailable. The runtime service may be offline or unreachable."
}
```

**Root cause:** Client is attempting to connect to `http://localhost:3001` (default) instead of production runtime

---

### ❌ Step 5: Shell Proxy Routes

**Status:** FAIL (due to missing environment variable)

**Test:**
```bash
curl https://regulator-ai.vercel.app/api/workspace/investigations
```

**Result:** 500 error (runtime unavailable)

**Reason:** Proxy routes exist and are correctly implemented, but cannot reach runtime due to missing `VIENNA_RUNTIME_URL` environment variable

---

### ⏸️ Step 6: Browser Workspace Validation

**Status:** NOT TESTED (blocked by Step 4 failure)

Cannot validate browser workspace until environment variable is configured.

---

## Issue Analysis

### Root Cause

The Vercel deployment is missing the critical environment variable:

```
VIENNA_RUNTIME_URL=https://vienna-runtime-preview.fly.dev
```

Without this variable, the shell defaults to `http://localhost:3001`, which:
- Does not exist in Vercel serverless environment
- Cannot reach the deployed Fly.io runtime
- Causes all workspace API routes to fail

### Code Evidence

**Client configuration:**
```typescript
// src/lib/vienna-runtime-client.ts
const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';
```

**Proxy route:**
```typescript
// src/app/api/workspace/investigations/route.ts
export async function GET(request: NextRequest) {
  const authResult = requireWorkspaceAccess(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  try {
    const data = await investigations.list({ status, limit });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'runtime_error', message },
      { status: 500 }
    );
  }
}
```

The code is correct - it just needs the environment variable.

---

## Required Operator Action

**The operator must configure the Vercel environment variable:**

### Option 1: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select `regulator-ai` project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name:** `VIENNA_RUNTIME_URL`
   - **Value:** `https://vienna-runtime-preview.fly.dev`
   - **Environments:** Production, Preview, Development
5. Redeploy: Settings → Deployments → Redeploy latest

### Option 2: Via Vercel CLI (if authenticated)

```bash
cd ~/regulator.ai
vercel login
vercel env add VIENNA_RUNTIME_URL
# Enter: https://vienna-runtime-preview.fly.dev
# Select: Production, Preview, Development
vercel --prod
```

---

## Unable to Complete

**Reason:** Vercel CLI requires authentication

```bash
vercel env ls
```

**Error:**
```
Error: No existing credentials found. Please run `vercel login`
```

**Operator must:**
1. Authenticate Vercel CLI, OR
2. Configure environment variable via dashboard

I cannot proceed with Vercel configuration without operator authentication.

---

## Summary

### Status Report

| Component | Status | Details |
|-----------|--------|---------|
| Runtime deployment | ✅ PASS | Healthy at https://vienna-runtime-preview.fly.dev |
| Shell configuration | ❌ FAIL | Missing `VIENNA_RUNTIME_URL` environment variable |
| Runtime health | ✅ PASS | Uptime 28.5 hours, all components healthy |
| Shell proxy routes | ❌ FAIL | Code correct, blocked by missing env var |
| Browser workspace | ⏸️ BLOCKED | Cannot test until env var configured |
| Auth behavior | ⏸️ BLOCKED | Cannot test until env var configured |

### URLs

- **Runtime:** https://vienna-runtime-preview.fly.dev
- **Shell:** https://regulator-ai.vercel.app
- **Workspace (not working):** https://regulator-ai.vercel.app/workspace

### Issues Encountered

1. **Critical:** `VIENNA_RUNTIME_URL` environment variable not set in Vercel
2. **Blocker:** Cannot configure Vercel without CLI authentication
3. **Previous session error:** Created wrong repository (`vienna-os`), now abandoned

---

## Next Steps

**Immediate (operator action required):**
1. Configure `VIENNA_RUNTIME_URL=https://vienna-runtime-preview.fly.dev` in Vercel
2. Redeploy shell or wait for automatic deployment

**After environment variable is set:**
1. Retest proxy routes
2. Browser workspace validation
3. Auth validation
4. Complete Stage 6 validation report

**Do NOT proceed to Stage 7 until Stage 6 validation passes.**

---

## Realignment Complete

✅ Correct repository identified: `github.com/risk-ai/regulator.ai`  
✅ Runtime health confirmed: Healthy  
❌ Shell integration blocked: Missing environment variable  
⏸️ Operator action required: Configure Vercel environment  

**Stopped. Awaiting operator configuration of Vercel environment variable.**
