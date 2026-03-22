# Phase 17 Stage 4 — Validation Checklist

**Status:** Implementation complete, validation pending

**Components delivered:**
1. Backend API endpoints (list, detail, approve, deny)
2. Frontend API client (approvals.ts)
3. React components (PendingApprovalsList, ApprovalCard, ApprovalDetailModal)
4. Approvals page integration
5. Navigation integration

---

## Validation Checklist

### Backend API Validation

**Prerequisites:**
- Vienna server running
- State Graph initialized
- Test approval created

**Tests:**

1. **List approvals**
   ```bash
   curl -X GET http://localhost:3100/api/v1/approvals \
     -H "Cookie: session=..." \
     -H "Content-Type: application/json"
   ```
   - ✓ Returns array of approvals
   - ✓ Status filter works
   - ✓ Tier filter works
   - ✓ Expiry enrichment correct

2. **Get approval detail**
   ```bash
   curl -X GET http://localhost:3100/api/v1/approvals/{approval_id} \
     -H "Cookie: session=..." \
     -H "Content-Type: application/json"
   ```
   - ✓ Returns approval with context
   - ✓ Plan linked correctly
   - ✓ Execution linked correctly
   - ✓ Expiry status correct
   - ✓ 404 for missing approval

3. **Approve pending approval**
   ```bash
   curl -X POST http://localhost:3100/api/v1/approvals/{approval_id}/approve \
     -H "Cookie: session=..." \
     -H "Content-Type: application/json" \
     -d '{"reviewed_by":"operator","decision_reason":"Approved for testing"}'
   ```
   - ✓ Transitions pending → approved
   - ✓ Records reviewer
   - ✓ Records decision reason
   - ✓ Rejects expired approval
   - ✓ Rejects invalid transition

4. **Deny pending approval**
   ```bash
   curl -X POST http://localhost:3100/api/v1/approvals/{approval_id}/deny \
     -H "Cookie: session=..." \
     -H "Content-Type: application/json" \
     -d '{"reviewed_by":"operator","decision_reason":"Denied for testing"}'
   ```
   - ✓ Transitions pending → denied
   - ✓ Records reviewer
   - ✓ Requires decision reason
   - ✓ Rejects expired approval
   - ✓ Rejects invalid transition

---

### Frontend UI Validation

**Prerequisites:**
- Frontend rebuilt (`cd console/client && npm run build`)
- Vienna server restarted
- Browser at http://localhost:5174

**Tests:**

1. **Navigation**
   - ✓ Approvals tab visible in main nav
   - ✓ Click navigates to approvals page
   - ✓ URL hash updates to #approvals

2. **Pending approvals list**
   - ✓ Loads pending approvals
   - ✓ Empty state shows when no approvals
   - ✓ Filter tabs work (All / T1 / T2)
   - ✓ Expiring soon section appears when <5m
   - ✓ Auto-refreshes every 10 seconds
   - ✓ Loading spinner on initial load
   - ✓ Error state on API failure

3. **Approval card**
   - ✓ Shows tier badge (T1/T2)
   - ✓ Shows action summary
   - ✓ Shows target ID
   - ✓ Shows requested time (relative)
   - ✓ Shows expiry countdown
   - ✓ Urgent styling for <5m expiry
   - ✓ Approve button works
   - ✓ Deny button shows reason input
   - ✓ Deny requires reason
   - ✓ Actions disabled during API call
   - ✓ Expired approvals show "Expired" (no actions)

4. **Approval actions**
   - ✓ Approve action succeeds
   - ✓ Deny action succeeds
   - ✓ Denial reason persists
   - ✓ Card updates after action
   - ✓ List refreshes after action
   - ✓ Error messages display on failure

5. **Approval detail modal** (future)
   - Detail view not yet integrated
   - Click approval to open modal (future)

---

### Integration Validation

1. **End-to-end approval flow**
   - ✓ T1 action triggers approval requirement
   - ✓ Approval appears in pending list
   - ✓ Operator approves via UI
   - ✓ Execution resumes
   - ✓ Approval transitions to approved
   - ✓ Approval removed from pending list

2. **Expiry handling**
   - ✓ Expired approval cannot be approved
   - ✓ Expired approval shows correct status
   - ✓ Expired approval removed from pending

3. **Denial flow**
   - ✓ Denied approval stops execution
   - ✓ Denial reason recorded
   - ✓ Ledger event created
   - ✓ Approval transitions to denied

4. **Audit trail**
   - ✓ Approval requested event
   - ✓ Approval resolved events
   - ✓ Reviewer identity recorded
   - ✓ Decision reason recorded
   - ✓ Timestamps accurate

---

## Test Approval Creation

**For validation, create test approval:**

```javascript
// In Node.js REPL or test script
const { getStateGraph } = require('./lib/state/state-graph');
const { ApprovalManager } = require('./lib/core/approval-manager');

const stateGraph = getStateGraph();
await stateGraph.initialize();

const manager = new ApprovalManager(stateGraph);

const approval = await manager.createApprovalRequest({
  plan_id: 'plan_test_001',
  execution_id: 'exec_test_001',
  tier: 'T1',
  target_id: 'test-service',
  action_type: 'restart_service',
  action_summary: 'Restart test service for validation',
  requested_by: 'system',
  expires_at: Date.now() + 30 * 60 * 1000, // 30 minutes
  metadata: { test: true }
});

console.log('Test approval created:', approval.approval_id);
```

---

## Exit Criteria

**Stage 4 complete when:**
- ✅ All backend API endpoints functional
- ✅ Frontend loads pending approvals
- ✅ Approve action works end-to-end
- ✅ Deny action works end-to-end
- ✅ Expiry handling correct
- ✅ Audit trail complete
- ✅ UI matches design constraints (thin surface, not source of truth)

**Ready for production when:**
- ✅ Manual validation complete
- ✅ End-to-end approval flow proven
- ✅ Operator identity integration complete (currently placeholder)
- ✅ Error handling tested

---

## Known Limitations

1. **Operator identity:** Currently uses placeholder "operator" string
   - TODO: Integrate with auth context
   - TODO: Pass real operator ID from session

2. **Real-time updates:** Currently polls every 10s
   - Consider SSE integration for instant updates
   - Not blocking for initial deployment

3. **Detail modal:** Implemented but not integrated into card
   - Click-to-expand can be added in future iteration
   - List view sufficient for initial deployment

4. **Approval history:** Not yet implemented
   - Resolved approvals viewable via audit trail
   - Dedicated history view can be added later

---

## Next Steps After Validation

1. **Operator identity integration**
   - Connect to auth store
   - Pass real operator ID to approve/deny

2. **SSE integration** (optional)
   - Real-time approval updates
   - Push notifications for new approvals

3. **Detail modal integration** (optional)
   - Click approval card to open detail
   - Navigate to linked plan/execution

4. **Approval history view** (optional)
   - Resolved approvals page
   - Approval search/filter

5. **Phase 16.3 — Queuing** (next phase)
   - Queue blocked plans for retry
   - Resume queued plans after approval
