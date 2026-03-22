# Phase 10.3 Observation Monitoring Plan

**Window:** 2026-03-13 21:52 EDT → 2026-03-14 21:52 EDT (24 hours)  
**Status:** ACTIVE  
**Remaining:** ~23.5 hours (as of 2026-03-13 22:27 EDT)

---

## Monitoring Objectives

Validate three control invariants in production:

1. **Drift detection is not permission to act** (Phase 10.1)
2. **Failure is not permission to retry** (Phase 10.2)
3. **Admission grants bounded authority in time** (Phase 10.3)

---

## Watch Criteria

### Critical Anomalies (Immediate Escalation)

1. **Expired deadlines stuck in reconciling**
   - Symptom: `reconciliation_status='reconciling'` + `execution_deadline` in past + not transitioning
   - Impact: Violates bounded authority invariant
   - Tool: `node scripts/inspect-objective.js <id>`

2. **Unexpected timeout storms**
   - Symptom: >5 timeouts in 5-minute window
   - Impact: May indicate systemic issue
   - Tool: Dashboard timeout metrics

3. **Watchdog nondeterminism**
   - Symptom: Same timeout detected multiple times or skipped
   - Impact: Violates deterministic enforcement
   - Tool: `node scripts/watchdog-status.js`

4. **Stale completion mutation**
   - Symptom: Late completion rewrites control state after timeout
   - Impact: Violates generation-based protection
   - Tool: Ledger event order inspection

5. **Sequence anomalies**
   - Symptom: Transitions bypass gate/verification
   - Impact: Violates governance boundaries
   - Tool: `node scripts/audit-transitions.js`

6. **Unexpected degraded spikes**
   - Symptom: Multiple objectives entering `degraded` without policy reason
   - Impact: May indicate circuit breaker malfunction
   - Tool: Dashboard objective status distribution

---

## Monitoring Tools (Observational Only)

### Dashboard
- Objective status distribution
- Timeout volume metrics
- Reconciliation timeline
- Ledger event viewer

### CLI
```bash
# Objective state inspection
node scripts/inspect-objective.js <objective_id>

# Watchdog health
node scripts/watchdog-status.js

# Recent timeouts
node scripts/query-recent-timeouts.js

# Transition audit
node scripts/audit-transitions.js

# Ledger event order
node scripts/ledger-timeline.js <execution_id>
```

### Chaos Tooling (Read-Only)
- No chaos injection during observation
- Tools available for post-window testing only

---

## Normal Operational Patterns (Expected)

### Healthy Patterns
- Occasional timeouts (1-3 per hour) for slow operations
- Clean transitions: `reconciling` → timeout → `cooldown` or `degraded`
- Watchdog runs every 10s, detects timeouts deterministically
- No deadline creep (expired deadlines transition immediately)
- Generation increments on timeout

### Edge Cases (Acceptable)
- Service genuinely takes >60s → timeout expected
- Network delay causes health check timeout → expected
- Multiple objectives timeout simultaneously if service down → expected

---

## Monitoring Cadence

### Continuous (Automated)
- Watchdog: 10s interval (no action needed)
- Dashboard metrics: Real-time

### Periodic Manual Checks
- **Every 4 hours:** Dashboard review
- **Every 8 hours:** CLI spot check (`watchdog-status.js`, `query-recent-timeouts.js`)
- **End of window:** Full audit before stability decision

---

## Escalation Procedure

### If Critical Anomaly Detected

1. **Capture evidence**
   - Screenshot dashboard
   - Export ledger timeline
   - Run diagnostic CLI commands
   - Copy objective state snapshot

2. **Notify operator**
   - Describe anomaly with evidence
   - Link to diagnostic output
   - Recommend action (extend observation / investigate / rollback)

3. **Do NOT modify runtime**
   - No fixes during observation window
   - Investigation only

### If No Anomalies by Window Close

1. Proceed to Task 2 stability decision
2. Finalize state updates (Task 3)
3. Mark Phase 10.3 as STABLE
4. Begin Phase 10.4 implementation

---

## Protected Files (No Modifications During Window)

```
vienna-core/lib/execution/execution-watchdog.js
vienna-core/lib/core/reconciliation-gate.js
vienna-core/lib/core/remediation-trigger-integrated.js
vienna-core/lib/governance/failure-policy-schema.js
```

Any emergency fix requires operator approval + observation window extension.

---

## Success Criteria

Window closes cleanly if:

- ✅ Zero critical anomalies detected
- ✅ Timeouts rare and explainable
- ✅ Expired deadlines never linger in `reconciling`
- ✅ Watchdog behavior deterministic
- ✅ Timeout outcomes cleanly land in `cooldown` or `degraded`
- ✅ No evidence of stale-result mutation or sequence anomalies

---

## Next Actions After Clean Window

1. Issue stability decision (Task 2)
2. Finalize state updates (Task 3)
3. Begin Phase 10.4 implementation (Tasks 4-5)
4. Resume normal development velocity

---

**Monitoring status:** ACTIVE  
**Next checkpoint:** 2026-03-14 02:00 EDT (4-hour mark)  
**Final checkpoint:** 2026-03-14 21:52 EDT (window close)
