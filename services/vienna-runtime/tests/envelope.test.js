/**
 * Tests for Envelope Schema
 */

const {
  createEnvelope,
  createRetryEnvelope,
  createDescendantEnvelope,
  validateEnvelope,
  generateIdempotencyKey
} = require('../lib/schemas/envelope');

describe('Envelope Schema', () => {
  describe('createEnvelope', () => {
    test('creates valid root envelope', () => {
      const envelope = createEnvelope({
        actions: [
          { type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }
        ],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      expect(envelope).toHaveProperty('envelope_id');
      expect(envelope).toHaveProperty('warrant_id', 'warrant_123');
      expect(envelope).toHaveProperty('objective_id');
      expect(envelope).toHaveProperty('trigger_id');
      expect(envelope).toHaveProperty('causal_depth', 0);
      expect(envelope).toHaveProperty('attempt', 0);
      expect(envelope).toHaveProperty('loop_budget_remaining', 5);
      expect(envelope).toHaveProperty('parent_envelope_id', null);
      expect(envelope).toHaveProperty('idempotency_key');
      expect(envelope).toHaveProperty('origin_id', 'talleyrand');
    });
    
    test('requires actions', () => {
      expect(() => {
        createEnvelope({
          actions: [],
          warrant_id: 'warrant_123',
          origin_id: 'talleyrand'
        });
      }).toThrow('must have at least one action');
    });
    
    test('requires warrant_id', () => {
      expect(() => {
        createEnvelope({
          actions: [{ type: 'write_file', target: '/test.txt' }],
          origin_id: 'talleyrand'
        });
      }).toThrow('must have warrant_id');
    });
    
    test('requires origin_id', () => {
      expect(() => {
        createEnvelope({
          actions: [{ type: 'write_file', target: '/test.txt' }],
          warrant_id: 'warrant_123'
        });
      }).toThrow('must have origin_id');
    });
    
    test('generates deterministic idempotency key', () => {
      const actions = [
        { type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }
      ];
      const objectiveId = 'obj_123';
      
      const key1 = generateIdempotencyKey(objectiveId, actions);
      const key2 = generateIdempotencyKey(objectiveId, actions);
      
      expect(key1).toBe(key2);
    });
    
    test('different actions produce different idempotency keys', () => {
      const objectiveId = 'obj_123';
      const actions1 = [
        { type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }
      ];
      const actions2 = [
        { type: 'write_file', target: '/test.txt', payload: { content: 'bar' } }
      ];
      
      const key1 = generateIdempotencyKey(objectiveId, actions1);
      const key2 = generateIdempotencyKey(objectiveId, actions2);
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('createRetryEnvelope', () => {
    test('creates retry with same envelope_id', () => {
      const original = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt' }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const retry = createRetryEnvelope(original);
      
      expect(retry.envelope_id).toBe(original.envelope_id);
      expect(retry.attempt).toBe(original.attempt + 1);
      expect(retry.objective_id).toBe(original.objective_id);
      expect(retry.trigger_id).toBe(original.trigger_id);
    });
    
    test('blocks retry exceeding max attempts', () => {
      const original = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt' }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        attempt: 2
      });
      
      expect(() => {
        createRetryEnvelope(original);
      }).toThrow('Maximum retry attempts exceeded');
    });
  });
  
  describe('createDescendantEnvelope', () => {
    test('creates descendant with new envelope_id', () => {
      const parent = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt' }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const descendant = createDescendantEnvelope(parent, {
        actions: [{ type: 'write_file', target: '/test2.txt' }],
        warrant_id: 'warrant_456',
        origin_id: 'castlereagh',
        proposed_by: 'castlereagh'
      });
      
      expect(descendant.envelope_id).not.toBe(parent.envelope_id);
      expect(descendant.parent_envelope_id).toBe(parent.envelope_id);
      expect(descendant.objective_id).toBe(parent.objective_id);
      expect(descendant.trigger_id).toBe(parent.trigger_id);
      expect(descendant.causal_depth).toBe(parent.causal_depth + 1);
      expect(descendant.loop_budget_remaining).toBe(parent.loop_budget_remaining - 1);
      expect(descendant.attempt).toBe(0);
    });
    
    test('blocks descendant when budget exhausted', () => {
      const parent = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt' }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        loop_budget_remaining: 0
      });
      
      expect(() => {
        createDescendantEnvelope(parent, {
          actions: [{ type: 'write_file', target: '/test2.txt' }],
          warrant_id: 'warrant_456',
          origin_id: 'castlereagh'
        });
      }).toThrow('exhausted descendant budget');
    });
  });
  
  describe('validateEnvelope', () => {
    test('validates complete envelope', () => {
      const envelope = {
        envelope_id: 'env_123',
        warrant_id: 'warrant_123',
        actions: [{ type: 'write_file', target: '/test.txt' }],
        objective_id: 'obj_123',
        trigger_id: 'trig_123',
        parent_envelope_id: null,
        causal_depth: 0,
        attempt: 0,
        loop_budget_remaining: 5,
        origin_type: 'agent',
        origin_id: 'talleyrand',
        trigger_type: 'operator_directive',
        idempotency_key: 'abc123'
      };
      
      const result = validateEnvelope(envelope);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('detects missing Phase 7.2 fields', () => {
      const envelope = {
        objective_id: 'obj_123',
        trigger_id: 'trig_123',
        parent_envelope_id: null,
        causal_depth: 0,
        attempt: 0,
        loop_budget_remaining: 5,
        origin_type: 'agent',
        origin_id: 'talleyrand',
        trigger_type: 'operator_directive',
        idempotency_key: 'abc123'
      };
      
      const result = validateEnvelope(envelope);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing envelope_id');
      expect(result.errors).toContain('Missing warrant_id');
      expect(result.errors).toContain('Missing or invalid actions array');
    });
    
    test('detects missing Phase 7.3 fields', () => {
      const envelope = {
        envelope_id: 'env_123',
        warrant_id: 'warrant_123',
        actions: [{ type: 'write_file', target: '/test.txt' }]
      };
      
      const result = validateEnvelope(envelope);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing objective_id');
      expect(result.errors).toContain('Missing trigger_id');
      expect(result.errors).toContain('Missing origin_type');
    });
    
    test('requires parent_envelope_id for non-root', () => {
      const envelope = {
        envelope_id: 'env_123',
        warrant_id: 'warrant_123',
        actions: [{ type: 'write_file', target: '/test.txt' }],
        objective_id: 'obj_123',
        trigger_id: 'trig_123',
        causal_depth: 1, // Non-root
        attempt: 0,
        loop_budget_remaining: 5,
        origin_type: 'agent',
        origin_id: 'talleyrand',
        trigger_type: 'operator_directive',
        idempotency_key: 'abc123'
      };
      
      const result = validateEnvelope(envelope);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Non-root envelope missing parent_envelope_id');
    });
    
    test('validates action structure', () => {
      const envelope = {
        envelope_id: 'env_123',
        warrant_id: 'warrant_123',
        actions: [
          { type: 'write_file', target: '/test.txt' },
          { type: 'read_file' } // Missing target
        ],
        objective_id: 'obj_123',
        trigger_id: 'trig_123',
        parent_envelope_id: null,
        causal_depth: 0,
        attempt: 0,
        loop_budget_remaining: 5,
        origin_type: 'agent',
        origin_id: 'talleyrand',
        trigger_type: 'operator_directive',
        idempotency_key: 'abc123'
      };
      
      const result = validateEnvelope(envelope);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Action 1') && e.includes('target'))).toBe(true);
    });
  });
});
