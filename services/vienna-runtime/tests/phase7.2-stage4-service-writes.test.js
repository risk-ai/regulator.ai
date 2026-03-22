/**
 * Phase 7.2 Stage 4: Service Status Writes (Mock-Based)
 * 
 * Validates service status write logic without requiring SQLite.
 * 
 * Success criteria:
 * 1. getServices() calls State Graph write for each service
 * 2. Writes are non-blocking (continue on error)
 * 3. Feature flag controls write behavior
 * 4. Writes are idempotent (use updateService when exists, createService when new)
 * 5. restartService() writes restart attempt
 * 6. Restart write includes operator and timestamp
 * 7. reconcileStateGraph() rewrites all services from live status
 * 8. DB failure does not block service operations
 * 9. Service status fields persisted correctly
 * 10. Health status persisted correctly
 */

const { ServiceManager } = require('../lib/core/service-manager');

describe('Phase 7.2 Stage 4 - Service Status Writes', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.VIENNA_ENV;
  });

  describe('Write Integration Points', () => {
    test('getServices() calls State Graph write for each service', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockResolvedValue({ service_id: 'test', changes: 1 }),
        updateService: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      // Stub network check to avoid real HTTP calls
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      await sm.getServices();
      
      // Should write openclaw-gateway + vienna-executor
      expect(mockStateGraph.createService.mock.calls.length + mockStateGraph.updateService.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    
    test('Writes use updateService when service exists', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          service_name: 'OpenClaw Gateway',
          status: 'stopped'
        }),
        updateService: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      await sm.getServices();
      
      // Verify updateService called (not createService)
      expect(mockStateGraph.updateService).toHaveBeenCalledWith(
        'openclaw-gateway',
        expect.objectContaining({
          status: 'running',
          health: 'healthy'
        }),
        'service_manager'
      );
    });
    
    test('Writes use createService when service does not exist', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockResolvedValue({ service_id: 'test', changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      await sm.getServices();
      
      // Verify createService called
      expect(mockStateGraph.createService).toHaveBeenCalledWith(
        expect.objectContaining({
          service_id: 'openclaw-gateway',
          service_name: 'OpenClaw Gateway',
          service_type: 'api',
          status: 'running',
          health: 'healthy'
        })
      );
    });
    
    test('Service status fields persisted correctly', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockResolvedValue({ service_id: 'test', changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      const mockService = {
        service_id: 'test-service',
        service_name: 'Test Service',
        service_type: 'daemon',
        status: 'degraded',
        health: 'warning',
        last_check_at: '2026-03-12T18:00:00.000Z',
        metadata: { test: true }
      };
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue(mockService);
      sm._checkViennaExecutor = jest.fn().mockResolvedValue(mockService);
      
      await sm.getServices();
      
      // Verify fields persisted
      expect(mockStateGraph.createService).toHaveBeenCalledWith(
        expect.objectContaining({
          service_id: 'test-service',
          service_name: 'Test Service',
          service_type: 'daemon',
          status: 'degraded',
          health: 'warning',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: { test: true }
        })
      );
    });
    
    test('restartService() writes restart attempt', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        updateService: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      await sm.restartService('openclaw-gateway', 'operator_test');
      
      // Verify restart attempt written
      expect(mockStateGraph.updateService).toHaveBeenCalledWith(
        'openclaw-gateway',
        expect.objectContaining({
          last_restart_at: expect.any(String),
          metadata: expect.objectContaining({
            last_restart_operator: 'operator_test'
          })
        }),
        'operator_test'
      );
    });
    
    test('Restart write includes operator and timestamp', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        updateService: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      await sm.restartService('test-service', 'max');
      
      const call = mockStateGraph.updateService.mock.calls[0];
      expect(call[1].last_restart_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(call[1].metadata.last_restart_operator).toBe('max');
      expect(call[2]).toBe('max'); // changedBy parameter
    });
  });

  describe('Non-Blocking Behavior', () => {
    test('Continues operation if State Graph write fails', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'test',
        service_name: 'Test',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      // Should not throw (fire-and-forget write)
      const services = await sm.getServices();
      
      expect(services).toHaveLength(2); // Still returns services despite DB failure
    });
    
    test('Handles null State Graph gracefully', async () => {
      const sm = new ServiceManager();
      
      // No State Graph set
      sm.setStateGraph(null, true);
      
      // Should not throw
      const services = await sm.getServices();
      
      expect(services).toHaveLength(2);
    });
    
    test('DB failure does not block service operations', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockImplementation(() => {
          throw new Error('DB unavailable');
        })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'test',
        service_name: 'Test',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      // Should complete despite DB error
      const services = await sm.getServices();
      
      expect(services).toHaveLength(2);
    });
  });

  describe('Feature Flag Control', () => {
    test('Feature flag disables writes', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn(),
        createService: jest.fn(),
        updateService: jest.fn()
      };
      
      // Disable writes
      sm.setStateGraph(mockStateGraph, false);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'test',
        service_name: 'Test',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      await sm.getServices();
      
      // No writes should occur
      expect(mockStateGraph.getService).not.toHaveBeenCalled();
      expect(mockStateGraph.createService).not.toHaveBeenCalled();
      expect(mockStateGraph.updateService).not.toHaveBeenCalled();
    });
    
    test('Restart respects feature flag', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        updateService: jest.fn()
      };
      
      sm.setStateGraph(mockStateGraph, false);
      
      await sm.restartService('test', 'operator');
      
      // No write should occur
      expect(mockStateGraph.updateService).not.toHaveBeenCalled();
    });
  });

  describe('Startup Reconciliation', () => {
    test('reconcileStateGraph() rewrites all services from live status', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockResolvedValue({ service_id: 'test', changes: 1 })
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      await sm.reconcileStateGraph();
      
      // Should write all services
      expect(mockStateGraph.createService.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    
    test('Reconciliation handles write failure gracefully', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn().mockReturnValue(null),
        createService: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      
      sm.setStateGraph(mockStateGraph, true);
      
      sm._checkOpenClawGateway = jest.fn().mockResolvedValue({
        service_id: 'test',
        service_name: 'Test',
        service_type: 'api',
        status: 'running',
        health: 'healthy',
        last_check_at: new Date().toISOString(),
        metadata: {}
      });
      
      // Should not throw
      await expect(sm.reconcileStateGraph()).resolves.not.toThrow();
    });
    
    test('Reconciliation skips when writes disabled', async () => {
      const sm = new ServiceManager();
      
      const mockStateGraph = {
        getService: jest.fn(),
        createService: jest.fn()
      };
      
      sm.setStateGraph(mockStateGraph, false);
      
      await sm.reconcileStateGraph();
      
      // No writes should occur
      expect(mockStateGraph.getService).not.toHaveBeenCalled();
      expect(mockStateGraph.createService).not.toHaveBeenCalled();
    });
  });

  describe('Environment Isolation', () => {
    test('Uses correct environment (prod)', async () => {
      const sm = new ServiceManager();
      
      expect(sm.env).toBe('prod');
    });
    
    test('Uses correct environment (test)', async () => {
      process.env.VIENNA_ENV = 'test';
      
      const sm = new ServiceManager();
      
      expect(sm.env).toBe('test');
    });
  });
});
