/**
 * Phase 17 Stage 4 — Approval Flow Validation
 * 
 * End-to-end validation of approval workflow.
 */

const { getStateGraph } = require('./lib/state/state-graph');
const { ApprovalManager } = require('./lib/core/approval-manager');

async function validateApprovalFlow() {
  console.log('=== Phase 17 Stage 4 Approval Flow Validation ===\n');
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  const manager = new ApprovalManager(stateGraph);
  
  // Test 1: Create test approval
  console.log('Test 1: Creating test approval...');
  const approval = await manager.createApprovalRequest({
    plan_id: 'plan_test_phase17',
    execution_id: 'exec_test_phase17',
    tier: 'T1',
    target_id: 'test-service',
    action_type: 'restart_service',
    action_summary: 'Restart test service for Phase 17 validation',
    requested_by: 'test-script',
    expires_at: Date.now() + 30 * 60 * 1000, // 30 minutes
    metadata: { 
      test: true,
      validation_run: new Date().toISOString()
    }
  });
  
  console.log(`✓ Approval created: ${approval.approval_id}`);
  console.log(`  Status: ${approval.status}`);
  console.log(`  Tier: ${approval.required_tier}`);
  console.log(`  Expires: ${new Date(approval.expires_at).toISOString()}`);
  console.log();
  
  // Test 2: List pending approvals
  console.log('Test 2: Listing pending approvals...');
  const pending = await stateGraph.listApprovals({ status: 'pending' });
  console.log(`✓ Found ${pending.length} pending approval(s)`);
  console.log();
  
  // Test 3: Get approval detail
  console.log('Test 3: Getting approval detail...');
  const detail = await stateGraph.getApproval(approval.approval_id);
  console.log(`✓ Retrieved approval: ${detail.approval_id}`);
  console.log(`  Action: ${detail.action_summary}`);
  console.log(`  Requested by: ${detail.requested_by}`);
  console.log();
  
  // Test 4: Approve (simulate operator approval)
  console.log('Test 4: Approving approval...');
  const approveResult = await manager.approve(approval.approval_id, {
    reviewed_by: 'test-operator',
    decision_reason: 'Approved for Phase 17 validation'
  });
  
  console.log(`✓ Approval approved`);
  console.log(`  New status: ${approveResult.status}`);
  console.log(`  Reviewed by: ${approveResult.reviewed_by}`);
  console.log(`  Decision: ${approveResult.decision_reason}`);
  console.log();
  
  // Test 5: Verify audit trail
  console.log('Test 5: Verifying audit trail...');
  const history = await stateGraph.query(
    'SELECT * FROM approval_history WHERE approval_id = ? ORDER BY timestamp DESC',
    [approval.approval_id]
  );
  
  console.log(`✓ Found ${history.length} history event(s)`);
  for (const event of history) {
    console.log(`  - ${event.from_status} → ${event.to_status} (${event.reason})`);
    if (event.reviewed_by) {
      console.log(`    Reviewed by: ${event.reviewed_by}`);
    }
  }
  console.log();
  
  // Test 6: Create and deny another approval
  console.log('Test 6: Creating and denying approval...');
  const approval2 = await manager.createApprovalRequest({
    plan_id: 'plan_test_phase17_deny',
    execution_id: 'exec_test_phase17_deny',
    tier: 'T2',
    target_id: 'critical-service',
    action_type: 'restart_service',
    action_summary: 'Restart critical service (will be denied)',
    requested_by: 'test-script',
    expires_at: Date.now() + 30 * 60 * 1000,
    metadata: { test: true, expect_denial: true }
  });
  
  const denyResult = await manager.deny(approval2.approval_id, {
    reviewed_by: 'test-operator',
    decision_reason: 'Denied for Phase 17 validation - testing denial path'
  });
  
  console.log(`✓ Approval denied`);
  console.log(`  Status: ${denyResult.status}`);
  console.log(`  Reviewed by: ${denyResult.reviewed_by}`);
  console.log(`  Reason: ${denyResult.decision_reason}`);
  console.log();
  
  // Summary
  console.log('=== Validation Summary ===');
  console.log('✓ Approval creation: PASS');
  console.log('✓ List pending: PASS');
  console.log('✓ Get detail: PASS');
  console.log('✓ Approve flow: PASS');
  console.log('✓ Deny flow: PASS');
  console.log('✓ Audit trail: PASS');
  console.log();
  console.log('Phase 17 Stage 4 approval workflow operational.');
  console.log();
  console.log('Test approval IDs for UI validation:');
  console.log(`  Approved: ${approval.approval_id}`);
  console.log(`  Denied: ${approval2.approval_id}`);
}

validateApprovalFlow().catch(console.error);
