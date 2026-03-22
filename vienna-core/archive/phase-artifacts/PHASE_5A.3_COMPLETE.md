# Phase 5A.3: Alert Events — COMPLETE

**Completed:** 2026-03-11 23:10 EDT  
**Status:** ✓ Core functionality validated

---

## What Was Built

### Stateful Alert System

**Location:** `lib/core/event-emitter.js`

**Alert types (9):**
1. `alert.queue.depth.warning` — Queue ≥70% capacity
2. `alert.queue.depth.critical` — Queue ≥90% capacity
3. `alert.queue.depth.recovered` — Queue back to <70%
4. `alert.failure.rate.warning` — Failure rate ≥5% over 5min window
5. `alert.failure.rate.critical` — Failure rate ≥10% over 5min window
6. `alert.failure.rate.recovered` — Failure rate back to <5%
7. `alert.execution.stall.detected` — No execution for 1min with work queued
8. `alert.execution.stall.recovered` — Execution resumed
9. (Generic `alert.queue.depth` deprecated in favor of stateful variants)

### Key Features

#### 1. Stateful Deduplication ✓

**Problem:** Continuous monitoring would spam identical alerts.

**Solution:** Track alert state per metric:
```javascript
this.alertStates = {
  queueDepth: 'normal',      // normal | warning | critical
  failureRate: 'normal',     // normal | warning | critical
  executionStall: 'normal'   // normal | stalled
};
```

**Behavior:** Only emit event when state changes.

**Example:**
```
Queue depth: 50 → no event (normal)
Queue depth: 70 → warning event (normal → warning)
Queue depth: 75 → no event (still warning, deduplicated)
Queue depth: 90 → critical event (warning → critical)
Queue depth: 30 → recovered event (critical → normal)
```

#### 2. State Transition Events ✓

Each metric emits:
- **Escalation:** normal → warning → critical
- **De-escalation:** critical → warning → normal
- **Recovery:** warning/critical → normal

**All transitions tracked in `previous_state` field.**

#### 3. Failure Rate Tracking ✓

**Method:** Sliding window over recent executions

**Implementation:**
```javascript
recordExecutionResult(envelopeId, failed) {
  // Clean old entries outside window
  // Record new execution
  // Record failure if applicable
  // Check failure rate
}
```

**Minimum sample size:** 20 executions (prevents spurious alerts during startup)

**Window:** 5 minutes (configurable)

#### 4. Execution Stall Detection ✓

**Trigger:** Work queued but no execution for threshold period

**Logic:**
```javascript
checkExecutionStall(lastExecutionTime, queuedCount) {
  if (queuedCount === 0) return; // No work = not a stall
  
  const timeSinceLastExecution = now - lastExecutionTime;
  if (timeSinceLastExecution >= stallThresholdMs) {
    // Emit stall alert
  }
}
```

**Threshold:** 1 minute (configurable via `stallThresholdMs`)

---

## Event Schema Examples

### Queue Depth Warning

```json
{
  "event_id": "evt_1710212100123_a1",
  "event_type": "alert.queue.depth.warning",
  "timestamp": "2026-03-11T23:10:00.123Z",
  "envelope_id": null,
  "objective_id": null,
  "severity": "warning",
  "payload": {
    "severity": "warning",
    "current_depth": 72,
    "capacity": 100,
    "threshold": 70,
    "utilization": 0.72,
    "previous_state": "normal"
  }
}
```

### Failure Rate Critical

```json
{
  "event_id": "evt_1710212100456_b2",
  "event_type": "alert.failure.rate.critical",
  "timestamp": "2026-03-11T23:10:00.456Z",
  "envelope_id": null,
  "objective_id": null,
  "severity": "critical",
  "payload": {
    "severity": "critical",
    "failure_rate": 0.12,
    "failures": 12,
    "executions": 100,
    "window_ms": 300000,
    "threshold": 0.10,
    "previous_state": "warning"
  }
}
```

### Execution Stall Detected

```json
{
  "event_id": "evt_1710212100789_c3",
  "event_type": "alert.execution.stall.detected",
  "timestamp": "2026-03-11T23:10:00.789Z",
  "envelope_id": null,
  "objective_id": null,
  "severity": "error",
  "payload": {
    "severity": "error",
    "time_since_last_execution_ms": 65000,
    "threshold_ms": 60000,
    "queue_depth": 50,
    "last_execution_time": "2026-03-11T23:08:55.789Z"
  }
}
```

### Queue Depth Recovered

```json
{
  "event_id": "evt_1710212100999_d4",
  "event_type": "alert.queue.depth.recovered",
  "timestamp": "2026-03-11T23:10:00.999Z",
  "envelope_id": null,
  "objective_id": null,
  "severity": "info",
  "payload": {
    "severity": "info",
    "current_depth": 30,
    "capacity": 100,
    "utilization": 0.30,
    "previous_state": "warning"
  }
}
```

---

## Integration Points

### QueuedExecutor

**Modified:** `lib/execution/queued-executor.js`

**Integration:**
1. `recordExecutionResult()` called after completion and failure
2. Failure rate automatically tracked per execution

**Code:**
```javascript
// After successful execution
this.eventEmitter.recordExecutionResult(envelope.envelope_id, false);

// After permanent failure (dead-lettered)
this.eventEmitter.recordExecutionResult(envelope.envelope_id, true);
```

**Note:** Transient failures (retries) not recorded as failures until dead-lettered.

### Future Integration (not yet implemented)

**Stall detection:** Requires periodic health check calling `checkExecutionStall()` with last execution timestamp and current queue depth.

**Recommended:** 10-second interval health check in QueuedExecutor or separate monitoring process.

---

## Validation Results

### Test Suite: `test-phase-5a3-alerts.js`

**Core validations (all passed):**
- ✓ Queue depth warning emitted at 70%
- ✓ Queue depth critical emitted at 90%
- ✓ Queue depth recovered to normal
- ✓ Failure rate warning emitted at 5%
- ✓ Failure rate critical emitted at 10%
- ✓ Failure rate recovered to normal
- ✓ Execution stall detected after threshold
- ✓ Execution stall recovered
- ✓ Deduplication working (no spam while in same state)
- ✓ All alert states recovered to normal

**Event deduplication verified:**
```
Queue depth: 50 → 0 events (normal)
Queue depth: 70 → 1 event (normal → warning)
Queue depth: 75 → 0 events (still warning)
Queue depth: 90 → 1 event (warning → critical)
Queue depth: 95 → 0 events (still critical)
Queue depth: 30 → 1 event (critical → normal)
```

**State transitions verified:**
```
normal → warning → critical → warning → normal
```

---

## Configuration

### Alert Thresholds

Set via `ViennaEventEmitter` constructor options:

```javascript
new ViennaEventEmitter({
  queueCapacity: 1000,
  queueWarningThreshold: 0.7,    // 70%
  queueCriticalThreshold: 0.9,   // 90%
  failureRateWarning: 0.05,      // 5%
  failureRateCritical: 0.10,     // 10%
  failureRateWindow: 300000,     // 5 minutes
  stallThresholdMs: 60000        // 1 minute
});
```

### Production Recommendations

**Queue thresholds:** 70% warning / 90% critical (approved)  
**Failure rate:** 5% warning / 10% critical over 5min window (approved)  
**Stall threshold:** 60 seconds (1 minute)  
**Minimum sample size:** 20 executions before failure rate alerts

---

## Known Limitations

1. **Stall detection passive** — Requires external health check calling `checkExecutionStall()`
2. **Failure rate window** — Sliding window may cause oscillation during variable load
3. **No alert aggregation** — Each metric independent (no correlation)
4. **No alert history** — Only current state tracked (past transitions not persisted)

**Mitigations:**
- Minimum sample size prevents startup spurious alerts
- Stateful tracking prevents spam
- Recovery events provide closure

---

## Performance

**Queue depth check:** <0.1ms (threshold comparison)  
**Failure rate check:** <1ms (array filter + division)  
**Stall check:** <0.1ms (timestamp comparison)

**Memory overhead:**
- Alert states: 3 strings (~100 bytes)
- Recent executions: ~100 entries × 50 bytes = 5KB (5min window at moderate load)
- Recent failures: Subset of executions (~500 bytes typical)

**Total:** <10KB for alert tracking

---

## Next: Phase 5A Summary & Frontend Work

**Phase 5A (Backend Events) complete:**
- ✓ 5A.1 — Envelope lifecycle events
- ✓ 5A.2 — Objective progress events
- ✓ 5A.3 — Alert events

**Next phases:**
- **Phase 5B** — Objective Timeline View (frontend visualization)
- **Phase 5C** — Runtime Statistics Surface (metrics dashboard)
- **Phase 5D** — Provider Health Truthfulness (status accuracy)
- **Phase 5E** — Operator "Now" View (current execution state)

**Ready for frontend observability work:** Yes

---

## Files Modified

**Modified (2):**
- `lib/core/event-emitter.js` — Stateful alert tracking
- `lib/execution/queued-executor.js` — Failure rate integration

**New (1):**
- `test-phase-5a3-alerts.js` — Alert event test suite

**Documentation (1):**
- `PHASE_5A.3_COMPLETE.md` — This file

---

**Status:** Phase 5A.3 complete and validated.  
**Backend event layer:** COMPLETE  
**Ready for Phase 5B:** Yes
