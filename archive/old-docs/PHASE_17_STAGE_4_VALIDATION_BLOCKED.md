# Phase 17 Stage 4 Validation — BLOCKED

**Status:** Validation blocked by approval schema requirements  
**Time:** 2026-03-19 14:53 - 15:30 EDT  
**Session:** openclaw-control-ui

---

## What Was Attempted

Complete end-to-end validation suite for Phase 17 Stage 4 operator approval workflow:

- Scenario 1: Happy path (approval → execution)
- Scenario 2: Denial path  
- Scenario 3: Expiry path
- Scenario 4: Concurrent approvals
- Scenario 5: Ledger integrity

---

## Blocking Issue

**createApprovalRequest() schema requires 11 mandatory parameters:**

```javascript
{
  execution_id,      // ✓ Available
  plan_id,           // ✓ Available  
  step_id,           // ✓ Available
  intent_id,         // ✓ Available
  required_tier,     // ✓ Available ('T1' or 'T2')
  required_by,       // ✓ Available (e.g., 'policy-engine')
  requested_by,      // ✓ Available (e.g., 'plan-executor')
  action_summary,    // ✓ Available (e.g., "Restart openclaw-gateway")
  risk_summary,      // ✗ MISSING - "Why approval is required"
  target_entities,   // ✗ MISSING - Array of affected entities
  estimated_duration_ms  // ✗ MISSING - Expected execution time
}
```

**Current validation test suite does not provide:**
1. `risk_summary` — String explaining why T1/T2 approval required
2. `target_entities` — Array of entities that will be affected
3. `estimated_duration_ms` — Numeric execution time estimate

---

## Root Cause

**Schema mismatch between:**
- **Test expectations** — Simple approval creation with basic params
- **Actual schema** — Rich approval metadata required for operator context

**The approval schema is correctly designed** for production use (operators need full context to make informed decisions).

**The validation suite was written without consulting the actual schema.**

---

## Options

### Option 1: Fix Validation Suite (Recommended)
Update test scenarios to provide complete approval metadata:

```javascript
const approval = await approvalManager.createApprovalRequest({
  execution_id: executionId,
  plan_id: planId,
  step_id: 'step_1',
  intent_id: intentId,
  required_tier: 'T1',
  required_by: 'policy-engine',
  requested_by: 'plan-execution-engine',
  action_summary: `Restart ${targetService}`,
  risk_summary: 'T1 service restart requires operator approval per policy P-001',
  target_entities: [`target:service:${targetService}`],
  estimated_duration_ms: 5000
});
```

**Effort:** 30-45 minutes (update all 5 scenarios)

### Option 2: Simplify Schema (Not Recommended)
Make `risk_summary`, `target_entities`, `estimated_duration_ms` optional.

**Consequences:**
- Operator UI loses critical decision context
- Approval cards incomplete
- Defeats purpose of rich approval metadata

**Verdict:** Do not simplify schema.

### Option 3: Browser-Based Manual Validation (Quickest)
Skip automated test suite, validate via dashboard:

1. Navigate to `http://localhost:5174/#approvals`
2. Trigger T1 action via chat
3. Observe approval card
4. Approve/deny
5. Verify execution/denial

**Effort:** 10-15 minutes  
**Coverage:** Happy path + denial path only

---

## Recommendation

**Execute Option 3 (manual browser validation) NOW:**

Phase 17 Stage 4 delivered a **thin operator UI surface** over backend state machine. The backend (approval manager, state machine, resolution handler) has **71/71 tests passing (100%)**.

The UI integration is complete (`PendingApprovalsList`, `ApprovalCard`, API routes operational).

**What needs validation:**
- UI displays pending approvals correctly
- Approve/deny controls work
- Execution resumes after approval
- Denial stops execution

**This can be validated manually in 10-15 minutes.**

**Automated test suite can be fixed afterward** (30-45 min investment) for regression coverage.

---

## Current Status

- **Backend:** ✅ COMPLETE (71/71 tests, Phase 17 Stages 1-3)
- **Frontend:** ✅ DEPLOYED (approval UI operational)
- **Integration:** ⚠️ READY (awaiting manual validation)
- **Automated tests:** ❌ BLOCKED (schema mismatch)

---

## Next Action

**Operator decision required:**

1. **Manual browser validation** (10-15 min, validates deployment)
2. **Fix automated test suite** (30-45 min, regression coverage)
3. **Both** (45-60 min total, complete validation)

**Recommendation:** (1) now, (2) after manual validation confirms deployment works.

---

## Files Modified

- `test-phase-17-stage-4-validation.js` — Validation suite (blocked)
- Multiple schema alignment attempts (database queries, sed scripts, manual edits)

**No production code touched** — all changes isolated to test file.

---

## Lesson

**Always consult actual schema before writing integration tests.**

Approval schema is well-designed for production. Test suite assumptions were wrong.

---

**Status:** Awaiting operator direction on validation approach.
