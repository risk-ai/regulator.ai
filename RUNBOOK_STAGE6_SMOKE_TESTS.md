# Runbook: Stage 6 Smoke Tests

**Purpose:** Validate Stage 6 production integration foundation  
**Audience:** QA, DevOps, Platform Engineers  
**Duration:** ~30 minutes

---

## Test Environment Setup

### Local Development

**Start runtime:**
```bash
cd services/vienna-runtime
npm install
npm run dev
```

**Start shell:**
```bash
cd ../..
npm install
npm run dev
```

### Deployed (Preview or Production)

**Runtime:** `https://vienna-runtime-preview.fly.dev`  
**Shell:** `https://preview.vercel.app`

---

## Test Suite

### Test 1: Shell Auth Works (Production Mode)

**Requirement:** Workspace proxy routes enforce authentication in production mode.

**Setup:**
```bash
# Set auth token in shell environment
export WORKSPACE_AUTH_TOKEN="test-$(openssl rand -base64 16)"
```

**Test 1A: Valid Token Succeeds**

```bash
curl -i -H "Authorization: Bearer $WORKSPACE_AUTH_TOKEN" \
  http://localhost:3000/api/workspace/investigations
```

**Expected:**
```
HTTP/1.1 200 OK
Content-Type: application/json

[]
```

**✅ Pass:** 200 OK  
**❌ Fail:** 401, 403, or 500

---

**Test 1B: Invalid Token Fails**

```bash
curl -i -H "Authorization: Bearer wrong-token" \
  http://localhost:3000/api/workspace/investigations
```

**Expected:**
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Invalid authentication token"}
```

**✅ Pass:** 401 Unauthorized  
**❌ Fail:** 200 OK (security issue)

---

**Test 1C: No Token Fails (Production Mode)**

```bash
curl -i http://localhost:3000/api/workspace/investigations
```

**Expected:**
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Missing Authorization header"}
```

**✅ Pass:** 401 Unauthorized  
**❌ Fail:** 200 OK (security issue)

---

### Test 2: Workspace Loads

**Requirement:** Workspace UI loads and displays investigations list.

**Test 2A: Workspace Homepage**

**Browser test:**
1. Navigate to http://localhost:3000/workspace
2. Should see workspace landing page
3. No errors in console
4. Page renders within 2 seconds

**✅ Pass:** Page loads without errors  
**❌ Fail:** Blank page, crash, or console errors

---

**Test 2B: Investigations List**

**Browser test:**
1. Navigate to http://localhost:3000/workspace/investigations
2. Should see investigations page
3. May show "No investigations" if empty
4. Network tab shows request to `/api/workspace/investigations`

**✅ Pass:** Page loads, API request succeeds  
**❌ Fail:** Page crashes, API request fails, or CORS error

---

**Test 2C: Investigation Detail**

**Prerequisites:** At least one investigation exists in runtime

**Browser test:**
1. Click on investigation from list
2. Navigate to http://localhost:3000/workspace/investigations/{id}
3. Should show investigation detail page
4. Shows investigation name and metadata

**✅ Pass:** Detail page loads  
**❌ Fail:** 404, crash, or missing data

---

### Test 3: Incident Detail Works

**Requirement:** Incident pages load and display data.

**Test 3A: Incidents List**

**Browser test:**
1. Navigate to http://localhost:3000/workspace/incidents
2. Should see incidents page
3. May show "No incidents" if empty

**✅ Pass:** Page loads  
**❌ Fail:** Page crashes or error

---

**Test 3B: Incident Detail**

**Prerequisites:** At least one incident exists

**Browser test:**
1. Navigate to http://localhost:3000/workspace/incidents/{id}
2. Should show incident detail
3. Shows incident metadata

**✅ Pass:** Detail page loads  
**❌ Fail:** 404 or crash

---

### Test 4: Artifacts Visible

**Requirement:** Artifacts endpoint returns data.

**Test 4A: Artifacts List (API)**

```bash
curl http://localhost:3000/api/workspace/artifacts
```

**Expected:**
```json
[]
```
or
```json
[
  {
    "id": "art_001",
    "artifact_type": "trace",
    ...
  }
]
```

**✅ Pass:** 200 OK with JSON array  
**❌ Fail:** Error response

---

### Test 5: Runtime Unavailable Handled Gracefully

**Requirement:** Shell returns controlled error when runtime is down.

**Setup:**
```bash
# Stop Vienna Runtime
# (kill process or stop Fly.io app)
```

**Test 5A: API Returns Error**

```bash
curl -i http://localhost:3000/api/workspace/investigations
```

**Expected:**
```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "runtime_error",
  "message": "Connection refused"
}
```

**✅ Pass:** 500 or 503 with error message  
**❌ Fail:** Shell crashes or blank response

---

**Test 5B: UI Shows Error**

**Browser test:**
1. Navigate to http://localhost:3000/workspace/investigations
2. Should see error message (NOT blank page)
3. Error message is user-friendly

**✅ Pass:** Error message displayed  
**❌ Fail:** Blank page, crash, or leaked stack trace

---

### Test 6: Deployed Runtime Health Passes

**Requirement:** Deployed runtime responds to health checks.

**Test 6A: Health Endpoint (Local)**

```bash
curl http://localhost:4001/health
```

**Expected:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 30,
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "sqlite",
      ...
    },
    "artifact_storage": {
      "status": "healthy"
    }
  }
}
```

**✅ Pass:** 200 OK with healthy status  
**❌ Fail:** Non-200 status or unhealthy

---

**Test 6B: Health Endpoint (Deployed)**

```bash
curl https://vienna-runtime-preview.fly.dev/health
```

**Expected:** Same as Test 6A, but with appropriate backend type (postgres or sqlite)

**✅ Pass:** 200 OK with healthy status  
**❌ Fail:** Unreachable, timeout, or unhealthy

---

### Test 7: Backend Selection Working

**Requirement:** Runtime selects correct backend based on environment.

**Test 7A: SQLite Selected (No DATABASE_URL)**

**Setup:**
```bash
# Ensure DATABASE_URL is NOT set
unset DATABASE_URL
cd services/vienna-runtime
npm run dev
```

**Observe startup logs:**
```
[Vienna DB] No DATABASE_URL, using SQLite backend
[Vienna DB] Initialized SQLite database at .../data/vienna.db
```

**Check health:**
```bash
curl http://localhost:4001/health | jq .components.state_graph.type
# Expected: "sqlite"
```

**✅ Pass:** SQLite selected  
**❌ Fail:** Postgres selected or error

---

**Test 7B: Postgres Selected (DATABASE_URL Set)**

**Setup:**
```bash
# Set DATABASE_URL (can be dummy for startup test)
export DATABASE_URL="postgresql://user:pass@localhost:5432/vienna"
npm run dev
```

**Observe startup logs:**
```
[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Vienna DB] Initialized Postgres connection pool
```

**Check health:**
```bash
curl http://localhost:4001/health | jq .components.state_graph.type
# Expected: "postgres"
```

**✅ Pass:** Postgres selected  
**❌ Fail:** SQLite selected or startup error

---

**Test 7C: Filesystem Selected (No ARTIFACT_STORAGE_TYPE)**

**Setup:**
```bash
unset ARTIFACT_STORAGE_TYPE
npm run dev
```

**Observe startup logs:**
```
[Artifact Storage] Initializing filesystem backend
[Artifact Storage] Created directory: .../data/artifacts
```

**✅ Pass:** Filesystem selected  
**❌ Fail:** S3 selected

---

**Test 7D: S3 Selected (ARTIFACT_STORAGE_TYPE=s3)**

**Setup:**
```bash
export ARTIFACT_STORAGE_TYPE=s3
export AWS_S3_BUCKET=vienna-artifacts-test
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
npm run dev
```

**Observe startup logs:**
```
[Artifact Storage] Initializing S3 backend
[Artifact Storage] Initialized S3 client (region: us-east-1, bucket: vienna-artifacts-test)
```

**✅ Pass:** S3 selected  
**❌ Fail:** Filesystem selected

---

## Test Results Summary

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1A | Valid token succeeds | ☐ | |
| 1B | Invalid token fails | ☐ | |
| 1C | No token fails | ☐ | |
| 2A | Workspace homepage | ☐ | |
| 2B | Investigations list | ☐ | |
| 2C | Investigation detail | ☐ | |
| 3A | Incidents list | ☐ | |
| 3B | Incident detail | ☐ | |
| 4A | Artifacts list | ☐ | |
| 5A | Runtime down (API) | ☐ | |
| 5B | Runtime down (UI) | ☐ | |
| 6A | Health (local) | ☐ | |
| 6B | Health (deployed) | ☐ | |
| 7A | SQLite selected | ☐ | |
| 7B | Postgres selected | ☐ | |
| 7C | Filesystem selected | ☐ | |
| 7D | S3 selected | ☐ | |

---

## Known Gaps / Expected Failures

### Dev Mode Auth

**Expected behavior:** When `WORKSPACE_AUTH_TOKEN` is NOT set, auth is disabled.

This is **by design** for local development. Tests 1B and 1C will fail in dev mode (expected).

### Empty Data

If runtime has no investigations/incidents/artifacts, lists will be empty. This is **not a failure**, just empty state.

### Postgres Connection Failure

If `DATABASE_URL` is set to a non-existent database, Test 7B will show health as "unhealthy". This is **expected** if testing with dummy credentials.

---

## Blocker Criteria

**Stage 6 is blocked if ANY of these fail:**

- [ ] **Test 1A fails** (valid auth not working in production mode)
- [ ] **Test 1B passes** (invalid auth succeeds — security issue)
- [ ] **Test 2B fails** (workspace proxy not working)
- [ ] **Test 5A crashes shell** (runtime unavailable not handled)
- [ ] **Test 6A fails** (local runtime unhealthy)
- [ ] **Test 7A or 7B fails** (backend selection broken)

**All other failures are non-blocking** but should be documented and fixed before production.

---

## Post-Test Actions

### If All Tests Pass

1. Document test results
2. Mark Stage 6 validation complete
3. Proceed to Stage 6 completion report

### If Tests Fail

1. Document failures in test results table
2. Determine if blocker or known issue
3. Fix blockers before proceeding
4. Rerun tests after fixes
5. Document fixes applied

---

## Deployment-Specific Tests (After Actual Deploy)

After deploying to Vercel + Fly.io:

### Test D1: Deployed Shell Health

```bash
curl https://preview.vercel.app
# Expected: 200 OK
```

### Test D2: Deployed Runtime Health

```bash
curl https://vienna-runtime-preview.fly.dev/health
# Expected: {"status":"healthy",...}
```

### Test D3: Shell → Runtime Connection

```bash
curl https://preview.vercel.app/api/workspace/investigations
# Expected: 200 OK with data
```

### Test D4: CORS Working

**Browser test:**
1. Open https://preview.vercel.app/workspace
2. Check Network tab
3. Should see requests to runtime
4. No CORS errors in console

---

## Exit Criteria

**Stage 6 smoke tests complete when:**

✅ All blocker tests pass  
✅ Non-blocker failures documented  
✅ Test results recorded  
✅ Deployment-specific tests pass (if deployed)  

---

## Next Steps

After smoke tests complete:

1. Document results in `STAGE_6_VALIDATION.md`
2. Complete Stage 6 completion report
3. Create PR for Stage 6
4. Schedule deployment to staging/production
