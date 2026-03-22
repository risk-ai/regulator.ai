# Phase 10.4 Safe Mode Specification

**Status:** Design Only (No Implementation During Observation Window)  
**Purpose:** Governance override for emergency suspension of autonomous reconciliation  
**Priority:** Post-Phase 10.3 observation window

---

## Definition

Safe Mode is a **governance override** that suspends autonomous reconciliation admission without modifying objective state, verification, or ledger integrity.

**Core Principle:**
> Safe Mode is an operator or system-imposed global control boundary above the normal reconciliation loop.

---

## What Safe Mode Is

- **Governance override** — Higher-order admission veto
- **Emergency brake** — Suspend autonomous actions system-wide
- **Global control boundary** — Applies to all objectives simultaneously
- **Reversible state** — Can be enabled and disabled without data loss

---

## What Safe Mode Is NOT

- ❌ **Not a failure state** — Safe Mode is intentional control, not a detected problem
- ❌ **Not a breaker state** — Circuit breakers are per-objective, Safe Mode is global
- ❌ **Not a timeout consequence** — Timeouts land in cooldown/degraded, not Safe Mode
- ❌ **Not a degraded state** — Degraded means "needs manual fix", Safe Mode means "hold all autonomous action"

---

## Architecture Integration

Safe Mode sits **above** the reconciliation gate in the admission control hierarchy:

```
Operator/System Decision
  ↓
Safe Mode Flag (global control)
  ↓
Reconciliation Gate (per-objective admission)
  ↓
Remediation Trigger (execution)
  ↓
Governed Pipeline
```

---

## Schema Additions

Add to `runtime_context` table or new `safe_mode_state` table:

```sql
CREATE TABLE safe_mode_state (
  safe_mode_id INTEGER PRIMARY KEY,
  safe_mode_enabled BOOLEAN NOT NULL DEFAULT 0,
  safe_mode_reason TEXT,
  safe_mode_entered_at TEXT,
  safe_mode_entered_by TEXT CHECK(safe_mode_entered_by IN ('operator', 'system')),
  safe_mode_released_at TEXT,
  safe_mode_released_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Or simpler (single-row table):

```sql
-- Add to runtime_context
INSERT OR REPLACE INTO runtime_context (key, value_text, value_bool) 
VALUES ('safe_mode.enabled', NULL, 0);

INSERT OR REPLACE INTO runtime_context (key, value_text) 
VALUES ('safe_mode.reason', 'incident mitigation');

INSERT OR REPLACE INTO runtime_context (key, value_text) 
VALUES ('safe_mode.entered_by', 'operator');
```

**Recommended:** Use `runtime_context` table (already exists) to avoid schema changes.

---

## Gate Logic (Future Implementation)

**Current gate admission logic:**
```javascript
// reconciliation-gate.js - requestReconciliation()

if (objective.reconciliation_status !== 'idle' && 
    objective.reconciliation_status !== 'cooldown') {
  return { admitted: false, skip_reason: 'already_reconciling', ... };
}

if (objective.reconciliation_status === 'cooldown' && !isCooldownExpired) {
  return { admitted: false, skip_reason: 'cooldown_active', ... };
}

// ... other checks
```

**After Safe Mode:**
```javascript
// NEW: Check Safe Mode first (global veto)
const safeMode = stateGraph.getRuntimeContext('safe_mode.enabled');
if (safeMode && safeMode.value_bool === 1) {
  const reason = stateGraph.getRuntimeContext('safe_mode.reason')?.value_text || 'safe_mode_active';
  return { 
    admitted: false, 
    skip_reason: 'safe_mode', 
    safe_mode_reason: reason,
    generation: objective.generation + 1,
    timestamp: new Date().toISOString()
  };
}

// Continue with existing checks...
```

---

## State Machine Impact

Safe Mode does **not** introduce new objective states.

Objectives remain in their current state (monitoring, cooldown, degraded) while Safe Mode is active.

**Admission results during Safe Mode:**
- `skip_reason: 'safe_mode'`
- `admitted: false`
- Objective state unchanged

**Reconciliation timeline:**
```
Before Safe Mode: idle → reconciling → recovered
During Safe Mode: idle → skip(safe_mode) → idle
After Safe Mode:  idle → reconciling → recovered
```

---

## Ledger Events

Add new lifecycle events:

```
objective.reconciliation.skipped (skip_reason: safe_mode)
system.safe_mode.entered
system.safe_mode.released
```

**Event metadata:**
```json
{
  "event_type": "system.safe_mode.entered",
  "timestamp": "2026-03-14T10:00:00Z",
  "entered_by": "operator",
  "reason": "incident mitigation - database recovery in progress",
  "affected_objectives": 12
}
```

---

## CLI Commands (Design)

### Enable Safe Mode

```bash
node cli/vienna-safe-mode.js enable --reason "incident mitigation"
```

**Output:**
```
🔒 SAFE MODE ENABLED

Reason:       incident mitigation
Enabled by:   operator
Timestamp:    2026-03-14T10:00:00Z

All autonomous reconciliation suspended.
Objectives remain in current state.
Re-enable with: vienna-safe-mode.js disable
```

### Disable Safe Mode

```bash
node cli/vienna-safe-mode.js disable
```

**Output:**
```
✅ SAFE MODE DISABLED

Released by:  operator
Timestamp:    2026-03-14T10:15:00Z
Duration:     15m 0s

Autonomous reconciliation resumed.
```

### Check Safe Mode Status

```bash
node cli/vienna-safe-mode.js status
```

**Output:**
```
Safe Mode:    DISABLED
Last enabled: 2026-03-14T10:00:00Z (operator)
Last reason:  incident mitigation
```

---

## Test Cases (Design)

### Test 1: Safe Mode Blocks Admission

```javascript
// Enable Safe Mode
stateGraph.setRuntimeContext('safe_mode.enabled', true);

// Request reconciliation
const result = gate.requestReconciliation(objectiveId);

// Expect admission denied
assert.equal(result.admitted, false);
assert.equal(result.skip_reason, 'safe_mode');
```

### Test 2: Safe Mode Does Not Alter Running Reconciliation

```javascript
// Start reconciliation
gate.requestReconciliation(objectiveId); // admitted

// Enable Safe Mode
stateGraph.setRuntimeContext('safe_mode.enabled', true);

// Reconciliation continues
const objective = stateGraph.getObjective(objectiveId);
assert.equal(objective.reconciliation_status, 'reconciling');

// New admission denied
const result2 = gate.requestReconciliation(otherObjectiveId);
assert.equal(result2.admitted, false);
assert.equal(result2.skip_reason, 'safe_mode');
```

### Test 3: Safe Mode Logs Governance Event

```javascript
// Enable Safe Mode
enableSafeMode({ reason: 'incident test', by: 'operator' });

// Check ledger
const events = stateGraph.listObjectiveHistory(objectiveId);
const safeModeEvent = events.find(e => e.reason === 'objective.reconciliation.skipped' && e.metadata.skip_reason === 'safe_mode');
assert.ok(safeModeEvent);
```

### Test 4: Safe Mode Release Restores Admission

```javascript
// Enable then disable Safe Mode
enableSafeMode({ reason: 'test' });
disableSafeMode();

// Admission should work
const result = gate.requestReconciliation(objectiveId);
assert.equal(result.admitted, true);
```

---

## Implementation Sequence (Post-Observation)

1. **Schema Update** (5 min)
   - Add `safe_mode.*` keys to `runtime_context` table
   - No migration needed (key-value store)

2. **Gate Integration** (30 min)
   - Add Safe Mode check to `reconciliation-gate.js`
   - Return `skip_reason: 'safe_mode'` when active
   - Record skip events

3. **CLI Tool** (1 hour)
   - `cli/vienna-safe-mode.js`
   - Commands: enable, disable, status
   - Validation and error handling

4. **Ledger Events** (30 min)
   - `system.safe_mode.entered`
   - `system.safe_mode.released`
   - Record in `managed_objective_history` or new `system_events` table

5. **Test Suite** (1 hour)
   - 4 core test cases above
   - Integration test with full loop
   - Validation test (cannot enable if reason missing)

6. **Documentation** (30 min)
   - Update `VIENNA_RUNTIME_STATE.md`
   - Update `VIENNA_OS_OVERVIEW.md`
   - Operator runbook entry

**Total Time:** ~3.5 hours

---

## Usage Scenarios

### Scenario 1: Database Maintenance

```bash
# Before maintenance
vienna-safe-mode enable --reason "Postgres upgrade in progress"

# During maintenance (objectives skip reconciliation)
# No autonomous changes to services

# After maintenance
vienna-safe-mode disable
```

### Scenario 2: Cascading Failure Investigation

```bash
# Multiple services degrading
vienna-safe-mode enable --reason "Investigating cascading failures"

# Manual investigation without autonomous remediation
# Operator can still trigger manual reconciliation if needed

# After root cause identified and fixed
vienna-safe-mode disable
```

### Scenario 3: Policy Testing

```bash
# Testing new failure policy
vienna-safe-mode enable --reason "Testing failure policy changes"

# Make policy changes
# Test in controlled environment

# Release Safe Mode to validate new policy behavior
vienna-safe-mode disable
```

---

## Operator Visibility

Safe Mode status should be visible in:
- Dashboard header (🔒 SAFE MODE ACTIVE)
- CLI status commands
- Objective monitor (skip_reason column)
- Event timeline (clear Safe Mode events)

---

## Emergency Override

Safe Mode itself can be overridden by:
- Direct State Graph update (operator with DB access)
- Emergency recovery script
- System reboot (default: Safe Mode disabled on startup)

**No automated Safe Mode release** — Always requires operator action.

---

## Relationship to Other Controls

| Control | Scope | Trigger | Duration |
|---------|-------|---------|----------|
| **Safe Mode** | Global | Operator/system | Until released |
| **Cooldown** | Per-objective | Failure | Fixed duration |
| **Degraded** | Per-objective | Failures exhausted | Until manual reset |
| **Circuit Breaker** | Per-objective | Failure policy | Configurable |
| **Timeout** | Per-attempt | Execution duration | Fixed deadline |

Safe Mode is the **highest-level control** and blocks all other admission attempts.

---

## Open Questions

1. **Should Safe Mode auto-release after timeout?**
   - Proposal: No. Always require explicit release for safety.

2. **Should Safe Mode affect verification?**
   - Proposal: No. Verification is independent authority.

3. **Should Safe Mode record per-objective skip events?**
   - Proposal: Yes. Full audit trail requires per-objective visibility.

4. **Should Safe Mode have levels (e.g., read-only vs full suspension)?**
   - Proposal: Phase 10.4 = simple on/off. Phase 10.6 = levels if needed.

---

## Summary

Safe Mode provides a **governance override** to suspend autonomous reconciliation admission without data loss or state corruption.

**Key Properties:**
- Global scope
- Operator-controlled
- Reversible
- Does not modify objective state
- Blocks admission, not execution
- Full audit trail

**Implementation Time:** ~3.5 hours  
**Deployment Constraint:** After Phase 10.3 observation window closes cleanly
