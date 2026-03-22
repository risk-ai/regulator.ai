// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Test: Remediation Trigger Integration — Phase 9.5
 * 
 * Validates:
 * - Violation detection → remediation trigger
 * - Governance pipeline (Plan → Policy → Warrant → Execution → Verification)
 * - State machine enforcement
 * - Deduplication logic
 * - Success/failure paths
 * - Objective state updates
 */

const { getStateGraph } = require('../../lib/state/state-graph');
const { createObjective, OBJECTIVE_STATUS } = require('../../lib/core/objective-schema');
const { triggerRemediation, checkRemediationEligibility, isRemediating } = require('../../lib/core/remediation-trigger');
const { ChatActionBridge } = require('../../lib/core/chat-action-bridge');
const { createPlan } = require('../../lib/core/plan-schema');
const fs = require('fs');
const path = require('path');

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../../.test-data/test-remediation-trigger.db');

// Ensure test data directory exists
const testDataDir = path.dirname(TEST_DB_PATH);
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

/**
 * Test runner
 */
async function runTests() {
  console.log('Testing Remediation Trigger Integration (Phase 9.5)...\n');
  
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
      console.log(`  Stack: ${error.stack}`);
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
      console.log(`  Stack: ${error.stack}`);
    }
  }

  function assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
  }

  function assertTrue(value, message) {
    if (!value) {
      throw new Error(message || 'Expected true, got false');
    }
  }

  function assertFalse(value, message) {
    if (value) {
      throw new Error(message || 'Expected false, got true');
    }
  }

  // ========================================
  // Category A: Eligibility Checks
  // ========================================

  console.log('Category A: Eligibility Checks\n');

  test('A1: Eligible objective in VIOLATION_DETECTED state', () => {
    const objective = {
      objective_id: 'obj_001',
      status: OBJECTIVE_STATUS.VIOLATION_DETECTED,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertTrue(result.eligible, 'Objective should be eligible');
  });

  test('A2: Disabled objective is ineligible', () => {
    const objective = {
      objective_id: 'obj_002',
      status: OBJECTIVE_STATUS.VIOLATION_DETECTED,
      remediation_plan: 'plan_001',
      disabled: true
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible, 'Disabled objective should be ineligible');
    assertEquals(result.reason, 'objective_disabled');
  });

  test('A3: Archived objective is ineligible', () => {
    const objective = {
      objective_id: 'obj_003',
      status: OBJECTIVE_STATUS.ARCHIVED,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'objective_archived');
  });

  test('A4: Suspended objective is ineligible', () => {
    const objective = {
      objective_id: 'obj_004',
      status: OBJECTIVE_STATUS.SUSPENDED,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'objective_suspended');
  });

  test('A5: Objective without remediation plan is ineligible', () => {
    const objective = {
      objective_id: 'obj_005',
      status: OBJECTIVE_STATUS.VIOLATION_DETECTED,
      remediation_plan: null,
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'no_remediation_plan');
  });

  test('A6: Deduplication - REMEDIATION_TRIGGERED is ineligible', () => {
    const objective = {
      objective_id: 'obj_006',
      status: OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'remediation_already_active');
  });

  test('A7: Deduplication - REMEDIATION_RUNNING is ineligible', () => {
    const objective = {
      objective_id: 'obj_007',
      status: OBJECTIVE_STATUS.REMEDIATION_RUNNING,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'remediation_already_active');
  });

  test('A8: Deduplication - VERIFICATION is ineligible', () => {
    const objective = {
      objective_id: 'obj_008',
      status: OBJECTIVE_STATUS.VERIFICATION,
      remediation_plan: 'plan_001',
      disabled: false
    };

    const result = checkRemediationEligibility(objective);
    assertFalse(result.eligible);
    assertEquals(result.reason, 'remediation_already_active');
  });

  // ========================================
  // Category B: State Machine Transitions
  // ========================================

  console.log('\nCategory B: State Machine Transitions\n');

  await asyncTest('B1: Plan not found → FAILED', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    // Create objective
    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: 'plan_nonexistent',
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VIOLATION_DETECTED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      'evaluation',
      {}
    );

    // Trigger remediation (plan doesn't exist)
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    // Should fail because plan not found
    const updated = stateGraph.getObjective(objective.objective_id);
    assertEquals(updated.status, OBJECTIVE_STATUS.FAILED);
    assertFalse(result.triggered);
    assertEquals(result.suppression_reason, 'plan_not_found');
  });

  await asyncTest('B2: Successful remediation → RESTORED', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    // Create plan
    const plan = createPlan({
      objective: 'Restart test-service',
      steps: [{
        step_id: 'step_1',
        action: 'restart_service',
        executor: 'local',
        args: { service_id: 'test-service' },
        conditions: []
      }],
      risk_tier: 'T1',
      verification_spec: {
        verification_type: 'service_restart',
        postconditions: ['service_active'],
        required_strength: 'service_health'
      }
    });

    const planId = stateGraph.createPlan(plan);

    // Create objective
    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: planId,
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VIOLATION_DETECTED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      'evaluation',
      {}
    );

    // Mock successful execution
    chatActionBridge.executePlan = async (planId) => {
      return {
        status: 'success',
        plan_id: planId,
        execution_id: 'exec_001',
        workflow_outcome: {
          objective_achieved: true,
          workflow_status: 'success',
          summary: 'Service restarted successfully'
        },
        verification_result: {
          objective_achieved: true,
          overall_status: 'success'
        }
      };
    };

    // Trigger remediation
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertTrue(result.triggered);
    assertEquals(result.objective_state, OBJECTIVE_STATUS.RESTORED);
    assertTrue(result.remediation_outcome.success);
  });

  await asyncTest('B3: Failed verification → FAILED', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    // Create plan
    const plan = createPlan({
      objective: 'Restart test-service',
      steps: [{
        step_id: 'step_1',
        action: 'restart_service',
        executor: 'local',
        args: { service_id: 'test-service' },
        conditions: []
      }],
      risk_tier: 'T1',
      verification_spec: {
        verification_type: 'service_restart',
        postconditions: ['service_active'],
        required_strength: 'service_health'
      }
    });

    const planId = stateGraph.createPlan(plan);

    // Create objective
    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: planId,
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VIOLATION_DETECTED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      'evaluation',
      {}
    );

    // Mock failed verification
    chatActionBridge.executePlan = async (planId) => {
      return {
        status: 'success',
        plan_id: planId,
        execution_id: 'exec_002',
        workflow_outcome: {
          objective_achieved: false,
          workflow_status: 'failed',
          summary: 'Execution succeeded but verification failed'
        },
        verification_result: {
          objective_achieved: false,
          overall_status: 'failed',
          summary: 'Service not healthy after restart'
        }
      };
    };

    // Trigger remediation
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertTrue(result.triggered);
    assertEquals(result.objective_state, OBJECTIVE_STATUS.FAILED);
    assertFalse(result.verification_outcome.objective_achieved);
  });

  await asyncTest('B4: Execution failure → FAILED', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    // Create plan
    const plan = createPlan({
      objective: 'Restart test-service',
      steps: [{
        step_id: 'step_1',
        action: 'restart_service',
        executor: 'local',
        args: { service_id: 'test-service' },
        conditions: []
      }],
      risk_tier: 'T1'
    });

    const planId = stateGraph.createPlan(plan);

    // Create objective
    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: planId,
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VIOLATION_DETECTED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      'evaluation',
      {}
    );

    // Mock execution failure
    chatActionBridge.executePlan = async (planId) => {
      return {
        status: 'failed',
        plan_id: planId,
        execution_id: 'exec_003',
        error: 'Service restart failed'
      };
    };

    // Trigger remediation
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertTrue(result.triggered);
    assertEquals(result.objective_state, OBJECTIVE_STATUS.FAILED);
    assertFalse(result.remediation_outcome.success);
  });

  // ========================================
  // Category C: Deduplication
  // ========================================

  console.log('\nCategory C: Deduplication\n');

  await asyncTest('C1: Prevent duplicate trigger during REMEDIATION_TRIGGERED', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: 'plan_001',
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to REMEDIATION_TRIGGERED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
      'evaluation',
      {}
    );

    // Attempt to trigger again
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertFalse(result.triggered);
    assertEquals(result.suppression_reason, 'remediation_already_active');
  });

  await asyncTest('C2: Prevent duplicate trigger during REMEDIATION_RUNNING', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: 'plan_001',
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to REMEDIATION_RUNNING
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.REMEDIATION_RUNNING,
      'execution',
      {}
    );

    // Attempt to trigger again
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertFalse(result.triggered);
    assertEquals(result.suppression_reason, 'remediation_already_active');
  });

  await asyncTest('C3: Prevent duplicate trigger during VERIFICATION', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: 'plan_001',
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VERIFICATION
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VERIFICATION,
      'execution',
      {}
    );

    // Attempt to trigger again
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertFalse(result.triggered);
    assertEquals(result.suppression_reason, 'remediation_already_active');
  });

  // ========================================
  // Category D: Helper Functions
  // ========================================

  console.log('\nCategory D: Helper Functions\n');

  test('D1: isRemediating correctly identifies remediating states', () => {
    assertTrue(isRemediating(OBJECTIVE_STATUS.REMEDIATION_TRIGGERED));
    assertTrue(isRemediating(OBJECTIVE_STATUS.REMEDIATION_RUNNING));
    assertTrue(isRemediating(OBJECTIVE_STATUS.VERIFICATION));
    
    assertFalse(isRemediating(OBJECTIVE_STATUS.MONITORING));
    assertFalse(isRemediating(OBJECTIVE_STATUS.HEALTHY));
    assertFalse(isRemediating(OBJECTIVE_STATUS.VIOLATION_DETECTED));
    assertFalse(isRemediating(OBJECTIVE_STATUS.RESTORED));
    assertFalse(isRemediating(OBJECTIVE_STATUS.FAILED));
  });

  // ========================================
  // Category E: Approval Workflow
  // ========================================

  console.log('\nCategory E: Approval Workflow\n');

  await asyncTest('E1: Approval required → remain in REMEDIATION_RUNNING', async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const stateGraph = getStateGraph(TEST_DB_PATH);
    await stateGraph.initialize();

    const chatActionBridge = new ChatActionBridge();
    chatActionBridge.setDependencies(null, stateGraph);

    // Create plan
    const plan = createPlan({
      objective: 'Restart test-service',
      steps: [{
        step_id: 'step_1',
        action: 'restart_service',
        executor: 'local',
        args: { service_id: 'test-service' },
        conditions: []
      }],
      risk_tier: 'T1'
    });

    const planId = stateGraph.createPlan(plan);

    // Create objective
    const objective = createObjective({
      target_id: 'test-service',
      objective_type: 'maintain_health',
      desired_state: { status: 'active', health: 'healthy' },
      remediation_plan: planId,
      evaluation_interval: '1m'
    });

    stateGraph.createObjective(objective);

    // Transition to VIOLATION_DETECTED
    stateGraph.updateObjectiveStatus(
      objective.objective_id,
      OBJECTIVE_STATUS.VIOLATION_DETECTED,
      'evaluation',
      {}
    );

    // Mock approval required
    chatActionBridge.executePlan = async (planId) => {
      return {
        status: 'approval_required',
        plan_id: planId,
        execution_id: 'exec_004',
        message: 'Approval required before execution'
      };
    };

    // Trigger remediation
    const result = await triggerRemediation(objective.objective_id, {
      chatActionBridge,
      triggered_by: 'test'
    });

    assertTrue(result.triggered);
    assertEquals(result.objective_state, OBJECTIVE_STATUS.REMEDIATION_RUNNING);
    assertTrue(result.remediation_outcome.pending_approval);
  });

  // ========================================
  // Summary
  // ========================================

  console.log('\n' + '='.repeat(60));
  console.log(`Phase 9.5 Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  // Cleanup test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  return results.failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
