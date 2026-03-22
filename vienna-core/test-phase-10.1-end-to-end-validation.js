/**
 * Phase 10.1 — End-to-End Validation
 * 
 * Validates reconciliation lifecycle under real state transitions.
 * 
 * Six core scenarios:
 * 1. Happy path (idle → admitted → started → recovered)
 * 2. In-flight skip (reconciling → skipped)
 * 3. Cooldown failure (execution fails → cooldown)
 * 4. Degraded escalation (attempts exhausted → degraded)
 * 5. Safe mode (blocks admission → skipped)
 * 6. Manual reset (operator override → idle)
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { createReconciliationGate } = require('./lib/core/reconciliation-gate');
const { ObjectiveEvaluator } = require('./lib/core/objective-evaluator-integrated');
const { executeAdmittedRemediation } = require('./lib/core/remediation-trigger-integrated');
const { ReconciliationStatus } = require('./lib/core/reconciliation-state-machine');
const { createObjective } = require('./lib/core/objective-schema');

// Mock chat action bridge for controlled execution
class MockChatActionBridge {
  constructor(shouldSucceed = true, shouldVerify = true) {
    this.shouldSucceed = shouldSucceed;
    this.shouldVerify = shouldVerify;
  }

  async executeRemediationPlan(planId, context) {
    if (!this.shouldSucceed) {
      return {
        success: false,
        status: 'failed',
        error: 'mock_execution_failure',
        execution_id: 'exec_mock_' + Date.now()
      };
    }

    return {
      success: true,
      status: 'completed',
      execution_id: 'exec_mock_' + Date.now(),
      verification_result: {
        objective_achieved: this.shouldVerify,
        summary: this.shouldVerify ? 'mock_verification_success' : 'mock_verification_failure'
      }
    };
  }
}

async function runEndToEndValidation() {
  console.log('Phase 10.1 — End-to-End Validation\n');
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Clean slate
  const db = stateGraph.db;
  db.exec('DELETE FROM managed_objectives');
  db.exec('DELETE FROM managed_objective_history');
  db.exec('DELETE FROM plans');

  // Create a mock plan
  stateGraph.createPlan({
    plan_id: 'plan_recovery',
    objective: 'test_recovery',
    environment: 'test',
    risk_tier: 'T1',
    steps: [{ action_type: 'test', action_id: 'test-action', args: {} }],
    preconditions: [],
    postconditions: [],
    verification_spec: {
      template: 'service_recovery',
      config: { service_id: 'test-service' }
    },
    status: 'approved'
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.log(`  ✗ ${message}`);
      failed++;
    }
  }

  function getEvents(objectiveId) {
    const history = stateGraph.listObjectiveHistory(objectiveId, 100);
    return history.filter(h => h.reason && h.reason.startsWith('objective.reconciliation.'));
  }

  // ===========================================================================
  // Scenario 1: Happy Path
  // ===========================================================================
  console.log('\n=== Scenario 1: Happy Path ===');
  console.log('Expected: requested → started → recovered\n');

  const obj1 = createObjective({
    objective_id: 'obj_happy_path',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s'
  });
  stateGraph.createObjective(obj1);

  const gate1 = createReconciliationGate(stateGraph);
  
  // Step 1: Admit reconciliation
  const admission1 = gate1.admitAndTransition('obj_happy_path', {
    drift_reason: 'test_drift'
  });
  
  assert(admission1.admitted, 'Admission successful');
  assert(admission1.generation === 1, 'Generation is 1');

  // Step 2: Execute remediation
  const mockBridge1 = new MockChatActionBridge(true, true); // succeed + verify
  const execution1 = await executeAdmittedRemediation(
    'obj_happy_path',
    1, // generation
    {
      chatActionBridge: mockBridge1,
      global_safe_mode: false
    }
  );

  console.log('  Execution result:', JSON.stringify(execution1, null, 2));

  assert(execution1.started, 'Execution started');
  assert(execution1.final_status === ReconciliationStatus.IDLE, 'Final status is idle');
  assert(execution1.recovered === true, 'Recovered flag set');

  // Validate ledger events
  const events1 = getEvents('obj_happy_path');
  console.log(`\n  Events recorded: ${events1.length}`);
  events1.forEach(e => console.log(`    - ${e.reason} (${e.from_status} → ${e.to_status})`));

  assert(events1.length === 3, 'Three events recorded');
  if (events1.length >= 3) {
    assert(events1[2].reason === 'objective.reconciliation.requested', 'Event 1: requested');
    assert(events1[1].reason === 'objective.reconciliation.started', 'Event 2: started');
    assert(events1[0].reason === 'objective.reconciliation.recovered', 'Event 3: recovered');
  }

  // Validate generation consistency
  if (events1.length >= 3) {
    const metadata1_1 = events1[2].metadata || {};
    const metadata1_2 = events1[1].metadata || {};
    const metadata1_3 = events1[0].metadata || {};

    assert(metadata1_1.generation === 1, 'Requested: generation 1');
    assert(metadata1_2.generation === 1, 'Started: generation 1');
    assert(metadata1_3.generation === 1, 'Recovered: generation 1');
  }

  // ===========================================================================
  // Scenario 2: In-Flight Skip
  // ===========================================================================
  console.log('\n=== Scenario 2: In-Flight Skip ===');
  console.log('Expected: requested → skipped (in_flight)\n');

  const obj2 = createObjective({
    objective_id: 'obj_in_flight_skip',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s',
    reconciliation_status: ReconciliationStatus.RECONCILING,
    reconciliation_generation: 1
  });
  stateGraph.createObjective(obj2);

  const gate2 = createReconciliationGate(stateGraph);
  const evaluator2 = new ObjectiveEvaluator(stateGraph, gate2);

  // Mock unhealthy observation
  evaluator2._observeState = async () => ({
    observed_state: { service_healthy: false },
    objective_satisfied: false,
    confidence: 0.95
  });

  // Attempt evaluation (should skip because already reconciling)
  const evalResult2 = await evaluator2.evaluateObjective('obj_in_flight_skip');

  assert(evalResult2.skipped, 'Evaluation skipped');
  assert(evalResult2.reason === 'reconciliation_in_progress', 'Skip reason is in_progress');

  const events2 = getEvents('obj_in_flight_skip');
  console.log(`\n  Events recorded: ${events2.length}`);
  
  // Should have NO ledger event because it skips early in evaluateObjective
  // Let me test a different skip scenario - one that goes through the gate

  // ===========================================================================
  // Scenario 2b: Cooldown Skip
  // ===========================================================================
  console.log('\n=== Scenario 2b: Cooldown Skip ===');
  console.log('Expected: skipped (cooldown_not_expired)\n');

  const obj2b = createObjective({
    objective_id: 'obj_cooldown_skip',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s',
    reconciliation_status: ReconciliationStatus.COOLDOWN,
    reconciliation_cooldown_until: new Date(Date.now() + 60000).toISOString() // 1 min future
  });
  stateGraph.createObjective(obj2b);

  const evaluator2b = new ObjectiveEvaluator(stateGraph, gate2);
  evaluator2b._observeState = async () => ({
    observed_state: { service_healthy: false },
    objective_satisfied: false,
    confidence: 0.95
  });

  const evalResult2b = await evaluator2b.evaluateObjective('obj_cooldown_skip');

  const events2b = getEvents('obj_cooldown_skip');
  console.log(`\n  Events recorded: ${events2b.length}`);
  events2b.forEach(e => console.log(`    - ${e.reason}`));

  const skippedEvent2b = events2b.find(e => e.reason === 'objective.reconciliation.skipped');
  assert(skippedEvent2b !== undefined, 'Skipped event recorded');
  
  if (skippedEvent2b) {
    const metadata2b = skippedEvent2b.metadata;
    console.log(`  Skip reason: ${metadata2b.skip_reason}`);
    assert(metadata2b.skip_reason === 'cooldown_not_expired', 'Skip reason is cooldown_not_expired');
  }

  // ===========================================================================
  // Scenario 3: Cooldown Failure
  // ===========================================================================
  console.log('\n=== Scenario 3: Cooldown Failure ===');
  console.log('Expected: requested → started → cooldown_entered\n');

  const obj3 = createObjective({
    objective_id: 'obj_cooldown_failure',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s'
  });
  stateGraph.createObjective(obj3);

  const gate3 = createReconciliationGate(stateGraph);
  const admission3 = gate3.admitAndTransition('obj_cooldown_failure', {});

  assert(admission3.admitted, 'Admission successful');

  // Execute with failure
  const mockBridge3 = new MockChatActionBridge(false, false); // fail execution
  const execution3 = await executeAdmittedRemediation(
    'obj_cooldown_failure',
    1,
    { chatActionBridge: mockBridge3, global_safe_mode: false }
  );

  assert(execution3.started, 'Execution started');
  assert(execution3.final_status === ReconciliationStatus.COOLDOWN, 'Final status is cooldown');

  const events3 = getEvents('obj_cooldown_failure');
  console.log(`\n  Events recorded: ${events3.length}`);
  events3.forEach(e => console.log(`    - ${e.reason} (${e.from_status} → ${e.to_status})`));

  assert(events3.length === 3, 'Three events recorded');
  assert(events3[2].reason === 'objective.reconciliation.requested', 'Event 1: requested');
  assert(events3[1].reason === 'objective.reconciliation.started', 'Event 2: started');
  assert(events3[0].reason === 'objective.reconciliation.cooldown_entered', 'Event 3: cooldown_entered');

  const metadata3 = events3[0].metadata;
  assert(metadata3.error !== undefined, 'Cooldown event includes error');
  assert(metadata3.cooldown_until !== undefined, 'Cooldown event includes cooldown_until');

  // ===========================================================================
  // Scenario 4: Degraded Escalation
  // ===========================================================================
  console.log('\n=== Scenario 4: Degraded Escalation ===');
  console.log('Expected: requested → started → degraded\n');

  const obj4Config = createObjective({
    objective_id: 'obj_degraded',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s'
  });
  // Manually add reconciliation fields
  obj4Config.reconciliation_attempt_count = 2; // Will become 3 after gate admission, then fail → degraded
  stateGraph.createObjective(obj4Config);

  const gate4 = createReconciliationGate(stateGraph);
  const admission4 = gate4.admitAndTransition('obj_degraded', {});

  assert(admission4.admitted, 'Admission successful');

  // Execute with failure and exhausted attempts
  const mockBridge4 = new MockChatActionBridge(false, false);
  
  // Check objective state before execution
  const objBefore4 = stateGraph.getObjective('obj_degraded');
  console.log(`  Objective before execution: attempt_count=${objBefore4.reconciliation_attempt_count}`);
  
  const execution4 = await executeAdmittedRemediation(
    'obj_degraded',
    1,
    { chatActionBridge: mockBridge4, global_safe_mode: false }
  );

  console.log(`  Execution result: status=${execution4.final_status}, started=${execution4.started}`);
  
  assert(execution4.started, 'Execution started');
  assert(execution4.final_status === ReconciliationStatus.DEGRADED, 'Final status is degraded');

  const events4 = getEvents('obj_degraded');
  console.log(`\n  Events recorded: ${events4.length}`);
  events4.forEach(e => console.log(`    - ${e.reason} (${e.from_status} → ${e.to_status})`));

  assert(events4.length === 3, 'Three events recorded');
  assert(events4[0].reason === 'objective.reconciliation.degraded', 'Event 3: degraded');

  const metadata4 = events4[0].metadata;
  assert(metadata4.attempts_exhausted === true, 'Degraded event includes attempts_exhausted');

  // ===========================================================================
  // Scenario 5: Safe Mode
  // ===========================================================================
  console.log('\n=== Scenario 5: Safe Mode ===');
  console.log('Expected: safe_mode_entered → skipped (safe_mode)\n');

  const obj5 = createObjective({
    objective_id: 'obj_safe_mode',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s'
  });
  stateGraph.createObjective(obj5);

  const gate5 = createReconciliationGate(stateGraph);
  
  // Enable safe mode
  gate5.enableSafeMode('test_emergency');

  const events5a = getEvents('obj_safe_mode');
  const safeModeEntered = events5a.find(e => e.reason === 'objective.reconciliation.safe_mode_entered');
  assert(safeModeEntered !== undefined, 'Safe mode entered event recorded');

  // Try to admit (should be denied)
  const evaluator5 = new ObjectiveEvaluator(stateGraph, gate5);
  evaluator5._observeState = async () => ({
    observed_state: { service_healthy: false },
    objective_satisfied: false,
    confidence: 0.95
  });

  const evalResult5 = await evaluator5.evaluateObjective('obj_safe_mode');

  const events5b = getEvents('obj_safe_mode');
  console.log(`\n  Events recorded: ${events5b.length}`);
  events5b.forEach(e => console.log(`    - ${e.reason}`));

  const skippedEvent5 = events5b.find(e => e.reason === 'objective.reconciliation.skipped');
  assert(skippedEvent5 !== undefined, 'Skipped event recorded');

  if (skippedEvent5) {
    const metadata5 = skippedEvent5.metadata || {};
    console.log(`  Actual skip_reason: ${metadata5.skip_reason}`);
    assert(metadata5.skip_reason === 'global_safe_mode', 'Skip reason is global_safe_mode');
  }

  // Disable safe mode
  gate5.disableSafeMode('resolved');
  
  const events5c = getEvents('obj_safe_mode');
  const safeModeReleased = events5c.find(e => e.reason === 'objective.reconciliation.safe_mode_released');
  assert(safeModeReleased !== undefined, 'Safe mode released event recorded');

  // ===========================================================================
  // Scenario 6: Manual Reset
  // ===========================================================================
  console.log('\n=== Scenario 6: Manual Reset ===');
  console.log('Expected: manual_reset (degraded → idle)\n');

  const obj6Config = createObjective({
    objective_id: 'obj_manual_reset',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_healthy: true },
    remediation_plan: 'plan_recovery',
    evaluation_interval: '30s'
  });
  // Manually set reconciliation status to degraded
  obj6Config.reconciliation_status = ReconciliationStatus.DEGRADED;
  stateGraph.createObjective(obj6Config);

  const gate6 = createReconciliationGate(stateGraph);
  
  const resetResult = gate6.manualReset('obj_manual_reset', {
    operator: 'test_operator',
    reason: 'test_reset'
  });

  assert(resetResult.success, 'Manual reset successful');
  assert(resetResult.previous_status === ReconciliationStatus.DEGRADED, 'Previous status was degraded');

  const events6 = getEvents('obj_manual_reset');
  console.log(`\n  Events recorded: ${events6.length}`);
  events6.forEach(e => console.log(`    - ${e.reason} (${e.from_status} → ${e.to_status})`));

  const resetEvent = events6.find(e => e.reason === 'objective.reconciliation.manual_reset');
  assert(resetEvent !== undefined, 'Manual reset event recorded');
  assert(resetEvent.to_status === ReconciliationStatus.IDLE, 'Transitioned to idle');

  if (resetEvent) {
    const metadata6 = resetEvent.metadata;
    assert(metadata6.operator === 'test_operator', 'Operator recorded');
    assert(metadata6.reason === 'test_reset', 'Reset reason recorded');
  }

  // ===========================================================================
  // Summary
  // ===========================================================================
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All end-to-end validation scenarios passed!');
    console.log('\n🎉 Phase 10.1 validation complete. Reconciliation lifecycle proven correct.');
  } else {
    console.log('\n❌ Some validation scenarios failed');
    process.exit(1);
  }
}

runEndToEndValidation().catch(err => {
  console.error('Validation execution failed:', err);
  process.exit(1);
});
