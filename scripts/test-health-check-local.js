#!/usr/bin/env node
/**
 * Local test for health check integration
 * Tests directly against vienna-lib without HTTP layer
 */

const path = require('path');

// Set test environment
process.env.VIENNA_ENV = 'test';
process.env.NODE_ENV = 'test';

const viennaLibPath = path.join(__dirname, '../services/vienna-lib');
const { getStateGraph } = require(path.join(viennaLibPath, 'state/state-graph'));
const { IntentGateway } = require(path.join(viennaLibPath, 'core/intent-gateway'));

async function testHealthCheck() {
  console.log('\n========================================');
  console.log('Local Health Check Integration Test');
  console.log('========================================\n');

  // Initialize state graph
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create intent gateway
  const gateway = new IntentGateway(stateGraph);

  // Test 1: Executed health check
  console.log('Test 1: Executed Health Check');
  console.log('------------------------------');
  
  const executedIntent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant',
      target: 'vienna_backend',
      simulation: false
    }
  };

  try {
    const result = await gateway.submitIntent(executedIntent);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.accepted && result.metadata?.result && result.metadata.result.ok) {
      console.log('✅ Executed test PASSED');
      console.log(`   - Health check called: YES`);
      console.log(`   - Endpoint: ${result.metadata.result.endpoint}`);
      console.log(`   - Status: ${result.metadata.result.status_code}`);
      console.log(`   - Cost: ${result.metadata.cost}`);
      console.log(`   - Attestation: ${result.metadata.attestation?.attestation_id || 'none'}`);
    } else {
      console.log('❌ Executed test FAILED');
      console.log(`   Error: ${result.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log('❌ Executed test FAILED');
    console.log(`   Exception: ${error.message}`);
  }

  // Test 2: Simulated health check
  console.log('\nTest 2: Simulated Health Check');
  console.log('-------------------------------');
  
  const simulatedIntent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant',
      target: 'vienna_backend',
      simulation: true
    }
  };

  try {
    const result = await gateway.submitIntent(simulatedIntent);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.accepted && result.metadata?.simulation === true && result.metadata.result?.simulated) {
      console.log('✅ Simulated test PASSED');
      console.log(`   - Health check called: NO (simulated)`);
      console.log(`   - Cost: ${result.metadata.cost || 'none'}`);
      console.log(`   - Attestation: ${result.metadata.attestation?.attestation_id || 'none'} (simulated)`);
    } else {
      console.log('❌ Simulated test FAILED');
      console.log(`   Error: ${result.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log('❌ Simulated test FAILED');
    console.log(`   Exception: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('Local test complete');
  console.log('========================================\n');
}

testHealthCheck().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
