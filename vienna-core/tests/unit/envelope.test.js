/**
 * Unit tests for Envelope System
 */

const EnvelopeSystem = require('../../lib/governance/envelope');

describe('EnvelopeSystem', () => {
  describe('create()', () => {
    test('creates valid envelope', () => {
      const envelope = EnvelopeSystem.create({
        warrant_id: 'wrt_001',
        objective: 'Test envelope',
        actions: [
          {
            type: 'write_file',
            target: '/tmp/test.txt',
            content: 'test'
          }
        ]
      });
      
      expect(envelope.envelope_id).toMatch(/^env_/);
      expect(envelope.warrant_id).toBe('wrt_001');
      expect(envelope.objective).toBe('Test envelope');
      expect(envelope.actions).toHaveLength(1);
    });
    
    test('throws if missing required fields', () => {
      expect(() => EnvelopeSystem.create({
        warrant_id: 'wrt_001',
        // Missing objective and actions
      })).toThrow('missing');
    });
  });
  
  describe('validate()', () => {
    test('accepts valid envelope', () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        objective: 'Test',
        actions: [
          { type: 'read_file', target: '/tmp/test.txt' }
        ]
      };
      
      expect(EnvelopeSystem.validate(envelope)).toBe(true);
    });
    
    test('rejects envelope with empty actions', () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        objective: 'Test',
        actions: []
      };
      
      expect(() => EnvelopeSystem.validate(envelope))
        .toThrow('at least one action');
    });
    
    test('validates write_file action', () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        objective: 'Test',
        actions: [
          { type: 'write_file', target: '/tmp/test.txt' }
          // Missing content
        ]
      };
      
      expect(() => EnvelopeSystem.validate(envelope))
        .toThrow('requires content');
    });
    
    test('validates edit_file action', () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        objective: 'Test',
        actions: [
          { type: 'edit_file', target: '/tmp/test.txt', old_text: 'old' }
          // Missing new_text
        ]
      };
      
      expect(() => EnvelopeSystem.validate(envelope))
        .toThrow('requires old_text and new_text');
    });
    
    test('validates exec_command action', () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        objective: 'Test',
        actions: [
          { type: 'exec_command', target: 'bash' }
          // Missing command
        ]
      };
      
      expect(() => EnvelopeSystem.validate(envelope))
        .toThrow('requires command');
    });
  });
});
