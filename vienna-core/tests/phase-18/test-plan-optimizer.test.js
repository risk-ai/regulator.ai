/**
 * Phase 18 — Plan Optimizer Tests
 */

const PlanOptimizer = require('../../lib/learning/plan-optimizer');

describe('Phase 18 — Plan Optimizer', () => {
  let optimizer;
  let mockStateGraph;

  beforeEach(() => {
    mockStateGraph = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    };

    optimizer = new PlanOptimizer(mockStateGraph);
  });

  describe('Category A: Step Reordering', () => {
    test('A1: Identifies skippable steps', async () => {
      // Mock implementation
      optimizer._getExecutionHistory = jest.fn().mockResolvedValue([
        { duration_ms: 10000, step_results: [{ step_id: 'step1', skipped: true, duration_ms: 5000 }] }
      ].concat(Array(14).fill({ duration_ms: 10000, step_results: [{ step_id: 'step1', skipped: true, duration_ms: 5000 }] })));

      const improvement = await optimizer.suggestStepReordering('plan_001');

      expect(improvement).toBeTruthy();
      expect(improvement.improvement_type).toBe('step_reordering');
    });

    test('A2: Returns null if insufficient data', async () => {
      optimizer._getExecutionHistory = jest.fn().mockResolvedValue([]);

      const improvement = await optimizer.suggestStepReordering('plan_001');

      expect(improvement).toBeNull();
    });
  });

  describe('Category B: Verification Adjustment', () => {
    test('B1: Suggests downgrade from strong to medium', async () => {
      optimizer._getExecutionHistory = jest.fn().mockResolvedValue(
        Array(15).fill({
          verification_result: JSON.stringify({
            checks: [
              { check_id: 'c1', check_type: 'strong', result: 'pass', duration_ms: 1000 },
              { check_id: 'c2', check_type: 'medium', result: 'pass', duration_ms: 500 }
            ],
            total_duration_ms: 1500
          })
        })
      );

      const improvement = await optimizer.suggestVerificationAdjustment('plan_001');

      expect(improvement).toBeTruthy();
    });
  });

  describe('Category C: Retry Tuning', () => {
    test('C1: Suggests reducing max attempts', async () => {
      optimizer._getExecutionHistory = jest.fn().mockResolvedValue(
        Array(15).fill({
          retry_count: 1,
          status: 'completed',
          max_retry_attempts: 5,
          duration_ms: 5000,
          retry_duration_ms: 2000
        })
      );

      const improvement = await optimizer.suggestRetryTuning('plan_001');

      expect(improvement).toBeTruthy();
      expect(improvement.proposed_change.to_max_attempts).toBe(2);
    });
  });

  describe('Category D: Timeout Adjustment', () => {
    test('D1: Suggests reducing timeout', async () => {
      optimizer._getExecutionHistory = jest.fn().mockResolvedValue(
        Array(15).fill({
          status: 'completed',
          duration_ms: 5000,
          timeout_ms: 60000
        })
      );

      const improvement = await optimizer.suggestTimeoutAdjustment('plan_001');

      expect(improvement).toBeTruthy();
      expect(improvement.proposed_change.to_timeout_ms).toBeLessThan(60000);
    });
  });
});
