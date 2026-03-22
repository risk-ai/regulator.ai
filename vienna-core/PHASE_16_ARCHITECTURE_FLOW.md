# Phase 16 — Assisted Autonomy Architecture Flow

**Date:** 2026-03-19  
**Status:** Production-ready deep implementation

---

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         OPERATOR SPACE                          │
│                                                                 │
│  Issue detected → Objective created (Phase 15 or manual)       │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT PROPOSAL FLOW                          │
│                                                                 │
│  AgentOrchestrator.proposeForObjective(agent_id, objective)    │
│                                                                 │
│  Step 1: Safety Checks                                         │
│  ├─ Agent exists?                                              │
│  ├─ Agent active? (not suspended/deprecated)                   │
│  ├─ Circuit breaker closed? (failure threshold check)          │
│  └─ Rate limit OK? (proposals < rate_limit_per_hour)           │
│                             │                                   │
│                             ↓                                   │
│  [IF ANY CHECK FAILS] → Return { status: 'rejected', reason }  │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENT PLANNING                         │
│                                                                 │
│  AgentProposalEngine.generatePlan(agent_id, objective, context)│
│                                                                 │
│  Step 2: Strategy Selection                                    │
│  ├─ Analyze objective type (service, system, endpoint)         │
│  ├─ Consider agent capabilities                                │
│  ├─ Evaluate context (has_recent_failures, complexity)         │
│  └─ Select strategy:                                           │
│      • investigate_then_restore (safe, default)                │
│      • immediate_restore (known failures)                      │
│      • escalate_only (T0 agents)                               │
│      • deep_analysis (complex issues)                          │
│                             │                                   │
│                             ↓                                   │
│  Step 3: Step Generation                                       │
│  ├─ For each step type in strategy:                           │
│  │   ├─ Create step from template (investigate, reconcile, etc)│
│  │   ├─ Assign dependencies (step N depends on step N-1)      │
│  │   ├─ Set risk tier (T0/T1/T2)                              │
│  │   └─ Add parameters                                        │
│  │                                                             │
│  ├─ Assess plan risk:                                          │
│  │   ├─ Max risk tier across all steps                        │
│  │   ├─ Reversibility analysis                                │
│  │   └─ Impact assessment                                     │
│  │                                                             │
│  └─ Generate reasoning + expected outcomes                     │
│                             │                                   │
│                             ↓                                   │
│  Returns: AgentProposal with Plan                              │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CONSTRAINT VALIDATION                        │
│                                                                 │
│  ConstraintEvaluator.evaluate(agentProposal, agent)            │
│                                                                 │
│  Step 4: Pre-Governance Checks                                 │
│  ├─ Max steps: plan.steps.length ≤ agent.max_plan_steps       │
│  ├─ Risk level: plan max risk ≤ agent.risk_level              │
│  ├─ Allowed actions: all step actions in allowed_intent_types │
│  └─ Safe mode: if active, only T0 investigate/escalate        │
│                             │                                   │
│                             ↓                                   │
│  [IF VIOLATIONS] → Return { allowed: false, violations: [...] }│
│                  → Record failure (circuit breaker)            │
│                  → Return { status: 'constraint_violation' }   │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PROPOSAL TRANSLATION                         │
│                                                                 │
│  PlanTranslator.translate(agentProposal, strategy='composite') │
│                                                                 │
│  Step 5: Phase 15 Proposal Creation                            │
│  ├─ Build composite suggested_intent:                          │
│  │   ├─ action: 'execute_plan'                                │
│  │   ├─ plan_id: plan.plan_id                                 │
│  │   ├─ steps: plan.steps (full array)                        │
│  │   ├─ risk_tier: max risk across steps                      │
│  │   └─ metadata: { agent_id, agent_proposal_id, is_multi_step }│
│  │                                                             │
│  ├─ Create Phase 15 proposal object                            │
│  │   ├─ proposal_type: inferred (investigate, restore, etc)   │
│  │   ├─ suggested_intent: composite intent                    │
│  │   ├─ rationale: plan.reasoning                             │
│  │   ├─ risk_assessment: plan.risk_assessment                 │
│  │   └─ status: 'pending'                                     │
│  │                                                             │
│  └─ Persist to State Graph                                     │
│      stateGraph.createProposal(proposal)                       │
│                             │                                   │
│                             ↓                                   │
│  Returns: Proposal (persisted)                                 │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         TRACE EMISSION                          │
│                                                                 │
│  AgentOrchestrator.emitTrace(event_type, payload)              │
│                                                                 │
│  Step 6: Audit Trail                                           │
│  ├─ agent.plan_generated                                       │
│  ├─ agent.constraint_evaluated                                 │
│  └─ agent.agent_proposal_created                               │
│                             │                                   │
│  → stateGraph.appendLedgerEvent() (Phase 8.3 integration)      │
│                             │                                   │
│                             ↓                                   │
│  Record success (circuit breaker reset)                        │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATOR REVIEW SPACE                        │
│                                                                 │
│  Phase 15 Proposal System                                      │
│  ├─ Proposal visible in operator UI                            │
│  ├─ Status: 'pending'                                          │
│  ├─ Plan visible: steps, dependencies, risk, reasoning         │
│  │                                                             │
│  Operator Actions:                                             │
│  ├─ Approve → status = 'approved'                             │
│  ├─ Reject → status = 'rejected'                              │
│  └─ Modify → edit proposal → approve                          │
│                             │                                   │
│                             ↓                                   │
│  [IF APPROVED]                                                 │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PLAN EXECUTION ENGINE                        │
│                                                                 │
│  PlanExecutor.execute(plan, context)                           │
│                                                                 │
│  Step 7: Dependency Ordering                                   │
│  ├─ Build adjacency list from step dependencies               │
│  ├─ Calculate in-degrees                                       │
│  ├─ Topological sort (Kahn's algorithm)                       │
│  ├─ Detect circular dependencies                              │
│  └─ Returns: ordered step IDs                                  │
│                             │                                   │
│                             ↓                                   │
│  Step 8: Per-Step Execution                                    │
│  For each step in execution order:                             │
│  │                                                             │
│  ├─ Check dependencies satisfied                               │
│  │   → If not: mark 'blocked', skip                           │
│  │                                                             │
│  ├─ Decompose step → intent object                            │
│  │                                                             │
│  ├─ PlanExecutor.executeStep(intent, plan, context)           │
│  │   │                                                         │
│  │   ├─ governancePipeline.evaluateIntent(intent, context)    │
│  │   │   ├─ Policy evaluation (Phase 8.4)                     │
│  │   │   ├─ Warrant issuance (Phase 8)                        │
│  │   │   ├─ Admission control                                 │
│  │   │   └─ Returns: { approved: true/false, ... }            │
│  │   │                                                         │
│  │   └─ [IF APPROVED] → Execute via Vienna Core               │
│  │                                                             │
│  ├─ Record result in execution log                            │
│  │   ├─ step_id                                               │
│  │   ├─ status: 'completed' | 'failed' | 'blocked'           │
│  │   ├─ result                                                │
│  │   └─ timestamp                                             │
│  │                                                             │
│  └─ [IF FAILED] → Stop execution, return failure              │
│                                                                 │
│  Returns: { status, completed_steps, execution_log }          │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                        SYSTEM EXECUTION                         │
│                                                                 │
│  Vienna Core Executor                                          │
│  ├─ Execute action per intent                                  │
│  ├─ Capture result                                             │
│  └─ Return to PlanExecutor                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Safety Control Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER FLOW                         │
│                                                                 │
│  On proposal success:                                          │
│    AgentRegistry.recordSuccess(agent_id)                       │
│    └─ Reset failure counter to 0                              │
│                                                                 │
│  On proposal failure (constraint violation, error):            │
│    AgentRegistry.recordFailure(agent_id)                       │
│    ├─ Increment failure counter                               │
│    ├─ Set last_failure timestamp                              │
│    └─ Check threshold:                                         │
│        IF failures >= 5:                                       │
│          ├─ Set circuit breaker status = 'open'               │
│          ├─ Auto-suspend agent                                │
│          └─ Set cooldown (30 minutes)                         │
│                                                                 │
│  On canPropose check:                                          │
│    getCircuitBreakerStatus(agent_id)                           │
│    ├─ Check if cooldown expired                               │
│    │   → IF yes: reset failures, status = 'closed'            │
│    │   → IF no:  return { open: true, reason: ... }           │
│    └─ Reject proposal if circuit open                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      RATE LIMIT FLOW                            │
│                                                                 │
│  On canPropose check:                                          │
│    AgentRegistry.getRecentProposalCount(agent_id, hours=1)     │
│    ├─ Query State Graph:                                       │
│    │   SELECT COUNT(*) FROM agent_proposals                    │
│    │   WHERE agent_id = ? AND created_at > ?                   │
│    │                                                             │
│    ├─ Compare to agent.rate_limit_per_hour                     │
│    │                                                             │
│    └─ IF count >= limit:                                       │
│          Return { allowed: false, reason: 'Rate limit exceeded' }│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Entities Through System)

```
Objective
  ↓
AgentProposal (agent-generated)
  ├─ agent_id
  ├─ agent_proposal_id
  └─ plan
      ├─ plan_id
      ├─ objective_id
      ├─ steps[]
      │   ├─ step_id
      │   ├─ action
      │   ├─ target_type, target_id
      │   ├─ risk_tier
      │   ├─ parameters
      │   └─ dependencies[]
      ├─ reasoning
      ├─ expected_outcomes[]
      └─ risk_assessment
  ↓
Phase 15 Proposal
  ├─ proposal_id
  ├─ proposal_type
  ├─ objective_id
  ├─ suggested_intent
  │   ├─ action: 'execute_plan'
  │   ├─ plan_id
  │   ├─ steps[] (full plan)
  │   └─ metadata: { agent_id, agent_proposal_id, is_multi_step }
  ├─ status: 'pending' | 'approved' | 'rejected'
  ├─ metadata: { agent_id, agent_proposal_id, plan_id, step_count }
  ↓
[OPERATOR REVIEW]
  ↓
Intent[] (per-step decomposition)
  ├─ intent_id
  ├─ action
  ├─ target_type, target_id
  ├─ risk_tier
  ├─ dependencies[]
  └─ metadata: { plan_id, step_id, step_index }
  ↓
[PER-STEP GOVERNANCE]
  ↓
Execution Results
  ├─ execution_log[]
  │   ├─ step_id
  │   ├─ status
  │   ├─ result
  │   └─ timestamp
  └─ status: 'completed' | 'failed'
```

---

## Architectural Boundaries (Enforcement Points)

```
┌────────────────────────────────────────────────────────────────┐
│  Boundary 1: Agent Cannot Execute                             │
│                                                                │
│  Enforcement:                                                  │
│  ✓ Agent class has no execute() method                        │
│  ✓ AgentProposalEngine returns proposals, not execution       │
│  ✓ PlanExecutor requires governance pipeline parameter        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Boundary 2: All Proposals Require Operator Review            │
│                                                                │
│  Enforcement:                                                  │
│  ✓ PlanTranslator creates proposals with status='pending'     │
│  ✓ Phase 15 system controls status transitions                │
│  ✓ PlanExecutor can only execute approved proposals           │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Boundary 3: Per-Step Governance Required                     │
│                                                                │
│  Enforcement:                                                  │
│  ✓ PlanExecutor.executeStep() calls governancePipeline        │
│  ✓ Each step decomposed into independent intent               │
│  ✓ No step executes without governance approval               │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Boundary 4: Constraints Validated Before Proposal            │
│                                                                │
│  Enforcement:                                                  │
│  ✓ ConstraintEvaluator runs before PlanTranslator             │
│  ✓ Violations prevent proposal persistence                    │
│  ✓ Invalid plans never reach operator review queue            │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Boundary 5: Circuit Breaker Enforcement                      │
│                                                                │
│  Enforcement:                                                  │
│  ✓ AgentOrchestrator checks circuit breaker before planning   │
│  ✓ AgentRegistry auto-suspends on threshold                   │
│  ✓ Suspended agents cannot propose                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Boundary 6: Complete Audit Trail                             │
│                                                                │
│  Enforcement:                                                  │
│  ✓ AgentOrchestrator.emitTrace() at all lifecycle points      │
│  ✓ Trace events append to execution_ledger_events             │
│  ✓ No proposal action without corresponding trace event       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Phase 15 Detection Layer
```
Phase 15 Anomaly Detection
  ↓
Create Objective
  ↓
AgentOrchestrator.proposeForObjective(agent_id, objective)
  ↓
Phase 15 Proposal (persisted)
  ↓
Operator Review (Phase 15 UI)
```

### Phase 9 Managed Objectives
```
Managed Objective (service health)
  ↓
AgentProposalEngine uses objective_id, target_type, desired_state
  ↓
Plan links to objective_id
  ↓
Phase 15 Proposal includes objective_id
```

### Phase 8 Governance Pipeline
```
PlanExecutor.executeStep(intent)
  ↓
governancePipeline.evaluateIntent(intent, context)
  ├─ Policy evaluation (Phase 8.4)
  ├─ Warrant issuance (Phase 8)
  └─ Admission control
  ↓
Execution (if approved)
```

### Phase 8.3 Execution Ledger
```
AgentOrchestrator.emitTrace(event_type, payload)
  ↓
stateGraph.appendLedgerEvent({
  event_type: 'agent.agent_proposal_created',
  agent_id,
  objective_id,
  plan_id,
  proposal_id,
  timestamp,
  payload
})
  ↓
execution_ledger_events table (Phase 8.3)
```

---

## Dependency Graph

```
Objective
  ↓
AgentProposal
  ↓
Plan
  ├─ Step 0 (no dependencies)
  ├─ Step 1 (depends on Step 0)
  └─ Step 2 (depends on Step 1)
  ↓
Topological Sort
  → [Step 0, Step 1, Step 2]
  ↓
Sequential Execution
  Step 0 completes
    → Step 1 executes
      → Step 2 executes
```

**Circular Dependency Detection:**
```
Plan with invalid dependencies:
  Step A depends on Step B
  Step B depends on Step A

PlanExecutor.validateDependencies()
  → Topological sort fails
  → Throws: "Circular dependencies detected in plan"
```

---

## Error Handling Flow

```
Agent proposes
  ↓
[Agent not found]
  → Return { status: 'rejected', reason: 'Agent not found' }

[Agent suspended]
  → Return { status: 'rejected', reason: 'Agent status is suspended' }

[Circuit breaker open]
  → Return { status: 'rejected', reason: 'Circuit breaker open: ...' }

[Rate limit exceeded]
  → Return { status: 'rejected', reason: 'Rate limit exceeded' }

[Plan generation error]
  → Catch error
  → Record failure (circuit breaker)
  → Return { status: 'error', error: error.message }

[Constraint violations]
  → Record failure (circuit breaker)
  → Return { status: 'constraint_violation', violations: [...] }

[Proposal persistence error]
  → Catch error
  → Record failure (circuit breaker)
  → Return { status: 'error', error: error.message }

[Step execution failure]
  → Record in execution_log with status='failed'
  → Stop plan execution
  → Return { status: 'failed', failed_at_step, execution_log }
```

---

## State Transitions

### Agent State Machine
```
active
  ↓ [manual suspend OR circuit breaker threshold]
suspended
  ↓ [manual activate OR cooldown expired]
active
  ↓ [manual deprecate]
deprecated (terminal)
```

### Circuit Breaker State Machine
```
closed (failures < 5)
  ↓ [failure recorded, failures >= 5]
open (cooldown active)
  ↓ [cooldown expired]
closed (failures reset to 0)
```

### Proposal Status (Phase 15)
```
pending
  ↓ [operator approval]
approved
  ↓ [execution starts]
executing
  ↓ [execution completes]
executed

OR

pending
  ↓ [operator rejection]
rejected
```

---

## Query Patterns

### Find Agent Proposals for Objective
```sql
SELECT * FROM agent_proposals
WHERE objective_id = ?
ORDER BY created_at DESC;
```

### Check Rate Limit
```sql
SELECT COUNT(*) as count FROM agent_proposals
WHERE agent_id = ? AND created_at > ?;
```

### Get Plan by ID
```sql
SELECT * FROM plans WHERE plan_id = ?;
```

### Get Execution History for Plan
```sql
SELECT * FROM plan_execution_log
WHERE plan_id = ?
ORDER BY timestamp ASC;
```

### Find Failed Proposals (Circuit Breaker Context)
```sql
SELECT * FROM agent_proposals
WHERE agent_id = ? AND status = 'constraint_violation'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Component Responsibilities

### AgentOrchestrator
- ✅ Safety checks (status, circuit breaker, rate limit)
- ✅ Lifecycle orchestration (plan → constraint → translate → trace)
- ✅ Error handling
- ✅ Trace emission
- ❌ Does NOT execute
- ❌ Does NOT approve

### AgentProposalEngine
- ✅ Strategy selection
- ✅ Plan generation
- ✅ Risk assessment
- ✅ Reasoning generation
- ❌ Does NOT validate constraints
- ❌ Does NOT execute

### ConstraintEvaluator
- ✅ Pre-governance validation
- ✅ Violation detection
- ❌ Does NOT enforce governance (only validates before)

### PlanTranslator
- ✅ Plan → Phase 15 proposal translation
- ✅ Proposal persistence
- ❌ Does NOT modify plans
- ❌ Does NOT approve

### PlanExecutor
- ✅ Dependency ordering
- ✅ Per-step governance invocation
- ✅ Execution orchestration
- ❌ Does NOT approve steps (governance does)
- ❌ Does NOT execute directly (Vienna Core does)

### AgentRegistry
- ✅ Agent registration/retrieval
- ✅ Circuit breaker tracking
- ✅ Rate limit queries
- ✅ Auto-suspension
- ❌ Does NOT make approval decisions

---

**This architecture ensures:**
- Agents propose only (no execution authority)
- All proposals require operator review
- Per-step governance is enforced
- Circuit breakers prevent runaway failures
- Complete audit trail is maintained
- Zero bypass paths exist
