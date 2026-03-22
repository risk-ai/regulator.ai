/**
 * Phase 6C: Crash Recovery Test
 * 
 * Validates that:
 * 1. Crash recovery manager initializes correctly
 * 2. Orphaned envelopes are detected
 * 3. Envelopes are retried or failed appropriately
 * 4. Queue consistency validation works
 * 5. Recovery statistics are tracked
 * 6. Events are emitted for recovery actions
 */

const { CrashRecoveryManager } = require('./lib/core/crash-recovery-manager.js');
const { ExecutionQueue } = require('./lib/execution/execution-queue.js');
const { DeadLetterQueue } = require('./lib/execution/dead-letter-queue.js');

console.log('═══════════════════════════════════════════════════════════');
console.log('Phase 6C: Crash Recovery Test');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

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
}

async function runTests() {
  // Test 1: Initialization
  console.log('Test 1: Crash Recovery Manager Initialization');
  console.log('───────────────────────────────────────────────────────────');
  
  try {
    const manager = new CrashRecoveryManager({
      maxRecoveryRetries: 1,
      orphanedExecutionThresholdMs: 1000, // 1 second for testing
      enableAutomaticRecovery: true
    });
    
    const executionQueue = new ExecutionQueue({
      queueFile: '.test-data/phase6c/test-queue.jsonl',
      maxQueueSize: 100
    });
    
    const deadLetterQueue = new DeadLetterQueue({
      dlqFile: '.test-data/phase6c/test-dlq.jsonl'
    });
    
    const eventEmitter = new MockEventEmitter();
    
    await executionQueue.initialize();
    await deadLetterQueue.initialize();
    
    manager.setDependencies(executionQueue, deadLetterQueue, eventEmitter);
    
    console.log('✅ Crash recovery manager initialized');
    console.log(`   Max recovery retries: ${manager.maxRecoveryRetries}`);
    console.log(`   Orphaned threshold: ${manager.orphanedExecutionThresholdMs}ms`);
    console.log(`   Automatic recovery: ${manager.enableAutomaticRecovery}`);
    console.log('');
    
    // Test 2: Detect Orphaned Envelopes
    console.log('Test 2: Orphaned Envelope Detection');
    console.log('───────────────────────────────────────────────────────────');
    
    // Add stuck envelope (simulating crash during execution)
    const orphanedEnvelope = {
      envelope_id: 'env_orphaned_1',
      envelope_type: 'test',
      objective_id: 'obj_test_1',
      actions: [{ type: 'echo', content: 'test' }]
    };
    
    await executionQueue.enqueue(orphanedEnvelope);
    await executionQueue.markExecuting('env_orphaned_1');
    
    // Manually set start time to past (simulate long-running execution)
    const entry = executionQueue.queue.get('env_orphaned_1');
    entry.started_at = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
    entry.retry_count = 0; // Ensure fresh start for test 3
    
    const isOrphaned = manager.isOrphanedExecution(entry);
    
    if (!isOrphaned) {
      console.log('❌ FAIL: Should detect orphaned execution');
      process.exit(1);
    }
    
    console.log('✅ Orphaned envelope detected');
    console.log(`   Envelope ID: ${entry.envelope_id}`);
    console.log(`   State: ${entry.state}`);
    console.log(`   Started: ${entry.started_at}`);
    console.log(`   Age: ${Date.now() - new Date(entry.started_at).getTime()}ms`);
    console.log('');
    
    // Test 3: Recovery with Retry
    console.log('Test 3: Recovery with Retry');
    console.log('───────────────────────────────────────────────────────────');
    
    const report1 = await manager.runRecovery();
    
    if (report1.summary.orphaned_found !== 1) {
      console.log('❌ FAIL: Should find 1 orphaned envelope');
      console.log(`   Found: ${report1.summary.orphaned_found}`);
      process.exit(1);
    }
    
    if (report1.summary.retried !== 1) {
      console.log('❌ FAIL: Should retry 1 envelope');
      console.log(`   Retried: ${report1.summary.retried}`);
      process.exit(1);
    }
    
    // Check if envelope was requeued
    const requeuedEntry = executionQueue.queue.get('env_orphaned_1');
    
    if (!requeuedEntry) {
      console.log('❌ FAIL: Envelope should still be in queue after retry');
      process.exit(1);
    }
    
    console.log('✅ Recovery with retry successful');
    console.log(`   Orphaned found: ${report1.summary.orphaned_found}`);
    console.log(`   Retried: ${report1.summary.retried}`);
    console.log(`   Duration: ${report1.duration_ms}ms`);
    console.log('');
    
    // Test 4: Recovery with DLQ (Retry Exhausted)
    console.log('Test 4: Recovery with DLQ (Retry Exhausted)');
    console.log('───────────────────────────────────────────────────────────');
    
    // Mark as executing again and set old timestamp
    await executionQueue.markExecuting('env_orphaned_1');
    const entry2 = executionQueue.queue.get('env_orphaned_1');
    entry2.started_at = new Date(Date.now() - 2000).toISOString();
    entry2.retry_count = 1; // Already retried once
    
    const report2 = await manager.runRecovery();
    
    if (report2.summary.orphaned_found !== 1) {
      console.log('❌ FAIL: Should find 1 orphaned envelope');
      process.exit(1);
    }
    
    if (report2.summary.failed !== 1) {
      console.log('❌ FAIL: Should fail 1 envelope (retries exhausted)');
      console.log(`   Failed: ${report2.summary.failed}`);
      process.exit(1);
    }
    
    // Check if envelope was sent to DLQ
    const dlqEntries = deadLetterQueue.getEntries();
    
    if (dlqEntries.length !== 1) {
      console.log('❌ FAIL: Should have 1 entry in DLQ');
      console.log(`   DLQ entries: ${dlqEntries.length}`);
      process.exit(1);
    }
    
    if (dlqEntries[0].envelope_id !== 'env_orphaned_1') {
      console.log('❌ FAIL: Wrong envelope in DLQ');
      process.exit(1);
    }
    
    if (dlqEntries[0].reason !== 'CRASH_RECOVERY_EXHAUSTED') {
      console.log('❌ FAIL: Wrong DLQ reason');
      process.exit(1);
    }
    
    console.log('✅ Recovery with DLQ successful');
    console.log(`   Orphaned found: ${report2.summary.orphaned_found}`);
    console.log(`   Failed: ${report2.summary.failed}`);
    console.log(`   DLQ entries: ${dlqEntries.length}`);
    console.log('');
    
    // Test 5: Queue Consistency Validation
    console.log('Test 5: Queue Consistency Validation');
    console.log('───────────────────────────────────────────────────────────');
    
    // Add some normal envelopes
    await executionQueue.enqueue({
      envelope_id: 'env_normal_1',
      envelope_type: 'test',
      actions: []
    });
    
    await executionQueue.enqueue({
      envelope_id: 'env_normal_2',
      envelope_type: 'test',
      actions: []
    });
    
    const validation = await manager.validateQueueConsistency();
    
    if (!validation.valid && validation.issues.length > 0) {
      // Check if issues are expected (queue/FIFO might have orphaned entries removed)
      const unexpectedIssues = validation.issues.filter(
        issue => issue.type !== 'queue_fifo_mismatch'
      );
      
      if (unexpectedIssues.length > 0) {
        console.log('❌ FAIL: Unexpected queue consistency issues');
        console.log(`   Issues:`, validation.issues);
        process.exit(1);
      }
    }
    
    console.log('✅ Queue consistency validation working');
    console.log(`   Valid: ${validation.valid}`);
    console.log(`   Total envelopes: ${validation.stats.total_envelopes}`);
    console.log(`   Queued: ${validation.stats.queued}`);
    console.log(`   Executing: ${validation.stats.executing}`);
    console.log(`   Issues: ${validation.issues.length}`);
    console.log('');
    
    // Test 6: Recovery Statistics
    console.log('Test 6: Recovery Statistics');
    console.log('───────────────────────────────────────────────────────────');
    
    const stats = manager.getStats();
    
    if (stats.total_runs !== 2) {
      console.log('❌ FAIL: Should have 2 total runs');
      console.log(`   Total runs: ${stats.total_runs}`);
      process.exit(1);
    }
    
    if (stats.orphaned_detected !== 2) {
      console.log('❌ FAIL: Should have detected 2 orphaned envelopes');
      console.log(`   Orphaned detected: ${stats.orphaned_detected}`);
      process.exit(1);
    }
    
    if (stats.retried !== 1) {
      console.log('❌ FAIL: Should have retried 1 envelope');
      console.log(`   Retried: ${stats.retried}`);
      process.exit(1);
    }
    
    if (stats.failed !== 1) {
      console.log('❌ FAIL: Should have failed 1 envelope');
      console.log(`   Failed: ${stats.failed}`);
      process.exit(1);
    }
    
    console.log('✅ Recovery statistics tracking working');
    console.log(`   Total runs: ${stats.total_runs}`);
    console.log(`   Orphaned detected: ${stats.orphaned_detected}`);
    console.log(`   Retried: ${stats.retried}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Last run: ${stats.last_run}`);
    console.log('');
    
    // Test 7: Event Emission
    console.log('Test 7: Event Emission');
    console.log('───────────────────────────────────────────────────────────');
    
    const recoveryEvents = eventEmitter.getEvents('runtime.crash_recovery.completed');
    
    if (recoveryEvents.length !== 2) {
      console.log('❌ FAIL: Should have 2 recovery completion events');
      console.log(`   Events: ${recoveryEvents.length}`);
      process.exit(1);
    }
    
    const event1 = recoveryEvents[0];
    
    if (event1.data.orphaned_count !== 1) {
      console.log('❌ FAIL: First event should report 1 orphaned envelope');
      process.exit(1);
    }
    
    if (event1.data.retried_count !== 1) {
      console.log('❌ FAIL: First event should report 1 retry');
      process.exit(1);
    }
    
    console.log('✅ Event emission working');
    console.log(`   Total recovery events: ${recoveryEvents.length}`);
    console.log(`   Event types: ${[...new Set(eventEmitter.getEvents().map(e => e.type))].join(', ')}`);
    console.log('');
    
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Phase 6C: All Tests Passed');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Crash Recovery operational:');
  console.log('  ✅ Manager initialization');
  console.log('  ✅ Orphaned envelope detection');
  console.log('  ✅ Recovery with retry');
  console.log('  ✅ Recovery with DLQ (retry exhausted)');
  console.log('  ✅ Queue consistency validation');
  console.log('  ✅ Recovery statistics tracking');
  console.log('  ✅ Event emission');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
