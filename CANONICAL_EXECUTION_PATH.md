# Canonical Execution Path

**Status:** Architecture target (to be enforced after Phase 28 validation)  
**Goal:** One execution flow, no bypass routes, full governance

---

## The Path

```
┌─────────────────────────────────────────────────────────────────┐
│ User (console.regulator.ai)                                     │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Authenticated Session                                           │
│ • Cookie-based session (vienna_session)                         │
│ • Tenant extracted from session.tenant_id                       │
│ • Operator identity from session.operator                       │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Intent Submission                                               │
│ POST /api/v1/intent                                             │
│ {                                                               │
│   intent_type: "restore_objective" | "investigate_objective",  │
│   payload: {...},                                               │
│   simulation: true|false                                        │
│ }                                                               │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ IntentGateway.submitIntent(intent, context)                     │
│ • context = { tenant_id, session, simulation }                  │
│ • Generate intent_id                                            │
│ • Create intent trace (Phase 11.5)                              │
│ • Emit lifecycle events                                         │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Interpretation                                                  │
│ • validateIntent() — structure check                            │
│ • normalizeIntent() — canonical form                            │
│ • resolveIntent() — intent_type → handler mapping               │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Quota Check (Phase 22)                                          │
│ QuotaEnforcer.checkQuota(tenant_id, action)                     │
│ • Query tenant quota from State Graph                           │
│ • Check remaining units                                         │
│ • Reserve quota if available                                    │
│ • BLOCK if quota exceeded                                       │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Budget Check (Phase 29)                                         │
│ CostModel.estimateCost(action)                                  │
│ BudgetEnforcer.checkBudget(tenant_id, estimated_cost)           │
│ • Estimate execution cost                                       │
│ • Check tenant budget threshold                                 │
│ • BLOCK if budget would be exceeded                             │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Approval/Policy (Phase 17, 8.4)                                 │
│ PolicyEngine.evaluate(action, context)                          │
│ ApprovalManager.requireApproval(action) (if T1/T2)              │
│ • Evaluate policy constraints                                   │
│ • Determine risk tier (T0/T1/T2)                                │
│ • If T1/T2: require operator approval                           │
│ • BLOCK if policy denies or approval pending                    │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Execution OR Simulation (Phase 24)                              │
└───────────────────┬─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Simulation       │   │ Execution        │
│ • Dry-run mode   │   │ • Real side      │
│ • No adapters    │   │   effects        │
│ • No cost        │   │ • PlanExecutor   │
│ • No attestation │   │ • Executor       │
│ • Explanation:   │   │ • Adapters       │
│   "Simulation:"  │   └────────┬─────────┘
└──────────────────┘            │
                                │
                    ┌───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PlanExecutor (Phase 16.1)                                       │
│ • Generate execution plan                                       │
│ • Per-step governance:                                          │
│   - Reconciliation check                                        │
│   - Policy evaluation                                           │
│   - Lock acquisition (Phase 16.2)                               │
│   - Warrant issuance (Phase 7.2)                                │
│   - Executor invocation                                         │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Executor                                                        │
│ • Execute governed action                                       │
│ • Route to appropriate adapter                                  │
│ • Preserve tenant_id in execution context                       │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Adapter (Phase 28)                                              │
│ • StateGraphAdapter — State Graph writes                        │
│ • WorkspaceAdapter — File operations                            │
│ • ExternalAPIAdapter — External service calls                   │
│ • Adapter receives: { action, context { tenant_id, ... } }      │
│ • Adapter executes with tenant context                          │
│ • Adapter returns: { success, result, error }                   │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Verification (Phase 8.2)                                        │
│ VerificationEngine.verify(execution_id)                         │
│ • Run verification tasks                                        │
│ • Check postconditions                                          │
│ • Validate side effects                                         │
│ • Generate WorkflowOutcome                                      │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Attestation (Phase 23)                                          │
│ AttestationEngine.generateAttestation(execution_id)             │
│ • Create attestation record                                     │
│ • Link to execution_id                                          │
│ • Include tenant_id                                             │
│ • Set status: success | failure | blocked                       │
│ • Persist to State Graph execution_attestations table           │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Cost/Ledger (Phase 29, 8.3)                                     │
│ CostTracker.recordCost(execution_id, tenant_id)                 │
│ ExecutionLedger.appendEvent(execution_id, event)                │
│ • Calculate actual execution cost                               │
│ • Record to State Graph execution_costs table                   │
│ • Attribute to tenant_id                                        │
│ • Append ledger events (immutable audit trail)                  │
│ • Update execution_ledger_summary                               │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Response                                                    │
│ {                                                               │
│   success: true,                                                │
│   data: {                                                       │
│     intent_id,                                                  │
│     tenant_id,                                                  │
│     execution_id,                                               │
│     simulation,                                                 │
│     explanation,        // Phase 27                             │
│     attestation: {      // Phase 23                             │
│       attestation_id,                                           │
│       status                                                    │
│     },                                                          │
│     cost: {             // Phase 29                             │
│       total_cost,                                               │
│       currency                                                  │
│     },                                                          │
│     quota_state: {      // Phase 22                             │
│       remaining,                                                │
│       utilized_percent                                          │
│     }                                                           │
│   }                                                             │
│ }                                                               │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ UI Result Display                                               │
│ • Execution list (ExecutionsPage)                               │
│ • Execution detail (ExecutionDetailModal)                       │
│ • Displays: tenant, status, cost, attestation, explanation      │
│ • Ledger events visible                                         │
│ • Timeline/audit trail                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Enforcement Rules

### No Bypass Routes

**Prohibited:**
- Direct adapter calls without Intent Gateway
- Direct State Graph writes without Executor
- Direct execution without quota/budget checks
- Direct cost recording without CostTracker
- Test-only public endpoints in production
- Special-case execution paths

**Allowed bypass (ONLY):**
- Health checks (`/health`)
- Auth endpoints (`/api/v1/auth/*`)
- Static assets

---

## Simulation Path Behavior

**Simulation = true:**
- ✅ Intent validation
- ✅ Quota check (READ ONLY, no reservation)
- ✅ Budget check (estimation only)
- ✅ Policy evaluation
- ✅ Plan generation
- ❌ NO Executor invocation
- ❌ NO Adapter calls
- ❌ NO Cost recording
- ❌ NO Attestation
- ✅ Explanation prefixed with "Simulation:"

**Result:** Dry-run mode, no side effects

---

## Block Paths

**Quota exceeded:**
- STOP at quota check
- Return: `{ success: false, error: "Quota exceeded", quota_state: {...} }`
- No execution
- No cost
- No attestation

**Budget exceeded:**
- STOP at budget check
- Return: `{ success: false, error: "Budget exceeded", cost: { estimated: ... } }`
- No execution
- No cost
- No attestation

**Policy denial:**
- STOP at policy evaluation
- Return: `{ success: false, error: "Policy denied", explanation: ... }`
- No execution
- No cost
- Attestation with status `blocked`

**Approval pending (T1/T2):**
- STOP at approval check
- Return: `{ success: false, error: "Approval required", approval_id: ... }`
- No execution (until approval granted)
- No cost
- No attestation (until approval resolved)

---

## State Graph Persistence

**Every execution (success or failure):**
- `execution_ledger_events` — Immutable event log
- `execution_ledger_summary` — Derived summary (rebuildable)

**Successful execution:**
- `execution_costs` — Cost attribution
- `execution_attestations` — Attestation record

**Blocked execution:**
- `execution_attestations` — Attestation with status `blocked`
- NO `execution_costs` row

**Simulation:**
- NO `execution_costs` row
- NO `execution_attestations` row

---

## Validation Checklist

**Before marking canonical path as enforced:**

- [ ] All executions flow through Intent Gateway
- [ ] No direct adapter calls exist
- [ ] No bypass routes in codebase
- [ ] All side effects go through Executor
- [ ] Tenant context preserved at every stage
- [ ] Quota/budget checks mandatory for non-simulation
- [ ] Cost recorded only for real executions
- [ ] Attestation recorded only for real executions
- [ ] Simulation mode never triggers adapters
- [ ] Blocked executions never record cost
- [ ] State Graph writes only via governed path
- [ ] API responses include full governance context
- [ ] UI displays governance fields correctly

**Enforcement date:** TBD (after Phase 28 validation)

---

## Documentation References

**Related:**
- `PHASE_28_VALIDATION_PLAN.md` — Integration validation
- `POST_PHASE_28_PLAN.md` — Cleanup and freeze plan
- `LOCAL_VALIDATION_RESULTS.md` — Local proof
- `DEPLOYMENT_PLAN.md` — Production deployment

**After freeze:**
- Archive all phase implementation docs
- Keep this document as canonical reference
- Update onboarding to reference this path
