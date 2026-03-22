/**
 * Phase 9.7.3 — Controlled Execution Test
 * 
 * Test remediation execution WITHOUT the evaluator loop.
 * Manual trigger only.
 * 
 * Expected flow:
 * 1. Create gateway recovery plan
 * 2. Execute plan through RemediationExecutor
 * 3. Verify action results
 * 4. Check execution ledger
 */

const { RemediationExecutor } = require('./lib/execution/remediation-executor');
const { createGatewayRecoveryPlan } = require('./lib/execution/remediation-plans');
const { getStateGraph } = require('./lib/state/state-graph');
const { createPlan } = require('./lib/core/plan-schema');

async function testControlledExecution() {
  console.log('=== Phase 9.7.3 Controlled Execution Test ===\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Step 1: Create gateway recovery plan structure
  console.log('[Step 1] Creating gateway recovery plan...');
  const planStructure = createGatewayRecoveryPlan('openclaw-gateway');
  
  // Create formal Plan object
  const plan = createPlan({
    objective: planStructure.objective,
    steps: planStructure.steps,
    preconditions: planStructure.preconditions,
    postconditions: planStructure.postconditions,
    risk_tier: planStructure.risk_tier,
    estimated_duration_ms: planStructure.estimated_duration_ms,
    verification_spec: planStructure.verification_spec,
    metadata: planStructure.metadata
  });

  // Store plan in State Graph
  const planId = stateGraph.createPlan(plan);
  plan.plan_id = planId;

  console.log(`✓ Plan created: ${planId}`);
  console.log(`  Steps: ${plan.steps.length}`);
  console.log(`  Risk tier: ${plan.risk_tier}`);
  console.log();

  // Step 2: Initialize RemediationExecutor
  console.log('[Step 2] Initializing RemediationExecutor...');
  const executor = new RemediationExecutor(stateGraph);
  console.log('✓ Executor ready');
  console.log();

  // Step 3: Execute plan
  console.log('[Step 3] Executing remediation plan...');
  const context = {
    objectiveId: 'test_objective_001',
    executionId: `exec_${Date.now()}`,
    planId: planId
  };

  const startTime = Date.now();
  const result = await executor.executePlan(plan, context);
  const duration = Date.now() - startTime;

  console.log(`✓ Plan execution completed in ${duration}ms`);
  console.log(`  Status: ${result.completed ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  Steps executed: ${result.steps.length}`);
  console.log();

  // Step 4: Display step results
  console.log('[Step 4] Step results:');
  result.steps.forEach((stepResult, idx) => {
    const step = stepResult.step;
    const action = stepResult.action;
    const actionResult = stepResult.result;

    console.log(`  Step ${idx + 1}: ${step.step_id}`);
    console.log(`    Action: ${action.type}`);
    console.log(`    Target: ${action.target || 'N/A'}`);
    console.log(`    Result: ${actionResult.ok ? '✓ SUCCESS' : '✗ FAILED'}`);
    if (actionResult.error) {
      console.log(`    Error: ${actionResult.error}`);
    }
    if (actionResult.details) {
      console.log(`    Details: ${JSON.stringify(actionResult.details)}`);
    }
    console.log();
  });

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Plan ID: ${planId}`);
  console.log(`Execution ID: ${context.executionId}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Overall status: ${result.completed ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log();

  if (result.completed) {
    console.log('✓ Phase 9.7.3 Controlled Execution: PASSED');
    process.exit(0);
  } else {
    console.log('✗ Phase 9.7.3 Controlled Execution: FAILED');
    process.exit(1);
  }
}

// Run test
testControlledExecution().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
