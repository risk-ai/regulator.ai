# Console Functionality Fixes - Make It Real

**Goal:** Transform console from "looks nice" to "actually useful"  
**Focus:** Core value proposition features that make it worth paying for

---

## Critical Path: Approval Flow (Priority 1)

**Why:** This is THE differentiator - governed agent execution

**Current State:**
- API exists and works (`/api/v1/approvals`)
- Frontend components exist
- BUT: Empty state because no test data

**Fix Plan:**
1. Create realistic approval test data
2. Wire approve/deny buttons properly  
3. Add real-time SSE updates
4. Show approval history

**Action Items:**
```bash
# 1. Create test approvals in database
# 2. Verify buttons trigger API calls
# 3. Add optimistic UI updates
# 4. Show success/error states clearly
```

---

## Fix #1: Seed Real Approval Data

Create database seeder:

```sql
-- Insert test approvals for demo
INSERT INTO approval_requests (
  approval_id,
  tenant_id,
  agent_id,
  action_type,
  action_summary,
  required_tier,
  status,
  requested_by,
  requested_at,
  expires_at,
  metadata
) VALUES
  (
    'appr_001_deploy_prod',
    (SELECT id FROM tenants LIMIT 1),
    'agent_alpha',
    'deploy_to_production',
    'Deploy version 2.1.0 to production environment',
    'T2',
    'pending',
    'agent_alpha@vienna.ai',
    NOW() - INTERVAL '5 minutes',
    NOW() + INTERVAL '1 hour',
    '{"environment": "production", "version": "2.1.0", "risk_score": 8.5}'::jsonb
  ),
  (
    'appr_002_delete_data',
    (SELECT id FROM tenants LIMIT 1),
    'agent_beta',
    'delete_customer_data',
    'Delete inactive customer records (GDPR request)',
    'T2',
    'pending',
    'agent_beta@vienna.ai',
    NOW() - INTERVAL '15 minutes',
    NOW() + INTERVAL '2 hours',
    '{"record_count": 127, "reason": "GDPR deletion request", "customer_id": "cust_983"}'::jsonb
  ),
  (
    'appr_003_budget_override',
    (SELECT id FROM tenants LIMIT 1),
    'agent_gamma',
    'exceed_budget',
    'Request budget override for Q4 campaign ($25k → $40k)',
    'T1',
    'pending',
    'agent_gamma@vienna.ai',
    NOW() - INTERVAL '2 minutes',
    NOW() + INTERVAL '4 hours',
    '{"current_budget": 25000, "requested_budget": 40000, "campaign": "Q4_launch"}'::jsonb
  );
```

---

## Fix #2: Make Fleet Management Functional

**Current:** FleetPremium shows empty agent grid  
**Fix:** Wire to real `/api/v1/fleet/agents` endpoint

**AgentDetailPage needs:**
- Suspend/activate buttons that work
- Real-time status updates
- Edit agent settings modal
- Trust score history chart (not mock data)

**Code Changes:**
```tsx
// FleetPremium.tsx - Add real agent actions
async function handleSuspendAgent(agentId: string) {
  try {
    await apiClient.put(`/agents/${agentId}`, { status: 'suspended' });
    addToast('Agent suspended', 'success');
    await loadAgents(); // Refresh
  } catch (err) {
    addToast('Failed to suspend agent', 'error');
  }
}
```

---

## Fix #3: Policy Builder - Actually Save Policies

**Current:** PolicyBuilderPage doesn't persist  
**Fix:** Wire create/update/delete to `/api/v1/policies`

**Missing functionality:**
1. Save new policy → POST /policies
2. Update policy → PATCH /policies/:id
3. Delete policy → DELETE /policies/:id
4. Test policy → POST /policies/:id/test

**Code Changes:**
```tsx
// PolicyBuilderPage.tsx - Add save functionality
async function handleSavePolicy(policy: PolicyRule) {
  try {
    if (policy.id) {
      await updatePolicy(policy.id, policy);
      addToast('Policy updated', 'success');
    } else {
      await createPolicy(policy);
      addToast('Policy created', 'success');
    }
    await loadPolicies();
  } catch (err) {
    addToast('Failed to save policy', 'error');
  }
}
```

---

## Fix #4: Real-Time Event Stream

**Current:** GovernanceLivePage connects but shows nothing  
**Fix:** Generate test events, show real governance pipeline

**Seed test events:**
```javascript
// POST /api/v1/events/test
{
  "type": "intent.submitted",
  "data": {
    "intent_id": "int_001",
    "agent_id": "agent_alpha",
    "action": "deploy_to_production"
  }
}
```

**Make SSE work:**
1. Backend already has `/api/v1/events` SSE endpoint
2. Frontend `useEventStream` hook exists
3. Need to: Generate realistic test events
4. Show in real-time on GovernanceLivePage

---

## Fix #5: Remove "AI-Generated" Feel

**Specific Changes:**

### 1. Replace Generic Placeholders
❌ "Configure your integrations to get started"  
✅ "Connect Slack to get approval notifications in #governance"

❌ "No data available"  
✅ "No approvals pending - all agents operating within policy"

❌ "Coming soon"  
✅ Remove the feature or make it work

### 2. Add Real Guidance
Every empty state needs:
- Specific next action
- Example of what will appear
- Link to docs

Example:
```tsx
<EmptyState
  title="No Approval Requests"
  description="Approvals appear when agents request T1/T2 actions"
  action={{
    label: "Test approval flow",
    onClick: () => submitTestIntent()
  }}
  help={{
    text: "Learn about approval tiers",
    link: "/docs/approval-tiers"
  }}
/>
```

### 3. Show Real Metrics
Replace fake sparklines with:
- Actual data from database
- "Not enough data yet" if empty
- "Last 7 days" vs "Last 30 days" comparisons

### 4. Add User-Specific Content
Instead of generic dashboard:
- "Your team has 3 agents active"
- "You approved 12 requests this week"
- "2 policies created by you"

---

## Fix #6: Integration Setup (Make It Work)

**Current:** IntegrationsPage shows mock Slack/webhook cards  
**Fix:** Real Slack OAuth + webhook CRUD

**Slack Integration Flow:**
1. Click "Add Slack"
2. OAuth flow → `https://slack.com/oauth/v2/authorize`
3. Callback → Save tokens to database
4. Test notification button actually sends message
5. Show real channel list

**Webhook Integration:**
```tsx
// Real webhook setup
async function createWebhook(config: WebhookConfig) {
  const webhook = await apiClient.post('/integrations', {
    type: 'webhook',
    name: config.name,
    config: {
      url: config.url,
      events: config.events,
      headers: config.headers
    }
  });
  
  // Test webhook
  await apiClient.post(`/integrations/${webhook.id}/test`);
  
  addToast('Webhook created and tested', 'success');
}
```

---

## Fix #7: Dashboard Shows Real Status

**Current:** Dashboard uses hardcoded values  
**Fix:** Query actual system state

**DashboardPremium should show:**
```typescript
// Real queries
const metrics = {
  activeAgents: await countActiveAgents(),
  pendingApprovals: await countPendingApprovals(),
  warrantsToday: await countWarrantsToday(),
  avgTrustScore: await calculateAvgTrust(),
  policyViolations24h: await countViolations24h(),
  executionSuccessRate: await calculateSuccessRate()
};
```

**System Health Cards:**
- Database: Query latency from actual ping
- API: Response time from real endpoint
- Queue: Actual queue depth
- SSE: Count connected clients

---

## Implementation Priority

### Week 1: Core Value (Approval Flow)
1. ✅ Seed realistic approval data
2. ✅ Verify approve/deny buttons work
3. ✅ Add real-time updates via SSE
4. ✅ Show approval history
5. ✅ Polish empty states

### Week 2: Fleet + Policies
1. ✅ Agent suspend/activate works
2. ✅ Policy CRUD fully functional
3. ✅ Real agent metrics displayed
4. ✅ Policy testing works

### Week 3: Integrations + Events
1. ✅ Slack OAuth integration
2. ✅ Webhook CRUD + testing
3. ✅ Real-time event stream
4. ✅ Dashboard real metrics

### Week 4: Polish
1. ✅ Remove all "AI-generated" feel
2. ✅ User-specific content
3. ✅ Real guidance in empty states
4. ✅ Test with real users

---

## Success Criteria

**Before (AI-Generated Feel):**
- 70% of pages show empty states
- Buttons don't do anything
- Mock data obvious
- No real-time updates
- Generic placeholder text

**After (Professional Product):**
- Every page has real functionality
- All buttons trigger real actions
- Data from production database
- Real-time SSE updates
- Specific, helpful guidance

**User Test:**
New user should be able to:
1. See pending approvals (from test data)
2. Approve/deny an approval
3. See it update in real-time
4. View agent in fleet
5. Create a governance policy
6. See it enforced
7. Set up Slack integration
8. Receive approval notification

---

## Metrics to Track

- % of pages with real data: Currently ~30% → Target 100%
- % of buttons that work: Currently ~40% → Target 100%
- Empty state rate: Currently ~70% → Target <10%
- User can complete core workflow: Currently NO → Target YES

---

**Status:** 📋 Plan documented, ready to execute  
**Priority:** CRITICAL (this is the product)  
**Owner:** Vienna (Technical Lead)
