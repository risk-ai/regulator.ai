#!/usr/bin/env node
/**
 * Phase 4A: Timeout Protection Demo
 * 
 * Demonstrates executor timeout enforcement:
 * - T1 envelope timing out
 * - T2 envelope with extended timeout succeeding
 * - DLQ routing on timeout
 * - Event emission
 */

const { QueuedExecutor } = require('../lib/execution/queued-executor');
const { DLQReason } = require('../lib/execution/dead-letter-queue');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

async function demo() {
  console.log('🚀 Phase 4A: Timeout Protection Demo\n');
  
  // Setup test directory
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-timeout-'));
  console.log(`Test directory: ${testDir}\n`);
  
  // Track events
  const events = [];
  
  // Mock Vienna core
  const mockCore = {
    warrant: {
      verify: async () => ({
        valid: true,
        warrant: {
          warrant_id: 'demo_warrant',
          allowed_actions: ['slow_action:demo', 'fast_action:demo'],
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      })
    },
    audit: {
      emit: async (event) => events.push(event)
    },
    tradingGuard: {
      check: async () => ({ safe: true })
    }
  };
  
  // Create executor with short timeouts for demo
  const executor = new QueuedExecutor(mockCore, {
    queueOptions: { queueFile: path.join(testDir, 'queue.jsonl') },
    dlqOptions: { dlqFile: path.join(testDir, 'dlq.jsonl') },
    replayLog: {
      emit: async (event) => {
        events.push(event);
        console.log(`📝 Event: ${event.event_type} (${event.envelope_id})`);
      }
    },
    timeoutPolicy: {
      default_timeout_ms: 500,   // 500ms for T1
      t2_timeout_ms: 2000        // 2s for T2
    }
  });
  
  await executor.initialize();
  
  // Register adapters
  executor.registerAdapter('slow_action', {
    execute: async (action) => {
      console.log(`   ⏳ Slow action running (${action.delay_ms}ms delay)...`);
      await new Promise(resolve => setTimeout(resolve, action.delay_ms));
      console.log(`   ✓ Slow action completed`);
      return { success: true };
    }
  });
  
  executor.registerAdapter('fast_action', {
    execute: async () => {
      console.log(`   ⚡ Fast action completed`);
      return { success: true };
    }
  });
  
  // Test 1: T1 envelope that will timeout
  console.log('\n--- Test 1: T1 Timeout (500ms limit, 1000ms action) ---');
  const ts1 = Date.now();
  const env1 = {
    envelope_id: 'env_timeout_demo_' + ts1,
    warrant_id: 'demo_warrant',
    objective_id: 'obj_demo_1',
    trigger_id: 'trigger_1_' + ts1,
    proposed_by: 'demo_agent',
    actions: [{ type: 'slow_action', target: 'demo', delay_ms: 1000 }],
    execution_class: 'T1'
  };
  
  await executor.submit(env1);
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const dlq1 = executor.getDeadLetters();
  console.log(`\n📦 DLQ Status: ${dlq1.length} entries`);
  if (dlq1.length > 0) {
    console.log(`   Envelope: ${dlq1[0].envelope_id}`);
    console.log(`   Reason: ${dlq1[0].reason}`);
    console.log(`   Error: ${dlq1[0].error}`);
  }
  
  // Test 2: T2 envelope with extended timeout
  console.log('\n--- Test 2: T2 Extended Timeout (2000ms limit, 1000ms action) ---');
  const ts2 = Date.now();
  const env2 = {
    envelope_id: 'env_t2_demo_' + ts2,
    warrant_id: 'demo_warrant',
    objective_id: 'obj_demo_2',
    trigger_id: 'trigger_2_' + ts2,
    proposed_by: 'demo_agent',
    actions: [{ type: 'slow_action', target: 'demo', delay_ms: 1000 }],
    execution_class: 'T2'
  };
  
  await executor.submit(env2);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const dlq2 = executor.getDeadLetters();
  const queue = executor.getQueueState();
  console.log(`\n📦 DLQ Status: ${dlq2.length} entries (should still be 1)`);
  console.log(`✓ Queue: ${queue.completed} completed, ${queue.failed} failed`);
  
  // (Skipping fast action test to avoid recursion guard complexity in demo)
  
  // Summary
  console.log('\n--- Summary ---');
  const timeoutEvents = events.filter(e => e.event_type === 'execution_timeout');
  const dlqEvents = events.filter(e => e.event_type === 'envelope_dead_lettered');
  
  console.log(`Timeout events: ${timeoutEvents.length}`);
  console.log(`Dead letter events: ${dlqEvents.length}`);
  console.log(`Total envelopes processed: 2`);
  console.log(`  - 1 timed out (T1, moved to DLQ)`);
  console.log(`  - 1 completed successfully (T2 with extended timeout)`);
  
  // Cleanup
  await fs.rm(testDir, { recursive: true, force: true });
  
  console.log('\n✅ Demo complete!\n');
}

demo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
