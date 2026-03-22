/**
 * Tests for Execution State API
 */

const { ExecutionState } = require('../lib/execution/execution-state');
const { ExecutionQueue } = require('../lib/execution/execution-queue');
const { RecursionGuard } = require('../lib/execution/recursion-guard');
const { ReplayLog } = require('../lib/execution/replay-log');
const { createEnvelope } = require('../lib/schemas/envelope');
const path = require('path');

const TEST_QUEUE_FILE = path.join(__dirname, '../.test-state-queue.jsonl');
const TEST_REPLAY_FILE = path.join(__dirname, '../.test-state-replay.jsonl');

describe('ExecutionState', () => {
  let executionState;
  let queue;
  let recursionGuard;
  let replayLog;
  
  beforeEach(async () => {
    queue = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
    await queue.initialize();
    
    recursionGuard = new RecursionGuard();
    replayLog = new ReplayLog({ replayFile: TEST_REPLAY_FILE });
    await replayLog.initialize();
    
    executionState = new ExecutionState({
      queue,
      recursionGuard,
      replayLog
    });
  });
  
  afterEach(async () => {
    const fs = require('fs').promises;
    try {
      await fs.unlink(TEST_QUEUE_FILE);
      await fs.unlink(TEST_REPLAY_FILE);
    } catch (error) {
      // Ignore
    }
  });
  
  describe('getQueueState', () => {
    test('returns queue statistics', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      
      const state = executionState.getQueueState();
      
      expect(state).toHaveProperty('total', 1);
      expect(state).toHaveProperty('queued', 1);
      expect(state).toHaveProperty('executing', 0);
    });
  });
  
  describe('getActiveEnvelopes', () => {
    test('returns executing envelopes', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.markExecuting(env1.envelope_id);
      
      const active = executionState.getActiveEnvelopes();
      
      expect(active).toHaveLength(1);
      expect(active[0].envelope_id).toBe(env1.envelope_id);
      expect(active[0]).toHaveProperty('duration_seconds');
    });
    
    test('returns empty array when no active envelopes', () => {
      const active = executionState.getActiveEnvelopes();
      expect(active).toHaveLength(0);
    });
  });
  
  describe('getObjectiveState', () => {
    test('returns all envelopes for objective', async () => {
      const objectiveId = 'obj_test';
      
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: objectiveId
      });
      
      const env2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: objectiveId
      });
      
      const env3 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test3.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: 'obj_other'
      });
      
      await queue.enqueue(env1);
      await queue.enqueue(env2);
      await queue.enqueue(env3);
      
      const state = executionState.getObjectiveState(objectiveId);
      
      expect(state).toHaveLength(2);
      expect(state.every(e => e.envelope_id === env1.envelope_id || e.envelope_id === env2.envelope_id)).toBe(true);
    });
  });
  
  describe('getBlockedEnvelopes', () => {
    test('returns blocked envelopes', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.markBlocked(env1.envelope_id, 'Recursion limit exceeded');
      
      const blocked = executionState.getBlockedEnvelopes();
      
      expect(blocked).toHaveLength(1);
      expect(blocked[0].envelope_id).toBe(env1.envelope_id);
      expect(blocked[0].blocking_reason).toBe('Recursion limit exceeded');
    });
  });
  
  describe('getCausalChain', () => {
    test('returns causal chain from replay log', async () => {
      const envelopeId = 'env_test';
      
      await replayLog.emit({
        event_type: 'envelope_queued',
        envelope_id: envelopeId,
        objective_id: 'obj_test',
        trigger_id: 'trig_test'
      });
      
      await replayLog.emit({
        event_type: 'envelope_completed',
        envelope_id: envelopeId,
        objective_id: 'obj_test',
        trigger_id: 'trig_test'
      });
      
      const chain = await executionState.getCausalChain(envelopeId);
      
      expect(chain).toHaveLength(2);
      expect(chain.every(e => e.envelope_id === envelopeId)).toBe(true);
    });
  });
  
  describe('getExecutionMetrics', () => {
    test('returns comprehensive metrics', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: 'trig_test'
      });
      
      await queue.enqueue(env1);
      recursionGuard.recordExecution(env1);
      
      const metrics = await executionState.getExecutionMetrics();
      
      expect(metrics).toHaveProperty('queue');
      expect(metrics).toHaveProperty('recursion');
      expect(metrics).toHaveProperty('replay');
      expect(metrics.queue.total).toBe(1);
      expect(metrics.recursion.active_triggers).toBe(1);
    });
  });
  
  describe('getSnapshot', () => {
    test('returns complete system state', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.markExecuting(env1.envelope_id);
      
      const snapshot = await executionState.getSnapshot();
      
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('queue');
      expect(snapshot).toHaveProperty('active_envelopes');
      expect(snapshot).toHaveProperty('blocked_envelopes');
      expect(snapshot).toHaveProperty('recursion');
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.active_envelopes).toHaveLength(1);
    });
  });
});
