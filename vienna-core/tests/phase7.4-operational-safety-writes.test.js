/**
 * Phase 7.4: Operational Safety Integration Pass
 * 
 * Validates operational safety state writes to State Graph.
 * 
 * Success criteria:
 * 1. writePauseState() persists pause state to runtime_context
 * 2. writeDLQStats() persists DLQ stats to runtime_context
 * 3. writeHealthState() persists executor health to runtime_context
 * 4. writeIntegrityCheck() persists integrity results to runtime_context
 * 5. writeRateLimitState() persists rate limit state
 * 6. writeAgentBudgetState() persists agent budget state
 * 7. Writes are non-blocking (continue on error)
 * 8. Feature flag controls write behavior
 * 9. reconcileOperationalSafety() writes all states on startup
 * 10. DB failure does not block operational logic
 */

const { OperationalSafetyWriter } = require('../lib/core/operational-safety-writer');

describe('Phase 7.4 - Operational Safety Writes', () => {
  describe('Pause State Writes', () => {
    test('writePauseState() persists pause state to runtime_context', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const pauseState = {
        paused: true,
        paused_at: '2026-03-12T18:00:00.000Z',
        resumed_at: null,
        reason: 'Operator testing',
        paused_by: 'max'
      };

      await writer.writePauseState(pauseState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'execution_paused',
        'true',
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            paused_at: '2026-03-12T18:00:00.000Z',
            reason: 'Operator testing',
            paused_by: 'max'
          })
        })
      );
    });

    test('writePauseState() persists resume state', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const pauseState = {
        paused: false,
        paused_at: '2026-03-12T18:00:00.000Z',
        resumed_at: '2026-03-12T18:05:00.000Z',
        reason: null,
        paused_by: null
      };

      await writer.writePauseState(pauseState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'execution_paused',
        'false',
        expect.objectContaining({
          metadata: expect.objectContaining({
            resumed_at: '2026-03-12T18:05:00.000Z'
          })
        })
      );
    });
  });

  describe('DLQ Stats Writes', () => {
    test('writeDLQStats() persists DLQ stats to runtime_context', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const dlqStats = {
        total: 5,
        by_state: { dead_lettered: 3, cancelled: 2 },
        by_reason: { timeout: 3, error: 2 }
      };

      await writer.writeDLQStats(dlqStats);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'dlq_stats',
        JSON.stringify(dlqStats),
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            total: 5,
            by_state: { dead_lettered: 3, cancelled: 2 }
          })
        })
      );
    });
  });

  describe('Health State Writes', () => {
    test('writeHealthState() persists executor health to runtime_context', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const healthState = {
        state: 'HEALTHY',
        executor_ready: true,
        queue_healthy: true,
        checks: { queue: 'pass', executor: 'pass' },
        metrics: { avg_latency_ms: 150 },
        timestamp: '2026-03-12T18:00:00.000Z'
      };

      await writer.writeHealthState(healthState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'executor_health',
        'HEALTHY',
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            executor_ready: true,
            queue_healthy: true,
            checks: { queue: 'pass', executor: 'pass' }
          })
        })
      );
    });

    test('writeHealthState() persists degraded health', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const healthState = {
        state: 'WARNING',
        executor_ready: true,
        queue_healthy: false,
        checks: { queue: 'fail', executor: 'pass' }
      };

      await writer.writeHealthState(healthState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'executor_health',
        'WARNING',
        expect.any(Object)
      );
    });
  });

  describe('Integrity Check Writes', () => {
    test('writeIntegrityCheck() persists integrity results', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const integrityResult = {
        passed: true,
        issues: [],
        checks_performed: ['queue_integrity', 'state_coherence']
      };

      await writer.writeIntegrityCheck(integrityResult);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'integrity_check',
        'passed',
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            passed: true,
            issues: [],
            checks_performed: ['queue_integrity', 'state_coherence']
          })
        })
      );
    });

    test('writeIntegrityCheck() persists integrity failures', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const integrityResult = {
        passed: false,
        issues: ['Orphaned envelope detected'],
        checks_performed: ['queue_integrity']
      };

      await writer.writeIntegrityCheck(integrityResult);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'integrity_check',
        'failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            passed: false,
            issues: ['Orphaned envelope detected']
          })
        })
      );
    });
  });

  describe('Rate Limit State Writes', () => {
    test('writeRateLimitState() persists rate limit state', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const limitState = {
        limited: true,
        requests: 100,
        limit: 100,
        window_ms: 60000,
        reset_at: '2026-03-12T18:01:00.000Z'
      };

      await writer.writeRateLimitState('global', limitState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'rate_limit_global',
        JSON.stringify(limitState),
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            scope: 'global',
            limited: true,
            requests: 100,
            limit: 100
          })
        })
      );
    });
  });

  describe('Agent Budget State Writes', () => {
    test('writeAgentBudgetState() persists agent budget state', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const budgetState = {
        exceeded: false,
        used: 50,
        limit: 100,
        reset_at: '2026-03-12T19:00:00.000Z'
      };

      await writer.writeAgentBudgetState('vienna', budgetState);

      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'agent_budget_vienna',
        JSON.stringify(budgetState),
        expect.objectContaining({
          context_type: 'status',
          metadata: expect.objectContaining({
            agent_id: 'vienna',
            exceeded: false,
            used: 50,
            limit: 100
          })
        })
      );
    });
  });

  describe('Non-Blocking Behavior', () => {
    test('Continues operation if State Graph write fails', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockRejectedValue(new Error('DB error'))
      };

      writer.setStateGraph(mockStateGraph, true);

      const pauseState = { paused: true, paused_at: '2026-03-12T18:00:00.000Z' };

      // Should not throw (fire-and-forget write)
      await expect(writer.writePauseState(pauseState)).resolves.not.toThrow();
    });

    test('Handles null State Graph gracefully', async () => {
      const writer = new OperationalSafetyWriter();

      writer.setStateGraph(null, true);

      const pauseState = { paused: true, paused_at: '2026-03-12T18:00:00.000Z' };

      // Should not throw
      await expect(writer.writePauseState(pauseState)).resolves.not.toThrow();
    });
  });

  describe('Feature Flag Control', () => {
    test('Feature flag disables writes', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn()
      };

      writer.setStateGraph(mockStateGraph, false); // Disabled

      const pauseState = { paused: true, paused_at: '2026-03-12T18:00:00.000Z' };

      await writer.writePauseState(pauseState);

      // No write should occur
      expect(mockStateGraph.setRuntimeContext).not.toHaveBeenCalled();
    });
  });

  describe('Startup Reconciliation', () => {
    test('reconcileOperationalSafety() writes all states on startup', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };

      writer.setStateGraph(mockStateGraph, true);

      const mockExecutionControl = {
        getExecutionState: jest.fn().mockReturnValue({
          paused: false,
          paused_at: null,
          resumed_at: null,
          reason: null,
          paused_by: null
        })
      };

      const mockDLQ = {
        getStats: jest.fn().mockReturnValue({
          total: 0,
          by_state: {},
          by_reason: {}
        })
      };

      const mockHealth = {
        getHealthState: jest.fn().mockReturnValue({
          state: 'HEALTHY',
          executor_ready: true,
          queue_healthy: true
        })
      };

      await writer.reconcileOperationalSafety(mockExecutionControl, mockDLQ, mockHealth, null);

      // Should write pause state, DLQ stats, health state
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledTimes(3);
    });

    test('Reconciliation handles write failure gracefully', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockRejectedValue(new Error('DB error'))
      };

      writer.setStateGraph(mockStateGraph, true);

      const mockExecutionControl = {
        getExecutionState: jest.fn().mockReturnValue({ paused: false })
      };

      // Should not throw
      await expect(
        writer.reconcileOperationalSafety(mockExecutionControl, null, null, null)
      ).resolves.not.toThrow();
    });

    test('Reconciliation skips when writes disabled', async () => {
      const writer = new OperationalSafetyWriter();

      const mockStateGraph = {
        setRuntimeContext: jest.fn()
      };

      writer.setStateGraph(mockStateGraph, false); // Disabled

      const mockExecutionControl = {
        getExecutionState: jest.fn().mockReturnValue({ paused: false })
      };

      await writer.reconcileOperationalSafety(mockExecutionControl, null, null, null);

      // No writes should occur
      expect(mockStateGraph.setRuntimeContext).not.toHaveBeenCalled();
    });
  });
});
