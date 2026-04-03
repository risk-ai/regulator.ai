# Governance Pipeline — Comprehensive Fix Plan
**Date:** 2026-04-03 17:52 EDT  
**Coordinators:** Vienna (Technical) + Aiden (COO/Marketing)  
**Priority:** Critical → High → Medium → Low

---

## Overview

**Total Issues:** 13 (6 new + 7 already fixed)  
**Critical Blockers:** 3  
**High Priority:** 3  
**Already Fixed:** 7  

**Estimated Total Time:** 6-8 hours  
**Team Split:** Vienna (backend/governance), Aiden (billing/provisioning)

---

## PHASE 1: CRITICAL BLOCKERS (2-3 hours)

These break core governance functionality. Must fix before launch can succeed.

### Issue #1: Approval Callbacks Don't Issue Warrants ⚠️ BLOCKER
**Severity:** CRITICAL  
**Impact:** T2/T3 agents wait forever after Slack/email approval  
**Owner:** Vienna  
**Estimated Time:** 1.5 hours

**Problem:**
```typescript
// apps/console/server/src/routes/integrations.ts:320
if (result.action === 'approve' || result.action === 'deny') {
  // TODO: Wire to approval manager ← ONLY DISPATCHES EVENT
  await dispatchEvent({ type: 'approval_resolved', ... });
}
```

**Fix:**
```typescript
// 1. Get viennaCore from app.locals
const viennaCore = req.app.locals.viennaCore;

// 2. Find the approval details from audit_log
const approval = await queryOne(
  `SELECT details FROM audit_log 
   WHERE event = 'approval.required' AND details->>'approval_id' = $1`,
  [result.data.approval_id]
);

// 3. Issue warrant via Warrant Authority
const warrant = await viennaCore.warrant.issue({
  truthSnapshotId: `truth_${approval.intent_id}`,
  planId: approval.intent_id,
  approvalId: result.data.approval_id,
  objective: approval.action,
  riskTier: approval.risk_tier,
  allowedActions: [approval.action],
  expiresInMinutes: approval.risk_tier === 'T2' ? 15 : 5,
  issuer: result.data.reviewed_by,
});

// 4. Emit events
eventBus.emitIntentApproved({
  intent_id: approval.intent_id,
  warrant_id: warrant.warrant_id,
  approved_by: result.data.reviewed_by,
  risk_tier: approval.risk_tier,
}, tenantId);

// 5. Return warrant in response (if agent is polling)
```

**Files to change:**
- `apps/console/server/src/routes/integrations.ts` (lines 320, 363)

**Testing:**
```bash
# Submit T2 intent
curl -X POST /api/v1/intents -d '{"action":"deploy_to_prod"}'
# Click Approve in Slack
# Verify warrant issued (check database)
```

**Dependencies:** None (viennaCore.warrant already wired)

---

### Issue #2: No Approval Status Polling Endpoint ⚠️ BLOCKER
**Severity:** CRITICAL  
**Impact:** Agents can't check if approval completed  
**Owner:** Vienna  
**Estimated Time:** 45 minutes

**Problem:**
Agents submit T2 intent, get `approval_id`, but have no way to poll for result.

**Fix:**
Add new endpoint:
```typescript
// apps/console/server/src/routes/framework-api.ts

/**
 * GET /api/v1/approvals/:approvalId/status
 * Poll approval status and retrieve warrant if approved.
 */
router.get('/approvals/:approvalId/status', async (req, res) => {
  const { approvalId } = req.params;
  const tenantId = (req as any).tenantId || 'default';

  // Check audit_log for resolution
  const resolution = await queryOne(
    `SELECT event, details, created_at 
     FROM audit_log
     WHERE (event = 'intent.approved' OR event = 'intent.denied')
       AND details->>'approval_id' = $1
       AND tenant_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [approvalId, tenantId]
  );

  if (!resolution) {
    // Still pending
    return res.json({
      success: true,
      approval_id: approvalId,
      status: 'pending',
      message: 'Awaiting human approval',
    });
  }

  const details = typeof resolution.details === 'string' 
    ? JSON.parse(resolution.details) 
    : resolution.details;

  if (resolution.event === 'intent.approved') {
    // Approved — return warrant
    return res.json({
      success: true,
      approval_id: approvalId,
      status: 'approved',
      warrant_id: details.warrant_id,
      approved_by: details.approved_by,
      approved_at: resolution.created_at,
    });
  } else {
    // Denied
    return res.json({
      success: true,
      approval_id: approvalId,
      status: 'denied',
      reason: details.reason || 'Rejected by operator',
      denied_by: details.denied_by,
      denied_at: resolution.created_at,
    });
  }
});
```

**Files to change:**
- `apps/console/server/src/routes/framework-api.ts` (add new route)

**Testing:**
```bash
# Submit T2 intent
APPROVAL_ID=$(curl -X POST /api/v1/intents ... | jq -r '.approval_id')

# Poll (should be pending)
curl /api/v1/approvals/$APPROVAL_ID/status
# -> { "status": "pending" }

# Approve in Slack
# Poll again (should have warrant)
curl /api/v1/approvals/$APPROVAL_ID/status
# -> { "status": "approved", "warrant_id": "wrt_xxx" }
```

**Dependencies:** Requires Issue #1 fixed first

---

### Issue #3: Cost Tracking Queries Non-Existent Table ⚠️ BLOCKER
**Severity:** CRITICAL  
**Impact:** Cost analytics endpoint will crash with SQL error  
**Owner:** Vienna  
**Estimated Time:** 30 minutes

**Problem:**
```typescript
// apps/console/server/src/routes/analytics.ts:312
FROM regulator.executions  ← DOES NOT EXIST
```

**Database reality:**
```sql
-- Tables that exist:
regulator.execution_log         ✅
regulator.execution_events      ✅
regulator.execution_steps       ✅
regulator.audit_log             ✅

-- Table that doesn't exist:
regulator.executions            ❌
```

**Fix:**
```typescript
// Change query to use execution_log
const costQuery = `
  SELECT 
    COALESCE(SUM((metadata->>'estimated_cost')::numeric), 0) as total_cost,
    COUNT(*) as execution_count
  FROM regulator.execution_log
  WHERE created_at >= $1
    AND created_at < $2
    AND metadata IS NOT NULL
    AND metadata->>'estimated_cost' IS NOT NULL
`;

// If execution_log doesn't have cost data, use audit_log instead:
const costQuery = `
  SELECT 
    COALESCE(SUM((details->>'estimated_cost')::numeric), 0) as total_cost,
    COUNT(*) as execution_count
  FROM regulator.audit_log
  WHERE event = 'execution.completed'
    AND created_at >= $1
    AND created_at < $2
    AND details->>'estimated_cost' IS NOT NULL
`;
```

**Files to change:**
- `apps/console/server/src/routes/analytics.ts` (lines 312, 336)

**Testing:**
```bash
# Call cost analytics endpoint
curl /api/v1/analytics/costs?period=7d
# Should return data without SQL errors
```

**Dependencies:** Need to verify which table actually stores cost data

---

## PHASE 2: HIGH PRIORITY (2-3 hours)

Customer-facing issues that impact billing and onboarding.

### Issue #4: Stripe Provisioning Not Automated
**Severity:** HIGH  
**Impact:** Paying customers require manual setup  
**Owner:** Aiden (COO/Marketing)  
**Estimated Time:** 2 hours

**Problem:**
```typescript
// apps/console/server/src/routes/webhooks.ts:42
case 'checkout.session.completed':
  // TODO: Auto-provision tenant for this customer
  break;
```

**Fix:**
```typescript
case 'checkout.session.completed':
  const session = event.data.object;
  const customerEmail = session.customer_details?.email;
  const customerId = session.customer;
  
  // 1. Generate temp password
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
  // 2. Create user
  const user = await queryOne(
    `INSERT INTO regulator.users (email, hashed_password, created_at)
     VALUES ($1, $2, NOW())
     RETURNING id`,
    [customerEmail, hashedPassword]
  );
  
  // 3. Create organization
  const planName = session.metadata?.plan || 'team';
  await execute(
    `INSERT INTO regulator.organizations (owner_id, name, plan, stripe_customer_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [user.id, customerEmail.split('@')[0], planName, customerId]
  );
  
  // 4. Send welcome email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vienna OS <noreply@regulator.ai>',
      to: customerEmail,
      subject: 'Welcome to Vienna OS',
      html: `
        <h1>Welcome to Vienna OS</h1>
        <p>Your account has been created!</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Login at: https://console.regulator.ai</p>
        <p>Please change your password immediately.</p>
      `,
    }),
  });
  
  break;
```

**Files to change:**
- `apps/console/server/src/routes/webhooks.ts`

**Testing:**
```bash
# Complete Stripe test checkout
# Check email for welcome message
# Login with temp password
```

**Dependencies:** Requires `RESEND_API_KEY` env var

---

### Issue #5: Subscription Updates Don't Adjust Quotas
**Severity:** HIGH  
**Impact:** User upgrades, still gets old plan limits  
**Owner:** Aiden (COO/Marketing)  
**Estimated Time:** 1 hour

**Problem:**
```typescript
// apps/console/server/src/routes/webhooks.ts:55
case 'customer.subscription.updated':
  // TODO: Update tenant plan/quotas
  break;
```

**Fix:**
```typescript
case 'customer.subscription.updated':
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const priceId = subscription.items.data[0]?.price.id;
  
  // Map price ID to plan name
  const planMap = {
    [process.env.STRIPE_PRICE_TEAM_MONTHLY]: 'team',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY]: 'business',
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
  };
  
  const newPlan = planMap[priceId] || 'team';
  
  // Update organization plan
  await execute(
    `UPDATE regulator.organizations
     SET plan = $1, updated_at = NOW()
     WHERE stripe_customer_id = $2`,
    [newPlan, customerId]
  );
  
  console.log(`[Stripe] Updated ${customerId} to ${newPlan} plan`);
  break;

case 'customer.subscription.deleted':
  const deletedSub = event.data.object;
  const deletedCustomerId = deletedSub.customer;
  
  // Downgrade to free or deactivate
  await execute(
    `UPDATE regulator.organizations
     SET plan = 'free', status = 'inactive', updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [deletedCustomerId]
  );
  
  console.log(`[Stripe] Deactivated ${deletedCustomerId}`);
  break;
```

**Files to change:**
- `apps/console/server/src/routes/webhooks.ts`

**Testing:**
```bash
# Upgrade subscription in Stripe dashboard
# Verify organization.plan updated
# Downgrade or cancel
# Verify plan changes to 'free' or status='inactive'
```

**Dependencies:** Requires Stripe price ID env vars

---

### Issue #6: Execution Reporting Doesn't Persist to Structured Tables
**Severity:** HIGH  
**Impact:** Execution data not stored for analytics  
**Owner:** Vienna (coordination with Aiden on schema)  
**Estimated Time:** 1.5 hours

**Problem:**
```typescript
// POST /api/v1/executions only logs to audit_log
// No structured persistence to execution_log or execution_events
```

**Fix:**
```typescript
// After validation, persist to execution_log
await execute(
  `INSERT INTO regulator.execution_log (
    execution_id, warrant_id, agent_id, status, output, error, 
    metadata, created_at
   ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
  [
    executionId,
    warrant_id,
    agent_id,
    success ? 'completed' : 'failed',
    output,
    error,
    JSON.stringify(metrics),
  ]
);
```

**Files to change:**
- `apps/console/server/src/routes/framework-api.ts` (POST /executions)

**Testing:**
```bash
# Report execution
curl -X POST /api/v1/executions -d '{
  "warrant_id": "wrt_xxx",
  "success": true,
  "output": "deployed"
}'

# Verify row in execution_log
psql -c "SELECT * FROM regulator.execution_log ORDER BY created_at DESC LIMIT 1"
```

**Dependencies:** Need to verify execution_log schema

---

## PHASE 3: ALREADY FIXED ✅ (0 hours)

These were resolved during earlier fixes. No action needed.

1. ✅ **Warrant Authority not wired** — Fixed with Postgres persistence
2. ✅ **Agent registration not persisted** — Already writes to agent_registry
3. ✅ **Agent heartbeats not tracked** — Already updates last_heartbeat
4. ✅ **Cost tracking stub** — Implemented (but queries wrong table, see #3)
5. ✅ **Anomaly baseline missing** — Implemented getAgentBaseline()
6. ✅ **Tenant ID hardcoded** — Now uses req.user.tenantId
7. ✅ **Chat history stub** — Wired to ChatHistoryService

---

## Timeline & Coordination

### Day 1 (Today): Critical Blockers
**Vienna:**
- [x] Deep code analysis (complete)
- [ ] Issue #1: Wire approval callbacks (1.5h)
- [ ] Issue #2: Add polling endpoint (0.75h)
- [ ] Issue #3: Fix cost query table (0.5h)

**Aiden:**
- [ ] Review fix plan
- [ ] Coordinate on Issue #6 schema
- [ ] Prepare Stripe env vars for Issue #4

**Estimated completion:** 6 PM EDT

### Day 2 (Tomorrow): High Priority
**Vienna:**
- [ ] Issue #6: Execution persistence (1.5h)

**Aiden:**
- [ ] Issue #4: Stripe provisioning (2h)
- [ ] Issue #5: Subscription quota updates (1h)

**Estimated completion:** End of day

---

## Testing Plan

### Smoke Tests (After Phase 1)
```bash
# Test 1: T2 Approval Flow
curl -X POST /api/v1/intents -d '{"action":"deploy_to_prod"}'
# → Get approval_id
# → Approve in Slack
# → Poll /api/v1/approvals/:id/status
# → Should return warrant_id

# Test 2: Cost Analytics
curl /api/v1/analytics/costs?period=7d
# → Should return cost data without SQL errors

# Test 3: Manual Approval
curl -X POST /api/v1/approvals/:id/approve
# → Should issue warrant
```

### Integration Tests (After Phase 2)
```bash
# Test 4: Stripe Provisioning
# → Complete test checkout
# → Verify user created
# → Verify welcome email sent

# Test 5: Subscription Update
# → Upgrade subscription
# → Verify plan updated in DB

# Test 6: Execution Reporting
curl -X POST /api/v1/executions -d '{"warrant_id":"wrt_xxx"}'
# → Verify row in execution_log
```

---

## Risk Mitigation

### Rollback Plan
- All changes feature-flagged or gracefully degraded
- If approval callbacks break: Manual API approval still works
- If provisioning breaks: Manual user creation still possible
- Database changes are additive (no drops)

### Monitoring
- Alert on approval.required events without corresponding intent.approved
- Track approval callback → warrant issuance latency
- Monitor Stripe webhook success rate
- Dashboard for stale approvals (>24h pending)

---

## Communication

### Status Updates
- Post progress to #agent-coordination every 2 hours
- Flag blockers immediately
- Update this doc with completion checkboxes

### Handoff Points
- Vienna → Aiden: Issue #6 schema coordination
- Aiden → Vienna: Stripe env vars for testing
- Both: End-of-day status sync

---

**Total Estimated Time:** 6-8 hours  
**Critical Path:** Issues #1 → #2 → Integration test  
**Target Completion:** Tomorrow EOD  
**Owner:** Vienna (lead), Aiden (billing/customer)
