#!/usr/bin/env node
/**
 * Phase 9.7.3 — Test Handlers (No Restart)
 * 
 * Test sleep and health check handlers without actually restarting.
 */

const { getStateGraph } = require('../lib/state/state-graph');
const { RemediationExecutor } = require('../lib/execution/remediation-executor');

async function main() {
  console.log('=== Testing Non-Restart Handlers ===\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const executor = new RemediationExecutor(stateGraph);

  // Test sleep
  console.log('Testing sleep...');
  const sleepResult = await executor.execute({
    type: 'sleep',
    durationMs: 2000
  }, { objectiveId: 'test', executionId: 'test_1' });
  
  console.log('Sleep:', sleepResult.ok ? '✅' : '❌');

  // Test health check
  console.log('Testing health_check...');
  const healthResult = await executor.execute({
    type: 'health_check',
    target: 'openclaw-gateway',
    timeoutMs: 5000
  }, { objectiveId: 'test', executionId: 'test_2' });
  
  console.log('Health:', healthResult.ok ? '✅' : '❌');
  console.log('Health details:', JSON.stringify(healthResult.details, null, 2));

  if (sleepResult.ok && healthResult.ok) {
    console.log('\n✅ Handlers operational');
  } else {
    console.log('\n❌ Handler test failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
