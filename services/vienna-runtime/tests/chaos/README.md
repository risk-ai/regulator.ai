# Chaos Testing Suite

Controlled failure experiments to validate Phase 10.3 execution timeout behavior.

**Phase:** 10.3 Execution Timeout Validation  
**Purpose:** Confirm watchdog, timeout, and stale-result protection under real failure conditions  
**Status:** Safe to run during observation window (test environment only)

---

## Experiments

### Experiment 1: Hung Execution

**Scenario:** Handler that never returns

**Expected Results:**
- Watchdog detects expired deadline
- Execution terminated (state cleared)
- Timeout recorded in ledger
- Objective transitions to cooldown
- No execution state lingering

**Run:**
```bash
node tests/chaos/experiment-1-hung-execution.js
```

**Validates:**
- Watchdog timeout detection
- Execution state cleanup
- Ledger event recording
- Cooldown entry

---

### Experiment 2: Delayed Completion

**Scenario:** Handler completes AFTER timeout

**Expected Results:**
- Timeout recorded before late completion
- Late completion attempt ignored
- No state mutation from stale completion
- Objective remains in cooldown
- Late completion does not overwrite timeout outcome

**Run:**
```bash
node tests/chaos/experiment-2-delayed-completion.js
```

**Validates:**
- Stale result protection
- Generation-based admission
- No state mutation after timeout
- Timeout authority preserved

---

### Experiment 3: Repeated Failures

**Scenario:** Force consecutive failures

**Expected Results:**
- Cooldown progression (increasing duration)
- Eventually transitions to degraded state
- Cooldown prevents immediate retry
- Degraded state requires manual intervention

**Run:**
```bash
node tests/chaos/experiment-3-repeated-failures.js
```

**Validates:**
- Circuit breaker escalation
- Cooldown duration progression
- Degraded state transition
- Attempt bounding

---

### Experiment 4: Startup Sweep

**Scenario:** Persisted expired attempt survives restart

**Expected Results:**
- Startup sweep detects expired lease
- Timeout applied to expired attempt
- Objective transitioned appropriately
- No lingering execution state after sweep

**Run:**
```bash
node tests/chaos/experiment-4-startup-sweep.js
```

**Validates:**
- Startup sweep detection
- Expired lease cleanup
- State transition correctness
- No orphaned execution state

---

## Run All Experiments

```bash
node tests/chaos/run-all-experiments.js
```

**Output:**
- Sequential execution of all 4 experiments
- Per-experiment pass/fail results
- Summary report with success rate
- Observation window validation statement

**Expected:** 100% pass rate (4/4 experiments)

---

## Observation Window Purpose

These experiments validate Phase 10.3 behavior under controlled failure conditions.

**Watch for:**
- Timeout volume (should remain rare)
- Watchdog determinism (same input → same output)
- Stale-result protection (no state mutation)
- Execution state cleanup (no lingering leases)

**Clean results → Phase 10.3 classified as stable**

---

## Architecture Compliance

**Test environment only:** All experiments run with `VIENNA_ENV=test`  
**No production impact:** Test database isolated from production  
**Read runtime behavior:** Experiments call runtime functions but don't modify core logic  
**Safe during observation:** Running these tests does not invalidate the 24-hour observation window

---

## Failure Scenarios

### What to watch for if experiments fail:

**Experiment 1 fails:**
- Watchdog not detecting timeouts
- Execution state not clearing
- No ledger events recorded
- **Action:** Inspect execution-watchdog.js tick logic

**Experiment 2 fails:**
- Stale completions accepted
- State mutated after timeout
- Late results overwriting timeout outcome
- **Action:** Inspect reconciliation-gate.js generation checks

**Experiment 3 fails:**
- No cooldown progression
- Never reaches degraded state
- Cooldown durations not increasing
- **Action:** Inspect failure-policy-schema.js and reconciliation-gate.js

**Experiment 4 fails:**
- Startup sweep not detecting expired leases
- Expired state lingering after sweep
- No timeout applied
- **Action:** Inspect execution-watchdog.js startupSweep logic

---

## Adding New Experiments

When adding chaos experiments:

1. **Target specific invariant:** One failure mode per experiment
2. **Clear expected results:** Document exactly what should happen
3. **Validation assertions:** Check all critical state changes
4. **Cleanup:** Always delete test objectives after experiment
5. **Test environment:** Always use `VIENNA_ENV=test`
6. **Ledger verification:** Check that events are recorded correctly

**Template:**
```javascript
process.env.VIENNA_ENV = 'test';

async function experimentName() {
  // Setup
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  // Create test objective
  // ...
  
  // Execute failure scenario
  // ...
  
  // Verify expected behavior
  // ...
  
  // Validate
  const validations = { ... };
  
  // Cleanup
  stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
}
```

---

## Metrics to Track

During observation window, compare chaos experiment results with production metrics:

**Chaos Experiment Metrics:**
- Timeout detection: 100% (all hung executions caught)
- Stale rejection: 100% (no late completions accepted)
- Cooldown progression: Validated
- Degraded escalation: Validated

**Production Metrics:**
- Timeout rate: Should match chaos test behavior
- Stale completions: 0 (all rejected)
- Circuit breaker transitions: Predictable progression
- Startup sweep: No orphaned state

**Divergence → Investigation required**

---

## Future Enhancements

- Parallel execution testing (concurrent failures)
- Network partition simulation
- Database corruption scenarios
- Watchdog failure simulation
- Race condition testing (simultaneous timeout + completion)
- Performance stress testing (1000+ objectives)

---

## Summary

Chaos testing validates that Phase 10.3 execution timeout behavior is:
- **Deterministic** (same failure → same outcome)
- **Safe** (no state corruption)
- **Observable** (full audit trail)
- **Bounded** (no infinite loops or orphaned state)

**All experiments passing → Phase 10.3 ready for production observation window**
