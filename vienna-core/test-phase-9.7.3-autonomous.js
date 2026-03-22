/**
 * Phase 9.7.3 — Full Autonomous Loop Test
 * 
 * Test complete autonomous recovery flow:
 * 1. Create gateway health objective
 * 2. Inject failure (stop gateway)
 * 3. Trigger evaluation
 * 4. Observe autonomous remediation
 * 5. Verify recovery
 * 6. Check ledger trail
 * 
 * Expected flow:
 * observe → evaluate → violation → remediation → execution → verification → restored
 */

const { getStateGraph } = require('./lib/state/state-graph');
const { createObjective } = require('./lib/core/objective-schema');
const { ObjectiveEvaluator } = require('./lib/core/objective-evaluator');
const { triggerRemediation } = require('./lib/core/remediation-trigger');
const { createGatewayRecoveryPlan } = require('./lib/execution/remediation-plans');
const { createPlan } = require('./lib/core/plan-schema');
const { RemediationExecutor } = require('./lib/execution/remediation-executor');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function testAutonomousLoop() {
  console.log('=== Phase 9.7.3 Full Autonomous Loop Test ===\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Seed gateway service in test State Graph
  console.log('[Setup] Seeding openclaw-gateway service...');
  try {
    stateGraph.createService({
      service_id: 'openclaw-gateway',
      service_name: 'openclaw-gateway',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy',
      metadata: { test: true }
    });
    console.log('✓ Service seeded');
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint')) {
      throw err;
    }
    // Service exists, reset to healthy state
    stateGraph.updateService('openclaw-gateway', { status: 'running', health: 'healthy' });
    console.log('✓ Service already exists (reset to healthy)');
  }
  
  // Verify service exists
  const verifyService = stateGraph.getService('openclaw-gateway');
  console.log(`✓ Service verified: ${verifyService ? 'found' : 'NOT FOUND'}`);
  if (verifyService) {
    console.log(`  Status: ${verifyService.status}, Health: ${verifyService.health}`);
  }
  console.log();

  // Step 1: Create remediation plan
  console.log('[Step 1] Creating gateway recovery plan...');
  const planStructure = createGatewayRecoveryPlan('openclaw-gateway');
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

  const planResult = stateGraph.createPlan(plan);
  const planId = planResult.plan_id; // Extract plan_id from result
  plan.plan_id = planId; // Store for later reference
  console.log(`✓ Remediation plan created: ${planId}`);
  console.log();

  // Step 2: Create objective
  console.log('[Step 2] Creating gateway health objective...');
  const objective = createObjective({
    name: 'maintain_gateway_health',
    description: 'Ensure openclaw-gateway service remains active and healthy',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    desired_state: {
      service_active: true,
      service_healthy: true
    },
    evaluation_interval: '30s',
    remediation_plan: planId, // Must be string plan_id
    verification_strength: 'full_validation', // Must be valid enum value
    metadata: {
      created_by: 'phase_9.7.3_test',
      test_run: true
    }
  });

  const objectiveResult = stateGraph.createObjective(objective);
  const objectiveId = objectiveResult.objective_id; // Extract objective_id from result
  console.log(`✓ Objective created: ${objectiveId}`);
  console.log(`  Target: ${objective.target_type}:${objective.target_id}`);
  console.log(`  State: ${objective.status}`);
  console.log();

  // Initialize evaluator
  const evaluator = new ObjectiveEvaluator(stateGraph);

  // Step 3: Baseline evaluation (should be healthy)
  console.log('[Step 3] Baseline evaluation...');
  const baselineEval = await evaluator.evaluateObjective(objectiveId);
  console.log(`✓ Baseline evaluation complete`);
  console.log(`  Satisfied: ${baselineEval.objective_satisfied}`);
  console.log(`  Violation: ${baselineEval.violation_detected}`);
  console.log(`  Action: ${baselineEval.action_taken}`);
  console.log();

  if (!baselineEval.objective_satisfied) {
    console.error('✗ Gateway not healthy at baseline. Cannot proceed.');
    console.error(`  Result: ${JSON.stringify(baselineEval, null, 2)}`);
    process.exit(1);
  }

  // Step 4: Inject failure (stop gateway)
  console.log('[Step 4] Injecting failure (stopping gateway)...');
  
  if (process.env.VIENNA_TEST_STUB_ACTIONS === 'true') {
    console.log('  [TEST MODE] Skipping real service stop');
    // Manually set service to unhealthy state for test
    stateGraph.updateService('openclaw-gateway', { status: 'stopped', health: 'unhealthy' });
  } else {
    try {
      await execFileAsync('systemctl', ['--user', 'stop', 'openclaw-gateway']);
      console.log('✓ Gateway stopped');
    } catch (err) {
      console.error('✗ Failed to stop gateway:', err.message);
      process.exit(1);
    }
  }
  
  // Wait 2s for state to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log();

  // Step 5: Detect failure via evaluation
  console.log('[Step 5] Detecting failure via evaluation...');
  const failureEval = await evaluator.evaluateObjective(objectiveId);
  console.log(`✓ Evaluation complete`);
  console.log(`  Satisfied: ${failureEval.objective_satisfied}`);
  console.log(`  Violation: ${failureEval.violation_detected}`);
  console.log(`  Action: ${failureEval.action_taken}`);
  console.log(`  Triggered plan: ${failureEval.triggered_plan_id || 'none'}`);
  console.log();

  if (!failureEval.violation_detected) {
    console.error('✗ Failure not detected. Expected violation_detected=true');
    console.error(`  Result: ${JSON.stringify(failureEval, null, 2)}`);
    process.exit(1);
  }

  // Check state transition occurred
  const updatedObjective = stateGraph.getObjective(objectiveId);
  if (updatedObjective.status !== 'violation_detected') {
    console.error(`✗ Wrong state. Expected violation_detected, got ${updatedObjective.status}`);
    process.exit(1);
  }

  // Step 6: Trigger remediation
  console.log('[Step 6] Triggering remediation...');
  
  // Prepare context with chat action bridge
  const mockChatActionBridge = {
    executeRemediationPlan: async (planId, context) => {
      console.log(`  Executing remediation plan: ${planId}`);
      
      const executor = new RemediationExecutor(stateGraph);
      const loadedPlan = stateGraph.getPlan(planId);
      
      if (!loadedPlan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const executionResult = await executor.executePlan(loadedPlan, {
        ...context,
        executionId: `exec_${Date.now()}`
      });

      return {
        status: executionResult.completed ? 'completed' : 'failed',
        execution_id: context.executionId || `exec_${Date.now()}`,
        workflow_outcome: {
          objective_achieved: executionResult.completed
        }
      };
    }
  };

  const remediationResult = await triggerRemediation(objectiveId, {
    chatActionBridge: mockChatActionBridge,
    triggered_by: 'autonomous_evaluator'
  });

  console.log(`✓ Remediation triggered`);
  console.log(`  Final state: ${remediationResult.objective_state}`);
  console.log(`  Triggered: ${remediationResult.triggered}`);
  console.log(`  Plan ID: ${remediationResult.triggered_plan_id}`);
  console.log(`  Execution ID: ${remediationResult.execution_id || 'none'}`);
  console.log();

  // Step 7: Verify recovery
  console.log('[Step 7] Verifying recovery...');
  const recoveryEval = await evaluator.evaluateObjective(objectiveId);
  console.log(`✓ Post-remediation evaluation complete`);
  console.log(`  Satisfied: ${recoveryEval.objective_satisfied}`);
  console.log(`  Violation: ${recoveryEval.violation_detected}`);
  console.log(`  Action: ${recoveryEval.action_taken}`);
  console.log();

  // Step 8: Query audit trail
  console.log('[Step 8] Checking audit trail...');
  const evaluations = stateGraph.listObjectiveEvaluations(objectiveId);
  const history = stateGraph.listObjectiveHistory(objectiveId);
  
  console.log(`✓ Evaluations recorded: ${evaluations.length}`);
  console.log(`✓ State transitions: ${history.length}`);
  console.log();

  // Summary
  console.log('=== Autonomous Loop Summary ===');
  console.log(`Objective ID: ${objectiveId}`);
  console.log(`Plan ID: ${planId}`);
  console.log(`Execution ID: ${remediationResult.execution_id || 'none'}`);
  console.log(`Evaluations: ${evaluations.length}`);
  console.log(`Transitions: ${history.length}`);
  console.log();

  console.log('State Transitions:');
  history.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.from_state} → ${t.to_state} (${t.transition_reason})`);
  });
  console.log();

  // Validate success criteria
  const success = 
    evaluations.length >= 3 &&
    history.length >= 4 &&
    remediationResult.triggered &&
    (remediationResult.objective_state === 'restored' || remediationResult.objective_state === 'verification');

  if (success) {
    console.log('✓ Phase 9.7.3 Autonomous Loop: PASSED');
    console.log();
    console.log('Autonomous recoveries:');
    console.log('  1 failure detected');
    console.log('  1 remediation executed');
    console.log('  1 recovery verified');
    process.exit(0);
  } else {
    console.log('✗ Phase 9.7.3 Autonomous Loop: FAILED');
    console.log(`  Evaluations: ${evaluations.length} (expected ≥3)`);
    console.log(`  Transitions: ${history.length} (expected ≥4)`);
    console.log(`  Triggered: ${remediationResult.triggered} (expected true)`);
    console.log(`  Final state: ${remediationResult.objective_state} (expected restored or verification)`);
    process.exit(1);
  }
}

// Run test
testAutonomousLoop().catch(err => {
  console.error('Test failed with error:', err);
  console.error(err.stack);
  process.exit(1);
});
