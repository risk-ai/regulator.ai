// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Test: State Graph Objectives — Phase 9.3
 * 
 * Validates State Graph persistence for objectives, evaluations, and history.
 */

const fs = require('fs');
const path = require('path');
const { StateGraph } = require('../../lib/state/state-graph');
const { createObjective, OBJECTIVE_STATUS } = require('../../lib/core/objective-schema');
const { TRANSITION_REASON } = require('../../lib/core/objective-state-machine');

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-objectives.db');

/**
 * Test runner
 */
async function runTests() {
  console.log('Testing State Graph Objectives (Phase 9.3)...\n');
  
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
  
  // Setup: Clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  const stateGraph = new StateGraph({ dbPath: TEST_DB_PATH, environment: 'test' });
  await stateGraph.initialize();
  
  // ========================================
  // Category A: Objective Creation
  // ========================================
  
  test('A1: Create objective persists to database', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const created = stateGraph.createObjective(objective);
    
    if (!created) throw new Error('Should return created objective');
    if (created.objective_id !== objective.objective_id) {
      throw new Error('objective_id should match');
    }
    if (created.status !== OBJECTIVE_STATUS.DECLARED) {
      throw new Error('Initial status should be DECLARED');
    }
  });
  
  test('A2: Create objective with custom fields', () => {
    const objective = createObjective({
      target_id: 'kalshi-api',
      desired_state: { health_endpoint: '/health', response_time_ms: 200 },
      remediation_plan: 'api_recovery',
      priority: 50,
      owner: 'castlereagh',
      verification_strength: 'http_healthcheck'
    });
    
    const created = stateGraph.createObjective(objective);
    
    if (created.priority !== 50) {
      throw new Error('Should preserve custom priority');
    }
    if (created.owner !== 'castlereagh') {
      throw new Error('Should preserve custom owner');
    }
    if (created.verification_strength !== 'http_healthcheck') {
      throw new Error('Should preserve verification_strength');
    }
  });
  
  test('A3: Create objective rejects invalid objective', () => {
    let threw = false;
    try {
      stateGraph.createObjective({
        target_id: 'test-service',
        desired_state: { active: true }
        // Missing remediation_plan
      });
    } catch (error) {
      threw = true;
      if (!error.message.includes('Invalid objective')) {
        throw new Error('Should report invalid objective');
      }
    }
    
    if (!threw) {
      throw new Error('Should have thrown validation error');
    }
  });
  
  test('A4: Create objective sets environment correctly', () => {
    const objective = createObjective({
      target_id: 'test-service',
      desired_state: { active: true },
      remediation_plan: 'test_recovery'
    });
    
    const created = stateGraph.createObjective(objective);
    
    if (created.environment !== 'test') {
      throw new Error(`Expected environment=test, got ${created.environment}`);
    }
  });
  
  // ========================================
  // Category B: Objective Retrieval
  // ========================================
  
  test('B1: getObjective retrieves by ID', () => {
    const objective = createObjective({
      target_id: 'service-b1',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    const retrieved = stateGraph.getObjective(objective.objective_id);
    
    if (!retrieved) throw new Error('Should retrieve objective');
    if (retrieved.objective_id !== objective.objective_id) {
      throw new Error('Should retrieve correct objective');
    }
  });
  
  test('B2: getObjective returns null for missing ID', () => {
    const retrieved = stateGraph.getObjective('nonexistent_id');
    
    if (retrieved !== null) {
      throw new Error('Should return null for missing ID');
    }
  });
  
  test('B3: listObjectives returns all objectives', () => {
    const objectives = stateGraph.listObjectives();
    
    if (!Array.isArray(objectives)) {
      throw new Error('Should return array');
    }
    if (objectives.length === 0) {
      throw new Error('Should have objectives from previous tests');
    }
  });
  
  test('B4: listObjectives filters by status', () => {
    const objectives = stateGraph.listObjectives({ status: OBJECTIVE_STATUS.DECLARED });
    
    if (!Array.isArray(objectives)) {
      throw new Error('Should return array');
    }
    
    objectives.forEach(obj => {
      if (obj.status !== OBJECTIVE_STATUS.DECLARED) {
        throw new Error('All filtered objectives should have status=DECLARED');
      }
    });
  });
  
  test('B5: listObjectives filters by target_id', () => {
    const targetId = 'openclaw-gateway';
    const objectives = stateGraph.listObjectives({ target_id: targetId });
    
    objectives.forEach(obj => {
      if (obj.target_id !== targetId) {
        throw new Error(`All filtered objectives should have target_id=${targetId}`);
      }
    });
  });
  
  test('B6: listObjectives filters by is_enabled', () => {
    // Create disabled objective
    const objective = createObjective({
      target_id: 'service-disabled',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    objective.is_enabled = false;
    stateGraph.createObjective(objective);
    
    const disabled = stateGraph.listObjectives({ is_enabled: false });
    
    if (disabled.length === 0) {
      throw new Error('Should find disabled objective');
    }
    
    disabled.forEach(obj => {
      if (obj.is_enabled !== false) {
        throw new Error('All filtered objectives should be disabled');
      }
    });
  });
  
  // ========================================
  // Category C: Objective Updates
  // ========================================
  
  test('C1: updateObjective modifies allowed fields', () => {
    const objective = createObjective({
      target_id: 'service-c1',
      desired_state: { active: true },
      remediation_plan: 'recovery',
      priority: 100
    });
    
    stateGraph.createObjective(objective);
    
    const updated = stateGraph.updateObjective(objective.objective_id, {
      priority: 50,
      remediation_plan: 'new_recovery'
    });
    
    if (updated.priority !== 50) {
      throw new Error('Should update priority');
    }
    if (updated.remediation_plan !== 'new_recovery') {
      throw new Error('Should update remediation_plan');
    }
  });
  
  test('C2: updateObjective preserves read-only fields', () => {
    const objective = createObjective({
      target_id: 'service-c2',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    const updated = stateGraph.updateObjective(objective.objective_id, {
      priority: 75
    });
    
    if (updated.objective_id !== objective.objective_id) {
      throw new Error('Should preserve objective_id');
    }
    if (updated.status !== objective.status) {
      throw new Error('Should preserve status (use updateObjectiveStatus)');
    }
  });
  
  test('C3: updateObjective updates timestamp', () => {
    const objective = createObjective({
      target_id: 'service-c3',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    const originalTimestamp = objective.updated_at;
    
    const updated = stateGraph.updateObjective(objective.objective_id, {
      priority: 80
    });
    
    const updatedDate = new Date(updated.updated_at);
    const originalDate = new Date(originalTimestamp);
    
    if (updatedDate < originalDate) {
      throw new Error('updated_at should not go backwards');
    }
  });
  
  // ========================================
  // Category D: Status Transitions
  // ========================================
  
  test('D1: updateObjectiveStatus transitions to valid state', () => {
    const objective = createObjective({
      target_id: 'service-d1',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    const updated = stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    if (updated.status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Status should be updated');
    }
  });
  
  test('D2: updateObjectiveStatus rejects invalid transition', () => {
    const objective = createObjective({
      target_id: 'service-d2',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    let threw = false;
    try {
      stateGraph.updateObjectiveStatus(
        objective.objective_id,
        OBJECTIVE_STATUS.VERIFICATION,  // Invalid from DECLARED
        TRANSITION_REASON.EVALUATION_STARTED
      );
    } catch (error) {
      threw = true;
      if (!error.message.includes('Invalid transition')) {
        throw new Error('Should report invalid transition');
      }
    }
    
    if (!threw) {
      throw new Error('Should have thrown error');
    }
  });
  
  test('D3: updateObjectiveStatus records history', () => {
    const objective = createObjective({
      target_id: 'service-d3',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    const history = stateGraph.listObjectiveHistory(objective.objective_id);
    
    if (history.length === 0) {
      throw new Error('Should record transition in history');
    }
    
    const latest = history[0];
    if (latest.from_status !== OBJECTIVE_STATUS.DECLARED) {
      throw new Error('Should record from_status');
    }
    if (latest.to_status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should record to_status');
    }
    if (latest.reason !== TRANSITION_REASON.EVALUATION_STARTED) {
      throw new Error('Should record reason');
    }
  });
  
  test('D4: updateObjectiveStatus updates last_violation_at', () => {
    const objective = createObjective({
      target_id: 'service-d4',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      TRANSITION_REASON.SYSTEM_UNHEALTHY
    );
    
    const updated = stateGraph.getObjective(objective.objective_id);
    
    if (!updated.last_violation_at) {
      throw new Error('Should set last_violation_at');
    }
  });
  
  test('D5: updateObjectiveStatus updates last_restored_at', () => {
    const objective = createObjective({
      target_id: 'service-d5',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    // Transition through remediation path
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, TRANSITION_REASON.POLICY_APPROVED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.REMEDIATION_RUNNING, TRANSITION_REASON.EXECUTION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VERIFICATION, TRANSITION_REASON.EXECUTION_COMPLETED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.RESTORED, TRANSITION_REASON.VERIFICATION_PASSED);
    
    const updated = stateGraph.getObjective(objective.objective_id);
    
    if (!updated.last_restored_at) {
      throw new Error('Should set last_restored_at');
    }
  });
  
  // ========================================
  // Category E: Evaluations
  // ========================================
  
  test('E1: recordObjectiveEvaluation persists evaluation', () => {
    const objective = createObjective({
      target_id: 'service-e1',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    const evaluationId = stateGraph.recordObjectiveEvaluation({
      objective_id: objective.objective_id,
      observed_state: { service_active: true },
      objective_satisfied: true,
      violation_detected: false,
      action_taken: 'monitoring',
      result_summary: 'Service healthy'
    });
    
    if (!evaluationId) {
      throw new Error('Should return evaluation_id');
    }
    
    const evaluations = stateGraph.listObjectiveEvaluations(objective.objective_id);
    
    if (evaluations.length === 0) {
      throw new Error('Should persist evaluation');
    }
    
    const latest = evaluations[0];
    if (latest.objective_satisfied !== true) {
      throw new Error('Should record objective_satisfied');
    }
    if (latest.violation_detected !== false) {
      throw new Error('Should record violation_detected');
    }
  });
  
  test('E2: recordObjectiveEvaluation updates last_evaluated_at', () => {
    const objective = createObjective({
      target_id: 'service-e2',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    stateGraph.recordObjectiveEvaluation({
      objective_id: objective.objective_id,
      observed_state: { service_active: true },
      objective_satisfied: true,
      violation_detected: false
    });
    
    const updated = stateGraph.getObjective(objective.objective_id);
    
    if (!updated.last_evaluated_at) {
      throw new Error('Should set last_evaluated_at');
    }
  });
  
  test('E3: recordObjectiveEvaluation stores triggered_plan_id', () => {
    const objective = createObjective({
      target_id: 'service-e3',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    stateGraph.recordObjectiveEvaluation({
      objective_id: objective.objective_id,
      observed_state: { service_active: false },
      objective_satisfied: false,
      violation_detected: true,
      action_taken: 'remediation_triggered',
      triggered_plan_id: 'plan_123'
    });
    
    const evaluations = stateGraph.listObjectiveEvaluations(objective.objective_id);
    const latest = evaluations[0];
    
    if (latest.triggered_plan_id !== 'plan_123') {
      throw new Error('Should store triggered_plan_id');
    }
  });
  
  test('E4: listObjectiveEvaluations limits results', () => {
    const objective = createObjective({
      target_id: 'service-e4',
      desired_state: { service_active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    // Record multiple evaluations
    for (let i = 0; i < 5; i++) {
      stateGraph.recordObjectiveEvaluation({
        objective_id: objective.objective_id,
        observed_state: { service_active: true },
        objective_satisfied: true,
        violation_detected: false
      });
    }
    
    const evaluations = stateGraph.listObjectiveEvaluations(objective.objective_id, 3);
    
    if (evaluations.length > 3) {
      throw new Error('Should limit results to 3');
    }
  });
  
  // ========================================
  // Category F: History
  // ========================================
  
  test('F1: recordObjectiveTransition persists history', () => {
    const objective = createObjective({
      target_id: 'service-f1',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    const historyId = stateGraph.recordObjectiveTransition(
      objective.objective_id,
      OBJECTIVE_STATUS.DECLARED,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED,
      { evaluator: 'castlereagh' }
    );
    
    if (!historyId) {
      throw new Error('Should return history_id');
    }
    
    const history = stateGraph.listObjectiveHistory(objective.objective_id);
    
    // Should have 2 records: one from createObjective, one from recordObjectiveTransition
    if (history.length === 0) {
      throw new Error('Should persist history');
    }
    
    const latest = history[0];
    if (latest.metadata.evaluator !== 'castlereagh') {
      throw new Error('Should persist metadata');
    }
  });
  
  test('F2: listObjectiveHistory returns chronological order', () => {
    const objective = createObjective({
      target_id: 'service-f2',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.HEALTHY, TRANSITION_REASON.SYSTEM_HEALTHY);
    
    const history = stateGraph.listObjectiveHistory(objective.objective_id);
    
    if (history.length < 2) {
      throw new Error(`Should have multiple history entries, got ${history.length}`);
    }
    
    // Most recent should be first (DESC order)
    if (history[0].to_status !== OBJECTIVE_STATUS.HEALTHY) {
      throw new Error(`Most recent transition should be first. Got: ${history[0].to_status} (expected: ${OBJECTIVE_STATUS.HEALTHY}). Full history: ${JSON.stringify(history.map(h => ({to: h.to_status, ts: h.event_timestamp})))}`);
    }
  });
  
  test('F3: listObjectiveHistory limits results', () => {
    const objective = createObjective({
      target_id: 'service-f3',
      desired_state: { active: true },
      remediation_plan: 'recovery'
    });
    
    stateGraph.createObjective(objective);
    
    // Create multiple transitions
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.MONITORING, TRANSITION_REASON.EVALUATION_STARTED);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.HEALTHY, TRANSITION_REASON.SYSTEM_HEALTHY);
    stateGraph.updateObjectiveStatus(objective.objective_id, OBJECTIVE_STATUS.VIOLATION_DETECTED, TRANSITION_REASON.SYSTEM_UNHEALTHY);
    
    const history = stateGraph.listObjectiveHistory(objective.objective_id, 2);
    
    if (history.length > 2) {
      throw new Error('Should limit results to 2');
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
  console.log(`State Graph Objectives Tests: ${results.passed}/${results.passed + results.failed} passed`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ All State Graph objectives tests passed');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
