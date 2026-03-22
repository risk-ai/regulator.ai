/**
 * Phase 8.1 Plan Object Tests
 * 
 * Validates:
 * 1. Plan schema and validation
 * 2. Plan generation from intent
 * 3. State Graph plan persistence
 * 4. Intent → Plan → Execution pipeline
 */

const assert = require('assert');
const { createPlan, createSimplePlan, validatePlan, generatePlanId } = require('../../../lib/core/plan-schema.js');
const { generatePlan } = require('../../../lib/core/plan-generator.js');
const { getStateGraph, _resetStateGraphForTesting } = require('../../../lib/state/state-graph.js');
const { IntentClassifier } = require('../../../lib/core/intent-classifier.js');

async function runTests() {
  console.log('Phase 8.1 Plan Object Tests\n');
  
  let passed = 0;
  let failed = 0;

  // ============================================================
  // Category 1: Plan Schema Tests
  // ============================================================

  console.log('Category 1: Plan Schema\n');

  // Test 1.1: Generate plan ID
  try {
    const planId = generatePlanId();
    assert(planId.startsWith('plan_'), 'Plan ID should start with plan_');
    assert(planId.length > 10, 'Plan ID should be sufficiently long');
    console.log('✓ Test 1.1: Generate plan ID');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.1: Generate plan ID');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.2: Create simple plan
  try {
    const plan = createSimplePlan({
      action: 'show_status',
      description: 'Show system status',
      args: {},
      executor: 'local',
      risk_tier: 'T0'
    });

    assert(plan.plan_id, 'Plan should have ID');
    assert(plan.objective === 'Show system status', 'Objective should match');
    assert(plan.steps.length === 1, 'Should have one step');
    assert(plan.steps[0].action === 'show_status', 'Step action should match');
    assert(plan.risk_tier === 'T0', 'Risk tier should match');
    assert(plan.status === 'pending', 'Initial status should be pending');

    console.log('✓ Test 1.2: Create simple plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.2: Create simple plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.3: Create multi-step plan
  try {
    const plan = createPlan({
      objective: 'Restart gateway and verify health',
      steps: [
        {
          step_number: 1,
          action: 'restart_service',
          description: 'Restart openclaw-gateway',
          args: { service_name: 'openclaw-gateway' },
          executor: 'local',
          timeout_ms: 30000,
          required: true,
          verification: ['service restarted']
        },
        {
          step_number: 2,
          action: 'check_health',
          description: 'Verify gateway is healthy',
          args: {},
          executor: 'openclaw',
          timeout_ms: 10000,
          required: true,
          verification: ['health status returned', 'status is healthy']
        }
      ],
      preconditions: ['gateway exists'],
      postconditions: ['gateway is running', 'gateway is healthy'],
      risk_tier: 'T1'
    });

    assert(plan.steps.length === 2, 'Should have two steps');
    assert(plan.preconditions.length === 1, 'Should have preconditions');
    assert(plan.postconditions.length === 2, 'Should have postconditions');
    assert(plan.risk_tier === 'T1', 'Risk tier should be T1');

    console.log('✓ Test 1.3: Create multi-step plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.3: Create multi-step plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.4: Validate valid plan
  try {
    const plan = createSimplePlan({
      action: 'show_status',
      description: 'Show status',
      args: {},
      executor: 'local',
      risk_tier: 'T0'
    });

    const validation = validatePlan(plan);
    assert(validation.valid === true, 'Plan should be valid');
    assert(validation.errors.length === 0, 'Should have no errors');

    console.log('✓ Test 1.4: Validate valid plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.4: Validate valid plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 1.5: Reject invalid plan
  try {
    const invalidPlan = {
      plan_id: 'test',
      objective: 'Test',
      steps: [], // Invalid: empty steps
      risk_tier: 'T0',
      status: 'pending'
    };

    const validation = validatePlan(invalidPlan);
    assert(validation.valid === false, 'Invalid plan should fail validation');
    assert(validation.errors.length > 0, 'Should have validation errors');

    console.log('✓ Test 1.5: Reject invalid plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 1.5: Reject invalid plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // ============================================================
  // Category 2: Plan Generator Tests
  // ============================================================

  console.log('\nCategory 2: Plan Generator\n');

  const classifier = new IntentClassifier();

  // Test 2.1: Generate T0 read plan
  try {
    const intent = classifier.classify('show status');
    const plan = generatePlan(intent);

    assert(plan !== null, 'Plan should be generated');
    assert(plan.risk_tier === 'T0', 'Risk tier should be T0');
    assert(plan.steps[0].action === 'show_status', 'Action should be show_status');
    assert(plan.steps[0].executor === 'local', 'Executor should be local');

    console.log('✓ Test 2.1: Generate T0 read plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.1: Generate T0 read plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 2.2: Generate T0 query plan
  try {
    const intent = classifier.classify('ask openclaw what time it is');
    const plan = generatePlan(intent);

    assert(plan !== null, 'Plan should be generated');
    assert(plan.risk_tier === 'T0', 'Risk tier should be T0');
    assert(plan.steps[0].action === 'query_openclaw_agent', 'Action should be query_openclaw_agent');
    assert(plan.steps[0].executor === 'openclaw', 'Executor should be openclaw');
    assert(plan.steps[0].args.query, 'Should have query in args');

    console.log('✓ Test 2.2: Generate T0 query plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.2: Generate T0 query plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 2.3: Generate T1 restart plan
  try {
    const intent = classifier.classify('restart the gateway');
    const plan = generatePlan(intent);

    assert(plan !== null, 'Plan should be generated');
    assert(plan.risk_tier === 'T1', 'Risk tier should be T1');
    assert(plan.steps[0].action === 'restart_service', 'Action should be restart_service');
    assert(plan.steps[0].args.service_name === 'openclaw-gateway', 'Service should be normalized');
    assert(plan.preconditions.length > 0, 'Should have preconditions');
    assert(plan.postconditions.length > 0, 'Should have postconditions');

    console.log('✓ Test 2.3: Generate T1 restart plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.3: Generate T1 restart plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 2.4: Null plan for unknown intent
  try {
    const intent = classifier.classify('what is the meaning of life');
    const plan = generatePlan(intent);

    assert(plan === null, 'Unknown intent should return null plan');

    console.log('✓ Test 2.4: Null plan for unknown intent');
    passed++;
  } catch (error) {
    console.log('✗ Test 2.4: Null plan for unknown intent');
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
    dbPath: '/tmp/test-plans-' + Date.now() + '.db'
  });
  await stateGraph.initialize();

  // Test 3.1: Create plan in State Graph
  try {
    const plan = createSimplePlan({
      action: 'show_status',
      description: 'Test plan',
      args: {},
      executor: 'local',
      risk_tier: 'T0'
    });

    const result = stateGraph.createPlan(plan);
    assert(result.plan_id === plan.plan_id, 'Plan ID should match');

    console.log('✓ Test 3.1: Create plan in State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.1: Create plan in State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.2: Get plan from State Graph
  try {
    const plan = createSimplePlan({
      action: 'show_services',
      description: 'Test get plan',
      args: {},
      executor: 'local',
      risk_tier: 'T0'
    });

    stateGraph.createPlan(plan);
    const retrieved = stateGraph.getPlan(plan.plan_id);

    assert(retrieved !== null, 'Plan should be retrieved');
    assert(retrieved.plan_id === plan.plan_id, 'Plan ID should match');
    assert(retrieved.objective === plan.objective, 'Objective should match');
    assert(Array.isArray(retrieved.steps), 'Steps should be parsed as array');
    assert(retrieved.steps.length === 1, 'Should have one step');

    console.log('✓ Test 3.2: Get plan from State Graph');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.2: Get plan from State Graph');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.3: Update plan status
  try {
    const plan = createSimplePlan({
      action: 'query_status',
      description: 'Test update',
      args: {},
      executor: 'openclaw',
      risk_tier: 'T0'
    });

    stateGraph.createPlan(plan);
    
    const updateResult = stateGraph.updatePlan(plan.plan_id, {
      status: 'completed',
      result: { success: true },
      actual_duration_ms: 523
    });

    assert(updateResult.changes === 1, 'Should update one record');

    const updated = stateGraph.getPlan(plan.plan_id);
    assert(updated.status === 'completed', 'Status should be updated');
    assert(updated.result.success === true, 'Result should be updated');
    assert(updated.actual_duration_ms === 523, 'Duration should be updated');

    console.log('✓ Test 3.3: Update plan status');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.3: Update plan status');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.4: List plans with filters
  try {
    // Create multiple plans
    const plan1 = createSimplePlan({ action: 'show_status', description: 'Plan 1', args: {}, executor: 'local', risk_tier: 'T0' });
    const plan2 = createSimplePlan({ action: 'restart_service', description: 'Plan 2', args: {}, executor: 'local', risk_tier: 'T1' });
    
    stateGraph.createPlan(plan1);
    stateGraph.createPlan(plan2);

    const allPlans = stateGraph.listPlans();
    assert(allPlans.length >= 2, 'Should have at least 2 plans');

    const t1Plans = stateGraph.listPlans({ risk_tier: 'T1' });
    assert(t1Plans.length >= 1, 'Should have at least 1 T1 plan');
    assert(t1Plans.every(p => p.risk_tier === 'T1'), 'All filtered plans should be T1');

    const pendingPlans = stateGraph.listPlans({ status: 'pending' });
    assert(pendingPlans.every(p => p.status === 'pending'), 'All filtered plans should be pending');

    console.log('✓ Test 3.4: List plans with filters');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.4: List plans with filters');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 3.5: Delete plan
  try {
    const plan = createSimplePlan({ action: 'show_status', description: 'Delete me', args: {}, executor: 'local', risk_tier: 'T0' });
    stateGraph.createPlan(plan);

    const deleteResult = stateGraph.deletePlan(plan.plan_id);
    assert(deleteResult.changes === 1, 'Should delete one record');

    const retrieved = stateGraph.getPlan(plan.plan_id);
    assert(retrieved === null, 'Plan should be deleted');

    console.log('✓ Test 3.5: Delete plan');
    passed++;
  } catch (error) {
    console.log('✗ Test 3.5: Delete plan');
    console.log('  Error:', error.message);
    failed++;
  }

  // ============================================================
  // Category 4: End-to-End Pipeline Tests
  // ============================================================

  console.log('\nCategory 4: End-to-End Pipeline\n');

  // Test 4.1: Intent → Plan → Persistence
  try {
    const intent = classifier.classify('show services');
    const plan = generatePlan(intent);
    
    assert(plan !== null, 'Plan should be generated');
    
    stateGraph.createPlan(plan);
    const retrieved = stateGraph.getPlan(plan.plan_id);
    
    assert(retrieved !== null, 'Plan should be persisted');
    assert(retrieved.plan_id === plan.plan_id, 'Plan ID should match');
    assert(retrieved.metadata.intent, 'Should have intent metadata');
    assert(retrieved.metadata.confidence, 'Should have confidence metadata');

    console.log('✓ Test 4.1: Intent → Plan → Persistence');
    passed++;
  } catch (error) {
    console.log('✗ Test 4.1: Intent → Plan → Persistence');
    console.log('  Error:', error.message);
    failed++;
  }

  // Test 4.2: Plan lifecycle (pending → executing → completed)
  try {
    const plan = createSimplePlan({
      action: 'query_status',
      description: 'Lifecycle test',
      args: {},
      executor: 'openclaw',
      risk_tier: 'T0'
    });

    stateGraph.createPlan(plan);
    
    // Start execution
    stateGraph.updatePlan(plan.plan_id, { status: 'executing' });
    let updated = stateGraph.getPlan(plan.plan_id);
    assert(updated.status === 'executing', 'Status should be executing');

    // Complete execution
    stateGraph.updatePlan(plan.plan_id, {
      status: 'completed',
      result: { success: true, data: 'test' },
      actual_duration_ms: 1000
    });
    updated = stateGraph.getPlan(plan.plan_id);
    assert(updated.status === 'completed', 'Status should be completed');
    assert(updated.result.success === true, 'Result should be recorded');

    console.log('✓ Test 4.2: Plan lifecycle (pending → executing → completed)');
    passed++;
  } catch (error) {
    console.log('✗ Test 4.2: Plan lifecycle (pending → executing → completed)');
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
