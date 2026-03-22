#!/usr/bin/env node
/**
 * Phase 4: Simple Reliability Demo
 * 
 * Demonstrates core Phase 4 features with minimal dependencies
 */

const { RetryPolicy } = require('../lib/execution/retry-policy');
const { ExecutionMetrics } = require('../lib/execution/execution-metrics');
const { ExecutionQueue, BackpressureError } = require('../lib/execution/execution-queue');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function main() {
  console.log('=== Phase 4: Execution Reliability Demo ===\n');
  
  // Demo 1: Retry Policy with Exponential Backoff
  console.log('--- Demo 1: Retry Policy ---');
  
  const retryPolicy = new RetryPolicy({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2
  });
  
  console.log('  Retry schedule:', retryPolicy.getRetrySchedule());
  console.log('  Config:', retryPolicy.getConfig());
  
  // Simulate transient failure
  const transientError = new Error('Network timeout');
  const retryDecision = retryPolicy.shouldRetry({}, transientError, 1);
  
  console.log(`  Transient failure decision:`, retryDecision);
  console.log(`  ✓ Will retry with ${retryDecision.delayMs}ms delay\n`);
  
  // Demo 2: Execution Metrics
  console.log('--- Demo 2: Execution Time Metrics ---');
  
  const metrics = new ExecutionMetrics();
  
  // Simulate 10 executions with known durations
  const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  
  for (let i = 0; i < durations.length; i++) {
    const tracking = metrics.recordStart(`env_${i}`, 'obj_001', 10000);
    tracking.startTime = Date.now() - durations[i];
    metrics.recordComplete(tracking, 'success');
  }
  
  // Simulate 2 timeouts
  for (let i = 0; i < 2; i++) {
    const tracking = metrics.recordStart(`env_timeout_${i}`, 'obj_001', 1000);
    tracking.startTime = Date.now() - 1100;
    metrics.recordComplete(tracking, 'timeout');
  }
  
  const globalMetrics = metrics.getGlobalMetrics();
  
  console.log(`  Total executions: ${globalMetrics.totalExecutions}`);
  console.log(`  Success: ${globalMetrics.totalSuccess}, Timeouts: ${globalMetrics.totalTimeouts}`);
  console.log(`  Success rate: ${(globalMetrics.successRate * 100).toFixed(1)}%`);
  console.log(`  Timeout rate: ${(globalMetrics.timeoutRate * 100).toFixed(1)}%`);
  console.log(`  Latency:`);
  console.log(`    Mean: ${Math.round(globalMetrics.latency.mean)}ms`);
  console.log(`    P50:  ${Math.round(globalMetrics.latency.p50)}ms`);
  console.log(`    P95:  ${Math.round(globalMetrics.latency.p95)}ms`);
  console.log(`    P99:  ${Math.round(globalMetrics.latency.p99)}ms`);
  
  if (globalMetrics.alerts.length > 0) {
    console.log(`  Alerts:`);
    globalMetrics.alerts.forEach(alert => {
      console.log(`    - ${alert.type}: ${alert.message}`);
    });
  }
  
  console.log(`  ✓ Metrics collected\n`);
  
  // Demo 3: Queue Backpressure
  console.log('--- Demo 3: Queue Backpressure ---');
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vienna-queue-demo-'));
  
  const queue = new ExecutionQueue({
    queueFile: path.join(tempDir, 'queue.jsonl'),
    maxQueueSize: 5
  });
  
  await queue.initialize();
  
  // Fill queue
  for (let i = 0; i < 5; i++) {
    await queue.enqueue({
      envelope_id: `env_${i}`,
      envelope_type: 'test',
      actions: []
    });
  }
  
  console.log(`  Queue stats:`, queue.getStats());
  
  // Try to exceed limit
  try {
    await queue.enqueue({
      envelope_id: 'env_overflow',
      envelope_type: 'test',
      actions: []
    });
    console.log(`  ✗ Backpressure not triggered (unexpected)`);
  } catch (error) {
    if (error.code === 'QUEUE_BACKPRESSURE') {
      console.log(`  ✓ Backpressure triggered: Queue full (${error.queueSize}/${error.maxSize})`);
    } else {
      console.log(`  ✗ Unexpected error: ${error.message}`);
    }
  }
  
  console.log('');
  
  // Demo 4: Execution Deduplication
  console.log('--- Demo 4: Execution Deduplication ---');
  
  // Clear queue from previous demo
  await queue.clearCompleted();
  for (let i = 0; i < 5; i++) {
    await queue.remove(`env_${i}`);
  }
  
  const envelope1 = {
    envelope_id: 'env_dup',
    envelope_type: 'test',
    actions: []
  };
  
  // First submission
  await queue.enqueue(envelope1);
  console.log(`  First submission: queued`);
  
  // Mark as completed
  await queue.markExecuting('env_dup');
  await queue.markCompleted('env_dup', { status: 'success', result: 'test_data' });
  console.log(`  Execution completed`);
  
  // Check cached result
  const cachedResult = queue.getCachedResult('env_dup');
  console.log(`  Cached result:`, cachedResult);
  console.log(`  ✓ Result cached for idempotency\n`);
  
  // Check execution attempts
  const attempts = queue.getExecutionAttempts('env_dup');
  console.log(`  Execution attempts: ${attempts.length}`);
  attempts.forEach(attempt => {
    console.log(`    - ${attempt.event} at ${new Date(attempt.timestamp).toISOString()}`);
  });
  console.log('');
  
  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
  
  // Summary
  console.log('--- Summary ---');
  console.log('Phase 4 Components Demonstrated:');
  console.log('  ✓ RetryPolicy - Exponential backoff (1s, 2s, 4s, ...)');
  console.log('  ✓ ExecutionMetrics - Latency percentiles, timeout rate, alerts');
  console.log('  ✓ ExecutionQueue - Backpressure protection (max 5 envelopes)');
  console.log('  ✓ Idempotent Execution - Result caching, attempt tracking');
  console.log('');
  console.log('Full integration available in QueuedExecutor');
  console.log('');
  console.log('✅ Phase 4 Implementation Complete');
}

main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
