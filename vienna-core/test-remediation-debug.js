/**
 * Debug remediation trigger
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { handleExecutionFailure } = require('./lib/core/remediation-trigger-integrated');
const { ReconciliationStatus } = require('./lib/core/reconciliation-state-machine');
const { createObjective } = require('./lib/core/objective-schema');

async function main() {
  console.log('[DEBUG] Starting remediation trigger debug...');

  try {
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    // Seed test service
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });

    // Create objective with reconciliation fields
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    
    console.log('[DEBUG] objConfig before overrides:', JSON.stringify({
      reconciliation_status: objConfig.reconciliation_status,
      reconciliation_generation: objConfig.reconciliation_generation,
      reconciliation_attempt_count: objConfig.reconciliation_attempt_count
    }, null, 2));

    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 1;
    objConfig.reconciliation_attempt_count = 1;

    console.log('[DEBUG] objConfig after overrides:', JSON.stringify({
      reconciliation_status: objConfig.reconciliation_status,
      reconciliation_generation: objConfig.reconciliation_generation,
      reconciliation_attempt_count: objConfig.reconciliation_attempt_count
    }, null, 2));

    const objective = stateGraph.createObjective(objConfig);

    console.log('[DEBUG] Objective from DB:', JSON.stringify({
      objective_id: objective.objective_id,
      reconciliation_status: objective.reconciliation_status,
      reconciliation_generation: objective.reconciliation_generation,
      reconciliation_attempt_count: objective.reconciliation_attempt_count
    }, null, 2));

    const result = handleExecutionFailure(
      stateGraph,
      objective,
      'Test execution failure',
      'exec-123'
    );

    console.log('[DEBUG] Result:', JSON.stringify(result, null, 2));

    const updated = stateGraph.getObjective(objective.objective_id);
    console.log('[DEBUG] Updated objective:', JSON.stringify({
      reconciliation_status: updated.reconciliation_status,
      reconciliation_attempt_count: updated.reconciliation_attempt_count,
      reconciliation_last_result: updated.reconciliation_last_result
    }, null, 2));

    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('[ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
