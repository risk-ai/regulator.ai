/**
 * Phase 18 — Pattern Detector Tests
 */

const { PatternDetector, PatternType } = require('../../lib/learning/pattern-detector');

describe('Phase 18 — Pattern Detector', () => {
  let detector;
  let mockStateGraph;

  beforeEach(() => {
    mockStateGraph = {
      listExecutionLedgerSummaries: jest.fn(),
      listPolicyDecisions: jest.fn(),
      listWorkflowOutcomes: jest.fn()
    };

    detector = new PatternDetector(mockStateGraph);
  });

  // Category A: Failure Clustering (5 tests)
  describe('Category A: Failure Clustering', () => {
    test('A1: Detects failure cluster with sufficient occurrences', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern_type).toBe(PatternType.FAILURE_CLUSTER);
      expect(patterns[0].event_count).toBe(3);
    });

    test('A2: Filters out clusters below min occurrences', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns.length).toBe(0);
    });

    test('A3: Normalizes failure reasons correctly', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'Connection timeout after 30s' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'Request timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'Timeout error' }), created_at: '2026-03-20T12:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].metadata.failure_reason).toBe('timeout');
    });

    test('A4: Calculates confidence based on event count', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' },
        { execution_id: 'e4', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T13:00:00Z' },
        { execution_id: 'e5', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T14:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });

    test('A5: Includes evidence in pattern metadata', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns[0].metadata.evidence).toContain('e1');
      expect(patterns[0].metadata.evidence).toContain('e2');
      expect(patterns[0].metadata.evidence).toContain('e3');
    });
  });

  // Category B: Policy Conflict Detection (5 tests)
  describe('Category B: Policy Conflict Detection', () => {
    test('B1: Detects policy conflicts with sufficient denials', async () => {
      mockStateGraph.listPolicyDecisions.mockResolvedValue([
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit', execution_id: 'e1' }), created_at: '2026-03-20T10:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit', execution_id: 'e2' }), created_at: '2026-03-20T11:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit', execution_id: 'e3' }), created_at: '2026-03-20T12:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit', execution_id: 'e4' }), created_at: '2026-03-20T13:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit', execution_id: 'e5' }), created_at: '2026-03-20T14:00:00Z' }
      ]);

      const patterns = await detector.detectPolicyConflicts({ minDenials: 5 });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern_type).toBe(PatternType.POLICY_CONFLICT);
      expect(patterns[0].policy_id).toBe('p1');
    });

    test('B2: Filters out conflicts below min denials', async () => {
      mockStateGraph.listPolicyDecisions.mockResolvedValue([
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T10:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T11:00:00Z' }
      ]);

      const patterns = await detector.detectPolicyConflicts({ minDenials: 5 });

      expect(patterns.length).toBe(0);
    });

    test('B3: Captures constraint type in metadata', async () => {
      mockStateGraph.listPolicyDecisions.mockResolvedValue([
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'time_window' }), created_at: '2026-03-20T10:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'time_window' }), created_at: '2026-03-20T11:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'time_window' }), created_at: '2026-03-20T12:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'time_window' }), created_at: '2026-03-20T13:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'time_window' }), created_at: '2026-03-20T14:00:00Z' }
      ]);

      const patterns = await detector.detectPolicyConflicts({ minDenials: 5 });

      expect(patterns[0].metadata.constraint_type).toBe('time_window');
    });

    test('B4: Calculates confidence for policy conflicts', async () => {
      mockStateGraph.listPolicyDecisions.mockResolvedValue([
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T10:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T11:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T12:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T13:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T14:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T15:00:00Z' }
      ]);

      const patterns = await detector.detectPolicyConflicts({ minDenials: 5 });

      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });

    test('B5: Groups denials by policy and constraint type', async () => {
      mockStateGraph.listPolicyDecisions.mockResolvedValue([
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T10:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'rate_limit' }), created_at: '2026-03-20T11:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'cooldown' }), created_at: '2026-03-20T12:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'cooldown' }), created_at: '2026-03-20T13:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'cooldown' }), created_at: '2026-03-20T14:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'cooldown' }), created_at: '2026-03-20T15:00:00Z' },
        { policy_id: 'p1', decision: 'deny', metadata: JSON.stringify({ failed_constraint_type: 'cooldown' }), created_at: '2026-03-20T16:00:00Z' }
      ]);

      const patterns = await detector.detectPolicyConflicts({ minDenials: 5 });

      expect(patterns.length).toBe(1); // Only cooldown has 5+ denials
      expect(patterns[0].metadata.constraint_type).toBe('cooldown');
    });
  });

  // Category C: Remediation Effectiveness (5 tests)
  describe('Category C: Remediation Effectiveness', () => {
    test('C1: Tracks success rate by action type', async () => {
      mockStateGraph.listWorkflowOutcomes.mockResolvedValue([
        { execution_id: 'e1', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', objective_achieved: false, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T12:00:00Z' },
        { execution_id: 'e4', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T13:00:00Z' },
        { execution_id: 'e5', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T14:00:00Z' },
        { execution_id: 'e6', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T15:00:00Z' },
        { execution_id: 'e7', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T16:00:00Z' },
        { execution_id: 'e8', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T17:00:00Z' },
        { execution_id: 'e9', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T18:00:00Z' },
        { execution_id: 'e10', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T19:00:00Z' }
      ]);

      const patterns = await detector.detectRemediationEffectiveness({ minExecutions: 10 });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].metadata.success_rate).toBe(0.9);
    });

    test('C2: Filters by min executions', async () => {
      mockStateGraph.listWorkflowOutcomes.mockResolvedValue([
        { execution_id: 'e1', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart' }), created_at: '2026-03-20T11:00:00Z' }
      ]);

      const patterns = await detector.detectRemediationEffectiveness({ minExecutions: 10 });

      expect(patterns.length).toBe(0);
    });

    test('C3: Calculates confidence from sample size', async () => {
      const outcomes = [];
      for (let i = 0; i < 50; i++) {
        outcomes.push({
          execution_id: `e${i}`,
          objective_achieved: i < 45, // 90% success
          metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }),
          created_at: `2026-03-20T${String(i).padStart(2, '0')}:00:00Z`
        });
      }

      mockStateGraph.listWorkflowOutcomes.mockResolvedValue(outcomes);

      const patterns = await detector.detectRemediationEffectiveness({ minExecutions: 10 });

      expect(patterns[0].confidence).toBeGreaterThan(0.8);
    });

    test('C4: Tracks both successes and failures', async () => {
      mockStateGraph.listWorkflowOutcomes.mockResolvedValue([
        { execution_id: 'e1', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', objective_achieved: false, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T12:00:00Z' },
        { execution_id: 'e4', objective_achieved: false, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T13:00:00Z' },
        { execution_id: 'e5', objective_achieved: false, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T14:00:00Z' },
        { execution_id: 'e6', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T15:00:00Z' },
        { execution_id: 'e7', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T16:00:00Z' },
        { execution_id: 'e8', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T17:00:00Z' },
        { execution_id: 'e9', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T18:00:00Z' },
        { execution_id: 'e10', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T19:00:00Z' }
      ]);

      const patterns = await detector.detectRemediationEffectiveness({ minExecutions: 10 });

      expect(patterns[0].metadata.success_count).toBe(7);
      expect(patterns[0].metadata.failure_count).toBe(3);
    });

    test('C5: Includes evidence execution IDs', async () => {
      mockStateGraph.listWorkflowOutcomes.mockResolvedValue([
        { execution_id: 'e1', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T12:00:00Z' },
        { execution_id: 'e4', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T13:00:00Z' },
        { execution_id: 'e5', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T14:00:00Z' },
        { execution_id: 'e6', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T15:00:00Z' },
        { execution_id: 'e7', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T16:00:00Z' },
        { execution_id: 'e8', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T17:00:00Z' },
        { execution_id: 'e9', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T18:00:00Z' },
        { execution_id: 'e10', objective_achieved: true, metadata: JSON.stringify({ action_type: 'restart', target_type: 'service' }), created_at: '2026-03-20T19:00:00Z' }
      ]);

      const patterns = await detector.detectRemediationEffectiveness({ minExecutions: 10 });

      expect(patterns[0].metadata.evidence).toContain('e1');
      expect(patterns[0].metadata.evidence.length).toBe(10);
    });
  });

  // Category D: Pattern ID Generation (3 tests)
  describe('Category D: Pattern ID Generation', () => {
    test('D1: Generates deterministic IDs', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' }
      ]);

      const patterns1 = await detector.detectFailureClusters({ minOccurrences: 3 });
      const patterns2 = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns1[0].pattern_id).toBe(patterns2[0].pattern_id);
    });

    test('D2: IDs start with pat_ prefix', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns[0].pattern_id).toMatch(/^pat_/);
    });

    test('D3: Different patterns get different IDs', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T10:00:00Z' },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-20T12:00:00Z' },
        { execution_id: 'e4', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc2', error: 'timeout' }), created_at: '2026-03-20T13:00:00Z' },
        { execution_id: 'e5', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc2', error: 'timeout' }), created_at: '2026-03-20T14:00:00Z' },
        { execution_id: 'e6', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc2', error: 'timeout' }), created_at: '2026-03-20T15:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3 });

      expect(patterns.length).toBe(2);
      expect(patterns[0].pattern_id).not.toBe(patterns[1].pattern_id);
    });
  });

  // Category E: Confidence Thresholds (2 tests)
  describe('Category E: Confidence Thresholds', () => {
    test('E1: Filters patterns below min confidence', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-15T10:00:00Z' }, // Old
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-15T11:00:00Z' },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: '2026-03-15T12:00:00Z' }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3, minConfidence: 0.9 });

      // Old failures (6 days ago) should have lower confidence
      expect(patterns.length).toBe(0); // Or filtered out
    });

    test('E2: Accepts patterns above min confidence', async () => {
      mockStateGraph.listExecutionLedgerSummaries.mockResolvedValue([
        { execution_id: 'e1', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { execution_id: 'e2', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        { execution_id: 'e3', metadata: JSON.stringify({ action_type: 'restart', target_id: 'svc1', error: 'timeout' }), created_at: new Date().toISOString() }
      ]);

      const patterns = await detector.detectFailureClusters({ minOccurrences: 3, minConfidence: 0.7 });

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeGreaterThanOrEqual(0.7);
    });
  });
});
