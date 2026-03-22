#!/usr/bin/env node
/**
 * Phase 9.7.3 Test — Real Execution
 * 
 * Controlled happy-path test of remediation execution.
 * 
 * Success condition:
 * 1. Restart handler works
 * 2. Sleep works
 * 3. Health check works
 * 4. Structured results recorded
 */

const { getStateGraph } = require('../lib/state/state-graph');
const { RemediationExecutor } = require('../lib/execution/remediation-executor');

async function main() {
  console.log('=== Phase 9.7.3: Real Execution Test ===\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const executor = new RemediationExecutor(stateGraph);

  // Step 1: Test restart handler
  console.log('Step 1: Testing system_service_restart...');
  const restartAction = {
    type: 'system_service_restart',
    target: 'openclaw-gateway',
    timeoutMs: 10000
  };

  const restartResult = await executor.execute(restartAction, {
    objectiveId: 'test_objective',
    executionId: 'test_execution_1',
    planId: 'test_plan_1'
  });

  console.log('Restart result:', JSON.stringify(restartResult, null, 2));
  
  if (!restartResult.ok) {
    console.error('❌ Restart failed');
    process.exit(1);
  }
  console.log('✅ Restart succeeded\n');

  // Step 2: Test sleep
  console.log('Step 2: Testing sleep...');
  const sleepAction = {
    type: 'sleep',
    durationMs: 3000
  };

  const sleepResult = await executor.execute(sleepAction, {
    objectiveId: 'test_objective',
    executionId: 'test_execution_1',
    planId: 'test_plan_1'
  });

  console.log('Sleep result:', JSON.stringify(sleepResult, null, 2));
  
  if (!sleepResult.ok) {
    console.error('❌ Sleep failed');
    process.exit(1);
  }
  console.log('✅ Sleep succeeded\n');

  // Step 3: Test health check
  console.log('Step 3: Testing health_check...');
  const healthAction = {
    type: 'health_check',
    target: 'openclaw-gateway',
    timeoutMs: 5000
  };

  const healthResult = await executor.execute(healthAction, {
    objectiveId: 'test_objective',
    executionId: 'test_execution_1',
    planId: 'test_plan_1'
  });

  console.log('Health check result:', JSON.stringify(healthResult, null, 2));
  
  if (!healthResult.ok) {
    console.error('❌ Health check failed');
    process.exit(1);
  }
  console.log('✅ Health check succeeded\n');

  // Step 4: Test full plan execution
  console.log('Step 4: Testing full plan execution...');
  
  const testPlan = {
    plan_id: 'test_plan_full',
    steps: [
      {
        step_id: 'step_1',
        action_type: 'system_service_restart',
        target: 'openclaw-gateway',
        timeoutMs: 10000
      },
      {
        step_id: 'step_2',
        action_type: 'sleep',
        durationMs: 3000
      },
      {
        step_id: 'step_3',
        action_type: 'health_check',
        target: 'openclaw-gateway',
        timeoutMs: 5000
      }
    ]
  };

  const planResult = await executor.executePlan(testPlan, {
    objectiveId: 'test_objective',
    executionId: 'test_execution_2',
    planId: 'test_plan_full'
  });

  console.log('Plan execution result:', JSON.stringify(planResult, null, 2));
  
  if (!planResult.completed) {
    console.error('❌ Plan execution failed');
    process.exit(1);
  }
  console.log('✅ Plan execution succeeded\n');

  console.log('=== All tests passed ===');
  console.log('\n✅ Step 10 complete: Controlled happy-path execution validated');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
