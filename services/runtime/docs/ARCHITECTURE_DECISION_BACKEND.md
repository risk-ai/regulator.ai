# Architecture Decision — Backend Deployment Shape

**Date:** 2026-03-14  
**Stage:** Stage 2 Architecture Reconciliation  
**Decision:** Vienna Runtime as Separate Service

---

## Decision Summary

**Vienna Runtime deployment shape:** **Separate Service** (Option B)

**Location:** `services/vienna-runtime/`

**Reason:** Vienna requires continuous execution loops, watchdogs, filesystem persistence, and background reconciliation—capabilities incompatible with Next.js serverless execution model.

---

## Evaluation

### Option A — Embedded Module

**Location:** `src/lib/vienna/`

**Characteristics:**
- Stateless evaluation
- Short execution cycles
- Triggered via API routes
- No background processes
- Ephemeral filesystem
- Request-scoped execution

**Vienna Compatibility:**

| Vienna Feature | Compatible? | Reason |
| -------------- | ----------- | ------ |
| Policy evaluation | ✅ Yes | Stateless, request-scoped |
| Warrant issuance | ✅ Yes | Stateless, request-scoped |
| Single-step execution | ✅ Yes | Can execute in serverless function |
| **Objective evaluation loop** | ❌ No | Requires continuous background process |
| **Watchdog (timeouts)** | ❌ No | Requires long-running process |
| **Artifact storage** | ❌ No | Vercel ephemeral filesystem |
| **SQLite State Graph** | ❌ No | No persistent filesystem |
| **Reconciliation control plane** | ❌ No | Requires gate admission logic, cooldown tracking |
| **Circuit breakers** | ⚠️ Limited | Can track in DB, but no runtime enforcement |

**Verdict:** Insufficient for Vienna's operational requirements.

---

### Option B — Separate Service ✅ SELECTED

**Location:** `services/vienna-runtime/`

**Characteristics:**
- Long-running process
- Continuous evaluation loops
- Background watchdogs
- Filesystem persistence
- Execution monitoring
- Artifact pipelines
- State reconciliation
- SQLite dev mode support

**Vienna Compatibility:**

| Vienna Feature | Compatible? | Reason |
| -------------- | ----------- | ------ |
| Policy evaluation | ✅ Yes | Full policy engine operational |
| Warrant issuance | ✅ Yes | Full warrant lifecycle |
| Multi-step execution | ✅ Yes | Plan execution engine operational |
| Objective evaluation loop | ✅ Yes | Background scheduler operational |
| Watchdog (timeouts) | ✅ Yes | Execution timeout enforcement |
| Artifact storage | ✅ Yes | Filesystem workspace available |
| SQLite State Graph | ✅ Yes | Persistent local storage for dev |
| Reconciliation control plane | ✅ Yes | Full gate/cooldown/circuit breaker support |
| Circuit breakers | ✅ Yes | Runtime policy enforcement |

**Verdict:** Full Vienna OS capabilities preserved.

---

## Selected Architecture

### Deployment Model

```
┌─────────────────────────────────────────────────────┐
│ Product Shell (Next.js App Router)                  │
│                                                      │
│ - Landing page                                      │
│ - Workspace UI (investigations, artifacts, traces)  │
│ - API routes (thin adapter to Vienna runtime)       │
│ - Authentication / Authorization                    │
│ - Drizzle ORM (Neon Postgres)                      │
└──────────────┬──────────────────────────────────────┘
               │
               │ HTTP API calls
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Vienna Runtime (Separate Service)                   │
│                                                      │
│ Location: services/vienna-runtime/                  │
│                                                      │
│ Components:                                         │
│ - State Graph (SQLite: dev, Postgres: prod)        │
│ - Governance Engine (policy, warrant, execution)    │
│ - Objective Evaluator (continuous monitoring)       │
│ - Reconciliation Control Plane (gate, circuit)     │
│ - Execution Engine (plan execution, verification)   │
│ - Artifact Manager (workspace, investigations)      │
│ - Watchdog Service (timeouts, health checks)       │
│ - Background Scheduler (evaluation loop)            │
└─────────────────────────────────────────────────────┘
```

---

## Communication Flow

### Product Shell → Vienna Runtime

**Operator Actions:**

```
1. Operator requests investigation in UI
   → Next.js API route: POST /api/investigations
   → HTTP call to Vienna: POST http://vienna:3100/api/v1/investigations
   → Vienna runtime creates investigation, stores in State Graph
   → Returns investigation object
   → Next.js stores reference in Neon DB
   → UI displays investigation

2. Operator views artifact
   → Next.js API route: GET /api/artifacts/:id
   → HTTP call to Vienna: GET http://vienna:3100/api/v1/artifacts/:id
   → Vienna returns artifact content
   → Next.js renders in UI
```

**Autonomous Operations:**

```
Vienna runtime operates independently:
- Objective evaluation every 30s (background loop)
- Execution timeout watchdog (every 10s)
- Reconciliation admission gate (on-demand)
- Circuit breaker enforcement (real-time)
```

No operator interaction required for autonomous remediation.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Operator                               │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTPS (browser)
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                 Next.js Product Shell                         │
│                 (Vercel / Docker)                             │
│                                                               │
│  Pages:                                                       │
│  - / (landing)                                               │
│  - /workspace/investigations                                 │
│  - /workspace/incidents                                      │
│  - /workspace/artifacts                                      │
│                                                               │
│  API Routes:                                                  │
│  - /api/investigations                                       │
│  - /api/artifacts                                            │
│  - /api/traces                                               │
│  - /api/incidents                                            │
│                                                               │
│  Database: Neon Postgres (Drizzle ORM)                       │
│  - proposals, policies, warrants, auditLog, adapters         │
│  - Plus: investigation_refs, artifact_refs (lightweight)     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTP (private network)
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              Vienna Runtime Service                           │
│              (Docker / systemd service)                       │
│                                                               │
│  Port: 3100                                                   │
│  API: /api/v1/*                                              │
│                                                               │
│  Endpoints:                                                   │
│  - POST /api/v1/investigations                               │
│  - GET  /api/v1/investigations/:id                           │
│  - POST /api/v1/artifacts                                    │
│  - GET  /api/v1/artifacts/:id                                │
│  - GET  /api/v1/traces/:id/timeline                          │
│  - POST /api/v1/incidents                                    │
│  - GET  /api/v1/objectives                                   │
│  - GET  /api/v1/ledger/events                                │
│                                                               │
│  State Graph:                                                 │
│  - SQLite (dev): ~/.vienna/runtime/dev/state-graph.db        │
│  - Postgres (prod): $VIENNA_DATABASE_URL                     │
│                                                               │
│  Filesystem:                                                  │
│  - Artifacts: ~/.vienna/runtime/workspace/artifacts/         │
│  - Traces: ~/.vienna/runtime/workspace/traces/               │
│                                                               │
│  Background Services:                                         │
│  - Objective Evaluator (30s interval)                        │
│  - Execution Watchdog (10s interval)                         │
│  - Circuit Breaker Monitor (real-time)                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Deployment Environments

### Development

**Next.js:** `npm run dev` (localhost:3000)  
**Vienna:** `node services/vienna-runtime/server.js` (localhost:3100)  
**Database (Next.js):** Neon Postgres  
**Database (Vienna):** SQLite (`~/.vienna/runtime/dev/state-graph.db`)

### Production (Vercel + Fly.io)

**Next.js:** Deployed to Vercel (automatic HTTPS, CDN)  
**Vienna:** Deployed to Fly.io (persistent storage, long-running process)  
**Database (Next.js):** Neon Postgres (shared connection)  
**Database (Vienna):** Neon Postgres (Vienna schema)  
**Communication:** Private network (Fly.io ↔ Vercel via proxy)

### Production (Self-Hosted)

**Next.js:** Docker container (port 3000)  
**Vienna:** Docker container (port 3100)  
**Database (Next.js):** Neon Postgres OR local Postgres  
**Database (Vienna):** Neon Postgres OR local Postgres  
**Communication:** Docker network bridge

---

## Operational Characteristics

### Vienna Runtime Service

**Process Type:** Long-running Node.js application  
**Lifecycle:** Start → Run indefinitely → Graceful shutdown on SIGTERM

**Responsibilities:**
- Maintain continuous evaluation loop (objectives)
- Enforce execution timeouts (watchdog)
- Gate reconciliation admission (control plane)
- Store artifacts (filesystem workspace)
- Persist State Graph (SQLite or Postgres)
- Serve HTTP API for product shell queries

**Does NOT handle:**
- User authentication (Next.js responsibility)
- Landing page rendering (Next.js responsibility)
- Session management (Next.js responsibility)

---

### Next.js Product Shell

**Process Type:** Serverless functions (Vercel) OR stateless container (Docker)  
**Lifecycle:** Request → Handle → Response (no persistent state)

**Responsibilities:**
- Render landing page
- Render workspace UI (investigations, artifacts, traces)
- Handle authentication / authorization
- Proxy API calls to Vienna runtime
- Store lightweight references in Neon (investigation IDs, artifact pointers)

**Does NOT handle:**
- Continuous evaluation loops (Vienna responsibility)
- Execution timeouts (Vienna responsibility)
- Artifact filesystem storage (Vienna responsibility)
- State Graph management (Vienna responsibility)

---

## Technology Stack

### Next.js Product Shell

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon Postgres (Drizzle ORM)
- **Deployment:** Vercel (production), Docker (self-hosted)
- **Authentication:** NextAuth.js OR Auth0 (TBD)
- **UI:** React Server Components, Tailwind CSS

### Vienna Runtime

- **Framework:** Express.js (HTTP API server)
- **Database (dev):** SQLite (State Graph)
- **Database (prod):** Neon Postgres (State Graph)
- **Deployment:** Fly.io (production), Docker (self-hosted), systemd (local)
- **Storage:** Local filesystem (artifacts, traces)
- **Background Services:** Node.js event loop (setInterval schedulers)

---

## Migration Path

### Phase 1 (Current)

- Next.js scaffold exists
- Vienna workspace (Phase 12) exists
- No integration

### Phase 2 (Stage 2 — Architecture Reconciliation)

- Define API boundary
- Map domain models
- Plan workspace routing
- Document adapter layer

### Phase 3 (Stage 3 — Workspace Component Migration)

- Move Vienna UI components → Next.js pages
- Implement API routes (proxies to Vienna runtime)
- Create Vienna runtime service scaffold
- Local development setup (both services running)

### Phase 4 (Stage 4 — Backend Integration)

- Implement API endpoints in Vienna runtime
- Implement API proxy in Next.js
- Database adapter (Drizzle ↔ State Graph)
- End-to-end validation

### Phase 5 (Stage 5 — Production Deployment)

- Deploy Next.js to Vercel
- Deploy Vienna runtime to Fly.io
- Configure private network communication
- Production validation

---

## Benefits of Separate Service Model

### Vienna Benefits

✅ **Full operational capabilities preserved**
- Continuous evaluation loops
- Execution timeout enforcement
- Background reconciliation
- Artifact workspace management
- SQLite dev mode (no cloud DB required)

✅ **Independent scaling**
- Vienna runtime scales based on objective count, execution volume
- Next.js scales based on web traffic
- Decoupled resource allocation

✅ **Independent deployment**
- Vienna updates don't require Next.js rebuild
- Next.js UI updates don't affect governance runtime
- Rollback independence

✅ **Technology flexibility**
- Vienna can use SQLite (dev) OR Postgres (prod)
- Vienna can use filesystem storage
- Vienna can run background services

---

### Product Shell Benefits

✅ **Stateless simplicity**
- No background process management
- Standard Next.js deployment (Vercel)
- Familiar development workflow

✅ **Clear separation of concerns**
- UI rendering ≠ governance execution
- Product shell = presentation layer
- Vienna runtime = business logic + execution

✅ **Performance optimization**
- Next.js SSR for fast page loads
- Vienna runtime optimized for governance workloads
- No mixed-concern performance tradeoffs

---

## Risks & Mitigations

### Risk: Network dependency

**Problem:** Next.js ↔ Vienna runtime requires network calls  
**Impact:** Latency, failure modes

**Mitigation:**
- Deploy on same private network (Fly.io OR Docker bridge)
- Implement retry logic in Next.js API routes
- Cache frequently-accessed data in Next.js
- Health check endpoints for monitoring

---

### Risk: Deployment complexity

**Problem:** Two services to deploy instead of one  
**Impact:** More infrastructure to manage

**Mitigation:**
- Docker Compose for local dev (one command: `docker-compose up`)
- Fly.io for production (managed service, automatic scaling)
- Clear deployment documentation
- Automated CI/CD pipeline

---

### Risk: Data consistency

**Problem:** State split across Neon (Next.js) and State Graph (Vienna)  
**Impact:** Potential inconsistency

**Mitigation:**
- Vienna runtime = source of truth for governance state
- Next.js stores lightweight references only (investigation IDs, not full state)
- API reads always fetch from Vienna (no stale cache)
- Explicit sync boundaries documented

---

## Open Questions

### Q1: Should Next.js store ANY governance data in Neon?

**Options:**
- A. Vienna State Graph only (Next.js is pure proxy)
- B. Lightweight references in Neon (investigation IDs, user preferences)
- C. Full duplication (Neon mirrors State Graph)

**Recommendation:** Option B (lightweight references)

**Reasoning:**
- Next.js needs investigation ownership tracking (user → investigations)
- Next.js needs fast queries for UI (investigation list, artifact metadata)
- Vienna State Graph is source of truth for full governance state
- Neon stores: `investigation_refs` (user_id, investigation_id, created_at)
- Vienna stores: full `investigations` table with artifacts, traces, etc.

---

### Q2: How to handle authentication between services?

**Options:**
- A. Shared session secret (JWT validation in Vienna runtime)
- B. Service-to-service API key (Next.js → Vienna)
- C. No auth in Vienna (trust private network boundary)

**Recommendation:** Option A OR Option B (depends on deployment model)

**For production (Vercel + Fly.io):** Option A (JWT validation)  
**For local dev:** Option C (trust localhost)

---

### Q3: Should Vienna runtime expose a public API?

**Options:**
- A. Vienna API is private (only accessible to Next.js backend)
- B. Vienna API is public (direct operator access for advanced workflows)

**Recommendation:** Option A (private API)

**Reasoning:**
- Operator access = through Next.js UI only
- Vienna API optimized for machine consumption (not human-friendly)
- Next.js provides authentication/authorization boundary
- Advanced operators can use CLI tools (direct State Graph access)

---

## Decision Record

**Decision:** Vienna Runtime as Separate Service  
**Rationale:** Vienna requires continuous execution loops, watchdogs, filesystem persistence—incompatible with Next.js serverless model  
**Architecture:** Next.js (product shell) + Vienna Runtime (separate service)  
**Communication:** HTTP API (private network)  
**Status:** Approved for Stage 3 implementation

---

**Next Steps:**
1. Define API boundary (API_BOUNDARY.md)
2. Map domain models (DOMAIN_MODEL_MAPPING.md)
3. Plan workspace routing (WORKSPACE_ROUTING_PLAN.md)
4. Define adapter layer (ADAPTER_LAYER_PLAN.md)
