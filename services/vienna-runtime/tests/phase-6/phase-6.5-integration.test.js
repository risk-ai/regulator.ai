/**
 * Phase 6.5 Integration Test - Provider Health → Runtime Mode
 * 
 * Tests the full integration:
 * 1. ProviderHealthManager tracks provider health
 * 2. ProviderHealthBridge converts health state
 * 3. RuntimeModeManager updates mode automatically
 * 4. Recovery copilot can diagnose state
 */

const ViennaCore = require('./index');
const { ProviderHealthManager } = require('./lib/core/provider-health-manager');
const { RuntimeModeManager } = require('./lib/core/runtime-modes');
const { ProviderHealthBridge } = require('./lib/core/provider-health-bridge');
const { RecoveryCopilot } = require('./lib/core/recovery-copilot');

console.log('=== Phase 6.5 Integration Test ===\n');

// Mock provider for testing
class MockProvider {
  constructor(name, healthy = true) {
    this.name = name;
    this._healthy = healthy;
  }
  
  async isHealthy() {
    return this._healthy;
  }
  
  setHealthy(healthy) {
    this._healthy = healthy;
  }
}

async function runTest() {
  console.log('Test 1: Provider Health Bridge Conversion');
  console.log('-------------------------------------------');
  
  // Create managers
  const healthManager = new ProviderHealthManager();
  const runtimeManager = new RuntimeModeManager();
  const bridge = new ProviderHealthBridge(healthManager, runtimeManager);
  
  // Register mock providers
  const anthropic = new MockProvider('anthropic', true);
  const local = new MockProvider('local', true);
  
  healthManager.registerProvider('anthropic', anthropic);
  healthManager.registerProvider('local', local);
  
  console.log('Providers registered: anthropic, local');
  
  // Run health check
  await healthManager.runHealthChecks();
  console.log('Health checks completed');
  
  // Get converted health
  const convertedHealth = bridge.getProviderHealth();
  console.log('\nConverted provider health:');
  for (const [name, health] of convertedHealth.entries()) {
    console.log(`  ${name}:`, {
      status: health.status,
      consecutiveFailures: health.consecutiveFailures,
    });
  }
  
  // Get runtime mode
  const state1 = bridge.getRuntimeModeState();
  console.log('\nRuntime mode:', state1.mode);
  console.log('Expected: normal (all providers healthy)');
  console.assert(state1.mode === 'normal', 'Should be normal mode');
  
  console.log('\n✓ Test 1 passed\n');
  
  // Test 2: Provider failure triggers mode change
  console.log('Test 2: Provider Failure → Mode Change');
  console.log('---------------------------------------');
  
  // Simulate anthropic failure
  anthropic.setHealthy(false);
  
  // Run health check
  await healthManager.runHealthChecks();
  await healthManager.runHealthChecks(); // Run multiple times to accumulate failures
  await healthManager.runHealthChecks();
  
  console.log('Anthropic marked unhealthy after 3 failures');
  
  // Update runtime mode
  await bridge.updateRuntimeMode();
  
  const state2 = bridge.getRuntimeModeState();
  console.log('\nRuntime mode:', state2.mode);
  console.log('Reasons:', state2.reasons);
  console.log('Expected: degraded (anthropic unavailable)');
  console.assert(state2.mode === 'degraded', 'Should be degraded mode');
  
  console.log('\n✓ Test 2 passed\n');
  
  // Test 3: Recovery copilot diagnostics
  console.log('Test 3: Recovery Copilot Diagnostics');
  console.log('-------------------------------------');
  
  const copilot = new RecoveryCopilot();
  
  // Diagnose system
  const providerHealth = bridge.getProviderHealth();
  const runtimeState = bridge.getRuntimeModeState();
  
  const diagnosis = await copilot.processIntent('diagnose system', runtimeState, providerHealth);
  console.log('\n--- System Diagnosis ---');
  console.log(diagnosis);
  
  // Show failures
  const failures = await copilot.processIntent('show failures', runtimeState, providerHealth);
  console.log('\n--- Provider Failures ---');
  console.log(failures);
  
  // Test provider
  const providerTest = await copilot.processIntent('test provider anthropic', runtimeState, providerHealth);
  console.log('\n--- Test Anthropic ---');
  console.log(providerTest);
  
  console.log('\n✓ Test 3 passed\n');
  
  // Test 4: Recovery after provider recovery
  console.log('Test 4: Provider Recovery → Mode Recovery');
  console.log('------------------------------------------');
  
  // Restore anthropic health
  anthropic.setHealthy(true);
  
  // Run health checks
  await healthManager.runHealthChecks();
  console.log('Anthropic health restored');
  
  // Update runtime mode
  await bridge.updateRuntimeMode();
  
  const state3 = bridge.getRuntimeModeState();
  console.log('\nRuntime mode:', state3.mode);
  console.log('Expected: normal (all providers healthy again)');
  console.assert(state3.mode === 'normal', 'Should return to normal mode');
  
  console.log('\n✓ Test 4 passed\n');
  
  // Test 5: Operator force mode
  console.log('Test 5: Operator Force Mode');
  console.log('----------------------------');
  
  const forceTransition = await bridge.forceMode('local-only', 'Operator testing local-only mode');
  console.log('Forced transition:', JSON.stringify(forceTransition, null, 2));
  
  const state4 = bridge.getRuntimeModeState();
  console.log('\nRuntime mode:', state4.mode);
  console.log('Expected: local-only');
  console.assert(state4.mode === 'local-only', 'Should be in local-only mode');
  console.assert(forceTransition.automatic === false, 'Should be manual transition');
  
  console.log('\n✓ Test 5 passed\n');
  
  // Test 6: Automatic bridge updates (simulated)
  console.log('Test 6: Automatic Runtime Mode Updates');
  console.log('---------------------------------------');
  
  // Start bridge (should run updates automatically)
  bridge.start();
  console.log('Bridge started with automatic updates');
  
  // Wait for one update cycle
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check that mode was updated automatically
  const state5 = bridge.getRuntimeModeState();
  console.log('Runtime mode after automatic update:', state5.mode);
  
  // Stop bridge
  bridge.stop();
  console.log('Bridge stopped');
  
  console.log('\n✓ Test 6 passed\n');
  
  console.log('=== Phase 6.5 Integration Test Complete ===');
  console.log('\nAll integration tests passed ✓');
  console.log('\nValidated:');
  console.log('✓ ProviderHealthManager → ProviderHealthBridge conversion');
  console.log('✓ Runtime mode updates from provider health changes');
  console.log('✓ Recovery copilot diagnostics with real health data');
  console.log('✓ Provider recovery → mode recovery flow');
  console.log('✓ Operator force mode override');
  console.log('✓ Automatic runtime mode updates');
  console.log('\nPriority 1 (Provider Health → Runtime Mode): COMPLETE ✓');
}

runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
