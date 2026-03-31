# Vienna Console Deployment Plan

**Date:** 2026-03-23  
**Milestone:** Workspace integration complete, ready for production deployment

---

## Completed: Workspace Integration

✅ `services/vienna-lib` is now a proper monorepo package  
✅ `apps/console/server` boots successfully against `@vienna/lib`  
✅ Health endpoint operational  
✅ Auth endpoint operational  
✅ Intent endpoint operational (control plane operations)  
✅ State Graph initialized  
✅ Workspace Manager operational  

**Validation:** See `LOCAL_VALIDATION_RESULTS.md`

---

## Next: Deploy Real Backend to Fly

### 1. Build Console Server

```bash
cd apps/console/server
npm run build
```

**Expected output:** `dist/server.js` (transpiled TypeScript)

**Known issues:** TypeScript compilation has type errors but does not block runtime

---

### 2. Prepare Fly Deployment

**Source:** `apps/console/server/`  
**Entry point:** `dist/server.js` (after build)  
**Required env vars:**
- `VIENNA_OPERATOR_PASSWORD` (required)
- `VIENNA_SESSION_SECRET` (required in production)
- `NODE_ENV=production`
- `PORT` (provided by Fly)

**Dependencies:**  
`@vienna/lib` must be available during build and runtime.

**Options:**

#### Option A: Deploy from monorepo root
- Deploy entire monorepo
- Fly buildpack resolves workspace dependencies
- Start command: `cd apps/console/server && npm start`

#### Option B: Bundle console server
- Build standalone bundle with workspace deps
- Deploy `apps/console/server` only
- Requires bundler (esbuild/webpack) to inline `@vienna/lib`

**Recommendation:** Option A (simpler, preserves workspace structure)

---

### 3. Update Fly Configuration

**File:** `fly.toml` (create at monorepo root or `apps/console/server/`)

**Example (monorepo root):**
```toml
app = "vienna-console"
primary_region = "iad"

[build]
  dockerfile = "apps/console/server/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[http_service]
  internal_port = 8080
  force_https = true
```

**Secrets (set via `fly secrets`):**
```bash
fly secrets set VIENNA_OPERATOR_PASSWORD=<secure_password>
fly secrets set VIENNA_SESSION_SECRET=$(openssl rand -hex 32)
```

---

### 4. Create Dockerfile

**File:** `apps/console/server/Dockerfile`

```dockerfile
FROM node:22-alpine

# Install workspace at root
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/vienna-lib ./services/vienna-lib
COPY apps/console/server ./apps/console/server

# Install dependencies (workspace-aware)
RUN npm install

# Build console server
WORKDIR /app/apps/console/server
RUN npm run build

# Runtime
EXPOSE 8080
CMD ["npm", "start"]
```

---

### 5. Deploy

```bash
cd /home/maxlawai/.openclaw/workspace/regulator-ai-repo
fly deploy
```

**Validation:**
- Health endpoint: `https://vienna-os.fly.dev/health`
- Expected: `{"success":true,"data":{"runtime":{"status":"healthy",...}}}`

---

### 6. Point Console Frontend at Real Backend

**File:** `apps/console/client/.env.production`

**Current (minimal runtime):**
```
VITE_API_BASE_URL=https://vienna-os.fly.dev
```

**Update if backend URL changes:**
```
VITE_API_BASE_URL=https://console-backend.regulator.ai
```

**Verify:**
- Check `apps/console/client/src/api/index.ts` for API base URL
- Ensure no hardcoded proxy assumptions
- Confirm `console.regulator.ai` is using production backend

---

### 7. Validate Live Browser Behavior

From `https://console.regulator.ai`:

#### Test 1: Health Check
- Visit console UI
- Check browser console for API requests
- Verify `/health` endpoint called
- Confirm no CORS errors

#### Test 2: Authentication
- Login with operator password
- Verify session cookie set
- Confirm authenticated requests work

#### Test 3: Control Plane Operation
- Execute safe mode toggle (or other control operation)
- Verify request/response structure
- Check for `tenant_id`, `explanation`, `simulation` fields

#### Test 4: (Future) Governed Execution
- Execute restore_objective or investigate_objective
- Verify `execution_id`, `attestation`, `cost`, `quota_state` present
- Check State Graph for persistence

---

## Current Deployment Status

**Minimal runtime:** ✅ Live at `https://vienna-os.fly.dev`  
**Real backend:** ⏸️ Not yet deployed  
**Console frontend:** ✅ Live at `https://console.regulator.ai`  
**Frontend → Backend:** ⚠️ Unknown (verify what console is calling)

---

## Deployment Validation Checklist

**Before closing Phase 21-30:**

- [ ] Real backend deployed to Fly
- [ ] Health endpoint responds
- [ ] Intent endpoint operational
- [ ] Console UI connects to real backend (not minimal runtime)
- [ ] Browser validation: health check works
- [ ] Browser validation: auth works
- [ ] Browser validation: control plane operations work
- [ ] State Graph persistence confirmed (tenant attribution)
- [ ] No CORS errors
- [ ] No stale proxy assumptions

**After validation:**

- [ ] Test governed execution (restore/investigate objectives)
- [ ] Verify quota/budget/attestation/cost in real execution
- [ ] Check State Graph for execution records
- [ ] Validate tenant isolation
- [ ] Confirm no cross-tenant leakage

---

## Honest Phase Closure Criteria

**Phase 21 (Tenant Identity):**
- [ ] Tenant extracted from session
- [ ] Tenant present in API responses
- [ ] Tenant persisted in State Graph
- [ ] Tenant isolation validated

**Phase 22 (Quota System):**
- [ ] Quota check in execution path
- [ ] Quota denial blocks execution
- [ ] Quota state in API response
- [ ] Quota validated in production

**Phase 23 (Attestation):**
- [ ] Attestation generated for executions
- [ ] Attestation linked to execution_id
- [ ] Attestation in API response
- [ ] Attestation in State Graph

**Phase 24 (Simulation):**
- [ ] Simulation mode works
- [ ] No side effects in simulation
- [ ] Simulation badge in UI
- [ ] No cost/attestation for simulation

**Phase 27 (Explainability):**
- [ ] Explanation in API responses
- [ ] Explanation varies by outcome (success/failure/blocked)
- [ ] Explanation visible in UI

**Phase 29 (Resource Accounting):**
- [ ] Cost calculated for executions
- [ ] Cost persisted in State Graph
- [ ] Cost attributed to tenant
- [ ] Cost in API response

---

## Next Actions

1. Create Dockerfile for console server
2. Update fly.toml (or create if missing)
3. Set production secrets
4. Deploy to Fly
5. Verify health endpoint
6. Point console frontend at real backend
7. Run browser validation matrix
8. Validate State Graph persistence
9. Document findings
10. Close phases honestly based on live proof

---

**Current blocker:** NONE  
**Deployment readiness:** ✅ READY
