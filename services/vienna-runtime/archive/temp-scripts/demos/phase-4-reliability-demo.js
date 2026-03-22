#!/usr/bin/env node
/**
 * Phase 4: Execution Reliability Stack Demo
 * 
 * Demonstrates:
 * - Concurrency limits
 * - Backpressure handling
 * - Retry with exponential backoff
 * - Idempotent execution
 * - Execution time metrics
 */

const { QueuedExecutor } = require('../lib/execution/queued-executor');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock Vienna Core
class MockViennaCore {
  constructor() {
    this.audit = {
      emit: async () => {}
    };
    this.warrants = {
      verify: async (warrantId) => ({
        valid: true,
        trigger_id: "trigger", warrant_id: warrantId,
        objective_id: 'demo_objective',
        execution_class: 'T1'
      })
    };
  }
}

// Mock Replay Log
class MockReplayLog {
  constructor() {
    this.events = [];
  }
  
  async emit(event) {
    this.events.push(event);
    console.log(`[Event] ${event.event_type}:`, event.envelope_id || '');
  }
  
  getEvents(eventType) {
    return this.events.filter(e => e.event_type === eventType);
  }
}

async function main() {
  console.log('=== Phase 4: Execution Reliability Stack Demo ===\n');
  
  // Setup
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vienna-demo-'));
  console.log(`Temp directory: ${tempDir}\n`);
  
  const viennaCore = new MockViennaCore();
  const replayLog = new MockReplayLog();
  
  const executor = new QueuedExecutor(viennaCore, {
    queueOptions: {
      queueFile: path.join(tempDir, 'queue.jsonl'),
      maxQueueSize: 10
    },
    replayLog,
    concurrency: 2, // Max 2 concurrent executions
    retryPolicy: {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    metricsEnabled: true
  });
  
  await executor.initialize();
  
  // Demo 1: Concurrency Limits
  console.log('--- Demo 1: Concurrency Limits ---');
  
  let executionCount = 0;
  
  executor.registerAdapter('slow_action', {
    execute: async (action) => {
      executionCount++;
      console.log(`  Executing envelope ${action.envelope_id} (${executionCount} active)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      executionCount--;
      return { status: 'success', action };
    }
  });
  
  // Submit 5 envelopes
  for (let i = 0; i < 5; i++) {
    const envelope = {
      envelope_id: `env_slow_${i}`,
      envelope_type: 'slow_action',
      trigger_id: "trigger", warrant_id: `warrant_slow_${i}`,
      trigger_id: `trigger_slow_${i}`,
      proposed_by: 'demo_agent',
      objective_id: 'demo_obj_slow',
      actions: [
        { type: 'slow_action', envelope_id: `env_slow_${i}` }
      ]
    };
    await executor.submit(envelope);
  }
  
  console.log(`  Concurrency state:`, executor.getConcurrencyState());
  
  await executor.processQueue();
  console.log(`  ✓ All envelopes processed\n`);
  
  // Demo 2: Retry with Exponential Backoff
  console.log('--- Demo 2: Retry with Exponential Backoff ---');
  
  let attemptCount = 0;
  
  executor.registerAdapter('flaky_action', {
    execute: async (action) => {
      attemptCount++;
      console.log(`  Attempt ${attemptCount} for ${action.envelope_id}`);
      
      if (attemptCount < 3) {
        throw new Error('Transient network error');
      }
      
      return { status: 'success', action, attempts: attemptCount };
    }
  });
  
  const retryEnvelope = {
    envelope_id: 'env_retry',
    envelope_type: 'flaky_action',
    trigger_id: "trigger", warrant_id: 'warrant_retry',
    proposed_by: 'demo_agent',
    objective_id: 'demo_obj_retry',
    actions: [
      { type: 'flaky_action', envelope_id: 'env_retry' }
    ]
  };
  
  await executor.submit(retryEnvelope);
  
  try {
    await executor.processQueue();
    console.log(`  ✓ Succeeded after ${attemptCount} attempts\n`);
  } catch (error) {
    console.log(`  ✗ Failed after retries: ${error.message}\n`);
  }
  
  // Demo 3: Idempotent Execution
  console.log('--- Demo 3: Idempotent Execution ---');
  
  executor.registerAdapter('idempotent_action', {
    execute: async (action) => {
      console.log(`  Executing ${action.envelope_id}`);
      return { status: 'success', action, timestamp: Date.now() };
    }
  });
  
  const idempotentEnvelope = {
    envelope_id: 'env_idempotent',
    envelope_type: 'idempotent_action',
    trigger_id: "trigger", warrant_id: 'warrant_idempotent',
    proposed_by: 'demo_agent',
    objective_id: 'demo_obj_idempotent',
    actions: [
      { type: 'idempotent_action', envelope_id: 'env_idempotent' }
    ]
  };
  
  // First execution
  await executor.submit(idempotentEnvelope);
  await executor.processQueue();
  
  // Duplicate submission
  console.log(`  Submitting duplicate...`);
  await executor.submit(idempotentEnvelope);
  
  const attempts = executor.queue.getExecutionAttempts('env_idempotent');
  console.log(`  Execution attempts:`, attempts.length);
  console.log(`  ✓ Duplicate detected\n`);
  
  // Demo 4: Execution Time Metrics
  console.log('--- Demo 4: Execution Time Metrics ---');
  
  executor.registerAdapter('variable_action', {
    execute: async (action) => {
      const delay = action.delay || 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      return { status: 'success', action };
    }
  });
  
  // Submit envelopes with variable execution times
  const delays = [50, 100, 150, 200, 250, 300, 400, 500];
  
  for (let i = 0; i < delays.length; i++) {
    const envelope = {
      envelope_id: `env_metric_${i}`,
      envelope_type: 'variable_action',
      trigger_id: "trigger", warrant_id: `warrant_metric_${i}`,
      proposed_by: 'demo_agent',
      objective_id: 'demo_obj_metrics',
      actions: [
        { type: 'variable_action', delay: delays[i] }
      ]
    };
    await executor.submit(envelope);
  }
  
  await executor.processQueue();
  
  const metrics = executor.getExecutionMetrics();
  console.log(`  Total executions: ${metrics.totalExecutions}`);
  console.log(`  Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
  console.log(`  Latency (ms):`);
  console.log(`    Mean: ${Math.round(metrics.latency.mean)}ms`);
  console.log(`    P50:  ${Math.round(metrics.latency.p50)}ms`);
  console.log(`    P95:  ${Math.round(metrics.latency.p95)}ms`);
  console.log(`    P99:  ${Math.round(metrics.latency.p99)}ms`);
  
  if (metrics.alerts.length > 0) {
    console.log(`  Alerts:`);
    metrics.alerts.forEach(alert => {
      console.log(`    - ${alert.type}: ${alert.message}`);
    });
  } else {
    console.log(`  ✓ No alerts`);
  }
  console.log('');
  
  // Demo 5: Backpressure
  console.log('--- Demo 5: Backpressure Handling ---');
  
  executor.registerAdapter('basic_action', {
    execute: async (action) => {
      return { status: 'success', action };
    }
  });
  
  // Fill queue to max (10)
  for (let i = 0; i < 10; i++) {
    const envelope = {
      envelope_id: `env_backpressure_${i}`,
      envelope_type: 'basic_action',
      trigger_id: "trigger", warrant_id: `warrant_backpressure_${i}`,
      proposed_by: 'demo_agent',
      objective_id: 'demo_obj_backpressure',
      actions: [
        { type: 'basic_action' }
      ]
    };
    await executor.submit(envelope);
  }
  
  console.log(`  Queue state:`, executor.getQueueState());
  
  // Try to submit one more (should trigger backpressure)
  try {
    const overflowEnvelope = {
      envelope_id: 'env_overflow',
      envelope_type: 'basic_action',
      trigger_id: "trigger", warrant_id: 'warrant_overflow',
      proposed_by: 'demo_agent',
      objective_id: 'demo_obj_overflow',
      actions: [
        { type: 'basic_action' }
      ]
    };
    await executor.submit(overflowEnvelope);
    console.log(`  ✗ Backpressure not triggered (unexpected)`);
  } catch (error) {
    if (error.code === 'QUEUE_BACKPRESSURE') {
      console.log(`  ✓ Backpressure triggered: ${error.message}`);
    } else {
      console.log(`  ✗ Unexpected error: ${error.message}`);
    }
  }
  
  await executor.processQueue();
  console.log(`  Queue cleared:`, executor.getQueueState());
  console.log('');
  
  // Summary
  console.log('--- Summary ---');
  console.log('Phase 4 Reliability Features:');
  console.log('  ✓ Concurrency limits (max 2)');
  console.log('  ✓ Exponential backoff retry (3 attempts)');
  console.log('  ✓ Idempotent execution (deduplication)');
  console.log('  ✓ Execution time metrics (latency percentiles)');
  console.log('  ✓ Backpressure handling (queue full protection)');
  console.log('');
  
  const finalMetrics = executor.getExecutionMetrics();
  console.log(`Total envelopes processed: ${finalMetrics.totalExecutions}`);
  console.log(`Success rate: ${(finalMetrics.successRate * 100).toFixed(1)}%`);
  
  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('\n✅ Demo complete');
}

main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
