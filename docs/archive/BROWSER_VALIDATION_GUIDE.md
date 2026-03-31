# Browser Validation Guide

**Status:** Validation endpoint deployed  
**Production URL:** `https://vienna-os.fly.dev`  
**Console URL:** `https://console.regulator.ai`

---

## Prerequisites

### 1. Set Operator Password (CRITICAL)

The password must be set as a Fly secret. **Run this from a machine with Fly CLI installed:**

```bash
fly secrets set VIENNA_OPERATOR_PASSWORD="P@rrish1922" -a vienna-os
fly deploy -a vienna-os
```

### 2. Verify Authentication

```bash
curl -X POST https://vienna-os.fly.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"P@rrish1922"}'
```

Expected response:
```json
{
  "success": true,
  "session": { ... }
}
```

---

## Validation Workflow

### Step 1: Open Console

Navigate to: `https://console.regulator.ai`

Login with password: `P@rrish1922`

---

### Step 2: Test Cases

For **each** of the following 5 cases, you will:

1. Perform the action in the UI
2. Observe the result
3. Copy the response (from network tab or UI display)
4. Log it via the validation endpoint

---

### Case 1: Success Execution

**Action:** Execute a simple intent (e.g., "list services", "check health")

**Expected UI elements:**
- ✅ Tenant attribution
- ✅ Explanation text
- ✅ Cost display
- ✅ Attestation status

**Log the result:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "success",
    "result": "pass",
    "details": {
      "tenant_id": "...",
      "execution_id": "...",
      "cost": "...",
      "attestation_status": "..."
    },
    "ui_observation": "Shows tenant, explanation, cost, and attestation correctly"
  }'
```

---

### Case 2: Simulation Mode

**Action:** Execute with simulation mode enabled (if available in UI)

**Expected UI elements:**
- ✅ Simulation badge/indicator
- ✅ Explanation text
- ❌ NO cost display (simulation is free)
- ❌ NO attestation (simulations aren't attested)

**Log the result:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "simulation",
    "result": "pass",
    "details": {
      "simulation": true,
      "cost": null,
      "attestation": null
    },
    "ui_observation": "Simulation badge shown, no cost or attestation"
  }'
```

---

### Case 3: Quota Block

**Action:** Trigger quota limit (may need to lower quota first or execute multiple times)

**Expected UI elements:**
- ✅ Blocked status
- ✅ Clear reason ("quota exceeded")
- ✅ Quota utilization numbers
- ✅ Available vs required

**Log the result:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "quota",
    "result": "pass",
    "details": {
      "blocked": true,
      "reason": "Insufficient quota",
      "available": -1,
      "utilization": "150%"
    },
    "ui_observation": "Quota block displayed with clear metrics"
  }'
```

---

### Case 4: Budget Block

**Action:** Trigger budget threshold (may require setting low budget)

**Expected UI elements:**
- ✅ Blocked status
- ✅ Cost context
- ✅ Clear explanation

**Log the result:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "budget",
    "result": "pass",
    "details": {
      "blocked": true,
      "reason": "Budget threshold exceeded",
      "cost": "..."
    },
    "ui_observation": "Budget block shown with cost breakdown"
  }'
```

---

### Case 5: Execution Failure

**Action:** Execute an intent that will fail (e.g., invalid action, permission denied)

**Expected UI elements:**
- ✅ Failure explanation
- ✅ No silent crash
- ✅ Attestation status reflects failure

**Log the result:**
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "failure",
    "result": "pass",
    "details": {
      "status": "failed",
      "error": "...",
      "attestation_status": "failed"
    },
    "ui_observation": "Failure handled gracefully, attestation marked failed"
  }'
```

---

## Step 3: Retrieve Results

After logging all cases, retrieve the full validation report:

```bash
curl https://vienna-os.fly.dev/api/v1/validation/results
```

This returns all logged validation entries with timestamps.

---

## Step 4: Persistence Validation

Verify backend data integrity:

### Check tenant attribution

```bash
curl https://vienna-os.fly.dev/api/v1/intents \
  -H "Cookie: vienna_session=..." \
  | jq '.data[] | {execution_id, tenant_id}'
```

### Check cost tracking

```bash
# Verify cost rows exist
# Verify no cost for simulation mode
# Verify cost attribution matches execution
```

### Check attestations

```bash
# Verify attestation rows exist
# Verify one attestation per execution
# Verify no duplicates
# Verify tenant isolation
```

---

## Success Criteria

**All 5 cases must:**
- ✅ Display correctly in UI
- ✅ Log successfully via validation endpoint
- ✅ Store correct data in backend
- ✅ Maintain tenant attribution
- ✅ Preserve audit trail

**Once complete, you have proven:**
- Full governance pipeline operational
- Multi-tenant isolation working
- Cost attribution accurate
- Attestation chain verified
- UI correctly surfaces all states

---

## Next Steps

After validation complete:

1. Review validation results with Vienna
2. Lock final phase classification
3. Clean dead code paths
4. Freeze architecture
5. Schedule post-deployment audit

---

## Notes

- **Password must be set via Fly secrets** (not hardcoded)
- **Use browser network tab** to inspect full responses
- **Log EVERY case** (even failures are valuable data)
- **Take screenshots** if UI display is critical evidence
- **Document any unexpected behavior**

---

**Last Updated:** 2026-03-23 19:35 EDT
