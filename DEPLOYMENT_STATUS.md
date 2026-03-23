# Vienna OS Deployment Status

**Date:** 2026-03-23  
**Status:** Monorepo Consolidation Complete, Minimal Runtime Deployed

---

## ✅ Completed

### 1. Repository Consolidation
- Merged PR #5 to `main`
- Removed ALL duplicate `vienna-core/` and `services/vienna-runtime/` trees
- Single source of truth in `regulator-ai-repo/`

### 2. Clean Monorepo Structure
```
apps/
  marketing/         ✅ NextJS (builds cleanly)
  console/
    client/          ✅ Vite (builds cleanly)
    server/          ⚠️  Has broken imports (requires refactor)
services/
  runtime/           ✅ Minimal health-check service (operational)
```

### 3. Deployments

#### Fly.io Runtime
- **URL:** https://vienna-os.fly.dev
- **Status:** ✅ Operational
- **Service:** Minimal Express health-check
- **Endpoints:**
  - `/health` → 200 OK
  - `/api/v1/health` → 200 OK

#### Vercel Projects
- **Marketing:** `regulator.ai` (deployed from `apps/marketing`)
- **Console:** `console.regulator.ai` (needs root directory update)

---

## ⏭️ Next Steps

### 1. Configure Vercel Root Directories

**Marketing Project:**
```
Root Directory = apps/marketing
```

**Console Project:**
```
Root Directory = apps/console/client
```

### 2. Redeploy Both Vercel Projects

After setting root directories, trigger redeployment.

### 3. Validate Domain Separation

- `regulator.ai` → Marketing only
- `console.regulator.ai` → Console UI only
- No content crossover

### 4. Runtime Integration (Deferred)

**Blocker:** Console server has broken imports:
```typescript
// apps/console/server/src/server.ts
const ViennaCore = (await import('../../../index.js')).default;
```

This expects to run inside old `vienna-core/` structure.

**Options:**
1. Refactor console server imports to work standalone
2. Build full Phase 21-30 runtime in `services/runtime`
3. Deploy console as static-only (no backend)

**Current:** Minimal runtime provides health checks only.

---

## Phase Status Classification

**Deferred until console/runtime integration complete:**
- Phase 21 (Tenant Isolation)
- Phase 22 (Quota Enforcement)
- Phase 23 (Attestation)
- Phase 24 (Simulation Mode)
- Phase 27 (Explainability)
- Phase 28 (Integration)
- Phase 29 (Cost Tracking)

**Current State:** Infrastructure topology clean, runtime operational but minimal functionality.

---

## Verification Commands

```bash
# Runtime health
curl https://vienna-os.fly.dev/api/v1/health

# Marketing build
cd apps/marketing && npm run build

# Console client build
cd apps/console/client && npm run build

# Check deployments
gh pr list
git log --oneline -5
```

---

## Clean State Achieved

- ✅ No duplicate repos
- ✅ No stale `vienna-core/` or `services/vienna-runtime/`
- ✅ Single `.git` at repo root
- ✅ Builds pass for marketing + console client
- ✅ Runtime deployed to Fly.io
- ✅ All changes committed to `main`

**Repository:** https://github.com/risk-ai/regulator.ai  
**Branch:** `main`  
**Last Commit:** cf61a9f
