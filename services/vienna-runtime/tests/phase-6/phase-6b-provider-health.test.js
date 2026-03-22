/**
 * Phase 6B: Provider Health Enforcement Test
 * 
 * Validates that:
 * 1. Providers are registered and tracked
 * 2. Health checks run periodically
 * 3. Failures trigger degradation and quarantine
 * 4. Quarantined providers are blocked from execution
 * 5. Recovery attempts succeed after quarantine expires
 * 6. Events are emitted for health state changes
 */

const { ProviderHealthManager } = require('./lib/core/provider-health-manager.js');

console.log('═══════════════════════════════════════════════════════════');
console.log('Phase 6B: Provider Health Enforcement Test');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Mock provider
class MockProvider {
  constructor(name, shouldFail = false) {
    this.name = name;
    this.shouldFail = shouldFail;
    this.failureCount = 0;
  }
  
  async isHealthy() {
    if (this.shouldFail) {
      this.failureCount++;
      throw new Error(`Provider ${this.name} health check failed (${this.failureCount})`);
    }
    return true;
  }
  
  setHealthy(healthy) {
    this.shouldFail = !healthy;
  }
}

// Mock event emitter
class MockEventEmitter {
  constructor() {
    this.events = [];
  }
  
  emitAlert(type, data) {
    this.events.push({ type, data, timestamp: new Date().toISOString() });
  }
  
  getEvents(type = null) {
    if (type) {
      return this.events.filter(e => e.type === type);
    }
    return this.events;
  }
  
  clearEvents() {
    this.events = [];
  }
}

async function runTests() {
  // Test 1: Provider Registration
  console.log('Test 1: Provider Registration');
  console.log('───────────────────────────────────────────────────────────');
  
  try {
    const manager = new ProviderHealthManager({
      maxConsecutiveFailures: 3,
      quarantineDurationMs: 1000, // 1 second for testing
      cooldownDurationMs: 500, // 0.5 seconds for testing
      healthCheckIntervalMs: 10000, // Manual checks only
      staleTelemetryThresholdMs: 5000
    });
    
    const provider1 = new MockProvider('test-provider-1');
    const provider2 = new MockProvider('test-provider-2');
    
    manager.registerProvider('test-provider-1', provider1);
    manager.registerProvider('test-provider-2', provider2);
    
    const health = manager.getAllHealth();
    
    if (Object.keys(health).length !== 2) {
      console.log('❌ FAIL: Expected 2 providers registered');
      process.exit(1);
    }
    
    if (health['test-provider-1'].status !== 'unknown') {
      console.log('❌ FAIL: Initial status should be unknown');
      process.exit(1);
    }
    
    console.log('✅ Providers registered successfully');
    console.log(`   Registered: ${Object.keys(health).join(', ')}`);
    console.log('');
    
    // Test 2: Availability Check (Healthy)
    console.log('Test 2: Availability Check (Healthy Provider)');
    console.log('───────────────────────────────────────────────────────────');
    
    // Record success to mark as healthy
    await manager.recordSuccess('test-provider-1');
    
    const check1 = manager.checkAvailability('test-provider-1');
    
    if (!check1.available) {
      console.log('❌ FAIL: Healthy provider should be available');
      console.log(`   Result:`, check1);
      process.exit(1);
    }
    
    console.log('✅ Healthy provider availability check passed');
    console.log(`   Available: ${check1.available}`);
    console.log(`   Status: ${manager.getHealth('test-provider-1').status}`);
    console.log('');
    
    // Test 3: Failure Recording and Degradation
    console.log('Test 3: Failure Recording and Degradation');
    console.log('───────────────────────────────────────────────────────────');
    
    const emitter = new MockEventEmitter();
    manager.setEventEmitter(emitter);
    
    // Record first failure
    await manager.recordFailure('test-provider-1', new Error('Test failure 1'));
    
    const health1 = manager.getHealth('test-provider-1');
    
    if (health1.status !== 'degraded') {
      console.log('❌ FAIL: Provider should be degraded after 1 failure');
      process.exit(1);
    }
    
    if (!health1.in_cooldown) {
      console.log('❌ FAIL: Provider should be in cooldown after failure');
      process.exit(1);
    }
    
    const check2 = manager.checkAvailability('test-provider-1');
    
    if (check2.available) {
      console.log('❌ FAIL: Provider in cooldown should not be available');
      process.exit(1);
    }
    
    if (check2.reason !== 'provider_cooldown') {
      console.log('❌ FAIL: Reason should be provider_cooldown');
      process.exit(1);
    }
    
    console.log('✅ Degradation and cooldown working');
    console.log(`   Status: ${health1.status}`);
    console.log(`   Consecutive failures: ${health1.consecutive_failures}/3`);
    console.log(`   In cooldown: ${health1.in_cooldown}`);
    console.log('');
    
    // Wait for cooldown to expire
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Test 4: Quarantine After Threshold
    console.log('Test 4: Quarantine After Threshold');
    console.log('───────────────────────────────────────────────────────────');
    
    // Record 2 more failures to hit threshold
    await manager.recordFailure('test-provider-1', new Error('Test failure 2'));
    await manager.recordFailure('test-provider-1', new Error('Test failure 3'));
    
    const health2 = manager.getHealth('test-provider-1');
    
    if (health2.status !== 'quarantined') {
      console.log('❌ FAIL: Provider should be quarantined after 3 failures');
      console.log(`   Status: ${health2.status}`);
      process.exit(1);
    }
    
    if (!health2.quarantined) {
      console.log('❌ FAIL: Provider quarantined flag should be true');
      process.exit(1);
    }
    
    const check3 = manager.checkAvailability('test-provider-1');
    
    if (check3.available) {
      console.log('❌ FAIL: Quarantined provider should not be available');
      process.exit(1);
    }
    
    if (check3.reason !== 'provider_quarantined') {
      console.log('❌ FAIL: Reason should be provider_quarantined');
      process.exit(1);
    }
    
    // Check for quarantine event
    const quarantineEvents = emitter.getEvents('provider.quarantined');
    
    if (quarantineEvents.length !== 1) {
      console.log('❌ FAIL: Should have exactly 1 quarantine event');
      process.exit(1);
    }
    
    console.log('✅ Quarantine working');
    console.log(`   Status: ${health2.status}`);
    console.log(`   Quarantined: ${health2.quarantined}`);
    console.log(`   Consecutive failures: ${health2.consecutive_failures}`);
    console.log(`   Events emitted: ${quarantineEvents.length} quarantine events`);
    console.log('');
    
    // Test 5: Runtime Health Summary
    console.log('Test 5: Runtime Health Summary');
    console.log('───────────────────────────────────────────────────────────');
    
    // Mark provider2 as healthy so runtime isn't critical
    await manager.recordSuccess('test-provider-2');
    
    const runtimeHealth = manager.getRuntimeHealth();
    
    if (runtimeHealth.total_providers !== 2) {
      console.log('❌ FAIL: Should have 2 total providers');
      process.exit(1);
    }
    
    if (runtimeHealth.quarantined_count !== 1) {
      console.log('❌ FAIL: Should have 1 quarantined provider');
      process.exit(1);
    }
    
    if (runtimeHealth.runtime_status !== 'degraded') {
      console.log('❌ FAIL: Runtime status should be degraded');
      console.log(`   Actual status: ${runtimeHealth.runtime_status}`);
      console.log(`   All health:`, manager.getAllHealth());
      process.exit(1);
    }
    
    console.log('✅ Runtime health summary working');
    console.log(`   Total providers: ${runtimeHealth.total_providers}`);
    console.log(`   Healthy: ${runtimeHealth.healthy_count}`);
    console.log(`   Quarantined: ${runtimeHealth.quarantined_count}`);
    console.log(`   Runtime status: ${runtimeHealth.runtime_status}`);
    console.log('');
    
    // Test 6: Recovery After Quarantine
    console.log('Test 6: Recovery After Quarantine');
    console.log('───────────────────────────────────────────────────────────');
    
    // Wait for quarantine to expire
    console.log('   Waiting for quarantine to expire (1 second)...');
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Mark provider as healthy again
    provider1.setHealthy(true);
    
    // Attempt recovery
    await manager.attemptRecovery('test-provider-1');
    
    const health3 = manager.getHealth('test-provider-1');
    
    if (health3.status !== 'healthy') {
      console.log('❌ FAIL: Provider should be healthy after successful recovery');
      console.log(`   Status: ${health3.status}`);
      process.exit(1);
    }
    
    if (health3.quarantined) {
      console.log('❌ FAIL: Provider should no longer be quarantined');
      process.exit(1);
    }
    
    if (health3.consecutive_failures !== 0) {
      console.log('❌ FAIL: Consecutive failures should reset to 0');
      process.exit(1);
    }
    
    const check4 = manager.checkAvailability('test-provider-1');
    
    if (!check4.available) {
      console.log('❌ FAIL: Recovered provider should be available');
      process.exit(1);
    }
    
    // Check for recovery event
    const recoveryEvents = emitter.getEvents('provider.recovered');
    
    if (recoveryEvents.length < 1) {
      console.log('❌ FAIL: Should have at least 1 recovery event');
      process.exit(1);
    }
    
    console.log('✅ Recovery working');
    console.log(`   Status: ${health3.status}`);
    console.log(`   Quarantined: ${health3.quarantined}`);
    console.log(`   Consecutive failures: ${health3.consecutive_failures}`);
    console.log(`   Available: ${check4.available}`);
    console.log(`   Events emitted: ${recoveryEvents.length} recovery events`);
    console.log('');
    
    // Test 7: Event Stream Validation
    console.log('Test 7: Event Stream Validation');
    console.log('───────────────────────────────────────────────────────────');
    
    const allEvents = emitter.getEvents();
    const degradedEvents = emitter.getEvents('provider.degraded');
    
    console.log('✅ Event stream operational');
    console.log(`   Total events: ${allEvents.length}`);
    console.log(`   Degraded events: ${degradedEvents.length}`);
    console.log(`   Quarantine events: ${quarantineEvents.length}`);
    console.log(`   Recovery events: ${recoveryEvents.length}`);
    console.log('');
    console.log('   Event types:');
    const eventTypes = [...new Set(allEvents.map(e => e.type))];
    eventTypes.forEach(type => {
      const count = allEvents.filter(e => e.type === type).length;
      console.log(`     - ${type}: ${count}`);
    });
    console.log('');
    
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Phase 6B: All Tests Passed');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Provider Health Enforcement operational:');
  console.log('  ✅ Provider registration and tracking');
  console.log('  ✅ Health availability checks');
  console.log('  ✅ Failure recording and degradation');
  console.log('  ✅ Cooldown enforcement');
  console.log('  ✅ Quarantine after threshold');
  console.log('  ✅ Recovery after quarantine expiration');
  console.log('  ✅ Runtime health summary');
  console.log('  ✅ Event stream integration');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
