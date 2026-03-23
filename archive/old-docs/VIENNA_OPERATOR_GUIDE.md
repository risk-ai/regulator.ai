# Vienna Operator Guide

**Last Updated:** 2026-03-14 01:00 EDT  
**Purpose:** Help operators interpret Vienna's control-plane dashboard and understand system status

---

## What Vienna Shows You

**Vienna OS gives you visibility into governed autonomous reconciliation.**

When you open the dashboard at http://100.120.116.10:5174, you see:
- What the system is trying to maintain (objectives)
- What it's doing right now (execution leases)
- What's preventing action (circuit breakers)
- What happened recently (timeline)
- What control overrides are active (runtime control)

---

## Control-Plane Dashboard (Phase 10.5)

### Panel 1: Reconciliation Activity

**What it shows:** Active reconciliations happening right now

**When empty:**
```
No active reconciliations
```
This is normal. It means:
- No objectives are being remediated
- System is either healthy or waiting in cooldown/degraded states

**When populated:**
```
Objective ID: gateway-health
Status: reconciling
Generation: 15
Started: 2 minutes ago
Progress: Executing step 2/3
```

**What to look for:**
- How many objectives are actively reconciling (usually 0-2)
- How long they've been running (should be < 2 minutes)
- Whether progress is being made

**When to intervene:**
- Same objective stuck for > 5 minutes
- Many objectives reconciling simultaneously (> 5)
- Objective keeps reappearing (loop detection)

---

### Panel 2: Execution Leases

**What it shows:** Active execution authority with deadlines

**When empty:**
```
No active execution leases
```
This is normal. Executions complete quickly (< 2 minutes).

**When populated:**
```
Objective: gateway-health
Attempt: exec-15
Deadline: in 87 seconds
Generation: 15
```

**What to look for:**
- **Seconds remaining:** Should count down, not stay frozen
- **Deadline approaching:** < 30s remaining means action may timeout
- **Expired deadlines:** 0s remaining = timed out (watchdog should transition it)

**Colors (if implemented):**
- Green: > 60s remaining (plenty of time)
- Yellow: 30-60s remaining (getting close)
- Red: < 30s remaining (likely to timeout)
- Gray: Expired (watchdog should clean this up)

**When to intervene:**
- Expired deadlines lingering (should be cleaned up immediately)
- Same objective timing out repeatedly
- Deadline frozen (not counting down)

---

### Panel 3: Circuit Breakers

**What it shows:** Objectives with consecutive failures (retry protection)

**When empty:**
```
No circuit breakers active
```
This is normal. System is healthy.

**When populated:**
```
Objective: gateway-health
Failures: 2/3
Status: cooldown
Cooldown expires: in 4 minutes 32 seconds
Last failure: Service restart failed: connection refused
```

**What to look for:**
- **Failure count:** 1-2 = retrying, 3 = degraded
- **Cooldown time:** Should count down to 0, then reopen
- **Last failure reason:** What actually went wrong

**Status meanings:**
- **cooldown** — Failed but retries available, waiting to retry
- **degraded** — Attempts exhausted, manual intervention required
- **safe_mode** — Operator/system override, no autonomous action

**When to intervene:**
- Degraded status (manual reset required)
- Cooldown never expiring (stuck in cooldown)
- Same failure repeating 3+ times
- Failure reason indicates systemic issue (not transient)

---

### Panel 4: Reconciliation Timeline

**What it shows:** Recent lifecycle events (last 24 hours)

**When empty:**
```
No reconciliation events in the last 24 hours
```
This is normal during observation window.

**When populated:**
```
2 minutes ago | gateway-health | execution_completed
5 minutes ago | gateway-health | execution_started (gen 15)
8 minutes ago | gateway-health | drift_detected (Service unhealthy)
```

**Event types:**
- **drift_detected** — Objective became unhealthy
- **reconciliation_admitted** — Gate allowed remediation to proceed
- **reconciliation_skipped** — Gate denied (reason: cooldown/degraded/safe_mode)
- **execution_started** — Remediation began
- **execution_completed** — Remediation succeeded
- **execution_failed** — Remediation failed
- **execution_timeout** — Remediation exceeded deadline
- **cooldown_entered** — Failure, retries available
- **degraded** — Attempts exhausted
- **recovered** — Objective healthy again

**What to look for:**
- **Healthy pattern:** drift → admitted → started → completed → recovered
- **Retry pattern:** drift → admitted → started → failed → cooldown → admitted → started → completed → recovered
- **Failure pattern:** drift → admitted → started → failed → cooldown → admitted → started → failed → degraded
- **Timeout pattern:** drift → admitted → started → timeout → cooldown

**When to intervene:**
- Many timeouts (> 20% of executions)
- Systematic failures (same reason repeating)
- Unexpected event sequences (state machine violation)

---

### Panel 5: Runtime Control

**What it shows:** System-wide control overrides

**Controls:**

**Safe Mode Toggle:**
```
Safe Mode: OFF
Status: Autonomous reconciliation active
```

**What it does:**
- **ON** — Suspends all autonomous reconciliation admission
- **OFF** — Normal operation, gate evaluates admission normally

**When to use:**
- System behaving unexpectedly (repeated failures)
- During manual maintenance
- Emergency brake during investigation
- Before making system-wide changes

**Manual Reset Button:**
```
Reset Objective: [dropdown]
[Reset to Idle]
```

**What it does:**
- Clears degraded status
- Resets consecutive failures to 0
- Returns objective to idle state
- Allows gate to consider it again

**When to use:**
- After fixing root cause of degraded objective
- After manual intervention resolved issue
- To give objective another chance after investigation

---

### Panel 6: Execution Pipeline

**What it shows:** Visual flow of governance pipeline

**Pipeline stages:**
```
Intent → Plan → Policy → Warrant → Execution → Verification → Ledger
```

**Colors (if implemented):**
- Green: Stage active, healthy
- Yellow: Stage active, warnings
- Red: Stage blocked or failed
- Gray: Stage inactive

**What to look for:**
- Pipeline flow (left to right)
- Bottlenecks (many requests stuck at one stage)
- Failures (red stages)

---

## Common Status Meanings

### Objective Status

**idle**
- Objective is healthy
- No drift detected
- No action needed

**reconciling**
- Active remediation in progress
- Execution lease granted
- Deadline tracking active

**cooldown**
- Execution failed
- Retries available
- Waiting before retry (default 300s)

**degraded**
- All retry attempts exhausted (3 by default)
- Manual intervention required
- Automatic reconciliation suspended

**safe_mode**
- Operator or system override active
- No autonomous action permitted
- Manual control only

---

### Provider Status

**healthy**
- Provider responding
- Recent successful executions
- Available for use

**degraded**
- Provider responding but slow/unreliable
- Success rate 50-80%
- May fallback to alternate provider

**unavailable**
- Provider not responding
- Success rate < 50%
- Will not be used

**unknown**
- No recent execution history
- Insufficient evidence to determine health
- First use will test provider

---

### Reconciliation Status

**No active reconciliations**
- Normal state
- System is healthy or waiting

**Reconciling: gateway-health**
- Service is being restarted/recovered
- Should complete in < 2 minutes

**Multiple reconciliations**
- Several objectives unhealthy simultaneously
- Watch for systemic issues

---

## When to Intervene

### Green (No Intervention)

- Empty reconciliation activity
- No execution leases
- No circuit breakers
- Timeline shows healthy patterns
- Safe mode OFF
- Execution pipeline green

**Action:** Continue monitoring

---

### Yellow (Investigation Recommended)

- 1-2 active reconciliations
- Execution lease approaching deadline (< 30s)
- 1-2 objectives in cooldown
- Timeline shows occasional timeouts (< 10%)
- Pipeline has warnings

**Action:**
1. Check timeline for patterns
2. Review failure reasons
3. Monitor for escalation
4. No immediate action required

---

### Red (Intervention Required)

- Many active reconciliations (> 5)
- Expired deadlines lingering
- Objectives degraded
- Timeline shows systematic failures (> 20%)
- Pipeline blocked or failed

**Action:**
1. Enable safe mode (stop autonomous action)
2. Investigate root cause
3. Check system health (services, resources)
4. Review logs for errors
5. Fix underlying issue
6. Reset degraded objectives
7. Disable safe mode

---

### Critical (Emergency Stop)

- Execution leases accumulating (not completing)
- Watchdog not transitioning timeouts
- Control state corruption detected
- System unresponsive

**Action:**
1. **IMMEDIATELY** enable safe mode
2. Stop evaluation loop service
3. Investigate critical failure
4. Do not proceed until root cause identified
5. May require runtime restart

---

## Decision Guide

**"Should I enable safe mode?"**

Enable if:
- System behaving unexpectedly
- Many failures (> 50%)
- Investigating incident
- Making system changes

Keep disabled if:
- System healthy
- Occasional failures (< 10%)
- Normal operation

---

**"Should I reset a degraded objective?"**

Reset if:
- Root cause identified and fixed
- Manual intervention completed issue
- Confident next attempt will succeed

Don't reset if:
- Root cause unknown
- Issue still present
- Will just fail again immediately

---

**"Should I investigate a timeout?"**

Investigate if:
- Timeouts frequent (> 10%)
- Same objective timing out repeatedly
- Timeout volume increasing

Ignore if:
- Single isolated timeout
- Network blip or transient issue
- Recovered on retry

---

**"Should I restart the runtime?"**

Restart if:
- Runtime unresponsive
- Critical corruption detected
- Watchdog not functioning
- After configuration changes

Don't restart if:
- Normal operation
- Occasional failures (handle with safe mode)
- During observation window (preserves evidence)

---

## Understanding the Timeline

### Healthy Lifecycle

```
10:00:00 | gateway-health | drift_detected (Service unhealthy)
10:00:01 | gateway-health | reconciliation_admitted (gen 15)
10:00:02 | gateway-health | execution_started (exec-15)
10:00:45 | gateway-health | execution_completed
10:00:46 | gateway-health | recovered (Verification passed)
```

**Duration:** ~46 seconds  
**Outcome:** Success  
**Pattern:** Normal recovery

---

### Retry Lifecycle

```
10:00:00 | gateway-health | drift_detected
10:00:01 | gateway-health | reconciliation_admitted (gen 15)
10:00:02 | gateway-health | execution_started
10:00:30 | gateway-health | execution_failed (Connection refused)
10:00:31 | gateway-health | cooldown_entered (300s, attempt 1/3)
10:05:31 | gateway-health | reconciliation_admitted (gen 16)
10:05:32 | gateway-health | execution_started
10:06:15 | gateway-health | execution_completed
10:06:16 | gateway-health | recovered
```

**First attempt:** Failed  
**Cooldown:** 5 minutes  
**Second attempt:** Succeeded  
**Pattern:** Transient failure, recovered on retry

---

### Degraded Lifecycle

```
10:00:00 | gateway-health | drift_detected
10:00:01 | gateway-health | reconciliation_admitted (gen 15)
10:00:02 | gateway-health | execution_started
10:00:30 | gateway-health | execution_failed (Connection refused)
10:00:31 | gateway-health | cooldown_entered (300s, attempt 1/3)
10:05:31 | gateway-health | reconciliation_admitted (gen 16)
10:05:32 | gateway-health | execution_started
10:06:00 | gateway-health | execution_failed (Connection refused)
10:06:01 | gateway-health | cooldown_entered (300s, attempt 2/3)
10:11:01 | gateway-health | reconciliation_admitted (gen 17)
10:11:02 | gateway-health | execution_started
10:11:30 | gateway-health | execution_failed (Connection refused)
10:11:31 | gateway-health | degraded (Attempts exhausted)
```

**All attempts:** Failed  
**Final state:** Degraded  
**Pattern:** Systemic issue, manual intervention required

---

### Timeout Lifecycle

```
10:00:00 | gateway-health | drift_detected
10:00:01 | gateway-health | reconciliation_admitted (gen 15)
10:00:02 | gateway-health | execution_started
10:02:02 | gateway-health | execution_timeout (Exceeded 120s deadline)
10:02:03 | gateway-health | cooldown_entered (300s, attempt 1/3)
```

**Execution time:** 120 seconds (deadline)  
**Outcome:** Timeout  
**Pattern:** Execution took too long, retrying after cooldown

---

## Frequently Asked Questions

**Q: Why is the dashboard empty?**  
A: During observation window, this is expected. No objectives have been created yet.

**Q: Why do providers show "unknown"?**  
A: No execution history yet. Send a chat message to populate provider status.

**Q: Why is chat unavailable?**  
A: Providers are unavailable or in cooldown. Check provider status panel.

**Q: What's a "generation"?**  
A: Monotonic counter per objective. Prevents stale completions from rewriting control state.

**Q: What's an "execution lease"?**  
A: Time-bounded permission to execute. Lease = started_at + deadline (default 120s).

**Q: What's "cooldown"?**  
A: Waiting period after failure before retry (default 300s). Prevents tight retry loops.

**Q: What's "degraded"?**  
A: Retry attempts exhausted. Manual intervention required.

**Q: What's "safe mode"?**  
A: Emergency brake. Suspends all autonomous reconciliation admission.

**Q: Can I manually trigger reconciliation?**  
A: Not yet. Phase 10.4 will add manual trigger controls.

**Q: How do I reset a degraded objective?**  
A: Use Runtime Control panel → Manual Reset → Select objective → Reset to Idle

**Q: Why are execution leases expired but still shown?**  
A: Watchdog should clean these up within seconds. If lingering, investigation required.

**Q: What's the difference between reconciliation and execution?**  
A: Reconciliation = full lifecycle (drift → remediation → recovery). Execution = just the remediation step.

---

## Bottom Line

**The control-plane dashboard shows you what Vienna is doing autonomously.**

**Most of the time, panels will be empty.** That's good. It means the system is healthy.

**When panels populate, read the timeline.** It tells the story of what went wrong and how Vienna tried to fix it.

**When intervention needed, use safe mode first.** Stop autonomous action, investigate, fix root cause, then re-enable.

**Vienna's job is to maintain objectives.** Your job is to decide whether it's doing so safely and correctly.
