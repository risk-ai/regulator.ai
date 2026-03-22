# Phase 9.3 Complete — State Graph Objectives

**Status:** ✅ COMPLETE  
**Date:** 2026-03-13  
**Test Coverage:** 25/25 (100%)

---

## What Was Built

### Three New Tables

**1. `managed_objectives`** — Canonical objective definitions + current status

Schema:
```sql
CREATE TABLE managed_objectives (
  objective_id TEXT PRIMARY KEY,
  objective_type TEXT,        -- maintain_health, enforce_availability, etc.
  target_type TEXT,           -- service, endpoint, provider, resource, system
  target_id TEXT,             -- Entity being managed
  environment TEXT,           -- prod, test
  status TEXT,                -- 12 lifecycle states
  desired_state_json TEXT,    -- Machine-evaluable state spec
  remediation_plan TEXT,      -- Plan ID to trigger on violation
  evaluation_interval_seconds INTEGER,
  verification_strength TEXT, -- service_health, http_healthcheck, etc.
  priority INTEGER,
  owner TEXT,
  context_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  last_evaluated_at TEXT,
  last_violation_at TEXT,
  last_restored_at TEXT,
  is_enabled INTEGER
);
```

**2. `managed_objective_evaluations`** — Periodic observation results

Schema:
```sql
CREATE TABLE managed_objective_evaluations (
  evaluation_id TEXT PRIMARY KEY,
  objective_id TEXT,
  evaluation_timestamp TEXT,
  observed_state_json TEXT,      -- Actual observed state
  objective_satisfied INTEGER,   -- Boolean
  violation_detected INTEGER,    -- Boolean
  action_taken TEXT,             -- none, monitoring, remediation_triggered, etc.
  result_summary TEXT,
  triggered_plan_id TEXT,
  triggered_execution_id TEXT,
  created_at TEXT
);
```

**3. `managed_objective_history`** — State transition audit trail

Schema:
```sql
CREATE TABLE managed_objective_history (
  history_id TEXT PRIMARY KEY,
  objective_id TEXT,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  metadata_json TEXT,
  event_timestamp TEXT,
  created_at TEXT
);
```

---

## State Graph Methods

### Objective CRUD

- `createObjective(objective)` — Insert + validate via schema
- `getObjective(objectiveId)` — Retrieve by ID
- `listObjectives(filters)` — Query with optional filters (status, target_id, target_type, is_enabled)
- `updateObjective(objectiveId, updates)` — General updates (remediation_plan, priority, etc.)
- `updateObjectiveStatus(objectiveId, newStatus, reason, metadata)` — **State machine validated transitions**

### Evaluation & History

- `recordObjectiveEvaluation(evaluation)` — Persist evaluation result
- `recordObjectiveTransition(objectiveId, fromStatus, toStatus, reason, metadata)` — Record transition in history
- `listObjectiveHistory(objectiveId, limit)` — Get transition history (DESC order)
- `listObjectiveEvaluations(objectiveId, limit)` — Get evaluation history (DESC order)

### Helpers

- `_parseObjectiveRow(row)` — Convert DB row → Objective object (JSON parsing, boolean conversion)
- `_parseInterval(interval)` — Convert "30s"/"5m"/"1h" → seconds

---

## Design Constraints Enforced

### 1. State Machine Validation

**`updateObjectiveStatus()` enforces state machine rules:**

```javascript
if (!isValidTransition(objective.status, newStatus)) {
  const allowed = getAllowedTransitions(objective.status);
  throw new Error(
    `Invalid transition: ${objective.status} → ${newStatus}. ` +
    `Allowed: [${allowed.join(', ')}]`
  );
}
```

Invalid transitions are **rejected** before database write.

### 2. Deterministic Timestamp Ordering

**Challenge:** Fast transitions can share the same millisecond timestamp.

**Solution:** Multi-column sort for history queries:

```sql
ORDER BY event_timestamp DESC, created_at DESC, ROWID DESC
```

Ensures **deterministic ordering** even for same-millisecond events.

### 3. Environment Isolation

All objectives scoped to environment (prod/test):

```javascript
let query = 'SELECT * FROM managed_objectives WHERE environment = ?';
const params = [this.environment];
```

Tests cannot pollute production state.

### 4. Automatic Timestamp Updates

- `last_violation_at` set when status → `violation_detected`
- `last_restored_at` set when status → `restored`
- `last_evaluated_at` set on every evaluation
- `updated_at` set on every objective update

---

## Naming Resolution

**Problem:** Existing `objectives` table (task tracking) conflicted with Phase 9 objectives (declarative system management).

**Solution:** Renamed Phase 9 tables to `managed_objectives` to avoid breaking existing code.

**Rationale:**
- Old `objectives` = tasks, milestones, projects (work tracking)
- New `managed_objectives` = declarative system state management (maintain_health, enforce_availability)
- Avoids breaking changes to existing State Graph code

**Future cleanup:** Consider renaming old `objectives` → `tasks` in Phase 10.

---

## Test Coverage (25/25)

### Category A: Objective Creation (4/4)
- Create objective persists to database
- Create objective with custom fields
- Create objective rejects invalid objective
- Create objective sets environment correctly

### Category B: Objective Retrieval (6/6)
- getObjective retrieves by ID
- getObjective returns null for missing ID
- listObjectives returns all objectives
- listObjectives filters by status
- listObjectives filters by target_id
- listObjectives filters by is_enabled

### Category C: Objective Updates (3/3)
- updateObjective modifies allowed fields
- updateObjective preserves read-only fields
- updateObjective updates timestamp

### Category D: Status Transitions (5/5)
- updateObjectiveStatus transitions to valid state
- updateObjectiveStatus rejects invalid transition
- updateObjectiveStatus records history
- updateObjectiveStatus updates last_violation_at
- updateObjectiveStatus updates last_restored_at

### Category E: Evaluations (4/4)
- recordObjectiveEvaluation persists evaluation
- recordObjectiveEvaluation updates last_evaluated_at
- recordObjectiveEvaluation stores triggered_plan_id
- listObjectiveEvaluations limits results

### Category F: History (3/3)
- recordObjectiveTransition persists history
- listObjectiveHistory returns chronological order
- listObjectiveHistory limits results

---

## Integration Points

**Phase 9.1 + 9.2 (Schema + State Machine):**
- ✅ `validateObjective()` called in `createObjective()`
- ✅ `isValidTransition()` enforced in `updateObjectiveStatus()`
- ✅ `OBJECTIVE_STATUS` enum used for status values
- ✅ `TRANSITION_REASON` enum used for history reasons

**State Graph (existing tables):**
- ✅ Follows same patterns as services, providers, incidents
- ✅ Environment-aware (prod/test isolation)
- ✅ Foreign key cascades (DELETE CASCADE for evaluations/history)
- ✅ Indexes on high-query columns (status, target, environment, timestamp)

**Not yet connected (next phases):**
- Phase 9.4 Evaluator — Will call `recordObjectiveEvaluation()`, `updateObjectiveStatus()`
- Phase 9.5 Plan Trigger — Will read `remediation_plan`, trigger execution
- Phase 9.6 Ledger Events — Will emit `objective_declared`, `objective_restored`, etc.

---

## Files Delivered

**Schema:**
- `lib/state/schema.sql` (updated with 3 new tables)

**State Graph:**
- `lib/state/state-graph.js` (9 new methods + 2 helpers)

**Tests:**
- `tests/phase-9/test-state-graph-objectives.js` (25 comprehensive tests)

**Documentation:**
- `PHASE_9.3_COMPLETE.md` (this file)

---

## Validation Commands

```bash
# Run Phase 9.3 tests
node tests/phase-9/test-state-graph-objectives.js

# Inspect schema
echo "SELECT sql FROM sqlite_master WHERE name LIKE 'managed_objective%';" | \
  sqlite3 ~/.openclaw/runtime/test/state/state-graph.db

# Usage example
node -e "
const { StateGraph } = require('./lib/state/state-graph');
const { createObjective } = require('./lib/core/objective-schema');
const { OBJECTIVE_STATUS, TRANSITION_REASON } = require('./lib/core/objective-state-machine');

async function demo() {
  const sg = new StateGraph({ environment: 'test' });
  await sg.initialize();
  
  const obj = createObjective({
    target_id: 'openclaw-gateway',
    desired_state: { service_active: true },
    remediation_plan: 'gateway_recovery'
  });
  
  sg.createObjective(obj);
  console.log('Created:', obj.objective_id);
  
  sg.updateObjectiveStatus(obj.objective_id, 'monitoring', 'evaluation_started');
  console.log('Transitioned to monitoring');
  
  const history = sg.listObjectiveHistory(obj.objective_id);
  console.log('History:', history.length, 'entries');
  
  sg.close();
}

demo();
"
```

---

## Phase 9 Summary

**Completed:**
- ✅ 9.1 Objective Schema (22 tests)
- ✅ 9.2 Objective State Machine (25 tests)
- ✅ 9.3 State Graph Persistence (25 tests)

**Total:** 72/72 tests passing (100%)

**Next:**
- Phase 9.4 — Objective Evaluator (observation + violation detection)
- Phase 9.5 — Plan Trigger Integration (objective → plan → execution)
- Phase 9.6 — Ledger Events (objective lifecycle events)
- Phase 9.7 — End-to-End Tests (declare → auto-remediate → verify)

---

## Status: ✅ PRODUCTION-READY

Phase 9.3 complete, tested, and ready for evaluator implementation (Phase 9.4).

**No blockers. State Graph persistence layer operational.**
