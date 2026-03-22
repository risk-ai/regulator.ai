/**
 * Phase 7.2 Stage 1: State Graph Plumbing Validation
 * 
 * Single-run validation test (works with Vienna singleton).
 * 
 * Success criteria:
 * 1. State Graph reference reaches all runtime components
 * 2. Runtime boots normally with State Graph available
 * 3. Prod/test environment selection correct
 * 4. No operator-visible behavior changes
 */

const fs = require('fs');
const path = require('path');
const { getStateGraph, _resetStateGraphForTesting } = require('../lib/state/state-graph');

describe('Phase 7.2 Stage 1 - Plumbing Validation', () => {
  let testDbPath;
  
  beforeAll(() => {
    // Use test environment
    process.env.VIENNA_ENV = 'test';
    
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
    delete process.env.VIENNA_ENABLE_STATE_GRAPH_WRITES;
  });
  
  test('Stage 1: State Graph plumbing complete', async () => {
    // Get fresh ViennaCore (singleton, may be pre-initialized in other tests)
    const ViennaCore = require('../index');
    
    // Initialize if not already done
    if (!ViennaCore.isInitialized()) {
      ViennaCore.init({
        adapter: 'openclaw',
        workspace: '/tmp/test-workspace'
      });
      
      await ViennaCore.initPhase7_3();
    }
    
    // VALIDATION 1: State Graph initialized
    expect(ViennaCore.stateGraph).not.toBeNull();
    expect(ViennaCore.stateGraph.initialized).toBe(true);
    expect(ViennaCore.stateGraph.environment).toBe('test');
    
    // VALIDATION 2: State Graph reference reaches ProviderHealthManager
    expect(ViennaCore.providerHealthManager).not.toBeNull();
    expect(ViennaCore.providerHealthManager.stateGraph).toBe(ViennaCore.stateGraph);
    
    // VALIDATION 3: State Graph reference reaches RuntimeModeManager
    expect(ViennaCore.runtimeModeManager).not.toBeNull();
    expect(ViennaCore.runtimeModeManager.stateGraph).toBe(ViennaCore.stateGraph);
    
    // VALIDATION 4: State Graph reference reaches ObjectiveTracker
    expect(ViennaCore.queuedExecutor).not.toBeNull();
    expect(ViennaCore.queuedExecutor.objectiveTracker).not.toBeNull();
    expect(ViennaCore.queuedExecutor.objectiveTracker.stateGraph).toBe(ViennaCore.stateGraph);
    
    // VALIDATION 5: State Graph reference reaches all ServiceAdapter instances
    expect(ViennaCore._serviceAdapters).toBeDefined();
    expect(ViennaCore._serviceAdapters.length).toBeGreaterThan(0);
    
    for (const adapter of ViennaCore._serviceAdapters) {
      expect(adapter.stateGraph).toBe(ViennaCore.stateGraph);
    }
    
    // VALIDATION 6: No behavioral changes - components still operate normally
    // Test ProviderHealthManager
    ViennaCore.providerHealthManager.registerProvider('test-stage1', {});
    await ViennaCore.providerHealthManager.recordSuccess('test-stage1');
    
    const providerState = ViennaCore.providerHealthManager.providers.get('test-stage1');
    expect(providerState).toBeDefined();
    expect(providerState.consecutiveSuccesses).toBe(1);
    
    // Test RuntimeModeManager
    const providerHealth = new Map([['test-stage1', { status: 'healthy' }]]);
    const transition = ViennaCore.runtimeModeManager.updateMode(providerHealth, true);
    // No transition expected if already in normal mode
    expect(transition === null || transition.to === 'normal').toBe(true);
    
    // Test ObjectiveTracker
    ViennaCore.queuedExecutor.objectiveTracker.registerObjective('test-stage1-obj', 3);
    const obj = ViennaCore.queuedExecutor.objectiveTracker.objectives.get('test-stage1-obj');
    expect(obj).toBeDefined();
    expect(obj.total_envelopes).toBe(3);
    
    console.log('✅ Stage 1 validation complete: State Graph plumbing operational');
  });
  
  test('Environment isolation: test uses test DB', () => {
    process.env.VIENNA_ENV = 'test';
    
    const stateGraph = getStateGraph();
    
    expect(stateGraph.dbPath).toContain('/runtime/test/state/');
    expect(stateGraph.environment).toBe('test');
  });
  
  test('Null safety: components have setStateGraph method', () => {
    const { ProviderHealthManager } = require('../lib/core/provider-health-manager');
    const { RuntimeModeManager } = require('../lib/core/runtime-modes');
    const { ObjectiveTracker } = require('../lib/execution/objective-tracker');
    const { ServiceAdapter } = require('../lib/execution/adapters');
    
    const phm = new ProviderHealthManager();
    const rmm = new RuntimeModeManager();
    const ot = new ObjectiveTracker();
    const sa = new ServiceAdapter();
    
    expect(typeof phm.setStateGraph).toBe('function');
    expect(typeof rmm.setStateGraph).toBe('function');
    expect(typeof ot.setStateGraph).toBe('function');
    expect(typeof sa.setStateGraph).toBe('function');
    
    // Should not crash with null
    phm.setStateGraph(null);
    rmm.setStateGraph(null);
    ot.setStateGraph(null);
    sa.setStateGraph(null);
    
    expect(phm.stateGraph).toBeNull();
    expect(rmm.stateGraph).toBeNull();
    expect(ot.stateGraph).toBeNull();
    expect(sa.stateGraph).toBeNull();
  });
});
