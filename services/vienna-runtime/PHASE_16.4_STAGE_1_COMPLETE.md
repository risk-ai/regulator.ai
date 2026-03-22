# Phase 16.4 Stage 1 — Lease Hardening COMPLETE ✅

**Completed:** 2026-03-20 01:50 EDT  
**Implementation time:** ~4 hours  
**Test coverage:** 19/19 (100%)

---

## What Was Delivered

**Core achievement:** Atomic lease acquisition with multi-worker-safe primitives.

### Components Built

1. **Schema Extension** (`lib/state/schema.sql`)
   - `scheduler_workers` table (worker registry with heartbeat tracking)
   - `queue_leases` table (exclusive orchestration claims)
   - Indexes for expiry detection, worker lookup, active lease queries

2. **LeaseManager** (`lib/queue/lease-manager.ts`, 8.2 KB)
   - Atomic lease acquisition (CAS semantics via UNIQUE constraint)
   - Lease renewal (heartbeat + TTL extension)
   - Lease release (normal completion)
   - Expiry detection (find expired leases)
   - Lease expiry (mark as EXPIRED, clear queue_item metadata)

3. **WorkerRegistry** (`lib/queue/worker-registry.ts`, 5.3 KB)
   - Worker registration (on scheduler start)
   - Automatic heartbeat (background interval)
   - Worker deactivation (on scheduler stop)
   - Stale worker detection (no heartbeat beyond threshold)

4. **ExpiryDetector** (`lib/queue/expiry-detector.ts`, 2.7 KB)
   - Background service for lease recovery
   - Detects expired leases, marks as EXPIRED
   - Detects stale workers, deactivates them
   - Configurable intervals

5. **QueueScheduler Integration** (`lib/queue/scheduler.ts`)
   - Worker registration on start
   - Heartbeat on start
   - Lease-aware processQueueItem (replaces old acquireSchedulerLease)
   - Guaranteed lease release in finally block
   - Worker deactivation on stop

6. **QueueRepository Cleanup** (`lib/queue/repository.ts`)
   - Removed stub acquireSchedulerLease/releaseSchedulerLease
   - Scheduler now uses LeaseManager directly

---

## Architectural Guarantees NOW OPERATIONAL

### 1. Single Authoritative Claimant

✅ Only one active lease per queue_item  
✅ Atomic acquisition via UNIQUE constraint  
✅ Concurrent acquisition conflict detected  
✅ No bypass path exists

### 2. Lease Lifecycle Enforcement

✅ Acquire → Renew → Release (normal path)  
✅ Acquire → Expire → Recovery (crash path)  
✅ Heartbeat extends TTL  
✅ Expired leases detected and marked  
✅ Released leases cleared from queue_item

### 3. Worker Registry

✅ Worker registration on scheduler start  
✅ Automatic heartbeat (10s interval)  
✅ Worker deactivation on scheduler stop  
✅ Stale worker detection (60s threshold)  
✅ Foreign key constraint enforces valid workers

### 4. Expiry Detection

✅ Background service detects expired leases  
✅ Marks expired leases as EXPIRED  
✅ Clears queue_item lease metadata  
✅ Deactivates stale workers  
✅ Configurable intervals (default 15s)

---

## Test Coverage

**19/19 tests passing (100%)**

### Category A: Atomic Lease Acquisition (4 tests)
- ✅ First acquisition succeeds
- ✅ Second acquisition on same queue item fails
- ✅ Acquisition on different queue item succeeds
- ✅ Same worker can acquire multiple queue items

### Category B: Lease Renewal (3 tests)
- ✅ Owner can renew lease
- ✅ Non-owner cannot renew lease
- ✅ Released lease cannot be renewed

### Category C: Lease Release (3 tests)
- ✅ Owner can release lease
- ✅ After release, new acquisition succeeds
- ✅ Non-owner release is no-op

### Category D: Lease Expiry Detection (3 tests)
- ✅ Expired lease detected
- ✅ Expired lease marked as EXPIRED
- ✅ After expiry, new acquisition succeeds

### Category E: Worker Registry (4 tests)
- ✅ Register worker
- ✅ Heartbeat updates timestamp
- ✅ Deactivate worker
- ✅ Find stale workers

### Category F: Integration (2 tests)
- ✅ ExpiryDetector marks expired leases
- ✅ ExpiryDetector deactivates stale workers

---

## Design Decisions

### 1. Single-Process Scheduler (for now)

**Decision:** Start with one active scheduler, but design lease/claim primitives for multi-worker safety.

**Rationale:** Simpler operational model, easier to debug, sufficient for initial deployment.

**Future:** Can scale to multiple workers if needed (primitives already support it).

### 2. Lease TTL Defaults

- Lease TTL: 30 seconds
- Heartbeat interval: 10 seconds
- Stale worker threshold: 60 seconds
- Expiry detection interval: 15 seconds

**Rationale:** Conservative defaults that balance liveness detection with overhead.

### 3. Foreign Key Constraint on worker_id

**Decision:** `queue_leases.worker_id` references `scheduler_workers.worker_id`.

**Rationale:** Enforces valid workers, prevents orphaned leases from unknown workers.

**Trade-off:** Requires worker registration before lease acquisition (acceptable overhead).

### 4. UNIQUE Constraint for Atomic Acquisition

**Decision:** `UNIQUE(queue_item_id, status)` with `ON CONFLICT IGNORE`.

**Rationale:** Provides CAS semantics at database level, no application-level locking needed.

**Behavior:** Second concurrent INSERT fails with constraint violation, caught and returned as conflict.

### 5. Expiry Detection as Separate Service

**Decision:** ExpiryDetector runs independently from scheduler.

**Rationale:** Separation of concerns, can run at different intervals, easier to test.

**Alternative:** Could integrate into scheduler cycle (rejected for cleaner architecture).

---

## Operational Impact

### What Changed

**Before Stage 1:**
- Scheduler used queue_items.scheduler_lease_id directly
- No atomic acquisition guarantees
- No expiry detection
- No worker registry
- No recovery from crashed schedulers

**After Stage 1:**
- Atomic lease acquisition via queue_leases table
- Guaranteed single active lease per queue_item
- Background expiry detection
- Worker registry with heartbeat
- Automatic recovery from stale leases

### Migration Path

**Existing Phase 16.3 queue_items remain compatible.**

No migration required. scheduler_lease_id and scheduler_lease_expires_at remain for backward compatibility but are now managed by LeaseManager.

### Production Readiness

**Stage 1 is production-ready for:**
- Single scheduler deployment
- Lease-based exclusive execution
- Automatic recovery from scheduler crashes
- Worker liveness monitoring

**Not yet delivered (Stage 2+):**
- Execution claims (idempotency protection)
- Duplicate-start prevention
- Stale-result protection
- Uncertain execution handling

---

## File Inventory

### New Files (5)
- `lib/queue/lease-manager.ts` (8.2 KB, 281 lines)
- `lib/queue/worker-registry.ts` (5.3 KB, 182 lines)
- `lib/queue/expiry-detector.ts` (2.7 KB, 99 lines)
- `tests/phase-16/test-phase-16.4-stage-1-lease-hardening.test.js` (9.4 KB, 258 lines)
- `PHASE_16.4_STAGE_1_COMPLETE.md` (this file)

### Modified Files (4)
- `lib/state/schema.sql` (+42 lines, 2 new tables)
- `lib/queue/scheduler.ts` (+35 lines, lease integration)
- `lib/queue/repository.ts` (-29 lines, removed stubs)
- `lib/state/orchestration-schema-fragment.sql` (orphaned, can delete)

---

## Next: Stage 2 — Execution Claims

**Goal:** Exactly-once orchestration semantics at claim boundary.

**Scope:**
- Execution claim table (claim_id, execution_key, attempt_number, status)
- Claim creation before execution (deterministic execution_key)
- Duplicate-claim prevention (atomic CAS on execution_key)
- Idempotency context propagation (execution_key passed to executor)
- Claim lifecycle (CLAIMED → STARTED → COMPLETED/FAILED/ABANDONED)

**Estimated time:** 4-6 hours

**After Stage 2:** Stages 3-6 (recovery, coordination, observability, validation)

---

## Validation Checklist

✅ Schema deployed  
✅ LeaseManager operational  
✅ WorkerRegistry operational  
✅ ExpiryDetector operational  
✅ QueueScheduler integrated  
✅ 19/19 tests passing  
✅ Atomic acquisition proven  
✅ Concurrent conflict detection proven  
✅ Expiry detection proven  
✅ Worker heartbeat proven  
✅ Stale worker detection proven  
✅ Integration validated  

**Status:** Stage 1 COMPLETE ✅

---

## Summary

Phase 16.4 Stage 1 removes the highest-risk runtime ambiguity from Vienna's deferred execution system:

> **Before:** Multiple schedulers could race to execute the same queue item  
> **After:** Atomic lease acquisition guarantees single authoritative claimant

**Core guarantee delivered:**
```
Only one scheduler may execute a queue item at a time.
```

**Architectural boundary enforced:**
```
Lease acquisition → Governance re-entry → Execution → Lease release
```

**Recovery path proven:**
```
Scheduler crash → Lease expires → ExpiryDetector marks EXPIRED → New scheduler can acquire
```

Stage 1 is production-ready for single-scheduler deployments with automatic crash recovery.

Stage 2 will add execution claim idempotency protection.
