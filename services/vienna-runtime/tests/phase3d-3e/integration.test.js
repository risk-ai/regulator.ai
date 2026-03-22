/**
 * Phase 3D/3E Integration Tests
 * 
 * Validates ObjectiveTracker and LineageValidator integration
 */

const { QueuedExecutor } = require('../../lib/execution/queued-executor');

describe('Phase 3D/3E Integration', () => {
  let executor;
  
  beforeEach(() => {
    executor = new QueuedExecutor({}, {
      queueOptions: { maxSize: 100 },
      recursionOptions: { maxDepth: 5 }
    });
  });
  
  describe('Phase 3D: ObjectiveTracker', () => {
    test('ObjectiveTracker is instantiated', () => {
      expect(executor.objectiveTracker).toBeDefined();
      expect(executor.objectiveTracker).not.toBeNull();
    });
    
    test('getObjectiveProgress returns null for unknown objective', () => {
      const progress = executor.getObjectiveProgress('unknown_objective');
      expect(progress).toBeNull();
    });
    
    test('getObjectives returns empty array initially', () => {
      const objectives = executor.getObjectives();
      expect(Array.isArray(objectives)).toBe(true);
      expect(objectives.length).toBe(0);
    });
    
    test('getObjectiveStats returns valid structure', () => {
      const stats = executor.getObjectiveStats();
      expect(stats).toHaveProperty('total_objectives');
      expect(stats).toHaveProperty('by_status');
      expect(stats).toHaveProperty('envelope_totals');
      expect(stats.total_objectives).toBe(0);
    });
    
    test('tracking envelope updates objective state', () => {
      const objectiveId = 'obj_test_001';
      const envelopeId = 'env_test_001';
      
      // Track envelope
      executor.objectiveTracker.trackEnvelope(envelopeId, objectiveId, 'queued');
      
      // Get progress
      const progress = executor.getObjectiveProgress(objectiveId);
      expect(progress).toBeDefined();
      expect(progress.objective_id).toBe(objectiveId);
      expect(progress.queued).toBe(1);
      expect(progress.total_envelopes).toBe(1);
    });
    
    test('transitioning envelope updates state counts', () => {
      const objectiveId = 'obj_test_002';
      const envelopeId = 'env_test_002';
      
      // Track and transition
      executor.objectiveTracker.trackEnvelope(envelopeId, objectiveId, 'queued');
      executor.objectiveTracker.transitionEnvelope(envelopeId, 'queued', 'executing');
      
      // Verify state
      const progress = executor.getObjectiveProgress(objectiveId);
      expect(progress.queued).toBe(0);
      expect(progress.executing).toBe(1);
    });
  });
  
  describe('Phase 3E: LineageValidator', () => {
    test('LineageValidator is instantiated', () => {
      expect(executor.lineageValidator).toBeDefined();
      expect(executor.lineageValidator).not.toBeNull();
    });
    
    test('getEnvelopeLineage returns array with missing flag for unknown envelope', () => {
      const lineage = executor.getEnvelopeLineage('unknown_envelope');
      expect(Array.isArray(lineage)).toBe(true);
      expect(lineage.length).toBe(1);
      expect(lineage[0].envelope_id).toBe('unknown_envelope');
      expect(lineage[0].missing).toBe(true);
    });
    
    test('getObjectiveTree returns null for unknown objective', () => {
      const tree = executor.getObjectiveTree('unknown_objective');
      expect(tree).toBeNull();
    });
    
    test('validateLineage returns valid report', () => {
      const report = executor.validateLineage();
      expect(report).toHaveProperty('valid');
      expect(report.valid).toBe(true);
    });
    
    test('registering envelope makes it queryable', () => {
      const envelope = {
        envelope_id: 'env_lineage_001',
        parent_envelope_id: null,
        objective_id: 'obj_lineage_001',
        action_type: 'test_action'
      };
      
      // Register envelope
      executor.lineageValidator.registerEnvelope(envelope);
      
      // Get lineage
      const lineage = executor.getEnvelopeLineage('env_lineage_001');
      expect(lineage.length).toBe(1);
      expect(lineage[0].envelope_id).toBe('env_lineage_001');
    });
    
    test('building tree from registered envelopes', () => {
      const objectiveId = 'obj_tree_001';
      
      // Register root and children
      executor.lineageValidator.registerEnvelope({
        envelope_id: 'env_root',
        parent_envelope_id: null,
        objective_id: objectiveId,
        action_type: 'root_action'
      });
      
      executor.lineageValidator.registerEnvelope({
        envelope_id: 'env_child_1',
        parent_envelope_id: 'env_root',
        objective_id: objectiveId,
        fanout_index: 0,
        action_type: 'child_action'
      });
      
      executor.lineageValidator.registerEnvelope({
        envelope_id: 'env_child_2',
        parent_envelope_id: 'env_root',
        objective_id: objectiveId,
        fanout_index: 1,
        action_type: 'child_action'
      });
      
      // Get tree
      const tree = executor.getObjectiveTree(objectiveId);
      expect(tree).toBeDefined();
      expect(tree.objective_id).toBe(objectiveId);
      expect(tree.envelope_count).toBe(3);
      expect(tree.roots.length).toBe(1);
      expect(tree.roots[0].envelope_id).toBe('env_root');
      expect(tree.roots[0].children.length).toBe(2);
    });
  });
  
  describe('Integration: Full Lifecycle', () => {
    test('submit() tracks envelope in both systems', async () => {
      await executor.initialize();
      
      const envelope = {
        envelope_id: 'env_integration_001',
        objective_id: 'obj_integration_001',
        envelope_type: 'test_action',
        proposed_by: 'test_agent',
        action_type: 'test_action',
        actions: []
      };
      
      // Submit envelope
      await executor.submit(envelope);
      
      // Verify ObjectiveTracker
      const progress = executor.getObjectiveProgress('obj_integration_001');
      expect(progress).toBeDefined();
      expect(progress.queued).toBe(1);
      
      // Verify LineageValidator
      const lineage = executor.getEnvelopeLineage('env_integration_001');
      expect(lineage.length).toBe(1);
      expect(lineage[0].envelope_id).toBe('env_integration_001');
    });
  });
});
