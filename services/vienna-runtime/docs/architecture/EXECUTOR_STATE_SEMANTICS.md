# Vienna Executor State Semantics

## Overview

This document formalizes the state machine for envelope execution in Vienna Core Phase 7.3-7.4, including timeout policy, completion disposal, and state transitions.

## Queue State Machine

### State Definition

The **ExecutionQueue** maintains a durable FIFO queue persisted to `~/.openclaw/runtime/execution-queue.jsonl`.

Each queue entry has a lifecycle state:

```
QUEUED → EXECUTING → COMPLETED
                  ↘ FAILED
                  ↘ BLOCKED
```

### State Semantics

#### QUEUED
- **Condition**: Envelope accepted by queue, awaiting execution
- **Entry point**: `queue.enqueue(envelope)` → adds to FIFO
- **Exit**: Executor picks up next QUEUED envelope → transitions to EXECUTING
- **Persistence**: Persisted to disk immediately on enqueue
- **Cleanup**: None during QUEUED state

#### EXECUTING
- **Condition**: Executor has claimed envelope and is actively executing
- **Entry point**: `executor.executeNext()` → marks envelope as EXECUTING
- **Exit**: Execution completes/fails/blocks → transition to COMPLETED/FAILED/BLOCKED
- **Timeout policy**: **None specified in current implementation**
  - Timeout checks should be implemented at Executor level if required (Phase 7.5+)
  - Currently relies on underlying `Executor` to complete
  - Long-running envelopes may remain EXECUTING indefinitely
- **Persistence**: Persisted when transitioned to EXECUTING state

#### COMPLETED
- **Condition**: Execution succeeded, envelope produced result
- **Entry point**: `queue.markCompleted(envelopeId, result)`
- **Exit**: Explicitly removed via `queue.clearCompleted()` or `queue.remove(envelopeId)`
- **Persistence**: 
  - Initial transition persists completion record to disk
  - **Entry NOT removed from JSONL on completion** (append-only audit trail)
  - Entry **removed from in-memory queue.queue Map** during `clearCompleted()`
  - FIFO is immediately updated to exclude completed envelope
- **Cleanup**: 
  - Removed from FIFO immediately on completion (not available for future execution)
  - Remains in `queue.queue` Map until explicit `clearCompleted()` call
  - Remains in JSONL file permanently (immutable audit trail)

#### FAILED
- **Condition**: Execution encountered error, potentially retriable
- **Entry point**: `queue.markFailed(envelopeId, error)` → increments retry_count
- **Exit**: Manual intervention or future execution attempt (not automatic retries)
- **Persistence**: Failed entry appended to JSONL
- **Retry semantics**: 
  - Retry count incremented but entry remains in FAILED state
  - No automatic re-queuing in current implementation
  - External orchestration required for retry (Phase 7.5+)

#### BLOCKED
- **Condition**: Recursion guard rejected envelope (infinite loop prevention)
- **Entry point**: `queue.markBlocked(envelopeId, reason)` from RecursionGuard
- **Exit**: Blocked envelopes do not auto-recover (permanent terminal state)
- **Persistence**: Blocked entry appended to JSONL with blocking_reason
- **Cleanup**: Manual or via DLQ (dead letter queue)

---

## Completion Disposal Semantics

### Why Completed Envelopes Disappear from Active Queue

**Key Design Principle**: Separate **completion state** from **FIFO availability**.

Completed envelopes are removed from the FIFO immediately because:

1. **Single-executor model**: Queue maintains strict FIFO ordering for active work
2. **Completed is terminal**: Once done, envelope should never re-execute
3. **Memory efficiency**: Keep in-memory queue compact (only active work)
4. **Audit preservation**: JSONL remains immutable (completion record preserved forever)

### Three-tier Disposal

**Tier 1 (FIFO)**: Removed immediately on completion
```javascript
// In ExecutionQueue.markCompleted()
this.fifo = this.fifo.filter(id => id !== envelopeId);
```

**Tier 2 (In-memory Map)**: Remains until explicit `clearCompleted()`
```javascript
// Manual cleanup required
await queue.clearCompleted(); // Removes from queue.queue Map
```

**Tier 3 (JSONL Audit Trail)**: Persisted permanently
```javascript
// Entry remains in ~/.openclaw/runtime/execution-queue.jsonl forever
// Rebuild operations can reconstruct history
```

### Implications

- **Active queue != all historical entries**: `queue.getStats()` returns only active entries
- **Replay visibility**: Completed envelopes visible in ReplayLog (separate append-only log)
- **Diagnostics**: Use `queue.getAllEntries()` + JSONL reading to reconstruct completion history
- **Compliance**: Immutable JSONL serves as audit trail for governance

---

## Timeout Policy

### Current Status

**Timeout enforcement: NOT IMPLEMENTED in Phase 7.3-7.4**

### Specification (Future Phase 7.5+)

```javascript
// Pseudocode for Phase 7.5+
const timeoutPolicy = {
  maxExecutionMs: 60000,        // 1 minute timeout
  gracefulShutdownMs: 5000,     // 5 second graceful shutdown window
  harshKillMs: 1000,            // Force kill after graceful period
};

// Executor should periodically check:
if (Date.now() - startedAt > timeoutPolicy.maxExecutionMs) {
  // 1. Send cancellation signal to execution context
  // 2. Wait for gracefulShutdownMs
  // 3. If still running, force termination
  // 4. Mark envelope as FAILED with timeout_exceeded
}
```

### Recommended Approach

1. **Execution context tracking**: Store `started_at` in queue entry (already done)
2. **Health check loop**: Periodic scan of EXECUTING entries
3. **Graceful cancellation**: Signal handler (ExecutionControl-style)
4. **Hard kill**: If graceful timeout exceeded, force process/context termination

---

## State Transition Table

| From | To | Trigger | Conditions | Side Effects |
|------|-----|---------|-----------|--------------|
| QUEUED | EXECUTING | `executor.executeNext()` | None | FIFO position held, started_at set |
| EXECUTING | COMPLETED | `executor.success()` | Result generated | FIFO removed, completion_at set |
| EXECUTING | FAILED | `executor.error()` | Exception thrown | Retry count incremented |
| EXECUTING | BLOCKED | `recursion_guard.reject()` | Recursion depth exceeded | Blocking reason recorded |
| FAILED | (no transition) | - | - | Manual intervention required |
| BLOCKED | (no transition) | - | - | Manual intervention or DLQ |
| COMPLETED | (removed from active queue) | `queue.clearCompleted()` | Explicit call | Removed from memory, stays in JSONL |

---

## Persistence Model

### File: `~/.openclaw/runtime/execution-queue.jsonl`

**Format**: Append-only JSONL (one JSON object per line)

**Structure** (latest version of entry for envelope_id):
```json
{
  "queue_id": "queue_1710180821_abc123",
  "envelope_id": "env_request_001",
  "envelope": { /* full envelope object */ },
  "state": "completed",
  "queued_at": "2026-03-11T21:33:00Z",
  "started_at": "2026-03-11T21:33:05Z",
  "completed_at": "2026-03-11T21:33:15Z",
  "retry_count": 0,
  "last_error": null,
  "result": { /* execution result */ }
}
```

**Semantics**:
- Multiple entries per envelope_id possible (one per state transition)
- Latest entry for an envelope_id is canonical (supersedes earlier entries)
- All entries preserved for audit trail (append-only, never deleted)
- Load behavior: `_loadFromDisk()` rebuilds in-memory queue from latest entries

### Rebuild Algorithm

```javascript
// In ExecutionQueue._loadFromDisk():
const entryMap = new Map();

for (const line of lines) {
  const entry = JSON.parse(line);
  entryMap.set(entry.envelope_id, entry); // Latest wins
}

// Reconstruct FIFO from QUEUED entries only
const queuedEntries = Array.from(entryMap.values())
  .filter(e => e.state === QueueState.QUEUED)
  .sort((a, b) => new Date(a.queued_at) - new Date(b.queued_at));
```

**Result**: In-memory queue reconstructs accurately from JSONL, even if process crashed.

---

## Related Systems

### ExecutionControl (Phase 7.4)

Complements queue state machine with:
- **Pause/Resume** semantics (graceful execution stop)
- **Kill switch** for emergency termination
- **State preservation** during pause

### RecursionGuard (Phase 7.3)

Enforces:
- Maximum causal depth (prevents infinite recursion)
- Rejects proposals exceeding threshold
- Records rejection in BLOCKED state

### ReplayLog (Phase 7.3)

Parallel system:
- **Append-only log** of all execution events
- Independent of ExecutionQueue state transitions
- Provides fine-grained causality tracking

---

## Operational Questions & Answers

### Q: Why aren't completed envelopes automatically garbage collected?

**A**: Garbage collection happens in tiers to balance multiple concerns:
- **Immediate FIFO removal**: Prevents accidental re-execution
- **Delayed memory cleanup**: `clearCompleted()` allows batch operations and metrics collection
- **Permanent JSONL**: Immutable audit trail for compliance/debugging

### Q: Can a FAILED envelope be retried automatically?

**A**: **No** in current implementation. `retry_count` increments but no auto-retry. 
- Phase 7.5+ may add scheduler-driven retry logic
- Currently requires external orchestration (e.g., periodic scan for retry candidates)

### Q: What if the process crashes while EXECUTING?

**A**: On restart:
1. `queue.initialize()` loads JSONL from disk
2. Envelopes left in EXECUTING state remain EXECUTING (not reverted to QUEUED)
3. Executor should skip/clear stale EXECUTING entries on startup (Future: health check + recovery logic)

### Q: How do I see all executions, including completed ones?

**A**: Three options:
1. **ExecutionQueue.getAllEntries()**: In-memory snapshot (cleared entries excluded)
2. **JSONL direct read**: Raw audit trail (all entries including completed)
3. **ReplayLog.query()**: Fine-grained execution event history

---

## See Also

- `~/openclaw/workspace/vienna-core/lib/execution/execution-queue.js`
- `~/openclaw/workspace/vienna-core/lib/execution/queued-executor.js`
- `~/openclaw/workspace/vienna-core/lib/execution/execution-control.js`
- `~/openclaw/workspace/vienna-core/lib/execution/recursion-guard.js`
- `~/openclaw/workspace/vienna-core/lib/execution/replay-log.js`
