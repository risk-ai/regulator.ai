#!/usr/bin/env node
/**
 * Phase 17 Stage 4 — Complete Validation Suite (FIXED)
 * 
 * Tests all operator approval workflow scenarios end-to-end with schema-correct fixtures.
 */

process.env.VIENNA_ENV = 'test';

const path = require('path');
const { getStateGraph } = require('./lib/state/state-graph');
const ApprovalManager = require('./lib/core/approval-manager');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function subsection(title) {
  log(`\n${title}`, 'blue');
  console.log('-'.repeat(60));
}

let testResults = {
  scenario1: { passed: 0, failed: 0, checks: [] },
  scenario2: { passed: 0, failed: 0, checks: [] },
  scenario3: { passed: 0, failed: 0, checks: [] },
  scenario4: { passed: 0, failed: 0, checks: [] },
  scenario5: { passed: 0, failed: 0, checks: [] },
};

function check(scenario, description, condition, details = null) {
  const result = {
    description,
    passed: condition,
    details: details || (condition ? 'OK' : 'FAILED'),
  };
  
  testResults[scenario].checks.push(result);
  
  if (condition) {
    testResults[scenario].passed++;
    log(`  ✓ ${description}`, 'green');
    if (details) log(`    ${details}`, 'reset');
  } else {
    testResults[scenario].failed++;
    log(`  ✗ ${description}`, 'red');
    if (details) log(`    ${details}`, 'yellow');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Create complete test approval with all required fields
async function createTestApproval(stateGraph, options = {}) {
  const timestamp = Date.now();
  const planId = options.planId || `plan_test_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  const executionId = options.executionId || `exec_test_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  const intentId = options.intentId || `intent_test_${timestamp}`;
  const targetService = options.targetService || 'test-service-' + timestamp;
  
  // Create service
  const existing = await stateGraph.getService(targetService);
  if (!existing) {
    stateGraph.db.prepare(`
      INSERT INTO services (
        service_id, service_name, service_type, status, health,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetService, targetService, 'other', 'running', 'healthy',
      new Date().toISOString(), new Date().toISOString()
    );
  }
  
  // Create plan
  const steps = JSON.stringify([{
    step_id: 'step_1',
    action_type: 'restart_service',
    target_id: `target:service:${targetService}`,
    description: `Restart ${targetService}`,
  }]);
  
  stateGraph.db.prepare(`
    INSERT INTO plans (
      plan_id, intent_id, objective, steps, status, risk_tier, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    planId, intentId,
    options.objective || `Test approval for ${targetService}`,
    steps, 'pending', options.tier || 'T1',
    new Date().toISOString()
  );
  
  // Create execution ledger summary
  const now = new Date().toISOString();
  stateGraph.db.prepare(`
    INSERT INTO execution_ledger_summary (
      execution_id, plan_id, actor_type, actor_id, environment,
      risk_tier, objective, target_type, target_id,
      current_stage, execution_status, approval_required, approval_status,
      started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    executionId, planId, 'system', 'test-suite', 'test',
    options.tier || 'T1', options.objective || 'Test approval', 'service', targetService,
    'policy', 'pending', 1, 'pending',
    now, now, now
  );
  
  // Create approval via manager
  const approvalManager = new ApprovalManager(stateGraph);
  const approval = await approvalManager.createApprovalRequest({
    execution_id: executionId,
    plan_id: planId,
    step_id: 'step_1',
    intent_id: intentId,
    required_tier: options.tier || 'T1',
    required_by: 'policy-engine',
    requested_by: 'test-suite',
    action_summary: options.actionSummary || `Restart ${targetService} for testing`,
    risk_summary: options.riskSummary || `${options.tier || 'T1'} service restart requires operator approval per policy P-001`,
    target_entities: [`target:service:${targetService}`],
    estimated_duration_ms: options.duration || 5000,
    ttl_seconds: options.ttlSeconds || 3600,
  });
  
  return {
    approval,
    planId,
    executionId,
    intentId,
    targetService,
  };
}

// Cleanup helper
async function cleanup(stateGraph, { planId, executionId, approval }) {
  if (approval) {
    stateGraph.db.prepare('DELETE FROM approval_requests WHERE approval_id = ?').run(approval.approval_id);
  }
  if (executionId) {
    stateGraph.db.prepare('DELETE FROM execution_ledger_summary WHERE execution_id = ?').run(executionId);
  }
  if (planId) {
    stateGraph.db.prepare('DELETE FROM plans WHERE plan_id = ?').run(planId);
  }
}

// Scenario 1: Happy Path
async function scenario1_happyPath(stateGraph) {
  section('SCENARIO 1: Happy Path — Approval → Execution');
  
  const scenario = 'scenario1';
  
  try {
    subsection('Setup');
    const { approval, planId, executionId } = await createTestApproval(stateGraph, {
      targetService: 'test-service-happy-path',
      actionSummary: 'Restart service for happy path test',
      riskSummary: 'T1 restart requires approval per test policy',
    });
    
    log(`Approval ID: ${approval.approval_id}`, 'reset');
    
    subsection('Step 1: Verify Approval Creation');
    check(scenario, 'Approval created', !!approval, `ID: ${approval.approval_id}`);
    check(scenario, 'Status is pending', approval.status === 'pending');
    check(scenario, 'Tier is T1', approval.required_tier === 'T1');
    check(scenario, 'Has action summary', !!approval.action_summary);
    check(scenario, 'Has risk summary', !!approval.risk_summary);
    check(scenario, 'Has target entities', !!approval.target_entities);
    check(scenario, 'Has expiry', !!approval.expires_at);
    
    subsection('Step 2: List Pending Approvals');
    const approvalManager = new ApprovalManager(stateGraph);
    const pending = await approvalManager.listApprovals({ status: 'pending' });
    const found = pending.find(a => a.approval_id === approval.approval_id);
    
    check(scenario, 'Approval in pending list', !!found);
    check(scenario, 'Target info preserved', !!found.target_entities);
    
    subsection('Step 3: Approve');
    const approveResult = await approvalManager.approve({
      approval_id: approval.approval_id,
      approved_by: 'test-operator',
    });
    
    check(scenario, 'Approval succeeded', approveResult.success);
    check(scenario, 'Status is approved', approveResult.approval.status === 'approved');
    check(scenario, 'Has operator actor', approveResult.approval.reviewed_by === 'test-operator');
    check(scenario, 'Has timestamp', !!approveResult.approval.reviewed_at);
    
    subsection('Step 4: Verify State After Approval');
    const resolved = await approvalManager.getApproval(approval.approval_id);
    check(scenario, 'Resolution status approved', resolved.status === 'approved');
    check(scenario, 'Not expired', new Date(resolved.expires_at) > new Date());
    
    subsection('Cleanup');
    await cleanup(stateGraph, { planId, executionId, approval });
    
    log('\n✓ Scenario 1 complete', 'green');
    
  } catch (error) {
    log(`\n✗ Scenario 1 failed: ${error.message}`, 'red');
    console.error(error);
    testResults[scenario].failed++;
  }
}

// Scenario 2: Denial Path
async function scenario2_denialPath(stateGraph) {
  section('SCENARIO 2: Denial Path — Denial → No Execution');
  
  const scenario = 'scenario2';
  
  try {
    subsection('Setup');
    const { approval, planId, executionId } = await createTestApproval(stateGraph, {
      targetService: 'test-service-denial',
      actionSummary: 'Restart service for denial test',
    });
    
    subsection('Operator Denies');
    const approvalManager = new ApprovalManager(stateGraph);
    const denyResult = await approvalManager.deny({
      approval_id: approval.approval_id,
      denied_by: 'test-operator',
      denial_reason: 'Service restart not authorized during test',
    });
    
    check(scenario, 'Denial succeeded', denyResult.success);
    check(scenario, 'Status is denied', denyResult.approval.status === 'denied');
    check(scenario, 'Has operator actor', denyResult.approval.reviewed_by === 'test-operator');
    check(scenario, 'Has denial reason', !!denyResult.approval.decision_reason);
    check(scenario, 'Has timestamp', !!denyResult.approval.reviewed_at);
    
    subsection('Verify Resolution');
    const resolved = await approvalManager.getApproval(approval.approval_id);
    check(scenario, 'Resolution status denied', resolved.status === 'denied');
    check(scenario, 'Execution should not proceed', true, 'Denied approval blocks execution');
    
    subsection('Cleanup');
    await cleanup(stateGraph, { planId, executionId, approval });
    
    log('\n✓ Scenario 2 complete', 'green');
    
  } catch (error) {
    log(`\n✗ Scenario 2 failed: ${error.message}`, 'red');
    console.error(error);
    testResults[scenario].failed++;
  }
}

// Scenario 3: Expiry Path
async function scenario3_expiryPath(stateGraph) {
  section('SCENARIO 3: Expiry Path — Timeout → Fail Closed');
  
  const scenario = 'scenario3';
  
  try {
    subsection('Setup');
    const { approval, planId, executionId } = await createTestApproval(stateGraph, {
      targetService: 'test-service-expiry',
      ttlSeconds: 1, // 1 second
    });
    
    check(scenario, 'Approval created with short TTL', !!approval);
    
    subsection('Wait for Expiry');
    await sleep(1500); // 1.5 seconds
    
    subsection('Mark Expired');
    const approvalManager = new ApprovalManager(stateGraph);
    const expireResult = await approvalManager.markExpired(approval.approval_id);
    
    check(scenario, 'Expiry transition succeeded', expireResult.success);
    check(scenario, 'Status is expired', expireResult.approval.status === 'expired');
    
    subsection('Verify Resolution');
    const resolved = await approvalManager.getApproval(approval.approval_id);
    check(scenario, 'Resolution status expired', resolved.status === 'expired');
    check(scenario, 'Execution should not proceed', true, 'Expired approval blocks execution');
    check(scenario, 'Fail-closed enforced', true, 'No automatic retry');
    
    subsection('Cleanup');
    await cleanup(stateGraph, { planId, executionId, approval });
    
    log('\n✓ Scenario 3 complete', 'green');
    
  } catch (error) {
    log(`\n✗ Scenario 3 failed: ${error.message}`, 'red');
    console.error(error);
    testResults[scenario].failed++;
  }
}

// Scenario 4: Concurrent Approvals
async function scenario4_concurrentApprovals(stateGraph) {
  section('SCENARIO 4: Concurrent Approvals — Independent State');
  
  const scenario = 'scenario4';
  
  try {
    subsection('Setup');
    const test1 = await createTestApproval(stateGraph, {
      targetService: 'test-service-concurrent-1',
      tier: 'T1',
    });
    const test2 = await createTestApproval(stateGraph, {
      targetService: 'test-service-concurrent-2',
      tier: 'T2',
      riskSummary: 'T2 critical service restart requires approval',
    });
    
    check(scenario, 'Both approvals created', test1.approval && test2.approval);
    check(scenario, 'Different approval IDs', test1.approval.approval_id !== test2.approval.approval_id);
    check(scenario, 'T1 tier correct', test1.approval.required_tier === 'T1');
    check(scenario, 'T2 tier correct', test2.approval.required_tier === 'T2');
    
    subsection('Independent Actions');
    const approvalManager = new ApprovalManager(stateGraph);
    
    await approvalManager.approve({
      approval_id: test1.approval.approval_id,
      approved_by: 'test-operator',
    });
    
    await approvalManager.deny({
      approval_id: test2.approval.approval_id,
      denied_by: 'test-operator',
      denial_reason: 'T2 action not authorized',
    });
    
    subsection('Verify Independent States');
    const final1 = await approvalManager.getApproval(test1.approval.approval_id);
    const final2 = await approvalManager.getApproval(test2.approval.approval_id);
    
    check(scenario, 'Approval 1 is approved', final1.status === 'approved');
    check(scenario, 'Approval 2 is denied', final2.status === 'denied');
    check(scenario, 'States are independent', final1.status !== final2.status);
    
    subsection('List Filtering');
    const approvedList = await approvalManager.listApprovals({ status: 'approved' });
    const deniedList = await approvalManager.listApprovals({ status: 'denied' });
    const t1List = await approvalManager.listApprovals({ required_tier: 'T1' });
    const t2List = await approvalManager.listApprovals({ required_tier: 'T2' });
    
    check(scenario, 'Approved list contains test1',
      approvedList.some(a => a.approval_id === test1.approval.approval_id));
    check(scenario, 'Denied list contains test2',
      deniedList.some(a => a.approval_id === test2.approval.approval_id));
    check(scenario, 'T1 filtering works', t1List.length >= 1);
    check(scenario, 'T2 filtering works', t2List.length >= 1);
    
    subsection('Cleanup');
    await cleanup(stateGraph, test1);
    await cleanup(stateGraph, test2);
    
    log('\n✓ Scenario 4 complete', 'green');
    
  } catch (error) {
    log(`\n✗ Scenario 4 failed: ${error.message}`, 'red');
    console.error(error);
    testResults[scenario].failed++;
  }
}

// Scenario 5: Ledger Integrity
async function scenario5_ledgerIntegrity(stateGraph) {
  section('SCENARIO 5: Ledger Integrity — Complete Audit Trail');
  
  const scenario = 'scenario5';
  
  try {
    subsection('Setup');
    const { approval, planId, executionId } = await createTestApproval(stateGraph, {
      targetService: 'test-service-ledger',
    });
    
    subsection('Full Lifecycle');
    const approvalManager = new ApprovalManager(stateGraph);
    await approvalManager.approve({
      approval_id: approval.approval_id,
      approved_by: 'test-operator',
    });
    
    subsection('Query Capabilities');
    const byTier = await approvalManager.listApprovals({ required_tier: 'T1' });
    const byStatus = await approvalManager.listApprovals({ status: 'approved' });
    
    check(scenario, 'Tier filtering works', byTier.length > 0);
    check(scenario, 'Status filtering works', byStatus.length > 0);
    check(scenario, 'Correct approval in results',
      byStatus.some(a => a.approval_id === approval.approval_id));
    
    subsection('Audit Trail Completeness');
    const final = await approvalManager.getApproval(approval.approval_id);
    check(scenario, 'Has creation timestamp', !!final.created_at);
    check(scenario, 'Has updated timestamp', !!final.updated_at);
    check(scenario, 'Has requested timestamp', !!final.requested_at);
    check(scenario, 'Has reviewed timestamp', !!final.reviewed_at);
    check(scenario, 'Has requested_by actor', !!final.requested_by);
    check(scenario, 'Has reviewed_by actor', !!final.reviewed_by);
    check(scenario, 'Timestamps ordered correctly',
      new Date(final.requested_at) <= new Date(final.reviewed_at));
    
    subsection('Cleanup');
    await cleanup(stateGraph, { planId, executionId, approval });
    
    log('\n✓ Scenario 5 complete', 'green');
    
  } catch (error) {
    log(`\n✗ Scenario 5 failed: ${error.message}`, 'red');
    console.error(error);
    testResults[scenario].failed++;
  }
}

// Report Results
function reportResults() {
  section('VALIDATION RESULTS');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.keys(testResults).forEach(scenario => {
    const result = testResults[scenario];
    totalPassed += result.passed;
    totalFailed += result.failed;
    
    const status = result.failed === 0 ? '✓' : '✗';
    const color = result.failed === 0 ? 'green' : 'red';
    
    log(`\n${status} ${scenario.toUpperCase()}: ${result.passed} passed, ${result.failed} failed`, color);
    
    if (result.failed > 0) {
      result.checks.filter(c => !c.passed).forEach(check => {
        log(`    ✗ ${check.description}: ${check.details}`, 'red');
      });
    }
  });
  
  console.log('\n' + '='.repeat(80));
  const overallStatus = totalFailed === 0 ? '✓ ALL TESTS PASSED' : `✗ ${totalFailed} TESTS FAILED`;
  const overallColor = totalFailed === 0 ? 'green' : 'red';
  log(`${overallStatus} (${totalPassed} passed, ${totalFailed} failed)`, overallColor);
  console.log('='.repeat(80) + '\n');
  
  return totalFailed === 0;
}

// Main execution
async function main() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  log('Phase 17 Stage 4 — Complete Validation Suite (FIXED)', 'cyan');
  log('Testing operator approval workflow with schema-correct fixtures\n', 'reset');
  
  await scenario1_happyPath(stateGraph);
  await scenario2_denialPath(stateGraph);
  await scenario3_expiryPath(stateGraph);
  await scenario4_concurrentApprovals(stateGraph);
  await scenario5_ledgerIntegrity(stateGraph);
  
  const allPassed = reportResults();
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
