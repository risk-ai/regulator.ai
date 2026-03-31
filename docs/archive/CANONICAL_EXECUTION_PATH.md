# Canonical Execution Path

**Vienna OS v8.5.0 — Post-Phase 28 Architecture**

**Last Updated:** 2026-03-28  
**Status:** Complete & Validated

---

## Executive Summary

Vienna OS has **exactly one execution flow** for all governed operations. No bypass routes, no special cases, no backdoors.

**Path:** `Intent → Interpreter → Policy → Approval → Executor → Verification → Attestation → Response`

**Enforcement:** All meaningful actions route through this pipeline. Test-only endpoints and read-only queries are the only exceptions.

---

## Canonical Flow (Detailed)

### 1. Intent Submission

**Entry Point:** `POST /api/v1/intent`

**Handler:** `IntentGateway.submitIntent()`

**Responsibilities:**
- Accept natural language or structured intent
- Assign `intent_id` (UUID)
- Validate basic schema (not empty, reasonable length)
- Emit `intent.submitted` event

**Output:** `intent_id` + classification metadata

---

### 2. Interpretation

**Handler:** `IntentInterpreter.interpret(intent)`

**Responsibilities:**
- Parse intent (NL → structured action)
- Normalize parameters (fill defaults, resolve aliases)
- Classify risk tier (T0/T1/T2)
- Detect recursion risk
- Validate against intent schema

**Output:** Normalized intent envelope

**Side Effects:** None (pure transformation)

---

### 3. Quota Check

**Handler:** `QuotaEnforcer.checkQuota(tenant_id, action_type)`

**Responsibilities:**
- Query `quota_state` table
- Check remaining quota for tenant
- Enforce rate limits (per-tenant, per-action)
- Update quota consumption estimate

**Output:** `quota_allowed: true/false` + explanation

**Failure Mode:** If quota exhausted, return `403 Quota Exceeded` + explanation, **do NOT proceed to execution**

---

### 4. Budget Check

**Handler:** `BudgetEnforcer.checkBudget(tenant_id, estimated_cost)`

**Responsibilities:**
- Estimate execution cost (LLM tokens, adapter costs)
- Check tenant budget remaining
- Enforce cost limits (per-tenant, per-execution)
- Reserve estimated cost (optimistic locking)

**Output:** `budget_allowed: true/false` + explanation

**Failure Mode:** If budget exhausted, return `402 Budget Exceeded` + explanation, **do NOT proceed to execution**

---

### 5. Policy Evaluation

**Handler:** `PolicyEngine.evaluatePolicies(intent, tenant_id)`

**Responsibilities:**
- Load active policies for tenant
- Evaluate policy rules against intent
- Compute policy decision (allow/deny/modify)
- Apply policy transformations (if modify)
- Log policy evaluation result

**Output:** `policy_decision: allow/deny/modify` + modified intent (if applicable)

**Failure Mode:** If denied, return `403 Policy Denied` + reason, **do NOT proceed to execution**

---

### 6. Approval Workflow (if T1/T2)

**Handler:** `ApprovalManager.requireApproval(intent, operator_id)`

**Responsibilities:**
- Check if approval required (T1/T2 only)
- Create approval request in `approval_requirements` table
- Emit `approval.created` event
- Wait for operator decision (approve/deny)
- Enforce approval timeout (expiration)

**Output:** `approval_granted: true/false` + approval metadata

**Failure Mode:** If denied or expired, return `403 Approval Denied` + reason, **do NOT proceed to execution**

**Special Case T0:** Skip approval workflow entirely (no operator interaction)

---

### 7. Execution (Simulation OR Real)

**Branching Point:** Simulation flag determines next step

#### 7a. Simulation Mode (Dry Run)

**Handler:** `SimulationEngine.simulate(intent)`

**Responsibilities:**
- Execute intent in dry-run mode (no side effects)
- Estimate execution result
- Compute what-if analysis
- Generate simulation report

**Output:** Simulation result + estimated outcome

**Side Effects:** **None** — no real execution, no cost, no attestation

**Response:** `200 OK` + simulation badge in UI

---

#### 7b. Real Execution Mode

**Handler:** `PlanExecutor.execute(intent)`

**Responsibilities:**
- Create execution plan (step decomposition)
- Assign `execution_id` (UUID)
- Route to appropriate `Executor` (Vienna Core executor)
- Call adapter (`ViennaAdapter.execute(action)`)
- Handle adapter response
- Emit `execution.started`, `execution.completed/failed` events

**Adapter Layer:** `adapters/{github|anthropic|...}.js`

**Adapter Responsibilities:**
- Execute real side effect (API call, file write, etc.)
- Return structured result
- Preserve tenant context
- Log adapter invocation

**Output:** Execution result + success/failure status

**Side Effects:** **Real changes** (API mutations, file writes, etc.)

---

### 8. Verification

**Handler:** `VerificationEngine.verify(execution_result, intent)`

**Responsibilities:**
- Validate execution outcome against intent
- Check result against expected schema
- Confirm side effect actually occurred (health check)
- Detect execution anomalies (unexpected outcome)
- Log verification result

**Output:** `verification_passed: true/false` + verification report

**Failure Mode:** If verification fails, log failure but **DO NOT re-execute** (no automatic retry)

---

### 9. Attestation

**Handler:** `AttestationEngine.attest(execution_id, result, verification)`

**Responsibilities:**
- Create tamper-proof execution record
- Store in `execution_ledger_summary` table
- Include: `intent_id`, `execution_id`, `tenant_id`, `operator`, `result`, `timestamp`
- Compute integrity hash (SHA-256 over result)
- Sign attestation (if signing enabled)

**Output:** Attestation record

**Side Effects:** Permanent audit trail (cannot be deleted)

---

### 10. Cost Tracking & Ledger

**Handler:** `CostTracker.recordCost(execution_id, actual_cost)`

**Responsibilities:**
- Compute actual execution cost (adapter + LLM + quota)
- Update `cost_ledger` table
- Deduct from tenant budget
- Release reserved budget (if optimistic locking)
- Emit `cost.recorded` event

**Output:** Cost record

**Side Effects:** Tenant budget updated

---

### 11. Integration Adapter (Optional)

**Handler:** `IntegrationAdapter.notifyExternal(execution_result)`

**Responsibilities:**
- Send execution result to external system (webhook, API)
- Preserve tenant context
- Retry on transient failure (max 3 attempts)
- Log integration success/failure

**Output:** Integration status

**Side Effects:** External API mutation

---

### 12. API Response

**Handler:** `IntentGateway.respondToClient(result)`

**Responsibilities:**
- Format response (success/failure + result)
- Include relevant IDs (`intent_id`, `execution_id`, `attestation_id`)
- Return HTTP status code (200/403/500)
- Emit `intent.completed` event

**Output:** HTTP response to client

---

### 13. UI Result Display

**Handler:** Client-side rendering (console UI)

**Responsibilities:**
- Display execution result
- Show attestation badge (✓ verified)
- Link to audit trail
- Show cost breakdown

**Output:** Visual feedback to operator

---

## Enforcement Guarantees

### No Bypass Routes

**Prohibited patterns:**
- Direct adapter invocation (must go through `PlanExecutor`)
- Manual database writes bypassing attestation
- Special-case execution paths for "urgent" actions
- Test endpoints that mutate production state

**Allowed exceptions:**
- Read-only queries (`GET /api/v1/status`)
- Health checks (`GET /api/v1/health`)
- Static asset serving
- Authentication endpoints (no governance needed)

---

### Validation Checklist

Run this checklist periodically to ensure canonical path integrity:

- [ ] All side effects route through `PlanExecutor`
- [ ] All executions have attestations (query `execution_ledger_summary`)
- [ ] No tenant operations attributed to `system` tenant (check `tenant_id` attribution)
- [ ] All T1/T2 actions have approval records (query `approval_requirements`)
- [ ] All executions have cost records (query `cost_ledger`)
- [ ] No adapter invocations bypass `AttestationEngine`

---

## Sequence Diagram

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/v1/intent
     ▼
┌──────────────────┐
│ IntentGateway    │
│ submitIntent()   │
└────┬─────────────┘
     │
     │ 1. Interpretation
     ▼
┌──────────────────┐
│ IntentInterpreter│
│ interpret()      │
└────┬─────────────┘
     │
     │ 2. Quota Check
     ▼
┌──────────────────┐
│ QuotaEnforcer    │
│ checkQuota()     │
└────┬─────────────┘
     │
     │ 3. Budget Check
     ▼
┌──────────────────┐
│ BudgetEnforcer   │
│ checkBudget()    │
└────┬─────────────┘
     │
     │ 4. Policy Evaluation
     ▼
┌──────────────────┐
│ PolicyEngine     │
│ evaluate()       │
└────┬─────────────┘
     │
     │ 5. Approval (if T1/T2)
     ▼
┌──────────────────┐
│ ApprovalManager  │
│ requireApproval()│
└────┬─────────────┘
     │
     │ 6a. Simulation?
     ├──────────────────┐
     │                  │
     │ NO               │ YES
     ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ PlanExecutor │   │ Simulation   │
│ execute()    │   │ Engine       │
└──┬───────────┘   └───┬──────────┘
   │                   │
   │ 7. Adapter        │ (dry-run)
   ▼                   │
┌──────────────┐       │
│ Adapter      │       │
│ (GitHub/API) │       │
└──┬───────────┘       │
   │                   │
   │ 8. Verification   │
   ▼                   │
┌──────────────┐       │
│ Verification │       │
│ Engine       │       │
└──┬───────────┘       │
   │                   │
   │ 9. Attestation    │
   ▼                   │
┌──────────────┐       │
│ Attestation  │       │
│ Engine       │       │
└──┬───────────┘       │
   │                   │
   │ 10. Cost          │
   ▼                   │
┌──────────────┐       │
│ CostTracker  │       │
└──┬───────────┘       │
   │                   │
   │ 11. Integration   │
   ▼                   │
┌──────────────┐       │
│ Integration  │       │
│ Adapter      │       │
└──┬───────────┘       │
   │                   │
   ◄───────────────────┘
   │
   │ 12. Response
   ▼
┌──────────────┐
│ API Response │
└──┬───────────┘
   │
   │ 13. UI Display
   ▼
┌──────────────┐
│ Console UI   │
└──────────────┘
```

---

## Runtime Verification Queries

**Check tenant attribution correctness:**
```sql
SELECT tenant_id, COUNT(*) as count
FROM execution_ledger_summary
WHERE created_at > datetime('now', '-24 hours')
  AND tenant_id = 'system'
GROUP BY tenant_id;
```
**Expected:** 0 rows (no user operations attributed to system)

**Check attestation completeness:**
```sql
SELECT 
  (SELECT COUNT(*) FROM execution_ledger_summary WHERE created_at > datetime('now', '-24 hours')) as total_executions,
  (SELECT COUNT(*) FROM execution_ledger_summary WHERE created_at > datetime('now', '-24 hours') AND attestation_id IS NOT NULL) as attested_executions;
```
**Expected:** `total_executions = attested_executions`

**Check approval compliance (T1/T2 only):**
```sql
SELECT execution_id
FROM execution_ledger_summary
WHERE risk_tier IN ('T1', 'T2')
  AND created_at > datetime('now', '-24 hours')
  AND execution_id NOT IN (
    SELECT execution_id FROM approval_requirements WHERE status = 'approved'
  );
```
**Expected:** 0 rows (all T1/T2 executions have approvals)

---

## Emergency Override Protocol

**Scope:** None. No emergency override bypasses canonical path.

**Rationale:** Canonical path is sufficiently fast (<500ms latency). Emergency situations require fast approvals, not path bypasses.

**Escalation:** If canonical path is broken, fix canonical path (don't create bypass).

---

## Change Control

**Modifications to canonical path require:**
1. RFC with impact analysis
2. Security review (Metternich)
3. Test coverage ≥80%
4. Phase gate approval
5. Rollback plan

**Document updates:** Update this file when architectural changes occur.

**Version History:**
- 2026-03-28: Initial canonical path documentation (post-Phase 28)

---

## References

- `POST_PHASE_28_PLAN.md` — Cleanup plan
- `VIENNA_OS_OVERVIEW.md` — Full architecture
- `PHASE_7.2_RFC.md` — Enforcement architecture
- `services/vienna-lib/` — Implementation code

**For questions:** Check documentation first, then escalate to Max/Metternich.
