/**
 * Phase 19.1 — Remote Dispatcher Tests
 * 
 * Test remote execution dispatch and result handling
 */

const RemoteDispatcher = require('../../lib/distributed/remote-dispatcher-memory');

describe('Phase 19.1 — Remote Dispatcher', () => {
  let dispatcher;
  let mockNodeClient;

  beforeEach(() => {
    mockNodeClient = {
      executeRemote: jest.fn(),
      streamResults: jest.fn(),
      checkHealth: jest.fn()
    };

    dispatcher = new RemoteDispatcher(mockNodeClient);
  });

  describe('Category A: Remote Execution', () => {
    test('A1: Dispatches plan to remote node', async () => {
      mockNodeClient.executeRemote.mockResolvedValue({
        execution_id: 'exec-001',
        status: 'accepted'
      });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: {
          plan_id: 'plan-001',
          steps: [{ action: 'restart', target: 'nginx' }]
        }
      });

      expect(result.dispatched).toBe(true);
      expect(result.execution_id).toBe('exec-001');
      expect(mockNodeClient.executeRemote).toHaveBeenCalledWith(
        'node-001',
        expect.objectContaining({ plan_id: 'plan-001' })
      );
    });

    test('A2: Includes execution context in dispatch', async () => {
      mockNodeClient.executeRemote.mockResolvedValue({ execution_id: 'exec-001', status: 'accepted' });

      await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' },
        context: {
          actor_id: 'operator-max',
          risk_tier: 'T1',
          approval_id: 'apr-001'
        }
      });

      expect(mockNodeClient.executeRemote).toHaveBeenCalledWith(
        'node-001',
        expect.objectContaining({
          context: expect.objectContaining({
            actor_id: 'operator-max',
            risk_tier: 'T1'
          })
        })
      );
    });

    test('A3: Handles node unavailable error', async () => {
      mockNodeClient.executeRemote.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      });

      expect(result.dispatched).toBe(false);
      expect(result.error).toContain('unavailable');
    });

    test('A4: Retries on transient failure', async () => {
      mockNodeClient.executeRemote
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ execution_id: 'exec-001', status: 'accepted' });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      }, { maxRetries: 2 });

      expect(result.dispatched).toBe(true);
      expect(mockNodeClient.executeRemote).toHaveBeenCalledTimes(2);
    });

    test('A5: Tracks dispatch timing', async () => {
      mockNodeClient.executeRemote.mockResolvedValue({ execution_id: 'exec-001', status: 'accepted' });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      });

      expect(result.dispatch_duration_ms).toBeGreaterThan(0);
    });
  });

  describe('Category B: Result Streaming', () => {
    test('B1: Streams execution updates', async () => {
      const updates = [
        { event: 'step_started', step_id: 'step-1' },
        { event: 'step_completed', step_id: 'step-1', result: 'success' },
        { event: 'execution_completed', status: 'success' }
      ];

      mockNodeClient.streamResults.mockImplementation((nodeId, execId, callback) => {
        updates.forEach(u => callback(u));
        return Promise.resolve();
      });

      const receivedUpdates = [];
      await dispatcher.streamRemoteExecution('node-001', 'exec-001', (update) => {
        receivedUpdates.push(update);
      });

      expect(receivedUpdates.length).toBe(3);
      expect(receivedUpdates[0].event).toBe('step_started');
      expect(receivedUpdates[2].event).toBe('execution_completed');
    });

    test('B2: Handles stream interruption gracefully', async () => {
      mockNodeClient.streamResults.mockRejectedValue(new Error('Connection lost'));

      const updates = [];
      const result = await dispatcher.streamRemoteExecution('node-001', 'exec-001', (update) => {
        updates.push(update);
      });

      expect(result.stream_interrupted).toBe(true);
      expect(result.error).toContain('Connection lost');
    });

    test('B3: Provides progress percentage', async () => {
      const updates = [
        { event: 'step_started', step_id: 'step-1', progress: 0.33 },
        { event: 'step_completed', step_id: 'step-1', progress: 0.5 },
        { event: 'execution_completed', progress: 1.0 }
      ];

      mockNodeClient.streamResults.mockImplementation((nodeId, execId, callback) => {
        updates.forEach(u => callback(u));
        return Promise.resolve();
      });

      const progressValues = [];
      await dispatcher.streamRemoteExecution('node-001', 'exec-001', (update) => {
        if (update.progress !== undefined) {
          progressValues.push(update.progress);
        }
      });

      expect(progressValues).toEqual([0.33, 0.5, 1.0]);
    });

    test('B4: Buffers updates when callback slow', async () => {
      const updates = Array(100).fill(null).map((_, i) => ({
        event: 'log',
        message: `Log line ${i}`
      }));

      mockNodeClient.streamResults.mockImplementation((nodeId, execId, callback) => {
        updates.forEach(u => callback(u));
        return Promise.resolve();
      });

      let callbackCount = 0;
      await dispatcher.streamRemoteExecution('node-001', 'exec-001', async (update) => {
        callbackCount++;
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 1));
      });

      expect(callbackCount).toBe(100);
    });

    test('B5: Closes stream on completion', async () => {
      mockNodeClient.streamResults.mockResolvedValue();

      const result = await dispatcher.streamRemoteExecution('node-001', 'exec-001', () => {});

      expect(result.stream_closed).toBe(true);
    });
  });

  describe('Category C: Failure Handling', () => {
    test('C1: Detects node timeout', async () => {
      mockNodeClient.executeRemote.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ execution_id: 'exec-001' }), 10000);
        });
      });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      }, { timeoutMs: 100 });

      expect(result.dispatched).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('C2: Handles execution rejection', async () => {
      mockNodeClient.executeRemote.mockResolvedValue({
        status: 'rejected',
        reason: 'Node overloaded'
      });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      });

      expect(result.dispatched).toBe(false);
      expect(result.reason).toBe('Node overloaded');
    });

    test('C3: Falls back to local execution on failure', async () => {
      mockNodeClient.executeRemote.mockRejectedValue(new Error('Node unreachable'));

      dispatcher.setFallbackHandler(jest.fn().mockResolvedValue({ status: 'completed' }));

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      }, { fallbackToLocal: true });

      expect(result.fallback_executed).toBe(true);
    });

    test('C4: Records failure in dispatch log', async () => {
      mockNodeClient.executeRemote.mockRejectedValue(new Error('Connection refused'));

      await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      });

      const log = dispatcher.getDispatchLog();
      expect(log.length).toBe(1);
      expect(log[0].status).toBe('failed');
      expect(log[0].error).toContain('Connection refused');
    });

    test('C5: Provides failure recovery suggestions', async () => {
      mockNodeClient.executeRemote.mockRejectedValue(new Error('Authentication failed'));

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: { plan_id: 'plan-001' }
      });

      expect(result.recovery_suggestions).toContain('Check node credentials');
    });
  });

  describe('Category D: Capability Negotiation', () => {
    test('D1: Queries node capabilities before dispatch', async () => {
      mockNodeClient.checkHealth.mockResolvedValue({
        healthy: true,
        capabilities: ['systemd', 'docker']
      });

      const capabilities = await dispatcher.negotiateCapabilities('node-001');

      expect(capabilities).toContain('systemd');
      expect(capabilities).toContain('docker');
    });

    test('D2: Validates plan against node capabilities', async () => {
      mockNodeClient.checkHealth.mockResolvedValue({
        healthy: true,
        capabilities: ['systemd']
      });

      const result = await dispatcher.dispatchPlan({
        node_id: 'node-001',
        plan: {
          plan_id: 'plan-001',
          required_capability: 'kubernetes'
        }
      }, { validateCapabilities: true });

      expect(result.dispatched).toBe(false);
      expect(result.reason).toContain('capability mismatch');
    });

    test('D3: Caches capabilities for recent queries', async () => {
      mockNodeClient.checkHealth.mockResolvedValue({
        healthy: true,
        capabilities: ['systemd']
      });

      await dispatcher.negotiateCapabilities('node-001');
      await dispatcher.negotiateCapabilities('node-001');

      expect(mockNodeClient.checkHealth).toHaveBeenCalledTimes(1);
    });

    test('D4: Refreshes capabilities after cache expiry', async () => {
      mockNodeClient.checkHealth.mockResolvedValue({
        healthy: true,
        capabilities: ['systemd']
      });

      await dispatcher.negotiateCapabilities('node-001');
      
      // Simulate cache expiry
      dispatcher._clearCapabilityCache();
      
      await dispatcher.negotiateCapabilities('node-001');

      expect(mockNodeClient.checkHealth).toHaveBeenCalledTimes(2);
    });

    test('D5: Includes version negotiation', async () => {
      mockNodeClient.checkHealth.mockResolvedValue({
        healthy: true,
        version: '2.0.0',
        capabilities: ['systemd']
      });

      const result = await dispatcher.negotiateCapabilities('node-001');

      expect(result.version).toBe('2.0.0');
      expect(result.compatible).toBe(true);
    });
  });
});
