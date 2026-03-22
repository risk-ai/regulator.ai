/**
 * State Graph Unit Tests (Phase 7.1 Stage 1)
 */

const { StateGraph } = require('../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-state-graph.db');

describe('State Graph - Stage 1: Schema + Core API', () => {
  let stateGraph;

  beforeEach(async () => {
    // Clean test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    stateGraph = new StateGraph({ dbPath: TEST_DB_PATH });
    await stateGraph.initialize();
  });

  afterEach(() => {
    if (stateGraph) {
      stateGraph.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ============================================================
  // INITIALIZATION
  // ============================================================

  test('S1.1: Initialize creates database file', async () => {
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  test('S1.2: Schema tables exist', async () => {
    const tables = stateGraph.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();

    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('services');
    expect(tableNames).toContain('providers');
    expect(tableNames).toContain('incidents');
    expect(tableNames).toContain('objectives');
    expect(tableNames).toContain('runtime_context');
    expect(tableNames).toContain('state_transitions');
  });

  test('S1.3: Indexes exist', async () => {
    const indexes = stateGraph.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name
    `).all();

    expect(indexes.length).toBeGreaterThan(0);
    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain('idx_services_status');
    expect(indexNames).toContain('idx_incidents_severity');
  });

  // ============================================================
  // SERVICES CRUD
  // ============================================================

  test('S1.4: Create service', () => {
    const result = stateGraph.createService({
      service_id: 'kalshi-cron',
      service_name: 'Kalshi Trading Cron',
      service_type: 'cron',
      status: 'running',
      health: 'healthy',
      last_check_at: '2026-03-12T15:00:00Z'
    });

    expect(result.service_id).toBe('kalshi-cron');
    expect(result.changes).toBe(1);
  });

  test('S1.5: Get service', () => {
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'api',
      status: 'running'
    });

    const service = stateGraph.getService('test-service');
    expect(service).toBeDefined();
    expect(service.service_name).toBe('Test Service');
    expect(service.status).toBe('running');
  });

  test('S1.6: List services', () => {
    stateGraph.createService({
      service_id: 'service-1',
      service_name: 'Service 1',
      service_type: 'cron',
      status: 'running'
    });

    stateGraph.createService({
      service_id: 'service-2',
      service_name: 'Service 2',
      service_type: 'api',
      status: 'degraded'
    });

    const all = stateGraph.listServices();
    expect(all.length).toBe(2);

    const running = stateGraph.listServices({ status: 'running' });
    expect(running.length).toBe(1);
    expect(running[0].service_id).toBe('service-1');
  });

  test('S1.7: Update service', () => {
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'api',
      status: 'running'
    });

    const result = stateGraph.updateService('test-service', {
      status: 'degraded',
      health: 'warning'
    }, 'test-agent');

    expect(result.changes).toBe(1);

    const updated = stateGraph.getService('test-service');
    expect(updated.status).toBe('degraded');
    expect(updated.health).toBe('warning');
  });

  test('S1.8: Delete service', () => {
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'api',
      status: 'running'
    });

    const result = stateGraph.deleteService('test-service');
    expect(result.changes).toBe(1);

    const deleted = stateGraph.getService('test-service');
    expect(deleted).toBeUndefined();
  });

  // ============================================================
  // PROVIDERS CRUD
  // ============================================================

  test('S1.9: Create provider', () => {
    const result = stateGraph.createProvider({
      provider_id: 'anthropic-main',
      provider_name: 'Anthropic (Production)',
      provider_type: 'llm',
      status: 'active',
      health: 'healthy'
    });

    expect(result.provider_id).toBe('anthropic-main');
    expect(result.changes).toBe(1);
  });

  test('S1.10: Update provider', () => {
    stateGraph.createProvider({
      provider_id: 'test-provider',
      provider_name: 'Test Provider',
      provider_type: 'llm',
      status: 'active'
    });

    stateGraph.updateProvider('test-provider', {
      status: 'degraded',
      error_count: 5
    });

    const updated = stateGraph.getProvider('test-provider');
    expect(updated.status).toBe('degraded');
    expect(updated.error_count).toBe(5);
  });

  // ============================================================
  // INCIDENTS CRUD
  // ============================================================

  test('S1.11: Create incident', () => {
    const result = stateGraph.createIncident({
      incident_id: 'inc_001',
      incident_type: 'service_failure',
      severity: 'high',
      status: 'open',
      detected_at: '2026-03-12T15:30:00Z',
      detected_by: 'castlereagh'
    });

    expect(result.incident_id).toBe('inc_001');
    expect(result.changes).toBe(1);
  });

  test('S1.12: Update incident status', () => {
    stateGraph.createIncident({
      incident_id: 'inc_002',
      incident_type: 'api_error',
      severity: 'medium',
      status: 'open',
      detected_at: '2026-03-12T15:30:00Z'
    });

    stateGraph.updateIncident('inc_002', {
      status: 'resolved',
      resolved_at: '2026-03-12T15:45:00Z',
      resolution: 'Restarted service'
    });

    const updated = stateGraph.getIncident('inc_002');
    expect(updated.status).toBe('resolved');
    expect(updated.resolution).toBe('Restarted service');
  });

  test('S1.13: List incidents by severity', () => {
    stateGraph.createIncident({
      incident_id: 'inc_003',
      incident_type: 'service_failure',
      severity: 'critical',
      status: 'open',
      detected_at: '2026-03-12T15:00:00Z'
    });

    stateGraph.createIncident({
      incident_id: 'inc_004',
      incident_type: 'api_error',
      severity: 'low',
      status: 'open',
      detected_at: '2026-03-12T15:10:00Z'
    });

    const critical = stateGraph.listIncidents({ severity: 'critical' });
    expect(critical.length).toBe(1);
    expect(critical[0].incident_id).toBe('inc_003');
  });

  // ============================================================
  // OBJECTIVES CRUD
  // ============================================================

  test('S1.14: Create objective', () => {
    const result = stateGraph.createObjective({
      objective_id: 'obj_001',
      objective_name: 'Phase 7.1 State Graph',
      objective_type: 'milestone',
      status: 'active',
      priority: 'high',
      assigned_to: 'vienna',
      progress_pct: 25
    });

    expect(result.objective_id).toBe('obj_001');
    expect(result.changes).toBe(1);
  });

  test('S1.15: Update objective progress', () => {
    stateGraph.createObjective({
      objective_id: 'obj_002',
      objective_name: 'Test Objective',
      objective_type: 'task',
      status: 'active',
      progress_pct: 0
    });

    stateGraph.updateObjective('obj_002', {
      progress_pct: 50
    });

    const updated = stateGraph.getObjective('obj_002');
    expect(updated.progress_pct).toBe(50);
  });

  test('S1.16: List objectives by status', () => {
    stateGraph.createObjective({
      objective_id: 'obj_003',
      objective_name: 'Active Task',
      objective_type: 'task',
      status: 'active'
    });

    stateGraph.createObjective({
      objective_id: 'obj_004',
      objective_name: 'Blocked Task',
      objective_type: 'task',
      status: 'blocked',
      blocked_reason: 'Waiting for approval'
    });

    const blocked = stateGraph.listObjectives({ status: 'blocked' });
    expect(blocked.length).toBe(1);
    expect(blocked[0].blocked_reason).toBe('Waiting for approval');
  });

  // ============================================================
  // RUNTIME CONTEXT
  // ============================================================

  test('S1.17: Set runtime context', () => {
    const result = stateGraph.setRuntimeContext('autonomous_window_active', 'true', {
      context_type: 'flag',
      expires_at: '2026-03-17T00:00:00Z'
    });

    expect(result.context_key).toBe('autonomous_window_active');
    expect(result.changes).toBe(1);
  });

  test('S1.18: Get runtime context', () => {
    stateGraph.setRuntimeContext('test_flag', 'enabled');

    const ctx = stateGraph.getRuntimeContext('test_flag');
    expect(ctx).toBeDefined();
    expect(ctx.context_value).toBe('enabled');
  });

  test('S1.19: List runtime context', () => {
    stateGraph.setRuntimeContext('flag1', 'true', { context_type: 'flag' });
    stateGraph.setRuntimeContext('config1', 'value', { context_type: 'config' });

    const flags = stateGraph.listRuntimeContext({ context_type: 'flag' });
    expect(flags.length).toBe(1);
    expect(flags[0].context_key).toBe('flag1');
  });

  // ============================================================
  // STATE TRANSITIONS
  // ============================================================

  test('S1.20: State transitions recorded on update', () => {
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'api',
      status: 'running'
    });

    stateGraph.updateService('test-service', {
      status: 'degraded'
    }, 'test-agent');

    const transitions = stateGraph.listTransitions({ entity_id: 'test-service' });
    expect(transitions.length).toBeGreaterThan(0);

    const statusTransition = transitions.find(t => t.field_name === 'status');
    expect(statusTransition).toBeDefined();
    expect(statusTransition.old_value).toBe('running');
    expect(statusTransition.new_value).toBe('degraded');
    expect(statusTransition.changed_by).toBe('test-agent');
  });

  // ============================================================
  // JSON FIELD HANDLING
  // ============================================================

  test('S1.21: JSON dependencies field', () => {
    stateGraph.createService({
      service_id: 'dependent-service',
      service_name: 'Dependent Service',
      service_type: 'api',
      status: 'running',
      dependencies: ['service-a', 'service-b']
    });

    const service = stateGraph.getService('dependent-service');
    expect(service.dependencies).toBe('["service-a","service-b"]');
  });

  test('S1.22: JSON metadata field', () => {
    stateGraph.createProvider({
      provider_id: 'test-provider',
      provider_name: 'Test Provider',
      provider_type: 'llm',
      status: 'active',
      metadata: { models: ['model-a', 'model-b'], tier: 'production' }
    });

    const provider = stateGraph.getProvider('test-provider');
    const metadata = JSON.parse(provider.metadata);
    expect(metadata.models).toEqual(['model-a', 'model-b']);
    expect(metadata.tier).toBe('production');
  });

  // ============================================================
  // CONSTRAINT VALIDATION
  // ============================================================

  test('S1.23: Invalid service status rejected', () => {
    expect(() => {
      stateGraph.createService({
        service_id: 'invalid-service',
        service_name: 'Invalid Service',
        service_type: 'api',
        status: 'invalid_status' // Not in enum
      });
    }).toThrow();
  });

  test('S1.24: Invalid incident severity rejected', () => {
    expect(() => {
      stateGraph.createIncident({
        incident_id: 'inc_invalid',
        incident_type: 'service_failure',
        severity: 'super_critical', // Not in enum
        status: 'open',
        detected_at: '2026-03-12T15:00:00Z'
      });
    }).toThrow();
  });

  // ============================================================
  // CONCURRENCY
  // ============================================================

  test('S1.25: Concurrent reads (WAL mode)', () => {
    stateGraph.createService({
      service_id: 'concurrent-service',
      service_name: 'Concurrent Service',
      service_type: 'api',
      status: 'running'
    });

    // Multiple reads should succeed (WAL mode allows concurrent reads)
    const read1 = stateGraph.getService('concurrent-service');
    const read2 = stateGraph.getService('concurrent-service');
    const read3 = stateGraph.listServices();

    expect(read1).toBeDefined();
    expect(read2).toBeDefined();
    expect(read3.length).toBeGreaterThan(0);
  });
});
