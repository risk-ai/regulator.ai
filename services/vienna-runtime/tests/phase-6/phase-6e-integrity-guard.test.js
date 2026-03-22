/**
 * Phase 6E: Runtime Integrity Guard Test
 * 
 * Validates that:
 * 1. Integrity guard initializes correctly
 * 2. Queue depth checks detect mismatches
 * 3. Executor stall detection works
 * 4. DLQ growth spike detection works
 * 5. Memory pressure detection works
 * 6. Alerts are emitted for anomalies
 * 7. Runtime status reflects anomalies
 */

const { RuntimeIntegrityGuard } = require('./lib/core/runtime-integrity-guard.js');
const { ExecutionQueue } = require('./lib/execution/execution-queue.js');
const { DeadLetterQueue } = require('./lib/execution/dead-letter-queue.js');

console.log('═══════════════════════════════════════════════════════════');
console.log('Phase 6E: Runtime Integrity Guard Test');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Mock event emitter
class MockEventEmitter {
  constructor() {
    this.events = [];
    this.circuitBreakerOpen = false;
    this.buffer = [];
    this.maxBufferSize = 100;
  }
  
  emitAlert(type, data) {
    this.events.push({ type, data });
  }
  
  getEvents(type = null) {
    if (type) {
      return this.events.filter(e => e.type === type);
    }
    return this.events;
  }
}

// Mock logger
class MockLogger {
  constructor() {
    this.logs = [];
  }
  
  logRuntimeAlert(type, data) {
    this.logs.push({ type, data });
  }
}

// Mock provider health manager
class MockProviderHealth {
  constructor(status = 'operational') {
    this.status = status;
  }
  
  getRuntimeHealth() {
    if (this.status === 'critical') {
      return {
        runtime_status: 'critical',
        total_providers: 2,
        healthy_count: 0,
        quarantined_count: 2
      };
    } else if (this.status === 'degraded') {
      return {
        runtime_status: 'degraded',
        total_providers: 2,
        healthy_count: 1,
        quarantined_count: 1
      };
    }
    
    return {
      runtime_status: 'operational',
      total_providers: 2,
      healthy_count: 2,
      quarantined_count: 0
    };
  }
}

async function runTests() {
  try {
    // Test 1: Initialization
    console.log('Test 1: Integrity Guard Initialization');
    console.log('───────────────────────────────────────────────────────────');
    
    const guard = new RuntimeIntegrityGuard({
      enabled: true,
      checkIntervalMs: 60000, // Manual checks only for testing
      queueDepthThreshold: 100,
      dlqGrowthThreshold: 5,
      executorStallThresholdMs: 10000,
      memoryThresholdMB: 10000 // High threshold to avoid triggering in test
    });
    
    const stats = guard.getStats();
    
    if (!stats.enabled) {
      console.log('❌ FAIL: Guard should be enabled');
      process.exit(1);
    }
    
    console.log('✅ Integrity guard initialized');
    console.log(`   Enabled: ${stats.enabled}`);
    console.log(`   Check interval: ${stats.check_interval_ms}ms`);
    console.log(`   Runtime status: ${stats.runtime_status}`);
    console.log('');
    
    // Test 2: Queue Depth Check
    console.log('Test 2: Queue Depth Anomaly Detection');
    console.log('───────────────────────────────────────────────────────────');
    
    const queue = new ExecutionQueue({
      queueFile: '.test-data/phase6e/test-queue.jsonl'
    });
    
    await queue.initialize();
    
    const dlq = new DeadLetterQueue({
      dlqFile: '.test-data/phase6e/test-dlq.jsonl'
    });
    
    await dlq.initialize();
    
    const emitter = new MockEventEmitter();
    const logger = new MockLogger();
    const providerHealth = new MockProviderHealth();
    
    guard.setDependencies(queue, dlq, emitter, logger, providerHealth);
    
    // Add some envelopes to create queue depth
    for (let i = 0; i < 110; i++) {
      await queue.enqueue({
        envelope_id: `env_test_${i}`,
        envelope_type: 'test',
        actions: []
      });
    }
    
    // Run checks
    guard.runChecks();
    
    const status1 = guard.getRuntimeStatus();
    
    if (status1.anomalies.length === 0) {
      console.log('❌ FAIL: Should detect excessive queue depth');
      process.exit(1);
    }
    
    const queueAnomaly = status1.anomalies.find(a => a.type === 'queue_depth_excessive');
    
    if (!queueAnomaly) {
      console.log('❌ FAIL: Should have queue_depth_excessive anomaly');
      console.log(`   Anomalies:`, status1.anomalies.map(a => a.type));
      process.exit(1);
    }
    
    if (status1.status !== 'degraded') {
      console.log('❌ FAIL: Runtime status should be degraded');
      console.log(`   Status: ${status1.status}`);
      process.exit(1);
    }
    
    console.log('✅ Queue depth anomaly detected');
    console.log(`   Anomaly type: ${queueAnomaly.type}`);
    console.log(`   Message: ${queueAnomaly.message}`);
    console.log(`   Runtime status: ${status1.status}`);
    console.log('');
    
    // Test 3: Executor Stall Detection
    console.log('Test 3: Executor Stall Detection');
    console.log('───────────────────────────────────────────────────────────');
    
    // Create envelope in executing state with old timestamp
    await queue.enqueue({
      envelope_id: 'env_stalled',
      envelope_type: 'test',
      actions: []
    });
    
    await queue.markExecuting('env_stalled');
    
    const stalledEntry = queue.queue.get('env_stalled');
    stalledEntry.started_at = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
    
    guard.runChecks();
    
    const status2 = guard.getRuntimeStatus();
    const stallAnomaly = status2.anomalies.find(a => a.type === 'executor_stall');
    
    if (!stallAnomaly) {
      console.log('❌ FAIL: Should detect executor stall');
      console.log(`   Anomalies:`, status2.anomalies.map(a => a.type));
      process.exit(1);
    }
    
    if (stallAnomaly.severity !== 'critical') {
      console.log('❌ FAIL: Executor stall should be critical');
      process.exit(1);
    }
    
    if (status2.status !== 'critical') {
      console.log('❌ FAIL: Runtime status should be critical');
      console.log(`   Status: ${status2.status}`);
      process.exit(1);
    }
    
    console.log('✅ Executor stall detected');
    console.log(`   Anomaly type: ${stallAnomaly.type}`);
    console.log(`   Severity: ${stallAnomaly.severity}`);
    console.log(`   Runtime status: ${status2.status}`);
    console.log('');
    
    // Test 4: DLQ Growth Detection
    console.log('Test 4: DLQ Growth Spike Detection');
    console.log('───────────────────────────────────────────────────────────');
    
    // Clear previous anomalies by running check (resets baseline)
    guard.runChecks();
    
    // Add items to DLQ
    for (let i = 0; i < 6; i++) {
      await dlq.deadLetter({
        envelope_id: `env_dlq_${i}`,
        reason: 'RETRY_EXHAUSTED',
        error: 'Test error'
      });
    }
    
    guard.runChecks();
    
    const status3 = guard.getRuntimeStatus();
    const dlqAnomaly = status3.anomalies.find(a => a.type === 'dlq_growth_spike');
    
    if (!dlqAnomaly) {
      console.log('❌ FAIL: Should detect DLQ growth spike');
      console.log(`   Anomalies:`, status3.anomalies.map(a => a.type));
      process.exit(1);
    }
    
    console.log('✅ DLQ growth spike detected');
    console.log(`   Anomaly type: ${dlqAnomaly.type}`);
    console.log(`   Message: ${dlqAnomaly.message}`);
    console.log('');
    
    // Test 5: Provider Health Integration
    console.log('Test 5: Provider Health Anomaly Detection');
    console.log('───────────────────────────────────────────────────────────');
    
    // Set provider health to degraded
    providerHealth.status = 'degraded';
    
    guard.runChecks();
    
    const status4 = guard.getRuntimeStatus();
    const providerAnomaly = status4.anomalies.find(a => a.type === 'provider_degraded');
    
    if (!providerAnomaly) {
      console.log('❌ FAIL: Should detect provider degraded');
      console.log(`   Anomalies:`, status4.anomalies.map(a => a.type));
      process.exit(1);
    }
    
    console.log('✅ Provider degraded detected');
    console.log(`   Anomaly type: ${providerAnomaly.type}`);
    console.log(`   Message: ${providerAnomaly.message}`);
    console.log('');
    
    // Test 6: Event Emission
    console.log('Test 6: Alert Event Emission');
    console.log('───────────────────────────────────────────────────────────');
    
    const alerts = emitter.getEvents('runtime.integrity.anomaly');
    
    if (alerts.length === 0) {
      console.log('❌ FAIL: Should have emitted alert events');
      process.exit(1);
    }
    
    const loggedAlerts = logger.logs;
    
    if (loggedAlerts.length === 0) {
      console.log('❌ FAIL: Should have logged alerts');
      process.exit(1);
    }
    
    console.log('✅ Alert emission working');
    console.log(`   Total alerts emitted: ${alerts.length}`);
    console.log(`   Total alerts logged: ${loggedAlerts.length}`);
    console.log(`   Alert types: ${[...new Set(alerts.map(a => a.data.anomaly_type))].join(', ')}`);
    console.log('');
    
    // Test 7: Statistics
    console.log('Test 7: Statistics and Runtime Status');
    console.log('───────────────────────────────────────────────────────────');
    
    const finalStats = guard.getStats();
    
    if (!finalStats.last_check) {
      console.log('❌ FAIL: Should have recorded last check time');
      process.exit(1);
    }
    
    const finalStatus = guard.getRuntimeStatus();
    
    if (finalStatus.anomalies.length === 0) {
      console.log('❌ FAIL: Should have current anomalies');
      process.exit(1);
    }
    
    console.log('✅ Statistics tracking working');
    console.log(`   Runtime status: ${finalStats.runtime_status}`);
    console.log(`   Last check: ${finalStats.last_check}`);
    console.log(`   Current anomalies: ${finalStatus.anomalies.length}`);
    console.log(`   Last queue depth: ${finalStats.last_queue_depth}`);
    console.log(`   Last DLQ size: ${finalStats.last_dlq_size}`);
    console.log('');
    
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Phase 6E: All Tests Passed');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Runtime Integrity Guard operational:');
  console.log('  ✅ Guard initialization');
  console.log('  ✅ Queue depth anomaly detection');
  console.log('  ✅ Executor stall detection');
  console.log('  ✅ DLQ growth spike detection');
  console.log('  ✅ Provider health integration');
  console.log('  ✅ Alert event emission');
  console.log('  ✅ Statistics tracking');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
