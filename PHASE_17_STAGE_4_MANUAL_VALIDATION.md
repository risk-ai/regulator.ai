# Phase 17 Stage 4 — Manual Browser Validation

**Status:** READY FOR OPERATOR TESTING  
**Time:** 2026-03-19 15:30 EDT  
**Test Approval Created:** `appr_manual_1773946923226`

---

## Test Approval Details

**Approval ID:** `appr_manual_1773946923226`  
**Plan ID:** `plan_manual_1773946923225`  
**Execution ID:** `exec_manual_1773946923225`  
**Status:** pending  
**Tier:** T1  
**Action:** Restart openclaw-gateway for manual validation  
**Risk Summary:** T1 service restart requires operator approval per policy P-001  
**Target Entities:** `target:service:openclaw-gateway`  
**Estimated Duration:** 5000ms  
**Expires:** 2026-03-19T20:02:03.226Z (1 hour from creation)

---

## Dashboard URL

**http://localhost:5174/#approvals**

---

## Manual Validation Checklist

### Scenario 1: Happy Path (Approval → Execution)

- [ ] **Step 1:** Open dashboard, navigate to Approvals tab
- [ ] **Step 2:** Verify approval appears in pending list
- [ ] **Step 3:** Verify T1 badge (blue), action summary visible
- [ ] **Step 4:** Click approval card → detail modal opens (if implemented)
- [ ] **Step 5:** Verify risk summary, targets, expiry visible
- [ ] **Step 6:** Click **Approve** button
- [ ] **Step 7:** Verify status changes to "approved"
- [ ] **Step 8:** Verify approved approval no longer in pending list
- [ ] **Step 9:** Check **All** tab → approved approval visible with green badge
- [ ] **Step 10:** API verification:
  ```bash
  curl http://localhost:3100/api/v1/approvals/appr_manual_1773946923226
  ```

**Expected API response:**
```json
{
  "approval_id": "appr_manual_1773946923226",
  "status": "approved",
  "required_tier": "T1",
  "reviewed_by": "<operator-identity>",
  "reviewed_at": "<timestamp>",
  ...
}
```

---

### Scenario 2: Denial Path

**Create second test approval:**
```bash
cd /home/maxlawai/.openclaw/workspace/vienna-core && node << 'EOF'
const { getStateGraph } = require('./lib/state/state-graph');

async function setup() {
  process.env.VIENNA_ENV = 'prod';
  const stateGraph = await getStateGraph();
  await stateGraph.initialize();
  
  const planId = 'plan_manual_denial_' + Date.now();
  const executionId = 'exec_manual_denial_' + Date.now();
  const intentId = 'intent_manual_denial_' + Date.now();
  
  const steps = JSON.stringify([{
    step_id: 'step_1',
    action_type: 'restart_service',
    target_id: 'target:service:test-service',
    description: 'Restart test service (for denial test)'
  }]);
  
  stateGraph.db.prepare(`
    INSERT INTO plans (
      plan_id, intent_id, objective, steps, status, risk_tier, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    planId, intentId, 'Denial test approval', steps, 'pending', 'T1',
    new Date().toISOString()
  );
  
  const now = new Date().toISOString();
  stateGraph.db.prepare(`
    INSERT INTO execution_ledger_summary (
      execution_id, plan_id, actor_type, actor_id, environment,
      risk_tier, objective, target_type, target_id,
      current_stage, execution_status, approval_required, approval_status,
      started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    executionId, planId, 'system', 'manual-validation', 'prod',
    'T1', 'Denial test', 'service', 'test-service',
    'policy', 'pending', 1, 'pending',
    now, now, now
  );
  
  const approvalId = 'appr_manual_denial_' + Date.now();
  const expires = new Date(Date.now() + 3600000).toISOString();
  
  stateGraph.db.prepare(`
    INSERT INTO approval_requests (
      approval_id, execution_id, plan_id, step_id, intent_id,
      required_tier, required_by, status,
      requested_at, requested_by, expires_at,
      action_summary, risk_summary, target_entities,
      estimated_duration_ms, rollback_available,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId, executionId, planId, 'step_1', intentId,
    'T1', 'policy-engine', 'pending',
    now, 'manual-validation', expires,
    'Restart test-service for denial test',
    'T1 service restart requires operator approval',
    JSON.stringify(['target:service:test-service']),
    5000, 0,
    now, now
  );
  
  console.log('Second approval created:', approvalId);
}

setup().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
EOF
```

**Then test denial flow:**

- [ ] **Step 1:** Verify second approval appears in pending list
- [ ] **Step 2:** Click **Deny** button
- [ ] **Step 3:** Verify denial reason input appears (if implemented)
- [ ] **Step 4:** Enter reason: "Test service restart not authorized"
- [ ] **Step 5:** Submit denial
- [ ] **Step 6:** Verify status changes to "denied"
- [ ] **Step 7:** Verify denied approval no longer in pending list
- [ ] **Step 8:** Check **All** tab → denied approval visible with red badge
- [ ] **Step 9:** Verify denial reason displayed
- [ ] **Step 10:** API verification:
  ```bash
  curl http://localhost:3100/api/v1/approvals/<denial_approval_id>
  ```

**Expected API response:**
```json
{
  "status": "denied",
  "reviewed_by": "<operator-identity>",
  "reviewed_at": "<timestamp>",
  "decision_reason": "Test service restart not authorized",
  ...
}
```

---

### Scenario 3: Expiry Handling

**Create short-expiry test approval:**
```bash
# Modify expires_at to be 1 minute from now
# Then wait 1 minute, verify:
```

- [ ] **Step 1:** Approval appears with "Expires in <1m" warning
- [ ] **Step 2:** Wait for expiry
- [ ] **Step 3:** Verify approval status changes to "expired" (auto-refresh or manual refresh)
- [ ] **Step 4:** Verify expired approval is read-only (buttons disabled)
- [ ] **Step 5:** Verify expired approval moves to resolved/expired section

---

### Scenario 4: Concurrent Approvals

- [ ] **Step 1:** Create 3 test approvals (T1, T1, T2)
- [ ] **Step 2:** Verify all 3 appear in pending list
- [ ] **Step 3:** Filter by T1 → verify 2 T1 approvals shown
- [ ] **Step 4:** Filter by T2 → verify 1 T2 approval shown
- [ ] **Step 5:** Approve T1 approval #1
- [ ] **Step 6:** Deny T1 approval #2
- [ ] **Step 7:** Verify T2 approval still pending (independent state)
- [ ] **Step 8:** Approve T2 approval
- [ ] **Step 9:** Verify final states: 2 approved, 1 denied

---

### Scenario 5: UI Behavior

- [ ] **Empty state:** If no pending approvals, verify empty state message
- [ ] **Auto-refresh:** Verify list updates every 10s (watch expiry countdown)
- [ ] **Expiry warning:** Verify <5min approvals highlighted
- [ ] **Badge colors:** T1 blue, T2 red
- [ ] **Detail context:** Risk summary, targets, estimated duration visible
- [ ] **Error handling:** Test with invalid approval ID, verify graceful error
- [ ] **Loading states:** Verify loading spinner during approve/deny
- [ ] **Toast notifications:** Verify success/error toast on approve/deny

---

## API Validation

**List pending approvals:**
```bash
curl http://localhost:3100/api/v1/approvals?status=pending
```

**Get approval detail:**
```bash
curl http://localhost:3100/api/v1/approvals/<approval_id>
```

**Approve (requires auth):**
```bash
curl -X POST http://localhost:3100/api/v1/approvals/<approval_id>/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>"
```

**Deny (requires auth):**
```bash
curl -X POST http://localhost:3100/api/v1/approvals/<approval_id>/deny \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"reason": "Not authorized at this time"}'
```

---

## Pass Criteria

**Scenario 1 (Happy Path):** PASS if:
- Approval visible in UI
- Approve button works
- Status changes correctly
- API returns approved status

**Scenario 2 (Denial):** PASS if:
- Deny button works
- Denial reason captured
- Status changes correctly
- API returns denied status

**Scenario 3 (Expiry):** PASS if:
- Expiry countdown visible
- Auto-transition to expired
- Read-only after expiry

**Scenario 4 (Concurrent):** PASS if:
- Multiple approvals independent
- Filters work correctly
- State changes isolated

**Scenario 5 (UI):** PASS if:
- Empty states shown
- Auto-refresh works
- Error handling graceful
- Loading states appropriate

---

## Known Limitations

1. **Detail modal:** May not be implemented yet (approval cards inline only)
2. **Operator identity:** Placeholder until auth store integrated
3. **Denial reason:** May be optional in current implementation
4. **Auto-refresh:** Fixed 10s interval (not configurable)

---

## Next Step

**After manual validation completes:**
- Document results in this file (mark checkboxes)
- Note any failures or unexpected behavior
- Proceed to Step 2: Fix automated test suite

---

**Status:** AWAITING OPERATOR VALIDATION
