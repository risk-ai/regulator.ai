# Phase 8.5 Multi-Step Plan Execution — COMPLETE

**Status:** ✅ COMPLETE  
**Date:** 2026-03-12  
**Test Coverage:** 18/18 (100%)

---

## Overview

Phase 8.5 delivers **deterministic multi-step plan execution**, moving Vienna OS from single-action workflows to governed execution graphs with dependencies, conditional branching, retries, and failure handling.

**Core invariant implemented:**
> Each plan step is independently governable, observable, and ledgered, while the plan as a whole remains the policy-approved execution unit.

**Design constraint enforced:**
> Deterministic graph execution, NOT agent loop. Once a plan is approved, the execution engine runs a fixed graph with explicit conditions.

---

## What Was Built

### 1. Plan Step Schema (`plan-step-schema.js`)

**Components:**
- Step status enum (pending, ready, running, completed, failed, skipped, retrying, blocked)
- Failure strategy enum (abort, continue, retry, fallback, escalate)
- Plan step structure with:
  - Dependencies (`depends_on` array)
  - Conditional execution (always, if_failed, if_succeeded, custom)
  - Retry policies (max_attempts, delay_ms, backoff: fixed/linear/exponential)
  - Per-step verification specs
  - Failure handling strategies
  - Timeouts
- Step validation logic
- Gateway recovery canonical workflow builder

**Key features:**
- Each step independently configured
- Conditional execution based on prior step outcomes
- Custom expression evaluation for branching logic
- Retry with configurable backoff strategies
- Fallback step references
- Per-step timeout enforcement

### 2. Plan Execution Engine (`plan-execution-engine.js`)

**Components:**
- `PlanExecutionContext` — tracks state of multi-step execution
- `PlanExecutionEngine` — executes multi-step plans

**Capabilities:**
- Dependency resolution (steps execute only when dependencies satisfied)
- Conditional branching (if_succeeded, if_failed, custom expressions)
- Retry logic with backoff (fixed, linear, exponential)
- Failure handling (abort, continue, fallback, escalate)
- Step-level ledger events
- Plan-level outcome derivation
- Timeout enforcement per step
- Independent step verification

**Execution flow:**
```
For each step:
  1. Check dependencies satisfied → BLOCKED if not
  2. Evaluate condition → SKIPPED if not met
  3. Execute with retry → RUNNING/RETRYING
  4. Verify (if spec provided)
  5. Handle failure per strategy
  6. Emit ledger events
  7. Update step state

Derive plan outcome:
  - failed: any step FAILED
  - blocked: any step BLOCKED
  - success: all steps COMPLETED or SKIPPED
  - partial: otherwise
```

**Step-level ledger events:**
- `plan_execution_started`
- `plan_step_started`
- `plan_step_completed`
- `plan_step_failed`
- `plan_step_retried`
- `plan_step_skipped`
- `plan_execution_completed`
- `plan_execution_failed`

**Failure strategies:**
- **ABORT:** Stop plan execution immediately, throw error
- **CONTINUE:** Log failure, continue to next step
- **RETRY:** Already handled in retry loop
- **FALLBACK:** Execute fallback_step_id if specified
- **ESCALATE:** Log escalation event (incident creation)

### 3. Canonical Workflow — Gateway Recovery

**Workflow steps:**

1. **check_health** — Query service status
2. **restart_service** — Restart if unhealthy (conditional on check result)
3. **verify_health** — Verify service health after restart
4. **escalate_incident** — Create incident if verification fails

**Conditional logic:**
- restart_service only runs if check_health shows status ≠ 'active'
- verify_health only runs if restart_service succeeded
- escalate_incident only runs if verify_health failed

**Demonstrates:**
- Custom condition evaluation
- Conditional branching
- Service health checks
- Retry with backoff (restart_service: 2 attempts, 5s delay)
- Verification integration
- Escalation on failure

---

## Test Coverage

### Category A: Plan Step Schema (5/5)

- ✅ A1: Valid plan step creation
- ✅ A2: Invalid step validation (missing fields)
- ✅ A3: Invalid step (action required for action type)
- ✅ A4: Valid retry policy
- ✅ A5: Fallback step validation

### Category B: Plan Execution Context (5/5)

- ✅ B1: Context initialization
- ✅ B2: Dependency checking
- ✅ B3: Condition evaluation (if_succeeded)
- ✅ B4: Condition evaluation (if_failed)
- ✅ B5: Custom condition evaluation

### Category C: Plan Execution Engine (5/5)

- ✅ C1: Simple sequential execution
- ✅ C2: Conditional step skipping
- ✅ C3: Retry on failure
- ✅ C4: Abort on failure
- ✅ C5: Continue on failure

### Category D: Gateway Recovery Workflow (3/3)

- ✅ D1: Gateway recovery - service already healthy (restart skipped)
- ✅ D2: Gateway recovery - service unhealthy, restart succeeds
- ✅ D3: Gateway recovery - restart fails, downstream steps blocked

**Total: 18/18 (100%)**

---

## Acceptance Criteria

All acceptance criteria met:

- ✅ **Step ordering is deterministic** — Steps execute in step_order sequence
- ✅ **Dependencies work** — Steps block until dependencies satisfied
- ✅ **Conditional branches work** — if_succeeded, if_failed, custom expressions
- ✅ **Retries are controlled** — max_attempts, delay_ms, backoff strategies
- ✅ **Fallback/escalation steps work** — Failure strategies operational
- ✅ **Step-level ledger events are emitted** — 7 event types emitted
- ✅ **Plan-level outcome derives correctly** — success/failed/blocked/partial
- ✅ **Phase 8 regressions remain green** — No breaking changes to prior phases

---

## Architecture Guarantees

1. **Deterministic execution** — No LLM decides next step dynamically during execution
2. **Independent governance** — Each step independently observable and ledgered
3. **Policy-approved unit** — Plan as whole remains policy-approved execution unit
4. **Explicit conditions** — All branching logic is explicit, not inferred
5. **Bounded execution** — Timeouts enforce bounded execution per step
6. **Audit trail** — Full lifecycle preserved in ledger events

---

## Integration Points

### With Existing Components

**Plan Layer (8.1):**
- Multi-step plans extend single-action plans
- `plan.steps` array replaces single `plan.action`
- Plan schema backwards-compatible

**Verification Layer (8.2):**
- Per-step verification via `step.verification_spec`
- Verification results stored in step state
- Post-execution validation integrated

**Execution Ledger (8.3):**
- Step-level events append to ledger
- Plan-level events track overall execution
- Full timeline queryable

**Policy Engine (8.4):**
- Policy evaluation happens before plan execution
- Plan as whole is policy-approved unit
- Individual steps do not require separate policy evaluation

**State Graph:**
- Plan execution context queryable
- Step states persisted
- Execution log preserved

---

## Files Delivered

```
vienna-core/lib/core/
├── plan-step-schema.js              (new)
└── plan-execution-engine.js         (new)

vienna-core/
├── test-phase-8.5-multi-step.js     (new)
└── PHASE_8.5_COMPLETE.md            (this file)
```

---

## Usage Example

### Building a Multi-Step Plan

```javascript
const { buildGatewayRecoverySteps } = require('./lib/core/plan-step-schema');
const { PlanExecutionEngine } = require('./lib/core/plan-execution-engine');

// Build gateway recovery workflow
const steps = buildGatewayRecoverySteps('openclaw-gateway');

const plan = {
  plan_id: 'gateway_recovery_001',
  objective: 'Recover unhealthy gateway service',
  steps
};

// Execute multi-step plan
const engine = new PlanExecutionEngine({
  stateGraph,
  executor,
  verificationEngine
});

const result = await engine.executePlan(plan, {
  execution_id: 'exec_001',
  user: 'operator',
  session: 'session_123'
});

console.log(result);
// {
//   success: true,
//   plan_id: 'gateway_recovery_001',
//   outcome: 'success',
//   summary: {
//     plan_id: 'gateway_recovery_001',
//     total_steps: 4,
//     status_counts: { completed: 3, skipped: 1 },
//     steps: [...],
//     execution_log: [...]
//   }
// }
```

### Custom Workflow Example

```javascript
const { createPlanStep } = require('./lib/core/plan-step-schema');

const customSteps = [
  // Step 1: Collect evidence
  createPlanStep({
    step_id: 'collect_logs',
    step_order: 1,
    step_type: 'action',
    action: {
      action_id: 'collect_logs',
      entities: { service: 'app-server' },
      params: { since: '1h' }
    },
    timeout_ms: 30000
  }),

  // Step 2: Analyze (conditional on log collection success)
  createPlanStep({
    step_id: 'analyze_logs',
    step_order: 2,
    step_type: 'action',
    action: {
      action_id: 'run_analysis',
      entities: { service: 'app-server' },
      params: {}
    },
    depends_on: ['collect_logs'],
    condition: {
      type: 'if_succeeded',
      step_ref: 'collect_logs'
    },
    timeout_ms: 60000
  }),

  // Step 3: Notify operator
  createPlanStep({
    step_id: 'notify',
    step_order: 3,
    step_type: 'action',
    action: {
      action_id: 'send_notification',
      entities: { channel: 'ops' },
      params: { message: 'Analysis complete' }
    },
    depends_on: ['analyze_logs'],
    on_failure: FailureStrategy.CONTINUE,
    timeout_ms: 10000
  })
];

const customPlan = {
  plan_id: 'incident_analysis_001',
  objective: 'Analyze app server logs',
  steps: customSteps
};
```

---

## What This Enables

### Operational Workflows

- **Service recovery** — Check → restart → verify → escalate
- **Health monitoring** — Check → remediate → verify → report
- **Incident response** — Detect → collect evidence → analyze → notify
- **Deployment workflows** — Deploy → verify → rollback if failed
- **Backup/restore** — Backup → verify → cleanup old backups

### Complex Patterns

- **Conditional branching** — Different paths based on runtime conditions
- **Retry with backoff** — Transient failure handling
- **Fallback strategies** — Alternative execution paths
- **Circuit breakers** — Stop after N failures
- **Parallel steps** — (future) Execute independent steps concurrently

---

## Limitations & Future Work

### Current Limitations

1. **Sequential execution only** — Steps execute in step_order, no parallelism yet
2. **Simple dependency model** — Only "all dependencies completed" logic
3. **No dynamic step generation** — Steps must be defined up front
4. **No step cancellation** — Once started, step runs to completion or timeout
5. **No workflow pause/resume** — Plan executes to completion

### Future Enhancements

**Phase 8.6 — Parallel Execution:**
- Execute independent steps concurrently
- Wait-for-all / wait-for-any dependency modes
- Resource-aware scheduling

**Phase 8.7 — Advanced Dependencies:**
- Partial dependency satisfaction (N of M dependencies)
- Optional dependencies
- Dependency timeout handling

**Phase 8.8 — Workflow Control:**
- Pause/resume plan execution
- Cancel running steps
- Dynamic step injection
- Manual approval gates within workflows

**Phase 9 — Objective Orchestration:**
- Multi-plan orchestration
- Long-running objectives
- Periodic/scheduled workflows
- Event-driven plan triggering

---

## Migration Path

### From Single-Action Plans (8.1)

**Before (single action):**
```javascript
const plan = {
  plan_id: 'restart_001',
  objective: 'Restart gateway',
  action: {
    action_id: 'restart_service',
    entities: { service: 'openclaw-gateway' }
  }
};
```

**After (multi-step):**
```javascript
const plan = {
  plan_id: 'restart_001',
  objective: 'Restart gateway',
  steps: [
    createPlanStep({
      step_id: 'restart',
      step_order: 1,
      step_type: 'action',
      action: {
        action_id: 'restart_service',
        entities: { service: 'openclaw-gateway' }
      }
    })
  ]
};
```

**Backwards compatibility:**
- Single-action plans remain valid
- PlanExecutionEngine handles both formats
- Automatic conversion: single action → single-step plan

---

## Design Notes

### Why Not Agent Loop?

**Rejected approach:**
```
LLM decides next step → Execute → LLM decides next step → ...
```

**Problems:**
- Non-deterministic execution
- Expensive (LLM call per step)
- Harder to audit
- Approval ambiguity (approve plan or each step?)

**Chosen approach:**
```
Conductor builds plan → Policy approves plan → Deterministic execution
```

**Benefits:**
- Deterministic, repeatable execution
- Operator approves complete workflow up front
- Cheaper (no LLM during execution)
- Full audit trail
- Testable execution logic

### Why Per-Step Verification?

Allows different verification requirements per step:
- Restart step: check systemctl status
- File write step: check file exists
- API call step: check HTTP response
- Query step: no verification needed

### Why Step-Level Ledger Events?

Provides fine-grained execution visibility:
- Know exactly which step failed
- Understand retry behavior
- Debug conditional branching
- Measure step-level performance
- Support incident investigation

---

## Status

**Phase 8.5:** ✅ COMPLETE  
**Test Coverage:** 18/18 (100%)  
**Production Ready:** Yes  
**Breaking Changes:** None  
**Next Phase:** 9.x Objective Orchestration

Vienna OS now has complete multi-step execution capability with deterministic graph execution, retry handling, conditional branching, and step-level observability.

**The governance spine is complete. Multi-step workflows are operational.**
