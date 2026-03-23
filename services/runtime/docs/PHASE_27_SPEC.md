# Phase 27 — Execution Explainability

**Goal:** Make operators trust decisions instantly  
**Duration:** 3-4 hours  
**Scope:** Clarity over sophistication, trust over intelligence

---

## Success Criteria

Operator can answer in <5 seconds:
- What happened?
- Why did it happen?
- What to do next?

**No execution is mysterious.**

---

## What to Build (ONLY These 4)

### 1. "Why was this done?"

**For successful executions:**

```json
{
  "execution_id": "exec_123",
  "action": "restart_service",
  "target": "openclaw-gateway",
  "decision_path": {
    "policy_used": "gateway_recovery_policy",
    "policy_verdict": "approved",
    "approval_path": "automatic_T0",
    "key_conditions": [
      "service_status: degraded",
      "health_check: failed",
      "time_window: allowed"
    ]
  },
  "outcome": "Service restarted successfully"
}
```

**Display:**
```
✓ Restarted openclaw-gateway

Policy: gateway_recovery_policy (approved)
Approval: Automatic (T0 action)

Conditions met:
• Service degraded
• Health check failed
• Time window allowed

Result: Service healthy
```

---

### 2. "Why was this blocked?"

**For denied executions:**

```json
{
  "execution_id": "exec_124",
  "action": "restart_service",
  "target": "kalshi-api",
  "decision_path": {
    "policy_used": "trading_protection_policy",
    "policy_verdict": "denied",
    "blocking_condition": {
      "type": "time_window",
      "reason": "Trading window active (9:30 AM - 4:00 PM)",
      "actual_time": "2026-03-23T14:30:00Z",
      "required": "Outside trading hours"
    }
  },
  "outcome": "Blocked by policy"
}
```

**Display:**
```
✗ Restart blocked: kalshi-api

Policy: trading_protection_policy (denied)

Blocking condition:
• Trading window active (2:30 PM)
• Required: Outside trading hours

What to do:
• Wait until 4:00 PM, or
• Override via safe mode (requires approval)
```

---

### 3. "What should I do next?"

**For failed executions:**

```json
{
  "execution_id": "exec_125",
  "action": "restart_service",
  "target": "openclaw-gateway",
  "decision_path": {
    "policy_used": "gateway_recovery_policy",
    "policy_verdict": "approved",
    "execution_result": "failed",
    "failure_reason": "Service not found"
  },
  "recommendations": [
    {
      "action": "check_service",
      "reason": "Service may not be installed",
      "command": "systemctl status openclaw-gateway"
    },
    {
      "action": "manual_fix",
      "reason": "Automatic recovery failed",
      "next_step": "Investigate service configuration"
    }
  ]
}
```

**Display:**
```
✗ Restart failed: openclaw-gateway

Policy: gateway_recovery_policy (approved)
Execution: Failed

Error: Service not found

Recommendations:
1. Check if service exists
   → systemctl status openclaw-gateway

2. Manual investigation required
   → Service may not be installed
```

---

### 4. "What changed?"

**For completed executions:**

```json
{
  "execution_id": "exec_126",
  "action": "restart_service",
  "target": "openclaw-gateway",
  "state_diff": {
    "before": {
      "status": "degraded",
      "health": "unhealthy",
      "uptime": "3d 14h",
      "last_error": "Connection timeout"
    },
    "after": {
      "status": "active",
      "health": "healthy",
      "uptime": "2m",
      "last_error": null
    },
    "changed_fields": ["status", "health", "uptime", "last_error"]
  },
  "verification": {
    "checks_passed": 3,
    "checks_failed": 0,
    "details": [
      { "check": "systemd_active", "result": "pass" },
      { "check": "tcp_port_open", "result": "pass" },
      { "check": "http_healthcheck", "result": "pass" }
    ]
  }
}
```

**Display:**
```
✓ openclaw-gateway restarted

Before:
• Status: degraded
• Health: unhealthy
• Error: Connection timeout

After:
• Status: active
• Health: healthy
• Uptime: 2 minutes

Verification: 3/3 checks passed
• systemd active: ✓
• port 18789 open: ✓
• health endpoint: ✓
```

---

## Implementation Plan

### Component 1: ExplanationGenerator

**Location:** `vienna-core/lib/explainability/explanation-generator.js`

**Responsibilities:**
- Load execution ledger events
- Extract decision path (policy, approval, conditions)
- Generate structured explanation object
- Format for operator display

**API:**
```javascript
class ExplanationGenerator {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  // Primary methods (4 only)
  explainSuccess(executionId);
  explainDenial(executionId);
  explainFailure(executionId);
  explainStateChange(executionId);
  
  // Internal helpers
  _loadLedgerEvents(executionId);
  _extractDecisionPath(events);
  _extractBlockingCondition(events);
  _generateRecommendations(events, failure);
  _extractStateDiff(events);
}
```

**No AI. No LLM. Just data extraction + formatting.**

---

### Component 2: State Diff Tracker

**Location:** `vienna-core/lib/explainability/state-diff-tracker.js`

**Responsibilities:**
- Capture before/after state snapshots
- Calculate diff (changed fields only)
- Attach to ledger events

**API:**
```javascript
class StateDiffTracker {
  captureBeforeState(target_id, target_type);
  captureAfterState(target_id, target_type);
  calculateDiff(beforeSnapshot, afterSnapshot);
}
```

**Integration point:**
- PlanExecutionEngine calls before/after execution

---

### Component 3: Recommendation Engine

**Location:** `vienna-core/lib/explainability/recommendation-engine.js`

**Responsibilities:**
- Generate next-step recommendations
- Based on failure type + context
- Simple rule-based logic

**API:**
```javascript
class RecommendationEngine {
  generateRecommendations(execution, failure) {
    // Rule-based logic, NOT AI
    if (failure.includes('not found')) {
      return [{ action: 'check_service', command: '...' }];
    }
    if (failure.includes('permission denied')) {
      return [{ action: 'check_permissions', command: '...' }];
    }
    // ... etc
  }
}
```

**No machine learning. No complex inference. Just pattern matching.**

---

### Component 4: Dashboard Integration

**Location:** `console/client/src/components/execution/ExecutionExplanation.tsx`

**Display components:**
- SuccessExplanation (green, checkmark, policy + outcome)
- DeniedExplanation (red, block icon, policy + blocking condition)
- FailureExplanation (yellow, warning icon, recommendations)
- StateDiffView (before/after comparison)

**No fancy animations. Just clarity.**

---

## File Structure

```
vienna-core/
├── lib/
│   └── explainability/
│       ├── explanation-generator.js
│       ├── state-diff-tracker.js
│       └── recommendation-engine.js
└── tests/
    └── phase-27/
        └── test-explainability.js

console/
└── client/
    └── src/
        └── components/
            └── execution/
                ├── ExecutionExplanation.tsx
                ├── SuccessExplanation.tsx
                ├── DeniedExplanation.tsx
                ├── FailureExplanation.tsx
                └── StateDiffView.tsx
```

---

## Implementation Steps

### Step 1: ExplanationGenerator (60 minutes)
- [ ] Extract decision path from ledger
- [ ] Extract blocking conditions
- [ ] Generate recommendations
- [ ] Calculate state diff
- [ ] Test with real execution

### Step 2: State Diff Tracker (45 minutes)
- [ ] Capture before state
- [ ] Capture after state
- [ ] Calculate changed fields
- [ ] Attach to ledger events

### Step 3: Recommendation Engine (45 minutes)
- [ ] Rule-based recommendation logic
- [ ] 10-15 common failure patterns
- [ ] Simple, actionable next steps

### Step 4: Dashboard Components (90 minutes)
- [ ] SuccessExplanation component
- [ ] DeniedExplanation component
- [ ] FailureExplanation component
- [ ] StateDiffView component
- [ ] Integration with execution detail view

---

## Test Plan

### Test 1: Success Explanation
- Execute: `restart_service` (T0, succeeds)
- Verify: Policy used, approval path, outcome visible
- Expected: <5 seconds to understand

### Test 2: Denial Explanation
- Execute: `restart_service` during trading window (denied)
- Verify: Blocking condition, time window, next steps visible
- Expected: <5 seconds to understand

### Test 3: Failure Explanation
- Execute: `restart_service` (service not found)
- Verify: Error reason, recommendations, next steps visible
- Expected: <5 seconds to understand

### Test 4: State Diff
- Execute: `restart_service` (succeeds)
- Verify: Before/after state, changed fields, verification checks visible
- Expected: <5 seconds to understand

---

## What NOT to Build

❌ Natural language narratives  
❌ AI-generated explanations  
❌ Complex reasoning graphs  
❌ Multi-paragraph descriptions  
❌ Fancy visualizations  
❌ Interactive debugging tools  

**Keep it brutally simple.**

---

## Acceptance Criteria

Phase 27 is complete when:

1. ✅ Every execution has clear explanation
2. ✅ Operator can answer "what/why/next" in <5 seconds
3. ✅ No mysterious executions
4. ✅ Recommendations actionable
5. ✅ State diffs clear

**Then proceed to Phase 28.**

---

## Estimated Duration

- ExplanationGenerator: 60 minutes
- StateDiffTracker: 45 minutes
- RecommendationEngine: 45 minutes
- Dashboard components: 90 minutes
- Testing + integration: 30 minutes

**Total: 3-4 hours**

---

## Next Phase After 27

**Phase 28:** Execution Isolation (multi-tenant safety)  
**Phase 29:** Cost Tracking (execution budgets)  
**Phase 30:** Federation (multi-node execution)

---

**Let's build Phase 27 now.**
