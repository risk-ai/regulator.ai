/**
 * Phase 3C: Dead Letter Inspection Tests
 * 
 * Validates:
 * - Dead letter listing with filters
 * - Dead letter statistics
 * - Dead letter retry operations
 * - Dead letter cancellation
 * - ViennaRuntime integration
 * - Empty DLQ handling
 */

const { DeadLetterQueue } = require('../lib/execution/dead-letter-queue');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

describe('Phase 3C: Dead Letter Inspection', () => {
  let testWorkspace;
  let dlq;
  
  beforeEach(async () => {
    // Create temporary test workspace (unique per test)
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'vienna-test-'));
    
    // Create dead letter queue with unique file per test
    const dlqFile = path.join(testWorkspace, 'dlq', 'dead-letters.jsonl');
    dlq = new DeadLetterQueue({
      dlqFile,
    });
    await dlq.initialize();
  });
  
  afterEach(async () => {
    // Cleanup test workspace
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });
  
  describe('DeadLetterQueue', () => {
    test('creates dead letter entry', async () => {
      const entry = await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'File not found',
      });
      
      expect(entry.envelope_id).toBe('env_001');
      expect(entry.objective_id).toBe('obj_001');
      expect(entry.reason).toBe('PERMANENT_FAILURE');
      expect(entry.error).toBe('File not found');
      expect(entry.state).toBe('dead_lettered');
      expect(entry.dead_lettered_at).toBeDefined();
    });
    
    test('gets entry by envelope ID', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Test error',
      });
      
      const entry = dlq.getEntry('env_001');
      
      expect(entry).toBeDefined();
      expect(entry.envelope_id).toBe('env_001');
      expect(entry.state).toBe('dead_lettered');
    });
    
    test('returns null for non-existent entry', () => {
      const entry = dlq.getEntry('env_nonexistent');
      expect(entry).toBeNull();
    });
    
    test('lists all entries', async () => {
      // Create multiple entries
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 1',
      });
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        objective_id: 'obj_002',
        reason: 'RETRY_EXHAUSTED',
        error: 'Error 2',
      });
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await dlq.deadLetter({
        envelope_id: 'env_003',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 3',
      });
      
      const entries = dlq.getEntries();
      
      expect(entries).toHaveLength(3);
      expect(entries[0].envelope_id).toBe('env_003'); // Most recent first
      expect(entries[1].envelope_id).toBe('env_002');
      expect(entries[2].envelope_id).toBe('env_001');
    });
    
    test('filters entries by state', async () => {
      // Create entries in different states
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 1',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        objective_id: 'obj_002',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 2',
      });
      
      // Requeue one
      await dlq.requeue('env_001');
      
      // List only dead_lettered
      const deadLettered = dlq.getEntries({ state: 'dead_lettered' });
      expect(deadLettered).toHaveLength(1);
      expect(deadLettered[0].envelope_id).toBe('env_002');
      
      // List only requeued
      const requeued = dlq.getEntries({ state: 'requeued' });
      expect(requeued).toHaveLength(1);
      expect(requeued[0].envelope_id).toBe('env_001');
    });
    
    test('filters entries by objective_id', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_a',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 1',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        objective_id: 'obj_b',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 2',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_003',
        objective_id: 'obj_a',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 3',
      });
      
      const entries = dlq.getEntries({ objective_id: 'obj_a' });
      
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.objective_id === 'obj_a')).toBe(true);
    });
    
    test('filters entries by reason', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 1',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        objective_id: 'obj_002',
        reason: 'RETRY_EXHAUSTED',
        error: 'Error 2',
      });
      
      const entries = dlq.getEntries({ reason: 'PERMANENT_FAILURE' });
      
      expect(entries).toHaveLength(1);
      expect(entries[0].envelope_id).toBe('env_001');
    });
    
    test('respects limit parameter', async () => {
      // Create many entries
      for (let i = 0; i < 10; i++) {
        const id = String(i).padStart(3, '0');
        await dlq.deadLetter({
          envelope_id: `env_${id}`,
          objective_id: 'obj_001',
          reason: 'PERMANENT_FAILURE',
          error: `Error ${i}`,
        });
      }
      
      const entries = dlq.getEntries({ limit: 3 });
      
      expect(entries).toHaveLength(3);
    });
    
    test('gets statistics', async () => {
      // Create entries in different states and reasons
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 1',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_002',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Error 2',
      });
      
      await dlq.deadLetter({
        envelope_id: 'env_003',
        objective_id: 'obj_001',
        reason: 'RETRY_EXHAUSTED',
        error: 'Error 3',
      });
      
      // Requeue one
      await dlq.requeue('env_001');
      
      // Cancel one
      await dlq.cancel('env_003');
      
      const stats = dlq.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.by_state.dead_lettered).toBe(1); // env_002
      expect(stats.by_state.requeued).toBe(1); // env_001
      expect(stats.by_state.cancelled).toBe(1); // env_003
      expect(stats.by_reason.PERMANENT_FAILURE).toBe(2); // env_001, env_002
      expect(stats.by_reason.RETRY_EXHAUSTED).toBe(1); // env_003
    });
    
    test('requeues dead letter', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Test error',
      });
      
      const result = await dlq.requeue('env_001');
      
      expect(result.entry.state).toBe('requeued');
      expect(result.entry.requeued_at).toBeDefined();
      
      // Verify state persisted
      const entry = dlq.getEntry('env_001');
      expect(entry.state).toBe('requeued');
    });
    
    test('cancels dead letter', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Test error',
      });
      
      const result = await dlq.cancel('env_001');
      
      expect(result.state).toBe('cancelled');
      expect(result.cancelled_at).toBeDefined();
      
      // Verify state persisted
      const entry = dlq.getEntry('env_001');
      expect(entry.state).toBe('cancelled');
    });
    
    test('prevents invalid state transitions', async () => {
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Test error',
      });
      
      // Requeue first
      await dlq.requeue('env_001');
      
      // Cannot requeue again (not in dead_lettered state)
      expect(async () => {
        await dlq.requeue('env_001');
      }).rejects.toThrow('not in dead_lettered state');
    });
    
    test('persists state across instantiations', async () => {
      // Create entry with first instance
      await dlq.deadLetter({
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        reason: 'PERMANENT_FAILURE',
        error: 'Test error',
      });
      
      // Update state
      await dlq.requeue('env_001');
      
      // Create new instance with same file
      const dlq2 = new DeadLetterQueue({
        dlqFile: dlq.dlqFile,
      });
      await dlq2.initialize();
      
      // Verify state persisted
      const entry = dlq2.getEntry('env_001');
      expect(entry).toBeDefined();
      expect(entry.state).toBe('requeued');
    });
    
    test('handles empty DLQ gracefully', () => {
      const entries = dlq.getEntries();
      expect(entries).toHaveLength(0);
      
      const stats = dlq.getStats();
      expect(stats.total).toBe(0);
      expect(Object.keys(stats.by_state)).toHaveLength(0);
      expect(Object.keys(stats.by_reason)).toHaveLength(0);
    });
  });
  
  describe('Dead Letter Visibility', () => {
    test('entries are sorted by most recent first', async () => {
      // Create entries with small delays to ensure different timestamps
      for (let i = 0; i < 3; i++) {
        await dlq.deadLetter({
          envelope_id: `env_${i}`,
          objective_id: 'obj_001',
          reason: 'PERMANENT_FAILURE',
          error: `Error ${i}`,
        });
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const entries = dlq.getEntries();
      
      // Most recent first
      expect(entries[0].envelope_id).toBe('env_2');
      expect(entries[1].envelope_id).toBe('env_1');
      expect(entries[2].envelope_id).toBe('env_0');
    });
    
    test('preserves envelope context in dead letter', async () => {
      const testEnvelope = {
        envelope_id: 'env_test_001',
        objective_id: 'obj_test_001',
        action_type: 'read_file',
        target: '/test/file.md',
        parent_envelope_id: 'env_parent_001',
      };
      
      await dlq.deadLetter({
        envelope_id: testEnvelope.envelope_id,
        envelope: testEnvelope,
        objective_id: testEnvelope.objective_id,
        reason: 'PERMANENT_FAILURE',
        error: 'File not found',
      });
      
      const entry = dlq.getEntry('env_test_001');
      
      expect(entry.envelope).toEqual(testEnvelope);
      expect(entry.envelope.target).toBe('/test/file.md');
      expect(entry.envelope.parent_envelope_id).toBe('env_parent_001');
    });
  });
  
  describe('Complex Filtering', () => {
    beforeEach(async () => {
      // Create diverse set of dead letters for filtering tests
      const configs = [
        { id: 'env_001', obj: 'obj_a', reason: 'PERMANENT_FAILURE' },
        { id: 'env_002', obj: 'obj_a', reason: 'PERMANENT_FAILURE' },
        { id: 'env_003', obj: 'obj_a', reason: 'RETRY_EXHAUSTED' },
        { id: 'env_004', obj: 'obj_b', reason: 'PERMANENT_FAILURE' },
        { id: 'env_005', obj: 'obj_b', reason: 'OPERATOR_REJECTED' },
      ];
      
      for (const cfg of configs) {
        await dlq.deadLetter({
          envelope_id: cfg.id,
          objective_id: cfg.obj,
          reason: cfg.reason,
          error: `Error for ${cfg.id}`,
        });
      }
      
      // Requeue one, cancel one
      await dlq.requeue('env_001');
      await dlq.cancel('env_005');
    });
    
    test('filters by objective and state', async () => {
      const entries = dlq.getEntries({
        objective_id: 'obj_a',
        state: 'dead_lettered',
      });
      
      expect(entries).toHaveLength(2); // env_002, env_003
      expect(entries.every(e => e.objective_id === 'obj_a')).toBe(true);
      expect(entries.every(e => e.state === 'dead_lettered')).toBe(true);
    });
    
    test('filters by objective and reason', async () => {
      const entries = dlq.getEntries({
        objective_id: 'obj_b',
        reason: 'PERMANENT_FAILURE',
      });
      
      expect(entries).toHaveLength(1); // env_004
      expect(entries[0].envelope_id).toBe('env_004');
    });
    
    test('statistics reflect all entries regardless of state', () => {
      const stats = dlq.getStats();
      
      expect(stats.total).toBe(5); // All entries
      expect(stats.by_state.dead_lettered).toBe(3);
      expect(stats.by_state.requeued).toBe(1);
      expect(stats.by_state.cancelled).toBe(1);
    });
  });
});
