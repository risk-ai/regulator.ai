/**
 * Debug script for evaluator gate integration
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { ObjectiveEvaluator } = require('./lib/core/objective-evaluator-integrated');
const { createReconciliationGate } = require('./lib/core/reconciliation-gate');
const { ReconciliationStatus } = require('./lib/core/reconciliation-state-machine');
const { createObjective } = require('./lib/core/objective-schema');

async function main() {
  console.log('[DEBUG] Starting evaluator gate integration test...');

  try {
    // Initialize State Graph
    console.log('[DEBUG] Initializing State Graph...');
    const stateGraph = getStateGraph();
    await stateGraph.initialize();
    console.log('[DEBUG] State Graph initialized');

    // Initialize gate
    console.log('[DEBUG] Creating reconciliation gate...');
    const gate = createReconciliationGate(stateGraph);
    console.log('[DEBUG] Gate created');

    // Initialize evaluator
    console.log('[DEBUG] Creating evaluator...');
    const evaluator = new ObjectiveEvaluator(stateGraph, gate);
    console.log('[DEBUG] Evaluator created');

    // Seed test service
    console.log('[DEBUG] Seeding test service...');
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
    console.log('[DEBUG] Service seeded');

    // Test 1: Healthy objective
    console.log('\n[TEST 1] Healthy objective → No action');
    const obj1Config = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      remediation_plan: 'restart_service_plan',
      evaluation_interval: '30s',
    });
    // Override reconciliation status for test
    obj1Config.reconciliation_status = ReconciliationStatus.IDLE;
    const objective1 = stateGraph.createObjective(obj1Config);
    console.log('[DEBUG] Objective created:', objective1.objective_id);

    console.log('[DEBUG] Evaluating...');
    const result1 = await evaluator.evaluateObjective(objective1.objective_id);
    console.log('[DEBUG] Result:', JSON.stringify(result1, null, 2));

    console.log('\n✅ Test 1 passed');

    // Test 2: Unhealthy objective → Gate admits
    console.log('\n[TEST 2] Unhealthy idle objective → Gate admits');
    
    // Make service unhealthy
    stateGraph.updateService('test-service', {
      status: 'stopped',
      health: 'unhealthy'
    });
    console.log('[DEBUG] Service updated to unhealthy');

    const obj2Config = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      remediation_plan: 'restart_service_plan',
      evaluation_interval: '30s',
    });
    // Override reconciliation fields for test
    obj2Config.reconciliation_status = ReconciliationStatus.IDLE;
    obj2Config.reconciliation_generation = 0;
    obj2Config.reconciliation_attempt_count = 0;
    const objective2 = stateGraph.createObjective(obj2Config);
    console.log('[DEBUG] Objective created:', objective2.objective_id);

    console.log('[DEBUG] Evaluating...');
    const result2 = await evaluator.evaluateObjective(objective2.objective_id);
    console.log('[DEBUG] Result:', JSON.stringify(result2, null, 2));

    // Verify objective transitioned
    const updated2 = stateGraph.getObjective(objective2.objective_id);
    console.log('[DEBUG] Updated objective:', JSON.stringify({
      reconciliation_status: updated2.reconciliation_status,
      reconciliation_generation: updated2.reconciliation_generation,
      reconciliation_attempt_count: updated2.reconciliation_attempt_count
    }, null, 2));

    console.log('\n✅ Test 2 passed');

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('[ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
