# PR #2: Productionize Vienna Runtime Integration (Stage 6)

## Summary

Productionizes the Vienna runtime integration added in PR #1.

Adds production-ready infrastructure for:
- Auth enforcement on workspace proxy routes
- Postgres-backed runtime state
- S3/object-storage artifact backend
- Container deployment configuration
- Environment hardening
- Observability baseline
- Operational runbooks

## Included

### Authentication & Security
- Bearer token auth middleware for workspace proxy routes (`/api/workspace/*`)
- 401 Unauthorized for invalid/missing tokens (when configured)
- 403 Forbidden for insufficient permissions
- Frictionless dev mode (auth disabled when `WORKSPACE_AUTH_TOKEN` not set)
- Clear upgrade path to NextAuth/Clerk

### Runtime Backend Adapters
- **Postgres adapter** for production state management (Neon-compatible)
- **SQLite adapter** for local development (zero-config)
- Automatic backend selection based on `DATABASE_URL` presence
- **S3 adapter** for production artifact storage (AWS S3, Cloudflare R2, etc.)
- **Filesystem adapter** for local/preview artifact storage

### Deployment Configuration
- Multi-stage Dockerfile (builder + production)
- Fly.io deployment configuration (`fly.toml`)
- Health check endpoint integration
- Production environment contract
- Secret management guidance
- Volume mounting for persistent data

### Observability
- Structured health endpoint (`/health`)
- Component-level health reporting (state_graph, artifact_storage)
- Backend configuration visibility
- Startup logging
- Error handling improvements

### Operational Runbooks
- `RUNBOOK_DEPLOY_RUNTIME.md` — Fly.io deployment guide
- `RUNBOOK_CONFIGURE_VERCEL.md` — Shell environment configuration
- `RUNBOOK_STAGE6_SMOKE_TESTS.md` — Post-deployment validation

## Preserved Architecture

✅ **Shell/Runtime Separation**
- Shell (`/admin` + `/workspace`) remains Next.js on Vercel
- Runtime remains separate Node.js service on Fly.io
- Browser → Shell → Runtime (no direct browser→runtime access)

✅ **Admin/Workspace Separation**
- `/admin` routes use shell database (proposals, warrants)
- `/workspace` routes proxy to Vienna Runtime
- No cross-contamination of concerns

✅ **Adapter Pattern**
- Runtime backend selected at startup (Postgres or SQLite)
- Artifact backend selected at startup (S3 or filesystem)
- Shell remains backend-agnostic (HTTP client only)

## Reviewer Focus

### 1. Auth Boundary Correctness
- Verify `requireWorkspaceAccess()` enforced on all `/api/workspace/*` routes
- Confirm dev mode frictionless (no auth when token not set)
- Confirm production mode enforces Bearer token validation

### 2. Production Backend Selection
- Verify `getDatabaseBackend()` logic in `services/vienna-runtime/src/adapters/db/client.ts`
- Verify automatic Postgres selection when `DATABASE_URL` present
- Verify automatic S3 selection when `ARTIFACT_STORAGE_TYPE=s3`

### 3. Storage Adapter Correctness
- Review Postgres migration logic in `services/vienna-runtime/src/adapters/db/postgres-client.ts`
- Review S3 integration in `services/vienna-runtime/src/adapters/artifacts/object-storage.ts`
- Verify filesystem fallback path for local/preview environments

### 4. Deployment Realism
- Review Dockerfile multi-stage build
- Review Fly.io configuration in `services/vienna-runtime/fly.toml`
- Verify environment contract matches actual code behavior
- Spot-check runbook accuracy against implementation

### 5. Docs/Runbooks Accuracy
- Verify `ENVIRONMENT_CONTRACT.md` variables match code expectations
- Verify `RUNBOOK_*.md` commands match current implementation
- Confirm no stale references to deprecated patterns

## Deferred / Future Work

- **Advanced RBAC:** Stage 6 implements simple bearer token auth. NextAuth/Clerk integration planned for Stage 7+.
- **Deeper Observability:** Structured logging, APM integration, distributed tracing planned for Stage 8+.
- **Full Artifact Serving Hardening:** Presigned URL generation, access control, bandwidth optimization deferred.
- **Advanced Watchdog Rollout:** Circuit breakers, retry policies, health-based routing deferred.

## Testing Performed

### Build Validation
- ✅ Shell builds successfully (`npm run build`)
- ✅ Runtime builds successfully (`npm run build` in `services/vienna-runtime/`)
- ✅ TypeScript compilation passes (0 errors)

### Runtime Integration
- ✅ Runtime starts with SQLite backend (local dev, zero-config)
- ✅ Runtime health endpoint operational
- ✅ Runtime serves data correctly (investigations, incidents, artifacts)

### Shell-Runtime Boundary
- ✅ Shell proxy routes operational
- ✅ Shell correctly proxies requests to runtime
- ✅ No direct browser→runtime access pattern

### Offline Behavior
- ✅ Shell handles runtime unavailable gracefully
- ✅ Returns controlled 503-like error (no stack traces)
- ✅ User-friendly error messages
- ✅ Shell remains operational when runtime offline

### Environment Contract
- ✅ All environment variables documented
- ✅ PORT references consistent (4001 throughout)
- ✅ Backend selection logic matches docs

## Primary References

- `STAGE_6_PRODUCTION_INTEGRATION_COMPLETE.md` — Complete Stage 6 delivery report
- `STAGE_6_VALIDATION.md` — Validation test results
- `WORKSPACE_AUTH_MODEL.md` — Auth boundary specification
- `ENVIRONMENT_CONTRACT.md` — Environment variable contract
- `services/vienna-runtime/DEPLOYMENT.md` — Runtime deployment guide
- `services/vienna-runtime/POSTGRES_MIGRATION_PLAN.md` — Postgres adapter design
- `services/vienna-runtime/OBJECT_STORAGE_PLAN.md` — S3 adapter design
- `services/vienna-runtime/OBSERVABILITY.md` — Observability design

## Files Changed

### Shell (Next.js)
- `.env.example` — Environment variable template
- `src/lib/auth-middleware.ts` — Auth middleware (NEW)
- `src/app/api/workspace/*/route.ts` — Auth integration

### Runtime (Node.js)
- `services/vienna-runtime/Dockerfile` — Multi-stage container build (NEW)
- `services/vienna-runtime/fly.toml` — Fly.io deployment config (NEW)
- `services/vienna-runtime/src/adapters/db/postgres-client.ts` — Postgres adapter (NEW)
- `services/vienna-runtime/src/adapters/artifacts/object-storage.ts` — S3 adapter (NEW)
- `services/vienna-runtime/src/adapters/db/client.ts` — Backend selection logic
- `services/vienna-runtime/src/routes/health.ts` — Health endpoint improvements
- `services/vienna-runtime/package.json` — Added `@types/better-sqlite3`

### Documentation
- `ENVIRONMENT_CONTRACT.md` — Environment variable contract (NEW)
- `WORKSPACE_AUTH_MODEL.md` — Auth model specification (NEW)
- `RUNBOOK_DEPLOY_RUNTIME.md` — Deployment runbook (NEW)
- `RUNBOOK_CONFIGURE_VERCEL.md` — Shell config runbook (NEW)
- `RUNBOOK_STAGE6_SMOKE_TESTS.md` — Smoke test runbook (NEW)
- `services/vienna-runtime/DEPLOYMENT.md` — Runtime deployment guide (NEW)
- `services/vienna-runtime/POSTGRES_MIGRATION_PLAN.md` — Postgres design (NEW)
- `services/vienna-runtime/OBJECT_STORAGE_PLAN.md` — S3 design (NEW)
- `services/vienna-runtime/OBSERVABILITY.md` — Observability design (NEW)

## Merge Readiness

✅ **Code Complete:** All Stage 6 objectives delivered  
✅ **Builds Passing:** Shell + Runtime builds successful  
✅ **Tests Passing:** Integration tests validated  
✅ **Docs Aligned:** Documentation matches implementation  
✅ **Runbooks Ready:** Deployment guides operational  

**Recommendation:** Ready for PR review and merge.

---

**Post-Merge Next Steps:**
1. Deploy runtime to Fly.io preview environment
2. Configure Vercel environment variables
3. Run smoke tests per `RUNBOOK_STAGE6_SMOKE_TESTS.md`
4. Validate end-to-end integration
5. Promote to production (when ready)
