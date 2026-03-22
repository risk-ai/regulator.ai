/**
 * Intent Gateway Tests
 * 
 * Phase 11 — Canonical action ingress validation
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { IntentGateway } = require('./lib/core/intent-gateway');

async function runTests() {
  const sg = getStateGraph();
  await sg.initialize();

  const gateway = new IntentGateway(sg);

  console.log('=== Intent Gateway Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Validate missing intent_type
  console.log('Test 1: Validate missing intent_type');
  const result1 = gateway.validateIntent({ source: { type: 'operator', id: 'test' }, payload: {} });
  if (!result1.valid && result1.error === 'missing_intent_type') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', result1, '\n');
    failed++;
  }

  // Test 2: Validate unsupported intent type
  console.log('Test 2: Validate unsupported intent type');
  const result2 = gateway.validateIntent({
    intent_type: 'unknown_action',
    source: { type: 'operator', id: 'test' },
    payload: {}
  });
  if (!result2.valid && result2.error === 'unsupported_intent_type') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', result2, '\n');
    failed++;
  }

  // Test 3: Validate restore_objective without objective_id
  console.log('Test 3: Validate restore_objective without objective_id');
  const result3 = gateway.validateIntent({
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'test' },
    payload: {}
  });
  if (!result3.valid && result3.error === 'missing_objective_id') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', result3, '\n');
    failed++;
  }

  // Test 4: Validate set_safe_mode without enabled flag
  console.log('Test 4: Validate set_safe_mode without enabled flag');
  const result4 = gateway.validateIntent({
    intent_type: 'set_safe_mode',
    source: { type: 'operator', id: 'test' },
    payload: { reason: 'test' }
  });
  if (!result4.valid && result4.error === 'missing_enabled_flag') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', result4, '\n');
    failed++;
  }

  // Test 5: Normalize restore_objective intent
  console.log('Test 5: Normalize restore_objective intent');
  const rawIntent = {
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'test' },
    payload: { objective_id: '  gateway-health  ' }
  };
  const normalized = gateway.normalizeIntent(rawIntent);
  if (normalized.payload.objective_id === 'gateway-health') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', normalized, '\n');
    failed++;
  }

  // Test 6: Submit investigate_objective for unknown objective
  console.log('Test 6: Submit investigate_objective for unknown objective');
  const response6 = await gateway.submitIntent({
    intent_type: 'investigate_objective',
    source: { type: 'operator', id: 'console' },
    payload: { objective_id: 'nonexistent-obj' }
  });
  if (!response6.accepted && response6.error === 'unknown_objective') {
    console.log('✓ PASS\n');
    passed++;
  } else {
    console.log('✗ FAIL:', response6, '\n');
    failed++;
  }

  // Test 7: Submit set_safe_mode (enable)
  console.log('Test 7: Submit set_safe_mode (enable)');
  const response7 = await gateway.submitIntent({
    intent_type: 'set_safe_mode',
    source: { type: 'operator', id: 'test-operator' },
    payload: { enabled: true, reason: 'Test safe mode enable' }
  });
  if (response7.accepted && response7.action === 'safe_mode_enabled') {
    console.log('✓ PASS');
    console.log('  Safe mode:', response7.metadata.safe_mode.active ? 'enabled' : 'not enabled');
    console.log();
    passed++;
  } else {
    console.log('✗ FAIL:', response7, '\n');
    failed++;
  }

  // Test 8: Submit restore_objective while safe mode active (should deny admission)
  console.log('Test 8: Submit restore_objective while safe mode active');

  // Create test objective
  sg.db.prepare(`
    INSERT OR REPLACE INTO managed_objectives 
    (objective_id, objective_type, target_type, target_id, environment, status, 
     desired_state_json, remediation_plan, evaluation_interval_seconds, verification_strength,
     created_at, updated_at, reconciliation_status, reconciliation_generation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'test-restore-obj',
    'maintain_health',
    'service',
    'test-service',
    'test',
    'monitoring',
    JSON.stringify({ status: 'healthy' }),
    'test-plan',
    300,
    'service_health',
    new Date().toISOString(),
    new Date().toISOString(),
    'idle',
    0
  );

  const response8 = await gateway.submitIntent({
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'console' },
    payload: { objective_id: 'test-restore-obj' }
  });

  if (!response8.accepted && response8.error === 'admission_denied') {
    console.log('✓ PASS');
    console.log('  Admission denied (safe mode active)');
    console.log();
    passed++;
  } else {
    console.log('✗ FAIL:', response8, '\n');
    failed++;
  }

  // Test 9: Disable safe mode
  console.log('Test 9: Submit set_safe_mode (disable)');
  const response9 = await gateway.submitIntent({
    intent_type: 'set_safe_mode',
    source: { type: 'operator', id: 'test-operator' },
    payload: { enabled: false }
  });
  if (response9.accepted && response9.action === 'safe_mode_disabled') {
    console.log('✓ PASS');
    console.log('  Safe mode:', response9.metadata.safe_mode.active ? 'still enabled' : 'disabled');
    console.log();
    passed++;
  } else {
    console.log('✗ FAIL:', response9, '\n');
    failed++;
  }

  // Test 10: Submit restore_objective after safe mode disabled (should admit)
  console.log('Test 10: Submit restore_objective after safe mode disabled');
  const response10 = await gateway.submitIntent({
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'console' },
    payload: { objective_id: 'test-restore-obj' }
  });

  if (response10.accepted && response10.action === 'reconciliation_requested') {
    console.log('✓ PASS');
    console.log('  Generation:', response10.metadata.generation);
    console.log();
    passed++;
  } else {
    console.log('✗ FAIL:', response10, '\n');
    failed++;
  }

  // Test 11: Submit investigate_objective for existing objective
  console.log('Test 11: Submit investigate_objective for existing objective');
  const response11 = await gateway.submitIntent({
    intent_type: 'investigate_objective',
    source: { type: 'operator', id: 'console' },
    payload: { objective_id: 'test-restore-obj' }
  });

  if (response11.accepted && response11.action === 'investigation_report') {
    console.log('✓ PASS');
    console.log('  Objective status:', response11.metadata.summary.current_status);
    console.log('  Reconciliation status:', response11.metadata.summary.reconciliation_status);
    console.log();
    passed++;
  } else {
    console.log('✗ FAIL:', response11, '\n');
    failed++;
  }

  // Cleanup
  sg.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run('test-restore-obj');

  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n✅ All tests passed');
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(console.error);
