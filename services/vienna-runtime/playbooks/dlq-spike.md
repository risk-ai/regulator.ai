# Recovery Playbook: DLQ Spike

**Symptom:** Dead Letter Queue (DLQ) accumulating failed tasks

**Triggers:**
- DLQ size exceeds threshold (e.g., >20 entries)
- Failure rate spike detected
- Tasks repeatedly failing with same error

---

## Diagnostic Steps

### 1. Inspect DLQ Size

**Via recovery copilot:**
```
show dead letters
```

**Expected:** Should show DLQ entries with failure reasons

**If spike detected:** Analyze failure patterns

---

### 2. Analyze Failure Patterns

**Check for common failure reasons:**
- Warrant validation failures
- Provider unavailability
- Precondition failures
- Trading guard blocks
- File system errors

**Group by failure type:**
```javascript
// Via Vienna runtime API
const dlqEntries = await dlq.getAll();
const grouped = dlqEntries.reduce((acc, entry) => {
  const reason = entry.failureReason || 'unknown';
  acc[reason] = (acc[reason] || 0) + 1;
  return acc;
}, {});
```

---

### 3. Check Temporal Correlation

**Questions to answer:**
- Did DLQ spike correlate with provider failure?
- Did DLQ spike correlate with mode transition?
- Are failures clustered in time?

**If clustered:** Likely systemic issue (provider, runtime mode, trading guard)

**If distributed:** Likely task-specific issues (warrant failures, preconditions)

---

## Recovery Actions

### Action 1: Identify Root Cause

**When to use:** Always (first step)

**Safe:** Yes, diagnostic only

**Approval required:** No

**Common root causes:**
1. Provider unavailable → tasks failing on LLM calls
2. Warrant expired → tasks failing validation
3. Trading guard active → trading tasks blocked
4. Precondition failures → source data stale/missing

---

### Action 2: Replay Retryable Failures

**When to use:** Failures were transient (provider downtime, network blip)

**Safe:** If failures were transient, not if systemic

**Approval required:** Yes (execution action)

**Execution:** Via governed runtime action (not chat):

```javascript
const retryableEntries = dlqEntries.filter(e => e.retryEligible);
for (const entry of retryableEntries) {
  await executor.retryEnvelope(entry.envelopeId, {
    warrant: { /* valid warrant required */ },
    operatorApproval: true,
  });
}
```

**Constraints:**
- Requires valid warrant
- Must verify root cause resolved
- Audit trail required

---

### Action 3: Quarantine Failing Task Type

**When to use:** Specific task type repeatedly failing, want to prevent DLQ growth

**Safe:** Yes, prevents cascade

**Approval required:** Yes (policy change)

**Execution:** Via runtime policy (not chat):

```javascript
await executor.addTaskQuarantine({
  taskType: 'trading_order',
  reason: 'Repeated warrant failures',
  until: new Date(Date.now() + 3600000), // 1 hour
});
```

---

### Action 4: Clear Stale DLQ Entries

**When to use:** Entries are old, no longer relevant, safe to discard

**Safe:** Only if entries verified as non-critical

**Approval required:** Yes (data deletion)

**Execution:** Via governed action:

```javascript
const staleEntries = dlqEntries.filter(e => 
  new Date(e.failedAt) < new Date(Date.now() - 86400000) // >24h old
);

await dlq.clear(staleEntries.map(e => e.id), {
  operatorApproval: true,
  reason: 'Stale entries from resolved incident',
});
```

---

## DLQ Spike Scenarios

### Scenario 1: Provider Unavailability

**Pattern:** Failures clustered during provider downtime

**Root cause:** Tasks requiring LLM failed when provider unavailable

**Recovery:**
1. Wait for provider to recover
2. Replay retryable entries
3. No policy change needed

---

### Scenario 2: Warrant Expiration

**Pattern:** Warrant validation failures across multiple tasks

**Root cause:** Truth sources stale, warrants expired

**Recovery:**
1. Update truth sources
2. Reissue warrants for affected tasks
3. Replay with fresh warrants

---

### Scenario 3: Trading Guard Block

**Pattern:** Trading tasks blocked outside autonomous window

**Root cause:** Tasks attempted during protected hours

**Recovery:**
1. Wait for autonomous window
2. Replay during allowed time
3. Or: Get operator approval for override (rare)

---

### Scenario 4: Systemic Precondition Failure

**Pattern:** Precondition checks failing (file missing, service down)

**Root cause:** Dependency unavailable

**Recovery:**
1. Resolve dependency issue
2. Verify preconditions now pass
3. Replay affected tasks

---

## Escalation Criteria

Escalate if:

1. DLQ growing despite recovery attempts
2. Failure pattern unclear or novel
3. Retries failing repeatedly
4. DLQ size exceeds operational capacity (>100 entries)

---

## Prevention

- Monitor DLQ size every 5 minutes
- Alert on sudden growth (>10 entries in 5 min)
- Analyze failure patterns automatically
- Maintain retry backoff to prevent retry storms
- Set DLQ max size limit with overflow handling

---

## Related Playbooks

- `provider-unavailable.md` — If provider failures causing DLQ spike
- `executor-degraded.md` — If executor issues causing task failures
