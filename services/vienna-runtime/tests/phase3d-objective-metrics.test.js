/**
 * Phase 3D: Objective Summary Metrics Tests
 * 
 * Validates:
 * - Objective registration
 * - Envelope state tracking
 * - Progress calculation
 * - Status transitions
 * - Summary statistics
 * - Multi-objective tracking
 */

const { ObjectiveTracker } = require('../lib/execution/objective-tracker');

describe('Phase 3D: Objective Summary Metrics', () => {
  let tracker;
  
  beforeEach(() => {
    tracker = new ObjectiveTracker();
  });
  
  describe('ObjectiveTracker', () => {
    test('registers objective with envelope count', () => {
      tracker.registerObjective('obj_001', 5);
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective).toBeDefined();
      expect(objective.objective_id).toBe('obj_001');
      expect(objective.total_envelopes).toBe(5);
      expect(objective.queued).toBe(0);
      expect(objective.executing).toBe(0);
      expect(objective.verified).toBe(0);
      expect(objective.failed).toBe(0);
      expect(objective.status).toBe('pending');
      expect(objective.queued_at).toBeDefined();
    });
    
    test('tracks envelope in queued state', () => {
      tracker.registerObjective('obj_001', 3);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.queued).toBe(2);
      expect(objective.status).toBe('pending');
    });
    
    test('transitions envelope from queued to executing', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.queued).toBe(0);
      expect(objective.executing).toBe(1);
      expect(objective.status).toBe('active');
      expect(objective.started_at).toBeDefined();
    });
    
    test('transitions envelope from executing to verified', () => {
      tracker.registerObjective('obj_001', 1);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.executing).toBe(0);
      expect(objective.verified).toBe(1);
      expect(objective.status).toBe('complete');
      expect(objective.completed_at).toBeDefined();
    });
    
    test('transitions envelope from executing to failed', () => {
      tracker.registerObjective('obj_001', 1);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'failed');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.executing).toBe(0);
      expect(objective.failed).toBe(1);
      expect(objective.status).toBe('failed');
      expect(objective.completed_at).toBeDefined();
    });
    
    test('calculates progress correctly', () => {
      tracker.registerObjective('obj_001', 4);
      
      // Track 4 envelopes
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      tracker.trackEnvelope('env_003', 'obj_001', 'queued');
      tracker.trackEnvelope('env_004', 'obj_001', 'queued');
      
      // Complete 2, fail 1, leave 1 pending
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      tracker.transitionEnvelope('env_002', 'executing', 'verified');
      
      tracker.transitionEnvelope('env_003', 'queued', 'executing');
      tracker.transitionEnvelope('env_003', 'executing', 'failed');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.completed_envelopes).toBe(3); // 2 verified + 1 failed
      expect(objective.progress).toBeCloseTo(0.75, 2); // 3/4
      expect(objective.status).toBe('active'); // Still has queued envelope
    });
    
    test('marks objective complete when all envelopes verified', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      // Complete both
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      tracker.transitionEnvelope('env_002', 'executing', 'verified');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.status).toBe('complete');
      expect(objective.verified).toBe(2);
      expect(objective.progress).toBe(1.0);
    });
    
    test('marks objective failed when any envelope fails', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      // One succeeds, one fails
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      tracker.transitionEnvelope('env_002', 'executing', 'failed');
      
      const objective = tracker.getObjective('obj_001');
      
      expect(objective.status).toBe('failed'); // Partial failure
      expect(objective.verified).toBe(1);
      expect(objective.failed).toBe(1);
    });
    
    test('returns null for non-existent objective', () => {
      const objective = tracker.getObjective('obj_nonexistent');
      expect(objective).toBeNull();
    });
    
    test('lists all objectives', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.registerObjective('obj_002', 3);
      tracker.registerObjective('obj_003', 1);
      
      const objectives = tracker.listObjectives();
      
      expect(objectives).toHaveLength(3);
      // Verify all objectives present (order may vary due to timestamp)
      const ids = objectives.map(obj => obj.objective_id);
      expect(ids).toContain('obj_001');
      expect(ids).toContain('obj_002');
      expect(ids).toContain('obj_003');
    });
    
    test('filters objectives by status', () => {
      tracker.registerObjective('obj_001', 1);
      tracker.registerObjective('obj_002', 1);
      tracker.registerObjective('obj_003', 1);
      
      // Complete obj_001
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      // Start obj_002
      tracker.trackEnvelope('env_002', 'obj_002', 'queued');
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      
      // Leave obj_003 pending
      
      const completed = tracker.listObjectives({ status: 'complete' });
      expect(completed).toHaveLength(1);
      expect(completed[0].objective_id).toBe('obj_001');
      
      const active = tracker.listObjectives({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].objective_id).toBe('obj_002');
      
      const pending = tracker.listObjectives({ status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0].objective_id).toBe('obj_003');
    });
    
    test('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        tracker.registerObjective(`obj_${i}`, 1);
      }
      
      const objectives = tracker.listObjectives({ limit: 3 });
      
      expect(objectives).toHaveLength(3);
    });
    
    test('gets summary statistics', () => {
      // Create diverse objectives
      tracker.registerObjective('obj_001', 3);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      tracker.trackEnvelope('env_003', 'obj_001', 'queued');
      
      tracker.registerObjective('obj_002', 2);
      tracker.trackEnvelope('env_004', 'obj_002', 'queued');
      tracker.trackEnvelope('env_005', 'obj_002', 'queued');
      
      // Complete obj_001 (all verified)
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      tracker.transitionEnvelope('env_002', 'executing', 'verified');
      tracker.transitionEnvelope('env_003', 'queued', 'executing');
      tracker.transitionEnvelope('env_003', 'executing', 'verified');
      
      // Fail obj_002 (one verified, one failed)
      tracker.transitionEnvelope('env_004', 'queued', 'executing');
      tracker.transitionEnvelope('env_004', 'executing', 'verified');
      tracker.transitionEnvelope('env_005', 'queued', 'executing');
      tracker.transitionEnvelope('env_005', 'executing', 'failed');
      
      const stats = tracker.getStats();
      
      expect(stats.total_objectives).toBe(2);
      expect(stats.by_status.complete).toBe(1); // obj_001
      expect(stats.by_status.failed).toBe(1); // obj_002
      expect(stats.envelope_totals.total).toBe(5);
      expect(stats.envelope_totals.verified).toBe(4);
      expect(stats.envelope_totals.failed).toBe(1);
    });
    
    test('clears objective and envelope mappings', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      const cleared = tracker.clearObjective('obj_001');
      
      expect(cleared).toBe(true);
      expect(tracker.getObjective('obj_001')).toBeNull();
      
      // Envelope mapping should be cleared
      expect(tracker.envelopeToObjective.has('env_001')).toBe(false);
      expect(tracker.envelopeToObjective.has('env_002')).toBe(false);
    });
    
    test('auto-registers objective when tracking envelope', () => {
      // Track envelope without registering objective first
      tracker.trackEnvelope('env_001', 'obj_auto', 'queued');
      
      const objective = tracker.getObjective('obj_auto');
      
      expect(objective).toBeDefined();
      expect(objective.queued).toBe(1);
    });
  });
  
  describe('Timeline Tracking', () => {
    test('sets queued_at on registration', () => {
      const before = new Date();
      tracker.registerObjective('obj_001', 1);
      const after = new Date();
      
      const objective = tracker.getObjective('obj_001');
      const queuedAt = new Date(objective.queued_at);
      
      expect(queuedAt >= before).toBe(true);
      expect(queuedAt <= after).toBe(true);
    });
    
    test('sets started_at when first envelope executes', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      // Verify started_at is null before execution
      let objective = tracker.getObjective('obj_001');
      expect(objective.started_at).toBeNull();
      
      // Start first envelope
      const before = new Date();
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      const after = new Date();
      
      objective = tracker.getObjective('obj_001');
      const startedAt = new Date(objective.started_at);
      
      expect(startedAt >= before).toBe(true);
      expect(startedAt <= after).toBe(true);
    });
    
    test('sets completed_at when all envelopes finish', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      // Complete first envelope
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      tracker.transitionEnvelope('env_001', 'executing', 'verified');
      
      // Verify completed_at is still null (one pending)
      let objective = tracker.getObjective('obj_001');
      expect(objective.completed_at).toBeNull();
      
      // Complete second envelope
      const before = new Date();
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      tracker.transitionEnvelope('env_002', 'executing', 'verified');
      const after = new Date();
      
      objective = tracker.getObjective('obj_001');
      const completedAt = new Date(objective.completed_at);
      
      expect(completedAt >= before).toBe(true);
      expect(completedAt <= after).toBe(true);
    });
    
    test('only sets started_at once', () => {
      tracker.registerObjective('obj_001', 2);
      tracker.trackEnvelope('env_001', 'obj_001', 'queued');
      tracker.trackEnvelope('env_002', 'obj_001', 'queued');
      
      // Start first envelope
      tracker.transitionEnvelope('env_001', 'queued', 'executing');
      const objective1 = tracker.getObjective('obj_001');
      const startedAt1 = objective1.started_at;
      
      // Start second envelope (should not change started_at)
      tracker.transitionEnvelope('env_002', 'queued', 'executing');
      const objective2 = tracker.getObjective('obj_001');
      const startedAt2 = objective2.started_at;
      
      expect(startedAt1).toBe(startedAt2);
    });
  });
  
  describe('Multi-Objective Tracking', () => {
    test('tracks multiple objectives independently', () => {
      tracker.registerObjective('obj_a', 2);
      tracker.registerObjective('obj_b', 3);
      
      tracker.trackEnvelope('env_a1', 'obj_a', 'queued');
      tracker.trackEnvelope('env_a2', 'obj_a', 'queued');
      
      tracker.trackEnvelope('env_b1', 'obj_b', 'queued');
      tracker.trackEnvelope('env_b2', 'obj_b', 'queued');
      tracker.trackEnvelope('env_b3', 'obj_b', 'queued');
      
      const objA = tracker.getObjective('obj_a');
      const objB = tracker.getObjective('obj_b');
      
      expect(objA.queued).toBe(2);
      expect(objB.queued).toBe(3);
      expect(objA.total_envelopes).toBe(2);
      expect(objB.total_envelopes).toBe(3);
    });
    
    test('transitions affect only target objective', () => {
      tracker.registerObjective('obj_a', 1);
      tracker.registerObjective('obj_b', 1);
      
      tracker.trackEnvelope('env_a1', 'obj_a', 'queued');
      tracker.trackEnvelope('env_b1', 'obj_b', 'queued');
      
      // Transition only obj_a
      tracker.transitionEnvelope('env_a1', 'queued', 'executing');
      
      const objA = tracker.getObjective('obj_a');
      const objB = tracker.getObjective('obj_b');
      
      expect(objA.executing).toBe(1);
      expect(objA.queued).toBe(0);
      expect(objB.executing).toBe(0);
      expect(objB.queued).toBe(1); // Unchanged
    });
  });
});
