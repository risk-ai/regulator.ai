# Phase 5A Integration Guide

**Status:** Backend event emission complete  
**Next:** Wire SSE stream to Vienna Core

## Implementation Complete

### 1. Event Emitter Module ✓

**File:** `lib/core/event-emitter.js`

**Features:**
- Non-blocking fire-and-forget emission
- Bounded buffer (100 events) when stream disconnected
- Circuit breaker (opens after 10 consecutive failures, auto-resets after 1 min)
- Configurable alert thresholds
- Queue depth monitoring

**Event types supported:**
- `execution.started`
- `execution.completed`
- `execution.failed`
- `execution.retried`
- `execution.timeout`
- `execution.blocked`
- `objective.created`
- `objective.progress.updated`
- `objective.completed`
- `objective.failed`
- `alert.queue.depth`

### 2. QueuedExecutor Integration ✓

**File:** `lib/execution/queued-executor.js`

**Emission points added:**
- Envelope started (line ~370)
- Envelope completed (line ~410)
- Envelope failed/dead-lettered (line ~525)
- Envelope retried (line ~545)
- Execution timeout (line ~1020)
- Execution blocked - concurrency (line ~285)
- Execution blocked - paused (line ~305)
- Execution blocked - budget (line ~350)
- Queue depth check after enqueue (line ~265)

**New methods:**
- `connectEventStream(eventStream)` - Wire up SSE stream

### 3. ObjectiveTracker Integration ✓

**File:** `lib/execution/objective-tracker.js`

**Emission points added:**
- Objective created (registerObjective)
- Objective progress updated (updateObjectiveStatus)
- Objective completed (updateObjectiveStatus when status → complete)
- Objective failed (updateObjectiveStatus when status → failed)

**New methods:**
- `connectEventEmitter(eventEmitter)` - Wire up event emitter

## Console Server Integration ✓

**Location:** `console/server/src/server.ts`

**Changes made (line ~123):**

```typescript
// Phase 5A: Connect event stream to Vienna Core for real-time observability
if (viennaCore.queuedExecutor) {
  viennaCore.queuedExecutor.connectEventStream(eventStream);
  console.log('Event stream connected to Vienna Core executor');
} else {
  console.warn('WARNING: queuedExecutor not found on viennaCore, event stream not connected');
}
```

**Integrated:** SSE stream now receives all envelope lifecycle and objective progress events.

### Frontend Integration

**Location:** `console/client/src/hooks/useViennaStream.ts`

**Already exists** - verify event type handling matches new schema.

**Event schema:**

```typescript
interface ViennaEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  envelope_id: string | null;
  objective_id: string | null;
  severity: 'info' | 'warning' | 'error';
  payload: Record<string, unknown>;
}
```

## Validation Checklist

Before Phase 5A.2:

- [ ] Console server connects event stream to queued executor
- [ ] SSE endpoint `/api/stream` functional
- [ ] Frontend receives `execution.started` events
- [ ] Frontend receives `objective.progress.updated` events
- [ ] Circuit breaker tested (simulate failures)
- [ ] Buffering tested (connect after enqueuing)
- [ ] Queue depth alerts fire at 70% / 90%
- [ ] No runtime crashes under event emission load
- [ ] Event emission adds <5ms overhead per envelope

## Configuration

**Queue capacity:** Set via `queueOptions.maxSize` (default: 1000)

**Alert thresholds:**
- Queue warning: 70% of capacity
- Queue critical: 90% of capacity
- Failure rate warning: 5% over 5-minute window
- Failure rate critical: 10% over 5-minute window

**Event emitter options:**
```javascript
{
  enabled: true,
  maxBufferSize: 100,
  maxFailures: 10,
  queueCapacity: 1000,
  queueWarningThreshold: 0.7,
  queueCriticalThreshold: 0.9,
  failureRateWarning: 0.05,
  failureRateCritical: 0.10,
  failureRateWindow: 300000 // 5 minutes
}
```

## Testing Commands

```bash
# Check event emitter status
node -e "const {QueuedExecutor} = require('./lib/execution/queued-executor'); const qe = new QueuedExecutor({}); console.log(qe.eventEmitter.getStatus())"

# Monitor SSE stream (when server running)
curl -N http://localhost:3000/api/stream

# Simulate envelope execution and watch events
# (via console UI or direct API)
```

## Phase 5A.2 Readiness

**Blocked on:**
1. Console server initialization wiring
2. Frontend event type mapping verification
3. End-to-end SSE connectivity test

**Ready to proceed once:**
- Event stream connected in server initialization
- At least one event successfully delivered to frontend
- No runtime errors in console server logs

## Notes

- Event emission is **non-blocking** - runtime continues even if SSE fails
- Circuit breaker protects against cascading SSE failures
- Buffering ensures events aren't lost during brief disconnections
- All events include `event_id` for deduplication if needed
- Queue depth alerts are configurable per deployment

## Questions for Max

1. ✓ ObjectiveTracker location confirmed: `lib/execution/objective-tracker.js`
2. ✓ Queue thresholds: Dynamic (70%/90% of capacity)
3. ✓ Failure rate: 5% warning, 10% critical over 5min window
4. ✓ SSE client limit: Configurable, default 100 (via eventStream)
5. **Remaining:** Console server initialization file location for wiring?

