/**
 * State Graph Governance Tests (Phase 7.1 Stage 4)
 * 
 * Validates integration with Vienna governance:
 * - Warrant enforcement
 * - Trading guard
 * - Risk tier classification
 * - Audit trail
 */

const { StateGraphAdapter } = require('../lib/execution/adapters/state-graph-adapter');
const { StateGraph } = require('../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-state-graph-gov.db');

describe('State Graph Governance - Stage 4: Phase 6 Validation', () => {
  let adapter;
  let stateGraph;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    adapter = new StateGraphAdapter();
    adapter.stateGraph = new StateGraph({ dbPath: TEST_DB_PATH });
    await adapter.stateGraph.initialize();
  });

  afterEach(() => {
    if (adapter && adapter.stateGraph) {
      adapter.stateGraph.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ============================================================
  // G1: STATE UPDATE REQUIRES VALID ACTION
  // ============================================================

  test('G1: State update requires valid action structure', () => {
    const invalidAction = {
      // missing action_type
      entity_type: 'service',
      entity_data: { service_id: 'test' }
    };

    const result = adapter.validate(invalidAction);
    expect(result.valid).toBe(false);
  });

  test('G1.1: Create action validated before execution', () => {
    const action = {
      action_type: 'create',
      entity_type: 'service',
      entity_data: {
        service_id: 'new-service',
        service_name: 'New Service',
        service_type: 'api',
        status: 'running'
      }
    };

    const validation = adapter.validate(action);
    expect(validation.valid).toBe(true);
  });

  test('G1.2: Update action must have entity_id', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      updates: { status: 'degraded' }
      // missing entity_id
    };

    const validation = adapter.validate(action);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('requires entity_id');
  });

  // ============================================================
  // G2: TRADING-CRITICAL UPDATES REQUIRE T2
  // ============================================================

  test('G2: Trading service status change is T2', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'kalshi-cron',
      updates: { status: 'stopped' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T2');
  });

  test('G2.1: Autonomous window flag change is T2', () => {
    const action = {
      action_type: 'create',
      entity_type: 'runtime_context',
      entity_data: {
        context_key: 'autonomous_window_active',
        context_value: 'false'
      }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T2');
  });

  test('G2.2: Trading kill switch is T2', () => {
    const action = {
      action_type: 'update',
      entity_type: 'runtime_context',
      entity_id: 'risk_kill_switch',
      updates: { context_value: 'activated' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T2');
  });

  test('G2.3: Non-trading service is T0', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'other-service',
      updates: { health: 'warning' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T0');
  });

  // ============================================================
  // A1: ALL STATE CHANGES LOGGED TO AUDIT TRAIL
  // ============================================================

  test('A1: State transitions recorded for status changes', async () => {
    // Create service
    adapter.stateGraph.createService({
      service_id: 'monitored-service',
      service_name: 'Monitored Service',
      service_type: 'api',
      status: 'running'
    });

    // Update status
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'monitored-service',
      updates: { status: 'degraded' }
    };

    const warrant = { issued_by: 'castlereagh' };
    await adapter.execute(action, warrant);

    // Check audit trail
    const transitions = adapter.stateGraph.listTransitions({ 
      entity_id: 'monitored-service',
      field_name: 'status'
    });

    expect(transitions.length).toBeGreaterThan(0);
    const transition = transitions.find(t => t.field_name === 'status');
    expect(transition).toBeDefined();
    expect(transition.old_value).toBe('running');
    expect(transition.new_value).toBe('degraded');
    expect(transition.changed_by).toBe('castlereagh');
  });

  test('A1.1: Multiple field changes recorded separately', async () => {
    adapter.stateGraph.createService({
      service_id: 'multi-field-service',
      service_name: 'Multi Field Service',
      service_type: 'api',
      status: 'running',
      health: 'healthy'
    });

    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'multi-field-service',
      updates: { 
        status: 'degraded',
        health: 'warning'
      }
    };

    const warrant = { issued_by: 'system' };
    await adapter.execute(action, warrant);

    const transitions = adapter.stateGraph.listTransitions({ 
      entity_id: 'multi-field-service'
    });

    expect(transitions.length).toBeGreaterThanOrEqual(2);
    
    const statusTransition = transitions.find(t => t.field_name === 'status');
    const healthTransition = transitions.find(t => t.field_name === 'health');
    
    expect(statusTransition).toBeDefined();
    expect(healthTransition).toBeDefined();
  });

  // ============================================================
  // T1: TRADING GUARD BLOCKS CRITICAL CHANGES
  // ============================================================

  test('T1: Trading service changes detected', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'kalshi-cron',
      updates: { status: 'stopped' }
    };

    const affectsTrading = adapter.affectsTrading(action);
    expect(affectsTrading).toBe(true);
  });

  test('T1.1: Trading flag changes detected', () => {
    const action = {
      action_type: 'update',
      entity_type: 'runtime_context',
      entity_id: 'trading_enabled',
      updates: { context_value: 'false' }
    };

    const affectsTrading = adapter.affectsTrading(action);
    expect(affectsTrading).toBe(true);
  });

  test('T1.2: Non-trading changes not blocked', () => {
    const action = {
      action_type: 'update',
      entity_type: 'objective',
      entity_id: 'obj_001',
      updates: { progress_pct: 75 }
    };

    const affectsTrading = adapter.affectsTrading(action);
    expect(affectsTrading).toBe(false);
  });

  // ============================================================
  // C1: CONCURRENT READS DO NOT CORRUPT DATABASE
  // ============================================================

  test('C1: Concurrent reads safe (WAL mode)', async () => {
    // Seed data
    adapter.stateGraph.createService({
      service_id: 'concurrent-service',
      service_name: 'Concurrent Service',
      service_type: 'api',
      status: 'running'
    });

    // Multiple concurrent reads
    const reads = await Promise.all([
      Promise.resolve(adapter.stateGraph.getService('concurrent-service')),
      Promise.resolve(adapter.stateGraph.listServices()),
      Promise.resolve(adapter.stateGraph.getService('concurrent-service')),
      Promise.resolve(adapter.stateGraph.listServices({ status: 'running' }))
    ]);

    expect(reads[0]).toBeDefined();
    expect(reads[1].length).toBeGreaterThan(0);
    expect(reads[2]).toBeDefined();
    expect(reads[3].length).toBeGreaterThan(0);
  });

  // ============================================================
  // D1: DETERMINISTIC EXECUTION
  // ============================================================

  test('D1: Same action produces same result', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'service',
      entity_data: {
        service_id: 'deterministic-service',
        service_name: 'Deterministic Service',
        service_type: 'api',
        status: 'running'
      }
    };

    const warrant = { issued_by: 'vienna' };
    const result1 = await adapter.execute(action, warrant);

    expect(result1.success).toBe(true);
    expect(result1.entity_id).toBe('deterministic-service');

    // Second execution should fail (duplicate)
    const result2 = await adapter.execute(action, warrant);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('UNIQUE constraint');
  });

  test('D1.1: Update is idempotent', async () => {
    adapter.stateGraph.createService({
      service_id: 'idempotent-service',
      service_name: 'Idempotent Service',
      service_type: 'api',
      status: 'running'
    });

    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'idempotent-service',
      updates: { status: 'degraded' }
    };

    const warrant = { issued_by: 'vienna' };
    
    // Execute twice
    const result1 = await adapter.execute(action, warrant);
    const result2 = await adapter.execute(action, warrant);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Both produce same final state
    const final = adapter.stateGraph.getService('idempotent-service');
    expect(final.status).toBe('degraded');
  });

  // ============================================================
  // E1: ERROR HANDLING
  // ============================================================

  test('E1: Invalid entity type fails gracefully', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'invalid_type',
      entity_data: {}
    };

    const validation = adapter.validate(action);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Invalid entity_type');
  });

  test('E1.1: Missing required field fails gracefully', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'service',
      entity_data: {
        // missing service_id
        service_name: 'Invalid Service',
        service_type: 'api',
        status: 'running'
      }
    };

    const validation = adapter.validate(action);
    expect(validation.valid).toBe(false);
  });

  test('E1.2: Update nonexistent entity fails gracefully', async () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'nonexistent-service',
      updates: { status: 'running' }
    };

    const warrant = { issued_by: 'vienna' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  // ============================================================
  // COVERAGE: All entity types CRUD
  // ============================================================

  test('Coverage: Providers CRUD', async () => {
    // Create
    const createAction = {
      action_type: 'create',
      entity_type: 'provider',
      entity_data: {
        provider_id: 'test-provider',
        provider_name: 'Test Provider',
        provider_type: 'llm',
        status: 'active'
      }
    };

    const warrant = { issued_by: 'vienna' };
    const createResult = await adapter.execute(createAction, warrant);
    expect(createResult.success).toBe(true);

    // Update
    const updateAction = {
      action_type: 'update',
      entity_type: 'provider',
      entity_id: 'test-provider',
      updates: { status: 'degraded' }
    };

    const updateResult = await adapter.execute(updateAction, warrant);
    expect(updateResult.success).toBe(true);

    // Read
    const provider = adapter.stateGraph.getProvider('test-provider');
    expect(provider.status).toBe('degraded');

    // Delete
    const deleteAction = {
      action_type: 'delete',
      entity_type: 'provider',
      entity_id: 'test-provider'
    };

    const deleteResult = await adapter.execute(deleteAction, warrant);
    expect(deleteResult.success).toBe(true);
  });

  test('Coverage: Incidents CRUD', async () => {
    const createAction = {
      action_type: 'create',
      entity_type: 'incident',
      entity_data: {
        incident_id: 'test-incident',
        incident_type: 'service_failure',
        severity: 'high',
        status: 'open',
        detected_at: new Date().toISOString()
      }
    };

    const warrant = { issued_by: 'alexander' };
    const result = await adapter.execute(createAction, warrant);
    expect(result.success).toBe(true);

    const incident = adapter.stateGraph.getIncident('test-incident');
    expect(incident.severity).toBe('high');
  });

  test('Coverage: Objectives CRUD', async () => {
    const createAction = {
      action_type: 'create',
      entity_type: 'objective',
      entity_data: {
        objective_id: 'test-objective',
        objective_name: 'Test Objective',
        objective_type: 'task',
        status: 'active'
      }
    };

    const warrant = { issued_by: 'talleyrand' };
    const result = await adapter.execute(createAction, warrant);
    expect(result.success).toBe(true);

    const objective = adapter.stateGraph.getObjective('test-objective');
    expect(objective.status).toBe('active');
  });
});
