/**
 * Phase 7.2 Stage 2: Provider Health Writes (Mock-Based)
 * 
 * Validates provider health write logic without requiring SQLite.
 * 
 * Success criteria:
 * 1. recordSuccess() calls State Graph write
 * 2. recordFailure() calls State Graph write
 * 3. quarantineProvider() calls State Graph write
 * 4. attemptRecovery() calls State Graph write
 * 5. Writes are non-blocking (continue on error)
 * 6. Feature flag controls write behavior
 * 7. Writes are idempotent (use updateProvider, not create)
 */

const { ProviderHealthManager } = require('../lib/core/provider-health-manager');

describe('Phase 7.2 Stage 2 - Provider Health Writes', () => {
  describe('Write Integration Points', () => {
    test('recordSuccess() calls State Graph write', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordSuccess('test');
      
      // Verify write called
      expect(mockStateGraph.updateProvider).toHaveBeenCalledTimes(1);
      expect(mockStateGraph.updateProvider).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          status: 'active',
          health: 'healthy',
          last_health_check: expect.any(String)
        }),
        'runtime'
      );
    });
    
    test('recordFailure() calls State Graph write', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => false };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordFailure('test', new Error('Test error'));
      
      // Verify write called
      expect(mockStateGraph.updateProvider).toHaveBeenCalledTimes(1);
      expect(mockStateGraph.updateProvider).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          status: 'degraded',
          health: 'unhealthy',
          error_count: 1
        }),
        'runtime'
      );
    });
    
    test('quarantineProvider() calls State Graph write', async () => {
      const phm = new ProviderHealthManager({ maxConsecutiveFailures: 2 });
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => false };
      phm.registerProvider('test', mockProvider);
      
      // Trigger quarantine
      await phm.recordFailure('test', new Error('Failure 1'));
      await phm.recordFailure('test', new Error('Failure 2'));
      
      // Verify quarantine write
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
      const lastCall = mockStateGraph.updateProvider.mock.calls[mockStateGraph.updateProvider.mock.calls.length - 1];
      expect(lastCall[1].status).toBe('failed');
      expect(lastCall[1].metadata.quarantined).toBe(true);
    });
    
    test('attemptRecovery() calls State Graph write on success', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      // Manually set quarantine
      const state = phm.providers.get('test');
      state.status = 'quarantined';
      state.quarantinedAt = new Date().toISOString();
      state.quarantineUntil = new Date(Date.now() - 1000).toISOString(); // Expired
      phm.quarantined.add('test');
      
      await phm.attemptRecovery('test');
      
      // Verify recovery write
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
      const lastCall = mockStateGraph.updateProvider.mock.calls[mockStateGraph.updateProvider.mock.calls.length - 1];
      expect(lastCall[1].status).toBe('active');
      expect(lastCall[1].health).toBe('healthy');
      expect(lastCall[1].metadata.quarantined).toBe(false);
    });
    
    test('attemptRecovery() calls State Graph write on failure', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => false };
      phm.registerProvider('test', mockProvider);
      
      // Manually set quarantine
      const state = phm.providers.get('test');
      state.status = 'quarantined';
      state.quarantinedAt = new Date().toISOString();
      state.quarantineUntil = new Date(Date.now() - 1000).toISOString();
      phm.quarantined.add('test');
      
      await phm.attemptRecovery('test');
      
      // Verify write occurred (quarantine extended)
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
    });
  });
  
  describe('Non-Blocking Writes', () => {
    test('Continues operation if State Graph write fails', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockRejectedValue(new Error('DB write failed'))
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      // Should not throw
      await expect(phm.recordSuccess('test')).resolves.not.toThrow();
      
      // Verify in-memory state updated
      const health = phm.getHealth('test');
      expect(health.status).toBe('healthy');
      expect(health.consecutive_successes).toBe(1);
      
      // Verify write was attempted
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
    });
    
    test('Handles null State Graph gracefully', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(null, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      // Should not throw
      await expect(phm.recordSuccess('test')).resolves.not.toThrow();
      
      // Verify in-memory state works
      const health = phm.getHealth('test');
      expect(health.status).toBe('healthy');
    });
  });
  
  describe('Feature Flag Control', () => {
    test('Writes enabled when flag is true', () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = { updateProvider: jest.fn() };
      phm.setStateGraph(mockStateGraph, true);
      
      expect(phm.stateGraphWritesEnabled).toBe(true);
    });
    
    test('Writes disabled when flag is false', () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = { updateProvider: jest.fn() };
      phm.setStateGraph(mockStateGraph, false);
      
      expect(phm.stateGraphWritesEnabled).toBe(false);
    });
    
    test('No writes when flag is false', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, false); // Disabled
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordSuccess('test');
      
      // Verify no write occurred
      expect(mockStateGraph.updateProvider).not.toHaveBeenCalled();
    });
    
    test('Writes disabled when State Graph is null', () => {
      const phm = new ProviderHealthManager();
      
      phm.setStateGraph(null, true); // Null State Graph
      
      expect(phm.stateGraphWritesEnabled).toBe(false);
    });
  });
  
  describe('Idempotency', () => {
    test('Uses updateProvider (not createProvider)', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 }),
        createProvider: jest.fn()
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordSuccess('test');
      
      // Verify uses update, not create
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
      expect(mockStateGraph.createProvider).not.toHaveBeenCalled();
    });
    
    test('Multiple writes are idempotent', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordSuccess('test');
      await phm.recordSuccess('test');
      await phm.recordSuccess('test');
      
      // Verify all writes used same method
      expect(mockStateGraph.updateProvider).toHaveBeenCalledTimes(3);
      
      // Verify all calls have same structure
      const calls = mockStateGraph.updateProvider.mock.calls;
      calls.forEach(call => {
        expect(call[0]).toBe('test');
        expect(call[1]).toHaveProperty('status');
        expect(call[1]).toHaveProperty('health');
        expect(call[2]).toBe('runtime');
      });
    });
  });
  
  describe('Startup Reconciliation', () => {
    test('reconcileStateGraph() runs health checks and writes', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const healthyProvider = { isHealthy: async () => true };
      const unhealthyProvider = { isHealthy: async () => false };
      
      phm.registerProvider('healthy', healthyProvider);
      phm.registerProvider('unhealthy', unhealthyProvider);
      
      await phm.reconcileStateGraph();
      
      // Verify writes for both providers
      expect(mockStateGraph.updateProvider).toHaveBeenCalledTimes(2);
      
      // Verify healthy provider
      const healthyCall = mockStateGraph.updateProvider.mock.calls.find(c => c[0] === 'healthy');
      expect(healthyCall[1].status).toBe('active');
      expect(healthyCall[1].health).toBe('healthy');
      
      // Verify unhealthy provider
      const unhealthyCall = mockStateGraph.updateProvider.mock.calls.find(c => c[0] === 'unhealthy');
      expect(unhealthyCall[1].status).toBe('degraded');
      expect(unhealthyCall[1].health).toBe('unhealthy');
    });
    
    test('reconcileStateGraph() handles provider failures', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const brokenProvider = {
        isHealthy: async () => {
          throw new Error('Health check failed');
        }
      };
      
      phm.registerProvider('broken', brokenProvider);
      
      // Should not throw
      await expect(phm.reconcileStateGraph()).resolves.not.toThrow();
      
      // Verify marked unhealthy
      expect(mockStateGraph.updateProvider).toHaveBeenCalled();
      const call = mockStateGraph.updateProvider.mock.calls[0];
      expect(call[1].status).toBe('degraded');
      expect(call[1].health).toBe('unhealthy');
    });
    
    test('reconcileStateGraph() skips when writes disabled', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, false); // Disabled
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.reconcileStateGraph();
      
      // Verify no writes
      expect(mockStateGraph.updateProvider).not.toHaveBeenCalled();
    });
  });
  
  describe('State Mapping', () => {
    test('Maps internal status to State Graph status correctly', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      // Test healthy → active
      await phm.recordSuccess('test');
      let call = mockStateGraph.updateProvider.mock.calls[mockStateGraph.updateProvider.mock.calls.length - 1];
      expect(call[1].status).toBe('active');
      expect(call[1].health).toBe('healthy');
      
      // Test degraded → degraded
      await phm.recordFailure('test', new Error('Test'));
      call = mockStateGraph.updateProvider.mock.calls[mockStateGraph.updateProvider.mock.calls.length - 1];
      expect(call[1].status).toBe('degraded');
      expect(call[1].health).toBe('unhealthy');
    });
  });
  
  describe('Runtime Attribution', () => {
    test('All writes attributed to runtime', async () => {
      const phm = new ProviderHealthManager();
      
      const mockStateGraph = {
        updateProvider: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test', mockProvider);
      
      await phm.recordSuccess('test');
      
      // Verify changed_by = 'runtime'
      const call = mockStateGraph.updateProvider.mock.calls[0];
      expect(call[2]).toBe('runtime');
    });
  });
});
