// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Test: Objective State Machine — Phase 9.2
 * 
 * Validates deterministic state transitions for objective lifecycle.
 */

const {
  TRANSITIONS,
  TRANSITION_REASON,
  isValidTransition,
  getAllowedTransitions,
  transitionState,
  isTerminalState,
  isRemediating,
  isFailed,
  isStable,
  getStateCategory
} = require('../../lib/core/objective-state-machine');

const {
  OBJECTIVE_STATUS,
  createObjective
} = require('../../lib/core/objective-schema');

/**
 * Test runner
 */
async function runTests() {
  console.log('Testing Objective State Machine (Phase 9.2)...\n');
  
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
  
  // ========================================
  // Category A: Transition Table
  // ========================================
  
  test('A1: TRANSITIONS defined for all statuses', () => {
    Object.values(OBJECTIVE_STATUS).forEach(status => {
      if (!(status in TRANSITIONS)) {
        throw new Error(`Missing transitions for status: ${status}`);
      }
    });
  });
  
  test('A2: TRANSITIONS contains only valid target states', () => {
    const validStatuses = Object.values(OBJECTIVE_STATUS);
    
    Object.entries(TRANSITIONS).forEach(([fromState, toStates]) => {
      toStates.forEach(toState => {
        if (!validStatuses.includes(toState)) {
          throw new Error(`Invalid target state: ${fromState} → ${toState}`);
        }
      });
    });
  });
  
  test('A3: ARCHIVED state is terminal', () => {
    const archivedTransitions = TRANSITIONS[OBJECTIVE_STATUS.ARCHIVED];
    if (archivedTransitions.length !== 0) {
      throw new Error('ARCHIVED should have no outbound transitions');
    }
  });
  
  test('A4: Terminal and exit states are defined', () => {
    // ARCHIVED should be terminal
    if (TRANSITIONS[OBJECTIVE_STATUS.ARCHIVED].length !== 0) {
      throw new Error('ARCHIVED should be terminal');
    }
    
    // Most states should have path to suspension or archival
    const exitStates = [
      OBJECTIVE_STATUS.ARCHIVED,
      OBJECTIVE_STATUS.SUSPENDED,
      OBJECTIVE_STATUS.BLOCKED,
      OBJECTIVE_STATUS.FAILED
    ];
    
    // Check that key operational states have exit paths
    const keyStates = [
      OBJECTIVE_STATUS.DECLARED,
      OBJECTIVE_STATUS.MONITORING,
      OBJECTIVE_STATUS.HEALTHY
    ];
    
    keyStates.forEach(state => {
      const transitions = TRANSITIONS[state];
      const hasExitPath = transitions.some(t => exitStates.includes(t));
      if (!hasExitPath) {
        throw new Error(`State ${state} should have exit path`);
      }
    });
  });
  
  // ========================================
  // Category B: Transition Validation
  // ========================================
  
  test('B1: isValidTransition accepts valid transitions', () => {
    const validCases = [
      [OBJECTIVE_STATUS.DECLARED, OBJECTIVE_STATUS.MONITORING],
      [OBJECTIVE_STATUS.MONITORING, OBJECTIVE_STATUS.HEALTHY],
      [OBJECTIVE_STATUS.HEALTHY, OBJECTIVE_STATUS.VIOLATION_DETECTED],
      [OBJECTIVE_STATUS.VIOLATION_DETECTED, OBJECTIVE_STATUS.REMEDIATION_TRIGGERED],
      [OBJECTIVE_STATUS.REMEDIATION_TRIGGERED, OBJECTIVE_STATUS.REMEDIATION_RUNNING],
      [OBJECTIVE_STATUS.REMEDIATION_RUNNING, OBJECTIVE_STATUS.VERIFICATION],
      [OBJECTIVE_STATUS.VERIFICATION, OBJECTIVE_STATUS.RESTORED]
    ];
    
    validCases.forEach(([from, to]) => {
      if (!isValidTransition(from, to)) {
        throw new Error(`Should allow transition: ${from} → ${to}`);
      }
    });
  });
  
  test('B2: isValidTransition rejects invalid transitions', () => {
    const invalidCases = [
      [OBJECTIVE_STATUS.DECLARED, OBJECTIVE_STATUS.VERIFICATION],
      [OBJECTIVE_STATUS.MONITORING, OBJECTIVE_STATUS.REMEDIATION_RUNNING],
      [OBJECTIVE_STATUS.HEALTHY, OBJECTIVE_STATUS.FAILED],
      [OBJECTIVE_STATUS.ARCHIVED, OBJECTIVE_STATUS.MONITORING],
      [OBJECTIVE_STATUS.RESTORED, OBJECTIVE_STATUS.FAILED]
    ];
    
    invalidCases.forEach(([from, to]) => {
      if (isValidTransition(from, to)) {
        throw new Error(`Should reject transition: ${from} → ${to}`);
      }
    });
  });
  
  test('B3: getAllowedTransitions returns correct options', () => {
    const transitions = getAllowedTransitions(OBJECTIVE_STATUS.MONITORING);
    
    if (!transitions.includes(OBJECTIVE_STATUS.HEALTHY)) {
      throw new Error('MONITORING should allow HEALTHY');
    }
    if (!transitions.includes(OBJECTIVE_STATUS.VIOLATION_DETECTED)) {
      throw new Error('MONITORING should allow VIOLATION_DETECTED');
    }
    if (transitions.includes(OBJECTIVE_STATUS.FAILED)) {
      throw new Error('MONITORING should not allow FAILED');
    }
  });
  
  test('B4: getAllowedTransitions returns empty array for ARCHIVED', () => {
    const transitions = getAllowedTransitions(OBJECTIVE_STATUS.ARCHIVED);
    
    if (transitions.length !== 0) {
      throw new Error('ARCHIVED should have no allowed transitions');
    }
  });
  
  // ========================================
  // Category C: State Execution
  // ========================================
  
  test('C1: transitionState updates status and timestamp', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const updated = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    if (updated.status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Status should be updated');
    }
    
    // Timestamp should be valid ISO string
    const updatedDate = new Date(updated.updated_at);
    if (isNaN(updatedDate.getTime())) {
      throw new Error('updated_at should be valid timestamp');
    }
    
    // Timestamp should be >= original (monotonic)
    const originalDate = new Date(objective.updated_at);
    if (updatedDate < originalDate) {
      throw new Error('updated_at should not go backwards');
    }
  });
  
  test('C2: transitionState records transition metadata', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const updated = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED,
      { evaluator: 'castlereagh' }
    );
    
    if (!updated.last_transition) {
      throw new Error('Should record transition metadata');
    }
    if (updated.last_transition.from !== OBJECTIVE_STATUS.DECLARED) {
      throw new Error('Should record from state');
    }
    if (updated.last_transition.to !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should record to state');
    }
    if (updated.last_transition.reason !== TRANSITION_REASON.EVALUATION_STARTED) {
      throw new Error('Should record reason');
    }
    if (updated.last_transition.metadata.evaluator !== 'castlereagh') {
      throw new Error('Should record custom metadata');
    }
  });
  
  test('C3: transitionState rejects invalid transitions', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    let threw = false;
    try {
      transitionState(
        objective,
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
  
  test('C4: transitionState preserves objective properties', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      priority: 50
    });
    
    const updated = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    if (updated.objective_id !== objective.objective_id) {
      throw new Error('Should preserve objective_id');
    }
    if (updated.target_id !== objective.target_id) {
      throw new Error('Should preserve target_id');
    }
    if (updated.priority !== objective.priority) {
      throw new Error('Should preserve priority');
    }
  });
  
  // ========================================
  // Category D: State Classification
  // ========================================
  
  test('D1: isTerminalState identifies ARCHIVED', () => {
    if (!isTerminalState(OBJECTIVE_STATUS.ARCHIVED)) {
      throw new Error('ARCHIVED should be terminal');
    }
  });
  
  test('D2: isTerminalState rejects non-terminal states', () => {
    if (isTerminalState(OBJECTIVE_STATUS.MONITORING)) {
      throw new Error('MONITORING should not be terminal');
    }
    if (isTerminalState(OBJECTIVE_STATUS.FAILED)) {
      throw new Error('FAILED should not be terminal (can retry)');
    }
  });
  
  test('D3: isRemediating identifies remediation states', () => {
    const remediatingStates = [
      OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
      OBJECTIVE_STATUS.REMEDIATION_RUNNING,
      OBJECTIVE_STATUS.VERIFICATION
    ];
    
    remediatingStates.forEach(state => {
      if (!isRemediating(state)) {
        throw new Error(`${state} should be identified as remediating`);
      }
    });
  });
  
  test('D4: isRemediating rejects non-remediation states', () => {
    if (isRemediating(OBJECTIVE_STATUS.MONITORING)) {
      throw new Error('MONITORING should not be remediating');
    }
    if (isRemediating(OBJECTIVE_STATUS.HEALTHY)) {
      throw new Error('HEALTHY should not be remediating');
    }
  });
  
  test('D5: isFailed identifies failure states', () => {
    if (!isFailed(OBJECTIVE_STATUS.FAILED)) {
      throw new Error('FAILED should be identified as failed');
    }
    if (!isFailed(OBJECTIVE_STATUS.BLOCKED)) {
      throw new Error('BLOCKED should be identified as failed');
    }
  });
  
  test('D6: isFailed rejects non-failure states', () => {
    if (isFailed(OBJECTIVE_STATUS.MONITORING)) {
      throw new Error('MONITORING should not be failed');
    }
    if (isFailed(OBJECTIVE_STATUS.VERIFICATION)) {
      throw new Error('VERIFICATION should not be failed');
    }
  });
  
  test('D7: isStable identifies stable states', () => {
    const stableStates = [
      OBJECTIVE_STATUS.MONITORING,
      OBJECTIVE_STATUS.HEALTHY,
      OBJECTIVE_STATUS.RESTORED
    ];
    
    stableStates.forEach(state => {
      if (!isStable(state)) {
        throw new Error(`${state} should be identified as stable`);
      }
    });
  });
  
  test('D8: isStable rejects non-stable states', () => {
    if (isStable(OBJECTIVE_STATUS.FAILED)) {
      throw new Error('FAILED should not be stable');
    }
    if (isStable(OBJECTIVE_STATUS.REMEDIATION_RUNNING)) {
      throw new Error('REMEDIATION_RUNNING should not be stable');
    }
  });
  
  // ========================================
  // Category E: State Categories
  // ========================================
  
  test('E1: getStateCategory returns correct categories', () => {
    const testCases = [
      [OBJECTIVE_STATUS.MONITORING, 'stable'],
      [OBJECTIVE_STATUS.HEALTHY, 'stable'],
      [OBJECTIVE_STATUS.REMEDIATION_RUNNING, 'remediating'],
      [OBJECTIVE_STATUS.VERIFICATION, 'remediating'],
      [OBJECTIVE_STATUS.FAILED, 'failed'],
      [OBJECTIVE_STATUS.BLOCKED, 'failed'],
      [OBJECTIVE_STATUS.SUSPENDED, 'suspended'],
      [OBJECTIVE_STATUS.ARCHIVED, 'archived']
    ];
    
    testCases.forEach(([state, expectedCategory]) => {
      const category = getStateCategory(state);
      if (category !== expectedCategory) {
        throw new Error(
          `State ${state} should be category ${expectedCategory}, got ${category}`
        );
      }
    });
  });
  
  // ========================================
  // Category F: Transition Paths
  // ========================================
  
  test('F1: Happy path: DECLARED → MONITORING → HEALTHY', () => {
    let objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.HEALTHY,
      TRANSITION_REASON.SYSTEM_HEALTHY
    );
    
    if (objective.status !== OBJECTIVE_STATUS.HEALTHY) {
      throw new Error('Should reach HEALTHY state');
    }
  });
  
  test('F2: Remediation path: VIOLATION → REMEDIATION → VERIFICATION → RESTORED', () => {
    let objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      TRANSITION_REASON.SYSTEM_UNHEALTHY
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
      TRANSITION_REASON.POLICY_APPROVED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.REMEDIATION_RUNNING,
      TRANSITION_REASON.EXECUTION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.VERIFICATION,
      TRANSITION_REASON.EXECUTION_COMPLETED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.RESTORED,
      TRANSITION_REASON.VERIFICATION_PASSED
    );
    
    if (objective.status !== OBJECTIVE_STATUS.RESTORED) {
      throw new Error('Should reach RESTORED state');
    }
  });
  
  test('F3: Failure path: REMEDIATION → FAILED → ARCHIVED', () => {
    let objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      TRANSITION_REASON.SYSTEM_UNHEALTHY
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
      TRANSITION_REASON.POLICY_APPROVED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.REMEDIATION_RUNNING,
      TRANSITION_REASON.EXECUTION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.FAILED,
      TRANSITION_REASON.EXECUTION_FAILED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.ARCHIVED,
      TRANSITION_REASON.MANUAL_ARCHIVE
    );
    
    if (objective.status !== OBJECTIVE_STATUS.ARCHIVED) {
      throw new Error('Should reach ARCHIVED state');
    }
  });
  
  test('F4: Suspension path: MONITORING → SUSPENDED → MONITORING', () => {
    let objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.EVALUATION_STARTED
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.SUSPENDED,
      TRANSITION_REASON.MANUAL_SUSPENSION
    );
    
    objective = transitionState(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      TRANSITION_REASON.MANUAL_RESUME
    );
    
    if (objective.status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Should return to MONITORING state');
    }
  });
  
  // ========================================
  // Results
  // ========================================
  
  console.log('\n' + '='.repeat(60));
  console.log(`Objective State Machine Tests: ${results.passed}/${results.passed + results.failed} passed`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ All state machine tests passed');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
