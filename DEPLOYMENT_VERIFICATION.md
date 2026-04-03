# Deployment Verification Checklist
**Updated:** 2026-04-03 18:00 EDT  
**Status:** Post-Fix Verification

---

## Pre-Deployment Checks

### Database
- [ ] Production DATABASE_URL verified
- [ ] `regulator.warrants` table exists
- [ ] `regulator.agent_registry` table exists
- [ ] `regulator.audit_log` table exists
- [ ] `regulator.execution_log` table exists (or execution_events)

### Environment Variables
- [ ] `JWT_SECRET` set (used for warrant signing)
- [ ] `VIENNA_WARRANT_KEY` set (optional, falls back to JWT_SECRET)
- [ ] `RESEND_API_KEY` set (for welcome emails)
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] Stripe price IDs set (TEAM_MONTHLY, BUSINESS_MONTHLY, ENTERPRISE_MONTHLY)

### Code Deployment
- [ ] Latest main deployed to Vercel
- [ ] Build successful (no TS errors)
- [ ] No console errors on page load

---

## Post-Deployment Verification

### Critical Path 1: Warrant Authority
```bash
# Submit T0 intent
curl -X POST https://console.regulator.ai/api/v1/intents \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"action": "database_query"}'

# Expected: { "status": "approved", "warrant_id": "wrt_xxx" }
```

**Verify:**
- [ ] Returns warrant_id (not null)
- [ ] Warrant has signature field
- [ ] Warrant persisted to database

**Database check:**
```sql
SELECT scope->>'warrant_id', signature, created_at
FROM regulator.warrants
WHERE scope->>'warrant_id' LIKE 'wrt_%'
ORDER BY created_at DESC LIMIT 5;
```

---

### Critical Path 2: T2 Approval Flow

```bash
# Submit T2 intent
RESP=$(curl -X POST https://console.regulator.ai/api/v1/intents \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"action": "deploy_to_prod"}')
  
APPROVAL_ID=$(echo $RESP | jq -r '.approval_id')
```

**Verify:**
- [ ] Returns 202 Accepted
- [ ] Returns approval_id (not null)
- [ ] Slack message sent (if integration enabled)

**Approve via Slack:**
- [ ] Click "Approve" button in Slack
- [ ] Callback processed successfully
- [ ] Warrant issued

**Approve via API (alternative):**
```bash
curl -X POST https://console.regulator.ai/api/v1/approvals/$APPROVAL_ID/approve \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"reason": "Test approval"}'

# Expected: { "warrant_id": "wrt_xxx" }
```

**Database check:**
```sql
SELECT event, details->>'warrant_id', details->>'approval_id'
FROM regulator.audit_log
WHERE event = 'intent.approved'
ORDER BY created_at DESC LIMIT 5;
```

---

### Critical Path 3: Approval Status Polling

```bash
# Poll for approval status
curl https://console.regulator.ai/api/v1/approvals/$APPROVAL_ID/status \
  -H "Authorization: Bearer $API_KEY"
```

**Verify:**
- [ ] Endpoint exists (not 404)
- [ ] Returns `{ "status": "pending" }` before approval
- [ ] Returns `{ "status": "approved", "warrant_id": "wrt_xxx" }` after approval

---

### Critical Path 4: Execution Reporting

```bash
# Report execution result
curl -X POST https://console.regulator.ai/api/v1/executions \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "warrant_id": "wrt_xxx",
    "agent_id": "test_agent",
    "success": true,
    "output": "Deployment successful",
    "metrics": {"duration_ms": 1500, "estimated_cost": 0.05}
  }'
```

**Verify:**
- [ ] Returns 200 OK
- [ ] Logged to audit_log
- [ ] Persisted to execution_log (or execution_events)

**Database check:**
```sql
-- Check audit_log
SELECT event, details->>'warrant_id', created_at
FROM regulator.audit_log
WHERE event = 'execution.completed'
ORDER BY created_at DESC LIMIT 5;

-- Check execution_log (if table exists)
SELECT execution_id, warrant_id, status, created_at
FROM regulator.execution_log
ORDER BY created_at DESC LIMIT 5;
```

---

### Critical Path 5: Cost Analytics

```bash
# Query cost analytics
curl https://console.regulator.ai/api/v1/analytics/costs?period=7d \
  -H "Authorization: Bearer $API_KEY"
```

**Verify:**
- [ ] Returns 200 OK (not SQL error)
- [ ] Returns `{ "total_estimated_cost": <number> }`
- [ ] No `regulator.executions does not exist` error

---

### Critical Path 6: Stripe Provisioning

**Test checkout:**
1. Complete test Stripe checkout (use test credit card)
2. Check email for welcome message
3. Verify user created in database

**Database check:**
```sql
SELECT email, created_at FROM regulator.users
WHERE email = 'test@example.com';

SELECT name, plan, stripe_customer_id
FROM regulator.organizations
WHERE owner_id = (SELECT id FROM regulator.users WHERE email = 'test@example.com');
```

**Verify:**
- [ ] User row created
- [ ] Organization row created
- [ ] Plan set correctly
- [ ] stripe_customer_id populated
- [ ] Welcome email received

---

### Critical Path 7: Subscription Updates

**Test subscription change:**
1. Upgrade subscription in Stripe dashboard (Team → Business)
2. Wait for webhook
3. Check database

**Database check:**
```sql
SELECT plan, updated_at FROM regulator.organizations
WHERE stripe_customer_id = 'cus_xxx';
```

**Verify:**
- [ ] Plan updated to 'business'
- [ ] updated_at timestamp recent

**Test subscription cancellation:**
1. Cancel subscription in Stripe dashboard
2. Wait for webhook
3. Check database

**Verify:**
- [ ] Plan downgraded to 'free' OR status='inactive'

---

## Smoke Test Checklist

Run automated test suite:
```bash
cd ~/regulator.ai/test-scripts
export VIENNA_API_KEY=vos_your_key_here
./governance-e2e-test.sh
```

**Expected output:**
```
✓ Agent registered successfully
✓ Heartbeat acknowledged
✓ T0 intent auto-approved with warrant
✓ Warrant verified with signature
✓ T2 intent pending approval
✓ Approval status endpoint working
✓ Execution reported successfully
✓ Cost analytics working
```

---

## Rollback Plan

If critical issues found:

### Immediate Rollback
```bash
# Revert to last known good commit
git revert <bad_commit_sha>
git push origin main

# Or rollback in Vercel UI
# Deployments → ... → Promote to Production
```

### Partial Rollback (Feature Flags)
- Disable Slack integration if callbacks broken
- Disable Stripe provisioning if errors
- Fall back to manual approvals

### Database Rollback
No schema changes made (all additive), so no DB rollback needed.

---

## Success Criteria

**All checks must pass:**
- [x] Warrant Authority issues and persists warrants
- [x] T2 approvals via Slack/email issue warrants
- [ ] Approval polling endpoint returns warrant
- [ ] Cost analytics queries correct table
- [ ] Stripe provisioning creates users
- [ ] Subscription updates change plans
- [ ] Execution results persist to database

**Performance:**
- Warrant issuance < 500ms
- Approval callback → warrant < 2s
- Cost analytics query < 1s

**Reliability:**
- No SQL errors in logs
- No 500 errors on critical endpoints
- Approval callbacks 100% success rate

---

## Monitoring

### Vercel Logs
```bash
vercel logs --production | grep -E "(error|ERROR|Error)"
```

**Watch for:**
- "regulator.executions does not exist" ← Cost query error
- "Warrant Authority not available" ← viennaCore not initialized
- "Approval.*not found" ← Approval callback failures

### Database Monitoring
```sql
-- Warrant issuance rate
SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*)
FROM regulator.warrants
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Approval resolution rate
SELECT 
  COUNT(*) FILTER (WHERE event = 'approval.required') as required,
  COUNT(*) FILTER (WHERE event = 'intent.approved') as approved,
  COUNT(*) FILTER (WHERE event = 'intent.denied') as denied
FROM regulator.audit_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Execution reporting
SELECT COUNT(*) FROM regulator.audit_log
WHERE event = 'execution.completed'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Issue Tracking

**If verification fails:**
1. Document failure in GitHub issue
2. Tag as `critical`, `bug`, `governance`
3. Assign to Vienna or Aiden
4. Post to #agent-coordination
5. Consider rollback if user-facing

---

**Last Updated:** 2026-04-03 18:00 EDT  
**Next Review:** After deployment complete  
**Owner:** Vienna (Technical Lead)
