/**
 * Phase 7.4 Stage 3 Tests: Dead Letter Queue
 * 
 * Validates:
 * - Permanent failure routing to DLQ
 * - Retry exhaustion routing to DLQ
 * - Transient failure stays in queue
 * - DLQ restart durability
 * - Explicit requeue
 * - Explicit cancel
 */

const { DeadLetterQueue, DLQState, DLQReason } = require('../lib/execution/dead-letter-queue');
const { QueuedExecutor } = require('../lib/execution/queued-executor');
const { ReplayLog } = require('../lib/execution/replay-log');
const { FailureClassifier } = require('../lib/execution/failure-classifier');
const fs = require('fs');
const path = require('path');

describe('Phase 7.4 Stage 3: Dead Letter Queue', () => {
  
  describe('DeadLetterQueue (standalone)', () => {
    let dlqFile;
    let dlq;
    
    beforeEach(async () => {
      dlqFile = path.join(__dirname, '../.test-data/dlq-test/dlq.jsonl');
      const dlqDir = path.dirname(dlqFile);
      
      if (fs.existsSync(dlqDir)) {
        fs.rmSync(dlqDir, { recursive: true });
      }
      
      dlq = new DeadLetterQueue({ dlqFile });
      await dlq.initialize();
    });
    
    afterEach(() => {
      const dlqDir = path.dirname(dlqFile);
      if (fs.existsSync(dlqDir)) {
        fs.rmSync(dlqDir, { recursive: true });
      }
    });
    
    test('deadLetter creates entry', async () => {
      const entry = await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        agent_id: 'agent_a',
        reason: DLQReason.PERMANENT_FAILURE,
        error: 'permission denied',
        retry_count: 0,
        last_state: 'failed'
      });
      
      expect(entry.envelope_id).toBe('env_001');
      expect(entry.reason).toBe(DLQReason.PERMANENT_FAILURE);
      expect(entry.state).toBe(DLQState.DEAD_LETTERED);
      expect(entry.dead_lettered_at).toBeTruthy();
    });
    
    test('deadLetter requires envelope_id', async () => {
      await expect(dlq.deadLetter({
        reason: DLQReason.PERMANENT_FAILURE
      })).rejects.toThrow('envelope_id required');
    });
    
    test('deadLetter requires valid reason', async () => {
      await expect(dlq.deadLetter({
        envelope_id: 'env_001',
        reason: 'INVALID_REASON'
      })).rejects.toThrow('Invalid dead letter reason');
    });
    
    test('getEntry returns entry', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      const entry = dlq.getEntry('env_001');
      expect(entry).toBeTruthy();
      expect(entry.envelope_id).toBe('env_001');
    });
    
    test('getEntries returns all entries', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        reason: DLQReason.RETRY_EXHAUSTED
      });
      
      const entries = dlq.getEntries();
      expect(entries.length).toBe(2);
    });
    
    test('getEntries filters by state', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        reason: DLQReason.RETRY_EXHAUSTED
      });
      
      await dlq.cancel('env_001');
      
      const active = dlq.getEntries({ state: DLQState.DEAD_LETTERED });
      const cancelled = dlq.getEntries({ state: DLQState.CANCELLED });
      
      expect(active.length).toBe(1);
      expect(active[0].envelope_id).toBe('env_002');
      expect(cancelled.length).toBe(1);
      expect(cancelled[0].envelope_id).toBe('env_001');
    });
    
    test('requeue updates state', async () => {
      const env = {
        envelope_id: 'env_001',
        actions: []
      };
      
      await dlq.deadLetter({
        envelope_id: 'env_001',
        envelope: env,
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      const result = await dlq.requeue('env_001');
      
      expect(result.entry.state).toBe(DLQState.REQUEUED);
      expect(result.entry.requeued_at).toBeTruthy();
      expect(result.envelope).toEqual(env);
    });
    
    test('requeue fails if not dead_lettered', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.cancel('env_001');
      
      await expect(dlq.requeue('env_001')).rejects.toThrow('not in dead_lettered state');
    });
    
    test('cancel updates state', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      const result = await dlq.cancel('env_001');
      
      expect(result.state).toBe(DLQState.CANCELLED);
      expect(result.cancelled_at).toBeTruthy();
    });
    
    test('cancel is idempotent', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.cancel('env_001');
      const result = await dlq.cancel('env_001');
      
      expect(result.state).toBe(DLQState.CANCELLED);
    });
    
    test('entries persist across restart', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        reason: DLQReason.RETRY_EXHAUSTED
      });
      
      await dlq.cancel('env_001');
      
      // Simulate restart
      const dlq2 = new DeadLetterQueue({ dlqFile });
      await dlq2.initialize();
      
      const entries = dlq2.getEntries();
      expect(entries.length).toBe(2);
      
      const env001 = dlq2.getEntry('env_001');
      expect(env001.state).toBe(DLQState.CANCELLED);
      
      const env002 = dlq2.getEntry('env_002');
      expect(env002.state).toBe(DLQState.DEAD_LETTERED);
    });
    
    test('getStats returns counts', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        reason: DLQReason.PERMANENT_FAILURE
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        reason: DLQReason.RETRY_EXHAUSTED
      });
      
      await dlq.cancel('env_001');
      
      const stats = dlq.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.by_state[DLQState.DEAD_LETTERED]).toBe(1);
      expect(stats.by_state[DLQState.CANCELLED]).toBe(1);
      expect(stats.by_reason[DLQReason.PERMANENT_FAILURE]).toBe(1);
      expect(stats.by_reason[DLQReason.RETRY_EXHAUSTED]).toBe(1);
    });
  });
  
  describe('FailureClassifier', () => {
    let classifier;
    
    beforeEach(() => {
      classifier = new FailureClassifier();
    });
    
    test('classifies permanent failure', () => {
      const error = new Error('permission denied');
      const result = classifier.classify(error);
      
      expect(result.category).toBe('permanent');
      expect(result.retryable).toBe(false);
    });
    
    test('classifies transient failure', () => {
      const error = new Error('network timeout');
      const result = classifier.classify(error);
      
      expect(result.category).toBe('transient');
      expect(result.retryable).toBe(true);
    });
    
    test('defaults unknown to permanent', () => {
      const error = new Error('mysterious failure');
      const result = classifier.classify(error);
      
      expect(result.category).toBe('permanent');
      expect(result.retryable).toBe(false);
    });
  });
  
  describe('QueuedExecutor integration', () => {
    let testDir;
    let executor;
    let replayLog;
    
    beforeAll(async () => {
      // Clean up entire test data directory before suite
      const parentDir = path.join(__dirname, '../.test-data/phase7_4_stage3');
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true });
      }
    });
    
    beforeEach(async () => {
      // Use unique directory for each test
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      testDir = path.join(__dirname, '../.test-data/phase7_4_stage3', testId);
      
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
      
      replayLog = new ReplayLog({
        logDir: path.join(testDir, 'replay')
      });
      
      await replayLog.initialize();
      
      const mockCore = {
        warrant: {
          issue: async (options) => ({
            warrant_id: `wrt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            truth_snapshot_id: options.truthSnapshotId || 'truth_001',
            plan_id: options.planId || 'plan_001',
            objective: options.objective,
            allowed_actions: options.allowedActions || ['test_action:/tmp/test.txt'],
            forbidden_actions: options.forbiddenActions || [],
            risk_tier: options.riskTier || 'T0',
            issued_at: new Date().toISOString(),
            status: 'issued'
          }),
          verify: async () => ({
            valid: true,
            warrant: {
              warrant_id: 'warrant_001',
              truth_snapshot_id: 'truth_001',
              plan_id: 'plan_001',
              allowed_actions: ['test_action:/tmp/test.txt'],
              risk_tier: 'T0'
            }
          })
        },
        truth: {
          verify: async () => ({ valid: true })
        },
        tradingGuard: {
          check: async () => ({ safe: true })
        },
        audit: {
          emit: async () => {}
        }
      };
      
      executor = new QueuedExecutor(mockCore, {
        queueOptions: {
          queueDir: path.join(testDir, 'queue')
        },
        controlStateDir: path.join(testDir, 'control'),
        dlqOptions: {
          dlqFile: path.join(testDir, 'dlq.jsonl')
        },
        retryPolicy: {
          max_retries: 2,
          base_delay_ms: 100,
          max_delay_ms: 1000
        },
        replayLog
      });
      
      await executor.initialize();
    });
    
    afterEach(async () => {
      // Allow any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });
    
    test('permanent failure routes to DLQ', async () => {
      executor.registerAdapter('test_action', {
        execute: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_perm_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // Trigger execution
      try {
        await executor.executeNext();
      } catch (error) {
        // Expected failure
      }
      
      // Wait for async dead lettering to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check DLQ
      const dlqEntries = executor.getDeadLetters();
      expect(dlqEntries.length).toBeGreaterThanOrEqual(1);
      
      // Find our specific envelope
      const ourEntry = dlqEntries.find(e => e.envelope_id === 'env_perm_001');
      expect(ourEntry).toBeTruthy();
      expect(ourEntry.reason).toBe(DLQReason.PERMANENT_FAILURE);
      
      // Verify envelope was removed from in-memory queue
      const queueEntry = executor.queue.getEntry('env_perm_001');
      expect(queueEntry).toBeFalsy();
    });
    
    test('transient failure stays in queue', async () => {
      let attempts = 0;
      
      executor.registerAdapter('test_action', {
        execute: async () => {
          attempts++;
          const error = new Error('network timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_trans_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // First failure
      try {
        await executor.executeNext();
      } catch (error) {
        // Expected
      }
      
      // Should NOT be in DLQ for this envelope
      const dlqEntries = executor.getDeadLetters();
      const ourEntry = dlqEntries.find(e => e.envelope_id === 'env_trans_001');
      expect(ourEntry).toBeFalsy(); // Transient failure should NOT be dead-lettered
      
      // Should still be in queue (failed state)
      const queueEntry = executor.queue.getEntry('env_trans_001');
      expect(queueEntry).toBeTruthy();
      expect(queueEntry.state).toBe('failed');
      expect(queueEntry.retry_count).toBe(1); // Failed once
    });
    
    test('retry exhaustion routes to DLQ', async () => {
      let attempts = 0;
      
      executor.registerAdapter('test_action', {
        execute: async () => {
          attempts++;
          const error = new Error('network timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_retry_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // Simulate retry exhaustion by failing multiple times
      // (In reality, retry logic would requeue the envelope, but for this test
      // we manually simulate the retry count accumulation)
      for (let i = 0; i < 3; i++) {
        // Reset state to queued for retry simulation
        const queueEntry = executor.queue.getEntry('env_retry_001');
        if (queueEntry && i > 0) {
          queueEntry.state = 'queued';
          executor.queue.fifo.push('env_retry_001');
        }
        
        try {
          await executor.executeNext();
        } catch (error) {
          // Expected
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should be in DLQ after retry exhaustion
      const dlqEntries = executor.getDeadLetters();
      expect(dlqEntries.length).toBe(1);
      expect(dlqEntries[0].envelope_id).toBe('env_retry_001');
      expect(dlqEntries[0].reason).toBe(DLQReason.RETRY_EXHAUSTED);
      expect(dlqEntries[0].retry_count).toBeGreaterThanOrEqual(2);
    });
    
    test('requeueDeadLetter returns envelope to queue', async () => {
      executor.registerAdapter('test_action', {
        execute: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_requeue_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // Trigger failure → DLQ
      try {
        await executor.executeNext();
      } catch (error) {}
      
      // Verify in DLQ
      let dlqEntries = executor.getDeadLetters();
      expect(dlqEntries.length).toBe(1);
      
      // Requeue
      await executor.requeueDeadLetter('env_requeue_001');
      
      // Verify DLQ entry marked requeued
      const dlqEntry = executor.getDeadLetters({ state: DLQState.REQUEUED });
      expect(dlqEntry.length).toBe(1);
      
      // Verify back in queue
      const queueState = executor.getQueueState();
      expect(queueState.queued).toBe(1);
    });
    
    test('cancelDeadLetter prevents execution', async () => {
      executor.registerAdapter('test_action', {
        execute: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_cancel_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // Trigger failure → DLQ
      try {
        await executor.executeNext();
      } catch (error) {}
      
      // Cancel
      await executor.cancelDeadLetter('env_cancel_001');
      
      // Verify DLQ entry marked cancelled
      const dlqEntry = executor.getDeadLetters({ state: DLQState.CANCELLED });
      expect(dlqEntry.length).toBe(1);
      expect(dlqEntry[0].envelope_id).toBe('env_cancel_001');
      
      // Verify NOT in queue
      const queueState = executor.getQueueState();
      expect(queueState.queued).toBe(0);
    });
    
    test('DLQ persists across restart', async () => {
      executor.registerAdapter('test_action', {
        execute: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        }
      });
      
      // Issue warrant before envelope submission
      const warrant = await executor.viennaCore.warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Test execution',
        riskTier: 'T0',
        allowedActions: ['test_action:/tmp/test.txt']
      });
      
      const envelope = {
        envelope_id: 'env_persist_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: warrant.warrant_id,
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      // Trigger failure → DLQ
      try {
        await executor.executeNext();
      } catch (error) {}
      
      // Verify in DLQ
      let dlqEntries = executor.getDeadLetters();
      expect(dlqEntries.length).toBe(1);
      
      // Simulate restart: create new executor with same DLQ file
      const executor2 = new QueuedExecutor(executor.viennaCore, {
        queueOptions: {
          queueDir: path.join(testDir, 'queue2')
        },
        controlStateDir: path.join(testDir, 'control2'),
        dlqOptions: {
          dlqFile: path.join(testDir, 'dlq.jsonl')
        },
        replayLog: executor.replayLog
      });
      
      await executor2.initialize();
      
      // Verify entry persisted
      const dlqEntries2 = executor2.getDeadLetters();
      expect(dlqEntries2.length).toBe(1);
      expect(dlqEntries2[0].envelope_id).toBe('env_persist_001');
      expect(dlqEntries2[0].reason).toBe(DLQReason.PERMANENT_FAILURE);
    });
  });
});
