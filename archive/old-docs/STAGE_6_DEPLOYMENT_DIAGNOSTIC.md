# Stage 6 Deployment Diagnostic

**Date:** 2026-03-16 17:30 EDT  
**Issue:** Shell proxy still cannot reach runtime after boundary fix and redeploy

---

## Test Results

### Runtime Health ✅
```bash
curl https://vienna-runtime-preview.fly.dev/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 104240
}
```

**Conclusion:** Runtime is healthy and responding

---

### Runtime API Direct Test ✅
```bash
curl https://vienna-runtime-preview.fly.dev/api/investigations
```

**Response:**
```json
{
  "investigations": [
    {
      "id": "inv_001",
      "name": "Trading Gateway Timeout Investigation",
      ...
    }
  ]
}
```

**Conclusion:** Runtime API endpoints working correctly

---

### Shell Proxy Test ❌
```bash
curl https://regulator-ai.vercel.app/api/workspace/investigations
```

**Response:**
```json
{
  "error": "runtime_error",
  "message": "Vienna Runtime is currently unavailable. The runtime service may be offline or unreachable."
}
```

**Status:** 503 Service Unavailable

**Conclusion:** Shell proxy cannot reach runtime

---

## Root Cause Analysis

### Code Review

**Shell runtime client:**
```typescript
// src/lib/vienna-runtime-client.ts:7
const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';
```

**Expected behavior:**
- If `VIENNA_RUNTIME_URL` is set → Use that value
- If not set → Fall back to `http://localhost:3001`

**Current behavior:** Getting "runtime unavailable" error suggests the client is trying to connect to `http://localhost:3001` (which doesn't exist in Vercel serverless environment)

---

## Diagnosis

**Most likely cause:** `VIENNA_RUNTIME_URL` environment variable is **not set** or **not visible** to the Vercel deployment.

**Why this happens:**
1. Environment variable added but deployment not rebuilt
2. Environment variable set for wrong environment (dev/preview/production mismatch)
3. Environment variable name typo
4. Variable set but Next.js not picking it up (needs `NEXT_PUBLIC_` prefix for client-side or specific server config)

---

## Verification Steps Needed

### 1. Check Vercel Environment Variable

Go to Vercel dashboard:
1. Open `regulator-ai` project
2. Settings → Environment Variables
3. Verify `VIENNA_RUNTIME_URL` exists
4. Check which environments it's enabled for (Production / Preview / Development)
5. Verify the value is `https://vienna-runtime-preview.fly.dev`

### 2. Check Current Deployment Environment

The deployment URL `regulator-ai.vercel.app` suggests this is the **Production** deployment.

Verify:
- Is the environment variable enabled for **Production**?
- Was the deployment redeployed AFTER the variable was added?

### 3. Next.js Environment Variable Scope

Next.js environment variables have different scopes:
- `NEXT_PUBLIC_*` → Available in browser (client-side)
- Regular env vars → Only available in server-side code

**Current usage:**
```typescript
const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL
```

This is correct for **server-side** API routes (which is what we're using).

However, the workspace pages are also server components that fetch at build/runtime, and they might need different configuration.

---

## Recommended Fix

### Option 1: Verify and Redeploy (Recommended)

1. **Verify environment variable in Vercel:**
   - Name: `VIENNA_RUNTIME_URL`
   - Value: `https://vienna-runtime-preview.fly.dev`
   - Enabled for: **Production** ✓

2. **If variable exists, trigger clean rebuild:**
   - Go to Deployments
   - Click **Redeploy** (not just restart)
   - Ensure it's rebuilding from scratch

3. **If variable doesn't exist or is wrong:**
   - Add/update the variable
   - Set for Production environment
   - Save
   - Trigger redeploy

### Option 2: Add Next.js Config (Alternative)

If the environment variable isn't being picked up, add explicit config:

```javascript
// next.config.js or next.config.mjs
export default {
  env: {
    VIENNA_RUNTIME_URL: process.env.VIENNA_RUNTIME_URL,
  },
}
```

But this should not be necessary for server-side code.

---

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Runtime health | ✅ PASS | Healthy, responding correctly |
| Runtime API | ✅ PASS | All endpoints working |
| Shell environment variable | ❌ UNKNOWN | Cannot verify from outside Vercel |
| Shell proxy routes | ❌ FAIL | Returning 503 "runtime unavailable" |
| Boundary fix deployed | ✅ PASS | Commit 0dd992f pushed |

---

## Next Steps

**Operator must:**

1. **Verify Vercel environment variable**
   - Go to https://vercel.com/dashboard
   - Open `regulator-ai` (under risk-ai org)
   - Settings → Environment Variables
   - Check `VIENNA_RUNTIME_URL` exists and is correct
   - Verify it's enabled for **Production**

2. **Screenshot the environment variable settings** (if possible) so I can confirm the configuration

3. **Trigger a clean redeploy** after verifying/fixing the variable

---

**Blocked on:** Vercel environment variable verification and clean redeploy
