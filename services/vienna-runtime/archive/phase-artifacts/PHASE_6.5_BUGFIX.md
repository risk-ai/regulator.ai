# Phase 6.5 Bug Fix: Recovery Copilot Truth-Source Alignment

**Date:** 2026-03-12  
**Issue:** Recovery diagnosis defaulted to "normal" when operator dashboard showed degraded state  
**Root Cause:** Recovery copilot was reading incomplete runtime state instead of authoritative snapshot  

---

## Problem Statement

### Observed Behavior

Vienna Chat recovery copilot returned:

```text
System Diagnosis
Runtime mode: normal

Provider health:

No recovery actions needed.
```

While the operator dashboard simultaneously showed:

- Executor state: degraded
- Dead letters: 23 entries
- Providers: unavailable
- Queue: blocked envelopes present

### Root Cause

`processRecoveryIntent()` in `index.js` passed narrow `runtimeState` from `providerHealthBridge.getRuntimeModeState()` to `RecoveryCopilot`. This state only included:

- `mode`
- `reasons` 
- `fallbackProvidersActive`
- `availableCapabilities`

It **did not** include authoritative executor state:

- `systemState` (from `queuedExecutor.getHealth()`)
- `queueDepth` (from `queuedExecutor.getQueueState()`)
- `blocked` (from executor)
- `deadLetterCount` (from `queuedExecutor.getDeadLetterStats()`)
- `paused` / `pauseReason` (from executor control state)

The `/api/v1/system/now` endpoint (used by dashboard) correctly consulted these authoritative sources via `SystemNowService`, but recovery diagnosis did not.

### Truth-Source Mismatch

```
Dashboard       →  SystemNowService  →  Authoritative snapshot  →  ✓ Degraded
Recovery copilot→  providerBridge    →  Narrow mode state       →  ✗ Normal
```

This violated the core requirement:

> **Recovery copilot must use the same authoritative system truth as the Operator Now view.**

---

## Solution

### Changes Made

**1. Created `getAuthoritativeRuntimeSnapshot()` in `index.js`**

New method that gathers the same truth as `/api/v1/system/now`:

- Executor health state (`queuedExecutor.getHealth()`)
- Queue metrics (`queuedExecutor.getQueueState()`)
- Dead letter stats (`queuedExecutor.getDeadLetterStats()`)
- Objective tracker stats (`queuedExecutor.getObjectiveStats()`)
- Provider health (`providerHealthBridge.getProviderHealth()`)

**2. Updated `processRecoveryIntent()` to use authoritative snapshot**

Before:
```javascript
const runtimeState = this.providerHealthBridge.getRuntimeModeState(); // Narrow
const providerHealth = this.providerHealthBridge.getProviderHealth();
```

After:
```javascript
const runtimeSnapshot = await this.getAuthoritativeRuntimeSnapshot(); // Full
const response = await this.recoveryCopilot.processIntent(
  message,
  runtimeSnapshot.runtimeState,  // Includes executor state
  runtimeSnapshot.providerHealth
);
```

**3. Fixed mode derivation logic**

Mode is now **derived** from authoritative state, not copied from provider bridge:

```javascript
// Derive runtime mode from authoritative sources
if (snapshot.providerHealth.size === 0) {
  snapshot.runtimeState.mode = 'operator-only';
  snapshot.runtimeState.reasons.push('No providers registered');
}
else if (snapshot.runtimeState.systemState === 'degraded') {
  snapshot.runtimeState.mode = 'degraded';
  if (snapshot.runtimeState.deadLetterCount > 0) {
    snapshot.runtimeState.reasons.push(`${snapshot.runtimeState.deadLetterCount} dead letters`);
  }
  if (snapshot.runtimeState.blocked > 0) {
    snapshot.runtimeState.reasons.push(`${snapshot.runtimeState.blocked} blocked envelopes`);
  }
}
else {
  snapshot.runtimeState.mode = 'normal';
}
```

**4. Enhanced `RecoveryCopilot.diagnoseSystem()` output**

Now includes authoritative data:

```markdown
**System Diagnosis**

**System State:** degraded
**Runtime Mode:** degraded
**Executor:** WARNING

**Queue State:**
- Queued: 5
- Executing: 2
- ⚠ Blocked: 3
- ✗ Dead Letters: 10
- Active Objectives: 2

**Provider Health:**
✗ Unavailable: anthropic
✓ Healthy: local

**Recommended actions:**
- Inspect 10 dead letter(s) for retry or cancellation
- Inspect 3 blocked envelope(s) for resolution
```

**5. Improved `proposeRecoveryActions()` logic**

Actions now consider authoritative state:

- Dead letters → `inspect_dead_letters` (high priority)
- Blocked envelopes → `inspect_blocked` (high priority)
- Paused execution → `resume_execution` (critical priority)
- Executor degraded → `diagnose_executor` (high priority)
- Empty provider registry → `diagnose_provider_registry` (critical priority)

---

## Validation

### Test Coverage

Created `test-recovery-truth-alignment.js` with 4 scenarios:

1. **Degraded executor with DLQ and blocked envelopes**
   - Validates systemState = 'degraded'
   - Validates mode != 'normal'
   - Validates diagnosis includes queue/DLQ/blocked counts

2. **Empty provider registry**
   - Validates mode = 'operator-only' or 'degraded' (NOT 'normal')
   - Validates reasons mention providers
   - Validates diagnosis mentions "No providers registered"

3. **Paused execution state**
   - Validates paused/pauseReason are reflected
   - Validates diagnosis mentions "PAUSED"
   - Validates recovery actions include resume proposal

4. **Dead letter queue growth**
   - Validates DLQ inspection action is proposed
   - Validates action priority is 'high'
   - Validates action description includes count

**Test results:** ✓ 4/4 passed

---

## Acceptance Criteria

✅ **If dashboard shows degraded, recovery diagnosis shows degraded**  
✅ **Recovery diagnosis explains same degraded reasons as dashboard**  
✅ **Empty provider registry does not produce "normal" mode**  
✅ **Recovery diagnosis includes executor state, queue depth, DLQ count, blocked envelopes**  
✅ **Proposed actions consider authoritative state (DLQ, blocked, paused)**  

---

## Implementation Files

### Modified

- `index.js` — Added `getAuthoritativeRuntimeSnapshot()`, updated `processRecoveryIntent()`
- `lib/core/recovery-copilot.js` — Enhanced `diagnoseSystem()` and `proposeRecoveryActions()`

### Added

- `test-recovery-truth-alignment.js` — Validation suite

### No Changes Required

- `console/server/src/routes/recovery.ts` — Already calls `vienna.processRecoveryIntent()` correctly
- `console/server/src/services/viennaRuntime.ts` — Passes through correctly
- `console/server/src/services/systemNowService.ts` — Already using authoritative sources

---

## Impact

### Before Fix

- Recovery diagnosis optimistic even when system degraded
- Operator cannot trust recovery copilot during incidents
- Dashboard and chat show conflicting state
- Empty provider registry incorrectly flagged as "normal"

### After Fix

- Recovery diagnosis matches dashboard reality
- Operator can trust recovery intelligence during recovery
- Single source of truth for system state
- Degraded conditions correctly flagged with actionable recommendations

---

## Deployment

**No breaking changes.** Fix is internal to Vienna Core.

**Deployment steps:**

1. Restart Vienna Core server
2. Test via Vienna Chat: `diagnose system`
3. Validate diagnosis matches dashboard state

**Rollback:** Revert `index.js` and `recovery-copilot.js` changes

---

## Follow-Up

### Future Enhancements

1. **DLQ integration** — Recovery copilot can currently diagnose DLQ count but cannot inspect individual dead letters. Add `show dead letters` command.

2. **Provider test execution** — Recovery copilot can propose `test provider X` but cannot execute tests. Add execution bridge.

3. **Metrics trending** — Recovery copilot currently shows point-in-time state. Add historical trend analysis (e.g., "DLQ growing over last 60 minutes").

4. **Automatic mode transitions** — Currently operator must approve mode changes. Consider auto-transition on specific conditions (e.g., all providers unavailable → operator-only).

### Documentation

- Updated `console/server/src/routes/recovery.ts` JSDoc to reference authoritative snapshot
- Added truth-source alignment principle to recovery copilot design doc

---

## Conclusion

Recovery copilot now derives diagnosis from the same authoritative runtime snapshot as `/api/v1/system/now`, ensuring dashboard and chat show consistent state during incidents.

**Truth-source alignment validated.**
