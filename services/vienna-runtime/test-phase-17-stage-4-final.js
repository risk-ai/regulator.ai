#!/usr/bin/env node
/**
 * Phase 17 Stage 4 — Complete Validation Suite (API-CORRECT)
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const ApprovalManager = require('./lib/core/approval-manager');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
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

let results = { scenario1: {passed:0, failed:0}, scenario2: {passed:0, failed:0}, scenario3: {passed:0, failed:0} };

function check(scenario, desc, condition, details = null) {
  if (condition) {
    results[scenario].passed++;
    log(`  ✓ ${desc}`, 'green');
    if (details) log(`    ${details}`, 'reset');
  } else {
    results[scenario].failed++;
    log(`  ✗ ${desc}`, 'red');
    if (details) log(`    ${details}`, 'yellow');
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createTestApproval(sg, opts = {}) {
  const ts = Date.now();
  const planId = `plan_test_${ts}`;
  const execId = `exec_test_${ts}`;
  const intentId = `intent_test_${ts}`;
  const svc = opts.service || `test-svc-${ts}`;
  
  sg.db.prepare(`INSERT INTO services (service_id, service_name, service_type, status, health, created_at, updated_at)
    VALUES (?, ?, 'other', 'running', 'healthy', ?, ?)`).run(svc, svc, new Date().toISOString(), new Date().toISOString());
  
  const steps = JSON.stringify([{step_id: 'step_1', action_type: 'restart_service', target_id: `target:service:${svc}`}]);
  sg.db.prepare(`INSERT INTO plans (plan_id, intent_id, objective, steps, status, risk_tier, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)`).run(planId, intentId, opts.obj || 'Test', steps, opts.tier || 'T1', new Date().toISOString());
  
  const now = new Date().toISOString();
  sg.db.prepare(`INSERT INTO execution_ledger_summary (execution_id, plan_id, actor_type, actor_id, environment, risk_tier, objective, target_type, target_id, current_stage, execution_status, approval_required, approval_status, started_at, created_at, updated_at)
    VALUES (?, ?, 'system', 'test', 'test', ?, 'Test', 'service', ?, 'policy', 'pending', 1, 'pending', ?, ?, ?)`).run(execId, planId, opts.tier || 'T1', svc, now, now, now);
  
  const am = new ApprovalManager(sg);
  const approval = await am.createApprovalRequest({
    execution_id: execId, plan_id: planId, step_id: 'step_1', intent_id: intentId,
    required_tier: opts.tier || 'T1', required_by: 'policy', requested_by: 'test',
    action_summary: opts.action || 'Test action', risk_summary: opts.risk || 'Test risk',
    target_entities: [`target:service:${svc}`], estimated_duration_ms: 5000, ttl_seconds: opts.ttl || 3600
  });
  
  return {approval, planId, execId, svc};
}

async function cleanup(sg, {planId, execId, approval}) {
  if (approval) sg.db.prepare('DELETE FROM approval_requests WHERE approval_id = ?').run(approval.approval_id);
  if (execId) sg.db.prepare('DELETE FROM execution_ledger_summary WHERE execution_id = ?').run(execId);
  if (planId) sg.db.prepare('DELETE FROM plans WHERE plan_id = ?').run(planId);
}

async function scenario1(sg) {
  section('SCENARIO 1: Happy Path');
  const s = 'scenario1';
  try {
    subsection('Setup');
    const {approval, planId, execId} = await createTestApproval(sg, {service: 'test-happy'});
    log(`Approval: ${approval.approval_id}`, 'reset');
    
    subsection('Verify Creation');
    check(s, 'Created', !!approval);
    check(s, 'Status pending', approval.status === 'pending');
    check(s, 'Tier T1', approval.required_tier === 'T1');
    check(s, 'Has action', !!approval.action_summary);
    check(s, 'Has risk', !!approval.risk_summary);
    check(s, 'Has targets', !!approval.target_entities);
    
    subsection('List Pending');
    const am = new ApprovalManager(sg);
    const pending = await am.listPendingApprovals();
    check(s, 'In pending list', pending.some(a => a.approval_id === approval.approval_id));
    
    subsection('Approve');
    const approved = await am.approve(approval.approval_id, 'test-operator', 'Test approval');
    check(s, 'Approve succeeded', !!approved);
    check(s, 'Status approved', approved.status === 'approved');
    check(s, 'Has reviewer', approved.reviewed_by === 'test-operator');
    
    subsection('Verify Resolution');
    const resolved = await am.getApproval(approval.approval_id);
    check(s, 'Final status approved', resolved.status === 'approved');
    
    await cleanup(sg, {planId, execId, approval});
    log('\n✓ Scenario 1 complete', 'green');
  } catch (e) {
    log(`\n✗ Scenario 1 failed: ${e.message}`, 'red');
    results[s].failed++;
  }
}

async function scenario2(sg) {
  section('SCENARIO 2: Denial Path');
  const s = 'scenario2';
  try {
    const {approval, planId, execId} = await createTestApproval(sg, {service: 'test-deny'});
    const am = new ApprovalManager(sg);
    
    subsection('Deny');
    const denied = await am.deny(approval.approval_id, 'test-operator', 'Not authorized');
    check(s, 'Deny succeeded', !!denied);
    check(s, 'Status denied', denied.status === 'denied');
    check(s, 'Has reason', !!denied.decision_reason);
    
    const resolved = await am.getApproval(approval.approval_id);
    check(s, 'Final status denied', resolved.status === 'denied');
    
    await cleanup(sg, {planId, execId, approval});
    log('\n✓ Scenario 2 complete', 'green');
  } catch (e) {
    log(`\n✗ Scenario 2 failed: ${e.message}`, 'red');
    results[s].failed++;
  }
}

async function scenario3(sg) {
  section('SCENARIO 3: Expiry Path');
  const s = 'scenario3';
  try {
    const {approval, planId, execId} = await createTestApproval(sg, {service: 'test-expiry', ttl: 1});
    check(s, 'Created with short TTL', !!approval);
    
    subsection('Wait + Expire');
    await sleep(1500);
    const am = new ApprovalManager(sg);
    const expired = await am.expire(approval.approval_id);
    check(s, 'Expire succeeded', !!expired);
    check(s, 'Status expired', expired.status === 'expired');
    
    const resolved = await am.getApproval(approval.approval_id);
    check(s, 'Final status expired', resolved.status === 'expired');
    
    await cleanup(sg, {planId, execId, approval});
    log('\n✓ Scenario 3 complete', 'green');
  } catch (e) {
    log(`\n✗ Scenario 3 failed: ${e.message}`, 'red');
    results[s].failed++;
  }
}

function report() {
  section('RESULTS');
  let total_pass = 0, total_fail = 0;
  Object.keys(results).forEach(s => {
    const r = results[s];
    total_pass += r.passed;
    total_fail += r.failed;
    const stat = r.failed === 0 ? '✓' : '✗';
    const color = r.failed === 0 ? 'green' : 'red';
    log(`${stat} ${s.toUpperCase()}: ${r.passed} passed, ${r.failed} failed`, color);
  });
  console.log('\n' + '='.repeat(80));
  const final = total_fail === 0 ? '✓ ALL TESTS PASSED' : `✗ ${total_fail} FAILED`;
  log(`${final} (${total_pass} passed, ${total_fail} failed)`, total_fail === 0 ? 'green' : 'red');
  console.log('='.repeat(80) + '\n');
  return total_fail === 0;
}

async function main() {
  const sg = getStateGraph();
  await sg.initialize();
  
  log('Phase 17 Stage 4 — Complete Validation (API-CORRECT)\n', 'cyan');
  
  await scenario1(sg);
  await scenario2(sg);
  await scenario3(sg);
  
  process.exit(report() ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
