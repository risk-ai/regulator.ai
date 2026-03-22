# Phase 9 RFC — Objective Orchestration

**Status:** Draft  
**Author:** Conductor  
**Date:** 2026-03-13  
**Prerequisites:** Phase 8 complete (governance spine operational)

---

## Executive Summary

Phase 9 introduces **Objective Orchestration** — persistent monitoring of system conditions with deterministic remediation when violations occur.

**Core principle:**
> Objectives are persistent statements about the world that must remain true. They do not invent actions; they trigger approved plans.

**What changes:**
- Vienna moves from **task executor** to **state-aware operator**
- System conditions monitored continuously
- Violations trigger governed remediation workflows
- Full lifecycle tracked in execution ledger

**What does NOT change:**
- Governance boundaries preserved (no bypass paths)
- Deterministic execution (no agent loops)
- Approval workflows respected (T1/T2 still require warrants)
- Execution pipeline unchanged (Plan → Policy → Warrant → Execute → Verify)

---

## Strategic Context

### Current State (Phase 8)

Vienna can execute governed workflows:
```
Intent → Plan → Policy → Warrant → Execution → Verification → Outcome → Ledger
```

**Limitation:** Workflows are reactive. Vienna executes when instructed, but doesn't maintain conditions.

### Target State (Phase 9)

Vienna can monitor and maintain system conditions:
```
Objective (declared) → Monitor → Detect violation → Trigger plan → Execute → Verify → Restore
```

**Outcome:** Vienna becomes state-aware operational infrastructure.

---

## The Five Questions

### 1. What is an Objective?

**Formal definition:**

An **Objective** is a persistent, verifiable statement about a desired system condition.

**Canonical schema:**
```javascript
{
  objective_id: "maintain_gateway_health",
  objective_type: "maintain_service_health",
  target_id: "openclaw-gateway",
  target_type: "service",
  
  desired_state: {
    service_active: true,
    health_endpoint_status: "healthy",
    response_time_ms: { max: 500 }
  },
  
  evaluation_interval: "30s",
  evaluation_method: "systemd_status_check",
  
  remediation_plan_id: "gateway_recovery_workflow",
  verification_strength: "service_health",
  
  priority: 100,
  status: "monitoring",
  
  metadata: {
    owner: "conductor",
    created_by: "operator",
    description: "Ensure gateway remains healthy"
  },
  
  created_at: "2026-03-13T00:00:00Z",
  updated_at: "2026-03-13T00:00:00Z",
  last_evaluated_at: null,
  last_violation_at: null
}
```

**Key characteristics:**

1. **Persistent** — Survives restarts, tracked in State Graph
2. **Verifiable** — Can be checked deterministically
3. **Actionable** — Links to specific remediation plan
4. **Bounded** — Evaluation interval prevents runaway checks
5. **Governed** — Remediation respects T1/T2 approval workflows

**What an Objective is NOT:**

- ❌ A task (tasks are one-time, objectives are persistent)
- ❌ An autonomous agent (objectives trigger plans, don't invent actions)
- ❌ A monitoring alert (objectives remediate, not just notify)
- ❌ A declarative spec (objectives are runtime constructs, not config)

---

### 2. Objective State Machine

Every objective has a deterministic lifecycle.

**States:**

```
declared        — Objective created, not yet active
monitoring      — Active, evaluating on schedule
healthy         — Last evaluation passed
violation       — Desired state not met
remediation     — Workflow triggered
verification    — Post-remediation check running
restored        — Violation resolved
failed          — Remediation failed, manual intervention required
blocked         — Policy prevented remediation
suspended       — Temporarily disabled
archived        — Permanently retired
```

**State transitions:**

```
declared → monitoring
monitoring → healthy (evaluation passed)
monitoring → violation (evaluation failed)
violation → remediation (plan triggered)
violation → blocked (policy denied)
remediation → verification (workflow completed)
verification → restored (verification passed)
verification → failed (verification failed)
restored → monitoring
failed → suspended (manual intervention required)
suspended → monitoring (manual resume)
any → archived (permanent retirement)
```

**Failure paths:**

```
violation → blocked          (policy denied remediation)
remediation → failed         (workflow execution failed)
verification → failed        (postconditions not met)
failed → suspended           (requires operator intervention)
```

**Enforcement:**

1. All transitions must be valid (invalid transitions rejected)
2. State changes emit ledger events
3. Timestamps recorded for all transitions
4. State Graph persists current state + full history

---

### 3. Objective Evaluation Loop

**Core engine architecture:**

```javascript
async function evaluationLoop() {
  const objectives = await stateGraph.listObjectives({ status: 'monitoring' });
  
  for (const objective of objectives) {
    // 1. Observe system state
    const observation = await observeSystemState(objective);
    
    // 2. Compare with desired state
    const evaluation = evaluateDesiredState(observation, objective.desired_state);
    
    // 3. Record evaluation
    await stateGraph.recordEvaluation({
      objective_id: objective.objective_id,
      evaluation_result: evaluation,
      observation_data: observation,
      timestamp: Date.now()
    });
    
    // 4. State transition
    if (evaluation.satisfied) {
      await transitionObjective(objective, 'healthy');
      await emitLedgerEvent('objective_stable', { objective_id: objective.objective_id });
    } else {
      await transitionObjective(objective, 'violation');
      await emitLedgerEvent('objective_violation_detected', {
        objective_id: objective.objective_id,
        violation_details: evaluation.violations
      });
      
      // 5. Trigger remediation
      await triggerRemediation(objective);
    }
  }
}
```

**Evaluation methods:**

1. **systemd_status_check** — `systemctl is-active <service>`
2. **http_health_check** — HTTP GET with expected status/body
3. **tcp_port_check** — TCP connection probe
4. **file_state_check** — File exists/contains/permissions
5. **state_graph_query** — Query State Graph for entity state
6. **custom_check** — Registered check handler

**Constraints:**

- ✅ Deterministic checks only (no LLM involvement)
- ✅ Bounded execution (timeout per check)
- ✅ Read-only observation (checks don't modify system)
- ✅ Evaluation results persisted to State Graph
- ✅ Failed checks don't crash the loop

**Scheduling:**

- Each objective defines `evaluation_interval` (default: 60s)
- Evaluation loop runs continuously
- Objectives evaluated on their schedule
- Missed evaluations logged, not backfilled

---

### 4. Integration With Phase 8

Objectives **reuse** the Phase 8 governance pipeline:

```
Objective violation detected
↓
Trigger remediation plan (existing Plan)
↓
Policy evaluation (existing Policy Engine)
↓
Warrant issuance (existing Warrant System)
↓
Execution graph (existing Phase 8.5)
↓
Verification (existing Phase 8.2)
↓
Outcome + Ledger (existing Phase 8.3)
```

**Integration point:** `ObjectiveTriggerBridge`

**Responsibilities:**
1. Map objective → plan_id
2. Generate intent from violation
3. Call existing plan execution pipeline
4. Track remediation workflow
5. Update objective state based on outcome

**Example:**

```javascript
async function triggerRemediation(objective) {
  // 1. Load remediation plan
  const plan = await stateGraph.getPlan(objective.remediation_plan_id);
  
  // 2. Generate intent
  const intent = {
    intent_type: 'objective_remediation',
    objective_id: objective.objective_id,
    target_id: objective.target_id,
    operation: 'restore_desired_state',
    triggered_by: 'objective_engine'
  };
  
  // 3. Execute via existing pipeline
  const result = await chatActionBridge.executePlan(plan, intent);
  
  // 4. Update objective state
  if (result.outcome.objective_achieved) {
    await transitionObjective(objective, 'restored');
  } else {
    await transitionObjective(objective, 'failed');
  }
  
  return result;
}
```

**Key principle:** Objectives do NOT bypass governance. They are just another plan initiator.

---

### 5. Ledger Events

**New event types:**

```javascript
// Objective lifecycle
'objective_declared'
'objective_activated'
'objective_suspended'
'objective_resumed'
'objective_archived'

// Evaluation loop
'objective_evaluation_started'
'objective_evaluation_completed'
'objective_stable'
'objective_violation_detected'

// Remediation
'objective_remediation_triggered'
'objective_remediation_started'
'objective_remediation_completed'
'objective_remediation_failed'

// Verification
'objective_verification_started'
'objective_verification_passed'
'objective_verification_failed'

// Outcomes
'objective_restored'
'objective_failed'
'objective_blocked'
```

**Event payload structure:**

```javascript
{
  event_id: "evt_...",
  event_type: "objective_violation_detected",
  execution_id: "exec_...",
  objective_id: "maintain_gateway_health",
  timestamp: "2026-03-13T00:00:00Z",
  
  payload: {
    target_id: "openclaw-gateway",
    violation_details: {
      desired: { service_active: true },
      observed: { service_active: false }
    },
    next_action: "trigger_remediation"
  },
  
  actor: "objective_engine",
  environment: "prod"
}
```

**Ledger integration:**

- All objective events written to `execution_ledger_events`
- Summary projection includes objective lifecycle
- Queryable by objective_id, target_id, status
- Rebuild capability preserves objective history

---

## Phase 9 Deliverables

### 9.1 — Objective Schema & State Machine

**Files:**
- `lib/core/objective-schema.js` — Canonical objective definition
- `lib/core/objective-state-machine.js` — State transitions + validation

**Tests:** 15+
- Schema validation (required fields, defaults, invalid configs)
- State machine transitions (valid, invalid, failure paths)
- State persistence (to/from State Graph)

---

### 9.2 — Evaluation Engine

**Files:**
- `lib/core/objective-evaluator.js` — System state observation
- `lib/core/evaluation-methods.js` — Registered check handlers

**Tests:** 15+
- Evaluation methods (systemd, HTTP, TCP, file, State Graph)
- Desired state comparison (satisfied, violations, partial)
- Bounded execution (timeout, error handling)

---

### 9.3 — Objective Engine

**Files:**
- `lib/core/objective-engine.js` — Evaluation loop + lifecycle management

**Tests:** 10+
- Evaluation loop (schedule, execution, state updates)
- Lifecycle transitions (monitoring → violation → remediation → restored)
- Failure handling (check timeout, remediation failure)

---

### 9.4 — Plan Trigger Integration

**Files:**
- `lib/core/objective-trigger-bridge.js` — Objective → Plan execution

**Tests:** 10+
- Remediation trigger (violation → plan → execution)
- Governance compliance (policy, warrant, approval)
- Outcome handling (success → restored, failure → failed)

---

### 9.5 — State Graph Extension

**Schema changes:**
```sql
CREATE TABLE objectives (
  objective_id TEXT PRIMARY KEY,
  objective_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  desired_state TEXT NOT NULL,
  evaluation_interval INTEGER NOT NULL,
  evaluation_method TEXT NOT NULL,
  remediation_plan_id TEXT,
  verification_strength TEXT,
  priority INTEGER DEFAULT 100,
  status TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_evaluated_at INTEGER,
  last_violation_at INTEGER
);

CREATE TABLE objective_evaluations (
  evaluation_id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL,
  evaluation_result TEXT NOT NULL,
  observation_data TEXT,
  violations TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (objective_id) REFERENCES objectives(objective_id)
);

CREATE TABLE objective_history (
  history_id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT,
  triggered_by TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (objective_id) REFERENCES objectives(objective_id)
);
```

**API methods:**
- `createObjective(objective)`
- `getObjective(objective_id)`
- `listObjectives(filters)`
- `updateObjectiveState(objective_id, new_state)`
- `recordEvaluation(evaluation)`
- `getEvaluationHistory(objective_id, limit)`
- `getObjectiveHistory(objective_id)`

**Tests:** 10+
- CRUD operations
- State transitions
- Evaluation history
- Query filters

---

### 9.6 — Ledger Event Integration

**Files:**
- `lib/state/state-graph.js` — Ledger event emission (updated)

**Tests:** 5+
- Objective lifecycle events emitted
- Event payload structure
- Ledger query by objective_id

---

## Test Coverage Estimate

**Total: 65+ tests**

- Schema & State Machine: 15
- Evaluation Engine: 15
- Objective Engine: 10
- Plan Trigger Integration: 10
- State Graph Extension: 10
- Ledger Integration: 5

**Acceptance criteria:** ≥90% coverage, all critical paths tested

---

## Implementation Order

**Suggested sequence to minimize integration churn:**

1. **9.1 — Schema & State Machine** (foundation)
2. **9.5 — State Graph Extension** (persistence layer)
3. **9.2 — Evaluation Engine** (observation logic)
4. **9.3 — Objective Engine** (evaluation loop)
5. **9.4 — Plan Trigger Integration** (remediation)
6. **9.6 — Ledger Events** (auditability)

**Rationale:** Build bottom-up (schema → storage → logic → integration)

---

## Scope Discipline

### What Phase 9 Includes

✅ Objective declaration and lifecycle management  
✅ Deterministic system state evaluation  
✅ Violation detection with bounded checks  
✅ Governed remediation workflow trigger  
✅ Post-remediation verification  
✅ Full ledger audit trail  
✅ State Graph persistence  
✅ Integration with Phase 8 governance pipeline  

### What Phase 9 Does NOT Include

❌ Autonomous planning (objectives trigger approved plans only)  
❌ AI decision loops (LLMs propose objectives, don't run the loop)  
❌ Speculative remediation (workflows triggered only on violation)  
❌ Distributed scheduling (single-node only)  
❌ Service mesh integration (OpenClaw endpoint only)  
❌ Real-time alerting (ledger only, no push notifications)  
❌ Objective composition (one objective = one target)  

---

## Success Criteria

**Phase 9 is complete when:**

1. ✅ Vienna can declare an objective
2. ✅ Objective engine monitors system state on schedule
3. ✅ Violations detected deterministically
4. ✅ Remediation workflows triggered via governance pipeline
5. ✅ Post-remediation verification executes
6. ✅ Objective restored to healthy on success
7. ✅ Full lifecycle recorded in ledger
8. ✅ ≥90% test coverage
9. ✅ Manual end-to-end test passes

**End-to-end test scenario:**

```
1. Declare objective: maintain_gateway_health
2. Stop gateway manually
3. Objective engine detects violation within evaluation_interval
4. Remediation workflow triggered (gateway_recovery_workflow)
5. Policy evaluation passes
6. Warrant issued
7. Execution graph runs
8. Verification checks service health
9. Objective restored to healthy
10. Full ledger timeline queryable
```

---

## Strategic Outcome

### Before Phase 9 (Phase 8)

Vienna executes governed workflows when instructed.

**Capability:** Task automation

### After Phase 9

Vienna monitors conditions and maintains desired state.

**Capability:** State-aware operational infrastructure

**This is the moment Vienna stops being "automation" and starts being "operations."**

---

## Risk Mitigation

### Risk 1: Agent Loop Drift

**Concern:** Evaluation loop becomes unbounded AI reasoning loop

**Mitigation:**
- Evaluation methods are deterministic (systemd, HTTP, TCP, file)
- No LLM involvement in evaluation
- Remediation limited to approved plans (no action invention)
- Timeout enforcement on all checks

### Risk 2: Runaway Remediation

**Concern:** Flapping services trigger infinite restart loops

**Mitigation:**
- Policy engine enforces rate limits
- Cooldown constraints prevent rapid retrigger
- Failed remediation → suspended state (manual intervention required)
- Ledger provides forensic trail

### Risk 3: Governance Bypass

**Concern:** Objectives circumvent T1/T2 approval workflows

**Mitigation:**
- Objectives use existing plan execution pipeline (no shortcuts)
- Policy evaluation runs before remediation
- Warrant required for T1/T2 actions
- No direct system access from objective engine

### Risk 4: Performance Degradation

**Concern:** Evaluation loop consumes excessive resources

**Mitigation:**
- Bounded check execution (timeout per evaluation)
- Evaluation interval prevents tight loops
- Read-only checks (no side effects)
- Failed checks logged, don't crash loop

---

## Future Extensions (Post-Phase 9)

**Not in scope for Phase 9, but natural next steps:**

1. **Objective Composition** — Multi-target objectives (e.g., "all services healthy")
2. **Distributed Objectives** — Multi-node coordination
3. **Real-Time Alerting** — Push notifications on violations
4. **Objective Templates** — Parameterized objective definitions
5. **SLO Integration** — Objective-based SLO tracking
6. **Dashboard UI** — Objective status visualization
7. **Objective API** — REST endpoints for objective management

---

## Approval

**RFC Status:** Draft  
**Review Required:** Metternich (governance implications), Talleyrand (architecture alignment)  
**Approval Authority:** Max Anderson (operator)

**Next Step:** Implement 9.1 (Objective Schema & State Machine)

---

**End of RFC**
