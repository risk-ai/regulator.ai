# Vienna Runtime Architecture

**Last Updated:** 2026-03-14 00:58 EDT  
**Purpose:** Complete architecture reference for Vienna OS governed execution layer

---

## Core Principle

```
AI explains
Runtime executes
Operator approves
```

Vienna OS is a **governed AI operating system layer** above OpenClaw. AI agents cannot execute system commands directly—all actions must pass through Vienna's governed execution pipeline with operator approval.

---

## Architecture Overview

```
Operator / Agent / System
  ↓
Vienna OS (orchestrator + governance + memory)
  ↓
Vienna Runtime
  ├── State Graph (persistent memory)
  ├── Endpoint Manager (local + remote execution)
  ├── Chat Action Bridge (operator commands)
  ├── OpenClaw Bridge (remote instructions)
  ├── Executor (governed execution)
  ├── Provider Routing (Anthropic + Ollama fallback)
  ├── Recovery Copilot
  └── Workflow Engine
  ↓
Governed Execution Pipeline
Intent → Plan → Policy → Warrant → Execution → Verification → Outcome → Ledger
  ├── Warrant System (T0/T1/T2 authorization)
  ├── Policy Engine (constraint-based governance)
  ├── Trading Guard (trading safety enforcement)
  ├── Verification Engine (post-execution validation)
  └── Audit Trail (immutable ledger)
  ↓
System (services, cron jobs)
```

---

## Governed Execution Pipeline

### Stage 1: Intent

**What:** Natural language or structured request for system action

**Source:**
- Operator (via chat)
- Agent (via subagent)
- System (via evaluation loop)

**Examples:**
- "restart openclaw-gateway"
- "show status"
- "ask openclaw what services are running"

**Output:** IntentObject with classification + entities

---

### Stage 2: Plan

**What:** Intent → Workflow transformation

**Process:**
1. Intent classified (informational, executable, multi-step)
2. Entities extracted (service names, timeframes, operations)
3. Normalized to canonical actions
4. Workflow steps generated
5. Verification steps defined
6. Risk tier assigned (T0/T1/T2)

**Output:** Plan object with:
- Objective (what we're trying to achieve)
- Steps (ordered actions)
- Preconditions (what must be true)
- Postconditions (what should be true after)
- Verification spec (how to verify success)
- Risk tier (T0/T1/T2)

**Persistence:** `plans` table in State Graph

---

### Stage 3: Policy

**What:** Constraint evaluation before execution

**Process:**
1. Query applicable policies for action
2. Evaluate constraints (time_window, service_status, rate_limit, cooldown, etc.)
3. Determine admission (allow/deny)
4. Record policy decision

**Constraint types:**
- **time_window** — Restrict to specific hours
- **service_status** — Check health before action
- **rate_limit** — Limit executions per time window
- **cooldown** — Enforce minimum time between actions
- **approval_required** — Force T1/T2 workflow
- **blocked_entity** — Block specific services
- **max_concurrent** — Limit parallel executions
- **ledger_condition** — Query execution history
- **custom_check** — Custom validation
- **state_graph_query** — Query runtime state

**Output:** PolicyDecision (allow/deny + reasons)

**Persistence:** `policy_decisions` table

---

### Stage 4: Warrant

**What:** Authorization token binding truth + plan + approval

**Process:**
1. Risk tier classification (T0/T1/T2)
2. Truth snapshot (source-of-truth at planning time)
3. Approval gate (if T1/T2)
4. Warrant issuance

**Risk Tiers:**
- **T0** (reversible, low-stakes) — No warrant required, execute immediately
- **T1** (moderate stakes) — Warrant required, operator approval optional
- **T2** (irreversible, high-stakes) — Warrant + Metternich approval REQUIRED

**Output:** Warrant object (issued_by, valid_until, binds: truth + plan + approval)

**Persistence:** Warrant metadata in execution ledger

---

### Stage 5: Execution

**What:** Deterministic action execution through adapters

**Process:**
1. Warrant validation
2. Precondition checks
3. Adapter dispatch
4. Execution monitoring
5. Result capture

**Adapters:**
- **State Graph Adapter** — Database writes
- **File Adapter** — File operations
- **Service Adapter** — systemctl actions
- **Shell Adapter** — Command execution (restricted)
- **ChatAction Adapter** — Operator chat commands
- **OpenClaw Adapter** — Remote instructions

**Execution Boundaries:**
- Agents propose (text output only)
- Vienna executes (through adapters)
- Adapters have privileges (fs, child_process)
- No bypass path exists

**Output:** ExecutionResult (success/failure + evidence)

**Persistence:** `execution_ledger_events` (append-only)

---

### Stage 6: Verification

**What:** Independent post-execution validation

**Process:**
1. Build VerificationTask from plan.verification_spec
2. Execute independent checks (systemctl, TCP, HTTP, file checks)
3. Compare observed state vs. expected state
4. Determine objective_achieved (true/false/unknown)

**Core Principle:**
> Execution tells you what the system **tried**.  
> Verification tells you what became **true**.

**Three-Layer Separation:**
1. **ExecutionResult** — What executor reports
2. **VerificationResult** — What verifier observes (independent)
3. **WorkflowOutcome** — Final conclusion (derived from both)

**Verification Handlers:**
- **systemd_active** — Service status via systemctl
- **tcp_port_open** — Network probe
- **http_healthcheck** — HTTP GET
- **file_exists** / **file_contains** — Filesystem checks

**Output:** VerificationResult + WorkflowOutcome

**Persistence:** `verifications` + `workflow_outcomes` tables

---

### Stage 7: Outcome

**What:** Final workflow conclusion

**Process:**
1. Combine ExecutionResult + VerificationResult
2. Derive final status (success/failure/partial)
3. Generate operator summary
4. Update plan status
5. Trigger objective state transitions (if applicable)

**Output:** WorkflowOutcome (objective_achieved, summary, evidence)

---

### Stage 8: Ledger

**What:** Immutable forensic record

**Process:**
1. Append lifecycle events (intent, plan, policy, approval, execution, verification, outcome)
2. Project events into summary (derived, rebuildable)
3. Record metadata (timestamps, actors, evidence)

**Event Types (15):**
- Intent: `intent_received`, `intent_classified`
- Plan: `plan_created`
- Policy: `policy_evaluated_requires_approval`
- Approval: `approval_requested`, `approval_granted`, `approval_denied`
- Execution: `execution_started`, `execution_completed`, `execution_failed`
- Verification: `verification_started`, `verification_completed`, `verification_failed`, `verification_inconclusive`, `verification_skipped`
- Outcome: `workflow_outcome_finalized`

**Architecture:**
- **Events** = Append-only source of truth
- **Summary** = Derived projection (query convenience)
- **Rebuild** = Summary can be deleted and reconstructed from events

**Persistence:** `execution_ledger_events` + `execution_ledger_summary`

---

## Reconciliation Control Plane (Phase 10)

### Purpose

**Autonomous drift detection + governed remediation**

**Core Principle:**
> Drift is no longer permission to act. Only the gate may authorize reconciliation.

---

### Components

**1. Reconciliation State Machine**

**States:**
- `idle` — No drift detected
- `reconciling` — Active remediation in progress
- `cooldown` — Failure, retries available
- `degraded` — Attempts exhausted, manual intervention required
- `safe_mode` — Operator/system override, no autonomous action

**Transitions:**
- `idle` → `reconciling` (drift detected, gate admits)
- `reconciling` → `idle` (verification success)
- `reconciling` → `cooldown` (execution failed, retries available)
- `reconciling` → `degraded` (attempts exhausted)
- Any → `safe_mode` (operator/system intervention)

**2. Reconciliation Gate (Phase 10.1)**

**Purpose:** Admission control for reconciliation

**Invariants:**
1. No execution without admission
2. Single-flight enforcement (one active reconciliation per objective)
3. Generation tracking (stale protection)
4. Audit trail (all decisions ledgered)

**Admission Logic:**
```
if safe_mode → DENY (governance override)
if currently_reconciling → DENY (single-flight)
if in_cooldown → DENY (retry policy)
if degraded → DENY (manual reset required)
else → ADMIT (issue generation, set reconciling status)
```

**Output:** Generation number (monotonic counter)

**3. Failure Policy (Phase 10.2)**

**Purpose:** Bounded retry with circuit breaker

**Policy:**
- **Max consecutive failures:** 3 (default)
- **Cooldown duration:** 300s (default)
- **Cooldown behavior:** Exponential backoff (optional)

**Invariants:**
1. Failure is not permission to retry
2. Only policy may authorize retry
3. Attempts exhausted → degraded (manual reset required)

**4. Execution Timeouts (Phase 10.3)**

**Purpose:** Bounded execution authority in time

**Mechanism:**
- **Admission** → Execution lease granted
- **Lease** → Deadline timestamp (started_at + timeout)
- **Watchdog** → Deterministic timeout enforcement
- **Stale protection** → Late completions cannot rewrite control state

**Invariants:**
1. Admission grants bounded authority in time
2. Deadline is deterministic (started_at + timeout)
3. Watchdog transitions expired objectives
4. Late completions ignored (generation mismatch)

**Default timeout:** 120s

**5. Objective Evaluator**

**Purpose:** Observe system state, detect drift

**Process:**
1. Query State Graph for objective desired state
2. Observe actual system state (service status, endpoint health, provider status)
3. Compare observed vs. desired
4. Determine violation (true/false)
5. Request admission if unhealthy

**Boundary:** Evaluator observes, cannot act. Only gate may authorize reconciliation.

**6. Remediation Trigger**

**Purpose:** Execute governed remediation

**Process:**
1. Receive admission (generation from gate)
2. Verify objective status = `reconciling` for matching generation
3. Generate plan
4. Execute via governed pipeline
5. Verify recovery
6. Update objective state

**Boundary:** Trigger executes, but only with gate admission. No bypass path.

**7. Objective Coordinator**

**Purpose:** Orchestrate evaluation → admission → remediation → verification

**Process:**
1. Evaluate objectives (scheduled every 30s)
2. Detect violations
3. Request gate admission
4. If admitted → trigger remediation
5. If skipped → log reason
6. Record cadence events

**Outcome Types:**
- `HEALTHY_NO_ACTION`
- `DRIFT_DETECTED_ADMITTED`
- `DRIFT_DETECTED_SKIPPED_IN_FLIGHT`
- `DRIFT_DETECTED_SKIPPED_COOLDOWN`
- `DRIFT_DETECTED_SKIPPED_DEGRADED`
- `DRIFT_DETECTED_SKIPPED_SAFE_MODE`
- `RECONCILIATION_RECOVERED`

**8. Evaluation Loop Service**

**Purpose:** Background scheduler for autonomous monitoring

**Schedule:** Every 30s (configurable)

**Lifecycle:**
```
Disabled → Start → Running → [Pause/Resume] → Stop → Disabled
```

**Health Metrics:**
- Cycles run
- Objectives evaluated
- Cycles failed
- Duration statistics

---

## Three Control Invariants

**Phase 10.1:** Drift detection is not permission to act  
**Phase 10.2:** Failure is not permission to retry  
**Phase 10.3:** Admission grants bounded authority in time

**Together:** Vienna is a governed reconciliation runtime that bounds action by admission, retry by policy, and execution by time.

---

## State Graph (Persistent Memory)

**Location:** `~/.openclaw/runtime/{prod|test}/state/state-graph.db`

**Tables (15):**
1. `services` — System services (status, health, dependencies)
2. `providers` — LLM providers (credentials, rate limits)
3. `incidents` — Failures, resolutions, patterns
4. `objectives` — Tasks, milestones, projects (legacy)
5. `runtime_context` — Operational flags, configuration
6. `endpoints` — Execution endpoints (local, OpenClaw)
7. `endpoint_instructions` — Instruction dispatch history
8. `state_transitions` — Audit trail of state changes
9. `plans` — Workflow plans (steps, verification)
10. `verifications` — Post-execution validation results
11. `workflow_outcomes` — Final workflow conclusions
12. `execution_ledger_events` — Immutable lifecycle events
13. `execution_ledger_summary` — Derived execution summaries
14. `policies` — Governance policies (constraints, triggers)
15. `policy_decisions` — Policy evaluation history

**Plus managed objectives (Phase 9):**
- `managed_objectives` — Autonomous objective tracking
- `managed_objective_evaluations` — Evaluation results
- `managed_objective_history` — State transitions + reconciliation events

**Environment Isolation:** Prod and test use separate databases

---

## Key Design Principles

**1. Separation of Concerns**
- Agents propose (reasoning)
- Vienna decides (governance)
- Vienna executes (adapters)
- Vienna verifies (independent checks)
- Vienna records (ledger)

**2. No Bypass Paths**
- All execution through governed pipeline
- No direct tool invocation for agents
- Warrant required for T1/T2
- Policy evaluated before execution

**3. Immutable Audit**
- Events are append-only
- Summary is rebuildable
- No rewriting history
- Complete forensic record

**4. Deterministic Behavior**
- Same input → same output
- State machine driven
- Generation-based stale protection
- Timeout enforcement deterministic

**5. Fail Closed**
- Unknown → deny
- Missing evidence → unknown
- Ambiguity → escalate
- Safety over momentum

---

## Operator Visibility

**Dashboard:** http://100.120.116.10:5174

**Tabs:**
- **Now** — Chat interface, operator commands
- **Control-Plane** — Reconciliation visibility (Phase 10.5)
- **Objectives** — Task tracking (legacy)
- **Settings** — Configuration

**Control-Plane Panels:**
1. **Reconciliation Activity** — Active reconciliations
2. **Execution Leases** — Deadlines and timeouts
3. **Circuit Breakers** — Failure counts and cooldowns
4. **Reconciliation Timeline** — Recent lifecycle events
5. **Runtime Control** — Safe mode, manual overrides
6. **Execution Pipeline** — Visual status

**API Endpoints:**
- `GET /api/v1/reconciliation/activity`
- `GET /api/v1/reconciliation/leases`
- `GET /api/v1/reconciliation/breakers`
- `GET /api/v1/reconciliation/timeline`
- `GET /api/v1/managed-objectives`
- `GET /api/v1/executions`

---

## Bottom Line

**Vienna OS is a governed reconciliation runtime.**

**It bounds:**
- Action by admission (Phase 10.1)
- Retry by policy (Phase 10.2)
- Execution by time (Phase 10.3)

**It enforces:**
- Structured planning
- Constraint-based policy
- Deterministic execution
- Independent verification
- Immutable audit

**It prevents:**
- Unauthorized execution
- Infinite retry loops
- Indefinite execution
- Stale-result corruption
- Bypass paths

**Strongest accurate framing:**
> AI explains. Runtime executes. Operator approves. Vienna enforces.
