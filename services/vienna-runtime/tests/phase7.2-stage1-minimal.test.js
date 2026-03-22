/**
 * Phase 7.2 Stage 1: Minimal Plumbing Validation
 * 
 * Validates dependency injection methods exist without full init.
 */

const { ProviderHealthManager } = require('../lib/core/provider-health-manager');
const { RuntimeModeManager } = require('../lib/core/runtime-modes');
const { ObjectiveTracker } = require('../lib/execution/objective-tracker');
const { ServiceAdapter } = require('../lib/execution/adapters');

describe('Phase 7.2 Stage 1 - Minimal Plumbing', () => {
  test('ProviderHealthManager has setStateGraph method', () => {
    const phm = new ProviderHealthManager();
    
    expect(phm.stateGraph).toBeNull();
    expect(typeof phm.setStateGraph).toBe('function');
    
    // Test injection
    const mockStateGraph = { initialized: true };
    phm.setStateGraph(mockStateGraph);
    
    expect(phm.stateGraph).toBe(mockStateGraph);
  });
  
  test('RuntimeModeManager has setStateGraph method', () => {
    const rmm = new RuntimeModeManager();
    
    expect(rmm.stateGraph).toBeNull();
    expect(typeof rmm.setStateGraph).toBe('function');
    
    // Test injection
    const mockStateGraph = { initialized: true };
    rmm.setStateGraph(mockStateGraph);
    
    expect(rmm.stateGraph).toBe(mockStateGraph);
  });
  
  test('ObjectiveTracker has setStateGraph method', () => {
    const ot = new ObjectiveTracker();
    
    expect(ot.stateGraph).toBeNull();
    expect(typeof ot.setStateGraph).toBe('function');
    
    // Test injection
    const mockStateGraph = { initialized: true };
    ot.setStateGraph(mockStateGraph);
    
    expect(ot.stateGraph).toBe(mockStateGraph);
  });
  
  test('ServiceAdapter has setStateGraph method', () => {
    const sa = new ServiceAdapter();
    
    expect(sa.stateGraph).toBeNull();
    expect(typeof sa.setStateGraph).toBe('function');
    
    // Test injection
    const mockStateGraph = { initialized: true };
    sa.setStateGraph(mockStateGraph);
    
    expect(sa.stateGraph).toBe(mockStateGraph);
  });
  
  test('Null safety: setStateGraph handles null', () => {
    const phm = new ProviderHealthManager();
    const rmm = new RuntimeModeManager();
    const ot = new ObjectiveTracker();
    const sa = new ServiceAdapter();
    
    // Should not crash
    phm.setStateGraph(null);
    rmm.setStateGraph(null);
    ot.setStateGraph(null);
    sa.setStateGraph(null);
    
    expect(phm.stateGraph).toBeNull();
    expect(rmm.stateGraph).toBeNull();
    expect(ot.stateGraph).toBeNull();
    expect(sa.stateGraph).toBeNull();
  });
  
  test('ViennaCore index.js tracks ServiceAdapter instances', () => {
    // Check that ViennaCore has _serviceAdapters field
    const indexSource = require('fs').readFileSync(
      require('path').join(__dirname, '../index.js'),
      'utf8'
    );
    
    expect(indexSource).toContain('this._serviceAdapters = []');
    expect(indexSource).toContain('this._serviceAdapters.push');
    expect(indexSource).toContain('adapter.setStateGraph(this.stateGraph)');
  });
  
  test('ViennaCore index.js initializes State Graph in initPhase7_3', () => {
    const indexSource = require('fs').readFileSync(
      require('path').join(__dirname, '../index.js'),
      'utf8'
    );
    
    expect(indexSource).toContain('getStateGraph');
    expect(indexSource).toContain('this.stateGraph = getStateGraph()');
    expect(indexSource).toContain('await this.stateGraph.initialize()');
    expect(indexSource).toContain('VIENNA_ENABLE_STATE_GRAPH_WRITES');
  });
  
  test('ViennaCore index.js wires State Graph to all components', () => {
    const indexSource = require('fs').readFileSync(
      require('path').join(__dirname, '../index.js'),
      'utf8'
    );
    
    // Check wiring calls
    expect(indexSource).toContain('providerHealthManager.setStateGraph');
    expect(indexSource).toContain('runtimeModeManager.setStateGraph');
    expect(indexSource).toContain('objectiveTracker.setStateGraph');
    expect(indexSource).toContain('for (const adapter of this._serviceAdapters)');
  });
});
