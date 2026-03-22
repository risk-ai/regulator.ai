/**
 * Phase 7.2 Stage 3: Runtime Mode Writes (Mock-Based)
 * 
 * Validates runtime mode write logic without requiring SQLite.
 * 
 * Success criteria:
 * 1. Automatic mode transition written correctly
 * 2. Operator-forced mode written correctly
 * 3. Previous mode preserved in metadata
 * 4. Transition reason recorded
 * 5. Automatic vs operator flag captured
 * 6. Reconciliation overwrites stale mode
 * 7. DB unavailable → runtime still updates mode
 * 8. Feature flag controls write behavior
 */

const { RuntimeModeManager } = require('../lib/core/runtime-modes');

// Helper to wait for async State Graph writes to fire
const waitForWrites = () => new Promise(resolve => setImmediate(resolve));

describe('Phase 7.2 Stage 3 - Runtime Mode Writes', () => {
  describe('Automatic Mode Transitions', () => {
    test('updateMode() calls State Graph write on transition', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      // Simulate provider health change causing mode transition
      const providerHealth = new Map([
        ['anthropic', { status: 'unavailable' }],
        ['local', { status: 'healthy' }]
      ]);
      
      const transition = rmm.updateMode(providerHealth, true);
      
      // Verify transition occurred
      expect(transition).not.toBeNull();
      expect(transition.to).toBe('degraded');
      expect(transition.automatic).toBe(true);
      
      // Wait a tick for async write to fire
      await new Promise(resolve => setImmediate(resolve));
      
      await waitForWrites();
      // Verify State Graph write
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledTimes(1);
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'runtime_mode',
        'degraded',
        expect.objectContaining({
          context_type: 'mode',
          metadata: expect.objectContaining({
            previous_mode: 'normal',
            automatic: true
          })
        })
      );
    });
    
    test('updateMode() does not write if no transition', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      // Provide same health state (no transition expected)
      const providerHealth = new Map([
        ['anthropic', { status: 'healthy' }],
        ['local', { status: 'healthy' }]
      ]);
      
      const transition = rmm.updateMode(providerHealth, true);
      
      // Verify no transition
      expect(transition).toBeNull();
      
      await waitForWrites();
      // Verify no State Graph write
      expect(mockStateGraph.setRuntimeContext).not.toHaveBeenCalled();
    });
    
    test('Transition includes reason and timestamp', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      
      const transition = rmm.updateMode(providerHealth, true);
      
      // Verify transition metadata
      expect(transition).not.toBeNull();
      expect(transition.reason).toBeDefined();
      expect(transition.timestamp).toBeDefined();
      
      await waitForWrites();
      // Verify State Graph received metadata
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.transition_reason).toBeDefined();
      expect(call[2].metadata.transition_timestamp).toBeDefined();
    });
  });
  
  describe('Operator-Forced Mode', () => {
    test('forceMode() calls State Graph write', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map([
        ['local', { status: 'healthy' }]
      ]);
      
      const transition = rmm.forceMode('local-only', 'Operator override for testing', providerHealth);
      
      // Verify transition
      expect(transition).not.toBeNull();
      expect(transition.to).toBe('local-only');
      expect(transition.automatic).toBe(false);
      
      await waitForWrites();
      // Verify State Graph write
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledTimes(1);
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'runtime_mode',
        'local-only',
        expect.objectContaining({
          context_type: 'mode',
          metadata: expect.objectContaining({
            previous_mode: 'normal',
            automatic: false,
            transition_reason: 'Operator override for testing'
          })
        })
      );
    });
    
    test('Operator override marked as automatic:false', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      const transition = rmm.forceMode('operator-only', 'Manual intervention', providerHealth);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.automatic).toBe(false);
    });
  });
  
  describe('Metadata Preservation', () => {
    test('Previous mode preserved in transition', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      // Set initial mode
      rmm.currentState.mode = 'normal';
      
      // Transition to degraded
      const providerHealth = new Map([
        ['anthropic', { status: 'unavailable' }]
      ]);
      
      rmm.updateMode(providerHealth, true);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.previous_mode).toBe('normal');
    });
    
    test('Transition reason captured', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.transition_reason).toBeDefined();
      expect(call[2].metadata.transition_reason.length).toBeGreaterThan(0);
    });
    
    test('Timestamp captured in ISO format', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      const timestamp = call[2].metadata.transition_timestamp;
      
      expect(timestamp).toBeDefined();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
  
  describe('Non-Blocking Writes', () => {
    test('Continues operation if State Graph write fails', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockRejectedValue(new Error('DB write failed'))
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      
      // Should not throw
      const transition = rmm.updateMode(providerHealth, true);
      
      // Verify transition still occurred in-memory
      expect(transition).not.toBeNull();
      expect(rmm.currentState.mode).toBe('operator-only');
      
      // Verify write was attempted
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalled();
    });
    
    test('Handles null State Graph gracefully', async () => {
      const rmm = new RuntimeModeManager();
      rmm.setStateGraph(null, true);
      
      const providerHealth = new Map();
      
      // Should not throw
      const transition = rmm.updateMode(providerHealth, true);
      
      // Verify transition works
      expect(transition).not.toBeNull();
    });
  });
  
  describe('Feature Flag Control', () => {
    test('Writes enabled when flag is true', () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = { setRuntimeContext: jest.fn() };
      rmm.setStateGraph(mockStateGraph, true);
      
      expect(rmm.stateGraphWritesEnabled).toBe(true);
    });
    
    test('Writes disabled when flag is false', () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = { setRuntimeContext: jest.fn() };
      rmm.setStateGraph(mockStateGraph, false);
      
      expect(rmm.stateGraphWritesEnabled).toBe(false);
    });
    
    test('No writes when flag is false', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, false); // Disabled
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      // Verify no write occurred
      expect(mockStateGraph.setRuntimeContext).not.toHaveBeenCalled();
    });
    
    test('Writes disabled when State Graph is null', () => {
      const rmm = new RuntimeModeManager();
      
      rmm.setStateGraph(null, true); // Null State Graph
      
      expect(rmm.stateGraphWritesEnabled).toBe(false);
    });
  });
  
  describe('Startup Reconciliation', () => {
    test('reconcileStateGraph() recomputes and writes current mode', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      // Simulate stale in-memory state
      rmm.currentState.mode = 'degraded';
      
      // Provide healthy provider health (should recompute to normal)
      const providerHealth = new Map([
        ['anthropic', { status: 'healthy' }],
        ['local', { status: 'healthy' }]
      ]);
      
      await rmm.reconcileStateGraph(providerHealth, true);
      
      await waitForWrites();
      // Verify State Graph write
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledTimes(1);
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalledWith(
        'runtime_mode',
        'normal',
        expect.objectContaining({
          context_type: 'mode',
          metadata: expect.objectContaining({
            transition_reason: 'Startup reconciliation',
            automatic: true
          })
        })
      );
    });
    
    test('reconcileStateGraph() handles write failure gracefully', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      
      // Should not throw
      await expect(rmm.reconcileStateGraph(providerHealth, true)).resolves.not.toThrow();
      
      // Verify write was attempted
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalled();
    });
    
    test('reconcileStateGraph() skips when writes disabled', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, false); // Disabled
      
      const providerHealth = new Map();
      await rmm.reconcileStateGraph(providerHealth, true);
      
      // Verify no writes
      expect(mockStateGraph.setRuntimeContext).not.toHaveBeenCalled();
    });
  });
  
  describe('Idempotency', () => {
    test('Uses setRuntimeContext (idempotent upsert)', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 }),
        createRuntimeContext: jest.fn()
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      // Verify uses setRuntimeContext, not create
      expect(mockStateGraph.setRuntimeContext).toHaveBeenCalled();
      expect(mockStateGraph.createRuntimeContext).not.toHaveBeenCalled();
    });
  });
  
  describe('Runtime Attribution', () => {
    test('Context key is runtime_mode', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[0]).toBe('runtime_mode');
      expect(call[2].context_type).toBe('mode');
    });
  });
  
  describe('Automatic vs Operator Distinction', () => {
    test('updateMode() marked automatic:true', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      rmm.updateMode(providerHealth, true);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.automatic).toBe(true);
    });
    
    test('forceMode() marked automatic:false', async () => {
      const rmm = new RuntimeModeManager();
      
      const mockStateGraph = {
        setRuntimeContext: jest.fn().mockResolvedValue({ changes: 1 })
      };
      
      rmm.setStateGraph(mockStateGraph, true);
      
      const providerHealth = new Map();
      const transition = rmm.forceMode('local-only', 'Test', providerHealth);
      
      const call = mockStateGraph.setRuntimeContext.mock.calls[0];
      expect(call[2].metadata.automatic).toBe(false);
    });
  });
});
