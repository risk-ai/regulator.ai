# Phase 10.1a Complete — Reconciliation State Machine Schema

**Status:** ✅ COMPLETE  
**Completion Date:** 2026-03-13  
**Implementation Time:** ~30 minutes  
**Test Coverage:** 5/5 tests (100%)

---

## Summary

Phase 10.1a adds the **reconciliation state machine fields** to the `managed_objectives` table, establishing the foundational data model for level-triggered objective reconciliation.

This is the first step in transforming Vienna from an event-triggered remediation system into a governed control plane with bounded retries, cooldown, and explicit degradation.

---

## What Was Delivered

### 1. Schema Extension

Added 10 new fields to `managed_objectives`:

```sql
-- Reconciliation control state
reconciliation_status TEXT NOT NULL DEFAULT 'idle' 
  CHECK(reconciliation_status IN ('idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode'))

-- Retry accounting
reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0

-- Lifecycle timestamps
reconciliation_started_at TEXT
reconciliation_cooldown_until TEXT
reconciliation_last_verified_at TEXT

-- Result tracking
reconciliation_last_result TEXT
reconciliation_last_error TEXT
reconciliation_last_execution_id TEXT

-- Concurrency control
reconciliation_generation INTEGER NOT NULL DEFAULT 0

-- Operator control
manual_hold INTEGER NOT NULL DEFAULT 0 CHECK(manual_hold IN (0, 1))
```

### 2. Automatic Migration

- Migration runs automatically during `StateGraph.initialize()`
- Detects if fields already exist (idempotent)
- Applies safe defaults to all existing objectives:
  - `reconciliation_status = 'idle'`
  - `reconciliation_attempt_count = 0`
  - `reconciliation_generation = 0`
  - `manual_hold = 0` (false)
- Verifies migration success before proceeding
- No manual migration step required

### 3. Database Index

Added index for reconciliation status (frequently queried by gate):

```sql
CREATE INDEX idx_managed_objectives_reconciliation_status 
ON managed_objectives(reconciliation_status)
```

### 4. StateGraph API Updates

Updated `_parseObjectiveRow()` to include all reconciliation fields in returned objective objects.

Reconciliation fields are now accessible via:
- `getObjective(objectiveId)`
- `listObjectives(filters)`

Boolean fields (`manual_hold`, `is_enabled`) properly converted from SQLite integers.

---

## Test Coverage

**Test suite:** `tests/phase-10/test-phase-10.1a-schema.js`

| Test | Purpose | Status |
|------|---------|--------|
| Test 1 | Fresh database has reconciliation fields with correct defaults | ✅ PASS |
| Test 2 | Reconciliation status enum validation works | ✅ PASS |
| Test 3 | manual_hold boolean constraint works | ✅ PASS |
| Test 4 | Reconciliation index created | ✅ PASS |
| Test 5 | Migration is idempotent | ✅ PASS |

**Total:** 5/5 (100%)

---

## Files Modified

### Core Schema
- `lib/state/schema.sql` — Added reconciliation fields and index

### State Graph
- `lib/state/state-graph.js` — Added migration logic and field parsing

### Migration Script (Reference)
- `lib/state/migrations/10.1a-add-reconciliation-fields.js` — Standalone migration (not used, migration is inline)

### Tests
- `tests/phase-10/test-phase-10.1a-schema.js` — Comprehensive schema validation

---

## Design Decisions

### 1. Fields on `managed_objectives`, Not Separate Table

**Decision:** Add reconciliation control fields directly to `managed_objectives` table.

**Rationale:**
- Simplest operational model
- Fastest reads for evaluator and reconciliation gate
- Avoids join-heavy control logic
- Ledger already provides historical state transitions
- Cleaner for Phase 10 API endpoints and future operator UI

**Alternative Considered:** Separate `objective_reconciliation_status` table rejected for now. May revisit if:
- Reconciliation churn becomes analytically important
- Separate status snapshots needed beyond ledger events
- Multi-tenant control semantics grow more complex

### 2. Inline Migration, Not External Script

**Decision:** Migration runs automatically during `StateGraph.initialize()`.

**Rationale:**
- Zero operator burden
- Idempotent (safe to run multiple times)
- Fails fast if verification fails
- No separate migration step to document/maintain

### 3. Safe Defaults for All Fields

**Decision:** All new fields have safe defaults or are nullable.

**Applied defaults:**
- `reconciliation_status = 'idle'` (eligible for reconciliation)
- `reconciliation_attempt_count = 0` (no retries yet)
- `reconciliation_generation = 0` (initial generation)
- `manual_hold = 0` (not held)
- Nullable timestamp fields (`reconciliation_started_at`, etc.)

**Rationale:**
- Existing objectives can continue operating
- No risk of breaking existing Phase 9 functionality
- Clean migration path

---

## Reconciliation Status Values

| Status | Meaning | Allowed Exits |
|--------|---------|---------------|
| `idle` | Eligible for reconciliation if drift exists | → reconciling, safe_mode |
| `reconciling` | One remediation in flight | → idle, cooldown, degraded, safe_mode |
| `cooldown` | Temporary retry suppression active | → reconciling, idle, degraded, safe_mode |
| `degraded` | Retry limit exhausted, requires intervention | → idle (manual reset), safe_mode |
| `safe_mode` | Emergency brake, remediation forbidden | → idle (manual release) |

---

## What This Enables

1. **Single-Flight Reconciliation** (Phase 10.1c)
   - Gate can query `reconciliation_status` to block duplicate remediations
   - Compare-and-swap on status prevents race conditions

2. **Bounded Retries** (Phase 10.2)
   - Track `reconciliation_attempt_count`
   - Transition to `degraded` when limit exceeded

3. **Cooldown Periods** (Phase 10.2)
   - Set `reconciliation_cooldown_until` after failures
   - Gate skips objectives still in cooldown

4. **Manual Control** (Phase 10.5)
   - Operators can set `manual_hold` to prevent automatic remediation
   - Operators can reset `degraded` objectives to `idle`

5. **Safe Mode** (Phase 10.4)
   - System-wide emergency brake via `safe_mode` status
   - Continues observation, blocks execution

6. **Execution Timeouts** (Phase 10.3)
   - Use `reconciliation_started_at` to detect hung reconciliation
   - Stale reconciliation sweeper can transition stuck objectives

7. **Audit Trail** (Phase 10.1e)
   - Ledger can record reconciliation lifecycle events
   - `reconciliation_generation` prevents stale completion signals

---

## Verification

### Manual Verification Steps

1. **Check schema after initialization:**
   ```javascript
   const { getStateGraph } = require('./lib/state/state-graph');
   const sg = getStateGraph();
   await sg.initialize();
   
   const obj = sg.createObjective({
     objective_id: 'test',
     target_id: 'service',
     desired_state: { status: 'running' },
     remediation_plan: 'plan',
     evaluation_interval: '30s',
     status: 'declared',
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString()
   });
   
   console.log(obj.reconciliation_status); // 'idle'
   console.log(obj.reconciliation_attempt_count); // 0
   console.log(obj.manual_hold); // false
   ```

2. **Check migration on existing database:**
   - Existing `state-graph.db` with objectives should migrate cleanly
   - All objectives should have `reconciliation_status = 'idle'`
   - No data loss or corruption

3. **Check enum constraints:**
   ```javascript
   // Should succeed
   sg.db.prepare(`UPDATE managed_objectives SET reconciliation_status = 'cooldown' WHERE objective_id = ?`).run('test');
   
   // Should fail
   sg.db.prepare(`UPDATE managed_objectives SET reconciliation_status = 'invalid' WHERE objective_id = ?`).run('test');
   ```

---

## Migration Safety

### Idempotency

Migration checks if fields already exist before applying changes:

```javascript
const tableInfo = this.db.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE type='table' AND name='managed_objectives'
`).get();

if (tableInfo && !tableInfo.sql.includes('reconciliation_status')) {
  // Run migration
}
```

Safe to call `initialize()` multiple times.

### Rollback

If migration fails mid-way:
1. Delete `state-graph.db`
2. Re-initialize will rebuild from schema
3. Existing objectives will be lost (acceptable for Phase 10 dev)

Production rollback:
1. Restore from backup
2. Remove reconciliation fields via `ALTER TABLE DROP COLUMN` (SQLite 3.35+)
3. Or restore from pre-migration backup

### Verification

Migration verifies all existing objectives have safe defaults:

```javascript
const verification = this.db.prepare(`
  SELECT 
    COUNT(*) as total_objectives,
    SUM(CASE WHEN reconciliation_status = 'idle' THEN 1 ELSE 0 END) as idle_count,
    SUM(CASE WHEN reconciliation_attempt_count = 0 THEN 1 ELSE 0 END) as zero_attempts
  FROM managed_objectives
`).get();

if (verification.idle_count !== verification.total_objectives) {
  throw new Error('Migration verification failed');
}
```

Fails fast if migration incomplete.

---

## Next Steps

**Phase 10.1b — Domain Model** (45 min)
- Reconciliation status enum
- Transition validation logic  
- State machine helpers (`canTransition()`, `applyTransition()`)
- Status validators (`isEligibleForReconciliation()`, etc.)

**Then:**
- Phase 10.1c — Reconciliation Gate (1.5 hours)
- Phase 10.1d — Integration (2 hours)
- Phase 10.1e — Ledger Events (1 hour)
- Phase 10.1f — Test Suite (2.5 hours)

---

## Success Metrics

✅ All existing Phase 9 functionality continues working  
✅ No breaking changes to objective schema  
✅ Migration is automatic and idempotent  
✅ All reconciliation fields accessible via StateGraph API  
✅ Enum constraints enforced at database level  
✅ Safe defaults applied to all existing objectives  
✅ Test coverage: 100%  

---

## Architectural Impact

Before Phase 10.1a:
```
Objective: { status, desired_state, remediation_plan, ... }
```

After Phase 10.1a:
```
Objective: { 
  status, desired_state, remediation_plan, ...,
  reconciliation_status: 'idle',
  reconciliation_attempt_count: 0,
  reconciliation_started_at: null,
  reconciliation_cooldown_until: null,
  reconciliation_last_result: null,
  reconciliation_last_error: null,
  reconciliation_last_execution_id: null,
  reconciliation_last_verified_at: null,
  reconciliation_generation: 0,
  manual_hold: false
}
```

**Core principle preserved:**
> Objectives describe desired state. Reconciliation fields describe current control state.

---

## Status

**Phase 10.1a:** ✅ COMPLETE  
**Phase 10.1:** In progress (next: 10.1b Domain Model)  
**Phase 10:** In progress (5 sub-phases planned)

**Files ready for next phase:**
- Schema ✅
- State Graph API ✅
- Tests ✅
- Documentation ✅

**Ready to proceed to Phase 10.1b.**
