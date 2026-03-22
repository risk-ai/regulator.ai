# Fly.io Deployment Investigation Report

**Date:** 2026-03-22  
**Investigator:** Vienna (Conductor)  
**Scope:** Verify Fly.io deployment correctness and production readiness

---

## Executive Summary

**Status:** ❌ **DEPLOYMENT MISMATCH DETECTED**

Fly.io is deploying the correct source from `risk-ai/regulator.ai/services/vienna-runtime`, BUT:

1. **Two different Fly apps exist with different code versions**
2. **Vercel is pointing to the WRONG Fly app**
3. **Production frontend cannot reach the correct backend**
4. **No production credentials configured on backend**

---

## 1. Deployment Source Verification ✅ CORRECT

### Fly App Configuration

**App name:** `vienna-os`  
**Repository:** `risk-ai/regulator.ai` ✅  
**Path:** `services/vienna-runtime/` ✅  
**Dockerfile:** `fly.Dockerfile` ✅  
**Latest commit:** `d0bf90d` (2026-03-22, Vienna OS Phases 1-20)

**Verification:**
```bash
# Repository confirmed
cd regulator.ai/services/vienna-runtime
cat fly.toml
# app = 'vienna-os'
# dockerfile = "fly.Dockerfile"
```

**Conclusion:** ✅ Fly configuration points to correct business repository path.

---

## 2. Runtime Identity Verification ✅ CORRECT CODE, ❌ WRONG APP

### vienna-os.fly.dev (Production Backend)

**Health check:** ✅ HEALTHY  
**Uptime:** 868 seconds  
**Version:** vienna-os@2.0.0  
**Code base:** Vienna OS Phases 1-20 (correct)

**Runtime modules confirmed:**
```
lib/core/
  - approval-manager.js ✅
  - chat-action-bridge.js ✅
  - plan-execution-engine.js ✅
  - verification-engine.js ✅
  - policy-schema.js ✅
  - objective-coordinator.js ✅
```

**API routes confirmed:**
```
/health ✅
/api/v1/system/providers ✅
/api/v1/auth/session ✅
/api/v1/auth/login ✅
/api/v1/reconciliation/status ✅ (auth required)
/api/v1/objectives ✅ (auth required)
```

**Conclusion:** ✅ Runtime identity is correct Vienna Core with all Phase 1-20 components.

### vienna-runtime-preview.fly.dev (Old/Stale Backend)

**Health check:** ✅ HEALTHY  
**Uptime:** 620,009 seconds (7+ days old)  
**Version:** 1.0.0 (OLD)  
**Code base:** Pre-Phases architecture (STALE)

**API differences:**
```
/health ✅ (different schema)
/api/v1/system/providers ❌ NOT FOUND
/api/investigations ❌ NOT FOUND (old path)
```

**Conclusion:** ❌ This is an OLD deployment from a previous iteration.

---

## 3. Backend Health Beyond /health ⚠️ PARTIALLY HEALTHY

### vienna-os.fly.dev Status

**✅ Healthy components:**
- State Graph initialized (SQLite)
- Provider health checker running
- Anthropic provider: healthy (522ms latency)
- Auth service initialized
- Chat service ready
- Governance pipeline loaded

**❌ Missing components:**
- **No operator password configured** (VIENNA_OPERATOR_PASSWORD unset)
- **No session secret configured** (using ephemeral random secret)
- Local Ollama provider: unavailable (12 consecutive failures, cooldown active)

**⚠️ Critical issue:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/auth/login \
  -d '{"password":"test"}'

# Response: Invalid credentials

# Auth service expects:
# VIENNA_OPERATOR_PASSWORD (env var)
# But Fly secrets not configured
```

**Conclusion:** Backend is structurally correct but **uncredentialed** (cannot authenticate operators).

---

## 4. Frontend-Backend Connectivity ❌ MISMATCH

### Vercel Production Environment

**Domain:** https://regulator.ai  
**Vercel project:** `ai-ventures-portfolio/regulator-ai` ✅  
**Repository:** `risk-ai/regulator.ai` ✅  

**Environment variable inspection:**
```bash
vercel env pull .env.vercel

VIENNA_RUNTIME_URL="https://vienna-runtime-preview.fly.dev"
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                     WRONG APP (old/stale backend)
```

**Actual backend location:** `https://vienna-os.fly.dev`

**Impact:**
- Frontend tries to call `vienna-runtime-preview.fly.dev/api/investigations` → 404
- Correct backend at `vienna-os.fly.dev/api/v1/...` never receives requests
- Workspace pages fail to load data
- Operator cannot authenticate

**Conclusion:** ❌ Production frontend is wired to the WRONG Fly app.

---

## 5. End-to-End Production Validation ❌ NOT OPERATIONAL

### Test 1: Operator Login
```bash
# Frontend: https://regulator.ai
# Expected: Login form → backend auth

Status: ❌ BROKEN
Reason: Frontend calls wrong backend + No credentials configured
```

### Test 2: Chat Flow
```bash
# Frontend: Chat panel
# Expected: Governed execution through Vienna Core

Status: ❌ CANNOT TEST
Reason: Cannot authenticate, frontend mismatch
```

### Test 3: Governed Execution Path
```bash
# Expected: Intent → Plan → Policy → Approval → Execution → Verification → Ledger

Status: ❌ CANNOT TEST
Reason: No operator session, frontend disconnected
```

**Conclusion:** ❌ Production is NOT operational end-to-end.

---

## 6. Fixes Required

### Fix 1: Update Vercel Environment Variable ⚠️ CRITICAL

**Action:**
```bash
cd regulator.ai
vercel env rm VIENNA_RUNTIME_URL production
vercel env add VIENNA_RUNTIME_URL production
# Enter: https://vienna-os.fly.dev
```

**Impact:** Connects production frontend to correct backend.

### Fix 2: Configure Fly Secrets ⚠️ CRITICAL

**Action:**
```bash
flyctl secrets set \
  VIENNA_OPERATOR_PASSWORD="<secure-password>" \
  VIENNA_SESSION_SECRET="<random-32-byte-hex>" \
  --app vienna-os
```

**Impact:** Enables operator authentication.

### Fix 3: Update CORS Configuration

**Action:**
Edit `regulator.ai/services/vienna-runtime/fly.toml`:
```toml
[env]
  CORS_ORIGIN = 'https://vienna-os.fly.dev,https://regulator.ai'
                                              ^^^^^^^^^^^^^^^^^^^
                                              Add production domain
```

**Deploy:**
```bash
cd regulator.ai/services/vienna-runtime
flyctl deploy --app vienna-os
```

**Impact:** Allows production frontend to call backend API.

### Fix 4: Decommission Stale App (Optional)

**Action:**
```bash
flyctl apps destroy vienna-runtime-preview
```

**Impact:** Prevents confusion, saves resources.

---

## 7. Final Status Summary

### What Was Validated

✅ **Repository ownership:** Correct (`risk-ai/regulator.ai`)  
✅ **Deployment source:** Correct (`services/vienna-runtime/`)  
✅ **Runtime identity:** Correct (Vienna Core Phases 1-20)  
✅ **Backend modules:** All Phase components present  
✅ **Backend health:** Runtime structurally correct  

### What Was Broken

❌ **Frontend wired to wrong backend app** (`vienna-runtime-preview` instead of `vienna-os`)  
❌ **No operator credentials configured** (cannot authenticate)  
❌ **CORS not updated for production domain**  
❌ **Stale Fly app still running** (confusing, resource waste)

### What Was Fixed

⏳ **Pending fixes (require manual action):**
1. Update Vercel `VIENNA_RUNTIME_URL` to `https://vienna-os.fly.dev`
2. Set Fly secrets (`VIENNA_OPERATOR_PASSWORD`, `VIENNA_SESSION_SECRET`)
3. Update CORS in `fly.toml` to include `https://regulator.ai`
4. Redeploy backend with CORS fix
5. Optionally destroy stale `vienna-runtime-preview` app

### Is Production Genuinely Operational End-to-End?

**Answer:** ❌ **NO**

**Reasons:**
1. Frontend cannot reach correct backend (wrong URL)
2. Backend cannot authenticate operators (no credentials)
3. CORS would block cross-origin requests even if fixed
4. No end-to-end flow has been validated

**After fixes applied:**
- Operator login → should work
- Chat flow → should work
- Governed execution → should work
- Full Intent → Ledger pipeline → should work

---

## Recommendation

**Priority:** P0 (Production Broken)

**Action plan:**
1. ✅ Investigation complete (this report)
2. ⏳ Apply Fix 1 (Vercel env var) — 2 minutes
3. ⏳ Apply Fix 2 (Fly secrets) — 2 minutes
4. ⏳ Apply Fix 3 (CORS + redeploy) — 5 minutes
5. ⏳ Validate end-to-end — 10 minutes
6. ⏳ Apply Fix 4 (destroy stale app) — 1 minute

**Total time:** ~20 minutes to fully operational production.

---

## Conclusion

Fly.io **IS** deploying from the correct business repository (`risk-ai/regulator.ai/services/vienna-runtime`), and the deployed code **IS** the correct Vienna OS runtime with all Phase 1-20 components.

However, production is **NOT** operational because:
1. The frontend is pointing to the wrong backend
2. The backend has no authentication credentials
3. CORS is not configured for the production domain

These are **configuration issues**, not deployment source issues.

The investigation reveals a **classic infra mismatch:** right code, wrong wiring.

**Status:** Investigation complete. Fixes identified. Execution pending manual approval.
