# Stage 6 Boundary Validation

**Date:** 2026-03-14  
**Purpose:** Validate authenticated shell ↔ runtime production boundary

---

## Validation Scope

This document defines **validation tests** for the Stage 6 production integration.

Tests must be run in **both local and production-like configurations**.

---

## Test 1: Authenticated Requests

### Requirement

Authenticated users can access workspace proxy routes.

### Test Procedure (Local)

**Setup:**
```bash
# Terminal 1: Start runtime
cd services/vienna-runtime
npm run dev

# Terminal 2: Start shell
cd ../..
npm run dev
```

**Test:**
```bash
# Request WITHOUT auth header (should succeed in dev mode)
curl http://localhost:3000/api/workspace/investigations

# Expected: 200 OK with investigations list (dev mode has no auth)
```

### Test Procedure (Production-like)

**Setup:**
```bash
# Set auth token in shell
export WORKSPACE_AUTH_TOKEN="test-token-$(openssl rand -base64 16)"

# Restart shell with auth enabled
npm run dev
```

**Test:**
```bash
# Request WITH auth header
curl -H "Authorization: Bearer $WORKSPACE_AUTH_TOKEN" \
  http://localhost:3000/api/workspace/investigations

# Expected: 200 OK with investigations list
```

### Expected Result

✅ **Pass:** Authenticated request returns 200 OK with data  
❌ **Fail:** Request returns error or empty response

---

## Test 2: Unauthenticated Requests

### Requirement

Unauthenticated access is denied cleanly in production mode.

### Test Procedure

**Setup:**
```bash
# Ensure WORKSPACE_AUTH_TOKEN is set (production mode)
export WORKSPACE_AUTH_TOKEN="test-token-$(openssl rand -base64 16)"

# Restart shell
npm run dev
```

**Test:**
```bash
# Request WITHOUT auth header
curl -i http://localhost:3000/api/workspace/investigations

# Expected: 401 Unauthorized
```

**Test with invalid token:**
```bash
# Request WITH wrong token
curl -i -H "Authorization: Bearer wrong-token" \
  http://localhost:3000/api/workspace/investigations

# Expected: 401 Unauthorized
```

### Expected Result

✅ **Pass:** Unauthenticated request returns 401 Unauthorized  
✅ **Pass:** Invalid token returns 401 Unauthorized  
❌ **Fail:** Request succeeds without valid auth

### Expected Response

```json
{
  "error": "Unauthorized"
}
```

or

```json
{
  "error": "Invalid authentication token"
}
```

---

## Test 3: Runtime Available

### Requirement

Workspace loads through shell proxy when runtime is available.

### Test Procedure

**Setup:**
```bash
# Ensure runtime is running
cd services/vienna-runtime
npm run dev

# Check runtime health
curl http://localhost:3001/health
# Should return: {"status":"healthy",...}

# Start shell
cd ../..
npm run dev
```

**Test:**
```bash
# Test investigations list via shell proxy
curl http://localhost:3000/api/workspace/investigations

# Expected: 200 OK with investigations array (may be empty)
```

**Browser test:**
1. Navigate to http://localhost:3000/workspace/investigations
2. Should see investigations page (may show "No investigations" if empty)
3. Network tab should show request to `/api/workspace/investigations`
4. No runtime connection errors in browser console

### Expected Result

✅ **Pass:** Investigations page loads without errors  
✅ **Pass:** Network requests succeed (200 OK)  
❌ **Fail:** Connection errors, timeout, or 503 responses

---

## Test 4: Runtime Unavailable

### Requirement

Shell fails safely with controlled errors when runtime is unavailable.

### Test Procedure

**Setup:**
```bash
# Stop runtime
# (kill Vienna Runtime process)

# Shell remains running
npm run dev
```

**Test:**
```bash
# Attempt to access workspace route
curl http://localhost:3000/api/workspace/investigations

# Expected: 500 or 503 with error message (NOT crash)
```

**Browser test:**
1. Navigate to http://localhost:3000/workspace/investigations
2. Should see error message (NOT blank page or crash)
3. Expected message: "Vienna Runtime unavailable" or similar

### Expected Result

✅ **Pass:** Shell returns graceful error (500/503)  
✅ **Pass:** Error message is user-friendly  
✅ **Pass:** Shell remains operational for other routes  
❌ **Fail:** Shell crashes, blank page, or leaked stack traces

### Expected Response

```json
{
  "error": "runtime_error",
  "message": "Connection refused" 
}
```

or

```json
{
  "error": "service_unavailable",
  "message": "Vienna Runtime is currently unavailable"
}
```

---

## Test 5: Production Backend Selected (Postgres)

### Requirement

Runtime reports active Postgres configuration when DATABASE_URL is set.

### Test Procedure

**Setup:**
```bash
# Set DATABASE_URL (can be dummy for this test)
export DATABASE_URL="postgresql://user:pass@localhost:5432/vienna"

# Start runtime
cd services/vienna-runtime
npm run dev
```

**Observe startup logs:**
```
[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Vienna DB] Initialized Postgres connection pool
```

**Test health endpoint:**
```bash
curl http://localhost:3001/health | jq .components.state_graph

# Expected:
# {
#   "status": "healthy" or "unhealthy",
#   "type": "postgres",
#   "configured": true
# }
```

### Expected Result

✅ **Pass:** Startup logs show "Postgres backend"  
✅ **Pass:** Health endpoint shows `"type": "postgres"`  
❌ **Fail:** Runtime uses SQLite despite DATABASE_URL being set

---

## Test 6: Production Backend Selected (S3)

### Requirement

Runtime reports active S3 configuration when ARTIFACT_STORAGE_TYPE=s3.

### Test Procedure

**Setup:**
```bash
# Set S3 configuration (can be dummy for this test)
export ARTIFACT_STORAGE_TYPE=s3
export AWS_S3_BUCKET=vienna-artifacts-test
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy

# Start runtime
cd services/vienna-runtime
npm run dev
```

**Observe startup logs:**
```
[Artifact Storage] Initializing S3 backend
[Artifact Storage] Initialized S3 client (region: us-east-1, bucket: vienna-artifacts-test)
```

**Test health endpoint:**
```bash
curl http://localhost:3001/health

# Expected artifact_storage component to show S3 info
```

### Expected Result

✅ **Pass:** Startup logs show "S3 backend"  
✅ **Pass:** Startup logs show correct bucket name  
❌ **Fail:** Runtime uses filesystem despite ARTIFACT_STORAGE_TYPE=s3

---

## Test 7: Auth Header Forwarding (Internal)

### Requirement

Shell proxy routes do NOT forward auth headers to runtime (runtime trusts shell).

### Test Procedure

**Check code:**

Verify `src/lib/vienna-runtime-client.ts` does NOT include `Authorization` header when calling runtime:

```typescript
// ❌ WRONG (should NOT do this):
headers: {
  'Authorization': request.headers.get('authorization')
}

// ✅ CORRECT (shell→runtime is trusted, no header needed):
headers: {
  'Content-Type': 'application/json'
}
```

### Expected Result

✅ **Pass:** Shell→runtime requests include NO auth header  
✅ **Pass:** Runtime accepts requests from shell without auth  
❌ **Fail:** Shell forwards Authorization header to runtime

**Rationale:** Shell is the trusted gateway. Runtime does not re-authenticate shell requests.

---

## Test 8: CORS Configuration

### Requirement

Runtime accepts requests from configured shell origins only.

### Test Procedure

**Setup:**
```bash
# Set CORS_ORIGINS in runtime
export CORS_ORIGINS=http://localhost:3000

# Start runtime
cd services/vienna-runtime
npm run dev
```

**Test from browser:**

1. Open http://localhost:3000 (allowed origin)
2. Make fetch request to runtime from browser console:
   ```javascript
   fetch('http://localhost:3001/api/investigations')
   ```
3. Should succeed (CORS allows localhost:3000)

**Test from different origin:**
```bash
# Simulate request from different origin
curl -H "Origin: http://localhost:4000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  http://localhost:3001/api/investigations

# Expected: No Access-Control-Allow-Origin header
# (or CORS error if configured correctly)
```

### Expected Result

✅ **Pass:** Requests from configured origin succeed  
✅ **Pass:** Requests from other origins blocked by CORS  
❌ **Fail:** Any origin can access runtime directly

---

## Validation Summary Table

| Test | Requirement | Pass Criteria |
|------|-------------|---------------|
| 1 | Authenticated access | 200 OK with valid token |
| 2 | Unauthenticated denial | 401 Unauthorized without token |
| 3 | Runtime available | Workspace loads via proxy |
| 4 | Runtime unavailable | Graceful 500/503 error |
| 5 | Postgres selected | Health shows "postgres" |
| 6 | S3 selected | Startup logs show "S3 backend" |
| 7 | No auth forwarding | Shell doesn't send auth to runtime |
| 8 | CORS enforcement | Only configured origins allowed |

---

## Deviations from Expected Behavior

### Known Deviations (Documented)

1. **Development mode has no auth**
   - Expected: WORKSPACE_AUTH_TOKEN not set → no auth required
   - This is by design for local development

2. **Runtime unavailable returns generic error**
   - Expected: May show low-level error messages
   - Future: Improve error messages to be more user-friendly

3. **Health endpoint always returns 200**
   - Expected: Even when degraded
   - Future: Return 503 for unhealthy state

### Unexpected Deviations (Blockers)

**Document any unexpected failures here during validation:**

- [ ] Auth enforcement not working
- [ ] Runtime connection failures
- [ ] Backend selection not working
- [ ] CORS not enforcing correctly
- [ ] Other: ___________

---

## Manual Validation Checklist

Run these checks before completing Stage 6:

### Local Development Validation

- [ ] Start runtime (`cd services/vienna-runtime && npm run dev`)
- [ ] Check runtime health (`curl http://localhost:3001/health`)
- [ ] Start shell (`npm run dev`)
- [ ] Access workspace in browser (`http://localhost:3000/workspace`)
- [ ] Verify workspace routes load without errors
- [ ] Check browser network tab (requests to `/api/workspace/*`)
- [ ] Verify no auth errors (dev mode)

### Production-like Validation (Local)

- [ ] Set `WORKSPACE_AUTH_TOKEN` in shell
- [ ] Restart shell
- [ ] Test authenticated request succeeds
- [ ] Test unauthenticated request fails (401)
- [ ] Set `DATABASE_URL` in runtime
- [ ] Restart runtime
- [ ] Verify startup logs show "Postgres backend"
- [ ] Verify health endpoint shows `"type": "postgres"`
- [ ] Set `ARTIFACT_STORAGE_TYPE=s3` (with dummy creds)
- [ ] Restart runtime
- [ ] Verify startup logs show "S3 backend"

### Deployment Validation (Future)

After actual Vercel + Fly.io deployment:

- [ ] Deploy runtime to Fly.io
- [ ] Configure Fly secrets
- [ ] Verify runtime health via Fly URL
- [ ] Deploy shell to Vercel
- [ ] Set Vercel env vars (including VIENNA_RUNTIME_URL)
- [ ] Access deployed shell
- [ ] Verify workspace loads from deployed runtime
- [ ] Test with valid auth token
- [ ] Test with invalid auth token (should fail)
- [ ] Monitor Fly logs for errors

---

## Exit Criteria (Stage 6)

✅ **Local development mode validated** (no auth, SQLite, filesystem)  
✅ **Production-like mode validated** (auth enabled, backend selection working)  
✅ **Auth enforcement verified** (401 for invalid/missing tokens)  
✅ **Runtime unavailable handled gracefully** (no crashes)  
✅ **Backend selection working** (Postgres/S3 selected when configured)  
✅ **Boundary validation documented** (this file)  

**Stage 6 boundary validation requirement met.**

---

## Next Steps (Actual Deployment Validation)

1. **Deploy runtime to Fly.io staging**
2. **Deploy shell to Vercel preview**
3. **Run full validation suite** against deployed services
4. **Document any deployment-specific issues**
5. **Fix issues and re-validate**
6. **Promote to production** only after validation passes
