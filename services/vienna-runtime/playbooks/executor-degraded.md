# Recovery Playbook: Executor Degraded

**Symptom:** Vienna executor showing degraded performance or errors

**Triggers:**
- Executor health check fails
- Execution latency exceeds threshold
- Adapter errors increase
- Warrant validation failures spike

---

## Diagnostic Steps

### 1. Check Executor Health

**Via Vienna runtime:**
```javascript
const health = await executor.getHealth();
console.log(health);
```

**Expected metrics:**
- Pending tasks: <10
- Active executions: 0-5
- Adapter errors: 0
- Warrant cache hit rate: >80%

**If degraded:** Investigate specific component

---

### 2. Identify Degraded Component

**Executor components:**
1. **Warrant system** — Authorization and truth validation
2. **Adapter layer** — File/process/system operations
3. **Trading guard** — Trading safety checks
4. **Precondition engine** — Envelope precondition validation
5. **Audit logger** — Event trail generation

**Check each:**
```javascript
// Warrant system
const warrantStats = await warrants.getStats();

// Adapter health
const adapterHealth = await adapters.getHealth();

// Trading guard
const guardStatus = await tradingGuard.getStatus();

// Audit logger
const auditStatus = await audit.getStatus();
```

---

### 3. Check Resource Constraints

**Disk space:**
```bash
df -h ~/.vienna
```

**Memory:**
```bash
free -h
```

**File descriptors:**
```bash
lsof -p $(pgrep -f vienna-core) | wc -l
```

**Expected:** Adequate headroom (>10% disk, >1GB RAM, <1000 file descriptors)

---

## Recovery Actions

### Action 1: Clear Warrant Cache

**When to use:** Warrant cache stale or corrupted

**Safe:** Yes, rebuilds from truth sources

**Approval required:** No

**Execution:**
```javascript
await warrants.clearCache();
await warrants.rebuildFromTruth();
```

---

### Action 2: Restart Adapters

**When to use:** Adapter errors accumulating

**Safe:** Yes, interrupts in-flight operations only

**Approval required:** No

**Execution:**
```javascript
await adapters.restart();
```

**Note:** May interrupt active file writes or process executions

---

### Action 3: Flush Audit Buffer

**When to use:** Audit logger backing up, memory pressure

**Safe:** Yes, writes buffered events to disk

**Approval required:** No

**Execution:**
```javascript
await audit.flush();
```

---

### Action 4: Pause Execution Queue

**When to use:** Executor overwhelmed, need to drain queue

**Safe:** Yes, prevents new task intake

**Approval required:** Yes (operational change)

**Execution:**
```javascript
await executor.pause({ reason: 'Degraded performance, draining queue' });
```

**Resume after:**
- Queue drained
- Root cause resolved
- Resource constraints cleared

---

### Action 5: Emergency Executor Restart

**When to use:** Last resort, executor unresponsive

**Safe:** No, loses in-flight execution state

**Approval required:** Yes (destructive action)

**Execution:**
```bash
systemctl --user restart vienna-executor
```

**Consequences:**
- In-flight executions lost
- Warrants may need reissue
- Audit trail may have gaps

**Only use if:**
- Executor completely unresponsive
- Other recovery actions failed
- Operator approval obtained

---

## Degraded Component Recovery

### Warrant System Degraded

**Symptoms:**
- High warrant validation failure rate
- Stale truth sources
- Cache misses

**Recovery:**
1. Update truth sources (`VIENNA_RUNTIME_STATE.md`, etc.)
2. Clear and rebuild warrant cache
3. Reissue warrants for failed tasks

---

### Adapter Layer Degraded

**Symptoms:**
- File operation failures
- Process execution timeouts
- System call errors

**Recovery:**
1. Check file system health
2. Verify process permissions
3. Restart adapters
4. Check for resource exhaustion

---

### Trading Guard Degraded

**Symptoms:**
- Incorrect trading window detection
- False positive blocks
- State desync

**Recovery:**
1. Verify `VIENNA_RUNTIME_STATE.md` accuracy
2. Check system clock synchronization
3. Restart trading guard
4. Manual override if critical (requires approval)

---

### Precondition Engine Degraded

**Symptoms:**
- Precondition checks timing out
- False negatives (allowing invalid execution)
- Cache stale

**Recovery:**
1. Verify precondition sources (files, APIs)
2. Clear precondition cache
3. Re-evaluate pending tasks

---

## Escalation Criteria

Escalate if:

1. Executor unresponsive after restart
2. Adapter errors persist after restart
3. Resource exhaustion cannot be resolved
4. Multiple components degraded simultaneously
5. Degradation causing trading safety concerns

---

## Prevention

- Monitor executor health every 30s
- Alert on latency >5s for single execution
- Track adapter error rate, alert on spike
- Maintain warrant cache hit rate >80%
- Set resource limits (max queue depth, max concurrent executions)
- Regular audit log rotation to prevent disk exhaustion

---

## Related Playbooks

- `provider-unavailable.md` — If executor degraded due to provider issues
- `dlq-spike.md` — If executor degradation causes task backlog
- `gateway-disconnected.md` — If gateway issues affecting executor
