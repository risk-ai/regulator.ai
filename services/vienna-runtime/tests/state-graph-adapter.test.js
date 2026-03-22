/**
 * State Graph Adapter Integration Tests (Phase 7.1 Stage 2)
 */

const { StateGraphAdapter } = require('../lib/execution/adapters/state-graph-adapter');
const { StateGraph } = require('../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-state-graph-adapter.db');

describe('State Graph Adapter - Stage 2: Executor Integration', () => {
  let adapter;
  let stateGraph;

  beforeEach(async () => {
    // Clean test database
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
  // VALIDATION
  // ============================================================

  test('S2.1: Validate create service action', () => {
    const action = {
      action_type: 'create',
      entity_type: 'service',
      entity_data: {
        service_id: 'test-service',
        service_name: 'Test Service',
        service_type: 'api',
        status: 'running'
      }
    };

    const result = adapter.validate(action);
    expect(result.valid).toBe(true);
  });

  test('S2.2: Reject create without entity_data', () => {
    const action = {
      action_type: 'create',
      entity_type: 'service'
      // missing entity_data
    };

    const result = adapter.validate(action);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires entity_data');
  });

  test('S2.3: Reject update without entity_id', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      updates: { status: 'degraded' }
      // missing entity_id
    };

    const result = adapter.validate(action);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires entity_id');
  });

  test('S2.4: Reject invalid entity_type', () => {
    const action = {
      action_type: 'create',
      entity_type: 'invalid_type',
      entity_data: {}
    };

    const result = adapter.validate(action);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid entity_type');
  });

  // ============================================================
  // RISK TIER CLASSIFICATION
  // ============================================================

  test('S2.5: Service status update is T2', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'kalshi-cron',
      updates: { status: 'degraded' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T2');
  });

  test('S2.6: Trading flag change is T2', () => {
    const action = {
      action_type: 'update',
      entity_type: 'runtime_context',
      entity_id: 'autonomous_window_active',
      updates: { context_value: 'false' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T2');
  });

  test('S2.7: Provider status change is T1', () => {
    const action = {
      action_type: 'update',
      entity_type: 'provider',
      entity_id: 'anthropic-main',
      updates: { status: 'degraded' }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T1');
  });

  test('S2.8: Objective update is T0', () => {
    const action = {
      action_type: 'update',
      entity_type: 'objective',
      entity_id: 'obj_001',
      updates: { progress_pct: 50 }
    };

    const tier = adapter.getRiskTier(action);
    expect(tier).toBe('T0');
  });

  // ============================================================
  // TRADING IMPACT DETECTION
  // ============================================================

  test('S2.9: Trading service change affects trading', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'kalshi-cron',
      updates: { status: 'stopped' }
    };

    const affects = adapter.affectsTrading(action);
    expect(affects).toBe(true);
  });

  test('S2.10: Non-trading service change does not affect trading', () => {
    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'other-service',
      updates: { status: 'running' }
    };

    const affects = adapter.affectsTrading(action);
    expect(affects).toBe(false);
  });

  test('S2.11: Trading flag change affects trading', () => {
    const action = {
      action_type: 'create',
      entity_type: 'runtime_context',
      entity_data: {
        context_key: 'trading_enabled',
        context_value: 'false'
      }
    };

    const affects = adapter.affectsTrading(action);
    expect(affects).toBe(true);
  });

  // ============================================================
  // EXECUTION: CREATE
  // ============================================================

  test('S2.12: Execute create service', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'service',
      entity_data: {
        service_id: 'test-service',
        service_name: 'Test Service',
        service_type: 'api',
        status: 'running'
      }
    };

    const warrant = { issued_by: 'vienna' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe('test-service');
    expect(result.changes).toBe(1);

    // Verify in database
    const service = adapter.stateGraph.getService('test-service');
    expect(service).toBeDefined();
    expect(service.service_name).toBe('Test Service');
  });

  test('S2.13: Execute create incident', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'incident',
      entity_data: {
        incident_id: 'inc_001',
        incident_type: 'service_failure',
        severity: 'high',
        status: 'open',
        detected_at: '2026-03-12T15:30:00Z'
      }
    };

    const warrant = { issued_by: 'castlereagh' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe('inc_001');

    const incident = adapter.stateGraph.getIncident('inc_001');
    expect(incident.severity).toBe('high');
  });

  // ============================================================
  // EXECUTION: UPDATE
  // ============================================================

  test('S2.14: Execute update service status', async () => {
    // Create service first
    adapter.stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'api',
      status: 'running'
    });

    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'test-service',
      updates: { status: 'degraded', health: 'warning' }
    };

    const warrant = { issued_by: 'castlereagh' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);
    expect(result.changes).toBe(1);

    const updated = adapter.stateGraph.getService('test-service');
    expect(updated.status).toBe('degraded');
    expect(updated.health).toBe('warning');
  });

  test('S2.15: Execute update incident (resolve)', async () => {
    adapter.stateGraph.createIncident({
      incident_id: 'inc_002',
      incident_type: 'api_error',
      severity: 'medium',
      status: 'open',
      detected_at: '2026-03-12T15:00:00Z'
    });

    const action = {
      action_type: 'update',
      entity_type: 'incident',
      entity_id: 'inc_002',
      updates: {
        status: 'resolved',
        resolved_at: '2026-03-12T15:30:00Z',
        resolution: 'Restarted service'
      }
    };

    const warrant = { issued_by: 'alexander' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);

    const updated = adapter.stateGraph.getIncident('inc_002');
    expect(updated.status).toBe('resolved');
    expect(updated.resolution).toBe('Restarted service');
  });

  // ============================================================
  // EXECUTION: DELETE
  // ============================================================

  test('S2.16: Execute delete service', async () => {
    adapter.stateGraph.createService({
      service_id: 'temp-service',
      service_name: 'Temporary Service',
      service_type: 'worker',
      status: 'stopped'
    });

    const action = {
      action_type: 'delete',
      entity_type: 'service',
      entity_id: 'temp-service'
    };

    const warrant = { issued_by: 'vienna' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);
    expect(result.changes).toBe(1);

    const deleted = adapter.stateGraph.getService('temp-service');
    expect(deleted).toBeUndefined();
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  test('S2.17: Execute fails gracefully on nonexistent entity', async () => {
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

  test('S2.18: Execute fails on invalid action_type', async () => {
    const action = {
      action_type: 'invalid',
      entity_type: 'service',
      entity_id: 'test-service'
    };

    const warrant = { issued_by: 'vienna' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown action type');
  });

  // ============================================================
  // STATE TRANSITIONS TRACKING
  // ============================================================

  test('S2.19: Updates record state transitions with changed_by', async () => {
    adapter.stateGraph.createService({
      service_id: 'tracked-service',
      service_name: 'Tracked Service',
      service_type: 'api',
      status: 'running'
    });

    const action = {
      action_type: 'update',
      entity_type: 'service',
      entity_id: 'tracked-service',
      updates: { status: 'degraded' }
    };

    const warrant = { issued_by: 'castlereagh' };
    await adapter.execute(action, warrant);

    const transitions = adapter.stateGraph.listTransitions({ entity_id: 'tracked-service' });
    expect(transitions.length).toBeGreaterThan(0);

    const statusTransition = transitions.find(t => t.field_name === 'status');
    expect(statusTransition.changed_by).toBe('castlereagh');
    expect(statusTransition.old_value).toBe('running');
    expect(statusTransition.new_value).toBe('degraded');
  });

  // ============================================================
  // RUNTIME CONTEXT
  // ============================================================

  test('S2.20: Execute create runtime context', async () => {
    const action = {
      action_type: 'create',
      entity_type: 'runtime_context',
      entity_data: {
        context_key: 'test_flag',
        context_value: 'enabled',
        context_type: 'flag'
      }
    };

    const warrant = { issued_by: 'vienna' };
    const result = await adapter.execute(action, warrant);

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe('test_flag');

    const ctx = adapter.stateGraph.getRuntimeContext('test_flag');
    expect(ctx.context_value).toBe('enabled');
  });
});
