# Phase 6C Complete: Crash Recovery

**Completion Date:** 2026-03-12  
**Phase:** 6C - System Hardening / Crash Recovery  
**Status:** ✅ COMPLETE

---

## Mission

Ensure Vienna can recover safely from runtime crashes or unexpected shutdowns by detecting and reconciling envelopes stuck in EXECUTING state.

---

## Problem Statement

**Before Phase 6C:**
- Runtime crash leaves envelopes in EXECUTING state
- No automatic detection of orphaned executions
- Stuck envelopes block queue progress
- No safe recovery path
- Manual intervention required to clear stuck state

**After Phase 6C:**
- On startup, scan for orphaned envelopes
- Automatic detection of long-running executions
- Safe retry or mark-failed logic
- Queue consistency guaranteed
- Recovery report and statistics

---

## Implementation

### 1. CrashRecoveryManager Service

**Location:** `lib/core/crash-recovery-manager.js`

**Responsibilities:**
- Scan execution queue on startup
- Detect orphaned envelopes (stuck in EXECUTING)
- Reconcile execution state
- Retry or move to DLQ
- Track recovery statistics
- Emit recovery events

**Core Methods:**

```javascript
// Run crash recovery scan
runRecovery() → recovery_report

// Check if execution is orphaned
isOrphanedExecution(entry) → boolean

// Recover single orphaned envelope
recoverOrphanedEnvelope(entry) → action_object

// Validate queue consistency
validateQueueConsistency() → validation_result

// Get recovery statistics
getStats() → stats_object
```

### 2. Recovery Workflow

**On Startup:**

```
Initialize runtime components
    ↓
Run StartupValidator
    ↓
Scan ExecutionQueue
    ↓
Detect orphaned envelopes (age > threshold)
    ↓
For each orphaned envelope:
  - Check retry count
  - If retries < max: requeue with incremented count
  - If retries >= max: move to DLQ with CRASH_RECOVERY_EXHAUSTED
    ↓
Report recovery actions
    ↓
Runtime ready for execution
```

**Orphan Detection:**

```javascript
isOrphanedExecution(entry) {
  return (
    entry.state === 'executing' &&
    age_ms > orphanedExecutionThresholdMs
  );
}
```

**Retry Logic:**

```
retryCount < maxRetries
  ↓ YES
Reset to 'queued' state
Increment retry_count
Move to front of FIFO
    ↓
retryCount >= maxRetries
  ↓ YES
Send to DLQ (CRASH_RECOVERY_EXHAUSTED)
Remove from queue
```

### 3. Recovery Configuration

**Phase 6C config options:**

```javascript
ViennaCore.init({
  // ... other config
  phase6C: {
    maxRecoveryRetries: 1,                    // Retry 1 time
    orphanedExecutionThresholdMs: 300000,     // 5 minutes
    enableAutomaticRecovery: true             // Auto-recover vs. manual review
  }
});
```

### 4. DLQ Integration

**New DLQ reason added:**

```javascript
DLQReason.CRASH_RECOVERY_EXHAUSTED
```

**Envelope routed to DLQ when:**
- Marked as EXECUTING for > 5 minutes
- Recovery attempted and failed
- Retry count >= maxRecoveryRetries

**DLQ entry payload:**

```json
{
  "envelope_id": "env_xyz",
  "reason": "CRASH_RECOVERY_EXHAUSTED",
  "error": "Envelope stuck after N recovery attempts",
  "retry_count": 1,
  "last_state": "executing"
}
```

### 5. Recovery Statistics

**Tracked per recovery run:**

```javascript
{
  total_runs: 2,
  last_run: "2026-03-12T05:53:31.339Z",
  orphaned_detected: 2,        // Total orphaned found
  retried: 1,                  // Moved back to queue
  failed: 1,                   // Sent to DLQ
  abandoned: 0                 // Manual review
}
```

### 6. Queue Consistency Validation

**Checks performed:**

```
✓ Queue vs FIFO size match
✓ No duplicate envelope IDs
✓ All envelopes have valid state
✓ No long-running executions
✓ Queue integrity preserved
```

**Anomalies detected:**

```
queue_fifo_mismatch
duplicate_envelope_ids
invalid_envelope_states
long_running_executions
```

### 7. ViennaCore Integration

**Changes to `index.js`:**

```javascript
// Initialize crash recovery manager
this.crashRecoveryManager = new CrashRecoveryManager(config.phase6C);

// Run on startup (after queue initialization)
const recoveryReport = await this.crashRecoveryManager.runRecovery();

// Store report for diagnostics
this._lastRecoveryReport = recoveryReport;
```

**Startup Validation:**

Added `_checkCrashRecoveryManager()` to StartupValidator:
- Validates manager initialized
- Checks core methods available
- Reports recovery run statistics

---

## Testing

**Test File:** `test-phase-6c-crash-recovery.js`

**Test Coverage:**

1. ✅ Manager initialization
   - Verify manager created with correct config
   - Check dependencies injectable

2. ✅ Orphaned envelope detection
   - Create envelope in EXECUTING state
   - Verify detection based on age threshold
   - Confirm age_ms calculation accurate

3. ✅ Recovery with retry
   - Detect orphaned envelope
   - Retry_count < maxRetries
   - Verify moved back to queued
   - Confirm retry_count incremented

4. ✅ Recovery with DLQ (retry exhausted)
   - Set retry_count >= maxRetries
   - Verify sent to DLQ with CRASH_RECOVERY_EXHAUSTED reason
   - Confirm removed from execution queue

5. ✅ Queue consistency validation
   - Add multiple envelopes in various states
   - Validate queue structure
   - Detect and report anomalies

6. ✅ Recovery statistics tracking
   - Run recovery multiple times
   - Verify stats accumulate correctly
   - Check per-run and cumulative counts

7. ✅ Event emission
   - Emit recovery completion events
   - Include orphaned_count, retried_count, failed_count
   - Track event payload structure

**Test Results:**

```
═══════════════════════════════════════════════════════════
✅ Phase 6C: All Tests Passed
═══════════════════════════════════════════════════════════

Crash Recovery operational:
  ✅ Manager initialization
  ✅ Orphaned envelope detection
  ✅ Recovery with retry
  ✅ Recovery with DLQ (retry exhausted)
  ✅ Queue consistency validation
  ✅ Recovery statistics tracking
  ✅ Event emission
```

---

## Safety Guarantees

**Phase 6C ensures:**

1. **No permanently stuck envelopes**
   - Scan detects all EXECUTING envelopes
   - Age-based orphan detection
   - Safe retry or failure path

2. **Queue consistency maintained**
   - FIFO order preserved
   - No duplicate envelope IDs
   - Valid state transitions only

3. **Controlled retry behavior**
   - Configurable max retries
   - Automatic DLQ on exhaustion
   - Retry count tracking

4. **Observable recovery**
   - Recovery report on startup
   - Statistics accumulated
   - Events emitted for actions

5. **Graceful degradation**
   - Recovery doesn't block startup
   - Failed recovery doesn't crash runtime
   - Manual mode available for high-stakes envs

---

## Integration Points

### 1. Startup Sequence

**In `initPhase7_3()`:**

```javascript
// Initialize queue
await executionQueue.initialize();

// Wire up crash recovery
crashRecoveryManager.setDependencies(
  executionQueue,
  deadLetterQueue,
  eventEmitter
);

// Run recovery scan
const report = await crashRecoveryManager.runRecovery();

// Log results
if (report.summary.orphaned_found > 0) {
  console.log(`Recovered ${report.summary.orphaned_found} orphaned envelopes`);
}
```

### 2. Diagnostics API

**Expose recovery report via diagnostics endpoint:**

```javascript
GET /api/v1/runtime/diagnostics

{
  "crash_recovery": {
    "last_report": { ... recovery_report ... },
    "stats": { ... recovery_stats ... },
    "queue_health": { ... validation_result ... }
  }
}
```

### 3. Console Dashboard

**Display recovery status:**

```
Last Recovery: 2026-03-12 05:53:31 EDT
Orphaned Envelopes Found: 2
Retried: 1
Failed (DLQ): 1
Queue Status: Healthy
```

---

## Files Changed

### New Files
- `lib/core/crash-recovery-manager.js` - CrashRecoveryManager service
- `test-phase-6c-crash-recovery.js` - Test suite
- `PHASE_6C_COMPLETE.md` - This document

### Modified Files
- `index.js` - Added CrashRecoveryManager initialization
- `lib/core/startup-validator.js` - Added crash recovery check
- `lib/execution/dead-letter-queue.js` - Added CRASH_RECOVERY_EXHAUSTED reason

---

## Metrics

**Development Time:** ~2 hours  
**Lines of Code:** ~600 (manager + integration + tests)  
**Test Coverage:** 7 tests, all passing  
**New DLQ Reason:** 1 (CRASH_RECOVERY_EXHAUSTED)  
**Recovery Statistics Tracked:** 5 metrics

---

## Success Criteria

✅ **All Phase 6C criteria met:**
- [x] Crash recovery manager implemented
- [x] Orphaned envelope detection working
- [x] Retry and DLQ logic correct
- [x] Queue consistency validation
- [x] Recovery statistics tracking
- [x] Events emitted for actions
- [x] ViennaCore integration complete
- [x] Startup validation includes recovery
- [x] Test suite passes

---

## Next Steps: Phase 6D

**Phase 6D: Structured Logging**

Replace ad-hoc console logging with structured runtime logs.

**Objectives:**
- JSON-formatted event logs
- Timestamped and traceable
- Integration into all runtime components
- Logs persistable and queryable

**Deliverable:** StructuredLogger service

---

## Conclusion

Phase 6C transforms Vienna from **"crashes leave stuck envelopes"** to **"crashes are safely recovered on restart"**.

Orphaned envelopes are now automatically detected, retried safely, or moved to DLQ for operator review.

**Impact:**
- Automatic recovery from crashes (no manual queue cleanup)
- Queue consistency guaranteed after restart
- Observable recovery via statistics and events
- Graceful degradation (retries before failure)
- Operator confidence (recovery report on startup)

**Phase 6C → Phase 6D:** Structured logging next.
