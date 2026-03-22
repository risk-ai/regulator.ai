// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Test: Objective Evaluator — Phase 9.4
 * 
 * Validates deterministic observation loop for objective state management.
 */

const fs = require('fs');
const path = require('path');
const { StateGraph } = require('../../lib/state/state-graph');
const { createObjective, OBJECTIVE_STATUS } = require('../../lib/core/objective-schema');
const { TRANSITION_REASON } = require('../../lib/core/objective-state-machine');
const { ObjectiveEvaluator } = require('../../lib/core/objective-evaluator');

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-evaluator.db');

/**
 * Test runner
 */
async function runTests() {
  console.log('Testing Objective Evaluator (Phase 9.4)...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
  }
  
  async function asyncTest(name, fn) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
  }
  
  // Setup: Clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  const stateGraph = new StateGraph({ dbPath: TEST_DB_PATH, environment: 'test' });
  await stateGraph.initialize();
  
  const evaluator = new ObjectiveEvaluator(stateGraph);
  
  // ========================================
  // Category A: Skip Logic
  // ========================================
  
  await asyncTest('A1: Skip disabled objectives', async () => {
    const objective = createObjective({
      target_id: 'service-a1',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    objective.is_enabled = false;
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.skipped) {
      throw new Error('Should skip disabled objective');
    }
    if (result.reason !== 'objective_disabled') {
      throw new Error('Should report disabled reason');
    }
  });
  
  await asyncTest('A2: Skip archived objectives', async () => {
    const objective = createObjective({
      target_id: 'service-a2',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.SUSPENDED, TRANSITION_REASON.MANUAL_SUSPENSION);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.ARCHIVED, TRANSITION_REASON.MANUAL_ARCHIVE);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.skipped) {
      throw new Error('Should skip archived objective');
    }
    if (result.reason !== 'objective_archived') {
      throw new Error('Should report archived reason');
    }
  });
  
  await asyncTest('A3: Skip suspended objectives', async () => {
    const objective = createObjective({
      target_id: 'service-a3',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.SUSPENDED, TRANSITION_REASON.MANUAL_SUSPENSION);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.skipped) {
      throw new Error('Should skip suspended objective');
    }
    if (result.reason !== 'objective_suspended') {
      throw new Error('Should report suspended reason');
    }
  });
  
  await asyncTest('A4: Skip objectives during remediation', async () => {
    const objective = createObjective({
      target_id: 'service-a4',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, TRANSITION_REASON.POLICY_APPROVED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.skipped) {
      throw new Error('Should skip objective during remediation');
    }
    if (result.reason !== 'remediation_in_progress') {
      throw new Error('Should report remediation_in_progress reason');
    }
  });
  
  // ========================================
  // Category B: State Transitions
  // ========================================
  
  await asyncTest('B1: DECLARED → MONITORING on first evaluation', async () => {
    const objective = createObjective({
      target_id: 'service-b1',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    // Create service in State Graph
    stateGraph.createService({
      service_id: 'service-b1',
      service_name: 'Test Service B1',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.action_taken !== 'monitoring') {
      throw new Error('Should take monitoring action');
    }
    if (!result.state_transition) {
      throw new Error('Should have state transition');
    }
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should transition to MONITORING');
    }
    
    // Verify persistence
    const updated = stateGraph.getObjective(objective.objective_id);
    if (updated.status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Status should be persisted as MONITORING');
    }
  });
  
  await asyncTest('B2: MONITORING → HEALTHY when satisfied', async () => {
    const objective = createObjective({
      target_id: 'service-b2',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b2',
      service_name: 'Test Service B2',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.objective_satisfied) {
      throw new Error('Objective should be satisfied');
    }
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.HEALTHY) {
      throw new Error('Should transition to HEALTHY');
    }
  });
  
  await asyncTest('B3: MONITORING → VIOLATION_DETECTED when not satisfied', async () => {
    const objective = createObjective({
      target_id: 'service-b3',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b3',
      service_name: 'Test Service B3',
      service_type: 'daemon',
      status: 'stopped',  // Not satisfied
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.objective_satisfied) {
      throw new Error('Objective should NOT be satisfied');
    }
    if (!result.violation_detected) {
      throw new Error('Should detect violation');
    }
    if (result.action_taken !== 'remediation_triggered') {
      throw new Error('Should trigger remediation');
    }
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.VIOLATION_DETECTED) {
      throw new Error('Should transition to VIOLATION_DETECTED');
    }
    if (result.triggered_plan_id !== 'recovery') {
      throw new Error('Should set triggered_plan_id');
    }
  });
  
  await asyncTest('B4: HEALTHY remains HEALTHY when satisfied', async () => {
    const objective = createObjective({
      target_id: 'service-b4',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b4',
      service_name: 'Test Service B4',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.HEALTHY, TRANSITION_REASON.SYSTEM_HEALTHY);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.objective_satisfied) {
      throw new Error('Objective should be satisfied');
    }
    if (result.state_transition) {
      throw new Error('Should not transition (already healthy)');
    }
    if (result.result_summary !== 'System remains healthy') {
      throw new Error('Should report system remains healthy');
    }
  });
  
  await asyncTest('B5: HEALTHY → VIOLATION_DETECTED when becomes unhealthy', async () => {
    const objective = createObjective({
      target_id: 'service-b5',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b5',
      service_name: 'Test Service B5',
      service_type: 'daemon',
      status: 'stopped',  // Now unhealthy
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.HEALTHY, TRANSITION_REASON.SYSTEM_HEALTHY);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.objective_satisfied) {
      throw new Error('Objective should NOT be satisfied');
    }
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.VIOLATION_DETECTED) {
      throw new Error('Should transition to VIOLATION_DETECTED');
    }
  });
  
  await asyncTest('B6: RESTORED → MONITORING when stable', async () => {
    const objective = createObjective({
      target_id: 'service-b6',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b6',
      service_name: 'Test Service B6',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, TRANSITION_REASON.POLICY_APPROVED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_RUNNING, TRANSITION_REASON.EXECUTION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VERIFICATION, TRANSITION_REASON.EXECUTION_COMPLETED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.RESTORED, TRANSITION_REASON.VERIFICATION_PASSED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.objective_satisfied) {
      throw new Error('Objective should be satisfied');
    }
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should transition back to MONITORING');
    }
    if (result.result_summary !== 'System stable after restoration') {
      throw new Error('Should report system stable');
    }
  });
  
  await asyncTest('B7: RESTORED → MONITORING on regression', async () => {
    const objective = createObjective({
      target_id: 'service-b7',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b7',
      service_name: 'Test Service B7',
      service_type: 'daemon',
      status: 'stopped',  // Regression
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, TRANSITION_REASON.POLICY_APPROVED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_RUNNING, TRANSITION_REASON.EXECUTION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VERIFICATION, TRANSITION_REASON.EXECUTION_COMPLETED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.RESTORED, TRANSITION_REASON.VERIFICATION_PASSED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.objective_satisfied) {
      throw new Error('Objective should NOT be satisfied');
    }
    // Should go RESTORED → MONITORING first (violation will be detected on next evaluation)
    if (result.state_transition.to_status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error(`Should transition to MONITORING, got ${result.state_transition.to_status}`);
    }
    if (!result.state_transition.metadata.regression_after_restoration) {
      throw new Error('Should flag regression');
    }
  });
  
  await asyncTest('B8: FAILED remains FAILED', async () => {
    const objective = createObjective({
      target_id: 'service-b8',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-b8',
      service_name: 'Test Service B8',
      service_type: 'daemon',
      status: 'stopped',
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, TRANSITION_REASON.POLICY_APPROVED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_RUNNING, TRANSITION_REASON.EXECUTION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.FAILED, TRANSITION_REASON.EXECUTION_FAILED);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.action_taken !== 'none') {
      throw new Error('Should take no action on failed objective');
    }
    if (result.state_transition) {
      throw new Error('Should not transition (requires manual intervention)');
    }
    if (!result.result_summary.includes('manual intervention')) {
      throw new Error('Should indicate manual intervention required');
    }
  });
  
  // ========================================
  // Category C: Observation
  // ========================================
  
  await asyncTest('C1: Service observation detects active service', async () => {
    const objective = createObjective({
      target_id: 'service-c1',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-c1',
      service_name: 'Test Service C1',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.observed_state.service_active) {
      throw new Error('Should observe service_active=true');
    }
    if (!result.objective_satisfied) {
      throw new Error('Should be satisfied');
    }
  });
  
  await asyncTest('C2: Service observation detects stopped service', async () => {
    const objective = createObjective({
      target_id: 'service-c2',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-c2',
      service_name: 'Test Service C2',
      service_type: 'daemon',
      status: 'stopped',
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (result.observed_state.service_active) {
      throw new Error('Should observe service_active=false');
    }
    if (result.objective_satisfied) {
      throw new Error('Should NOT be satisfied');
    }
  });
  
  await asyncTest('C3: Service observation checks health', async () => {
    const objective = createObjective({
      target_id: 'service-c3',
      desired_state: { service_healthy: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-c3',
      service_name: 'Test Service C3',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.observed_state.service_healthy) {
      throw new Error('Should observe service_healthy=true');
    }
    if (!result.objective_satisfied) {
      throw new Error('Should be satisfied');
    }
  });
  
  await asyncTest('C4: Endpoint observation detects active endpoint', async () => {
    const objective = createObjective({
      target_id: 'endpoint-c4',
      target_type: 'endpoint',
      desired_state: { endpoint_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createEndpoint({
      endpoint_id: 'endpoint-c4',
      endpoint_name: 'Test Endpoint',
      endpoint_type: 'remote',
      status: 'active',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.observed_state.endpoint_active) {
      throw new Error('Should observe endpoint_active=true');
    }
    if (!result.objective_satisfied) {
      throw new Error('Should be satisfied');
    }
  });
  
  await asyncTest('C5: Provider observation detects active provider', async () => {
    const objective = createObjective({
      target_id: 'provider-c5',
      target_type: 'provider',
      desired_state: { provider_active: true, provider_healthy: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createProvider({
      provider_id: 'provider-c5',
      provider_name: 'Test Provider',
      provider_type: 'llm',
      status: 'active',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    const result = await evaluator.evaluateObjective(objective.objective_id);
    
    if (!result.observed_state.provider_active) {
      throw new Error('Should observe provider_active=true');
    }
    if (!result.observed_state.provider_healthy) {
      throw new Error('Should observe provider_healthy=true');
    }
    if (!result.objective_satisfied) {
      throw new Error('Should be satisfied');
    }
  });
  
  // ========================================
  // Category D: Persistence
  // ========================================
  
  await asyncTest('D1: Evaluation result persists to database', async () => {
    const objective = createObjective({
      target_id: 'service-d1',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-d1',
      service_name: 'Test Service D1',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    await evaluator.evaluateObjective(objective.objective_id);
    
    const evaluations = stateGraph.listObjectiveEvaluations(objective.objective_id);
    
    if (evaluations.length === 0) {
      throw new Error('Evaluation should be persisted');
    }
    
    const latest = evaluations[0];
    if (!latest.objective_satisfied) {
      throw new Error('Should persist objective_satisfied');
    }
    if (latest.violation_detected) {
      throw new Error('Should persist violation_detected=false');
    }
  });
  
  await asyncTest('D2: State transition persists to history', async () => {
    const objective = createObjective({
      target_id: 'service-d2',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-d2',
      service_name: 'Test Service D2',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(objective);
    
    await evaluator.evaluateObjective(objective.objective_id);
    
    const history = stateGraph.listObjectiveHistory(objective.objective_id);
    
    if (history.length === 0) {
      throw new Error('History should be persisted');
    }
    
    const latest = history[0];
    if (latest.to_status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should persist status transition');
    }
  });
  
  await asyncTest('D3: Triggered plan ID persists', async () => {
    const objective = createObjective({
      target_id: 'service-d3',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    stateGraph.createService({
      service_id: 'service-d3',
      service_name: 'Test Service D3',
      service_type: 'daemon',
      status: 'stopped',
      health: 'unhealthy'
    });
    
    stateGraph.createObjective(objective);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    
    await evaluator.evaluateObjective(objective.objective_id);
    
    const evaluations = stateGraph.listObjectiveEvaluations(objective.objective_id);
    const latest = evaluations[0];
    
    if (latest.triggered_plan_id !== 'gateway_recovery') {
      throw new Error('Should persist triggered_plan_id');
    }
  });
  
  // ========================================
  // Category E: Batch Evaluation
  // ========================================
  
  await asyncTest('E1: evaluateAll processes multiple objectives', async () => {
    // Create multiple objectives
    for (let i = 1; i <= 3; i++) {
      const objective = createObjective({
        target_id: `service-e1-${i}`,
        desired_state: { service_active: true },
        remediation_plan: 'recovery'
      });
      
      stateGraph.createService({
        service_id: `service-e1-${i}`,
        service_name: `Test Service E1-${i}`,
        service_type: 'daemon',
        status: 'running',
        health: 'healthy'
      });
      
      stateGraph.createObjective(objective);
    }
    
    const results = await evaluator.evaluateAll();
    
    if (results.length < 3) {
      throw new Error('Should evaluate all objectives');
    }
  });
  
  await asyncTest('E2: evaluateAll excludes disabled objectives', async () => {
    // Create enabled and disabled objectives
    const enabled = createObjective({
      target_id: 'service-e2-enabled',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    const disabled = createObjective({
      target_id: 'service-e2-disabled',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    disabled.is_enabled = false;
    
    stateGraph.createService({
      service_id: 'service-e2-enabled',
      service_name: 'Enabled Service',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    
    stateGraph.createObjective(enabled);
    stateGraph.createObjective(disabled);
    
    const results = await evaluator.evaluateAll();
    
    const enabledResult = results.find(r => r.objective_id === enabled.objective_id);
    const disabledResult = results.find(r => r.objective_id === disabled.objective_id);
    
    if (!enabledResult) {
      throw new Error('Should include enabled objective');
    }
    if (disabledResult) {
      throw new Error('Should exclude disabled objective from batch');
    }
  });
  
  // ========================================
  // Cleanup
  // ========================================
  
  stateGraph.close();
  
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // ========================================
  // Results
  // ========================================
  
  console.log('\n' + '='.repeat(60));
  console.log(`Objective Evaluator Tests: ${results.passed}/${results.passed + results.failed} passed`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ All objective evaluator tests passed');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
