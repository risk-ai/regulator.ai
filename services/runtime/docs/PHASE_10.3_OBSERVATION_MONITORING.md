# Phase 10.3 Observation Monitoring Guide

**Date:** 2026-03-14 00:56 EDT  
**Observation window:** 24 hours from 2026-03-13 21:52 EDT  
**Status:** Active monitoring  
**Purpose:** Operator guide for monitoring bounded execution authority

---

## What Phase 10.3 Delivered

**Core achievement:** Vienna now governs **how long** execution authority exists.

**Three Control Invariants Operational:**
1. **Drift detection is not permission to act** (Phase 10.1)
2. **Failure is not permission to retry** (Phase 10.2)
3. **Admission grants bounded authority in time** (Phase 10.3)

**Enforcement mechanisms:**
- Execution deadline tracking (admission → bounded authority)
- Watchdog service (deterministic timeout enforcement)
- Stale-result protection (late completions cannot rewrite control state)
- Timeout outcomes (cleanly land in `cooldown` or `degraded`)

---

## Metrics That Matter

### Primary Indicators (P0)

**1. Timeout Volume**
- **What:** Count of `execution_timed_out` events per hour
- **Expected:** Rare (< 5% of executions)
- **Warning:** > 20% of executions timing out
- **Critical:** > 50% of executions timing out

**Why it matters:** High timeout volume suggests:
- Execution timeouts too aggressive
- Actions genuinely taking too long
- System degradation

**2. Expired Deadlines in `reconciling`**
- **What:** Objectives stuck in `reconciling` status past deadline
- **Expected:** 0 (watchdog cleanly transitions them)
- **Warning:** Any occurrence
- **Critical:** Persistent accumulation

**Why it matters:** Lingering expired deadlines indicate:
- Watchdog not running
- State machine corruption
- Race condition in timeout handling

**3. Watchdog Behavior**
- **What:** Deterministic timeout detection + transition
- **Expected:** Timeouts land in `cooldown` or `degraded`
- **Warning:** Timeouts land in unexpected states
- **Critical:** Timeouts don't trigger transitions

**Why it matters:** Non-deterministic watchdog means:
- Control boundary not enforced
- Indefinite execution possible
- Observation compromised

---

### Secondary Indicators (P1)

**4. Timeout Outcomes**
- **What:** Where timed-out objectives land
- **Expected:** 
  - First timeout → `cooldown` (if retries available)
  - Attempts exhausted → `degraded`
- **Warning:** Timeouts landing in `monitoring` or `healthy`
- **Critical:** Timeouts landing in `reconciling`

**Why it matters:** Incorrect outcome routing suggests:
- State machine violation
- Policy bypass
- Sequence corruption

**5. Stale-Result Mutations**
- **What:** Late completions rewriting control state
- **Expected:** 0 (generation mismatch blocks them)
- **Warning:** Any occurrence
- **Critical:** Repeated occurrences

**Why it matters:** Stale mutations indicate:
- Generation protection broken
- Race condition in completion handler
- Control state corruption possible

**6. Admission-to-Deadline Coherence**
- **What:** Every `reconciling` objective has a deadline
- **Expected:** 100% coherence
- **Warning:** Any mismatch
- **Critical:** Systematic mismatch

**Why it matters:** Missing deadlines mean:
- Execution authority unbounded
- Watchdog cannot enforce timeout
- Phase 10.3 guarantee broken

---

### Monitoring Indicators (P2)

**7. Execution Duration Distribution**
- **What:** How long executions actually take
- **Expected:** Most complete before deadline (< 120s default)
- **Informational:** Distribution shape (avg, p50, p95, p99)

**Why it matters:** Helps calibrate timeout policy

**8. Cooldown Reopening Timing**
- **What:** Time from cooldown entry to reopening
- **Expected:** Matches policy (default 300s)
- **Warning:** Premature reopening
- **Critical:** Cooldown never expires

**Why it matters:** Incorrect cooldown handling affects retry policy

**9. Generation Propagation**
- **What:** Generation increments correctly through lifecycle
- **Expected:** Monotonic increase per objective
- **Warning:** Generation reuse
- **Critical:** Generation regression

**Why it matters:** Generation protection relies on correct propagation

---

## How to Monitor

### Dashboard (Control-Plane Tab)

**Reconciliation Timeline:**
- Look for `execution_timeout` events
- Check frequency (should be rare)
- Verify transitions after timeout (cooldown/degraded)

**Execution Leases:**
- Check for expired leases (deadline_at < now, still listed)
- Should be 0 if watchdog working

**Circuit Breakers:**
- Check consecutive_failures count
- Verify cooldown_until timestamps
- Confirm degraded transitions when exhausted

---

### State Graph Queries

**Timeout volume (last hour):**
```bash
cd ~/.openclaw/workspace/vienna-core
node -e "
const { getStateGraph } = require('./lib/state/state-graph.js');
async function check() {
  const sg = getStateGraph();
  await sg.initialize();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const events = sg.query(\`
    SELECT COUNT(*) as count
    FROM managed_objective_history
    WHERE transition_type = 'execution_timed_out'
    AND datetime(event_timestamp) > datetime(?)
  \`, [hourAgo]);
  console.log('Timeouts in last hour:', events[0].count);
}
check().catch(console.error);
"
```

**Expired deadlines still reconciling:**
```bash
node -e "
const { getStateGraph } = require('./lib/state/state-graph.js');
async function check() {
  const sg = getStateGraph();
  await sg.initialize();
  const objectives = sg.query(\`
    SELECT objective_id, reconciliation_status, last_remediation_at
    FROM managed_objectives
    WHERE reconciliation_status = 'reconciling'
    AND datetime(last_remediation_at, '+120 seconds') < datetime('now')
  \`);
  console.log('Expired deadlines:', objectives.length);
  objectives.forEach(o => console.log('  -', o.objective_id, o.last_remediation_at));
}
check().catch(console.error);
"
```

**Timeout outcomes distribution:**
```bash
node -e "
const { getStateGraph } = require('./lib/state/state-graph.js');
async function check() {
  const sg = getStateGraph();
  await sg.initialize();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const outcomes = sg.query(\`
    SELECT to_state, COUNT(*) as count
    FROM managed_objective_history
    WHERE transition_type = 'execution_timed_out'
    AND datetime(event_timestamp) > datetime(?)
    GROUP BY to_state
  \`, [hourAgo]);
  console.log('Timeout outcomes:');
  outcomes.forEach(o => console.log('  -', o.to_state + ':', o.count));
}
check().catch(console.error);
"
```

---

## What Normal Behavior Looks Like

### Healthy Patterns

**Execution leases:**
- 0-2 active leases at any time (low concurrency expected)
- All leases expire or complete cleanly
- No accumulation of expired leases

**Timeline:**
- Mostly `execution_completed` events
- Rare `execution_timeout` events
- Deterministic transitions after timeout

**Circuit breakers:**
- Most objectives at 0 consecutive failures
- Cooldown periods expire and reopen correctly
- Degraded state only after policy exhaustion

**Execution duration:**
- Most executions < 60s
- Rare executions 60-120s
- Almost no executions hit 120s deadline

---

### Warning Patterns

**Occasional timeout:**
- 1-2 timeouts per hour
- Clean transition to cooldown
- Recovery on retry

**Cooldown accumulation:**
- Multiple objectives in cooldown
- But cooldowns expire correctly
- No permanent degradation

**Sporadic long execution:**
- One execution takes 90-110s
- Completes before deadline
- Isolated occurrence

---

### Critical Patterns (Intervention Required)

**Systematic timeout:**
- > 50% of executions timing out
- Suggests deadline too aggressive or system degraded
- **Action:** Investigate execution duration, consider adjusting policy

**Expired deadlines lingering:**
- Objectives stuck in `reconciling` past deadline
- Watchdog not transitioning them
- **Action:** Check watchdog service, verify state machine

**Stale mutations:**
- Late completions rewriting control state after timeout
- Generation protection broken
- **Action:** Emergency stop, investigate race condition

**Cooldown never expiring:**
- Objectives stuck in cooldown permanently
- Cooldown_until in past but status unchanged
- **Action:** Check gate logic, verify reopening mechanism

**Generation corruption:**
- Generation reuse or regression
- Control state inconsistent
- **Action:** Emergency stop, manual state repair

---

## Observation Window Checkpoints

**Hour 6 (2026-03-14 03:52 EDT):**
- Check timeout volume
- Verify no expired deadlines lingering
- Confirm watchdog operational

**Hour 12 (2026-03-14 09:52 EDT):**
- Review timeout outcome distribution
- Check for any stale mutations
- Verify cooldown reopening working

**Hour 18 (2026-03-14 15:52 EDT):**
- Assess execution duration distribution
- Review any degraded transitions
- Confirm generation propagation correct

**Hour 24 (2026-03-14 21:52 EDT):**
- Final stability assessment
- Classify Phase 10.3: Deployed → Stable
- Document any anomalies

---

## Intervention Thresholds

**No intervention required:**
- Timeout volume < 5%
- No expired deadlines
- Clean watchdog behavior
- Correct outcome routing

**Investigation recommended:**
- Timeout volume 5-20%
- Occasional expired deadline (< 3)
- Sporadic stale mutation (< 2)

**Intervention required:**
- Timeout volume > 20%
- Persistent expired deadlines (> 3)
- Repeated stale mutations (> 3)
- Systematic outcome routing errors

**Emergency stop:**
- Timeout volume > 80%
- Expired deadlines accumulating
- Control state corruption detected
- Watchdog non-deterministic

---

## Stability Decision Criteria

**Phase 10.3 classified as STABLE if:**
1. ✅ Timeout volume rare and explainable (< 10%)
2. ✅ No expired deadlines linger in `reconciling`
3. ✅ Watchdog behavior deterministic
4. ✅ Timeout outcomes cleanly land in `cooldown` or `degraded`
5. ✅ No evidence of stale-result mutation
6. ✅ No evidence of sequence anomalies

**If all criteria met:** Phase 10.3 → Stable, gate opens for Phase 10.4

**If any criterion fails:** Investigation required, stability window extends

---

## Operator Notes

**This observation window is critical.** Phase 10.3 introduces bounded execution authority. If the boundary is not enforced cleanly, the entire control model is compromised.

**What to watch:**
- Timeout volume (should be rare)
- Watchdog determinism (should be perfect)
- Outcome correctness (should follow state machine)

**What to ignore:**
- Empty reconciliation panels (expected, no objectives yet)
- Provider status "unknown" (expected, no usage yet)
- Low execution volume (expected during observation)

**Bottom line:** Clean observation window → Phase 10.3 stable → Phase 10.4 begins.
