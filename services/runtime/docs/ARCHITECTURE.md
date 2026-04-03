# regulator.ai Architecture

**Last Updated:** 2026-03-14  
**Purpose:** Canonical architecture reference for developers

---

## System Overview

regulator.ai is a **dual-surface governance platform** with two distinct operational areas:

1. **Admin Surface** (`/admin`) — Governance control plane
2. **Vienna Workspace** (`/workspace`) — Operator investigation environment

Both surfaces are served by a **Next.js product shell**, with the Vienna Workspace backed by a separate **Vienna Runtime service**.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Product Shell                      │
│              (Vercel Deployment)                        │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────┐     │
│  │  /admin          │    │  /workspace          │     │
│  │  Governance UI   │    │  Operator UI         │     │
│  └──────────────────┘    └──────────────────────┘     │
│         │                          │                   │
│         │                          │                   │
│         ▼                          ▼                   │
│  ┌──────────────────┐    ┌──────────────────────┐     │
│  │  Neon Postgres   │    │  /api/workspace/*    │     │
│  │  (Governance DB) │    │  Proxy Layer         │     │
│  └──────────────────┘    └──────────────────────┘     │
│                                    │                   │
└────────────────────────────────────┼───────────────────┘
                                     │
                                     │ HTTP
                                     ▼
                    ┌────────────────────────────────┐
                    │  Vienna Runtime Service        │
                    │  (Separate Deployment)         │
                    │                                │
                    │  ┌──────────────────────────┐  │
                    │  │  Express HTTP API        │  │
                    │  └──────────────────────────┘  │
                    │             │                  │
                    │             ▼                  │
                    │  ┌──────────────────────────┐  │
                    │  │  SQLite State Backend    │  │
                    │  │  (Preview/Dev)           │  │
                    │  │                          │  │
                    │  │  OR                      │  │
                    │  │                          │  │
                    │  │  Neon Postgres           │  │
                    │  │  (Production)            │  │
                    │  └──────────────────────────┘  │
                    │             │                  │
                    │             ▼                  │
                    │  ┌──────────────────────────┐  │
                    │  │  Filesystem Artifacts    │  │
                    │  │  (Preview/Dev)           │  │
                    │  │                          │  │
                    │  │  OR                      │  │
                    │  │                          │  │
                    │  │  S3 / Vercel Blob        │  │
                    │  │  (Production)            │  │
                    │  └──────────────────────────┘  │
                    └────────────────────────────────┘
```

---

## Two Operational Surfaces

### /admin — Governance Control Plane

**Purpose:** Configuration and control of governance policies

**Features:**
- Proposal queue management
- Policy definition and approval
- Warrant issuance and tracking
- Audit log viewer
- Governance dashboard

**Database:** Neon Postgres (shared with product)

**Navigation:**
```
/admin
├── /proposals
├── /policies
├── /warrants
└── /audit
```

---

### /workspace — Vienna Operator Investigation Environment

**Purpose:** Operational investigation and forensic reasoning

**Features:**
- Investigation workflows
- Incident tracking
- Artifact management
- Execution trace exploration
- Graph-based explainability

**Backend:** Vienna Runtime service (separate deployment)

**Navigation:**
```
/workspace
├── /investigations
├── /incidents
├── /artifacts (future)
└── /traces (future)
```

---

## Why Two Surfaces?

**Different Jobs:**
- `/admin` is **CRUD-oriented** (create, update, configure)
- `/workspace` is **graph-oriented** (investigate, explore, reason)

**Different Mental Models:**
- Admin = control plane (vertical governance workflow)
- Workspace = investigation surface (horizontal forensic workflow)

**Different Data Models:**
- Admin = proposals, policies, warrants (governance primitives)
- Workspace = investigations, incidents, artifacts, traces (operational primitives)

**Separation Benefits:**
- Cleaner boundaries
- Independent scaling (runtime can scale separately)
- Preserves Vienna's graph-based architecture
- Avoids forcing investigation workflows into CRUD patterns

---

## Service Boundary: Shell vs Runtime

### Product Shell (Next.js)

**Deployment:** Vercel  
**Responsibilities:**
- Serve UI for both `/admin` and `/workspace`
- Handle auth (NextAuth)
- Query governance database (Neon Postgres)
- Proxy requests to Vienna Runtime

**Does NOT:**
- Call Vienna Runtime directly from browser
- Store Vienna state
- Execute Vienna governance logic

---

### Vienna Runtime (Express Service)

**Deployment:** Cloud platform with persistent storage (Vercel, Railway, Render, or similar)  
**Responsibilities:**
- Serve Vienna HTTP API
- Manage investigation/incident state
- Store artifacts
- Execute governance workflows (future)
- Provide trace/execution data

**Does NOT:**
- Serve UI directly
- Handle browser requests
- Store governance primitives (proposals/policies/warrants)

---

## Proxy Layer

**Location:** `src/app/api/workspace/*`

**Purpose:** Enforce service boundary between shell and runtime

**Routes:**
```
GET  /api/workspace/investigations     → Vienna Runtime /api/investigations
GET  /api/workspace/investigations/:id → Vienna Runtime /api/investigations/:id
GET  /api/workspace/incidents          → Vienna Runtime /api/incidents
POST /api/workspace/incidents          → Vienna Runtime /api/incidents
GET  /api/workspace/incidents/:id      → Vienna Runtime /api/incidents/:id
GET  /api/workspace/artifacts          → Vienna Runtime /api/artifacts
```

**Key invariants:**
- Browser NEVER calls Vienna Runtime directly
- All requests go through Next.js proxy
- Proxy enforces auth (future)
- Controlled error responses when runtime offline

---

## Storage Backends

### Preview/Dev

**Product Shell:**
- Database: Neon Postgres (governance data)
- Auth: NextAuth + Neon

**Vienna Runtime:**
- State: SQLite (`services/vienna-runtime/data/vienna.db`)
- Artifacts: Filesystem (`services/vienna-runtime/data/artifacts/`)

---

### Production

**Product Shell:**
- Database: Neon Postgres (governance data)
- Auth: NextAuth + Neon

**Vienna Runtime:**
- State: Neon Postgres (separate instance or schema)
- Artifacts: S3 or Vercel Blob

---

## Environment Variables

### Product Shell

```bash
# Database
DATABASE_URL=postgresql://...@neon.tech/neondb

# Auth
NEXTAUTH_SECRET=random-secret-here
NEXTAUTH_URL=https://regulator.ai
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Vienna Runtime
VIENNA_RUNTIME_BASE_URL=https://vienna-runtime.fly.dev
```

### Vienna Runtime

```bash
# Server
PORT=3001

# Storage (Preview)
VIENNA_STATE_BACKEND=sqlite
VIENNA_ARTIFACT_BACKEND=filesystem
VIENNA_DATA_DIR=/data

# Storage (Production)
VIENNA_STATE_BACKEND=postgres
DATABASE_URL=postgresql://...
VIENNA_ARTIFACT_BACKEND=s3
AWS_S3_BUCKET=vienna-artifacts
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# CORS
CORS_ORIGIN=https://regulator.ai
```

---

## Deployment Model

### Current (Preview/Dev)

**Product Shell:**
- Platform: Vercel
- Branch: `main` → auto-deploy to https://regulator.ai
- Branch: `feat/*` → preview URLs

**Vienna Runtime:**
- Platform: Local dev server (`npm run dev`)
- Or: Cloud preview instance

---

### Production (Future)

**Product Shell:**
- Platform: Vercel (same)
- Custom domain: https://regulator.ai

**Vienna Runtime:**
- Platform: Vercel, Railway, Render, or similar cloud platform
- Multi-region deployment
- Persistent volumes for SQLite (preview) or Postgres connection
- Object storage for artifacts

---

## Development Workflow

### Working on Admin Surface

```bash
# No Vienna Runtime needed
npm run dev
# Open http://localhost:3000/admin
```

Changes only affect Next.js shell.

---

### Working on Vienna Workspace

```bash
# Terminal 1: Vienna Runtime
cd services/vienna-runtime
npm install
npm run dev

# Terminal 2: Product Shell
npm run dev

# Open http://localhost:3000/workspace
```

Both services must run for full integration.

---

## Key Design Principles

### 1. Service Boundary Enforcement

**Rule:** Browser NEVER calls Vienna Runtime directly

**Why:**
- Auth boundary (future)
- Runtime isolation
- Graceful degradation
- Controlled error states

**How:** Proxy layer at `/api/workspace/*`

---

### 2. Separation of Concerns

**Rule:** Admin and Workspace remain separate top-level areas

**Why:**
- Different jobs (control vs investigation)
- Different mental models (CRUD vs graph)
- Preserves Vienna architecture
- Cleaner boundaries

**How:** Distinct routes, distinct backends, distinct data models

---

### 3. Graceful Degradation

**Rule:** Product shell must work even if Vienna Runtime offline

**Why:**
- Preview deployments may not have runtime
- Resilience during runtime maintenance
- Clear boundary visibility

**How:**
- Runtime unavailable warnings
- Empty states with helpful messaging
- No crashes or broken UI

---

### 4. Migration Path Preservation

**Rule:** Preview/dev backends (SQLite, filesystem) must have clear production migration path

**Why:**
- Preview validation doesn't require production infrastructure
- Cost efficiency for preview/dev
- Production requirements differ (HA, replication, object storage)

**How:**
- Backend abstraction (state/artifact adapters)
- Configuration-only migration
- No code changes for backend swap

---

## File Structure

```
regulator.ai/
├── src/
│   ├── app/
│   │   ├── admin/              # Governance control plane
│   │   │   ├── proposals/
│   │   │   ├── policies/
│   │   │   ├── warrants/
│   │   │   └── audit/
│   │   ├── workspace/          # Vienna operator workspace
│   │   │   ├── investigations/
│   │   │   ├── incidents/
│   │   │   └── layout.tsx
│   │   └── api/
│   │       └── workspace/      # Vienna proxy layer
│   │           ├── investigations/
│   │           ├── incidents/
│   │           └── artifacts/
│   ├── db/
│   │   └── schema.ts           # Governance database schema
│   └── lib/
│       └── vienna-runtime-client.ts  # Typed Vienna Runtime client
│
├── services/
│   └── vienna-runtime/         # Separate Vienna Runtime service
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── db/         # State backend adapters
│       │   │   └── artifacts/  # Artifact backend adapters
│       │   ├── routes/         # HTTP API routes
│       │   └── app.ts          # Express app
│       ├── data/               # Local SQLite + artifacts (gitignored)
│       └── package.json
│
├── ARCHITECTURE.md             # This file
├── SETUP.md                    # Project setup guide
├── ONBOARDING.md               # Developer onboarding
└── VIENNA_RUNTIME_DEPLOYMENT_PLAN.md  # Runtime deployment guide
```

---

## Common Questions

### Why not put workspace under /admin?

Different jobs, different mental models. Admin is CRUD-oriented governance control. Workspace is graph-oriented investigation. Forcing workspace into admin would collapse distinct workflows.

---

### Why a separate Vienna Runtime service?

- **Isolation:** Runtime can be deployed independently
- **Scaling:** Runtime can scale separately from shell
- **Architecture preservation:** Maintains Vienna's governed execution model
- **Future-proofing:** Enables background loops, webhooks, autonomous workflows

---

### Why proxy layer instead of direct browser calls?

- **Auth boundary:** Future auth enforcement at proxy
- **Error handling:** Controlled degradation when runtime offline
- **Service boundary:** Prevents architectural collapse
- **Migration flexibility:** Can swap runtime backends without UI changes

---

### Why SQLite for preview instead of Postgres?

- **Cost:** Free for preview/dev
- **Simplicity:** No external dependencies
- **Fast:** Single-file database
- **Migration path:** Clear upgrade to Postgres for production

---

### Can I work on admin without running Vienna Runtime?

**Yes.** Admin surface is independent. Only workspace requires runtime.

---

### Can I work on workspace UI without Vienna Runtime?

**Yes.** Runtime-unavailable states allow UI development without backend. Runtime needed for data integration only.

---

## Next Steps

**For new developers:**
1. Read `ONBOARDING.md` for setup
2. Read `SETUP.md` for architecture context
3. Read this file for system understanding

**For reviewers:**
- Focus on service boundary correctness
- Validate separation of admin vs workspace
- Check deployment assumptions

**For Stage 6 (production integration):**
- Deploy Vienna Runtime to cloud platform
- Add auth enforcement on proxy routes
- Migrate SQLite → Neon Postgres
- Migrate filesystem → S3/Vercel Blob
- Add observability

---

## References

- **Stage 1-5 completion reports:** In `feat/vienna-integration-phase1` branch
- **Vienna Runtime deployment plan:** `VIENNA_RUNTIME_DEPLOYMENT_PLAN.md`
- **Preview deployment audit:** `PREVIEW_DEPLOYMENT_AUDIT.md`
- **Build validation notes:** `STAGE_5_BUILD_NOTES.md`

---

**Last Updated:** 2026-03-14  
**Next Review:** After PR #1 merge
