# Phase 16.1 — Hardening & Integration Work Plan

**Status:** IN PROGRESS  
**Date:** 2026-03-19  
**Goal:** Solidify execution core. Make Phase 15 + 16 real in the system.

---

## Mission

**NOT expanding features. Tightening what exists.**

Connect agent proposals to actual governed execution pipeline.  
Eliminate all stubs. Prove end-to-end under real conditions.

---

## Current Architecture Map (Discovered)

### Phase 11 — Intent Gateway (Canonical Entry Point)
**File:** `lib/core/intent-gateway.js`

**Flow:**
```
Intent submitted
  → validate
  → normalize
  → resolve (dispatch to handler)
  → trace (Phase 11.5 integration)
```

**Supported intent types:**
- `restore_objective` → ReconciliationGate → governance
- `investigate_objective` → Read-only queries
- `set_safe_mode` → Safe mode toggle

**Key discovery:** Intent Gateway is the canonical entry for ALL actions.

---

### Phase 10 — Reconciliation Control Plane
**Files:**
- `lib/core/reconciliation-gate.js` — Admission control
- `lib/core/reconciliation-state-machine.js` — State transitions
- `lib/core/remediation-trigger-integrated.js` — Execution trigger

**Flow:**
```
ReconciliationGate.requestAdmission(objective_id)
  → Check safe mode
  → Check reconciliation_status (single-flight enforcement)
  → Check cooldown
  → Check degraded state
  → Grant admission (generation++)
  → Return { admitted: true, generation }
```

**Critical boundary:** Gate decides admission, does NOT execute.

---

### Governance Pipeline (Existing Infrastructure)

**Located:**
- `lib/governance/warrant.js` — Warrant issuance/validation
- `lib/governance/risk-tier.js` — Risk classification
- `lib/governance/trading-guard.js` — Trading safety
- `lib/core/policy-engine.js` — Policy evaluation

**Execution ledger:**
- `lib/state/schema.sql` — execution_ledger_events table
- `lib/core/intent-tracing.js` — Phase 11.5 trace integration

---

## Problem Statement

**Phase 16 currently:**
- Generates plans ✅
- Creates Phase 15 proposals ✅
- Has governance hooks ⚠️ BUT STUBBED

**Phase 16 does NOT:**
- ❌ Connect to ReconciliationGate for admission
- ❌ Flow through real policy evaluation
- ❌ Issue warrants for execution
- ❌ Persist traces to ledger (console only)
- ❌ Handle real execution failures with audit trail

**Gap:** Plans exist, but execution path is simulated.

---

## Phase 16.1 Tasks

### Task 1: Connect PlanExecutor to Governance Pipeline ⏳

**Current state:**
```javascript
// plan-model.js
async executeStep(intent, plan, context) {
  if (!this.governancePipeline) {
    return { status: 'completed', note: 'Stub: Governance pipeline not configured' };
  }
  
  const result = await this.governancePipeline.evaluateIntent(intent, context);
  return { status: result.approved ? 'completed' : 'denied' };
}
```

**Target state:**
```javascript
async executeStep(intent, plan, context) {
  // 1. Submit via Intent Gateway (canonical entry)
  const intentGateway = new IntentGateway(this.stateGraph);
  
  // 2. Convert plan step → intent
  const gatewayIntent = {
    intent_type: this.mapActionToIntentType(intent.action),
    source: { type: 'agent', id: context.agent_id },
    payload: {
      objective_id: plan.objective_id,
      ...intent.parameters
    }
  };
  
  // 3. Submit through governance
  const response = await intentGateway.submitIntent(gatewayIntent);
  
  // 4. Return governed result
  return {
    status: response.accepted ? 'completed' : 'denied',
    intent_id: response.intent_id,
    governance_result: response
  };
}
```

**Action items:**
1. Add IntentGateway integration to PlanExecutor
2. Implement action → intent_type mapping
3. Pass agent context through execution
4. Validate intent_id linkage in traces
5. Test per-step governance rejection

**Exit criteria:**
- ✅ Each plan step submits via IntentGateway
- ✅ ReconciliationGate admission logged
- ✅ Policy evaluation occurs per step
- ✅ Denied steps stop plan execution
- ✅ Trace events link intent_id → execution_id

---

### Task 2: Objective System Linkage Validation ⏳

**Current state:**
- Plans reference objective_id
- Phase 15 proposals include objective_id
- Full chain untested

**Target state:**
- Anomaly → Objective → Plan → Proposal → Intent → Execution (proven)

**Action items:**
1. Create test objective via Phase 15 detection
2. Trigger agent proposal from objective
3. Approve proposal
4. Execute plan
5. Verify objective state transitions

**Test flow:**
```
1. Anomaly detected (service degraded)
2. Phase 15 creates managed_objective
3. AgentOrchestrator.proposeForObjective(agent_id, objective)
4. Plan generated → Phase 15 proposal
5. Operator approves proposal
6. PlanExecutor submits intents
7. IntentGateway → ReconciliationGate
8. Objective transitions: idle → reconciling → restored
```

**Exit criteria:**
- ✅ Objective created from anomaly
- ✅ Agent proposal triggered by objective
- ✅ Plan execution updates objective state
- ✅ Objective history recorded
- ✅ No broken links in chain

---

### Task 3: Trace → Ledger Persistence ⏳

**Current state:**
```javascript
// agent-orchestrator.js
async emitTrace(event_type, payload) {
  if (!this.stateGraph) {
    console.log(`[AgentOrchestrator] Trace: ${event_type}`, payload);
    return;
  }
  
  await this.stateGraph.appendLedgerEvent({
    event_type: `agent.${event_type}`,
    // ERROR: Missing required field: execution_id
  });
}
```

**Problem:** execution_id not available at proposal time.

**Solution:** Use intent_id as execution context.

**Target state:**
```javascript
async emitTrace(event_type, payload) {
  const ledgerEvent = {
    execution_id: payload.intent_id || payload.proposal_id || `trace-${Date.now()}`,
    event_type: `agent.${event_type}`,
    stage: this._mapEventToStage(event_type),
    actor_type: 'agent',
    actor_id: payload.agent_id,
    event_timestamp: payload.timestamp || new Date().toISOString(),
    objective: payload.objective_id || null,
    payload_json: payload
  };
  
  await this.stateGraph.appendLedgerEvent(ledgerEvent);
}
```

**Action items:**
1. Fix execution_id generation in emitTrace()
2. Add stage mapping (planning, policy, execution, etc.)
3. Verify ledger persistence
4. Test ledger queries
5. Link agent events to intent traces

**Exit criteria:**
- ✅ All agent lifecycle events durable in ledger
- ✅ Queryable by objective_id, agent_id, intent_id
- ✅ No console-only traces
- ✅ Full audit trail reconstructable

---

### Task 4: Failure Handling Hardening ⏳

**Current state:**
```javascript
// plan-model.js
if (stepResult.status === 'failed') {
  return {
    plan_id: plan.plan_id,
    status: 'failed',
    failed_at_step: stepId,
    execution_log: executionLog,
    error: stepResult.error
  };
}
```

**Problem:** No trace emission on failure path.

**Target state:**
```javascript
if (stepResult.status === 'failed') {
  // Emit failure trace
  await this.stateGraph.appendLedgerEvent({
    execution_id: plan.plan_id,
    event_type: 'plan.step_failed',
    stage: 'execution',
    actor_type: 'system',
    actor_id: 'plan-executor',
    event_timestamp: new Date().toISOString(),
    objective: plan.objective_id,
    payload_json: {
      plan_id: plan.plan_id,
      step_id: stepId,
      step_index: executionLog.length,
      error: stepResult.error,
      completed_steps: Array.from(completedSteps)
    }
  });
  
  // Stop execution (no silent continuation)
  return {
    plan_id: plan.plan_id,
    status: 'failed',
    failed_at_step: stepId,
    completed_steps: Array.from(completedSteps),
    execution_log: executionLog,
    error: stepResult.error
  };
}
```

**Action items:**
1. Add failure trace emission
2. Test partial plan failure
3. Verify no silent continuation
4. Document rollback semantics
5. Test circuit breaker on execution failures

**Exit criteria:**
- ✅ Failed steps emit trace events
- ✅ Plan execution stops on first failure
- ✅ Audit trail shows failure reason
- ✅ Circuit breaker triggered by real execution failures
- ✅ No partial execution without audit

---

### Task 5: Safety System Real-World Validation ⏳

**Current state:**
- Circuit breaker tested with simulated failures
- Rate limiting tested with mock proposal counts
- Governance rejection untested

**Target state:**
- All safety systems proven under real execution

**Test scenarios:**

**5.1: Circuit Breaker Under Real Failures**
```
1. Agent proposes plan
2. Step 1 fails (governance denial)
3. recordFailure() called
4. Repeat 5 times
5. Verify circuit opens
6. Verify auto-suspension
7. Verify proposals rejected
```

**5.2: Rate Limiting Under Burst**
```
1. Agent proposes 10 plans in 1 minute
2. Verify first N pass (rate_limit_per_hour)
3. Verify remaining rejected
4. Verify rate limit reason logged
```

**5.3: Governance Rejection Scenarios**
```
1. Safe mode active → plan rejected
2. Cooldown active → plan rejected
3. Already reconciling → plan rejected
4. Policy denial → step rejected
5. Verify all rejection reasons logged
```

**Action items:**
1. Create real failure injection test
2. Test circuit breaker with governance denials
3. Test rate limiting with State Graph queries
4. Document observed behavior
5. Validate trace completeness

**Exit criteria:**
- ✅ Circuit breaker opens on real execution failures
- ✅ Rate limiting enforced under burst load
- ✅ All governance rejections logged
- ✅ Safety systems behavior documented
- ✅ No silent failures

---

## Implementation Order

**Week 1 (Mar 19-21):**
1. Task 3: Trace persistence (foundation)
2. Task 1: Governance integration (critical path)
3. Task 4: Failure handling (safety)

**Week 2 (Mar 22-26):**
4. Task 2: Objective linkage (end-to-end validation)
5. Task 5: Real-world safety testing (proof)

---

## Exit Criteria (Phase 16.1 HARDENED)

**Must prove:**
- ✅ Plans execute through real governance pipeline (not stubbed)
- ✅ Each step flows through IntentGateway → ReconciliationGate → policy
- ✅ Trace events durable in execution_ledger_events
- ✅ Objective state transitions on plan execution
- ✅ Failures stop execution with audit trail
- ✅ Circuit breaker operational under real conditions
- ✅ Rate limiting enforced via State Graph
- ✅ All governance rejections logged

**Deliverable:** "Phase 16 HARDENED" report with:
- Confirmation governance is real (not stubbed)
- Proof of end-to-end flow using actual execution
- Trace persistence verification
- Failure handling behavior documentation
- Any remaining weak points identified

---

## Non-Goals (Explicit)

**DO NOT:**
- ❌ Expand dashboard
- ❌ Add UI features
- ❌ Implement new agent capabilities
- ❌ Improve intelligence/strategy
- ❌ Add new intent types
- ❌ Build operator controls beyond Phase 11

**ONLY:**
- ✅ Connect existing components
- ✅ Eliminate stubs
- ✅ Prove under real conditions
- ✅ Harden failure paths
- ✅ Document behavior

---

## Guiding Principle

> **We are no longer building capability.**  
> **We are making the system real, reliable, and enforceable under actual execution conditions.**

---

**Next:** Begin Task 3 (Trace persistence) — Foundation for all other work.
