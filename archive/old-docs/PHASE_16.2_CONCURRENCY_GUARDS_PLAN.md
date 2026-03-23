# Phase 16.2 — Target-Level Concurrency Guards

**Status:** In Progress  
**Started:** 2026-03-19 13:36 EDT  
**Goal:** Prevent concurrent governed plans from colliding on the same target

---

## Problem Statement

**Operational risk identified:**
> Two governed plans executing simultaneously against the same target can create race conditions, inconsistent state, and unpredictable outcomes even with per-step governance.

**Example collision scenario:**
```
Plan A: restart openclaw-gateway (steps: stop → verify stopped → start → verify running)
Plan B: health check openclaw-gateway (steps: query status → verify responsive)

Without coordination:
- Plan A: stop service (execution_id: exec_001, step 1)
- Plan B: query status (execution_id: exec_002, step 1) ← observes stopping service
- Plan A: verify stopped (step 2)
- Plan B: verify responsive (step 2) ← FAILS (service stopped)
- Plan A: start service (step 3)
- Plan B: ABORTED (unexpected state)
```

**Current state:** Phase 16.1 HARDENED enforces per-step governance but does NOT coordinate across concurrent plans.

---

## Core Requirement

**Architectural invariant:**
> No two governed plans may concurrently modify the same target without explicit coordination.

**Enforcement mechanism:** Target-level lock/lease model

---

## Design Overview

### Target Lock Model

**Lock lifecycle:**
```
Request Lock → Acquire (or Deny) → Execute Steps → Release (or Expire)
```

**Lock properties:**
- **Target-scoped:** Lock applies to specific service/endpoint/provider
- **Plan-scoped:** Lock owned by execution_id
- **Time-bounded:** Lock has TTL (default: 5 minutes)
- **Exclusive:** Only one plan holds lock at a time
- **Deterministic:** Lock request denied if target already locked

### Lock State Schema

**New State Graph table:** `execution_locks`

```sql
CREATE TABLE IF NOT EXISTS execution_locks (
  lock_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,     -- 'service', 'endpoint', 'provider', 'resource'
  target_id TEXT NOT NULL,       -- 'openclaw-gateway', 'openclaw', 'anthropic'
  execution_id TEXT NOT NULL,    -- Owner of lock
  plan_id TEXT,                  -- Associated plan
  objective_id TEXT,             -- Associated objective
  acquired_at INTEGER NOT NULL,  -- Unix timestamp
  expires_at INTEGER NOT NULL,   -- Unix timestamp
  released_at INTEGER,           -- Unix timestamp (null if active)
  status TEXT NOT NULL,          -- 'active', 'released', 'expired'
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(target_type, target_id, status) WHERE status = 'active'
);
```

**Unique constraint:** Only one active lock per target at a time.

---

## Implementation Components

### 1. ExecutionLockManager

**Location:** `vienna-core/lib/execution/execution-lock-manager.js`

**Core methods:**
```javascript
class ExecutionLockManager {
  // Request lock (acquire or deny)
  async acquireLock({ target_type, target_id, execution_id, plan_id, objective_id, ttl_seconds = 300 })
  
  // Release lock (success or failure)
  async releaseLock({ lock_id, execution_id })
  
  // Check if target locked
  async isLocked({ target_type, target_id })
  
  // Get active lock for target
  async getActiveLock({ target_type, target_id })
  
  // Expire stale locks (cleanup)
  async expireStalelocks()
  
  // Heartbeat to extend lock
  async extendLock({ lock_id, execution_id, extension_seconds = 60 })
}
```

**Lock acquisition logic:**
```javascript
async acquireLock({ target_type, target_id, execution_id, plan_id, objective_id, ttl_seconds = 300 }) {
  // Check for existing active lock
  const existingLock = await this.getActiveLock({ target_type, target_id });
  
  if (existingLock) {
    // Deny if different execution owns lock
    if (existingLock.execution_id !== execution_id) {
      return {
        success: false,
        reason: 'TARGET_LOCKED',
        locked_by: existingLock.execution_id,
        expires_at: existingLock.expires_at
      };
    }
    
    // Allow if same execution (reentrant)
    return {
      success: true,
      lock_id: existingLock.lock_id,
      reentrant: true
    };
  }
  
  // Acquire new lock
  const lock_id = `lock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const acquired_at = Math.floor(Date.now() / 1000);
  const expires_at = acquired_at + ttl_seconds;
  
  await stateGraph.query(`
    INSERT INTO execution_locks 
    (lock_id, target_type, target_id, execution_id, plan_id, objective_id, acquired_at, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `, [lock_id, target_type, target_id, execution_id, plan_id, objective_id, acquired_at, expires_at]);
  
  return {
    success: true,
    lock_id,
    acquired_at,
    expires_at
  };
}
```

### 2. PlanExecutor Integration

**Location:** `vienna-core/lib/execution/plan-executor.js`

**Lock integration points:**

**Before plan execution:**
```javascript
async executePlan(plan, context) {
  const execution_id = context.execution_id;
  const lockManager = new ExecutionLockManager();
  
  // Identify all targets in plan
  const targets = this._extractTargets(plan);
  
  // Acquire locks for all targets
  const locks = [];
  for (const target of targets) {
    const lockResult = await lockManager.acquireLock({
      target_type: target.type,
      target_id: target.id,
      execution_id,
      plan_id: plan.plan_id,
      objective_id: plan.objective_id,
      ttl_seconds: plan.estimated_duration_seconds || 300
    });
    
    if (!lockResult.success) {
      // Release any acquired locks
      for (const lock of locks) {
        await lockManager.releaseLock({ lock_id: lock.lock_id, execution_id });
      }
      
      // Emit ledger event
      await this._emitLedgerEvent(execution_id, 'execution_lock_denied', {
        target_type: target.type,
        target_id: target.id,
        locked_by: lockResult.locked_by,
        expires_at: lockResult.expires_at
      });
      
      // Return failure
      return {
        status: 'denied',
        reason: 'TARGET_LOCKED',
        target: target,
        locked_by: lockResult.locked_by
      };
    }
    
    locks.push(lockResult);
  }
  
  try {
    // Execute plan with locks held
    const result = await this._executeSteps(plan, context);
    return result;
  } finally {
    // Always release locks
    for (const lock of locks) {
      await lockManager.releaseLock({ lock_id: lock.lock_id, execution_id });
    }
  }
}
```

**Target extraction logic:**
```javascript
_extractTargets(plan) {
  const targets = new Set();
  
  for (const step of plan.steps) {
    if (step.action_type === 'restart_service' || step.action_type === 'health_check') {
      targets.add({
        type: 'service',
        id: step.target_id
      });
    } else if (step.action_type === 'query_endpoint') {
      targets.add({
        type: 'endpoint',
        id: step.target_id
      });
    }
  }
  
  return Array.from(targets);
}
```

### 3. Ledger Events

**New event types:**

```javascript
// Lock acquisition
{
  event_type: 'execution_lock_requested',
  execution_id,
  payload: {
    target_type: 'service',
    target_id: 'openclaw-gateway',
    ttl_seconds: 300
  }
}

{
  event_type: 'execution_lock_acquired',
  execution_id,
  payload: {
    lock_id: 'lock_1234567890_abcdef',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    acquired_at: 1234567890,
    expires_at: 1234568190
  }
}

{
  event_type: 'execution_lock_denied',
  execution_id,
  payload: {
    target_type: 'service',
    target_id: 'openclaw-gateway',
    locked_by: 'exec_001',
    expires_at: 1234568190,
    reason: 'TARGET_LOCKED'
  }
}

// Lock release
{
  event_type: 'execution_lock_released',
  execution_id,
  payload: {
    lock_id: 'lock_1234567890_abcdef',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    released_at: 1234567950,
    duration_seconds: 60
  }
}

// Lock expiration (cleanup)
{
  event_type: 'execution_lock_expired',
  execution_id,
  payload: {
    lock_id: 'lock_1234567890_abcdef',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    expired_at: 1234568190,
    acquired_at: 1234567890
  }
}
```

### 4. State Graph Extension

**Schema update:** `vienna-core/lib/state/schema.sql`

**New methods:**
```javascript
// StateGraph additions
async acquireExecutionLock({ target_type, target_id, execution_id, plan_id, objective_id, ttl_seconds })
async releaseExecutionLock({ lock_id, execution_id })
async getActiveLock({ target_type, target_id })
async listActiveLocks()
async expireStaleExecutionLocks()
```

---

## Concurrency Scenarios

### Scenario 1: Sequential Plans (No Conflict)

```
Plan A: restart openclaw-gateway
  1. Acquire lock (openclaw-gateway) → SUCCESS
  2. Execute steps → SUCCESS
  3. Release lock → SUCCESS

Plan B: restart openclaw-gateway
  1. Acquire lock (openclaw-gateway) → SUCCESS (Plan A released)
  2. Execute steps → SUCCESS
  3. Release lock → SUCCESS
```

**Outcome:** Both plans succeed sequentially.

### Scenario 2: Concurrent Plans (Conflict)

```
Plan A: restart openclaw-gateway
  1. Acquire lock (openclaw-gateway) → SUCCESS
  2. Execute step 1 → IN PROGRESS

Plan B: health check openclaw-gateway
  1. Acquire lock (openclaw-gateway) → DENIED (locked by Plan A)
  2. Return failure: TARGET_LOCKED

Plan A:
  3. Complete all steps → SUCCESS
  4. Release lock → SUCCESS
```

**Outcome:** Plan A succeeds, Plan B denied with clear reason.

### Scenario 3: Lock Expiration (Hung Execution)

```
Plan A: restart openclaw-gateway
  1. Acquire lock (openclaw-gateway, ttl=300s) → SUCCESS
  2. Execute step 1 → HANGS (timeout at 10 minutes)
  3. Lock expires at 5 minutes

[Cleanup service runs]
  - Detect expired lock
  - Mark lock as expired
  - Emit lock_expired event

Plan B: restart openclaw-gateway
  1. Acquire lock (openclaw-gateway) → SUCCESS (stale lock cleared)
  2. Execute steps → SUCCESS
```

**Outcome:** Plan B can proceed after Plan A's lock expires.

### Scenario 4: Multi-Target Plan

```
Plan A: restart gateway + verify endpoint
  Targets: [openclaw-gateway (service), openclaw (endpoint)]
  1. Acquire lock (openclaw-gateway) → SUCCESS
  2. Acquire lock (openclaw) → SUCCESS
  3. Execute steps → SUCCESS
  4. Release lock (openclaw-gateway) → SUCCESS
  5. Release lock (openclaw) → SUCCESS
```

**Outcome:** Plan holds multiple locks, releases all on completion.

---

## Failure Modes & Handling

### Lock Acquisition Failure

**Cause:** Target already locked by another execution

**Handling:**
1. Emit `execution_lock_denied` event
2. Release any locks already acquired (atomic lock set)
3. Return plan execution failure with reason `TARGET_LOCKED`
4. Ledger records denial with locked_by execution_id

**Operator visibility:**
- "Plan execution denied: target locked by exec_001"
- "Retry after lock expires at [timestamp]"

### Lock Release Failure

**Cause:** Database error, crash, or unexpected termination

**Handling:**
1. Lock remains active until TTL expires
2. Cleanup service (`expireStaleExecutionLocks()`) runs periodically
3. Expired locks marked with status `expired`
4. New plans can acquire lock after expiration

**Mitigation:** Keep TTL short (5 minutes default), extend via heartbeat if needed

### Lock Extension (Heartbeat)

**Use case:** Long-running plans need to extend lock beyond initial TTL

**Implementation:**
```javascript
async executePlan(plan, context) {
  const locks = await this._acquireLocks(plan, context);
  
  // Start heartbeat for long plans
  const heartbeat = setInterval(async () => {
    for (const lock of locks) {
      await lockManager.extendLock({
        lock_id: lock.lock_id,
        execution_id: context.execution_id,
        extension_seconds: 60
      });
    }
  }, 30000); // Every 30 seconds
  
  try {
    const result = await this._executeSteps(plan, context);
    return result;
  } finally {
    clearInterval(heartbeat);
    await this._releaseLocks(locks, context.execution_id);
  }
}
```

---

## Test Plan

### Category 1: Lock Acquisition (5 tests)

1. **Acquire lock on free target** → SUCCESS
2. **Acquire lock on locked target** → DENIED
3. **Acquire lock on same target by same execution** → SUCCESS (reentrant)
4. **Acquire lock on expired lock** → SUCCESS (stale lock cleared)
5. **Acquire lock with invalid target** → ERROR

### Category 2: Lock Release (4 tests)

1. **Release active lock** → SUCCESS
2. **Release already released lock** → IDEMPOTENT
3. **Release lock by different execution** → ERROR
4. **Release expired lock** → IDEMPOTENT

### Category 3: Plan Execution (6 tests)

1. **Execute plan with free target** → SUCCESS (lock acquired, steps run, lock released)
2. **Execute plan with locked target** → DENIED (lock denied, no steps run)
3. **Execute multi-target plan** → SUCCESS (all locks acquired, steps run, all locks released)
4. **Execute plan with partial lock acquisition** → DENIED (rollback acquired locks)
5. **Execute plan with step failure** → FAILURE (locks released on failure)
6. **Execute concurrent plans on different targets** → SUCCESS (no collision)

### Category 4: Lock Expiration (3 tests)

1. **Expire stale locks** → SUCCESS (expired locks marked)
2. **Acquire lock after expiration** → SUCCESS (stale lock cleared)
3. **Extend lock via heartbeat** → SUCCESS (TTL extended)

### Category 5: Ledger Integration (4 tests)

1. **Lock acquired event persisted** → SUCCESS
2. **Lock denied event persisted** → SUCCESS
3. **Lock released event persisted** → SUCCESS
4. **Lock expired event persisted** → SUCCESS

**Total:** 22 tests

---

## Exit Criteria

**Architecture complete:**
- ✅ ExecutionLockManager implemented
- ✅ PlanExecutor lock integration complete
- ✅ State Graph schema extended
- ✅ Ledger events defined and emitted
- ✅ Lock lifecycle tracked

**Validation complete:**
- ✅ All 22 tests passing
- ✅ Concurrent plan collision prevented
- ✅ Lock expiration functional
- ✅ Ledger audit trail complete

**Guarantees proven:**
1. No two plans concurrently modify same target
2. Lock denial visible in ledger
3. Expired locks cleaned up automatically
4. Multi-target plans acquire atomic lock sets
5. Lock release always executed (success or failure)

---

## Timeline

**Estimated:** 4-6 hours

**Breakdown:**
1. ExecutionLockManager implementation (2 hours)
2. PlanExecutor integration (1.5 hours)
3. State Graph extension (1 hour)
4. Test suite (1.5 hours)

---

## Risk Assessment

**Low risk:**
- Additive change (no existing behavior modified)
- Fail-safe defaults (deny on conflict)
- Time-bounded locks (5 minute TTL)
- Cleanup service (expired lock recovery)

**Medium risk:**
- Lock contention on high-frequency targets (mitigated by short TTL)
- Deadlock potential (mitigated by atomic lock sets + rollback)

**High risk:**
- None identified

---

## Next Steps

1. Implement ExecutionLockManager
2. Extend State Graph schema
3. Integrate with PlanExecutor
4. Add ledger events
5. Write test suite
6. Validate concurrent execution scenarios
7. Update documentation

---

**Status:** Ready to implement
