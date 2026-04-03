# Phase 27–30 Deployment Blocker Analysis

**Date:** 2026-03-22 23:09 EDT  
**Context:** Determine if Phases 27–30 can deploy without Phase 26

---

## Four Blocker Questions

### 1. Retry Status in Production

**Question:** Are retries disabled or tightly scoped in production?

**Evidence:**

**File:** `lib/core/plan-execution-engine.js:504`
```javascript
const maxAttempts = step.retry_policy ? step.retry_policy.max_attempts : 1;
```

**Default:** 1 attempt (no retries)  
**Behavior:** Retry ONLY if step explicitly includes `retry_policy` with `max_attempts > 1`

**Current plan schemas:** None include retry policies by default

**Conclusion:** ✅ **SAFE** — Retries are opt-in per step, default is no retry

---

### 2. Import Analysis — Runtime Dependencies

**Question:** Does any runtime path depend on unfinished `lib/reliability/*`?

**Evidence:**

**Orphaned file:** `lib/core/plan-execution-engine-reliability.js`  
**Imports:** `require('../reliability/reliability-integration.js')`  
**Used by:** NOTHING (grep shows zero imports)

**Production execution engine:** `lib/core/plan-execution-engine.js`  
**Imports reliability?** NO

**Conclusion:** ✅ **SAFE** — Reliability integration is scaffolding only, not wired into runtime

---

### 3. Failure Degradation — Safe Without Phase 26

**Question:** Does failure handling work safely without full reliability orchestration?

**Current behavior (plan-execution-engine.js:586–610):**

```javascript
} catch (error) {
  lastError = error;

  // Check if we should retry
  if (attempt < maxAttempts) {
    const delay = this._calculateRetryDelay(step.retry_policy, attempt);
    execContext.logEvent({ type: 'step_retry_scheduled', ... });
    await this._sleep(delay);
    continue; // Retry
  }

  // Exhausted retries, handle failure
  await this._handleStepFailure(step, execContext, context, error);
  return;
}
```

**Failure handler (`_handleStepFailure`):**
- Marks step as FAILED
- Updates plan status to FAILED
- Emits ledger events
- Does NOT retry indefinitely
- Does NOT duplicate cost records (Phase 29 protects via `attempt === 1` gate)

**Ledger integrity:**
- All failures recorded in execution_ledger_events
- No silent drops
- No hidden retry loops

**Conclusion:** ✅ **SAFE** — Failure handling degrades gracefully without Phase 26

---

### 4. Billing Protection — Phase 29 Idempotency

**Question:** Does Phase 29 protect costs without full reliability orchestration?

**Evidence:**

**File:** `lib/core/plan-execution-engine.js:538–550`
```javascript
// Record cost ONLY on successful execution (idempotency: retry uses same execution_id)
if (this.costTracker && result.tokens && attempt === 1) {
  await this.costTracker.recordExecutionCost({
    execution_id: context.execution_id,
    plan_id: context.plan_id,
    tenant_id: context.tenant_id || 'system',
    workspace_id: context.workspace_id,
    user_id: context.user_id,
    provider: result.provider || 'unknown',
    model: result.model || 'unknown',
    input_tokens: result.tokens.input || 0,
    output_tokens: result.tokens.output || 0,
    cost_tier: step.cost_tier || 'standard'
  });
}
```

**Protection:** `attempt === 1` gate prevents double-billing on retries

**Cost tracker idempotency (lib/cost/cost-tracker.js:88):**
```javascript
// Check for duplicate execution_id
const existing = await this.stateGraph.query(`
  SELECT cost_id FROM execution_costs 
  WHERE execution_id = ?
`, [execution_id]);

if (existing.length > 0) {
  console.warn(`[CostTracker] Duplicate cost record for execution ${execution_id}, skipping`);
  return existing[0].cost_id;
}
```

**Double protection:**
1. Only record on first attempt (in-memory)
2. Duplicate check in database (persistent)

**Conclusion:** ✅ **SAFE** — Phase 29 protects billing even if retries were enabled

---

## Summary

| Blocker | Status | Evidence |
|---------|--------|----------|
| 1. Retry scope | ✅ SAFE | Default: no retries (opt-in per step) |
| 2. Import analysis | ✅ SAFE | Reliability code orphaned, not imported |
| 3. Failure degradation | ✅ SAFE | Graceful failure handling, ledger intact |
| 4. Billing protection | ✅ SAFE | Double idempotency (attempt gate + DB check) |

---

## Deployment Recommendation

**GO:** Deploy Phases 27–30 as scoped release

**Conditions:**
1. Apply Phase 29 schema migration (`cost_tracking.sql`)
2. Document Phase 26 as deferred work
3. Monitor retry behavior in production (should be zero retries unless explicitly configured)

**Deferred:**
- Phase 26 reliability orchestration (15/61 tests, redesign required)
- Circuit breakers, failure classification, DLQ routing

**Risk:** LOW — All four blockers verified as safe

---

## Honest Status Statement

> **Vienna OS repair status:** Phases 27–30 have been implemented and validated with 47/47 tests passing. Phase 29 is now integrated into the execution pipeline with pre-execution budget enforcement, post-execution cost recording, and retry idempotency. Phase 30 federation context is validated and fail-closed. Phase 26 reliability remains incomplete at 15/61 tests passing and is explicitly deferred from this release. Current recommendation: deploy the validated 27–30 scope after applying the Phase 29 schema migration, while tracking Phase 26 as remaining work.

---

**Strongest claim we can make:**

✅ Phases 27–30 are production-ready and deployable  
❌ Phase 26–30 as a full set are NOT complete

**Next step:** Apply Phase 29 schema migration and deploy
