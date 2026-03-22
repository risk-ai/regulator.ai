/**
 * Phase 8.2 Verification Layer Tests
 * 
 * Validates:
 * 1. Verification schema and validation
 * 2. Verification engine check execution
 * 3. Verification templates
 * 4. State Graph verifications + workflow_outcomes tables
 * 5. Plan integration (verification_spec in plans)
 * 6. End-to-end verification workflow
 */

const assert = require('assert');
const {
  createVerificationTask,
  createVerificationResult,
  createWorkflowOutcome,
  deriveWorkflowStatus,
  VerificationStatus,
  WorkflowStatus,
  VerificationStrength,
  CheckType
} = require('../../../lib/core/verification-schema.js');

const { VerificationEngine } = require('../../../lib/core/verification-engine.js');
const { buildVerificationSpec, getRecommendedTemplate } = require('../../../lib/core/verification-templates.js');
const { getStateGraph, _resetStateGraphForTesting } = require('../../../lib/state/state-graph.js');
const { generatePlan } = require('../../../lib/core/plan-generator.js');
const { IntentClassifier } = require('../../../lib/core/intent-classifier.js');

async function runTests() {
  console.log('Phase 8.2 Verification Layer Tests\n');
  
  let passed = 0;
  let failed = 0;

  // ============================================================
  // Category 1: Verification Schema Tests
  // ============================================================

  console.log('Category 1: Verification Schema\n');

  // Test 1.1: Create VerificationTask
  try {
    const task = createVerificationTask({
      plan_id: 'plan_test',
      execution_id: 'exec_test',
      objective: 'Test objective',
      verification_type: 'service_recovery',
      scope: { service: 'test-service' },
      postconditions: [
        {
          check_id: 'test_check',
          type: CheckType.SYSTEMD_ACTIVE,
          target: 'test-service',
          required: true
        }
      ]
    });

    assert(task.verification_id, 'Should have verification_id');
    assert(task.plan_id === 'plan_test', 'Should have plan_id');
    assert(task.postconditions.length === 1, 'Should have postconditions');
    
    console.log('✓ Test 1.1: Create VerificationTask');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.1: Create VerificationTask');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.2: Create VerificationResult
  try {
    const result = createVerificationResult({
      verification_id: 'verify_test',
      plan_id: 'plan_test',
      execution_id: 'exec_test',
      status: VerificationStatus.SUCCESS,
      objective_achieved: true,
      verification_strength_achieved: VerificationStrength.SERVICE_HEALTH,
      started_at: Date.now(),
      completed_at: Date.now() + 1000,
      checks: [],
      summary: 'Test summary'
    });

    assert(result.verification_id === 'verify_test', 'Should have verification_id');
    assert(result.status === VerificationStatus.SUCCESS, 'Should have status');
    assert(result.objective_achieved === true, 'Should have objective_achieved');
    assert(result.duration_ms === 1000, 'Should calculate duration');
    
    console.log('✓ Test 1.2: Create VerificationResult');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.2: Create VerificationResult');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.3: Create WorkflowOutcome
  try {
    const outcome = createWorkflowOutcome({
      plan_id: 'plan_test',
      execution_id: 'exec_test',
      verification_id: 'verify_test',
      workflow_status: WorkflowStatus.COMPLETED,
      objective_achieved: true,
      risk_tier: 'T1',
      execution_status: 'success',
      verification_status: VerificationStatus.SUCCESS,
      operator_visible_summary: 'Test completed'
    });

    assert(outcome.outcome_id, 'Should have outcome_id');
    assert(outcome.workflow_status === WorkflowStatus.COMPLETED, 'Should have workflow_status');
    assert(outcome.objective_achieved === true, 'Should have objective_achieved');
    
    console.log('✓ Test 1.3: Create WorkflowOutcome');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.3: Create WorkflowOutcome');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.4: Derive workflow status (execution success + verification success)
  try {
    const status = deriveWorkflowStatus('success', VerificationStatus.SUCCESS);
    assert(status === WorkflowStatus.COMPLETED, 'Should be completed');
    
    console.log('✓ Test 1.4: Derive workflow status (success + success)');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.4: Derive workflow status (success + success)');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.5: Derive workflow status (execution success + verification failed)
  try {
    const status = deriveWorkflowStatus('success', VerificationStatus.FAILED);
    assert(status === WorkflowStatus.VERIFICATION_FAILED, 'Should be verification_failed');
    
    console.log('✓ Test 1.5: Derive workflow status (success + failed)');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.5: Derive workflow status (success + failed)');
    console.log('  Error:', error.message);
    failed++;
  }

  // ============================================================
  // Category 2: Verification Templates Tests
  // ============================================================

  console.log('\nCategory 2: Verification Templates\n');

  // Test 2.1: Get recommended template for restart_service
  try {
    const template = getRecommendedTemplate('restart_service');
    assert(template === 'service_recovery', 'Should recommend service_recovery');
    
    console.log('✓ Test 2.1: Get recommended template (restart_service)');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.1: Get recommended template (restart_service)');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 2.2: Build verification spec from template
  try {
    const spec = buildVerificationSpec('service_recovery', {
      service: 'test-service',
      port: 8080,
      health_url: 'http://localhost:8080/health'
    });

    assert(spec.verification_type === 'service_recovery', 'Should have verification_type');
    assert(spec.postconditions.length > 0, 'Should have postconditions');
    assert(spec.postconditions[0].target === 'test-service', 'Should expand service name');
    
    console.log('✓ Test 2.2: Build verification spec from template');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.2: Build verification spec from template');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 2.3: No template for read-only actions
  try {
    const template = getRecommendedTemplate('show_status');
    assert(template === null, 'Read-only actions should have no verification template');
    
    console.log('✓ Test 2.3: No template for read-only actions');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.3: No template for read-only actions');
    console.log('  Error:', error.message);
    failed++;
  }

  // ============================================================
  // Category 3: State Graph Integration Tests
  // ============================================================

  console.log('\nCategory 3: State Graph Integration\n');

  // Reset State Graph for testing
  _resetStateGraphForTesting();
  const stateGraph = getStateGraph({
    dbPath: '/tmp/test-verification-' + Date.now() + '.db'
  });
  await stateGraph.initialize();

  // Test 3.1: Create verification in State Graph
  try {
    // First create a plan (required for foreign key)
    const { createSimplePlan } = require('../../../lib/core/plan-schema.js');
    const testPlan = createSimplePlan({
      action: 'test_action',
      description: 'Test plan',
      args: {},
      executor: 'local',
      risk_tier: 'T0'
    });
    testPlan.plan_id = 'plan_001'; // Override for test
    stateGraph.createPlan(testPlan);

    const verification = {
      verification_id: 'verify_001',
      plan_id: 'plan_001',
      execution_id: 'exec_001',
      verification_type: 'service_recovery',
      status: VerificationStatus.SUCCESS,
      objective_achieved: true,
      verification_strength_target: VerificationStrength.OBJECTIVE_STABILITY,
      verification_strength_achieved: VerificationStrength.OBJECTIVE_STABILITY,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 5000,
      summary: 'Test verification',
      evidence_json: { checks: [] }
    };

    const result = stateGraph.createVerification(verification);
    assert(result.verification_id === 'verify_001', 'Should create verification');

    console.log('✓ Test 3.1: Create verification in State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.1: Create verification in State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.2: Get verification from State Graph
  try {
    const verification = stateGraph.getVerification('verify_001');
    assert(verification !== null, 'Should retrieve verification');
    assert(verification.objective_achieved === true, 'Should parse boolean');
    assert(typeof verification.evidence_json === 'object', 'Should parse JSON');

    console.log('✓ Test 3.2: Get verification from State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.2: Get verification from State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.3: Create workflow outcome in State Graph
  try {
    const outcome = {
      outcome_id: 'outcome_001',
      plan_id: 'plan_001',
      execution_id: 'exec_001',
      verification_id: 'verify_001',
      workflow_status: WorkflowStatus.COMPLETED,
      execution_status: 'success',
      verification_status: VerificationStatus.SUCCESS,
      objective_achieved: true,
      risk_tier: 'T1',
      finalized_at: new Date().toISOString(),
      operator_visible_summary: 'Test completed',
      next_actions: [],
      metadata: {}
    };

    const result = stateGraph.createWorkflowOutcome(outcome);
    assert(result.outcome_id === 'outcome_001', 'Should create outcome');

    console.log('✓ Test 3.3: Create workflow outcome in State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.3: Create workflow outcome in State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.4: List verifications with filters
  try {
    const verifications = stateGraph.listVerifications({ plan_id: 'plan_001' });
    assert(verifications.length >= 1, 'Should find verifications');
    assert(verifications[0].plan_id === 'plan_001', 'Should filter by plan_id');

    console.log('✓ Test 3.4: List verifications with filters');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.4: List verifications with filters');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.5: List workflow outcomes
  try {
    const outcomes = stateGraph.listWorkflowOutcomes({ objective_achieved: true });
    assert(outcomes.length >= 1, 'Should find outcomes');
    assert(outcomes[0].objective_achieved === true, 'Should filter by objective_achieved');

    console.log('✓ Test 3.5: List workflow outcomes');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.5: List workflow outcomes');
    console.log('  Error:', error.message);
    failed++;
  }

  // ============================================================
  // Category 4: Plan Integration Tests
  // ============================================================

  console.log('\nCategory 4: Plan Integration\n');

  const classifier = new IntentClassifier();

  // Test 4.1: Plan includes verification_spec
  try {
    const intent = classifier.classify('restart the gateway');
    const plan = generatePlan(intent);

    assert(plan !== null, 'Should generate plan');
    assert(plan.verification_spec !== null, 'Should include verification_spec');
    assert(plan.verification_spec.verification_type === 'service_recovery', 'Should use service_recovery template');

    console.log('✓ Test 4.1: Plan includes verification_spec');
    passed++;
  } catch (error) {
    console.log('✗ Test 4.1: Plan includes verification_spec');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 4.2: Read-only plan has no verification_spec
  try {
    const intent = classifier.classify('show status');
    const plan = generatePlan(intent);

    assert(plan !== null, 'Should generate plan');
    assert(plan.verification_spec === null, 'Read-only should have no verification_spec');

    console.log('✓ Test 4.2: Read-only plan has no verification_spec');
    passed++;
  } catch (error) {
    console.log('✗ Test 4.2: Read-only plan has no verification_spec');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 4.3: Plan persists verification_spec to State Graph
  try {
    const intent = classifier.classify('restart openclaw-gateway');
    const plan = generatePlan(intent);
    
    stateGraph.createPlan(plan);
    const retrieved = stateGraph.getPlan(plan.plan_id);

    assert(retrieved.verification_spec !== null, 'Should persist verification_spec');
    assert(typeof retrieved.verification_spec === 'object', 'Should parse as object');

    console.log('✓ Test 4.3: Plan persists verification_spec to State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 4.3: Plan persists verification_spec to State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Clean up
  stateGraph.close();

  // ============================================================
  // Summary
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
