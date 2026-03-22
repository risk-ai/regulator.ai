# Phase 5A: Execution Event Stream

## Executive Summary

**Goal:** Live runtime observability via SSE event stream for envelope lifecycle and objective progress.

**Status:** Foundation exists (SSE infrastructure, ReplayLog, metrics). Phase 5A wires runtime events → SSE stream.

**Scope:** Observability layer only. No control-plane features (Phase 8).

**Validation gate:** Events arrive in <100ms, truthful to runtime state, no dropped events under normal load.

---

## 1. Architecture Decision: SSE vs WebSocket

### ✅ Decision: Server-Sent Events (SSE)

**Rationale:**

1. **One-way traffic:** Runtime → Console (no client→server execution commands in 5A)
2. **Simpler protocol:** HTTP-based, auto-reconnect built-in, no handshake overhead
3. **Already implemented:** `console/server/src/sse/eventStream.ts` provides foundation
4. **Browser native:** `EventSource` API, no library dependencies
5. **Sequential guarantee:** SSE preserves event order within single connection

**WebSocket deferred:** Only needed if Phase 8 requires bidirectional real-time control (e.g., streaming agent output). Current control-plane is REST-based.

**Implementation:** Build on existing `ViennaEventStream` class, extend event types, wire to Vienna Core emission points.

---

## 2. Event Schema

### 2.1 Envelope Lifecycle Events

```typescript
// Envelope started execution
interface ExecutionStartedEvent {
  type: 'execution.started';
  timestamp: string; // ISO 8601
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    action_type: string;
    target: string;
    risk_tier: 'T0' | 'T1' | 'T2';
    execution_class: 'T1' | 'T2';
    timeout_ms: number;
    attempt: number;
    started_at: string;
  };
}

// Envelope completed successfully
interface ExecutionCompletedEvent {
  type: 'execution.completed';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    completed_at: string;
    duration_ms: number;
    result_summary?: string; // Optional result preview
  };
}

// Envelope failed
interface ExecutionFailedEvent {
  type: 'execution.failed';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    failed_at: string;
    duration_ms: number;
    error: string;
    error_code?: string;
    will_retry: boolean;
    retry_after?: string; // ISO 8601
  };
}

// Envelope retried (after backoff)
interface ExecutionRetriedEvent {
  type: 'execution.retried';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    attempt: number;
    max_attempts: number;
    retried_at: string;
    previous_error: string;
  };
}

// Envelope timed out (Phase 4A integration)
interface ExecutionTimedOutEvent {
  type: 'execution.timeout';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    timeout_ms: number;
    duration_ms: number;
    execution_class: 'T1' | 'T2';
    timed_out_at: string;
  };
}

// Envelope blocked (precondition failed, dependency unsatisfied)
interface ExecutionBlockedEvent {
  type: 'execution.blocked';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    trigger_id: string;
    blocked_reason: string;
    blocked_at: string;
    preconditions_failed?: string[];
  };
}
```

### 2.2 Objective Progress Events

```typescript
// Objective created
interface ObjectiveCreatedEvent {
  type: 'objective.created';
  timestamp: string;
  payload: {
    objective_id: string;
    trigger_id: string;
    trigger_type: 'directive' | 'scheduled' | 'agent_proposal' | 'system';
    title: string;
    risk_tier: 'T0' | 'T1' | 'T2';
    envelope_count: number;
    created_at: string;
  };
}

// Objective progress update (envelope count change, status transition)
interface ObjectiveProgressUpdatedEvent {
  type: 'objective.progress.updated';
  timestamp: string;
  payload: {
    objective_id: string;
    status: 'pending' | 'executing' | 'blocked' | 'completed' | 'failed' | 'cancelled';
    current_step?: string;
    current_envelope_id?: string;
    envelope_count: number;
    completed_count: number;
    blocked_count: number;
    dead_letter_count: number;
    active_count: number;
    updated_at: string;
  };
}

// Objective completed (all envelopes resolved)
interface ObjectiveCompletedEvent {
  type: 'objective.completed';
  timestamp: string;
  payload: {
    objective_id: string;
    completed_at: string;
    duration_ms: number;
    total_envelopes: number;
    success_count: number;
    failure_count: number;
  };
}

// Objective failed (critical failure, operator cancelled)
interface ObjectiveFailedEvent {
  type: 'objective.failed';
  timestamp: string;
  payload: {
    objective_id: string;
    failed_at: string;
    reason: string;
    error_summary?: string;
  };
}
```

### 2.3 System Health Events (Phase 5A foundation for 5C)

```typescript
// Queue depth alert
interface QueueDepthAlertEvent {
  type: 'alert.queue.depth';
  timestamp: string;
  payload: {
    queue_depth: number;
    threshold: number;
    severity: 'warning' | 'critical';
  };
}

// Execution stall detected
interface ExecutionStallAlertEvent {
  type: 'alert.execution.stall';
  timestamp: string;
  payload: {
    envelope_id: string;
    objective_id: string;
    duration_ms: number;
    timeout_ms: number;
    percent_of_timeout: number;
  };
}

// High failure rate
interface FailureRateAlertEvent {
  type: 'alert.failure.rate';
  timestamp: string;
  payload: {
    failure_rate: number;
    threshold: number;
    window_start: string;
    window_end: string;
    total_executions: number;
    failed_executions: number;
  };
}
```

### 2.4 Event Type Registry (TypeScript)

**Location:** `console/server/src/types/api.ts`

**Additions:**

```typescript
export type SSEEventType =
  // System
  | 'system.status.updated'
  
  // Envelope lifecycle (NEW in Phase 5A)
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.retried'
  | 'execution.timeout'
  | 'execution.blocked'
  
  // Objective progress (NEW in Phase 5A)
  | 'objective.created'
  | 'objective.progress.updated'
  | 'objective.completed'
  | 'objective.failed'
  
  // Alerts (NEW in Phase 5A - foundation for 5C)
  | 'alert.queue.depth'
  | 'alert.execution.stall'
  | 'alert.failure.rate'
  
  // Phase 8 (existing - no changes)
  | 'decision.created'
  | 'decision.resolved'
  | 'deadletter.created'
  | 'deadletter.resolved'
  | 'health.updated'
  | 'integrity.updated'
  | 'replay.appended';
```

---

## 3. Backend Emission Points

### 3.1 Queued Executor Integration

**File:** `lib/execution/queued-executor.js`

**Emission points:**

```javascript
// In executeNext() method

// 1. Execution started
await this.viennaCore.eventStream.publish({
  type: 'execution.started',
  timestamp: new Date().toISOString(),
  payload: {
    envelope_id: envelope.envelope_id,
    objective_id: envelope.objective_id,
    trigger_id: envelope.trigger_id,
    action_type: envelope.actions[0].type,
    target: envelope.actions[0].target,
    risk_tier: envelope.risk_tier || 'T1',
    execution_class: envelope.execution_class || 'T1',
    timeout_ms: this._getTimeoutForEnvelope(envelope),
    attempt: envelope.attempt || 1,
    started_at: new Date().toISOString()
  }
});

// 2. Execution completed (on success)
await this.viennaCore.eventStream.publish({
  type: 'execution.completed',
  timestamp: new Date().toISOString(),
  payload: {
    envelope_id: envelope.envelope_id,
    objective_id: envelope.objective_id,
    trigger_id: envelope.trigger_id,
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    result_summary: this._extractResultSummary(result)
  }
});

// 3. Execution failed (on error)
await this.viennaCore.eventStream.publish({
  type: 'execution.failed',
  timestamp: new Date().toISOString(),
  payload: {
    envelope_id: envelope.envelope_id,
    objective_id: envelope.objective_id,
    trigger_id: envelope.trigger_id,
    failed_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    error: error.message,
    error_code: error.code,
    will_retry: this._shouldRetry(envelope, error),
    retry_after: this._getRetryTime(envelope)
  }
});

// 4. Execution timeout (existing in Phase 4A, add SSE)
await this.viennaCore.eventStream.publish({
  type: 'execution.timeout',
  timestamp: new Date().toISOString(),
  payload: {
    envelope_id: envelope.envelope_id,
    objective_id: envelope.objective_id,
    trigger_id: envelope.trigger_id,
    timeout_ms: timeoutMs,
    duration_ms: Date.now() - startTime,
    execution_class: envelope.execution_class || 'T1',
    timed_out_at: new Date().toISOString()
  }
});

// 5. Execution retried (after backoff)
await this.viennaCore.eventStream.publish({
  type: 'execution.retried',
  timestamp: new Date().toISOString(),
  payload: {
    envelope_id: envelope.envelope_id,
    objective_id: envelope.objective_id,
    trigger_id: envelope.trigger_id,
    attempt: envelope.attempt,
    max_attempts: envelope.max_attempts || 3,
    retried_at: new Date().toISOString(),
    previous_error: envelope.last_error
  }
});

// 6. Execution blocked (precondition check in Validator)
// (Emitted from Validator, not QueuedExecutor)
```

### 3.2 Objective Tracker Integration

**File:** `lib/core/objective-tracker.js` (inferred, verify actual location)

**Emission points:**

```javascript
// 1. Objective created
async createObjective(objectiveData) {
  const objective = await this._persist(objectiveData);
  
  await this.viennaCore.eventStream.publish({
    type: 'objective.created',
    timestamp: new Date().toISOString(),
    payload: {
      objective_id: objective.objective_id,
      trigger_id: objective.trigger_id,
      trigger_type: objective.trigger_type,
      title: objective.title,
      risk_tier: objective.risk_tier,
      envelope_count: objective.envelope_count,
      created_at: objective.created_at
    }
  });
  
  return objective;
}

// 2. Objective progress updated (on envelope state change)
async updateObjectiveProgress(objectiveId, updates) {
  const objective = await this._applyUpdates(objectiveId, updates);
  
  await this.viennaCore.eventStream.publish({
    type: 'objective.progress.updated',
    timestamp: new Date().toISOString(),
    payload: {
      objective_id: objective.objective_id,
      status: objective.status,
      current_step: objective.current_step,
      current_envelope_id: objective.current_envelope_id,
      envelope_count: objective.envelope_count,
      completed_count: objective.completed_count,
      blocked_count: objective.blocked_count,
      dead_letter_count: objective.dead_letter_count,
      active_count: objective.active_count,
      updated_at: new Date().toISOString()
    }
  });
  
  return objective;
}

// 3. Objective completed
async completeObjective(objectiveId, summary) {
  const objective = await this._markCompleted(objectiveId);
  
  await this.viennaCore.eventStream.publish({
    type: 'objective.completed',
    timestamp: new Date().toISOString(),
    payload: {
      objective_id: objective.objective_id,
      completed_at: objective.completed_at,
      duration_ms: new Date(objective.completed_at) - new Date(objective.created_at),
      total_envelopes: objective.envelope_count,
      success_count: objective.completed_count,
      failure_count: objective.dead_letter_count
    }
  });
  
  return objective;
}

// 4. Objective failed
async failObjective(objectiveId, reason) {
  const objective = await this._markFailed(objectiveId, reason);
  
  await this.viennaCore.eventStream.publish({
    type: 'objective.failed',
    timestamp: new Date().toISOString(),
    payload: {
      objective_id: objective.objective_id,
      failed_at: objective.failed_at,
      reason: reason,
      error_summary: objective.error_summary
    }
  });
  
  return objective;
}
```

### 3.3 Execution Metrics Integration (Alert Foundation)

**File:** `lib/execution/execution-metrics.js`

**Emission points:**

```javascript
// In recordComplete() method - check for alert thresholds

recordComplete(tracking, status) {
  // ... existing metrics recording ...
  
  // Check for high failure rate
  const failureRate = this.totalFailures / this.totalExecutions;
  if (failureRate > this.failureRateThreshold) {
    this.viennaCore.eventStream.publish({
      type: 'alert.failure.rate',
      timestamp: new Date().toISOString(),
      payload: {
        failure_rate: failureRate,
        threshold: this.failureRateThreshold,
        window_start: this.windowStart,
        window_end: new Date().toISOString(),
        total_executions: this.totalExecutions,
        failed_executions: this.totalFailures
      }
    });
  }
  
  // Check for slow execution (approaching timeout)
  if (this._isSlowExecution(tracking)) {
    const percentOfTimeout = (tracking.durationMs / tracking.timeoutMs) * 100;
    
    this.viennaCore.eventStream.publish({
      type: 'alert.execution.stall',
      timestamp: new Date().toISOString(),
      payload: {
        envelope_id: tracking.envelopeId,
        objective_id: tracking.objectiveId,
        duration_ms: tracking.durationMs,
        timeout_ms: tracking.timeoutMs,
        percent_of_timeout: percentOfTimeout
      }
    });
  }
}
```

### 3.4 Queue Manager Integration (Queue Depth Alerts)

**File:** `lib/execution/queue-manager.js` (inferred, verify location)

**Emission points:**

```javascript
// In enqueue() method - check queue depth threshold

async enqueue(envelope) {
  await this._addToQueue(envelope);
  
  const queueDepth = this.queue.length;
  const threshold = this.queueDepthAlertThreshold || 100;
  
  if (queueDepth > threshold) {
    const severity = queueDepth > threshold * 2 ? 'critical' : 'warning';
    
    await this.viennaCore.eventStream.publish({
      type: 'alert.queue.depth',
      timestamp: new Date().toISOString(),
      payload: {
        queue_depth: queueDepth,
        threshold: threshold,
        severity: severity
      }
    });
  }
}
```

### 3.5 Emission Flow Architecture

```
Runtime Components          Event Stream              Console SSE
─────────────────────      ──────────────            ─────────────

QueuedExecutor ──────────> eventStream.publish() ──> ViennaEventStream
  │                              │                         │
  ├─ execution.started           │                         ├─> Browser Client 1
  ├─ execution.completed         │                         ├─> Browser Client 2
  ├─ execution.failed            │                         └─> Browser Client N
  ├─ execution.timeout           │
  └─ execution.retried           │
                                 │
ObjectiveTracker ─────────────> │
  │                              │
  ├─ objective.created           │
  ├─ objective.progress.updated  │
  ├─ objective.completed         │
  └─ objective.failed            │
                                 │
ExecutionMetrics ─────────────> │
  │                              │
  ├─ alert.failure.rate          │
  └─ alert.execution.stall       │
                                 │
QueueManager ─────────────────> │
  │                              │
  └─ alert.queue.depth           │
```

---

## 4. Frontend Consumption Pattern

### 4.1 React Hook: useViennaStream

**File:** `console/client/src/api/stream.ts`

**Implementation:**

```typescript
import { useEffect, useRef, useState } from 'react';
import type { SSEEvent } from './types';

interface UseViennaStreamOptions {
  onEvent?: (event: SSEEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectDelay?: number;
}

export function useViennaStream(options: UseViennaStreamOptions = {}) {
  const {
    onEvent,
    onConnect,
    onDisconnect,
    reconnect = true,
    reconnectDelay = 3000
  } = options;
  
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    function connect() {
      const eventSource = new EventSource(
        `${import.meta.env.VITE_API_BASE}/stream`
      );
      
      eventSource.onopen = () => {
        console.log('[ViennaStream] Connected');
        setConnected(true);
        onConnect?.();
      };
      
      eventSource.onerror = (error) => {
        console.error('[ViennaStream] Error:', error);
        setConnected(false);
        eventSource.close();
        onDisconnect?.();
        
        // Auto-reconnect
        if (reconnect) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('[ViennaStream] Reconnecting...');
            connect();
          }, reconnectDelay);
        }
      };
      
      // Generic message handler (all event types)
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          onEvent?.(data);
        } catch (error) {
          console.error('[ViennaStream] Failed to parse event:', error);
        }
      };
      
      // Specific event type handlers (optional)
      eventSource.addEventListener('execution.started', (event) => {
        const data = JSON.parse(event.data) as SSEEvent;
        onEvent?.(data);
      });
      
      eventSource.addEventListener('execution.completed', (event) => {
        const data = JSON.parse(event.data) as SSEEvent;
        onEvent?.(data);
      });
      
      // ... add listeners for other event types as needed
      
      eventSourceRef.current = eventSource;
    }
    
    connect();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [onEvent, onConnect, onDisconnect, reconnect, reconnectDelay]);
  
  return { connected };
}
```

### 4.2 Component Integration Example

**File:** `console/client/src/components/Dashboard.tsx`

```typescript
import { useViennaStream } from '@/api/stream';
import { useState } from 'react';
import type { ObjectiveSummary, EnvelopeExecution } from '@/api/types';

export function Dashboard() {
  const [objectives, setObjectives] = useState<ObjectiveSummary[]>([]);
  const [activeEnvelopes, setActiveEnvelopes] = useState<EnvelopeExecution[]>([]);
  
  useViennaStream({
    onEvent: (event) => {
      switch (event.type) {
        case 'objective.created':
          // Add new objective to list
          setObjectives(prev => [...prev, event.payload]);
          break;
          
        case 'objective.progress.updated':
          // Update existing objective
          setObjectives(prev => prev.map(obj =>
            obj.objective_id === event.payload.objective_id
              ? { ...obj, ...event.payload }
              : obj
          ));
          break;
          
        case 'execution.started':
          // Add to active executions
          setActiveEnvelopes(prev => [...prev, event.payload]);
          break;
          
        case 'execution.completed':
        case 'execution.failed':
        case 'execution.timeout':
          // Remove from active executions
          setActiveEnvelopes(prev =>
            prev.filter(env => env.envelope_id !== event.payload.envelope_id)
          );
          break;
          
        case 'alert.queue.depth':
          // Show notification
          console.warn('Queue depth alert:', event.payload);
          break;
      }
    },
    onConnect: () => console.log('Stream connected'),
    reconnect: true
  });
  
  return (
    <div>
      <ObjectivesPanel objectives={objectives} />
      <ActiveExecutionsPanel envelopes={activeEnvelopes} />
    </div>
  );
}
```

### 4.3 Event Handling Patterns

**Pattern 1: Optimistic UI Updates**

```typescript
// User triggers action via REST API
const result = await objectivesApi.cancel(objectiveId);

// Optimistically update local state
setObjectives(prev => prev.map(obj =>
  obj.objective_id === objectiveId
    ? { ...obj, status: 'cancelled' }
    : obj
));

// SSE event will arrive shortly to confirm/correct
useViennaStream({
  onEvent: (event) => {
    if (event.type === 'objective.failed' && 
        event.payload.objective_id === objectiveId) {
      // SSE confirms cancellation (sets objective to failed state)
      // Local state already updated optimistically
    }
  }
});
```

**Pattern 2: Real-time Notifications**

```typescript
useViennaStream({
  onEvent: (event) => {
    if (event.type === 'alert.failure.rate') {
      toast.error(
        `Failure rate ${(event.payload.failure_rate * 100).toFixed(1)}% exceeds threshold`,
        { severity: 'critical' }
      );
    }
    
    if (event.type === 'execution.timeout') {
      toast.warning(
        `Envelope ${event.payload.envelope_id} timed out after ${event.payload.timeout_ms}ms`
      );
    }
  }
});
```

**Pattern 3: Activity Log**

```typescript
const [activityLog, setActivityLog] = useState<SSEEvent[]>([]);

useViennaStream({
  onEvent: (event) => {
    // Append all events to activity log (capped at 100)
    setActivityLog(prev => [event, ...prev].slice(0, 100));
  }
});

// Render as timeline
return (
  <ActivityTimeline events={activityLog} />
);
```

---

## 5. Implementation Sequence

### 5.1 Week 1: Core Event Emission

**Goal:** Envelope lifecycle events flowing to SSE stream

**Tasks:**

1. **Extend SSE event types** (1 hour)
   - Add Phase 5A event types to `types/api.ts`
   - Add payload interfaces for each event type
   - Update `SSEEventType` union

2. **Wire ViennaEventStream to Vienna Core** (2 hours)
   - Add `eventStream` property to ViennaCore class
   - Instantiate `ViennaEventStream` in constructor
   - Start heartbeat mechanism on runtime initialization
   - Export eventStream for emission from components

3. **Emit execution lifecycle events** (4 hours)
   - Modify `queued-executor.js`:
     - `execution.started` at start of `executeNext()`
     - `execution.completed` on success
     - `execution.failed` on error
     - `execution.timeout` in `_handleExecutionTimeout()`
     - `execution.retried` after backoff delay
   - Test event emission in isolation (unit tests)

4. **Console server integration** (2 hours)
   - Verify `ViennaRuntimeService` receives Vienna Core instance with eventStream
   - Confirm `/api/v1/stream` endpoint exposes SSE
   - Test with `curl -N` to verify events arrive

5. **Basic frontend consumption** (3 hours)
   - Implement `useViennaStream` hook
   - Create simple test component showing live execution count
   - Verify events arrive in browser console

**Validation:**
- ✅ Execution events arrive within 100ms of runtime state change
- ✅ No events dropped under 10 concurrent executions
- ✅ Browser auto-reconnects on disconnect

### 5.2 Week 2: Objective Progress Events

**Goal:** Objective-level observability

**Tasks:**

1. **Create ObjectiveTracker component** (if not exists) (3 hours)
   - Centralized objective state management
   - Aggregate envelope counts (active, completed, blocked, dead letter)
   - Status transitions (pending → executing → completed/failed)

2. **Emit objective events** (4 hours)
   - `objective.created` on objective instantiation
   - `objective.progress.updated` on envelope state change
   - `objective.completed` when all envelopes resolved
   - `objective.failed` on critical failure or cancellation

3. **Update frontend dashboard** (4 hours)
   - ObjectivesPanel consumes `objective.*` events
   - Real-time status updates (no polling)
   - Progress bars update live

**Validation:**
- ✅ Objective status updates within 200ms of envelope completion
- ✅ Progress metrics accurate (compare to REST API snapshot)
- ✅ No phantom objectives (create→complete lifecycle tracked)

### 5.3 Week 3: Alert Events (Foundation for 5C)

**Goal:** Health/performance alerts via SSE

**Tasks:**

1. **Emit queue depth alerts** (2 hours)
   - Threshold check in queue manager `enqueue()`
   - Severity levels (warning at threshold, critical at 2x)
   - Debouncing (max 1 alert per 30s)

2. **Emit execution stall alerts** (2 hours)
   - Check in `ExecutionMetrics.recordComplete()`
   - Alert when execution exceeds 50% of timeout
   - Include envelope ID for operator inspection

3. **Emit failure rate alerts** (2 hours)
   - Sliding window calculation (last 100 executions)
   - Alert when failure rate exceeds 5%
   - Include time window and counts

4. **Frontend alert handling** (4 hours)
   - Toast notifications for critical alerts
   - Alert panel showing recent alerts (last 20)
   - Alert history persistence (localStorage for session)

**Validation:**
- ✅ Queue depth alert fires when threshold exceeded
- ✅ Stall alert fires for slow executions
- ✅ Failure rate alert fires during degraded performance
- ✅ Alerts do not spam (debouncing works)

### 5.4 Week 4: Validation & Hardening

**Goal:** Production-ready event stream

**Tasks:**

1. **Load testing** (4 hours)
   - Generate 100 concurrent envelopes
   - Verify all events arrive
   - Measure event latency (p50, p95, p99)
   - Verify no memory leaks (long-running stream)

2. **Error handling** (3 hours)
   - Graceful degradation if SSE publish fails
   - Log emission failures (do not crash runtime)
   - Circuit breaker if SSE repeatedly fails (disable after N failures)

3. **Reconnection testing** (2 hours)
   - Kill server, verify client reconnects
   - Network interruption simulation (disconnect WiFi)
   - Verify no events lost during reconnection window (within reason)

4. **Documentation** (3 hours)
   - Event schema reference (all event types + payloads)
   - Integration guide for new components
   - Frontend consumption patterns (examples)
   - Troubleshooting guide (common issues)

**Validation:**
- ✅ 100 concurrent executions: <1% event loss
- ✅ Event latency p95 < 200ms
- ✅ Client reconnects within 5s of disconnection
- ✅ No runtime crashes on SSE publish failure

---

## 6. Validation Criteria for 5A Completion

### 6.1 Functional Requirements

- ✅ **F1:** All envelope lifecycle events emitted (started, completed, failed, retried, timeout, blocked)
- ✅ **F2:** All objective progress events emitted (created, progress.updated, completed, failed)
- ✅ **F3:** Alert events emitted for queue depth, execution stall, failure rate
- ✅ **F4:** Events arrive via SSE at `/api/v1/stream`
- ✅ **F5:** Frontend `useViennaStream` hook consumes events
- ✅ **F6:** Dashboard updates in real-time without polling

### 6.2 Performance Requirements

- ✅ **P1:** Event emission latency < 100ms (runtime state change → SSE publish)
- ✅ **P2:** Event delivery latency < 200ms (SSE publish → browser receives)
- ✅ **P3:** No event loss under normal load (≤100 concurrent executions)
- ✅ **P4:** SSE heartbeat every 30s (prevent connection timeout)
- ✅ **P5:** Client reconnects within 5s of disconnection

### 6.3 Reliability Requirements

- ✅ **R1:** SSE publish failures do not crash runtime
- ✅ **R2:** Failed publish attempts logged for debugging
- ✅ **R3:** Circuit breaker disables SSE after 10 consecutive failures (runtime continues)
- ✅ **R4:** Client auto-reconnect with exponential backoff (3s, 6s, 12s, max 30s)
- ✅ **R5:** No memory leaks in long-running SSE connections (24hr soak test)

### 6.4 Integration Requirements

- ✅ **I1:** Events truthful to runtime state (no phantom events, no missed state changes)
- ✅ **I2:** Event schema matches TypeScript DTOs in `types/api.ts`
- ✅ **I3:** Backward compatible with existing REST API (SSE is additive, not replacement)
- ✅ **I4:** ReplayLog still persists events to JSONL (SSE does not replace audit trail)
- ✅ **I5:** Phase 4 metrics unchanged (SSE is observability layer, not data layer)

### 6.5 Acceptance Test

**Scenario:** Execute 10 envelopes across 2 objectives, verify events

```bash
# 1. Start Vienna runtime
npm start

# 2. Start console server
cd console/server && npm run dev

# 3. Open browser to http://localhost:5173
# 4. Open browser console (DevTools)

# 5. Submit directive via console UI:
#    "Create 10 test files in /tmp/vienna-test/"

# Expected events (in order):
# - objective.created (objective_id: obj_...)
# - execution.started (envelope_id: env_..._001)
# - execution.completed (env_..._001)
# - objective.progress.updated (completed_count: 1)
# - execution.started (env_..._002)
# - execution.completed (env_..._002)
# - objective.progress.updated (completed_count: 2)
# ... (repeat for remaining 8 envelopes)
# - objective.completed (total_envelopes: 10, success_count: 10)

# Verification:
# ✅ All 10 execution.started events received
# ✅ All 10 execution.completed events received
# ✅ 10 objective.progress.updated events received
# ✅ 1 objective.completed event received
# ✅ Events arrived within 5 seconds of execution
# ✅ Browser showed live progress (no page refresh needed)
```

### 6.6 Phase 5A Complete Definition

**Phase 5A is complete when:**

1. All functional requirements (F1-F6) validated ✅
2. All performance requirements (P1-P5) validated ✅
3. All reliability requirements (R1-R5) validated ✅
4. All integration requirements (I1-I5) validated ✅
5. Acceptance test passes ✅
6. Documentation complete (event schema, integration guide, troubleshooting) ✅
7. **No scope creep into Phase 5B-E** (timeline viz, statistics) or Phase 8 (control-plane)

**Deliverables:**

- [ ] `PHASE_5A_COMPLETION_REPORT.md` (validation results, metrics, known issues)
- [ ] Event schema documentation (`docs/EVENT_SCHEMA.md`)
- [ ] Integration guide for developers (`docs/SSE_INTEGRATION.md`)
- [ ] Updated `console/README.md` with Phase 5A status

---

## 7. Out of Scope (Deferred to Later Phases)

### 7.1 Phase 5B: Timeline Visualization
- Historical event replay UI
- Causal chain graph rendering
- Execution timeline scrubbing

### 7.2 Phase 5C: Statistics & Dashboards
- Aggregate metrics over time windows
- Latency histograms
- Success/failure rate charts
- Queue depth trends

### 7.3 Phase 5D: Filtering & Search
- Event stream filtering (by objective, risk tier, event type)
- Search historical events
- Export event stream to CSV/JSON

### 7.4 Phase 5E: Alerting Rules
- Custom alert thresholds (operator-defined)
- Alert routing (email, Slack, webhook)
- Alert suppression/snoozing

### 7.5 Phase 8: Control-Plane Features
- Pause/resume execution via SSE
- Live envelope cancellation
- Directive submission streaming responses
- Agent reasoning streaming output

**Rationale:** Phase 5A provides the **observability foundation**. Later phases build visualizations and interactivity on top of this real-time event stream.

---

## 8. Design Decisions & Rationale

### 8.1 Why SSE Instead of WebSocket?

**Decision:** Server-Sent Events (SSE)

**Rationale:**

1. **Simpler protocol:** HTTP-based, no handshake overhead, built-in auto-reconnect
2. **One-way traffic:** Phase 5A is observability (server → client), no client → server commands needed
3. **Browser native:** `EventSource` API, no WebSocket library dependencies
4. **Debugging:** Easy to inspect with `curl -N`, standard HTTP tools
5. **Firewall-friendly:** Works through HTTP proxies, no special port requirements

**When to use WebSocket:** If Phase 8 requires bidirectional real-time control (e.g., streaming agent output while execution runs, live REPL into running envelope), upgrade to WebSocket at that time.

### 8.2 Why Not Polling?

**Alternative:** Frontend polls `/api/v1/objectives` every 2 seconds

**Rejected because:**

1. **Latency:** 2s polling delay vs <200ms SSE delivery
2. **Server load:** N clients × 0.5 RPS = wasted CPU on unchanged state
3. **Bandwidth:** Full objective snapshots vs incremental events
4. **Scalability:** Polling doesn't scale to 100+ browser clients
5. **User experience:** SSE feels instant, polling feels sluggish

**SSE advantages:** Push-based, efficient, low latency, scalable.

### 8.3 Why Event Stream Separate from ReplayLog?

**Decision:** SSE emits events in parallel to ReplayLog (both exist)

**Rationale:**

1. **Separation of concerns:** ReplayLog = durable audit trail, SSE = ephemeral observability
2. **Different consumers:** ReplayLog for debugging/forensics, SSE for live UI
3. **Different lifetimes:** ReplayLog persists forever, SSE events lost on disconnect
4. **Performance:** SSE optimized for low latency, ReplayLog optimized for completeness
5. **Reliability:** ReplayLog failures are critical (must persist), SSE failures are graceful (UI degradation only)

**Alternative considered:** SSE reads from ReplayLog (tail -f pattern)

**Rejected because:** Adds JSONL parsing overhead, introduces file I/O latency, couples observability to audit trail implementation.

### 8.4 Why Not Batch Events?

**Decision:** Emit events individually as they occur

**Rationale:**

1. **Latency:** Individual events arrive instantly, batching adds delay
2. **Simplicity:** No buffering logic, no partial batch handling
3. **Truthfulness:** Events reflect exact runtime state at emission time
4. **Bandwidth:** SSE is efficient enough for individual events (<1KB each)

**When to batch:** If event rate exceeds 100/sec, consider batching or sampling. Current expected rate: <10/sec under normal load.

### 8.5 Why Alerts via SSE Instead of Separate Channel?

**Decision:** Alerts are SSE events (same stream as execution events)

**Rationale:**

1. **Unified stream:** Single connection for all observability
2. **Simplicity:** No separate alerting infrastructure
3. **Correlation:** Alerts arrive in same stream as events that triggered them
4. **Filtering:** Frontend can filter alerts vs execution events if needed

**Future:** If alerts require routing (email, Slack), add separate alerting service in Phase 5E. SSE alerts remain for real-time UI notifications.

---

## 9. Risk Assessment & Mitigation

### 9.1 Risk: Event Loss During Disconnection

**Scenario:** Client disconnects for 30s, misses 50 events

**Impact:** UI shows stale state until page refresh

**Mitigation:**

1. **Short-term (Phase 5A):** Client polls `/api/v1/dashboard` on reconnect to resync state
2. **Medium-term (Phase 5B):** Add `?since=<timestamp>` parameter to `/api/v1/stream` for event replay
3. **Long-term (Phase 5D):** SSE stream includes sequence numbers, client detects gaps and requests backfill

**Accepted risk for Phase 5A:** Operator can refresh page to resync. Not a critical failure.

### 9.2 Risk: SSE Emission Failures Slow Down Runtime

**Scenario:** `eventStream.publish()` blocks on slow network, delays envelope execution

**Impact:** Execution latency increases, throughput decreases

**Mitigation:**

1. **Non-blocking emit:** Wrap `eventStream.publish()` in `setImmediate()` to avoid blocking
2. **Fire-and-forget:** Do not await SSE publish in critical path
3. **Circuit breaker:** Disable SSE after 10 consecutive failures (runtime continues normally)

**Implementation:**

```javascript
// Non-blocking emit helper
function emitEvent(type, payload) {
  setImmediate(() => {
    this.viennaCore.eventStream.publish({ type, timestamp: new Date().toISOString(), payload })
      .catch(error => {
        console.error(`Failed to emit ${type}:`, error);
        this.sseFailureCount++;
        if (this.sseFailureCount > 10) {
          console.warn('SSE circuit breaker opened (too many failures)');
          this.sseEnabled = false;
        }
      });
  });
}
```

### 9.3 Risk: Memory Leak in Long-Running SSE Connections

**Scenario:** Client stays connected for 24 hours, server accumulates client references

**Impact:** Memory usage grows unbounded, eventual OOM

**Mitigation:**

1. **Client cleanup on disconnect:** `res.on('close', () => unsubscribe(clientId))`
2. **Periodic garbage collection:** Remove stale clients (no heartbeat response in 60s)
3. **Connection limit:** Max 100 concurrent SSE clients (reject new connections if exceeded)
4. **Memory monitoring:** Track `eventStream.getClientCount()` in health checks

**Validation:** 24-hour soak test with 10 persistent connections, verify memory stable.

### 9.4 Risk: Event Schema Drift (Backend vs Frontend)

**Scenario:** Backend emits new field, frontend TypeScript breaks

**Impact:** Console crashes or shows incorrect data

**Mitigation:**

1. **Shared types:** `types/api.ts` is single source of truth, copied to client
2. **Versioned events:** Add `version` field to events (currently `v1`)
3. **Backward compatibility:** New fields are optional, old clients ignore them
4. **Schema validation:** Backend validates events against schema before emit (optional, for safety)

**Long-term:** Use Protocol Buffers or JSON Schema for strict schema enforcement.

### 9.5 Risk: SSE Incompatibility with Some Proxies/Firewalls

**Scenario:** Corporate proxy buffers SSE responses, events delayed by minutes

**Impact:** Real-time updates don't arrive in real-time

**Mitigation:**

1. **Unbuffered headers:** Set `X-Accel-Buffering: no` for nginx compatibility
2. **Heartbeat mechanism:** 30s heartbeat keeps connection alive, detects buffering
3. **Fallback to polling:** If SSE fails or lags >10s, fall back to REST polling
4. **Documentation:** Note SSE requirements in deployment guide (nginx config, firewall rules)

**Accepted risk:** If SSE doesn't work in environment, polling fallback is acceptable (Phase 5A still delivers value).

---

## 10. Success Metrics

### 10.1 Latency

- **Event emission latency:** <100ms (runtime state change → SSE publish call)
- **Event delivery latency:** <200ms (SSE publish → browser receives)
- **End-to-end latency:** <300ms (envelope completes → UI updates)

### 10.2 Reliability

- **Event delivery rate:** >99% under normal load (<100 concurrent executions)
- **Uptime:** SSE stream available 24/7 (client reconnects automatically on transient failures)
- **Graceful degradation:** Runtime continues if SSE fails (no cascading failures)

### 10.3 Scalability

- **Concurrent clients:** Support 100 simultaneous SSE connections
- **Event throughput:** Handle 100 events/sec without backpressure
- **Memory footprint:** <10MB additional memory for SSE infrastructure

### 10.4 Developer Experience

- **Integration time:** New frontend component can consume SSE events in <30 minutes
- **Debugging:** Events visible in browser DevTools Network tab (SSE stream)
- **Documentation quality:** Developer can implement new event type in <1 hour after reading docs

---

## 11. Next Steps (Post-5A)

### Phase 5B: Timeline Visualization (Week 5-6)

**Goal:** Visual timeline of envelope execution history

**Features:**
- Horizontal timeline showing envelope start/complete/fail events
- Zoom/pan controls
- Click envelope to see details
- Causal chain visualization (parent → child relationships)

**Foundation from 5A:** Event stream provides data, 5B adds visualization layer.

### Phase 5C: Statistics & Dashboards (Week 7-8)

**Goal:** Aggregate metrics and trends

**Features:**
- Success/failure rate charts (last 1hr, 24hr, 7d)
- Latency percentile graphs (p50, p95, p99)
- Queue depth over time
- Execution throughput (envelopes/min)

**Foundation from 5A:** Alert events provide data points, 5C adds aggregation and charting.

### Phase 5D: Filtering & Search (Week 9-10)

**Goal:** Operator can filter event stream and search history

**Features:**
- Filter SSE stream by: objective, risk tier, event type, agent
- Search historical events (ReplayLog query UI)
- Export filtered events to CSV
- Saved filters (presets)

**Foundation from 5A:** Event schema standardized, 5D adds query layer.

### Phase 5E: Alerting Rules (Week 11-12)

**Goal:** Custom alert configuration and routing

**Features:**
- Operator-defined thresholds (e.g., "alert if queue depth > 50")
- Alert routing (email, Slack webhook, SMS via Twilio)
- Alert suppression (snooze for 1hr, 24hr, indefinitely)
- Alert history and acknowledgment

**Foundation from 5A:** Alert events exist, 5E adds rule engine and routing.

---

## 12. Appendix

### A. File Modification Checklist

**Vienna Core (Runtime):**

- [ ] `lib/execution/queued-executor.js` — Emit execution lifecycle events
- [ ] `lib/execution/execution-metrics.js` — Emit alert events (stall, failure rate)
- [ ] `lib/core/objective-tracker.js` — Emit objective progress events (verify file exists)
- [ ] `lib/execution/queue-manager.js` — Emit queue depth alerts (verify file exists)
- [ ] `lib/core/vienna-core.js` — Instantiate `ViennaEventStream`, expose `eventStream` property

**Console Server:**

- [ ] `console/server/src/types/api.ts` — Add Phase 5A event types and payload interfaces
- [ ] `console/server/src/sse/eventStream.ts` — Already exists, verify compatibility
- [ ] `console/server/src/services/viennaRuntime.ts` — Verify `eventStream` accessible from Vienna Core

**Console Client:**

- [ ] `console/client/src/api/stream.ts` — Implement `useViennaStream` hook
- [ ] `console/client/src/api/types.ts` — Mirror backend event types
- [ ] `console/client/src/components/Dashboard.tsx` — Consume SSE events for real-time updates

### B. Testing Checklist

**Unit Tests:**

- [ ] `tests/phase5a-sse-emission.test.js` — Verify events emitted from QueuedExecutor
- [ ] `tests/phase5a-objective-events.test.js` — Verify objective progress events
- [ ] `tests/phase5a-alert-events.test.js` — Verify alert thresholds trigger events
- [ ] `tests/phase5a-event-schema.test.js` — Validate event payloads match TypeScript DTOs

**Integration Tests:**

- [ ] `tests/phase5a-sse-e2e.test.js` — Full flow: envelope execution → SSE → frontend receives
- [ ] `tests/phase5a-reconnection.test.js` — Client disconnect/reconnect, verify resumption
- [ ] `tests/phase5a-load.test.js` — 100 concurrent executions, verify no event loss

**Manual Tests:**

- [ ] Browser DevTools shows SSE events in Network tab
- [ ] Dashboard updates in real-time without polling
- [ ] Alert toast appears when threshold exceeded
- [ ] Reconnection works after server restart

### C. Documentation Checklist

- [ ] `docs/EVENT_SCHEMA.md` — Complete reference for all event types and payloads
- [ ] `docs/SSE_INTEGRATION.md` — Developer guide for consuming SSE events
- [ ] `docs/TROUBLESHOOTING_SSE.md` — Common issues (proxy buffering, reconnection, event loss)
- [ ] `console/README.md` — Update with Phase 5A status and features
- [ ] `PHASE_5A_COMPLETION_REPORT.md` — Final validation results and metrics

### D. Event Schema Quick Reference

```
Envelope Lifecycle:
- execution.started      → Envelope begins execution
- execution.completed    → Envelope succeeds
- execution.failed       → Envelope fails (with retry info)
- execution.retried      → Envelope retried after backoff
- execution.timeout      → Envelope exceeds timeout (Phase 4A)
- execution.blocked      → Envelope blocked by precondition

Objective Progress:
- objective.created             → New objective instantiated
- objective.progress.updated    → Envelope count or status changed
- objective.completed           → All envelopes resolved successfully
- objective.failed              → Objective failed or cancelled

Alerts:
- alert.queue.depth        → Queue exceeds threshold
- alert.execution.stall    → Execution approaching timeout
- alert.failure.rate       → Failure rate exceeds threshold
```

---

## End of Phase 5A Plan

**Next action:** Review with Vienna operator (Max), obtain approval, begin Week 1 implementation.

**Questions for Max:**

1. ObjectiveTracker location — Does `lib/core/objective-tracker.js` exist, or is objective state managed elsewhere?
2. Queue depth threshold — What's acceptable queue depth before alert? (Proposed: 100 warning, 200 critical)
3. Failure rate threshold — What failure rate triggers alert? (Proposed: 5%)
4. SSE client limit — Max concurrent browser clients? (Proposed: 100, reject new connections beyond)
5. Phase 5A timeline — 4 weeks acceptable, or compress to 3 weeks?

**Approval required before implementation begins.**
