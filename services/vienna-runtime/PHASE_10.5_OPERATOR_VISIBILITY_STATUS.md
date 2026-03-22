# Phase 10.5 Operator Visibility Status

**Assessment Date:** 2026-03-13  
**Phase:** Planning / Assessment (Pre-Implementation)  
**Purpose:** Define what's built, what's usable, what remains, and sequencing recommendation

---

## Phase 10.5 Original Scope

**Goal:** Minimal operator visibility into objective orchestration and reconciliation system

**Planned Components:**
1. Objective status distribution (healthy/reconciling/degraded/cooldown)
2. Reconciliation timeline viewer
3. Execution inspector (ledger event browser)
4. Safe mode toggle UI
5. Admission gate metrics
6. Timeout/circuit breaker visualization

**Estimated Time:** 20-28 hours (UI-heavy)

---

## What Is Already Built (Production-Ready)

### 1. Backend API Endpoints ✅ OPERATIONAL

**Location:** `vienna-core/console/server/src/routes/phase-10.ts`

**6 endpoints delivered:**

1. **GET /api/phase-10/objectives**
   - Returns all objectives with status, reconciliation_status, timestamps
   - Filterable by status, reconciliation_status
   - **Use case:** Objective status distribution chart

2. **GET /api/phase-10/objectives/:id**
   - Returns single objective with full metadata
   - Includes evaluation history, transition history
   - **Use case:** Objective detail inspector

3. **GET /api/phase-10/objectives/:id/timeline**
   - Returns reconciliation lifecycle events
   - Chronologically ordered with metadata
   - **Use case:** Reconciliation timeline viewer

4. **GET /api/phase-10/ledger**
   - Returns execution ledger summaries
   - Filterable by objective_id, status, risk_tier
   - **Use case:** Execution history browser

5. **GET /api/phase-10/ledger/:execution_id**
   - Returns full execution event timeline
   - All lifecycle events with payloads
   - **Use case:** Execution detail inspector

6. **GET /api/phase-10/metrics**
   - Returns admission gate metrics, timeout counts, circuit breaker state
   - **Use case:** System health dashboard

**Status:** All endpoints operational, tested with curl/Postman, ready for frontend

---

### 2. Data Layer ✅ COMPLETE

**State Graph Tables:**
- `managed_objectives` — Objective definitions + state
- `managed_objective_evaluations` — Evaluation results
- `managed_objective_history` — State transitions + lifecycle events
- `execution_ledger_events` — Immutable execution lifecycle
- `execution_ledger_summary` — Queryable execution summaries
- `policies` — Governance constraints
- `policy_decisions` — Policy evaluation history

**Query Methods:**
- `listObjectives()` — With filters
- `getObjective()` — Full detail
- `listObjectiveHistory()` — Timeline
- `listExecutionLedger()` — With filters
- `getExecutionLedgerEvents()` — Event timeline

**Status:** Complete data access layer, no backend work needed

---

### 3. CLI Tools ✅ OPERATIONAL (For Development/Debugging)

**Available now:**
```bash
# Objective inspection
node scripts/inspect-objective.js <objective_id>

# Watchdog status
node scripts/watchdog-status.js

# Recent timeouts
node scripts/query-recent-timeouts.js

# Transition audit
node scripts/audit-transitions.js

# Ledger timeline
node scripts/ledger-timeline.js <execution_id>

# Safe mode control (Phase 10.4)
node cli/vienna-safe-mode.js status
```

**Status:** Fully functional, operator can use these during observation window

---

## What Remains to Make Phase 10.5 Complete

### 1. Frontend UI Components (NOT BUILT)

**Objective Status Dashboard**
- Visual distribution chart (healthy/reconciling/degraded/cooldown/failed)
- Objective list table with filters
- Real-time updates (polling or WebSocket)
- **Estimated:** 6-8 hours

**Reconciliation Timeline Viewer**
- Event timeline visualization per objective
- Filter by event type
- Metadata expansion
- **Estimated:** 4-6 hours

**Execution Inspector**
- Ledger event browser
- Drill-down from objective → execution → event timeline
- Policy decision display
- **Estimated:** 6-8 hours

**Safe Mode Toggle** (Phase 10.4 integration)
- Global safe mode enable/disable button
- Confirmation dialog with reason input
- Status indicator in header
- **Estimated:** 2-3 hours

**Metrics Dashboard**
- Gate admission metrics (admit/skip by reason)
- Timeout volume chart
- Circuit breaker state
- **Estimated:** 4-5 hours

**Total Frontend Work:** 22-30 hours

---

### 2. Backend Enhancements (OPTIONAL)

**Real-time updates:**
- WebSocket endpoint for objective state changes
- Push notifications for reconciliation events
- **Estimated:** 3-4 hours
- **Priority:** Nice-to-have, polling sufficient for MVP

**Historical metrics:**
- Aggregated metrics over time windows
- Trend analysis (are timeouts increasing?)
- **Estimated:** 2-3 hours
- **Priority:** Post-MVP

**Total Backend Enhancements:** 5-7 hours (optional)

---

## Current Operational Capability

### What Operator Can Do RIGHT NOW (Without UI)

1. **Inspect objectives via CLI:**
   ```bash
   node scripts/inspect-objective.js obj_1234567890
   ```
   - See full state, evaluation history, transition timeline

2. **Query ledger via CLI:**
   ```bash
   node scripts/ledger-timeline.js exec_1234567890
   ```
   - See execution lifecycle events

3. **Monitor timeouts:**
   ```bash
   node scripts/query-recent-timeouts.js
   ```
   - See recent timeout events

4. **Check safe mode status:**
   ```bash
   node cli/vienna-safe-mode.js status
   ```
   - See if safe mode active

5. **Query via API (curl/Postman):**
   ```bash
   curl http://localhost:3100/api/phase-10/objectives
   curl http://localhost:3100/api/phase-10/metrics
   ```
   - Full backend data access

**Conclusion:** Operator has complete visibility via CLI/API, just no graphical UI.

---

## What Is Production-Usable Now

### ✅ Fully Usable

- **CLI diagnostics** — All tools operational
- **API endpoints** — Complete data access
- **State Graph queries** — Direct database inspection
- **Ledger inspection** — Full audit trail

### ⚠️ Partially Usable

- **Dashboard objective list** — Backend ready, frontend not integrated
- **Reconciliation timeline** — Data available, no visualization
- **Execution inspector** — Data complete, no UI

### ❌ Not Yet Available

- **Real-time dashboard updates** — No WebSocket/polling yet
- **Safe mode toggle UI** — CLI only
- **Metrics visualization** — No charts yet

---

## Sequencing Recommendation

### Option A: Complete Phase 10.5 Immediately After 10.4

**Rationale:**
- UI-heavy work, can run in parallel with 10.3 observation window
- Operator visibility is valuable for monitoring 10.3 stability
- No runtime risk (read-only UI)

**Sequence:**
1. Phase 10.3 observation continues (passive)
2. Build Phase 10.5 UI components (22-30 hours)
3. When 10.3 window closes → deploy 10.4 (3.5 hours)
4. Deploy 10.5 UI immediately after (already built)

**Benefits:**
- Faster time to complete visibility
- UI available when 10.4 deploys
- Can use dashboard to monitor 10.4 behavior

**Risks:**
- UI work during observation window might be distracting
- If 10.3 fails, UI work wasted

**Total Timeline:** ~26-34 hours (concurrent with observation)

---

### Option B: Defer Phase 10.5 Until After 10.4

**Rationale:**
- Focus on reliability first (10.3 observation + 10.4 safe mode)
- UI can wait until control plane proven stable
- Operator has sufficient visibility via CLI for now

**Sequence:**
1. Phase 10.3 observation continues (passive)
2. Prepare 10.4 implementation (planning only)
3. When 10.3 window closes → deploy 10.4 (3.5 hours)
4. Validate 10.4 operational (1-2 hours)
5. Begin Phase 10.5 UI work (22-30 hours)

**Benefits:**
- Full focus on reliability during observation
- No distraction from stability validation
- UI built against stable 10.4 baseline

**Risks:**
- Longer time to operator visibility UI
- Operator must use CLI during 10.4 validation

**Total Timeline:** ~27-36 hours (sequential)

---

### Option C: Build Critical UI Only, Defer Nice-to-Haves

**Rationale:**
- Operator needs objective status + safe mode toggle most
- Timeline viewer and execution inspector are nice-to-have
- Deploy minimal UI fast, iterate later

**Minimal UI Scope:**
1. Objective status distribution (6-8 hours)
2. Safe mode toggle (2-3 hours)
3. Basic objective list with filters (4-5 hours)

**Deferred:**
- Reconciliation timeline viewer (4-6 hours)
- Execution inspector (6-8 hours)
- Metrics dashboard (4-5 hours)

**Sequence:**
1. Phase 10.3 observation continues
2. Build minimal UI (12-16 hours)
3. When 10.3 window closes → deploy 10.4 + minimal UI (4 hours)
4. Iterate additional UI components as time allows

**Benefits:**
- Fast deployment of most valuable UI
- Operator visibility available immediately after 10.4
- Can iterate on advanced features later

**Total Timeline:** 16-20 hours (minimal UI) + 14-19 hours (deferred features)

---

## Recommendation: Option C (Minimal UI First)

**Why:**
1. **Delivers value fastest** — Objective status + safe mode toggle are highest ROI
2. **Low risk** — Smaller scope, easier to validate
3. **Iterative** — Can add timeline/inspector later based on actual usage
4. **Pragmatic** — Operator has CLI for deep debugging, needs dashboard for monitoring

**Minimal Phase 10.5 Scope:**
- ✅ Objective status distribution chart
- ✅ Objective list table with filters
- ✅ Safe mode toggle with confirmation dialog
- ✅ Real-time polling (simple 30s refresh)
- ❌ Timeline viewer (deferred)
- ❌ Execution inspector (deferred)
- ❌ Metrics charts (deferred)

**Implementation Timeline:**
- **Pre-Deploy Prep** (during 10.3 observation): 12-16 hours
  - Objective status component
  - Safe mode toggle
  - Basic objective list
- **Post-10.4 Deploy:** 1-2 hours
  - Integration testing
  - Production deployment

**Deferred Features (Post-Phase 10.5):**
- Phase 10.6 — Timeline Viewer (4-6 hours)
- Phase 10.7 — Execution Inspector (6-8 hours)
- Phase 10.8 — Metrics Dashboard (4-5 hours)

---

## Parallel Work Plan (If Option C Approved)

### During Phase 10.3 Observation Window (Safe to Build)

**Allowed:**
- ✅ Build frontend UI components (read-only)
- ✅ Style/layout work
- ✅ API integration (GET requests only)
- ✅ Test UI against test environment
- ✅ Prepare production deployment artifacts

**Not Allowed:**
- ❌ Modify runtime control behavior
- ❌ Change reconciliation gate logic
- ❌ Backend API changes (already complete)
- ❌ Deploy to production runtime

**Timeline:**
- **Days 1-2 (16 hours):** Build UI components
- **Day 3 (4 hours):** Integration testing in test environment
- **Post-observation (2 hours):** Deploy 10.4 + 10.5 minimal UI together

**Net Result:** When 10.3 observation closes, 10.4 + 10.5 minimal UI ready to deploy simultaneously.

---

## Phase 10.5 MVP Definition

Phase 10.5 is COMPLETE (MVP) when:

1. ✅ Objective status distribution visible in dashboard
2. ✅ Objective list filterable by status/reconciliation_status
3. ✅ Safe mode toggle operational in UI
4. ✅ Real-time updates (polling every 30s)
5. ✅ CLI tools still operational (backup visibility)

**NOT required for MVP:**
- ❌ Timeline visualization (CLI sufficient for now)
- ❌ Execution inspector (API/CLI sufficient)
- ❌ Metrics charts (API sufficient)
- ❌ WebSocket real-time (polling sufficient)

---

## Summary

**Current State:**
- Backend: 100% complete (6 API endpoints operational)
- Frontend: 0% complete (UI components not built)
- CLI: 100% complete (all diagnostic tools operational)

**Operational Capability:**
- Operator has full visibility via CLI + API (no UI)
- Production-ready backend waiting for frontend

**Recommendation:**
- **Option C:** Build minimal UI (12-16 hours) during 10.3 observation
- Deploy 10.4 + 10.5 minimal UI together when observation window closes
- Defer timeline/inspector/metrics to post-10.5 phases

**Next Decision Point:**
- If 10.3 closes cleanly → Begin 10.4 implementation + deploy 10.5 minimal UI
- If 10.3 extended → Continue UI work during extended observation
- If 10.3 fails → Defer 10.5 until stability restored

**Total Time to Minimal Operator Visibility:** 16-20 hours (including 10.4 safe mode)

---

**Status:** Assessment complete  
**Blocking Dependency:** Phase 10.3 observation window  
**Parallel Work Approved:** Frontend UI components (read-only, no runtime changes)  
**Recommendation:** Build minimal UI during observation, deploy with 10.4
