/**
 * Phase 19 — Execution Coordinator Tests
 * 
 * Test distributed execution coordination
 */

const ExecutionCoordinator = require('../../lib/distributed/execution-coordinator-memory');

describe('Phase 19 — Execution Coordinator', () => {
  let coordinator;
  let mockNodeRegistry;
  let mockLockManager;

  beforeEach(() => {
    mockNodeRegistry = {
      findNodesByCapability: jest.fn(),
      updateLoad: jest.fn(),
      getNode: jest.fn()
    };

    mockLockManager = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn()
    };

    coordinator = new ExecutionCoordinator(mockNodeRegistry, mockLockManager);
  });

  describe('Category A: Work Distribution', () => {
    test('A1: Routes work to capable node', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001', current_load: 0.3, endpoint: 'http://node-001' }
      ]);

      const result = await coordinator.distributeWork({
        action_type: 'restart_service',
        required_capability: 'systemd',
        target_id: 'nginx'
      });

      expect(result.assigned_node).toBe('node-001');
      expect(mockNodeRegistry.findNodesByCapability).toHaveBeenCalledWith('systemd', expect.anything());
    });

    test('A2: Selects least loaded node when multiple available', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001', current_load: 0.7 },
        { node_id: 'node-002', current_load: 0.2 },
        { node_id: 'node-003', current_load: 0.5 }
      ]);

      const result = await coordinator.distributeWork({
        action_type: 'restart_service',
        required_capability: 'systemd'
      });

      expect(result.assigned_node).toBe('node-002');
    });

    test('A3: Returns null when no capable nodes available', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([]);

      const result = await coordinator.distributeWork({
        action_type: 'deploy_container',
        required_capability: 'kubernetes'
      });

      expect(result).toBeNull();
    });

    test('A4: Excludes overloaded nodes', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001', current_load: 0.95 },
        { node_id: 'node-002', current_load: 0.3 }
      ]);

      const result = await coordinator.distributeWork({
        action_type: 'restart_service',
        required_capability: 'systemd'
      }, { maxLoad: 0.9 });

      expect(result.assigned_node).toBe('node-002');
    });

    test('A5: Updates node load after assignment', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001', current_load: 0.5 }
      ]);

      await coordinator.distributeWork({
        action_type: 'restart_service',
        required_capability: 'systemd'
      });

      expect(mockNodeRegistry.updateLoad).toHaveBeenCalledWith('node-001', expect.any(Number));
    });
  });

  describe('Category B: Cross-Node Locking', () => {
    test('B1: Acquires lock before execution', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);
      mockLockManager.acquireLock.mockResolvedValue({ acquired: true, lock_id: 'lock-001' });

      const result = await coordinator.executeWithLock({
        action_type: 'restart_service',
        target_id: 'nginx',
        required_capability: 'systemd'
      });

      expect(mockLockManager.acquireLock).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_id: 'nginx',
          scope: 'target'
        })
      );
      expect(result.lock_acquired).toBe(true);
    });

    test('B2: Blocks execution when lock unavailable', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);
      mockLockManager.acquireLock.mockResolvedValue({ acquired: false, reason: 'held by node-002' });

      const result = await coordinator.executeWithLock({
        action_type: 'restart_service',
        target_id: 'postgres',
        required_capability: 'systemd'
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('lock');
    });

    test('B3: Releases lock after execution', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);
      mockLockManager.acquireLock.mockResolvedValue({ acquired: true, lock_id: 'lock-001' });

      await coordinator.executeWithLock({
        action_type: 'restart_service',
        target_id: 'nginx',
        required_capability: 'systemd'
      });

      expect(mockLockManager.releaseLock).toHaveBeenCalledWith('lock-001');
    });

    test('B4: Releases lock even on execution failure', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);
      mockLockManager.acquireLock.mockResolvedValue({ acquired: true, lock_id: 'lock-001' });

      // Force execution failure
      coordinator._executeOnNode = jest.fn().mockRejectedValue(new Error('Execution failed'));

      try {
        await coordinator.executeWithLock({
          action_type: 'restart_service',
          target_id: 'nginx',
          required_capability: 'systemd'
        });
      } catch (e) {
        // Expected
      }

      expect(mockLockManager.releaseLock).toHaveBeenCalledWith('lock-001');
    });

    test('B5: Supports different lock scopes', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);
      mockLockManager.acquireLock.mockResolvedValue({ acquired: true, lock_id: 'lock-001' });

      await coordinator.executeWithLock({
        action_type: 'deploy_app',
        target_id: 'app-001',
        required_capability: 'docker'
      }, { lockScope: 'global' });

      expect(mockLockManager.acquireLock).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'global'
        })
      );
    });
  });

  describe('Category C: Result Aggregation', () => {
    test('C1: Collects results from single node', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);

      coordinator._executeOnNode = jest.fn().mockResolvedValue({
        status: 'completed',
        result: { service: 'nginx', state: 'running' }
      });

      const result = await coordinator.distributeWork({
        action_type: 'check_service',
        required_capability: 'systemd'
      });

      expect(result.results).toBeTruthy();
      expect(result.results[0].status).toBe('completed');
    });

    test('C2: Aggregates results from multiple nodes', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' },
        { node_id: 'node-002' }
      ]);

      coordinator._executeOnNode = jest.fn()
        .mockResolvedValueOnce({ status: 'completed', node_id: 'node-001' })
        .mockResolvedValueOnce({ status: 'completed', node_id: 'node-002' });

      const result = await coordinator.broadcastWork({
        action_type: 'health_check',
        required_capability: 'systemd'
      });

      expect(result.results.length).toBe(2);
      expect(result.results[0].node_id).toBe('node-001');
      expect(result.results[1].node_id).toBe('node-002');
    });

    test('C3: Marks partial failure when some nodes fail', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' },
        { node_id: 'node-002' }
      ]);

      coordinator._executeOnNode = jest.fn()
        .mockResolvedValueOnce({ status: 'completed' })
        .mockRejectedValueOnce(new Error('Node unreachable'));

      const result = await coordinator.broadcastWork({
        action_type: 'health_check',
        required_capability: 'systemd'
      });

      expect(result.status).toBe('partial_failure');
      expect(result.successful_count).toBe(1);
      expect(result.failed_count).toBe(1);
    });

    test('C4: Includes execution timing', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' }
      ]);

      coordinator._executeOnNode = jest.fn().mockResolvedValue({ status: 'completed' });

      const result = await coordinator.distributeWork({
        action_type: 'restart_service',
        required_capability: 'systemd'
      });

      expect(result.duration_ms).toBeGreaterThan(0);
    });

    test('C5: Returns summary statistics', async () => {
      mockNodeRegistry.findNodesByCapability.mockReturnValue([
        { node_id: 'node-001' },
        { node_id: 'node-002' },
        { node_id: 'node-003' }
      ]);

      coordinator._executeOnNode = jest.fn()
        .mockResolvedValueOnce({ status: 'completed' })
        .mockResolvedValueOnce({ status: 'completed' })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await coordinator.broadcastWork({
        action_type: 'update_config',
        required_capability: 'systemd'
      });

      expect(result.summary.total_nodes).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.success_rate).toBeCloseTo(0.67, 1);
    });
  });
});
