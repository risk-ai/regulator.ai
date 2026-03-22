# Phase 10.4 Implementation Plan — Safe Mode

**Status:** DESIGN ONLY (Blocked until Phase 10.3 observation window closes cleanly)  
**Estimated Time:** 3.5 hours  
**Prerequisite:** Phase 10.3 classified as STABLE

---

## Scope

### What WILL Be Built in Phase 10.4

1. **Safe Mode flag storage** (runtime_context table)
2. **Gate admission check** (safe mode veto before all other checks)
3. **CLI control tool** (enable/disable/status commands)
4. **Ledger integration** (safe mode lifecycle events)
5. **Test suite** (4 core tests + integration)
6. **Documentation** (operator runbook entry)

**Core capability delivered:**
> Operator can globally suspend autonomous reconciliation with a single command.

---

### What Will NOT Be Built in Phase 10.4

1. **Dashboard UI integration** — Deferred to Phase 10.5
2. **Automated safe mode triggers** — Manual operator control only
3. **Safe mode levels** (read-only vs full suspension) — Deferred to Phase 10.6 if needed
4. **Per-objective safe mode overrides** — Global control only
5. **Auto-release after timeout** — Requires explicit operator release
6. **Verification suspension** — Verification continues during safe mode

**Rationale:** Simple on/off control for Phase 10.4. Advanced features only if operational need emerges.

---

## Schema Plan

### Decision: Use `runtime_context` Table

**Rationale:**
- Table already exists
- Key-value storage supports safe mode flags
- No migration required
- Consistent with other runtime flags
- Simple to query and update

**Alternative considered:** New `safe_mode_state` table with full history tracking
**Why rejected:** Over-engineered for Phase 10.4. Ledger events provide history. Can migrate later if needed.

---

### Schema Implementation

**Keys to add:**

```sql
-- Safe mode enabled flag
INSERT OR REPLACE INTO runtime_context (key, value_bool, value_text) 
VALUES ('safe_mode.enabled', 0, NULL);

-- Reason for safe mode
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.reason', NULL, NULL);

-- Who enabled safe mode
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.entered_by', NULL, NULL);

-- When safe mode was enabled
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.entered_at', NULL, NULL);

-- When safe mode was last released
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.released_at', NULL, NULL);

-- Who released safe mode
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.released_by', NULL, NULL);
```

**Bootstrap script:** Add to `scripts/bootstrap-state-graph.js`

**Query methods:** Use existing `getRuntimeContext()` / `setRuntimeContext()`

**No schema changes required** — Use existing State Graph API

---

## File-by-File Implementation Plan

### 1. `lib/core/reconciliation-gate.js` (MODIFY)

**Current admission logic location:** `requestReconciliation()` method

**Change required:** Add safe mode check as first gate condition

**Implementation:**

```javascript
async requestReconciliation(objectiveId) {
  const objective = this.stateGraph.getObjective(objectiveId);
  
  // ============ NEW: Safe Mode Check (Highest Priority) ============
  const safeModeEnabled = this.stateGraph.getRuntimeContext('safe_mode.enabled');
  if (safeModeEnabled && safeModeEnabled.value_bool === 1) {
    const reason = this.stateGraph.getRuntimeContext('safe_mode.reason')?.value_text || 'safe_mode_active';
    
    // Log skip event
    this.stateGraph.recordObjectiveTransition(
      objectiveId,
      objective.status,
      objective.status, // No state change
      'objective.reconciliation.skipped',
      { 
        skip_reason: 'safe_mode',
        safe_mode_reason: reason,
        generation: objective.generation
      }
    );
    
    return {
      admitted: false,
      skip_reason: 'safe_mode',
      safe_mode_reason: reason,
      generation: objective.generation,
      timestamp: new Date().toISOString()
    };
  }
  // ============ End Safe Mode Check ============
  
  // Continue with existing admission logic...
  if (objective.reconciliation_status !== 'idle' && 
      objective.reconciliation_status !== 'cooldown') {
    // ... existing logic
  }
}
```

**Lines changed:** ~25 lines added  
**Risk:** Low (guard condition before existing logic, early return)  
**Test impact:** Existing tests should pass unchanged

---

### 2. `cli/vienna-safe-mode.js` (NEW)

**Purpose:** CLI tool for operator control

**Commands:**
- `enable --reason "incident mitigation"`
- `disable`
- `status`

**Implementation structure:**

```javascript
#!/usr/bin/env node
const { getStateGraph } = require('../lib/state/state-graph');

async function enableSafeMode(reason, by = 'operator') {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  // Validation
  if (!reason || reason.trim() === '') {
    console.error('Error: --reason required');
    process.exit(1);
  }
  
  // Set flags
  stateGraph.setRuntimeContext('safe_mode.enabled', true);
  stateGraph.setRuntimeContext('safe_mode.reason', reason);
  stateGraph.setRuntimeContext('safe_mode.entered_by', by);
  stateGraph.setRuntimeContext('safe_mode.entered_at', new Date().toISOString());
  
  // Log event (optional system-level event table, or skip for MVP)
  
  // Output
  console.log('🔒 SAFE MODE ENABLED\n');
  console.log(`Reason:       ${reason}`);
  console.log(`Enabled by:   ${by}`);
  console.log(`Timestamp:    ${new Date().toISOString()}\n`);
  console.log('All autonomous reconciliation suspended.');
  console.log('Re-enable with: node cli/vienna-safe-mode.js disable');
}

async function disableSafeMode(by = 'operator') {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  // Get current state
  const enabled = stateGraph.getRuntimeContext('safe_mode.enabled');
  if (!enabled || enabled.value_bool !== 1) {
    console.log('Safe Mode already disabled.');
    return;
  }
  
  const enteredAt = stateGraph.getRuntimeContext('safe_mode.entered_at')?.value_text;
  const duration = enteredAt ? 
    (new Date() - new Date(enteredAt)) / 1000 : 0;
  
  // Disable
  stateGraph.setRuntimeContext('safe_mode.enabled', false);
  stateGraph.setRuntimeContext('safe_mode.released_by', by);
  stateGraph.setRuntimeContext('safe_mode.released_at', new Date().toISOString());
  
  // Output
  console.log('✅ SAFE MODE DISABLED\n');
  console.log(`Released by:  ${by}`);
  console.log(`Duration:     ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s\n`);
  console.log('Autonomous reconciliation resumed.');
}

async function showStatus() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  const enabled = stateGraph.getRuntimeContext('safe_mode.enabled');
  const reason = stateGraph.getRuntimeContext('safe_mode.reason')?.value_text;
  const enteredBy = stateGraph.getRuntimeContext('safe_mode.entered_by')?.value_text;
  const enteredAt = stateGraph.getRuntimeContext('safe_mode.entered_at')?.value_text;
  
  if (enabled && enabled.value_bool === 1) {
    console.log('🔒 Safe Mode:  ENABLED');
    console.log(`   Reason:     ${reason || 'N/A'}`);
    console.log(`   Enabled by: ${enteredBy || 'N/A'}`);
    console.log(`   Since:      ${enteredAt || 'N/A'}`);
  } else {
    console.log('✅ Safe Mode:  DISABLED');
    if (enteredAt) {
      console.log(`   Last enabled: ${enteredAt} (${enteredBy || 'N/A'})`);
      console.log(`   Last reason:  ${reason || 'N/A'}`);
    }
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  if (command === 'enable') {
    const reasonIdx = args.indexOf('--reason');
    const reason = reasonIdx !== -1 ? args[reasonIdx + 1] : null;
    await enableSafeMode(reason);
  } else if (command === 'disable') {
    await disableSafeMode();
  } else if (command === 'status') {
    await showStatus();
  } else {
    console.log('Usage:');
    console.log('  node cli/vienna-safe-mode.js enable --reason "incident mitigation"');
    console.log('  node cli/vienna-safe-mode.js disable');
    console.log('  node cli/vienna-safe-mode.js status');
    process.exit(1);
  }
})();
```

**Lines:** ~150 lines  
**Risk:** Low (read-only queries + simple flag updates)  
**Dependencies:** State Graph API only

---

### 3. `scripts/bootstrap-state-graph.js` (MODIFY)

**Add safe mode defaults to bootstrap:**

```javascript
// After existing runtime_context entries

// Safe mode defaults
stateGraph.setRuntimeContext('safe_mode.enabled', false);
stateGraph.setRuntimeContext('safe_mode.reason', null);
stateGraph.setRuntimeContext('safe_mode.entered_by', null);
stateGraph.setRuntimeContext('safe_mode.entered_at', null);
stateGraph.setRuntimeContext('safe_mode.released_at', null);
stateGraph.setRuntimeContext('safe_mode.released_by', null);

console.log('✓ Safe mode defaults configured');
```

**Lines changed:** ~10 lines  
**Risk:** None (bootstrap script)

---

### 4. `lib/state/state-graph.js` (NO CHANGES REQUIRED)

**Rationale:** Existing `getRuntimeContext()` / `setRuntimeContext()` methods support safe mode flags

**Validation:** Verify methods handle boolean values correctly

---

### 5. `tests/phase-10/test-phase-10.4-safe-mode.test.js` (NEW)

**Test structure:**

```javascript
const { getStateGraph } = require('../../lib/state/state-graph');
const ReconciliationGate = require('../../lib/core/reconciliation-gate');

describe('Phase 10.4 — Safe Mode', () => {
  let stateGraph, gate;
  
  beforeEach(async () => {
    process.env.VIENNA_ENV = 'test';
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    gate = new ReconciliationGate(stateGraph);
    
    // Ensure safe mode disabled
    stateGraph.setRuntimeContext('safe_mode.enabled', false);
  });
  
  describe('Test 1: Safe Mode Blocks Admission', () => {
    it('should deny admission when safe mode enabled', async () => {
      // Create objective
      const objId = stateGraph.createObjective({...});
      
      // Enable safe mode
      stateGraph.setRuntimeContext('safe_mode.enabled', true);
      stateGraph.setRuntimeContext('safe_mode.reason', 'test incident');
      
      // Request reconciliation
      const result = await gate.requestReconciliation(objId);
      
      // Verify denial
      expect(result.admitted).toBe(false);
      expect(result.skip_reason).toBe('safe_mode');
      expect(result.safe_mode_reason).toBe('test incident');
    });
  });
  
  describe('Test 2: Safe Mode Does Not Alter Running Reconciliation', () => {
    it('should not affect already-admitted reconciliation', async () => {
      const objId = stateGraph.createObjective({...});
      
      // Admit reconciliation
      const result1 = await gate.requestReconciliation(objId);
      expect(result1.admitted).toBe(true);
      
      // Enable safe mode
      stateGraph.setRuntimeContext('safe_mode.enabled', true);
      
      // Objective still reconciling
      const obj = stateGraph.getObjective(objId);
      expect(obj.reconciliation_status).toBe('reconciling');
      
      // But new admissions denied
      const objId2 = stateGraph.createObjective({...});
      const result2 = await gate.requestReconciliation(objId2);
      expect(result2.admitted).toBe(false);
      expect(result2.skip_reason).toBe('safe_mode');
    });
  });
  
  describe('Test 3: Safe Mode Logs Skip Events', () => {
    it('should record skip event with safe mode reason', async () => {
      const objId = stateGraph.createObjective({...});
      
      // Enable safe mode
      stateGraph.setRuntimeContext('safe_mode.enabled', true);
      stateGraph.setRuntimeContext('safe_mode.reason', 'database maintenance');
      
      // Request reconciliation
      await gate.requestReconciliation(objId);
      
      // Check history
      const history = stateGraph.listObjectiveHistory(objId);
      const skipEvent = history.find(e => 
        e.reason === 'objective.reconciliation.skipped' &&
        e.metadata?.skip_reason === 'safe_mode'
      );
      
      expect(skipEvent).toBeDefined();
      expect(skipEvent.metadata.safe_mode_reason).toBe('database maintenance');
    });
  });
  
  describe('Test 4: Safe Mode Release Restores Admission', () => {
    it('should allow admission after safe mode disabled', async () => {
      const objId = stateGraph.createObjective({...});
      
      // Enable then disable
      stateGraph.setRuntimeContext('safe_mode.enabled', true);
      stateGraph.setRuntimeContext('safe_mode.enabled', false);
      
      // Admission should work
      const result = await gate.requestReconciliation(objId);
      expect(result.admitted).toBe(true);
    });
  });
  
  describe('Integration Test: Full Loop with Safe Mode', () => {
    it('should skip evaluation when safe mode enabled', async () => {
      const objId = stateGraph.createObjective({...});
      
      // Enable safe mode
      stateGraph.setRuntimeContext('safe_mode.enabled', true);
      stateGraph.setRuntimeContext('safe_mode.reason', 'full loop test');
      
      // Run evaluation loop (uses gate internally)
      const coordinator = new ObjectiveCoordinator(stateGraph);
      const results = await coordinator.evaluateAll();
      
      // Verify skip
      const objResult = results.find(r => r.objective_id === objId);
      expect(objResult.outcome).toBe('DRIFT_DETECTED_SKIPPED_SAFE_MODE');
    });
  });
});
```

**Lines:** ~250 lines  
**Test count:** 5 tests (4 core + 1 integration)  
**Dependencies:** Reconciliation gate, State Graph, Objective coordinator

---

## Control Logic Enforcement

### Where Safe Mode Is Checked

**Primary enforcement point:** `reconciliation-gate.js` in `requestReconciliation()`

**Enforcement hierarchy:**
```
1. Safe Mode (global veto) ← NEW
2. Already reconciling check
3. Cooldown check
4. Degraded check
5. Admission granted
```

**Why this order:** Safe Mode is highest-priority control, should block even cooldown checks

---

### Ledger Integration

**Events to record:**

1. **Per-objective skip events** (already implemented in gate logic above)
   - Event: `objective.reconciliation.skipped`
   - Metadata: `{ skip_reason: 'safe_mode', safe_mode_reason: '...' }`
   - Table: `managed_objective_history`

2. **System-level safe mode events** (optional for Phase 10.4)
   - Events: `system.safe_mode.entered`, `system.safe_mode.released`
   - Table: Could use `managed_objective_history` with `objective_id=NULL` OR new `system_events` table
   - **Decision:** Skip for Phase 10.4 MVP. Per-objective skip events provide audit trail. Can add system events in Phase 10.5 if needed.

**Rationale for skipping system events:** Per-objective skips already provide complete audit trail. System events would be nice-to-have but not required for core functionality.

---

## Test Plan

### Unit Tests (4 core tests)

1. **Safe Mode Blocks Admission**
   - Enable safe mode → Request reconciliation → Verify denial
   - Pass criteria: `admitted=false`, `skip_reason='safe_mode'`

2. **Safe Mode Does Not Alter Running Reconciliation**
   - Admit → Enable safe mode → Verify still reconciling
   - Pass criteria: Existing reconciliation continues, new admissions denied

3. **Safe Mode Logs Skip Events**
   - Enable safe mode → Request reconciliation → Check history
   - Pass criteria: Skip event with safe_mode reason in ledger

4. **Safe Mode Release Restores Admission**
   - Enable → Disable → Request reconciliation
   - Pass criteria: Admission granted after release

---

### Integration Tests (1 test)

5. **Full Loop with Safe Mode**
   - Enable safe mode → Run evaluation coordinator → Verify skip outcome
   - Pass criteria: Coordinator returns `DRIFT_DETECTED_SKIPPED_SAFE_MODE`

---

### Manual Validation Tests

6. **CLI Enable/Disable**
   - Run `vienna-safe-mode.js enable --reason "test"`
   - Verify `safe_mode.enabled = true` in State Graph
   - Run `vienna-safe-mode.js disable`
   - Verify `safe_mode.enabled = false`

7. **CLI Status Output**
   - Enable → Run status → Verify output shows ENABLED
   - Disable → Run status → Verify output shows DISABLED

8. **End-to-End Operational Test**
   - Create real objective (e.g., `maintain_gateway_health`)
   - Enable safe mode
   - Wait for evaluation cycle
   - Verify no reconciliation attempted
   - Disable safe mode
   - Verify reconciliation resumes

---

## Rollout Plan

### Phase 1: Implementation (3 hours)

**Step 1.1: Schema Bootstrap** (15 min)
- Modify `scripts/bootstrap-state-graph.js`
- Add safe mode defaults
- Run bootstrap in test environment
- Verify keys created

**Step 1.2: Gate Integration** (45 min)
- Modify `lib/core/reconciliation-gate.js`
- Add safe mode check before existing logic
- Test with isolated unit test
- Verify no regression in existing tests

**Step 1.3: CLI Tool** (1 hour)
- Create `cli/vienna-safe-mode.js`
- Implement enable/disable/status commands
- Add validation (reason required)
- Test manually in test environment

**Step 1.4: Test Suite** (1 hour)
- Create `tests/phase-10/test-phase-10.4-safe-mode.test.js`
- Implement 5 test cases
- Run in test environment (`VIENNA_ENV=test npm test`)
- Verify 5/5 passing

---

### Phase 2: Validation (30 min)

**Step 2.1: Regression Check**
- Run full Phase 10 test suite
- Verify no regressions in 10.1, 10.2, 10.3 tests
- Expected: All prior tests still passing

**Step 2.2: Manual Functional Test**
- Enable safe mode via CLI
- Create test objective
- Verify admission denied
- Disable safe mode
- Verify admission granted

**Step 2.3: Ledger Audit**
- Enable/disable safe mode
- Trigger evaluation cycle
- Inspect `managed_objective_history` table
- Verify skip events recorded with metadata

---

### Phase 3: Deploy (10 min)

**Step 3.1: Production Bootstrap**
```bash
VIENNA_ENV=prod node scripts/bootstrap-state-graph.js
```
- Verify safe mode keys created in production State Graph
- Default: `safe_mode.enabled = false`

**Step 3.2: Smoke Test**
```bash
node cli/vienna-safe-mode.js status
```
- Expected: "Safe Mode: DISABLED"

**Step 3.3: Production Readiness Check**
- Verify CLI executable
- Verify gate integration deployed
- Verify no operational impact (safe mode disabled by default)

---

### Phase 4: Post-Deploy Checks (10 min)

**Step 4.1: Operational Baseline**
- Check dashboard objective status
- Verify autonomous reconciliation continues normally
- Expected: No change from pre-deploy behavior

**Step 4.2: Emergency Test** (optional, if time allows)
- Enable safe mode briefly
- Verify evaluation coordinator skips reconciliation
- Disable safe mode
- Verify reconciliation resumes
- **Only if no production objectives are time-sensitive**

**Step 4.3: Documentation Update**
- Update `VIENNA_RUNTIME_STATE.md` → Phase 10.4 COMPLETE
- Update `VIENNA_DAILY_STATE_LOG.md` → Safe Mode deployed
- Create operator runbook entry (usage guide)

---

## Rollback Plan

### If Critical Issue Detected

**Step 1: Immediate Safe Mode Disable**
```bash
node cli/vienna-safe-mode.js disable
```
- Ensures no ongoing admission blocks

**Step 2: Revert Gate Logic**
- Comment out safe mode check in `reconciliation-gate.js`
- Restart Vienna runtime
- Verify admission working

**Step 3: Investigation**
- Capture ledger events
- Inspect State Graph
- Identify root cause

**Step 4: Fix or Defer**
- If quick fix available → Deploy fix → Re-test
- If complex issue → Defer Phase 10.4, continue with 10.3 baseline

---

## Risk Assessment

### Low Risk Changes

- ✅ Schema: Using existing `runtime_context` table (no migration)
- ✅ CLI tool: Standalone script, no runtime impact
- ✅ Test suite: Test environment only

### Medium Risk Changes

- ⚠️ Gate integration: Adds new logic to admission path
  - **Mitigation:** Early return pattern, no modification to existing checks
  - **Rollback:** Comment out safe mode check, restart
  - **Validation:** Full test suite must pass

---

## Success Criteria

Phase 10.4 is COMPLETE when:

1. ✅ 5/5 tests passing in test suite
2. ✅ No regressions in Phase 10.1, 10.2, 10.3 tests
3. ✅ CLI tool operational (enable/disable/status)
4. ✅ Gate integration deployed and validated
5. ✅ Production smoke test passed
6. ✅ Documentation updated (VIENNA_RUNTIME_STATE.md, VIENNA_DAILY_STATE_LOG.md)
7. ✅ Operator runbook entry created

**Milestone:** Vienna OS now has emergency brake for autonomous reconciliation

---

## Post-Phase 10.4

### Immediate Next Steps

**Phase 10.5 — Operator Visibility UI** (blocked until 10.4 complete)
- Dashboard safe mode toggle
- Objective status distribution chart
- Reconciliation timeline viewer
- Ledger event browser

**Timeline:** 6-8 hours after Phase 10.4

---

### Future Enhancements (Not Committed)

**Possible Phase 10.6 features:**
- Safe mode levels (read-only vs full suspension)
- Automated safe mode triggers (circuit breaker integration)
- Per-objective safe mode overrides
- Safe mode timeout (auto-release after duration)
- System-level event table (dedicated audit trail)

**Decision:** Defer until operational need proven

---

## File Manifest

### Files to Create

```
cli/vienna-safe-mode.js                         (~150 lines)
tests/phase-10/test-phase-10.4-safe-mode.test.js (~250 lines)
```

### Files to Modify

```
lib/core/reconciliation-gate.js                 (+25 lines)
scripts/bootstrap-state-graph.js                (+10 lines)
```

### Files to Update (Documentation)

```
VIENNA_RUNTIME_STATE.md
VIENNA_DAILY_STATE_LOG.md
PHASE_10.4_COMPLETE.md (create)
```

**Total new code:** ~400 lines  
**Total modifications:** ~35 lines  
**Total test code:** ~250 lines

---

## Approval Gate

**This implementation plan requires:**
- ✅ Phase 10.3 observation window closed cleanly
- ✅ Phase 10.3 classified as STABLE
- ✅ Operator approval to proceed

**Do not begin implementation until both criteria met.**

---

**Status:** Implementation plan ready  
**Next Action:** Wait for Phase 10.3 stability decision  
**Estimated Duration:** 3.5 hours (implementation + validation + deploy + docs)
