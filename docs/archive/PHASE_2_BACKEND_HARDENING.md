# Phase 2 — Backend Truth Hardening

**Status:** IN PROGRESS  
**Started:** 2026-03-23 20:36 EDT  
**Objective:** Ensure backend is deterministic and audit-safe

---

## Tasks

### 1. Enforce single-write guarantees
- [ ] No duplicate intent creation
- [ ] Idempotency if needed (optional but ideal)

### 2. Normalize response shape
Every `/api/v1/intent` response must include:
- [ ] tenant
- [ ] status
- [ ] explanation
- [ ] simulation flag
- [ ] cost
- [ ] attestation
- [ ] error (if any)

No missing fields. No UI guessing.

### 3. Explicit state transitions
Ensure backend uses clear states:
- [ ] `executed`
- [ ] `simulated`
- [ ] `blocked_quota`
- [ ] `blocked_budget`
- [ ] `failed`

No ambiguous states.

### 4. Logging completeness
Each intent should produce:
- [ ] Intent record
- [ ] Decision record (policy/quota/budget)
- [ ] Attestation record (if applicable)
- [ ] Cost record (if applicable)

---

## Exit Criteria
- [ ] Deterministic outputs
- [ ] Stable schema
- [ ] Clean audit trail

---

## Implementation Notes

**Current Response Shape Analysis:**

From Phase 1 validation, current response includes:
```json
{
  "success": true/false,
  "data": {
    "intent_id": "...",
    "tenant_id": "system",
    "action": "...",
    "execution_id": null,
    "simulation": false,
    "explanation": "...",
    "attestation": null,
    "cost": null,
    "quota_state": null,
    "metadata": {...}
  }
}
```

**Missing/Incomplete:**
- `execution_id` always null (needs wiring to execution layer)
- `attestation` null for synthetic cases (expected)
- `cost` null (needs cost tracking integration)
- State transitions not explicitly tracked

**Action Items:**
1. Wire `execution_id` to actual execution records
2. Implement cost tracking for real executions
3. Add explicit state transition tracking
4. Ensure idempotency for duplicate intent submissions
