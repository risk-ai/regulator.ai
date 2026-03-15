# Vienna → regulator.ai Migration Map

**Date:** 2026-03-14  
**Purpose:** Define repository ownership, code location, and integration boundaries for Vienna OS integration into regulator.ai

---

## Repository Ownership Model

### Primary Repository: `regulator.ai`

**What lives here:**
- Product shell (Next.js app, landing, routing, layout)
- Vienna workspace frontend (investigations, incidents, artifacts, timelines)
- API layer (Next.js route handlers OR proxy to Vienna backend)
- Shared types and contracts
- Database schema (Neon Postgres, `regulator` schema)
- Deployment configuration (Vercel)

**Why this is primary:**
- Product-facing surface
- Single deployment target
- Unified developer experience
- Clear production environment

### Vienna Runtime: Logical Subsystem or Separate Service

**Decision required:** Choose one of these models

#### Option A: Vienna Runtime as Embedded Module (RECOMMENDED for simplicity)

**Structure:**
```
regulator.ai/
├── src/
│   ├── app/                    # Next.js app (product shell)
│   ├── components/             # React components
│   ├── lib/
│   │   ├── workspace/          # Vienna workspace client APIs
│   │   ├── vienna-runtime/     # Vienna governance/execution core
│   │   │   ├── governance/     # Policy, warrant, admission
│   │   │   ├── execution/      # Executor, adapters
│   │   │   ├── reconciliation/ # Objective evaluator, loop
│   │   │   └── state/          # State Graph, persistence
│   │   └── api-client.ts       # Shared API client
│   ├── db/
│   │   └── schema.ts           # Drizzle schema (unified)
│   └── ...
```

**Rationale:**
- Single codebase, single deployment
- Simpler for Phase 13-14 migration (fewer moving parts)
- Vienna runtime becomes library layer, not separate service
- Works if Vienna doesn't require long-running background processes outside request/response

**Constraints:**
- Vienna reconciliation loops must fit serverless/edge constraints OR run as separate background jobs
- No persistent process state (use DB for state)
- Filesystem dependencies must be replaced with object storage or DB

#### Option B: Vienna Runtime as Separate Backend Service

**Structure:**
```
regulator.ai/               # Frontend + API proxy
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   └── vienna-api-client.ts  # Client for Vienna backend
│   └── db/
│       └── schema.ts       # Frontend-owned schema

vienna-runtime/             # Separate repo/service
├── lib/
│   ├── governance/
│   ├── execution/
│   ├── reconciliation/
│   └── state/
├── api/
│   └── server.ts           # Express/Fastify API
└── workers/
    └── reconciliation-loop.ts
```

**Rationale:**
- Needed if Vienna requires persistent background processes (reconciliation loops, watchdogs)
- Needed if Vienna state management doesn't fit serverless model
- Clear separation of concerns (product frontend vs. governance runtime)

**Constraints:**
- Two repos to manage
- API versioning and contracts
- Separate deployment pipeline
- CORS/auth coordination

---

## Migration Map by Component

### Phase 13: Operator Workspace (Frontend)

**Source:** `vienna-core/console/client/` (Vite + React)  
**Destination:** `regulator.ai/src/` (Next.js + React)

**Components to migrate:**
- `InvestigationIndex.tsx` → `src/components/workspace/InvestigationIndex.tsx`
- `InvestigationDetail.tsx` → `src/components/workspace/InvestigationDetail.tsx`
- `ArtifactBrowser.tsx` → `src/components/workspace/ArtifactBrowser.tsx`
- `TraceTimelinePanel.tsx` → `src/components/workspace/TraceTimelinePanel.tsx`
- `RelatedEntitiesPanel.tsx` → `src/components/workspace/RelatedEntitiesPanel.tsx`
- `StatusBadge.tsx` → `src/components/workspace/StatusBadge.tsx`

**Shared types:**
- `vienna-core/console/shared/types.ts` → `src/lib/workspace/types.ts`

**API client:**
- `vienna-core/console/client/src/api/` → `src/lib/workspace/api.ts`

**Routing:**
- `/workspace` → `src/app/workspace/page.tsx`
- `/workspace/[investigationId]` → `src/app/workspace/[investigationId]/page.tsx`

**Dependencies:**
- Remove Vite-specific imports
- Adapt to Next.js App Router conventions
- Replace `react-router` with Next.js `useRouter` / `Link`
- Environment variables via `NEXT_PUBLIC_API_BASE_URL`

---

### Phase 14: Incident Backend

**Source:** `vienna-core/lib/` (incident model, State Graph)  
**Destination:** Depends on Option A vs B

#### If Option A (Embedded):
- `vienna-core/lib/workspace/` → `src/lib/vienna-runtime/workspace/`
- `vienna-core/lib/state/state-graph.js` → `src/lib/vienna-runtime/state/state-graph.ts`
- State Graph schema → merge into `src/db/schema.ts`

#### If Option B (Separate):
- Incident backend stays in `vienna-runtime/` service
- `regulator.ai` calls it via REST/GraphQL API
- Schema duplication or shared package

**Database schema migration:**
- Vienna State Graph tables (18 tables) → Neon `regulator` schema
- Convert from SQLite to Postgres (Drizzle adapter)
- Preserve table names, column types, relationships
- Environment isolation (prod/test) via schema or database separation

---

### Vienna Governance Core (Runtime)

**Source:** `vienna-core/lib/governance/`, `vienna-core/lib/execution/`, `vienna-core/lib/core/`

**Components:**
- Warrant system
- Policy engine
- Execution engine
- Verification engine
- Reconciliation gate
- Objective evaluator
- Intent interpreter

**Destination:**

#### If Option A (Embedded):
- `src/lib/vienna-runtime/governance/`
- `src/lib/vienna-runtime/execution/`
- `src/lib/vienna-runtime/core/`
- Import from Next.js API routes or server components

#### If Option B (Separate):
- `vienna-runtime/lib/`
- Accessed via API from `regulator.ai`

**Key constraint:**
> Do not flatten Vienna governance concepts during migration. Preserve warrant/policy/verification architecture.

---

### Artifacts and Storage

**Current state:** Phase 13 uses filesystem-based artifact storage (`~/.openclaw/runtime/{prod|test}/workspace/`)

**Migration required:**
- Replace filesystem with object storage (S3, Vercel Blob, Neon storage extension)
- Or keep filesystem if Vienna backend remains separate Node.js service
- Artifact metadata in Postgres, content in object storage

**Schema changes:**
- Add `artifact_storage_url` column (S3/blob URL)
- Keep `artifact_content` for small text artifacts (< 1MB)
- Large artifacts (logs, traces, reports) → object storage

---

### API Layer

**Current state:** Vienna console has Express backend (`vienna-core/console/server/`)

**Migration options:**

#### Option A (Next.js API Routes):
```
src/app/api/
├── workspace/
│   ├── investigations/
│   │   ├── route.ts          # GET /api/workspace/investigations
│   │   └── [id]/route.ts     # GET /api/workspace/investigations/:id
│   ├── artifacts/
│   │   └── route.ts          # GET /api/workspace/artifacts
│   ├── timeline/
│   │   └── route.ts          # GET /api/workspace/timeline
│   └── related-entities/
│       └── route.ts          # GET /api/workspace/related-entities
├── governance/
│   ├── intents/route.ts
│   ├── plans/route.ts
│   └── warrants/route.ts
└── reconciliation/
    ├── objectives/route.ts
    └── evaluations/route.ts
```

**Reimplement Vienna backend APIs as Next.js route handlers**  
**Connect to Neon Postgres instead of State Graph SQLite**  
**Preserve response contracts from Phase 13**

#### Option B (Proxy to Separate Backend):
```
src/app/api/
└── [...vienna]/route.ts      # Proxy all /api/* to Vienna backend
```

**Simpler migration**  
**Vienna backend stays separate**  
**Frontend calls `/api/workspace/investigations`, Next.js proxies to `VIENNA_BACKEND_URL`**

---

## Domain Model Mapping

### Scaffold Concepts → Vienna Concepts

| Scaffold (`regulator` schema) | Vienna Concept | Strategy |
|---|---|---|
| `proposals` | `intents` or separate | Keep separate initially, may unify later |
| `policies` | `policies` (same) | Unify schema, single source of truth |
| `warrants` | `warrants` (same) | Unify schema, same governance model |
| `audit_log` | `execution_ledger_events` | Unify or map, both are append-only event stores |
| `adapters` | N/A | Scaffold-specific, not Vienna concept |

**Recommendations:**

1. **`policies` and `warrants`:** Unify immediately (same concept, same purpose)
2. **`audit_log` vs `execution_ledger`:** Map during migration, may keep separate tables with cross-references
3. **`proposals` vs `intents`:** Keep separate initially (proposals may be broader concept than Vienna intents)

**New Vienna tables to add:**
- `managed_objectives`
- `managed_objective_evaluations`
- `managed_objective_history`
- `reconciliation_leases`
- `reconciliation_gates`
- `plans`
- `verifications`
- `workflow_outcomes`
- `execution_ledger_events`
- `execution_ledger_summary`
- `policy_decisions`
- `investigations` (Phase 13)
- `artifacts` (Phase 13)
- `incidents` (Phase 14)

**Total tables:** ~18 Vienna tables + 5 scaffold tables = 23 tables (or unify to ~20)

---

## Integration Boundaries (Frozen)

### Layer 1: Product Shell (Next.js)

**Responsibility:** User-facing surfaces, auth, routing, layout, presentation

**Technologies:** Next.js 14, React, Tailwind, NextAuth.js

**Owns:**
- Landing page
- Navigation
- Auth flows
- Protected routes
- Layout/theme
- Client-side components

**Does NOT own:**
- Governance logic
- Execution decisions
- Policy evaluation
- Warrant issuance

---

### Layer 2: Vienna Application Layer (Shared)

**Responsibility:** Investigation model, workspace APIs, artifact management

**Technologies:** TypeScript, Drizzle ORM, Neon Postgres

**Owns:**
- Investigation CRUD
- Artifact storage/retrieval
- Timeline queries
- Related entity graph
- Incident management
- API contracts

**Consumed by:**
- Next.js frontend (React components)
- Vienna runtime (execution/governance references)

---

### Layer 3: Vienna Runtime/Governance Core

**Responsibility:** Execution, verification, reconciliation, policy enforcement

**Technologies:** Node.js, TypeScript, State Graph (Postgres)

**Owns:**
- Intent interpretation
- Plan generation
- Policy evaluation
- Warrant issuance
- Execution coordination
- Verification checks
- Objective evaluation
- Reconciliation loops

**Integration mode:**
- Option A: Imported as library from Next.js API routes
- Option B: Separate service called via API

---

## Adapters, Not Rewrites

**Principle:** Do not flatten Vienna semantics to fit scaffold conventions

**Required adapters:**

### 1. Storage Adapter
```typescript
// Abstract storage interface
interface ArtifactStorage {
  store(content: Buffer, metadata: ArtifactMetadata): Promise<string> // Returns URL/path
  retrieve(id: string): Promise<Buffer>
  delete(id: string): Promise<void>
}

// Implementations:
class FilesystemStorage implements ArtifactStorage { ... }
class S3Storage implements ArtifactStorage { ... }
class VercelBlobStorage implements ArtifactStorage { ... }
```

### 2. Database Adapter
```typescript
// Abstract State Graph interface
interface StateGraph {
  getInvestigation(id: string): Promise<Investigation>
  listArtifacts(filters: ArtifactFilters): Promise<Artifact[]>
  recordEvent(event: LedgerEvent): Promise<void>
  // ... existing State Graph API
}

// Implementations:
class SQLiteStateGraph implements StateGraph { ... }  // Current
class PostgresStateGraph implements StateGraph { ... } // Migration target
```

### 3. API Client
```typescript
// Environment-aware base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const workspaceApi = {
  async getInvestigations(): Promise<Investigation[]> {
    const res = await fetch(`${API_BASE_URL}/api/workspace/investigations`)
    return res.json()
  },
  // ... other methods
}
```

**No hardcoded localhost URLs in production code**

---

## Future Workflow (Post-Migration)

### Development Loop

```
Local machine:
  /home/maxlawai/regulator.ai/  (cloned from GitHub)
  
OpenClaw/Vienna edits files locally
  → Vienna runs tests/build
  → git add/commit
  → git push origin <branch>

GitHub:
  Stores history, branches, PRs
  
Vercel:
  Auto-deploys on push to main (production)
  Auto-deploys on push to other branches (preview)
```

**No special GitHub access needed beyond normal push/PR workflow**

---

### Where New Work Happens

**Phase 15+ detection layer:**
- Lives in `regulator.ai/src/lib/vienna-runtime/detection/`
- OR in separate `vienna-runtime/` if Option B chosen

**Frontend workspace improvements:**
- `regulator.ai/src/components/workspace/`
- `regulator.ai/src/app/workspace/`

**Governance enhancements:**
- `regulator.ai/src/lib/vienna-runtime/governance/`
- OR `vienna-runtime/lib/governance/`

**Schema changes:**
- `regulator.ai/src/db/schema.ts`
- Apply with `npx drizzle-kit push`

---

### Branch Strategy

**Main branch:** Production-ready code, auto-deploys to regulator.ai

**Feature branches:**
```
feat/vienna-integration-phase1  (current)
feat/phase-15-detection
feat/workspace-improvements
fix/artifact-storage
```

**PR workflow:**
1. Create feature branch locally
2. Develop/test locally
3. Push branch to GitHub
4. Vercel creates preview deployment
5. Review preview URL
6. Merge PR → auto-deploys to production

---

## Recommended Decision: Option A (Embedded Runtime)

**Rationale:**
- Simpler deployment (single app)
- Fewer moving parts
- Vienna governance becomes library, not separate service
- Works for Phase 13-14 migration
- Can refactor to Option B later if runtime requires it

**Validation required:**
- Does Vienna reconciliation loop fit serverless constraints?
- Can Vienna state management use Postgres instead of local files?
- Can artifact storage use object storage instead of filesystem?

**If all yes:** Option A is correct  
**If any no:** Option B required

---

## Next Steps

**Immediate (Stage 2):**
1. Decide Option A vs B (embedded vs separate backend)
2. Map domain model (which tables unify, which stay separate)
3. Document integration boundaries (what lives where)

**After Stage 2:**
1. Begin component porting (Stage 3)
2. API client migration
3. Database schema migration
4. Storage adapter implementation

---

## Summary

**Repository model:** `regulator.ai` is primary product repo

**Vienna runtime:** Embedded module (Option A, recommended) OR separate service (Option B)

**Frontend migration:** Vienna workspace components → Next.js app

**Backend migration:** Vienna APIs → Next.js route handlers (Option A) OR proxy (Option B)

**Database migration:** State Graph SQLite → Neon Postgres

**Storage migration:** Filesystem artifacts → Object storage (S3/Vercel Blob)

**Domain model:** Unify policies/warrants, keep proposals/intents separate initially

**Development workflow:** Local clone → git push → GitHub → Vercel deploy

**No special GitHub access needed** — normal push/PR workflow sufficient

**Integration boundaries frozen:** Product shell / Application layer / Runtime core

**Adapters required:** Storage, Database, API client (env-based URLs)

---

**Status:** Migration map complete, ready for Stage 2 architectural decisions
