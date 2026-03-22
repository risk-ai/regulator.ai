/**
 * Phase 7.2 Stage 2: Provider Health Integration Tests
 * 
 * Validates provider health writes to State Graph.
 * 
 * Success criteria:
 * 1. Provider success recorded in State Graph
 * 2. Provider failure recorded in State Graph
 * 3. Provider quarantine recorded in State Graph
 * 4. Provider recovery recorded in State Graph
 * 5. Writes are non-blocking (continue on DB failure)
 * 6. Startup reconciliation corrects stale state
 * 7. Environment isolation preserved
 */

const { ProviderHealthManager } = require('../lib/core/provider-health-manager');
const { getStateGraph, _resetStateGraphForTesting } = require('../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

describe('Phase 7.2 Stage 2 - Provider Health Integration', () => {
  let stateGraph;
  let testDbPath;
  
  beforeAll(async () => {
    // Use test environment
    process.env.VIENNA_ENV = 'test';
    
    // Reset State Graph singleton first
    _resetStateGraphForTesting();
    
    // Clean test database if exists
    testDbPath = path.join(
      process.env.HOME,
      '.openclaw',
      'runtime',
      'test',
      'state',
      'state-graph.db'
    );
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
    
    // Initialize State Graph
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    
    // Bootstrap providers table
    await stateGraph.createProvider({
      provider_id: 'test-provider',
      provider_name: 'Test Provider',
      provider_type: 'other', // Must be one of: llm, api, data, other
      status: 'inactive',
      health: 'unhealthy',
      credentials_path: null,
      rate_limit: 100,
      metadata: {}
    });
  });
  
  afterAll(() => {
    // Clean up State Graph singleton
    _resetStateGraphForTesting();
    
    // Clean up test database (including -shm and -wal files)
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
    
    delete process.env.VIENNA_ENV;
    delete process.env.VIENNA_ENABLE_STATE_GRAPH_PROVIDER_WRITES;
  });
  
  describe('Success Path', () => {
    test('recordSuccess() writes to State Graph', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true); // Enable writes
      
      // Register provider
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-provider', mockProvider);
      
      // Record success
      await phm.recordSuccess('test-provider');
      
      // Verify in-memory state
      const health = phm.getHealth('test-provider');
      expect(health.status).toBe('healthy');
      expect(health.consecutive_successes).toBe(1);
      
      // Verify State Graph write
      const provider = stateGraph.getProvider('test-provider');
      expect(provider).not.toBeNull();
      expect(provider.status).toBe('active');
      expect(provider.health).toBe('healthy');
      expect(provider.last_health_check).not.toBeNull();
    });
    
    test('recordFailure() writes to State Graph', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true);
      
      const mockProvider = { isHealthy: async () => false };
      phm.registerProvider('test-provider-fail', mockProvider);
      
      // Bootstrap provider in State Graph
      await stateGraph.createProvider({
        provider_id: 'test-provider-fail',
        provider_name: 'Test Provider Fail',
        provider_type: 'other',
        status: 'inactive',
        health: 'unhealthy'
      });
      
      // Record failure
      await phm.recordFailure('test-provider-fail', new Error('Test failure'));
      
      // Verify in-memory state
      const health = phm.getHealth('test-provider-fail');
      expect(health.status).toBe('degraded');
      expect(health.consecutive_failures).toBe(1);
      
      // Verify State Graph write
      const provider = stateGraph.getProvider('test-provider-fail');
      expect(provider).not.toBeNull();
      expect(provider.status).toBe('degraded');
      expect(provider.health).toBe('unhealthy');
      expect(provider.error_count).toBe(1);
    });
    
    test('quarantineProvider() writes to State Graph', async () => {
      const phm = new ProviderHealthManager({ maxConsecutiveFailures: 2 });
      phm.setStateGraph(stateGraph, true);
      
      const mockProvider = { isHealthy: async () => false };
      phm.registerProvider('test-provider-quarantine', mockProvider);
      
      // Bootstrap provider
      await stateGraph.createProvider({
        provider_id: 'test-provider-quarantine',
        provider_name: 'Test Provider Quarantine',
        provider_type: 'other',
        status: 'active',
        health: 'healthy'
      });
      
      // Record failures until quarantine
      await phm.recordFailure('test-provider-quarantine', new Error('Failure 1'));
      await phm.recordFailure('test-provider-quarantine', new Error('Failure 2'));
      
      // Verify quarantine state
      const health = phm.getHealth('test-provider-quarantine');
      expect(health.quarantined).toBe(true);
      
      // Verify State Graph write
      const provider = stateGraph.getProvider('test-provider-quarantine');
      expect(provider).not.toBeNull();
      expect(provider.status).toBe('failed');
      expect(provider.health).toBe('unhealthy');
      
      const metadata = JSON.parse(provider.metadata);
      expect(metadata.quarantined).toBe(true);
      expect(metadata.quarantine_until).not.toBeNull();
    });
    
    test('attemptRecovery() writes to State Graph on success', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-provider-recovery', mockProvider);
      
      // Bootstrap provider in quarantined state
      await stateGraph.createProvider({
        provider_id: 'test-provider-recovery',
        provider_name: 'Test Provider Recovery',
        provider_type: 'other',
        status: 'failed',
        health: 'unhealthy',
        metadata: { quarantined: true }
      });
      
      // Manually set quarantine in PHM
      const state = phm.providers.get('test-provider-recovery');
      state.status = 'quarantined';
      state.quarantinedAt = new Date().toISOString();
      state.quarantineUntil = new Date(Date.now() - 1000).toISOString(); // Expired
      phm.quarantined.add('test-provider-recovery');
      
      // Attempt recovery
      await phm.attemptRecovery('test-provider-recovery');
      
      // Verify recovery
      const health = phm.getHealth('test-provider-recovery');
      expect(health.status).toBe('healthy');
      expect(health.quarantined).toBe(false);
      
      // Verify State Graph write
      const provider = stateGraph.getProvider('test-provider-recovery');
      expect(provider).not.toBeNull();
      expect(provider.status).toBe('active');
      expect(provider.health).toBe('healthy');
      
      const metadata = JSON.parse(provider.metadata);
      expect(metadata.quarantined).toBe(false);
    });
  });
  
  describe('Failure Path', () => {
    test('Continues operation if State Graph write fails', async () => {
      const phm = new ProviderHealthManager();
      
      // Set up State Graph with invalid configuration (will fail writes)
      const mockStateGraph = {
        updateProvider: async () => {
          throw new Error('DB write failed');
        }
      };
      
      phm.setStateGraph(mockStateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-fail-safe', mockProvider);
      
      // Should not throw (non-blocking)
      await expect(phm.recordSuccess('test-fail-safe')).resolves.not.toThrow();
      
      // Verify in-memory state still updated
      const health = phm.getHealth('test-fail-safe');
      expect(health.status).toBe('healthy');
    });
    
    test('Handles null State Graph gracefully', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(null, true); // Null State Graph
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-null-sg', mockProvider);
      
      // Should not throw
      await expect(phm.recordSuccess('test-null-sg')).resolves.not.toThrow();
      
      // Verify in-memory state works
      const health = phm.getHealth('test-null-sg');
      expect(health.status).toBe('healthy');
    });
    
    test('Respects writes disabled flag', async () => {
      const phm = new ProviderHealthManager();
      
      const writeCallCount = { count: 0 };
      const mockStateGraph = {
        updateProvider: async () => {
          writeCallCount.count++;
        }
      };
      
      phm.setStateGraph(mockStateGraph, false); // Writes disabled
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-disabled', mockProvider);
      
      await phm.recordSuccess('test-disabled');
      
      // Verify no State Graph write occurred
      expect(writeCallCount.count).toBe(0);
    });
  });
  
  describe('Startup Reconciliation', () => {
    test('reconcileStateGraph() updates all providers', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true);
      
      // Register providers with different states
      const healthyProvider = { isHealthy: async () => true };
      const unhealthyProvider = { isHealthy: async () => false };
      
      phm.registerProvider('reconcile-healthy', healthyProvider);
      phm.registerProvider('reconcile-unhealthy', unhealthyProvider);
      
      // Bootstrap providers in State Graph (stale state)
      await stateGraph.createProvider({
        provider_id: 'reconcile-healthy',
        provider_name: 'Reconcile Healthy',
        provider_type: 'other',
        status: 'inactive',
        health: 'unhealthy'
      });
      
      await stateGraph.createProvider({
        provider_id: 'reconcile-unhealthy',
        provider_name: 'Reconcile Unhealthy',
        provider_type: 'other',
        status: 'active',
        health: 'healthy'
      });
      
      // Run reconciliation
      await phm.reconcileStateGraph();
      
      // Verify State Graph corrected
      const healthy = stateGraph.getProvider('reconcile-healthy');
      expect(healthy.status).toBe('active');
      expect(healthy.health).toBe('healthy');
      
      const unhealthy = stateGraph.getProvider('reconcile-unhealthy');
      expect(unhealthy.status).toBe('degraded'); // Unhealthy maps to degraded
      expect(unhealthy.health).toBe('unhealthy');
    });
    
    test('reconcileStateGraph() handles provider check failures', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true);
      
      const brokenProvider = {
        isHealthy: async () => {
          throw new Error('Health check error');
        }
      };
      
      phm.registerProvider('reconcile-broken', brokenProvider);
      
      await stateGraph.createProvider({
        provider_id: 'reconcile-broken',
        provider_name: 'Reconcile Broken',
        provider_type: 'other',
        status: 'active',
        health: 'healthy'
      });
      
      // Should not throw
      await expect(phm.reconcileStateGraph()).resolves.not.toThrow();
      
      // Verify marked unhealthy
      const provider = stateGraph.getProvider('reconcile-broken');
      expect(provider.status).toBe('degraded'); // Unhealthy maps to degraded
      expect(provider.health).toBe('unhealthy');
    });
  });
  
  describe('Idempotency', () => {
    test('Multiple recordSuccess() calls are idempotent', async () => {
      const phm = new ProviderHealthManager();
      phm.setStateGraph(stateGraph, true);
      
      const mockProvider = { isHealthy: async () => true };
      phm.registerProvider('test-idempotent', mockProvider);
      
      await stateGraph.createProvider({
        provider_id: 'test-idempotent',
        provider_name: 'Test Idempotent',
        provider_type: 'other',
        status: 'inactive',
        health: 'unhealthy'
      });
      
      // Call multiple times
      await phm.recordSuccess('test-idempotent');
      await phm.recordSuccess('test-idempotent');
      await phm.recordSuccess('test-idempotent');
      
      // Verify final state consistent
      const provider = stateGraph.getProvider('test-idempotent');
      expect(provider.status).toBe('active');
      expect(provider.health).toBe('healthy');
      
      // Verify in-memory matches
      const health = phm.getHealth('test-idempotent');
      expect(health.consecutive_successes).toBe(3);
    });
  });
  
  describe('Environment Isolation', () => {
    test('Writes go to test database', async () => {
      // Verify test DB path
      expect(stateGraph.dbPath).toContain('/runtime/test/state/');
      expect(stateGraph.environment).toBe('test');
    });
  });
  
  describe('Feature Flag', () => {
    test('VIENNA_ENABLE_STATE_GRAPH_PROVIDER_WRITES controls writes', () => {
      const phm = new ProviderHealthManager();
      
      // With flag enabled
      phm.setStateGraph(stateGraph, true);
      expect(phm.stateGraphWritesEnabled).toBe(true);
      
      // With flag disabled
      const phm2 = new ProviderHealthManager();
      phm2.setStateGraph(stateGraph, false);
      expect(phm2.stateGraphWritesEnabled).toBe(false);
    });
  });
});
