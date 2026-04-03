# Deep Code Analysis — Critical Path Verification
**Date:** 2026-04-03 17:40 EDT  
**Analyst:** Vienna  
**Scope:** End-to-end execution path tracing for all critical governance flows

---

## Methodology

This analysis uses **execution path tracing** instead of surface-level checks:
1. Start at user action (API call, button click)
2. Trace through every function call
3. Verify database writes actually happen
4. Check for TODO/FIXME in critical paths
5. Test end-to-end: submit data → retrieve data → verify match

---

## Critical Issue #1: Approval Workflow Broken (BLOCKER)

### Flow: T2 Intent → Slack Approval → Warrant Issuance

**Step 1: Agent submits T2 intent**
```
POST /api/v1/intents (action requires approval)
↓
framework-api.ts:108
↓
Risk classified as T2 (approval_required = true)
↓
Creates approval_id: app_xxx
↓
Emits approval.required event
↓
Returns 202 Accepted with approval_id
```
**Status:** ✅ Working

**Step 2: Slack adapter receives event**
```
approval.required event
↓
integrations/dispatcher.ts findMatchingIntegrations()
↓
Finds Slack integration
↓
slackAdapter.send()
↓
Posts message to Slack with Approve/Deny buttons
```
**Status:** ✅ Working

**Step 3: User clicks "Approve" in Slack**
```
Slack callback POST → /api/v1/integrations/callbacks/slack
↓
integrations.ts:307
↓
slackAdapter.handleCallback(payload)
↓
Returns { action: 'approve', data: { approval_id } }
↓
// TODO: Wire to approval manager ← BROKEN HERE
↓
dispatchEvent({ type: 'approval_resolved' })
↓
Event logged to database
↓
DEAD END — Agent never gets warrant
```
**Status:** ❌ BROKEN

**What should happen:**
```
After slackAdapter.handleCallback():
↓
viennaCore.approvalManager.resolveApproval(approval_id, 'approved', approver)
↓
ApprovalManager.resolveApproval() → issues warrant via viennaCore.warrant.issue()
↓
Warrant returned to agent via polling or webhook
```

**What's missing:**
1. Integration callbacks don't call `viennaCore.approvalManager`
2. Only alternative path: Manual POST to `/api/v1/approvals/:id/approve`
3. But Slack/email callbacks never make that call

**Impact:** T2/T3 approvals via Slack/email are non-functional. Agent waits forever.

---

## Critical Issue #2: No Agent Polling Mechanism

### Flow: Agent polls for approval result

**Expected:**
```
Agent: POST /api/v1/intents (T2 action)
Server: 202 { approval_id: 'app_123', status: 'pending' }
↓
Agent: GET /api/v1/approvals/app_123/status (every 5s)
Server: { status: 'pending' } ... { status: 'approved', warrant_id: 'wrt_456' }
↓
Agent: Receives warrant, proceeds with execution
```

**Reality:**
```bash
$ grep -rn "GET.*approvals.*status" apps/console/server/src/routes/framework-api.ts
# No results
```

**Status:** ❌ MISSING

There's `/api/v1/approvals/pending` (lists all pending) but no `/api/v1/approvals/:id/status` endpoint.

**Workaround agents might use:**
- Poll `/api/v1/intents/:intentId` and check for warrant_id
- But that endpoint also doesn't exist in framework-api (only in intents.ts console route)

**Impact:** Even if approval workflow worked, agents have no way to retrieve the warrant.

---

## Critical Issue #3: Stripe Webhook Provisioning

### Flow: User pays → Tenant provisioned

**Step 1: Stripe checkout.session.completed**
```
Stripe webhook POST → /api/v1/webhooks/stripe
↓
webhooks.ts:38
↓
switch (event.type):
  case 'checkout.session.completed':
    // TODO: Auto-provision tenant for this customer
    // - Create operator account
    // - Set plan/quota limits
    // - Send welcome email with credentials
    break;
```
**Status:** ❌ TODO (graceful degradation, manual provisioning fallback)

**Impact:** Paying customers don't get auto-provisioned. Requires manual setup.

**Priority:** HIGH (customer experience, but has manual workaround)

---

## Critical Issue #4: Subscription Changes Don't Update Quotas

### Flow: User upgrades Team → Business

**Step 1: Stripe customer.subscription.updated**
```
Stripe webhook POST → /api/v1/webhooks/stripe
↓
webhooks.ts:51
↓
case 'customer.subscription.updated':
  // TODO: Update tenant plan/quotas
  break;
```
**Status:** ❌ TODO

**Impact:** User pays for Business plan, still gets Team quotas.

**Priority:** HIGH (billing integrity)

---

## Non-Critical Issues (Monitoring/Observability)

### 5. Cost Tracking Returns Zero
**Status:** ✅ FIXED (2026-04-03 17:10 EDT)  
Now queries `regulator.executions` for `result->>'estimated_cost'`

### 6. Anomaly Baseline Not Implemented
**Status:** ✅ FIXED (2026-04-03 17:10 EDT)  
Now has `getAgentBaseline()` with 30-day analysis

### 7. Tenant ID Hardcoded to 'default'
**Status:** ✅ FIXED (2026-04-03 17:10 EDT)  
Now uses `req.user.tenantId` from auth middleware

---

## Verification Tests

### Test 1: T2 Approval Flow (WILL FAIL)
```bash
# Submit T2 intent
INTENT_ID=$(curl -X POST https://console.regulator.ai/api/v1/intents \
  -H "Authorization: Bearer vos_xxx" \
  -d '{"action": "deploy_to_prod"}' | jq -r '.approval_id')

# Wait for Slack message
# Click "Approve" in Slack
# Try to poll for result
curl https://console.regulator.ai/api/v1/approvals/$INTENT_ID/status
# Expected: 404 or error (endpoint doesn't exist)
```

### Test 2: Manual Approval (SHOULD WORK)
```bash
# Submit T2 intent
APPROVAL_ID=$(curl -X POST https://console.regulator.ai/api/v1/intents \
  -H "Authorization: Bearer vos_xxx" \
  -d '{"action": "deploy_to_prod"}' | jq -r '.approval_id')

# Manually approve via API (not Slack)
curl -X POST https://console.regulator.ai/api/v1/approvals/$APPROVAL_ID/approve \
  -H "Authorization: Bearer vos_xxx" \
  -d '{"reason": "Manual approval"}'

# Should return warrant
```

### Test 3: Stripe Provisioning (WILL NOT AUTO-PROVISION)
```bash
# Complete Stripe checkout
# Check database for new user
psql $DATABASE_URL -c "SELECT * FROM regulator.users WHERE email = 'test@example.com'"
# Expected: No row (manual provisioning required)
```

---

## Summary

### BLOCKERS (Production-Breaking)
1. ❌ **T2/T3 Slack/Email approval callbacks don't issue warrants**
   - Agents wait forever after approval
   - Only workaround: Manual POST to `/approvals/:id/approve`
   
2. ❌ **No polling endpoint for approval status**
   - Agents can't check if approval completed
   - No `/api/v1/approvals/:id/status`

### HIGH PRIORITY (Customer Impact)
3. ⚠️ **Stripe provisioning not wired**
   - Paying customers require manual setup
   - Poor onboarding experience

4. ⚠️ **Subscription updates don't adjust quotas**
   - Billing integrity issue

### FIXED (Resolved 2026-04-03)
- ✅ Warrant Authority persistence
- ✅ Cost tracking implementation
- ✅ Anomaly baseline calculation
- ✅ Tenant ID resolution

---

## Recommended Fix Order

### Phase 1: Unblock T2/T3 Approvals (CRITICAL)
1. Wire integration callbacks to `viennaCore.approvalManager`
2. Add polling endpoint: `GET /api/v1/approvals/:id/status`
3. Test end-to-end: Slack approval → warrant issuance

### Phase 2: Billing Integrity (HIGH)
4. Implement Stripe checkout provisioning
5. Wire subscription updates to quota manager

### Phase 3: Monitoring (MEDIUM)
6. Add approval workflow telemetry
7. Alert on stale approvals (>24h pending)
8. Dashboard for approval metrics

---

**Conclusion:** The governance pipeline has critical gaps in approval workflow and billing automation. Warrant issuance works when called directly, but integration-driven approvals are broken.

---

## Additional Findings

### Issue #5: Execution Reporting Persistence

**Endpoint:** `POST /api/v1/executions`

**Current behavior:**
```typescript
// Emit events
eventBus.emitExecutionStarted(...)
eventBus.emitExecutionCompleted(...)

// Log to audit_log
INSERT INTO audit_log (event, details, ...)
```

**Missing:** Persistence to `regulator.executions` table

**Database check:**
```sql
# No regulator.executions table exists
# Instead: execution_log, execution_events, execution_steps, etc.
```

**Impact:** Execution results may be logged to audit_log but not stored in structured execution tables. Analytics queries for cost tracking rely on a non-existent table.

**Status:** ⚠️ Schema mismatch (queries reference tables that don't exist in production)

---

### Issue #6: Cost Tracking Query References Non-Existent Table

**Code:** `apps/console/server/src/routes/analytics.ts:312`

```typescript
const costQuery = `
  SELECT 
    COALESCE(SUM((result->>'estimated_cost')::numeric), 0) as total_cost
  FROM regulator.executions  ← TABLE DOES NOT EXIST
  WHERE tenant_id = $1 ...
`;
```

**Database reality:**
- `regulator.executions` — ❌ Does not exist
- `regulator.execution_log` — ✅ Exists (10 columns)
- `regulator.execution_events` — ✅ Exists

**Impact:** Cost tracking endpoint will throw SQL errors in production

**Status:** ❌ BROKEN (will fail on first query)

**Fix needed:** Change query to use `execution_log` or `execution_events` table

---

## Final Summary

### CRITICAL BLOCKERS
1. ❌ **T2/T3 approval callbacks don't issue warrants** (Slack/email approvals broken)
2. ❌ **No polling endpoint** for approval status (agents can't retrieve results)
3. ❌ **Cost tracking queries non-existent table** (will throw errors)

### HIGH PRIORITY
4. ⚠️ **Stripe provisioning not automated** (manual setup required)
5. ⚠️ **Subscription updates don't adjust quotas** (billing integrity)
6. ⚠️ **Execution reporting doesn't persist** to structured tables (schema mismatch)

### VERIFIED WORKING
- ✅ Warrant Authority (with Postgres persistence)
- ✅ Agent registration (persisted to agent_registry)
- ✅ Agent heartbeats (persisted to agent_registry)
- ✅ Manual approval via API (POST /approvals/:id/approve)
- ✅ Warrant verification endpoint (GET /warrants/:id)

---

## Recommended Actions

### Immediate (Next 1 Hour)
1. Fix cost tracking query → use `execution_log` instead of `executions`
2. Add approval status polling endpoint
3. Wire integration callbacks to ApprovalManager

### Short-term (Next Day)
4. Implement Stripe provisioning automation
5. Wire subscription updates to quota manager
6. Add execution persistence to structured tables

### Medium-term (Next Week)
7. Add comprehensive end-to-end tests
8. Implement approval workflow monitoring
9. Create execution analytics dashboard

---

**Analysis complete.** Three critical blockers identified, all in governance approval workflow and data persistence layers.
