/**
 * Phase 3E: Fanout Lineage Validation Tests
 * 
 * Validates:
 * - Parent-child envelope relationships
 * - Orphaned envelope detection
 * - Cycle detection
 * - Fanout index integrity
 * - Lineage chain retrieval
 * - Children listing
 */

const { LineageValidator } = require('../lib/execution/lineage-validator');

describe('Phase 3E: Fanout Lineage Validation', () => {
  let validator;
  
  beforeEach(() => {
    validator = new LineageValidator();
  });
  
  describe('LineageValidator', () => {
    test('registers envelope', () => {
      validator.registerEnvelope({
        envelope_id: 'env_001',
        parent_envelope_id: null,
        objective_id: 'obj_001',
        action_type: 'read_file',
      });
      
      expect(validator.envelopes.size).toBe(1);
      expect(validator.envelopes.has('env_001')).toBe(true);
    });
    
    test('validates simple lineage (single envelope, no parent)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_001',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(true);
      expect(report.total_envelopes).toBe(1);
      expect(report.issues).toHaveLength(0);
      expect(report.orphaned).toHaveLength(0);
    });
    
    test('validates parent-child relationship', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(true);
      expect(report.total_envelopes).toBe(2);
      expect(report.orphaned).toHaveLength(0);
    });
    
    test('detects orphaned envelope (missing parent)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_orphan',
        parent_envelope_id: 'env_missing_parent',
        objective_id: 'obj_001',
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(false);
      expect(report.orphaned).toHaveLength(1);
      expect(report.orphaned[0].envelope_id).toBe('env_orphan');
      expect(report.orphaned[0].parent_envelope_id).toBe('env_missing_parent');
      expect(report.orphaned[0].issue).toContain('Parent envelope does not exist');
    });
    
    test('detects cycle in lineage', () => {
      // Create cycle: A → B → A
      validator.registerEnvelope({
        envelope_id: 'env_a',
        parent_envelope_id: 'env_b',
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_b',
        parent_envelope_id: 'env_a',
        objective_id: 'obj_001',
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(false);
      expect(report.cycles.length).toBeGreaterThan(0);
    });
    
    test('validates fanout index is non-negative number', () => {
      validator.registerEnvelope({
        envelope_id: 'env_valid',
        parent_envelope_id: null,
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(true);
      expect(report.invalid_fanout_indices).toHaveLength(0);
    });
    
    test('detects invalid fanout index (negative)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_invalid',
        parent_envelope_id: null,
        objective_id: 'obj_001',
        fanout_index: -1,
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(false);
      expect(report.invalid_fanout_indices).toHaveLength(1);
      expect(report.invalid_fanout_indices[0].envelope_id).toBe('env_invalid');
      expect(report.invalid_fanout_indices[0].fanout_index).toBe(-1);
    });
    
    test('detects invalid fanout index (non-number)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_invalid',
        parent_envelope_id: null,
        objective_id: 'obj_001',
        fanout_index: 'invalid',
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(false);
      expect(report.invalid_fanout_indices).toHaveLength(1);
    });
    
    test('gets lineage chain (single envelope)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_001',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      const lineage = validator.getLineage('env_001');
      
      expect(lineage).toHaveLength(1);
      expect(lineage[0].envelope_id).toBe('env_001');
      expect(lineage[0].parent_envelope_id).toBeNull();
    });
    
    test('gets lineage chain (multi-level)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_root',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_mid',
        parent_envelope_id: 'env_root',
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_leaf',
        parent_envelope_id: 'env_mid',
        objective_id: 'obj_001',
        fanout_index: 5,
      });
      
      const lineage = validator.getLineage('env_leaf');
      
      expect(lineage).toHaveLength(3);
      expect(lineage[0].envelope_id).toBe('env_root'); // Root first
      expect(lineage[1].envelope_id).toBe('env_mid');
      expect(lineage[2].envelope_id).toBe('env_leaf'); // Target last
      expect(lineage[2].fanout_index).toBe(5);
    });
    
    test('detects cycle in lineage chain', () => {
      // Create cycle
      validator.registerEnvelope({
        envelope_id: 'env_a',
        parent_envelope_id: 'env_b',
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_b',
        parent_envelope_id: 'env_a',
        objective_id: 'obj_001',
      });
      
      const lineage = validator.getLineage('env_a');
      
      // Should detect cycle and break
      const hasCycle = lineage.some(node => node.cycle);
      expect(hasCycle).toBe(true);
    });
    
    test('gets children of parent envelope', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 1,
      });
      
      const children = validator.getChildren('env_parent');
      
      expect(children).toHaveLength(2);
      expect(children[0].envelope_id).toBe('env_child_1');
      expect(children[1].envelope_id).toBe('env_child_2');
    });
    
    test('children are sorted by fanout_index', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      // Register out of order
      validator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 2,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_0',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 1,
      });
      
      const children = validator.getChildren('env_parent');
      
      expect(children[0].fanout_index).toBe(0);
      expect(children[1].fanout_index).toBe(1);
      expect(children[2].fanout_index).toBe(2);
    });
    
    test('validates fanout sub-envelopes (valid case)', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_0',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 1,
      });
      
      const report = validator.validateFanout('env_parent');
      
      expect(report.valid).toBe(true);
      expect(report.child_count).toBe(2);
      expect(report.issues).toHaveLength(0);
    });
    
    test('detects missing fanout indices', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        // Missing fanout_index
      });
      
      const report = validator.validateFanout('env_parent');
      
      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.issue.includes('Not all children have fanout_index'))).toBe(true);
    });
    
    test('detects duplicate fanout indices', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0, // Duplicate!
      });
      
      const report = validator.validateFanout('env_parent');
      
      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.issue.includes('Duplicate fanout indices'))).toBe(true);
    });
    
    test('detects gaps in fanout index sequence', () => {
      validator.registerEnvelope({
        envelope_id: 'env_parent',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_0',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 0,
      });
      
      validator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_parent',
        objective_id: 'obj_001',
        fanout_index: 2, // Gap: missing index 1
      });
      
      const report = validator.validateFanout('env_parent');
      
      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.issue.includes('Gaps in fanout index sequence'))).toBe(true);
    });
    
    test('clears all envelopes', () => {
      validator.registerEnvelope({
        envelope_id: 'env_001',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      validator.clear();
      
      expect(validator.envelopes.size).toBe(0);
    });
  });
  
  describe('Complex Scenarios', () => {
    test('validates multi-level fanout tree', () => {
      // Root
      validator.registerEnvelope({
        envelope_id: 'env_root',
        parent_envelope_id: null,
        objective_id: 'obj_001',
      });
      
      // First level fanout (3 children)
      for (let i = 0; i < 3; i++) {
        validator.registerEnvelope({
          envelope_id: `env_l1_${i}`,
          parent_envelope_id: 'env_root',
          objective_id: 'obj_001',
          fanout_index: i,
        });
        
        // Second level fanout (2 children each)
        for (let j = 0; j < 2; j++) {
          validator.registerEnvelope({
            envelope_id: `env_l2_${i}_${j}`,
            parent_envelope_id: `env_l1_${i}`,
            objective_id: 'obj_001',
            fanout_index: j,
          });
        }
      }
      
      const report = validator.validate();
      
      expect(report.valid).toBe(true);
      expect(report.total_envelopes).toBe(10); // 1 root + 3 L1 + 6 L2
      expect(report.orphaned).toHaveLength(0);
      
      // Validate each fanout level
      const rootFanout = validator.validateFanout('env_root');
      expect(rootFanout.valid).toBe(true);
      expect(rootFanout.child_count).toBe(3);
      
      const l1Fanout = validator.validateFanout('env_l1_0');
      expect(l1Fanout.valid).toBe(true);
      expect(l1Fanout.child_count).toBe(2);
    });
    
    test('detects multiple issues in single validation', () => {
      // Orphaned envelope
      validator.registerEnvelope({
        envelope_id: 'env_orphan',
        parent_envelope_id: 'env_missing',
        objective_id: 'obj_001',
      });
      
      // Invalid fanout index
      validator.registerEnvelope({
        envelope_id: 'env_invalid',
        parent_envelope_id: null,
        objective_id: 'obj_001',
        fanout_index: -5,
      });
      
      const report = validator.validate();
      
      expect(report.valid).toBe(false);
      expect(report.orphaned).toHaveLength(1);
      expect(report.invalid_fanout_indices).toHaveLength(1);
      expect(report.issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
