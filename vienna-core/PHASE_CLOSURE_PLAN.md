# Phase Closure Plan — Phases 21-30

**Status:** In Progress  
**Goal:** Complete all in-scope phases to production-ready state

---

## Closure Checklist

### Phase 21 — Tenant Identity ✅

**Backend:**
- [x] Schema deployed (`tenants` table)
- [x] Session middleware extracts tenant
- [x] Tenant context in State Graph
- [x] Test coverage: 16/16

**Integration:**
- [ ] IntentGateway reads tenant from request
- [ ] Tenant flows through execution pipeline
- [ ] Tenant visible in ledger/cost/attestation

**UI:**
- [ ] Tenant status bar component
- [ ] Current tenant display
- [ ] Tenant switcher (if multi-tenant)

**Validation:**
- [ ] Browser: Tenant visible in UI
- [ ] Runtime: Tenant in execution logs
- [ ] Audit: Tenant in ledger/attestation

---

### Phase 22 — Quota Enforcement ✅

**Backend:**
- [x] QuotaEnforcer implemented
- [x] Schema deployed (`quota_reservations`, `tenant_costs`)
- [x] Test coverage: 12/12
- [x] Validation script passing

**Integration:**
- [x] IntentGateway quota check (ACTIVATED 2026-03-23)
- [x] Execution BLOCKED when quota exceeded
- [x] System tenant bypasses quota

**UI:**
- [ ] Quota status widget (usage/limit/%)
- [ ] Quota block message surfaced
- [ ] Budget threshold warnings

**Validation:**
- [x] Runtime: Quota blocking operational
- [ ] Browser: Quota visible in UI
- [ ] E2E: Case 3 (quota block) validated

---

### Phase 23 — Attestation ✅

**Backend:**
- [x] AttestationEngine implemented
- [x] Schema deployed (`execution_attestations`)
- [x] PlanExecutor integration
- [x] IntentGateway integration
- [x] Test coverage: 24/24

**Integration:**
- [x] Attestation created after verification
- [x] Attestation in API response
- [x] Attestation linked to execution_id

**UI:**
- [x] ExecutionResultMessage displays attestation
- [ ] Attestation status badge
- [ ] Attestation detail modal

**Validation:**
- [x] Runtime: Attestation creation proven
- [ ] Browser: Attestation visible in UI
- [ ] E2E: Success/failure/blocked cases validated

---

### Phase 24 — Simulation ⚠️

**Backend:**
- [x] Simulation mode in PlanExecutor
- [x] No side effects flag
- [x] Test coverage: 6/6

**Integration:**
- [ ] IntentGateway simulation flag
- [ ] API endpoint for simulation requests
- [ ] Simulation clearly marked in response

**UI:**
- [ ] Simulation toggle in chat
- [ ] Simulation badge on results
- [ ] "Dry run" indicator

**Validation:**
- [ ] Runtime: Simulation prevents real execution
- [ ] Browser: Simulation clearly visible
- [ ] E2E: Case 2 (simulation) validated

---

### Phase 27 — Explainability ⚠️

**Backend:**
- [x] Explanation generation in ExecutionGraphBuilder
- [x] GET /intents/:intent_id/explanation endpoint
- [x] Test coverage: Passing

**Integration:**
- [ ] Explanation in IntentGateway response
- [ ] Explanation for success/blocked/failure
- [ ] Explanation in ExecutionResultMessage

**UI:**
- [ ] Explanation text in result messages
- [ ] Explanation detail expandable
- [ ] Explanation for quota/budget blocks

**Validation:**
- [ ] Runtime: Explanation generated for all outcomes
- [ ] Browser: Explanation visible in UI
- [ ] E2E: All 5 cases show explanation

---

### Phase 29 — Resource Accounting ✅

**Backend:**
- [x] CostTracker implemented
- [x] Schema deployed (`execution_costs`, `budget_thresholds`, `tenant_costs`)
- [x] Cost calculation operational
- [x] Test coverage: 23/23

**Integration:**
- [x] Cost recorded after execution
- [x] Tenant attribution operational
- [x] Budget thresholds enforced

**UI:**
- [ ] Cost display in result messages
- [ ] Budget status widget
- [ ] Cost breakdown by tenant

**Validation:**
- [x] Runtime: Cost tracking proven (4/4 tests)
- [ ] Browser: Cost visible in UI
- [ ] E2E: Cost attribution validated

---

### Phase 28 — Integration Layer ❌

**Backend:**
- [x] Code implemented
- [ ] No real integration path configured

**Integration:**
- [ ] Pick ONE integration target
- [ ] Route ONE execution through it
- [ ] Preserve tenant/cost/attestation

**Status:** NOT COMPLETE (no integration path proven)

**Decision Required:** Choose integration target or defer

---

### Phase 25/30 — Federation ⚠️

**Backend:**
- [x] Federation code implemented
- [ ] No second runtime deployed

**Status:** INACTIVE BY DESIGN (single-runtime deployment)

**Classification:**
- Implemented but intentionally inactive
- No federation without multi-node deployment
- Code preserved for future activation

---

### Phase 26.2+ — Retry/Recovery ❌ DEFERRED

**Backend:**
- [x] Failure Classifier (26.1) deployed
- [x] Retry Orchestrator code exists
- [ ] 35/61 tests failing

**Status:** EXPLICITLY DEFERRED

**Reason:** Incomplete implementation, test failures unresolved

**Timeline:** Return after Phase 21-30 closure

---

## Integration Architecture

### Canonical Execution Path

```
console.regulator.ai
  ↓
POST /api/v1/intents (authenticated)
  ↓
IntentGateway.submitIntent()
  ├─ Extract tenant from session
  ├─ QuotaEnforcer.checkQuota()      [Phase 22]
  ├─ BudgetEnforcer.checkBudget()    [Phase 29]
  ├─ Simulation flag check           [Phase 24]
  ↓
PlanExecutor.execute()
  ├─ Generate plan
  ├─ Policy evaluation
  ├─ Approval (if T1/T2)
  ├─ Execution (or simulation)
  ├─ Verification
  ├─ AttestationEngine.createAttestation() [Phase 23]
  ├─ CostTracker.recordCost()        [Phase 29]
  ↓
IntentGateway response
  ├─ Result + explanation            [Phase 27]
  ├─ Attestation status              [Phase 23]
  ├─ Cost info                       [Phase 29]
  ├─ Quota state                     [Phase 22]
  ↓
ExecutionResultMessage (UI)
  ├─ Tenant context                  [Phase 21]
  ├─ Explanation text                [Phase 27]
  ├─ Attestation badge               [Phase 23]
  ├─ Cost display                    [Phase 29]
  ├─ Quota status                    [Phase 22]
  ├─ Simulation indicator            [Phase 24]
```

---

## UI Components Required

### TenantStatusBar (Phase 21)

**Location:** `src/components/layout/TenantStatusBar.tsx`

**Display:**
- Current tenant ID
- Tenant name
- Tenant switcher (if multi-tenant)

---

### QuotaStatusWidget (Phase 22)

**Location:** `src/components/dashboard/QuotaStatusWidget.tsx`

**Display:**
- Usage: X / Y units
- Utilization: Z%
- Progress bar (green → yellow → red)
- Budget threshold warnings

---

### Enhanced ExecutionResultMessage (Phase 23/24/27/29)

**Location:** `src/components/chat/ExecutionResultMessage.tsx` (UPDATE)

**New fields:**
- `explanation`: string (Phase 27)
- `attestation`: { status, attestation_id, timestamp } (Phase 23)
- `cost`: { amount, currency, breakdown } (Phase 29)
- `simulation`: boolean (Phase 24)
- `quota_state`: { used, limit, blocked } (Phase 22)

**Display:**
- Simulation badge (if applicable)
- Explanation text (expandable)
- Attestation status icon
- Cost summary
- Quota warning (if near limit)

---

## Validation Matrix

### Case 1: Successful Execution

**Input:** Valid intent, within quota/budget

**Expected Response:**
```json
{
  "intent_id": "intent-...",
  "accepted": true,
  "action": "executed",
  "execution_id": "exec-...",
  "tenant_id": "system",
  "explanation": "Executed <action> successfully...",
  "attestation": {
    "status": "attested",
    "attestation_id": "att-...",
    "timestamp": "2026-03-23T..."
  },
  "cost": {
    "amount": 0.0105,
    "currency": "USD",
    "breakdown": { "input_tokens": 1000, "output_tokens": 500 }
  },
  "quota_state": {
    "used": 45,
    "limit": 100,
    "available": 55
  }
}
```

**UI Must Show:**
- ✅ Success icon
- ✅ Explanation text
- ✅ Attestation badge
- ✅ Cost: $0.0105
- ✅ Quota: 45/100 (45%)

---

### Case 2: Simulation

**Input:** Valid intent with `simulation: true`

**Expected Response:**
```json
{
  "intent_id": "intent-...",
  "accepted": true,
  "action": "simulated",
  "execution_id": null,
  "tenant_id": "system",
  "simulation": true,
  "explanation": "Simulation: Would execute <action>...",
  "attestation": null,
  "cost": null,
  "quota_state": {
    "used": 45,
    "limit": 100,
    "reserved": 0
  }
}
```

**UI Must Show:**
- 🔵 Simulation badge
- ✅ Explanation text
- ❌ NO attestation
- ❌ NO cost
- ℹ️ "Dry run - no side effects"

---

### Case 3: Quota Block

**Input:** Valid intent, quota exceeded

**Expected Response:**
```json
{
  "intent_id": "intent-...",
  "accepted": false,
  "error": "quota_exceeded",
  "tenant_id": "system",
  "explanation": "Quota exceeded. Used 100/100 units (100%)...",
  "quota_state": {
    "used": 100,
    "limit": 100,
    "available": 0,
    "blocked": true
  }
}
```

**UI Must Show:**
- ❌ Blocked icon
- ❌ Error message: "Quota Exceeded"
- ✅ Explanation: "Used 100/100 units..."
- ✅ Quota bar: RED, 100%
- ℹ️ "Contact admin to increase quota"

---

### Case 4: Budget Block

**Input:** Valid intent, budget exhausted

**Expected Response:**
```json
{
  "intent_id": "intent-...",
  "accepted": false,
  "error": "budget_exceeded",
  "tenant_id": "system",
  "explanation": "Budget exceeded. Estimated cost $X exceeds available budget $Y...",
  "cost": {
    "estimated": 0.0200,
    "available": 0.0100,
    "blocked": true
  }
}
```

**UI Must Show:**
- ❌ Blocked icon
- ❌ Error message: "Budget Exceeded"
- ✅ Explanation: "Estimated $0.02 exceeds $0.01 available..."
- ℹ️ "Increase budget or wait for reset"

---

### Case 5: Failure

**Input:** Valid intent, execution fails

**Expected Response:**
```json
{
  "intent_id": "intent-...",
  "accepted": true,
  "action": "failed",
  "execution_id": "exec-...",
  "tenant_id": "system",
  "explanation": "Execution failed: <error message>...",
  "attestation": {
    "status": "failure",
    "attestation_id": "att-...",
    "timestamp": "2026-03-23T..."
  },
  "cost": {
    "amount": 0.0105,
    "currency": "USD"
  }
}
```

**UI Must Show:**
- ❌ Failure icon
- ✅ Explanation: "Execution failed: <error>..."
- ✅ Attestation: "Failure recorded"
- ✅ Cost charged (even on failure)

---

## Implementation Order

### Phase 1: Backend Integration (2-3 hours)

1. **IntentGateway enhancement**
   - Extract tenant from session
   - Add QuotaEnforcer call
   - Add BudgetEnforcer call
   - Add simulation flag handling
   - Include explanation in response
   - Include attestation in response
   - Include cost in response
   - Include quota_state in response

2. **API Response Schema**
   - Update `/api/v1/intents` POST response
   - Add Phase 21-30 fields
   - Validate response format

3. **Test Phase 1**
   - Run validation scripts
   - Verify backend flow
   - Check database writes

---

### Phase 2: UI Components (2-3 hours)

1. **Create TenantStatusBar**
   - Display current tenant
   - Position in TopStatusBar

2. **Create QuotaStatusWidget**
   - Display usage/limit/percentage
   - Progress bar with color coding
   - Position in TopStatusBar or Dashboard

3. **Enhance ExecutionResultMessage**
   - Add explanation section
   - Add attestation badge
   - Add cost display
   - Add simulation indicator
   - Add quota warning

4. **Test Phase 2**
   - Build frontend
   - Deploy to /console
   - Verify in browser

---

### Phase 3: E2E Validation (1-2 hours)

1. **Run 5 validation cases**
   - Case 1: Success
   - Case 2: Simulation
   - Case 3: Quota block
   - Case 4: Budget block
   - Case 5: Failure

2. **Browser verification**
   - All UI elements visible
   - Data accurate
   - No errors in console

3. **Runtime verification**
   - Database writes correct
   - Ledger entries complete
   - Audit trail accurate

---

### Phase 4: Honest Classification (30 min)

1. **Classify each phase**
   - Fully closed
   - Implemented but inactive
   - Deferred

2. **Document proof**
   - Deployment surface
   - Runtime evidence
   - UI screenshots
   - Persistence validation

---

## Definition of CLOSED

A phase is CLOSED when all four are true:

1. **Deployed:** Code in production
2. **Validated:** Runtime behavior proven
3. **Usable:** Operator can use through UI/API
4. **Integrated:** Connected to canonical execution path

---

## Next Action

Begin Phase 1: Backend Integration (IntentGateway enhancement)
