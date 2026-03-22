/**
 * Intent Gateway Integration Tests
 * 
 * Phase 11 — End-to-end integration validation
 * Tests Intent Gateway as canonical action ingress
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { IntentGateway } = require('./lib/core/intent-gateway');

async function runIntegrationTests() {
  const sg = await getStateGraph();
  await sg.initialize();

  const gateway = new IntentGateway(sg);

  console.log('=== Intent Gateway Integration Tests ===\n');

  let passed = 0;
  let failed = 0;

  // ============================================================
  // Test 1: restore_objective via Intent Gateway
  // ============================================================
  console.log('Test 1: restore_objective via Intent Gateway');
  
  // Create test objective
  sg.db.prepare(`
    INSERT OR REPLACE INTO managed_objectives 
    (objective_id, objective_type, target_type, target_id, environment, status, 
     desired_state_json, remediation_plan, evaluation_interval_seconds, verification_strength,
     created_at, updated_at, reconciliation_status, reconciliation_generation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'test-restore-gateway-obj',
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
  
  const restoreResult = await gateway.submitIntent({
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'integration-test' },
    payload: { objective_id: 'test-restore-gateway-obj' }
  });
  
  if (restoreResult.accepted && restoreResult.action === 'reconciliation_requested') {
    console.log('✓ PASS - Reconciliation admitted');
    console.log('  Generation:', restoreResult.metadata.generation);
    passed++;
  } else {
    console.log('✗ FAIL:', restoreResult);
    failed++;
  }
  console.log();

  // ============================================================
  // Test 2: investigate_objective via Intent Gateway
  // ============================================================
  console.log('Test 2: investigate_objective via Intent Gateway');
  
  const investigateResult = await gateway.submitIntent({
    intent_type: 'investigate_objective',
    source: { type: 'operator', id: 'integration-test' },
    payload: { objective_id: 'test-restore-gateway-obj' }
  });
  
  if (investigateResult.accepted && investigateResult.action === 'investigation_report') {
    console.log('✓ PASS - Investigation complete');
    console.log('  Status:', investigateResult.metadata.summary.current_status);
    console.log('  Reconciliation:', investigateResult.metadata.summary.reconciliation_status);
    passed++;
  } else {
    console.log('✗ FAIL:', investigateResult);
    failed++;
  }
  console.log();

  // ============================================================
  // Test 3: set_safe_mode via Intent Gateway (enable)
  // ============================================================
  console.log('Test 3: set_safe_mode (enable) via Intent Gateway');
  
  const enableSafeModeResult = await gateway.submitIntent({
    intent_type: 'set_safe_mode',
    source: { type: 'operator', id: 'integration-test' },
    payload: { enabled: true, reason: 'Integration test safe mode' }
  });
  
  if (enableSafeModeResult.accepted && enableSafeModeResult.action === 'safe_mode_enabled') {
    console.log('✓ PASS - Safe mode enabled');
    console.log('  Active:', enableSafeModeResult.metadata.safe_mode.active);
    passed++;
  } else {
    console.log('✗ FAIL:', enableSafeModeResult);
    failed++;
  }
  console.log();

  // ============================================================
  // Test 4: restore_objective denied while safe mode active
  // ============================================================
  console.log('Test 4: restore_objective denied during safe mode');
  
  const deniedRestoreResult = await gateway.submitIntent({
    intent_type: 'restore_objective',
    source: { type: 'operator', id: 'integration-test' },
    payload: { objective_id: 'test-restore-gateway-obj' }
  });
  
  if (!deniedRestoreResult.accepted && deniedRestoreResult.error === 'admission_denied') {
    console.log('✓ PASS - Admission correctly denied');
    console.log('  Reason:', deniedRestoreResult.metadata.admission_reason);
    passed++;
  } else {
    console.log('✗ FAIL:', deniedRestoreResult);
    failed++;
  }
  console.log();

  // ============================================================
  // Test 5: set_safe_mode (disable) via Intent Gateway
  // ============================================================
  console.log('Test 5: set_safe_mode (disable) via Intent Gateway');
  
  const disableSafeModeResult = await gateway.submitIntent({
    intent_type: 'set_safe_mode',
    source: { type: 'operator', id: 'integration-test' },
    payload: { enabled: false }
  });
  
  if (disableSafeModeResult.accepted && disableSafeModeResult.action === 'safe_mode_disabled') {
    console.log('✓ PASS - Safe mode disabled');
    console.log('  Active:', disableSafeModeResult.metadata.safe_mode.active);
    passed++;
  } else {
    console.log('✗ FAIL:', disableSafeModeResult);
    failed++;
  }
  console.log();

  // ============================================================
  // Test 6: Legacy direct call emits bypass warning
  // ============================================================
  console.log('Test 6: Legacy direct call (hybrid enforcement warning)');
  
  // Capture console.warn output
  const originalWarn = console.warn;
  let warningCaptured = false;
  console.warn = function(...args) {
    if (args[0] && args[0].includes('DIRECT_ACTION_BYPASS')) {
      warningCaptured = true;
    }
    originalWarn.apply(console, args);
  };
  
  // Direct call without intent context
  sg.enableSafeMode('Direct call test', 'test-operator');
  sg.disableSafeMode('test-operator');
  
  // Restore console.warn
  console.warn = originalWarn;
  
  if (warningCaptured) {
    console.log('✓ PASS - Hybrid enforcement warning emitted');
    passed++;
  } else {
    console.log('✗ FAIL - No bypass warning detected');
    failed++;
  }
  console.log();

  // ============================================================
  // Test 7: Lifecycle events recorded
  // ============================================================
  console.log('Test 7: Intent lifecycle events recorded');
  
  const lifecycleEvents = sg.query(`
    SELECT event_type, payload_json
    FROM execution_ledger_events
    WHERE stage = 'intent'
    ORDER BY event_timestamp DESC
    LIMIT 20
  `);
  
  const eventTypes = lifecycleEvents.map(e => e.event_type);
  const hasSubmitted = eventTypes.some(t => t === 'intent.submitted');
  const hasValidated = eventTypes.some(t => t === 'intent.validated');
  const hasResolved = eventTypes.some(t => t === 'intent.resolved');
  const hasExecuted = eventTypes.some(t => t === 'intent.executed');
  const hasDenied = eventTypes.some(t => t === 'intent.denied');
  
  if (hasSubmitted && hasValidated && hasResolved && hasExecuted && hasDenied) {
    console.log('✓ PASS - All lifecycle events present');
    console.log('  Submitted:', hasSubmitted);
    console.log('  Validated:', hasValidated);
    console.log('  Resolved:', hasResolved);
    console.log('  Executed:', hasExecuted);
    console.log('  Denied:', hasDenied);
    passed++;
  } else {
    console.log('✗ FAIL - Missing lifecycle events');
    console.log('  Submitted:', hasSubmitted);
    console.log('  Validated:', hasValidated);
    console.log('  Resolved:', hasResolved);
    console.log('  Executed:', hasExecuted);
    console.log('  Denied:', hasDenied);
    failed++;
  }
  console.log();

  // Cleanup
  sg.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run('test-restore-gateway-obj');

  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n✅ All integration tests passed');
  } else {
    console.log('\n❌ Some integration tests failed');
    process.exit(1);
  }
}

runIntegrationTests().catch(console.error);
