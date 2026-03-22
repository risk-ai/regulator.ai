/**
 * Tests for Execution Queue
 */

const fs = require('fs').promises;
const path = require('path');
const { ExecutionQueue, QueueState } = require('../lib/execution/execution-queue');
const { createEnvelope } = require('../lib/schemas/envelope');

const TEST_QUEUE_FILE = path.join(__dirname, '../.test-queue.jsonl');

describe('ExecutionQueue', () => {
  let queue;
  
  beforeEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(TEST_QUEUE_FILE);
    } catch (error) {
      // Ignore if doesn't exist
    }
    
    queue = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
    await queue.initialize();
  });
  
  afterEach(async () => {
    try {
      await fs.unlink(TEST_QUEUE_FILE);
    } catch (error) {
      // Ignore
    }
  });
  
  describe('enqueue', () => {
    test('enqueues envelope and returns queue_id', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const queueId = await queue.enqueue(envelope);
      
      expect(queueId).toMatch(/^queue_/);
      
      const entry = queue.getEntry(envelope.envelope_id);
      expect(entry).toBeDefined();
      expect(entry.state).toBe(QueueState.QUEUED);
      expect(entry.envelope).toEqual(envelope);
    });
    
    test('persists to disk', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      
      // Check file exists and has content
      const content = await fs.readFile(TEST_QUEUE_FILE, 'utf8');
      expect(content).toContain(envelope.envelope_id);
    });
  });
  
  describe('next', () => {
    test('returns next queued envelope (FIFO)', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const env2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.enqueue(env2);
      
      const next = await queue.next();
      expect(next.envelope_id).toBe(env1.envelope_id);
    });
    
    test('returns null when queue empty', async () => {
      const next = await queue.next();
      expect(next).toBeNull();
    });
    
    test('skips executing envelopes', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const env2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.enqueue(env2);
      
      // Mark first as executing
      await queue.markExecuting(env1.envelope_id);
      
      // Next should return second
      const next = await queue.next();
      expect(next.envelope_id).toBe(env2.envelope_id);
    });
  });
  
  describe('state transitions', () => {
    test('markExecuting updates state', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      await queue.markExecuting(envelope.envelope_id);
      
      const entry = queue.getEntry(envelope.envelope_id);
      expect(entry.state).toBe(QueueState.EXECUTING);
      expect(entry.started_at).toBeDefined();
    });
    
    test('markCompleted updates state and removes from FIFO', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      await queue.markExecuting(envelope.envelope_id);
      await queue.markCompleted(envelope.envelope_id, { success: true });
      
      const entry = queue.getEntry(envelope.envelope_id);
      expect(entry.state).toBe(QueueState.COMPLETED);
      expect(entry.completed_at).toBeDefined();
      
      // Should not be returned by next()
      const next = await queue.next();
      expect(next).toBeNull();
    });
    
    test('markFailed increments retry count', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      await queue.markExecuting(envelope.envelope_id);
      await queue.markFailed(envelope.envelope_id, new Error('Test error'));
      
      const entry = queue.getEntry(envelope.envelope_id);
      expect(entry.state).toBe(QueueState.FAILED);
      expect(entry.retry_count).toBe(1);
      expect(entry.last_error).toBe('Test error');
    });
    
    test('markBlocked sets blocking reason', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      await queue.markBlocked(envelope.envelope_id, 'Recursion limit exceeded');
      
      const entry = queue.getEntry(envelope.envelope_id);
      expect(entry.state).toBe(QueueState.BLOCKED);
      expect(entry.blocking_reason).toBe('Recursion limit exceeded');
    });
  });
  
  describe('persistence', () => {
    test('loads queue from disk on initialize', async () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(envelope);
      
      // Create new queue instance
      const queue2 = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
      await queue2.initialize();
      
      const entry = queue2.getEntry(envelope.envelope_id);
      expect(entry).toBeDefined();
      expect(entry.envelope.envelope_id).toBe(envelope.envelope_id);
    });
    
    test('handles corrupted entries gracefully', async () => {
      // Write corrupted data
      await fs.writeFile(TEST_QUEUE_FILE, 'invalid json\n');
      
      const queue2 = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
      await queue2.initialize();
      
      // Should not crash
      expect(queue2.getAllEntries()).toHaveLength(0);
    });
  });
  
  describe('stats', () => {
    test('returns accurate statistics', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const env2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.enqueue(env2);
      await queue.markExecuting(env1.envelope_id);
      
      const stats = queue.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.queued).toBe(1);
      expect(stats.executing).toBe(1);
      expect(stats.completed).toBe(0);
    });
  });
  
  describe('clearCompleted', () => {
    test('removes completed entries', async () => {
      const env1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const env2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      await queue.enqueue(env1);
      await queue.enqueue(env2);
      
      await queue.markExecuting(env1.envelope_id);
      await queue.markCompleted(env1.envelope_id, { success: true });
      
      await queue.clearCompleted();
      
      expect(queue.getEntry(env1.envelope_id)).toBeUndefined();
      expect(queue.getEntry(env2.envelope_id)).toBeDefined();
    });
  });
});
