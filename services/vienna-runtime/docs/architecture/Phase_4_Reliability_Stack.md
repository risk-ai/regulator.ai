# Phase 4: Execution Reliability Stack

## Overview

Phase 4 implements comprehensive reliability features for envelope execution:

- **Phase 4A:** Timeout Protection (✅ Complete)
- **Phase 4B:** Queue Robustness (✅ Complete)
- **Phase 4C:** Retry Policies (✅ Complete)
- **Phase 4D:** Idempotent Execution (✅ Complete)
- **Phase 4E:** Execution Time Metrics (✅ Complete)

---

## Phase 4B: Queue Robustness

### Concurrency Limits

Prevents executor overload by limiting concurrent executions:

```javascript
new QueuedExecutor(viennaCore, {
  concurrency: 5  // Max 5 concurrent envelope executions
})
```

**Features:**
- Configurable max concurrent executions (default: 5)
- Queue backpressure when concurrency limit reached
- Execution blocked until slot available

**API:**
```javascript
executor.getConcurrencyState()
// Returns: { current_executions, max_concurrency, available_slots }
```

### Backpressure Handling

Protects against queue overflow:

```javascript
new QueuedExecutor(viennaCore, {
  queueOptions: {
    maxQueueSize: 1000,              // Max queue size
    backpressureMode: 'reject',      // 'reject' | 'wait'
    backpressureWaitTimeout: 30000   // 30s wait timeout
  }
})
```

**Modes:**
- **reject:** Immediately reject new submissions when queue full
- **wait:** Wait for queue space (with timeout)

**Errors:**
```javascript
try {
  await executor.submit(envelope);
} catch (error) {
  if (error.code === 'QUEUE_BACKPRESSURE') {
    console.log(`Queue full: ${error.queueSize}/${error.maxSize}`);
  }
}
```

---

## Phase 4C: Retry Policies

### Exponential Backoff

Automatically retries transient failures with exponential backoff:

```javascript
new QueuedExecutor(viennaCore, {
  retryPolicy: {
    maxRetries: 3,           // Max retry attempts
    baseDelay: 1000,         // 1 second initial delay
    maxDelay: 60000,         // 60 second max delay
    backoffMultiplier: 2     // 2x backoff multiplier
  }
})
```

**Backoff Formula:**
```
delay = min(baseDelay * (backoffMultiplier ^ retryCount), maxDelay)
```

**Example Schedule:**
- Attempt 1: 1000ms
- Attempt 2: 2000ms
- Attempt 3: 4000ms
- Attempt 4: 8000ms

### Failure Classification

Automatically distinguishes transient vs. permanent failures:

**Transient (retried):**
- Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
- Temporary resource failures
- 429 Too Many Requests
- 503 Service Unavailable

**Permanent (not retried):**
- Validation errors (400, 422)
- Authorization failures (401, 403)
- Not found (404)
- Internal logic errors

### Retry Exhaustion

When retry limit reached, envelope moved to Dead Letter Queue (DLQ):

```javascript
const dlqEntries = executor.getDeadLetters({ reason: 'retry_exhausted' });
```

**Requeue from DLQ:**
```javascript
await executor.requeueDeadLetter(envelopeId);
```

**API:**
```javascript
executor.getRetryPolicyConfig()
// Returns: { maxRetries, baseDelay, maxDelay, backoffMultiplier, schedule }
```

---

## Phase 4D: Idempotent Execution

### Execution Deduplication

Prevents duplicate execution of same envelope:

**Features:**
- Detect duplicate envelope submissions
- Return cached results for completed envelopes
- Track execution attempts per envelope
- Skip execution if already in progress

**Example:**
```javascript
// First submission
await executor.submit(envelope); // Executes

// Duplicate submission
await executor.submit(envelope); // Returns cached result
```

### Execution Attempt Tracking

Track all execution attempts for audit:

```javascript
const attempts = executor.queue.getExecutionAttempts(envelopeId);
// Returns: [{ event: 'enqueued', timestamp }, { event: 'started', timestamp }, ...]
```

### State Reconciliation

Verify state before retry execution:

```javascript
// On retry, check if already executed
if (executor.queue.isAlreadyExecuted(envelopeId)) {
  const result = executor.queue.getCachedResult(envelopeId);
  return result; // Skip duplicate execution
}
```

---

## Phase 4E: Execution Time Metrics

### Metric Collection

Automatically collects execution time metrics:

```javascript
new QueuedExecutor(viennaCore, {
  metricsEnabled: true  // Enable metrics (default: true)
})
```

**Metrics tracked:**
- Mean execution time
- P50, P95, P99 latency
- Timeout rate
- Success/failure rate
- Slow execution detection

### API

**Global Metrics:**
```javascript
const metrics = executor.getExecutionMetrics();

console.log(metrics);
// {
//   totalExecutions: 1000,
//   totalSuccess: 950,
//   totalTimeouts: 20,
//   totalFailures: 30,
//   successRate: 0.95,
//   timeoutRate: 0.02,
//   failureRate: 0.03,
//   latency: {
//     mean: 2500,
//     p50: 2000,
//     p95: 8000,
//     p99: 15000
//   },
//   alerts: [
//     {
//       type: 'high_timeout_rate',
//       severity: 'warning',
//       message: 'Timeout rate 2.0% exceeds threshold 1.0%',
//       timeoutRate: 0.02,
//       threshold: 0.01
//     }
//   ]
// }
```

**Objective Metrics:**
```javascript
const objectiveMetrics = executor.getObjectiveExecutionMetrics('obj_001');
```

**Slow Executions:**
```javascript
const slowExecutions = executor.getSlowExecutions(10);
// Returns envelopes taking >50% of timeout threshold
```

**Timeout Executions:**
```javascript
const timeouts = executor.getTimeoutExecutions(10);
```

### Alerting Thresholds

Configurable alert thresholds:

```javascript
new ExecutionMetrics({
  timeoutRateThreshold: 0.05,      // 5% timeout rate
  slowExecutionThreshold: 0.5       // 50% of timeout threshold
})
```

**Alerts generated when:**
- Timeout rate >5%
- Execution time >50% of timeout (slow execution warning)

---

## Configuration Example

Complete configuration combining all Phase 4 features:

```javascript
const executor = new QueuedExecutor(viennaCore, {
  // Phase 4B: Queue Robustness
  concurrency: 5,
  queueOptions: {
    maxQueueSize: 1000,
    backpressureMode: 'reject'
  },
  
  // Phase 4C: Retry Policies
  retryPolicy: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2
  },
  
  // Phase 4E: Metrics
  metricsEnabled: true,
  metricsOptions: {
    timeoutRateThreshold: 0.05,
    slowExecutionThreshold: 0.5
  }
});

await executor.initialize();
```

---

## Event Emissions

### Backpressure Events

```javascript
{
  event_type: 'execution_blocked_concurrency',
  current_executions: 5,
  max_concurrency: 5,
  timestamp: '2026-03-11T22:00:00Z'
}
```

### Retry Events

```javascript
{
  event_type: 'envelope_retry_scheduled',
  envelope_id: 'env_001',
  retry_count: 1,
  retry_attempt: 2,
  max_retries: 3,
  delay_ms: 2000,
  classification: 'transient'
}
```

### Idempotency Events

```javascript
{
  event_type: 'execution_idempotent_skip',
  envelope_id: 'env_001',
  cached_result: { ... }
}
```

---

## Testing

Run Phase 4 test suite:

```bash
cd vienna-core
npm test -- tests/phase-4-reliability.test.js
```

**Test Coverage:**
- Phase 4B: 5 tests (concurrency, backpressure)
- Phase 4C: 5 tests (retry, backoff, exhaustion)
- Phase 4D: 3 tests (idempotency, deduplication)
- Phase 4E: 4 tests (metrics collection, latency percentiles)
- Integration: 1 test (full reliability stack)

**Total: 18 tests**

---

## Files Modified

**New Files:**
- `lib/execution/retry-policy.js` - Retry logic with exponential backoff
- `lib/execution/execution-metrics.js` - Metrics collection and analysis

**Updated Files:**
- `lib/execution/queued-executor.js` - Concurrency control, retry integration, metrics tracking
- `lib/execution/execution-queue.js` - Backpressure handling, deduplication

**Test Files:**
- `tests/phase-4-reliability.test.js` - Comprehensive test suite (18 tests)

---

## Deployment

Phase 4 is backward compatible. Existing code continues to work with defaults:

```javascript
// Minimal config (uses defaults)
const executor = new QueuedExecutor(viennaCore);

// Full reliability stack enabled automatically
```

**Defaults:**
- Concurrency: 5
- Max queue size: 1000
- Max retries: 3
- Metrics: enabled
- Backpressure mode: reject

---

## Monitoring

Monitor execution reliability:

```javascript
// Concurrency state
console.log(executor.getConcurrencyState());

// Queue state
console.log(executor.getQueueState());

// Execution metrics
console.log(executor.getExecutionMetrics());

// DLQ stats
console.log(executor.getDeadLetterStats());
```

---

## Next Steps

Phase 4 completes the execution reliability stack. Next phases:

- **Phase 5:** Trading safety integration
- **Phase 6:** End-to-end validation
- **Phase 7:** Production deployment

---

**Status:** ✅ Implementation Complete (2026-03-11)
