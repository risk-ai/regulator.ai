# Phase 10.4 — Safe Mode as Governance Override

**Status:** Planning (awaiting Phase 10.3 stability decision)  
**Estimated Effort:** 4-6 hours  
**Complexity:** Medium  
**Risk:** Low (governance-layer only, no execution changes)

---

## Context

**Phase 10.1:** Drift detection is not permission to act  
**Phase 10.2:** Failure is not permission to retry  
**Phase 10.3:** Admission grants bounded authority in time  

**Phase 10.4:** Safe Mode is a governance override that suspends autonomous reconciliation admission.

---

## Core Principle

> Safe Mode is **not** a failure state. It is a governance override.

**What it is:**
- Operator or system-imposed global control boundary
- Higher-order admission veto
- Emergency brake above the normal reconciliation loop

**What it is NOT:**
- Breaker state (that's cooldown/degraded)
- Timeout consequence
- Failure response

---

## Design Goals

### Goal 1: Emergency Brake

**Operator can immediately stop all autonomous reconciliation.**

Use cases:
- System behaving unexpectedly
- Investigating incident
- Manual maintenance window
- Before system-wide changes

**Requirement:** Single button press → no new reconciliations admitted

---

### Goal 2: No Disruption to Active Work

**Safe mode does not kill running executions.**

Behavior:
- Active reconciliations continue
- Active execution leases remain valid
- Watchdog still enforces timeouts
- Verification still runs

**Only change:** Gate denies new admissions

---

### Goal 3: Clear Resumption

**Operator knows when safe mode is active and how to disable it.**

Requirements:
- Visible indicator in dashboard
- Clear state in State Graph
- Audit trail of safe mode transitions
- Simple toggle control

---

### Goal 4: System Can Request Safe Mode

**Runtime can request safe mode on detection of critical issues.**

Triggers:
- High timeout volume (> 80%)
- Systematic state corruption detected
- Watchdog malfunction detected
- Critical resource exhaustion

**But:** Operator must approve. System cannot force safe mode without operator visibility.

---

## Implementation Plan

### Component A: Safe Mode State (1 hour)

**Add to `runtime_context` table:**
```sql
INSERT INTO runtime_context (key, value, category, updated_by)
VALUES ('safe_mode_active', 'false', 'governance', 'system');

INSERT INTO runtime_context (key, value, category, updated_by)
VALUES ('safe_mode_reason', NULL, 'governance', 'system');

INSERT INTO runtime_context (key, value, category, updated_by)
VALUES ('safe_mode_entered_at', NULL, 'governance', 'system');

INSERT INTO runtime_context (key, value, category, updated_by)
VALUES ('safe_mode_entered_by', NULL, 'governance', 'system');
```

**State Graph methods:**
```javascript
// lib/state/state-graph.js

getSafeModeStatus() {
  const active = this.getRuntimeContext('safe_mode_active');
  const reason = this.getRuntimeContext('safe_mode_reason');
  const enteredAt = this.getRuntimeContext('safe_mode_entered_at');
  const enteredBy = this.getRuntimeContext('safe_mode_entered_by');
  
  return {
    active: active === 'true',
    reason: reason || null,
    entered_at: enteredAt || null,
    entered_by: enteredBy || null,
  };
}

enableSafeMode(reason, operator = 'system') {
  this.setRuntimeContext('safe_mode_active', 'true', operator);
  this.setRuntimeContext('safe_mode_reason', reason, operator);
  this.setRuntimeContext('safe_mode_entered_at', new Date().toISOString(), operator);
  this.setRuntimeContext('safe_mode_entered_by', operator, operator);
  
  console.log(`[StateGraph] Safe mode enabled by ${operator}: ${reason}`);
}

disableSafeMode(operator = 'system') {
  this.setRuntimeContext('safe_mode_active', 'false', operator);
  this.setRuntimeContext('safe_mode_reason', null, operator);
  this.setRuntimeContext('safe_mode_entered_at', null, operator);
  this.setRuntimeContext('safe_mode_entered_by', null, operator);
  
  console.log(`[StateGraph] Safe mode disabled by ${operator}`);
}
```

**Test:**
```javascript
const sg = getStateGraph();
await sg.initialize();

console.log('Initial:', sg.getSafeModeStatus());
// { active: false, reason: null, entered_at: null, entered_by: null }

sg.enableSafeMode('Manual testing', 'operator');
console.log('After enable:', sg.getSafeModeStatus());
// { active: true, reason: 'Manual testing', entered_at: '2026-03-14...', entered_by: 'operator' }

sg.disableSafeMode('operator');
console.log('After disable:', sg.getSafeModeStatus());
// { active: false, reason: null, entered_at: null, entered_by: null }
```

---

### Component B: Gate Integration (1.5 hours)

**Update `reconciliation-gate.js`:**

```javascript
// lib/core/reconciliation-gate.js

requestAdmission(objective) {
  // Existing checks...
  
  // SAFE MODE CHECK (highest priority)
  const safeModeStatus = this.stateGraph.getSafeModeStatus();
  if (safeModeStatus.active) {
    this._recordAdmissionDenied(objective, 'safe_mode', {
      reason: safeModeStatus.reason,
      entered_by: safeModeStatus.entered_by,
      entered_at: safeModeStatus.entered_at,
    });
    
    return {
      admitted: false,
      reason: 'safe_mode',
      skip_reason: `Safe mode active: ${safeModeStatus.reason}`,
      generation: null,
    };
  }
  
  // ... rest of admission logic
}
```

**Ledger event:**
```javascript
// When safe mode denies admission
{
  event_type: 'objective.reconciliation.skipped',
  objective_id: 'gateway-health',
  metadata: {
    skip_reason: 'safe_mode',
    safe_mode_reason: 'Operator investigation',
    safe_mode_entered_by: 'max',
    safe_mode_entered_at: '2026-03-14T05:30:00Z'
  }
}
```

**Test:**
```javascript
const gate = new ReconciliationGate(stateGraph);
const objective = { objective_id: 'test-obj', reconciliation_status: 'idle' };

// Normal admission
let result = gate.requestAdmission(objective);
console.log(result.admitted); // true

// Enable safe mode
stateGraph.enableSafeMode('Testing safe mode', 'operator');

// Admission denied
result = gate.requestAdmission(objective);
console.log(result.admitted); // false
console.log(result.reason); // 'safe_mode'
```

---

### Component C: Safe Mode Lifecycle Events (1 hour)

**New ledger events:**

1. **safe_mode_entered**
```javascript
{
  event_type: 'system.safe_mode_entered',
  timestamp: '2026-03-14T05:30:00Z',
  metadata: {
    reason: 'High timeout volume detected',
    entered_by: 'system',
    trigger: 'automatic',
    timeout_rate: 0.85,
  }
}
```

2. **safe_mode_released**
```javascript
{
  event_type: 'system.safe_mode_released',
  timestamp: '2026-03-14T05:45:00Z',
  metadata: {
    duration_seconds: 900,
    released_by: 'operator',
    trigger: 'manual',
  }
}
```

**Objective-specific events:**

When safe mode blocks admission:
```javascript
{
  event_type: 'objective.reconciliation.skipped',
  objective_id: 'gateway-health',
  metadata: {
    skip_reason: 'safe_mode',
    safe_mode_active: true,
  }
}
```

**Implementation:**
```javascript
// lib/state/state-graph.js

enableSafeMode(reason, operator = 'system') {
  // Set runtime context (existing)
  this.setRuntimeContext('safe_mode_active', 'true', operator);
  this.setRuntimeContext('safe_mode_reason', reason, operator);
  this.setRuntimeContext('safe_mode_entered_at', new Date().toISOString(), operator);
  this.setRuntimeContext('safe_mode_entered_by', operator, operator);
  
  // Record system event
  this.recordSystemEvent('safe_mode_entered', {
    reason,
    entered_by: operator,
    trigger: operator === 'system' ? 'automatic' : 'manual',
  });
}

disableSafeMode(operator = 'system') {
  const status = this.getSafeModeStatus();
  
  if (status.active && status.entered_at) {
    const durationMs = Date.now() - new Date(status.entered_at).getTime();
    
    // Record system event
    this.recordSystemEvent('safe_mode_released', {
      duration_seconds: Math.floor(durationMs / 1000),
      released_by: operator,
      trigger: operator === 'system' ? 'automatic' : 'manual',
    });
  }
  
  // Clear runtime context (existing)
  this.setRuntimeContext('safe_mode_active', 'false', operator);
  this.setRuntimeContext('safe_mode_reason', null, operator);
  this.setRuntimeContext('safe_mode_entered_at', null, operator);
  this.setRuntimeContext('safe_mode_entered_by', null, operator);
}

recordSystemEvent(eventType, metadata) {
  const stmt = this.db.prepare(`
    INSERT INTO execution_ledger_events (
      execution_id,
      event_timestamp,
      event_type,
      event_payload
    ) VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(
    'system-' + Date.now(),
    new Date().toISOString(),
    'system.' + eventType,
    JSON.stringify(metadata)
  );
}
```

---

### Component D: Dashboard Controls (1.5 hours)

**Frontend component:**

```typescript
// console/client/src/components/control-plane/SafeModeControl.tsx

interface SafeModeStatus {
  active: boolean;
  reason: string | null;
  entered_at: string | null;
  entered_by: string | null;
}

export function SafeModeControl() {
  const [status, setStatus] = useState<SafeModeStatus | null>(null);
  const [reason, setReason] = useState('');
  
  async function fetchStatus() {
    const res = await fetch('/api/v1/reconciliation/safe-mode');
    const data = await res.json();
    if (data.success) {
      setStatus(data.data);
    }
  }
  
  async function toggleSafeMode() {
    if (status?.active) {
      // Disable
      await fetch('/api/v1/reconciliation/safe-mode', {
        method: 'DELETE',
      });
    } else {
      // Enable
      await fetch('/api/v1/reconciliation/safe-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    }
    await fetchStatus();
  }
  
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  if (!status) return <div>Loading...</div>;
  
  return (
    <div className="safe-mode-control">
      <h3>Safe Mode</h3>
      
      {status.active ? (
        <div className="safe-mode-active">
          <div className="status-indicator red">ACTIVE</div>
          <div className="details">
            <p>Reason: {status.reason}</p>
            <p>Entered: {formatTimestamp(status.entered_at)}</p>
            <p>By: {status.entered_by}</p>
          </div>
          <button onClick={toggleSafeMode} className="btn-danger">
            Release Safe Mode
          </button>
        </div>
      ) : (
        <div className="safe-mode-inactive">
          <div className="status-indicator green">OFF</div>
          <p>Autonomous reconciliation active</p>
          <input
            type="text"
            placeholder="Reason for safe mode..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button 
            onClick={toggleSafeMode}
            disabled={!reason.trim()}
            className="btn-warning"
          >
            Enable Safe Mode
          </button>
        </div>
      )}
    </div>
  );
}
```

**Backend API:**

```typescript
// console/server/src/routes/reconciliation.ts

router.get('/safe-mode', async (req, res) => {
  try {
    const stateGraph = await getStateGraph();
    const status = stateGraph.getSafeModeStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SAFE_MODE_ERROR',
    });
  }
});

router.post('/safe-mode', async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Reason required',
        code: 'INVALID_REASON',
      });
    }
    
    const stateGraph = await getStateGraph();
    stateGraph.enableSafeMode(reason, req.session?.operator || 'operator');
    
    res.json({
      success: true,
      data: stateGraph.getSafeModeStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SAFE_MODE_ENABLE_ERROR',
    });
  }
});

router.delete('/safe-mode', async (req, res) => {
  try {
    const stateGraph = await getStateGraph();
    stateGraph.disableSafeMode(req.session?.operator || 'operator');
    
    res.json({
      success: true,
      data: stateGraph.getSafeModeStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SAFE_MODE_DISABLE_ERROR',
    });
  }
});
```

---

### Component E: Automatic Safe Mode Triggers (1 hour)

**System monitoring service:**

```javascript
// lib/core/safe-mode-monitor.js

class SafeModeMonitor {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
    this.checkInterval = 60000; // 1 minute
    this.thresholds = {
      timeoutRate: 0.80, // > 80% timeouts
      expiredLeases: 5,   // > 5 expired leases
      degradedObjectives: 10, // > 10 degraded
    };
  }
  
  async checkForCriticalConditions() {
    const safeModeStatus = this.stateGraph.getSafeModeStatus();
    
    // Don't double-trigger
    if (safeModeStatus.active) {
      return null;
    }
    
    // Check timeout rate (last hour)
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const events = this.stateGraph.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN transition_type = 'execution_timed_out' THEN 1 ELSE 0 END) as timeouts
      FROM managed_objective_history
      WHERE transition_type IN ('remediation_started', 'execution_timed_out')
      AND datetime(event_timestamp) > datetime(?)
    `, [hourAgo]);
    
    const timeoutRate = events[0].total > 0 ? events[0].timeouts / events[0].total : 0;
    
    if (timeoutRate > this.thresholds.timeoutRate) {
      return {
        trigger: 'high_timeout_rate',
        reason: `Critical timeout rate: ${(timeoutRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.timeoutRate * 100)}%)`,
        metadata: {
          timeout_rate: timeoutRate,
          timeout_count: events[0].timeouts,
          total_executions: events[0].total,
        },
      };
    }
    
    // Check for expired leases
    const expiredLeases = this.stateGraph.query(`
      SELECT COUNT(*) as count
      FROM managed_objectives
      WHERE reconciliation_status = 'reconciling'
      AND datetime(last_remediation_at, '+120 seconds') < datetime('now')
    `);
    
    if (expiredLeases[0].count > this.thresholds.expiredLeases) {
      return {
        trigger: 'expired_leases_accumulating',
        reason: `Expired leases accumulating: ${expiredLeases[0].count} (threshold: ${this.thresholds.expiredLeases})`,
        metadata: {
          expired_count: expiredLeases[0].count,
        },
      };
    }
    
    return null; // No critical conditions
  }
  
  start() {
    this.intervalId = setInterval(async () => {
      try {
        const trigger = await this.checkForCriticalConditions();
        
        if (trigger) {
          console.warn(`[SafeModeMonitor] Critical condition detected: ${trigger.trigger}`);
          console.warn(`[SafeModeMonitor] Requesting operator approval for safe mode`);
          
          // Log to incident system (don't auto-enable, require operator)
          this.stateGraph.createIncident({
            incident_type: 'safe_mode_requested',
            severity: 'critical',
            description: trigger.reason,
            status: 'pending',
            metadata: JSON.stringify({
              trigger: trigger.trigger,
              ...trigger.metadata,
              auto_safe_mode: false,
              requires_operator_approval: true,
            }),
          });
        }
      } catch (error) {
        console.error('[SafeModeMonitor] Check failed:', error);
      }
    }, this.checkInterval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

**Integration:**
```javascript
// console/server/src/server.ts

const safeModeMonitor = new SafeModeMonitor(stateGraph);
safeModeMonitor.start();
console.log('[SafeModeMonitor] Started');
```

---

## Testing Plan

### Test A: Manual Toggle (15 minutes)

1. Open dashboard at http://100.120.116.10:5174
2. Navigate to Control-Plane tab
3. Locate Safe Mode Control panel
4. Enter reason: "Testing safe mode"
5. Click "Enable Safe Mode"
6. Verify:
   - Status indicator shows "ACTIVE"
   - Reason displayed
   - Timestamp shown
   - "Release Safe Mode" button appears
7. Click "Release Safe Mode"
8. Verify:
   - Status indicator shows "OFF"
   - Enable controls restored

---

### Test B: Admission Denial (30 minutes)

1. Create test objective in idle state
2. Manually set objective to unhealthy (simulate drift)
3. Verify gate admits reconciliation (normal behavior)
4. Wait for reconciliation to complete
5. Enable safe mode via dashboard
6. Manually set objective to unhealthy again
7. Verify:
   - Evaluator detects drift
   - Gate denies admission
   - Timeline shows `reconciliation_skipped` with `safe_mode` reason
   - Objective remains in idle (no reconciling status)
8. Disable safe mode
9. Verify:
   - Next evaluation cycle admits reconciliation
   - Objective enters reconciling status

---

### Test C: Active Reconciliation Continues (20 minutes)

1. Create objective in idle
2. Set unhealthy
3. Wait for reconciliation to start
4. **While reconciling**, enable safe mode
5. Verify:
   - Active reconciliation continues
   - Execution lease remains valid
   - Watchdog still enforces timeout
   - Verification still runs
   - Reconciliation completes normally
6. Verify next drift detection is blocked by safe mode

---

### Test D: Lifecycle Events (15 minutes)

1. Enable safe mode via dashboard (reason: "Test lifecycle")
2. Query execution ledger:
   ```sql
   SELECT * FROM execution_ledger_events
   WHERE event_type = 'system.safe_mode_entered'
   ORDER BY event_timestamp DESC LIMIT 1
   ```
3. Verify event contains:
   - reason: "Test lifecycle"
   - entered_by: operator name
   - trigger: "manual"
4. Disable safe mode
5. Query execution ledger:
   ```sql
   SELECT * FROM execution_ledger_events
   WHERE event_type = 'system.safe_mode_released'
   ORDER BY event_timestamp DESC LIMIT 1
   ```
6. Verify event contains:
   - duration_seconds: approximate time
   - released_by: operator name
   - trigger: "manual"

---

### Test E: System Monitor (30 minutes)

1. Start safe mode monitor
2. Create 10 test objectives
3. Force all to timeout (simulate by delaying execution)
4. Wait for monitor check interval
5. Verify:
   - Monitor detects high timeout rate
   - Incident created (not auto-safe-mode)
   - Operator notification in dashboard
   - Safe mode NOT enabled automatically
6. Operator reviews incident
7. Operator enables safe mode manually

---

## Exit Criteria

**Phase 10.4 complete when:**

1. ✅ Safe mode state persists in State Graph
2. ✅ Gate respects safe mode (denies admission when active)
3. ✅ Dashboard control functional (enable/disable)
4. ✅ Lifecycle events recorded
5. ✅ Active reconciliations unaffected by safe mode entry
6. ✅ System monitor detects critical conditions
7. ✅ All tests passing (5 test categories, ~110 minutes total)
8. ✅ Documentation complete

---

## Documentation Deliverables

1. `PHASE_10.4_COMPLETE.md` — Implementation report
2. `SAFE_MODE_OPERATOR_GUIDE.md` — When to use, how it works
3. Update `VIENNA_OPERATOR_GUIDE.md` — Safe mode section
4. Update `VIENNA_RUNTIME_ARCHITECTURE.md` — Safe mode in control plane

---

## Risks and Mitigations

**Risk 1: Safe mode doesn't actually block admission**
- Mitigation: Test B validates gate integration
- Recovery: Fix gate logic, re-test

**Risk 2: Safe mode kills active reconciliations**
- Mitigation: Test C validates non-disruption
- Recovery: Change logic to only affect gate, not executor

**Risk 3: System auto-enables safe mode without operator visibility**
- Mitigation: Monitor creates incident, requires operator approval
- Recovery: Never auto-enable, always require operator

**Risk 4: Safe mode state corrupted/lost**
- Mitigation: Persist in State Graph (durable storage)
- Recovery: Re-enable via dashboard

---

## Phase Progression

**Before Phase 10.4:**
- Phase 10.3 observation window complete
- Phase 10.3 classified as stable
- No critical anomalies detected

**After Phase 10.4:**
- Phase 10.5 already delivered (control-plane dashboard)
- Phase 10 complete
- Phase 11 planning begins (Intent Gateway)

---

## Estimated Timeline

**If Phase 10.3 stability decision on 2026-03-14 21:52:**

- **Day 1 (2026-03-15):** Component A + B (2.5 hours)
- **Day 2 (2026-03-16):** Component C + D (2.5 hours)
- **Day 3 (2026-03-17):** Component E + Testing (2 hours)
- **Total:** 7 hours over 3 days

**Conservative estimate:** 4-6 hours implementation + 2 hours testing = 6-8 hours total

---

## Bottom Line

**Safe Mode is the final control boundary.**

**It ensures:**
- Operator can always stop autonomous action
- Emergency brake exists
- System can request intervention (but not force it)
- Active work continues, new work pauses

**Status:** Ready to implement after Phase 10.3 stable classification
