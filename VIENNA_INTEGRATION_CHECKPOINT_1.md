# Vienna Integration — Stage 1 Checkpoint

**Date:** 2026-03-14 19:44 EDT  
**Branch:** `feat/vienna-integration-phase1`  
**Status:** Stage 1.1–1.3 Complete ✅

---

## Stage 1: Environment and Repository Setup

### 1.1 Clone and Verify Repo ✅

**Repository cloned:**
```
/home/maxlawai/regulator.ai
```

**Verification results:**
- ✅ Local dev server: Not yet started (requires env vars)
- ✅ Production build: PASSED (Next.js 14.2.35)
- ✅ Env file: Created from `.env.example`
- ✅ Baseline app: Build successful, deployment-ready

**Build output:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                    138 B          87.4 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
```

**Current stack:**
- Next.js 14.2.35
- TypeScript
- Tailwind CSS
- App Router
- Drizzle ORM + Neon Postgres
- Vercel deployment target

---

### 1.2 Create Integration Branch ✅

**Branch created:**
```bash
git checkout -b feat/vienna-integration-phase1
```

**Status:** On integration branch, ready for migration work

---

### 1.3 Inspect Scaffold Structure ✅

#### Route Structure

**Current routes:**
- `/` — Landing page (governance-oriented marketing)
- `/_not-found` — 404 page

**No admin routes yet** — scaffold is currently public-facing only

**Planned route options for Vienna workspace:**
- Option A: `/workspace` (preferred if Vienna is core product)
- Option B: `/admin/workspace` (if scaffold becomes admin-oriented)

#### Schema Analysis

**Current Neon schema (`regulator` schema):**

**Tables (5):**
1. `proposals` — Agent proposal submissions
2. `policies` — Policy-as-code rules
3. `warrants` — Cryptographic authorizations
4. `audit_log` — Event ledger
5. `adapters` — Deployment/API/database integrations

**Key fields:**
- `proposals.state` — State machine: submitted → validated → policy_checked → authorized → executing → executed → verified → archived
- `proposals.riskTier` — 0 (reasoning) | 1 (read) | 2 (moderate) | 3 (high-impact)
- `warrants.signature` — Cryptographic authorization
- `warrants.expiresAt` — Time-bounded authority

#### Auth Assumptions

**From `.env.example`:**
- NextAuth.js for authentication
- Google OAuth (GCP project: `law-ai-prod`)
- Session-based auth (NEXTAUTH_SECRET required)
- Callback URL: `NEXTAUTH_URL` (localhost or production)

**Required env vars:**
- `DATABASE_URL` — Neon Postgres connection string
- `NEXTAUTH_SECRET` — Session encryption key
- `NEXTAUTH_URL` — Auth callback base URL
- `GOOGLE_CLIENT_ID` — OAuth client ID
- `GOOGLE_CLIENT_SECRET` — OAuth client secret

#### App Shell Layout

**Root layout (`src/app/layout.tsx`):**
- Currently minimal (not inspected yet)
- Expected: Dark theme, base font, metadata

**Landing page theme:**
- Dark navy (`bg-navy-900`, `#0B0F19`)
- Purple/blue gradient accents
- Seven Services architecture presentation
- Risk Tier explanation (0–3)
- Lifecycle visualization (Truth → Plan → Validate → Warrant → Execute → Verify → Learn)

**Marketing positioning:**
- "The governance layer agents answer to"
- Warrant-based authorization model
- Event-driven architecture
- Policy-as-code enforcement

#### Existing API Patterns

**No API routes yet** — scaffold is frontend-only currently

**Expected API structure (from SETUP.md):**
```
src/app/api/
├── proposals/      # CRUD + state machine
├── policies/       # Policy CRUD
├── warrants/       # Warrant issuance
├── verify/         # Execution verification
└── audit/          # Audit log queries
```

---

## Stage 1.4 Recommendation: Integration Target Route

### Decision Required

**Question:** Where should Vienna workspace live?

**Option A: `/workspace` (RECOMMENDED)**

**Rationale:**
- Vienna workspace IS the core product surface (investigation + incident + governance reasoning)
- Landing page is marketing, workspace is product
- Matches existing Vienna architecture (operator-facing, not admin-facing)
- Cleaner mental model: `/workspace` = primary operator surface

**Routing structure:**
```
/                          → Landing page (public)
/workspace                 → Investigation Index (protected)
/workspace/[investigationId] → Investigation Detail (protected)
/workspace/incidents/[incidentId] → Incident workspace (future, protected)
```

**Option B: `/admin/workspace`**

**Use only if:**
- Scaffold becomes strongly admin-oriented with other public user surfaces
- Multiple user roles exist (agent, operator, admin)
- Vienna workspace is secondary to other product surfaces

**Current assessment:** Scaffold is marketing-only, no public product surface yet → `/workspace` is correct choice

---

## Next Steps (Stage 2)

### 2.1 Architecture Reconciliation

**Required decisions:**
1. **Domain model mapping** — How do scaffold terms map to Vienna terms?
   - `proposals` → Vienna intents? Or keep separate?
   - `warrants` → Vienna admission/warrant model? (same concept, may align)
   - `policies` → Vienna policy engine (same concept, likely align)
   - `audit_log` → Vienna trace/outcome/ledger (same concept, likely align)

2. **Backend deployment shape**
   - Option A: Next.js-integrated APIs (if Vienna backend is request/response only)
   - Option B: Separate Vienna backend service (if runtime requires stateful processes)
   - **Current Vienna state:** Phase 14 complete, incident backend exists, runtime may require separation

3. **Integration boundaries**
   - Product shell layer (Next.js app, auth, layout, routes)
   - Vienna application layer (investigations, incidents, artifacts, timelines, API contracts)
   - Vienna runtime layer (governance, execution, reconciliation, watchdog)

**Freeze these decisions before porting components.**

---

## Files Modified/Created

**Created:**
- `/home/maxlawai/regulator.ai/` (cloned)
- `.env.local` (from `.env.example`)
- `feat/vienna-integration-phase1` (integration branch)
- `VIENNA_INTEGRATION_CHECKPOINT_1.md` (this file)

**No production code modified yet** — Stage 1 is read-only inspection

---

## Open Questions for Checkpoint

1. **Workspace route decision:** `/workspace` or `/admin/workspace`?
   - **Recommendation:** `/workspace` (Vienna is core product)

2. **Backend deployment shape:**
   - Does Vienna backend require stateful runtime processes (reconciliation loops, watchdogs)?
   - Or is Vienna backend mostly CRUD/query APIs?
   - **Action:** Review Vienna Phase 14 backend architecture before deciding

3. **Domain model strategy:**
   - Keep scaffold `proposals/warrants/policies` separate from Vienna concepts?
   - Or unify them as single shared model?
   - **Recommendation:** Keep separate initially, unify selectively after validation

---

## Status Summary

**Stage 1 Complete:** ✅  
**Integration branch ready:** ✅  
**Scaffold inspected:** ✅  
**Decisions frozen:** ⏳ (awaiting Stage 2 architecture reconciliation)

**Next action:** Begin Stage 2 — Architecture Reconciliation

**Estimated time to Stage 2 completion:** 1-2 hours

---

## Validation Checklist

- [x] Repository cloned to local machine
- [x] `npm install` completed (406 packages)
- [x] `npm run build` successful (production build passed)
- [x] `.env.local` created from example
- [x] Integration branch created (`feat/vienna-integration-phase1`)
- [x] Scaffold structure documented (routes, schema, auth, layout)
- [x] Landing page theme/positioning understood
- [x] Route decision options identified
- [ ] Backend deployment shape decided (Stage 2)
- [ ] Domain model mapping decided (Stage 2)
- [ ] Integration boundaries documented (Stage 2)

**Blocker status:** None — ready to proceed to Stage 2
