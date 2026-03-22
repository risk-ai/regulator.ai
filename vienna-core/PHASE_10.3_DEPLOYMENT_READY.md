# Phase 10.3 — Deployment Ready

**Date:** 2026-03-13 21:50 EDT  
**Status:** ✅ Production-ready  
**Test Coverage:** 18/18 passing (100%)

---

## Deployment Summary

**What's being deployed:**
- Execution timeout enforcement with time-bounded execution authority
- Two-stage termination (cooperative → forced)
- Startup sweep for expired persisted attempts
- Stale completion rejection
- Timeout → circuit breaker integration

**Core invariant:**
> Admission grants bounded authority in time.

---

## Pre-Deployment Checklist

- [x] **Test suite:** 18/18 passing (100%)
- [x] **Schema migration:** Validated on prod + test
- [x] **Harness issues:** All resolved
- [x] **Rollback plan:** Confirmed
- [x] **Documentation:** Complete

---

## Deployment Steps

### 1. Database Migration ✅ COMPLETE

**Status:** Already applied to prod + test

```bash
# Test database
VIENNA_ENV=test node scripts/run-migration-10.3.js

# Production database  
VIENNA_ENV=prod node scripts/run-migration-10.3.js
```

**Columns added (8):**
- active_attempt_id
- execution_started_at
- execution_deadline_at
- cancel_requested_at
- execution_terminated_at
- last_terminal_reason
- last_timeout_at
- termination_result

**Migration is idempotent:** Safe to re-run

---

### 2. Code Deployment

**Files to deploy:**

**Production code:**
- `lib/state/state-graph.js` (5 fixes)
- `lib/core/execution-watchdog.js` (1 fix + new functions)
- `lib/core/failure-policy-schema.js` (KillStrategy enum)

**Migration scripts:**
- `lib/state/migrations/10.3-add-execution-timeout-fields.js`
- `scripts/run-migration-10.3.js`

**Test code (optional):**
- `tests/phase-10/test-phase-10.3-execution-timeouts.test.js`

**Total:** ~600 lines production code, ~700 lines tests

---

### 3. Post-Deployment Validation

**Run after deployment:**

```bash
# 1. Verify test suite still passes
cd vienna-core
npm test -- tests/phase-10/test-phase-10.3-execution-timeouts.test.js

# 2. Check production database schema
VIENNA_ENV=prod node -e "
const {getStateGraph} = require('./lib/state/state-graph');
(async () => {
  const sg = getStateGraph();
  await sg.initialize();
  const cols = sg.db.prepare('PRAGMA table_info(managed_objectives)').all();
  const timeoutCols = cols.filter(c => c.name.includes('execution') || c.name.includes('terminal'));
  console.log('Timeout columns:', timeoutCols.map(c => c.name));
})();
"

# 3. Verify no objectives stuck in bad state
VIENNA_ENV=prod node -e "
const {getStateGraph} = require('./lib/state/state-graph');
(async () => {
  const sg = getStateGraph();
  await sg.initialize();
  const stuck = sg.listObjectives({reconciliation_status: 'reconciling'});
  console.log('Objectives in reconciling:', stuck.length);
  if (stuck.length > 0) {
    console.log('Stuck objectives:', stuck.map(o => ({
      id: o.objective_id,
      attempt: o.active_attempt_id,
      deadline: o.execution_deadline_at
    })));
  }
})();
"
```

**Expected results:**
- 18/18 tests passing
- 8 timeout columns exist
- 0 objectives stuck in reconciling (or all have valid active_attempt_id + deadline)

---

## Rollback Plan

**If issues detected:**

1. **Stop watchdog service** (if running):
   ```javascript
   const { stopWatchdog } = require('./lib/core/execution-watchdog');
   stopWatchdog();
   ```

2. **Revert code changes**:
   - Restore previous versions of modified files
   - New timeout fields will remain in database (safe to ignore)

3. **Database state**:
   - No rollback needed (columns are additive)
   - Existing functionality unaffected
   - New fields will be NULL for old objectives

**Rollback impact:** None (additive changes only)

---

## Known Limitations

1. **Watchdog service not auto-started**
   - Execution timeout enforcement requires explicit `startWatchdog()` call
   - Without watchdog, timeouts are detected only on next evaluation cycle
   - Startup sweep runs once on watchdog start

2. **Test isolation**
   - Tests must run with `VIENNA_ENV=test` set
   - Migration must be run on test database before test execution
   - Prod database migration already complete

3. **Grace period behavior**
   - Cooperative → forced transition requires 2 watchdog cycles
   - Default grace period: 10 seconds
   - Configurable via policy execution.grace_period_seconds

---

## Post-Deployment Monitoring

**Watch for:**

1. **Objectives entering cooldown** (expected behavior)
   ```sql
   SELECT objective_id, reconciliation_status, last_terminal_reason, last_timeout_at
   FROM managed_objectives
   WHERE reconciliation_status = 'cooldown'
   AND last_terminal_reason = 'timed_out';
   ```

2. **Objectives stuck in reconciling** (potential issue)
   ```sql
   SELECT objective_id, active_attempt_id, execution_deadline_at,
          CASE 
            WHEN execution_deadline_at < datetime('now') THEN 'EXPIRED'
            ELSE 'ACTIVE'
          END as status
   FROM managed_objectives
   WHERE reconciliation_status = 'reconciling'
   AND active_attempt_id IS NOT NULL;
   ```

3. **Ledger events** (verify timeout events recorded)
   ```sql
   SELECT event_type, COUNT(*) as count
   FROM execution_ledger_events
   WHERE event_type LIKE '%timeout%' OR event_type LIKE '%terminated%'
   GROUP BY event_type;
   ```

---

## Success Criteria

**Deployment successful if:**

1. ✅ All Phase 10.3 tests pass
2. ✅ No objectives stuck in invalid reconciliation state
3. ✅ Timeout events appear in execution ledger (if watchdog running)
4. ✅ Failure accounting integration working (timeouts → cooldown)
5. ✅ No database errors in logs

---

## Next Steps After Deployment

1. **Validate Phase 10.3** (run full test suite + production checks)
2. **Monitor for 24 hours** (check for unexpected behavior)
3. **Begin Phase 10.4** (Safe Mode — fleet-wide pause capability)

**Phase 10.4 estimate:** 6-8 hours

---

## Files Modified (Complete List)

### Production Code

**lib/state/state-graph.js:**
- Line 2434: Replaced UUID with timestamp ID (recordObjectiveTransition)
- Line 1492: Auto-generate event_id + sequence_num (appendLedgerEvent)
- Line 2527: Added 8 Phase 10.3 fields to _parseObjectiveRow
- Line 2289: Added 8 Phase 10.3 fields to updateObjective allowedFields
- Line 627: Added 8 Phase 10.3 fields to original updateObjective allowedFields
- Line 2257: Added reconciliation_status filter to listObjectives

**lib/core/execution-watchdog.js:**
- Line 85-160: Fixed reconciliation_status update logic in applyFailedAttemptAccounting
- Line 163-172: Fixed clearActiveAttemptFields to use updateObjective
- Line 185-195: Fixed handleExpiredLease cancel request to use updateObjective
- Line 220-230: Fixed handleExpiredLease termination to use updateObjective

**lib/core/failure-policy-schema.js:**
- Added KillStrategy enum
- Added execution timeout validation

### Test Code

**tests/phase-10/test-phase-10.3-execution-timeouts.test.js:**
- Lines 127-145: Fixed test B1 (added cancel_requested_at)
- Lines 270-292: Fixed test C1 (added cancel_requested_at beyond grace)
- Lines 310-332: Fixed test C2 (added cancel_requested_at beyond grace)
- Lines 490-515: Fixed test E1 (added cancel_requested_at beyond grace)

### Migration Scripts

**lib/state/migrations/10.3-add-execution-timeout-fields.js:**
- Made migration idempotent (skip existing columns)

**scripts/run-migration-10.3.js:**
- Respect VIENNA_ENV environment variable
- Added column verification

---

## Contact

**For deployment issues:**
- Check `PHASE_10.3_TEST_VALIDATION_COMPLETE.md` for debugging details
- Review execution ledger for timeout events
- Verify watchdog service status if timeout enforcement not working

**Emergency rollback:**
- Stop watchdog: `stopWatchdog()`
- Revert code changes
- No database rollback needed (additive schema changes)

---

**Status:** Ready for production deployment ✅
