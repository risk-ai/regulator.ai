# Phase 28 Validation Plan

**Status:** NOT YET PROVEN IN PRODUCTION  
**Requirement:** One real integration path must be live and validated before Phase 28 can be marked complete

---

## Phase 28 Definition

**Goal:** Integration layer operational — Vienna-owned adapter executes governed actions and preserves full governance context

**Not just:** Code exists  
**Required:** Live proof that one integration path works end-to-end in production

---

## Validation Requirements

### Must Prove

1. **One real integration path is live**
   - Identify which adapter/integration (e.g., State Graph update, workspace action, external API call)
   - Execute it through Intent Gateway
   - Confirm it reaches the adapter and executes

2. **Tenant context survives**
   - Request includes `tenant_id`
   - Execution preserves `tenant_id`
   - Result attributes to correct tenant
   - State Graph records show correct tenant

3. **Quota/budget rules still apply**
   - Quota check runs before execution
   - Budget check runs before execution
   - Quota exceeded → blocked
   - Budget exceeded → blocked
   - Blocks are visible in API response

4. **Cost is recorded correctly**
   - Execution generates cost entry
   - Cost links to `execution_id`
   - Cost links to `tenant_id`
   - Cost persists in State Graph `execution_costs` table
   - No cost recorded for simulation
   - No cost recorded for blocked executions

5. **Attestation remains linked**
   - Attestation generated after execution
   - Attestation links to `execution_id`
   - Attestation includes tenant context
   - Attestation persists in State Graph `execution_attestations` table
   - No attestation for simulation
   - Blocked executions get attestation with `blocked` status

6. **Result is visible in UI/API**
   - API response includes execution result
   - API response includes attestation reference
   - API response includes cost data
   - UI displays execution outcome
   - UI shows governance context (tenant, cost, attestation)

---

## Test Procedure

### Setup

1. Deploy real backend to production
2. Confirm console UI connects to real backend
3. Authenticate as operator
4. Verify State Graph accessible in production

### Test Case 1: Success Path

**Action:** Execute governed operation through integration adapter

**Request:**
```json
POST /api/v1/intent
{
  "intent_type": "restore_objective",
  "payload": {
    "objective_id": "obj_test_001",
    "recovery_strategy": "retry_last_step"
  },
  "simulation": false
}
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-...",
    "tenant_id": "<tenant>",
    "execution_id": "exec-...",
    "simulation": false,
    "explanation": "...",
    "attestation": {
      "attestation_id": "att-...",
      "status": "success"
    },
    "cost": {
      "total_cost": 0.00XXX,
      "currency": "USD"
    },
    "quota_state": {
      "remaining": XXX,
      "utilized_percent": XX
    }
  }
}
```

**Validation:**
- [ ] `execution_id` present and non-null
- [ ] `tenant_id` matches authenticated session
- [ ] `attestation.status` = "success"
- [ ] `cost.total_cost` > 0
- [ ] `quota_state.remaining` decreased

**State Graph checks:**
```sql
-- execution_costs table
SELECT * FROM execution_costs WHERE execution_id = '<execution_id>';
-- Verify: tenant_id, total_cost, created_at

-- execution_attestations table
SELECT * FROM execution_attestations WHERE execution_id = '<execution_id>';
-- Verify: tenant_id, status='success', attested_at

-- execution_ledger_summary table
SELECT * FROM execution_ledger_summary WHERE execution_id = '<execution_id>';
-- Verify: status='completed', tenant_id
```

---

### Test Case 2: Simulation Path

**Request:**
```json
POST /api/v1/intent
{
  "intent_type": "restore_objective",
  "payload": {
    "objective_id": "obj_test_002",
    "recovery_strategy": "retry_last_step"
  },
  "simulation": true
}
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-...",
    "tenant_id": "<tenant>",
    "execution_id": "exec-...",
    "simulation": true,
    "explanation": "Simulation: Would execute...",
    "attestation": null,
    "cost": null,
    "quota_state": {
      "remaining": XXX,
      "utilized_percent": XX
    }
  }
}
```

**Validation:**
- [ ] `simulation` = true
- [ ] `attestation` = null
- [ ] `cost` = null
- [ ] `quota_state.remaining` UNCHANGED
- [ ] Explanation prefixed with "Simulation:"

**State Graph checks:**
```sql
-- execution_costs table
SELECT * FROM execution_costs WHERE execution_id = '<execution_id>';
-- Verify: NO ROWS (no cost for simulation)

-- execution_attestations table
SELECT * FROM execution_attestations WHERE execution_id = '<execution_id>';
-- Verify: NO ROWS (no attestation for simulation)
```

---

### Test Case 3: Quota Block

**Setup:** Set tenant quota to low value

**Request:**
```json
POST /api/v1/intent
{
  "intent_type": "restore_objective",
  "payload": {
    "objective_id": "obj_test_003",
    "recovery_strategy": "retry_last_step"
  },
  "simulation": false
}
```

**Expected response:**
```json
{
  "success": false,
  "error": "Quota exceeded",
  "data": {
    "intent_id": "intent-...",
    "tenant_id": "<tenant>",
    "execution_id": null,
    "explanation": "Execution blocked: Insufficient quota remaining",
    "quota_state": {
      "remaining": 0,
      "utilized_percent": 100
    },
    "cost": null,
    "attestation": null
  }
}
```

**Validation:**
- [ ] `success` = false
- [ ] `execution_id` = null (blocked before execution)
- [ ] `quota_state.remaining` = 0
- [ ] `explanation` includes "quota"
- [ ] No cost recorded
- [ ] No attestation recorded

---

### Test Case 4: Integration Adapter Execution

**Requirement:** Identify one real adapter and prove it executes

**Candidate adapters:**
- State Graph write adapter
- Workspace file operation adapter
- External API adapter (if any)

**Validation:**
- [ ] Adapter receives execution request
- [ ] Adapter preserves `tenant_id` in context
- [ ] Adapter executes successfully
- [ ] Adapter result returned to Intent Gateway
- [ ] Side effect observable (State Graph change, file created, API called)
- [ ] Execution recorded in ledger

---

## State Graph Validation Queries

**After test execution:**

```sql
-- Check tenant attribution
SELECT tenant_id, COUNT(*) as executions
FROM execution_ledger_summary
WHERE created_at > datetime('now', '-1 hour')
GROUP BY tenant_id;
-- Verify: no 'system' leakage for user operations

-- Check cost tracking
SELECT 
  e.execution_id,
  e.tenant_id,
  e.status,
  c.total_cost,
  a.status as attestation_status
FROM execution_ledger_summary e
LEFT JOIN execution_costs c ON e.execution_id = c.execution_id
LEFT JOIN execution_attestations a ON e.execution_id = a.execution_id
WHERE e.created_at > datetime('now', '-1 hour')
ORDER BY e.created_at DESC;
-- Verify: cost present for success, null for simulation/blocked

-- Check for duplicate attestations
SELECT execution_id, COUNT(*) as attestation_count
FROM execution_attestations
GROUP BY execution_id
HAVING COUNT(*) > 1;
-- Verify: NO ROWS (UNIQUE constraint enforced)

-- Check quota consumption
SELECT tenant_id, SUM(reserved_units) as total_reserved
FROM quota_reservations
WHERE status = 'committed'
GROUP BY tenant_id;
-- Verify: quota tracking accurate
```

---

## UI Validation

**Browser console UI:**

1. Navigate to Executions view
2. Find test execution
3. Verify display shows:
   - [ ] Execution ID
   - [ ] Tenant ID
   - [ ] Status (success/failed/blocked)
   - [ ] Cost (if applicable)
   - [ ] Attestation status (if applicable)
   - [ ] Timestamp

4. Click into execution detail
5. Verify detail view shows:
   - [ ] Full governance context
   - [ ] Explanation
   - [ ] Ledger events
   - [ ] Integration adapter result (if applicable)

---

## Success Criteria

**Phase 28 can be marked COMPLETE when:**

✅ One integration adapter proven live in production  
✅ Tenant context preserved end-to-end  
✅ Quota/budget enforcement validated  
✅ Cost recording validated (present for success, absent for simulation/blocked)  
✅ Attestation linking validated (linked for success, absent/blocked for simulation/blocked)  
✅ Results visible in API responses  
✅ Results visible in console UI  
✅ State Graph persistence validated  
✅ No duplicate side effects  
✅ No cross-tenant leakage  

**Until then:** Phase 28 status = ⏸️ CODE EXISTS, NOT YET PROVEN

---

## Next Steps After Phase 28 Validation

**See:** `POST_PHASE_28_PLAN.md`

1. Finalize phase classification
2. Decide on Phase 26.2+ (finish or defer)
3. Remove dead paths
4. Lock canonical execution path
5. Run final production certification
6. Freeze architecture
7. Shift to product mode
