/**
 * Phase 10.1f — Lifecycle Ledger Event Validation
 * 
 * Validates that all 9 reconciliation lifecycle events are recorded correctly.
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { createReconciliationGate } = require('./lib/core/reconciliation-gate');
const { ObjectiveEvaluator } = require('./lib/core/objective-evaluator-integrated');
const { executeAdmittedRemediation } = require('./lib/core/remediation-trigger-integrated');
const { ReconciliationStatus } = require('./lib/core/reconciliation-state-machine');
const { createObjective } = require('./lib/core/objective-schema');

async function runLifecycleLedgerTests() {
  console.log('Phase 10.1f — Lifecycle Ledger Event Validation\n');
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Clean slate
  const db = stateGraph.db;
  db.exec('DELETE FROM managed_objectives');
  db.exec('DELETE FROM managed_objective_history');
  db.exec('DELETE FROM plans');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`);
      passed++;
    } else {
      console.log(`✗ ${message}`);
      failed++;
    }
  }

  // Test 1: objective.reconciliation.requested event
  console.log('\n=== Test 1: Reconciliation Requested Event ===');
  
  const obj1Config = createObjective({
    objective_id: 'obj_requested_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s'
  });
  
  const objective1 = stateGraph.createObjective(obj1Config);

  const gate = createReconciliationGate(stateGraph);
  const admission = gate.admitAndTransition('obj_requested_test', {
    drift_reason: 'test_drift'
  });

  assert(admission.admitted, 'Admission successful');
  
  const history1 = stateGraph.listObjectiveHistory('obj_requested_test', 10);
  assert(history1.length === 1, 'One history event recorded');
  assert(
    history1[0].reason === 'objective.reconciliation.requested',
    'Event type is objective.reconciliation.requested'
  );
  
  const metadata1 = history1[0].metadata || {};
  assert(metadata1.generation === 1, 'Generation recorded in metadata');
  assert(metadata1.admission_reason === 'drift_detected', 'Admission reason recorded');

  // Test 2: objective.reconciliation.skipped event (safe mode)
  console.log('\n=== Test 2: Reconciliation Skipped (Safe Mode) ===');
  
  const objective2 = stateGraph.createObjective({
    objective_id: 'obj_skipped_safe_mode',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health',
    reconciliation_status: ReconciliationStatus.IDLE
  });

  gate.enableSafeMode('test');
  
  const evaluator = new ObjectiveEvaluator(stateGraph, gate);
  
  // Mock unhealthy observation
  evaluator._observeState = async () => ({
    observed_state: { service_healthy: false },
    objective_satisfied: false,
    confidence: 0.95
  });

  const evalResult2 = await evaluator.evaluateObjective('obj_skipped_safe_mode');
  
  const history2 = stateGraph.listObjectiveHistory('obj_skipped_safe_mode', 10);
  const skippedEvent = history2.find(h => h.reason === 'objective.reconciliation.skipped');
  const safeModeEvent = history2.find(h => h.reason === 'objective.reconciliation.safe_mode_entered');
  
  assert(safeModeEvent !== undefined, 'Safe mode entered event recorded');
  assert(skippedEvent !== undefined, 'Reconciliation skipped event recorded');
  
  const metadata2 = skippedEvent.metadata || {};
  assert(metadata2.skip_reason === 'global_safe_mode', 'Skip reason is global_safe_mode');

  gate.disableSafeMode('test');

  // Test 3: objective.reconciliation.cooldown_entered event
  console.log('\n=== Test 3: Cooldown Entered Event ===');
  
  const objective3 = stateGraph.createObjective({
    objective_id: 'obj_cooldown_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health',
    reconciliation_status: ReconciliationStatus.RECONCILING,
    reconciliation_generation: 1,
    reconciliation_attempt_count: 1
  });

  // Simulate execution failure
  const { handleExecutionFailure } = require('./lib/core/remediation-trigger-integrated');
  handleExecutionFailure(stateGraph, objective3, 'test_error', 'exec_123');

  const history3 = stateGraph.listObjectiveHistory('obj_cooldown_test', 10);
  const cooldownEvent = history3.find(h => h.reason === 'objective.reconciliation.cooldown_entered');
  
  assert(cooldownEvent !== undefined, 'Cooldown entered event recorded');
  
  const metadata3 = cooldownEvent.metadata || {};
  assert(metadata3.execution_id === 'exec_123', 'Execution ID recorded');
  assert(metadata3.error === 'test_error', 'Error recorded');
  assert(metadata3.cooldown_until !== undefined, 'Cooldown until timestamp recorded');

  // Test 4: objective.reconciliation.degraded event
  console.log('\n=== Test 4: Degraded Event ===');
  
  const objective4 = stateGraph.createObjective({
    objective_id: 'obj_degraded_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health',
    reconciliation_status: ReconciliationStatus.RECONCILING,
    reconciliation_generation: 1,
    reconciliation_attempt_count: 3 // Max attempts
  });

  // Simulate execution failure with exhausted attempts
  handleExecutionFailure(stateGraph, objective4, 'test_error', 'exec_456');

  const history4 = stateGraph.listObjectiveHistory('obj_degraded_test', 10);
  const degradedEvent = history4.find(h => h.reason === 'objective.reconciliation.degraded');
  
  assert(degradedEvent !== undefined, 'Degraded event recorded');
  
  const metadata4 = degradedEvent.metadata || {};
  assert(metadata4.attempts_exhausted === true, 'Attempts exhausted flag set');

  // Test 5: objective.reconciliation.recovered event
  console.log('\n=== Test 5: Recovered Event ===');
  
  const objective5 = stateGraph.createObjective({
    objective_id: 'obj_recovered_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health',
    reconciliation_status: ReconciliationStatus.RECONCILING,
    reconciliation_generation: 1,
    reconciliation_attempt_count: 1
  });

  // Simulate verification success
  const { handleVerificationSuccess } = require('./lib/core/remediation-trigger-integrated');
  handleVerificationSuccess(stateGraph, objective5, 'exec_789');

  const history5 = stateGraph.listObjectiveHistory('obj_recovered_test', 10);
  const recoveredEvent = history5.find(h => h.reason === 'objective.reconciliation.recovered');
  
  assert(recoveredEvent !== undefined, 'Recovered event recorded');
  assert(recoveredEvent.to_status === ReconciliationStatus.IDLE, 'Transitioned to idle');
  
  const metadata5 = recoveredEvent.metadata || {};
  assert(metadata5.execution_id === 'exec_789', 'Execution ID recorded');
  assert(metadata5.verified_at !== undefined, 'Verification timestamp recorded');

  // Test 6: objective.reconciliation.manual_reset event
  console.log('\n=== Test 6: Manual Reset Event ===');
  
  const objective6 = stateGraph.createObjective({
    objective_id: 'obj_manual_reset_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health',
    reconciliation_status: ReconciliationStatus.DEGRADED
  });

  const resetResult = gate.manualReset('obj_manual_reset_test', {
    operator: 'test_operator',
    reason: 'testing_reset'
  });

  assert(resetResult.success, 'Manual reset successful');
  
  const history6 = stateGraph.listObjectiveHistory('obj_manual_reset_test', 10);
  const resetEvent = history6.find(h => h.reason === 'objective.reconciliation.manual_reset');
  
  assert(resetEvent !== undefined, 'Manual reset event recorded');
  assert(resetEvent.to_status === ReconciliationStatus.IDLE, 'Transitioned to idle');
  
  const metadata6 = resetEvent.metadata || {};
  assert(metadata6.operator === 'test_operator', 'Operator recorded');
  assert(metadata6.reason === 'testing_reset', 'Reset reason recorded');

  // Test 7 & 8: Safe mode entered/released events
  console.log('\n=== Test 7 & 8: Safe Mode Events ===');
  
  const objective7 = stateGraph.createObjective({
    objective_id: 'obj_safe_mode_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_test',
    evaluation_interval: '30s',
    status: 'monitoring',
    verification_strength: 'service_health'
  });

  gate.enableSafeMode('emergency');
  
  const history7a = stateGraph.listObjectiveHistory('obj_safe_mode_test', 10);
  const safeModeEntered = history7a.find(h => h.reason === 'objective.reconciliation.safe_mode_entered');
  
  assert(safeModeEntered !== undefined, 'Safe mode entered event recorded');
  
  const metadata7a = safeModeEntered.metadata || {};
  assert(metadata7a.reason === 'emergency', 'Safe mode reason recorded');

  gate.disableSafeMode('resolved');
  
  const history7b = stateGraph.listObjectiveHistory('obj_safe_mode_test', 10);
  const safeModeReleased = history7b.find(h => h.reason === 'objective.reconciliation.safe_mode_released');
  
  assert(safeModeReleased !== undefined, 'Safe mode released event recorded');
  
  const metadata7b = safeModeReleased.metadata || {};
  assert(metadata7b.reason === 'resolved', 'Safe mode release reason recorded');

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All lifecycle ledger tests passed!');
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runLifecycleLedgerTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
