/**
 * Phase 18 — Feedback Integrator Tests
 */

const FeedbackIntegrator = require('../../lib/learning/feedback-integrator');

describe('Phase 18 — Feedback Integrator', () => {
  let integrator;
  let mockStateGraph;

  beforeEach(() => {
    mockStateGraph = {
      run: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      all: jest.fn()
    };

    integrator = new FeedbackIntegrator(mockStateGraph);
  });

  describe('Category A: Approval Patterns', () => {
    test('A1: Detects high approval rate', async () => {
      integrator._getOperatorFeedback = jest.fn().mockResolvedValue(
        Array(10).fill({
          action_type: 'restart_service',
          target_id: 'auth-api',
          decision: 'approved',
          time_to_decision_ms: 120000
        })
      );

      const patterns = await integrator.analyzeApprovalPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern_type).toBe('high_approval_rate');
    });

    test('A2: Detects high denial rate', async () => {
      integrator._getOperatorFeedback = jest.fn().mockResolvedValue(
        Array(10).fill({
          action_type: 'restart_service',
          target_id: 'auth-api',
          decision: 'denied',
          reason: 'Business hours'
        })
      );

      const patterns = await integrator.analyzeApprovalPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern_type).toBe('high_denial_rate');
    });
  });

  describe('Category B: Denial Patterns', () => {
    test('B1: Detects time-based denials', async () => {
      integrator._getOperatorFeedback = jest.fn().mockResolvedValue(
        Array(5).fill({
          reason: 'Business hours',
          timestamp: new Date().toISOString(),
          target_id: 'auth-api'
        })
      );

      const patterns = await integrator.analyzeDenialPatterns();

      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Category C: Override Patterns', () => {
    test('C1: Detects policy overrides', async () => {
      integrator._getOperatorFeedback = jest.fn().mockResolvedValue(
        Array(5).fill({
          source: 'override',
          action_type: 'restart_service',
          reason: 'policy_too_strict'
        })
      );

      const patterns = await integrator.analyzeOverridePatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern_type).toBe('policy_override');
    });
  });

  describe('Category D: Feedback Recording', () => {
    test('D1: Records feedback', async () => {
      const feedback = {
        source: 'approval',
        action_type: 'restart_service',
        target_id: 'auth-api',
        operator: 'op1',
        decision: 'approved',
        reason: 'Approved',
        context: { approval_id: 'appr_001' }
      };

      const record = await integrator.recordFeedback(feedback);

      expect(record.feedback_id).toMatch(/^fb_/);
      expect(mockStateGraph.run).toHaveBeenCalled();
    });

    test('D2: Marks feedback as processed', async () => {
      await integrator.markFeedbackProcessed('fb_001');

      expect(mockStateGraph.run).toHaveBeenCalled();
    });
  });
});
