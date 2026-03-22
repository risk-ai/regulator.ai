/**
 * Phase 7.3: State-Aware Reads
 * 
 * Validates State Graph read-path integration.
 * 
 * Success criteria:
 * 1. getServiceStatus() returns fresh state from State Graph
 * 2. getServiceStatus() performs live check on stale state
 * 3. getServiceStatus() detects state drift
 * 4. getAllServices() returns fresh state when available
 * 5. getAllServices() performs live checks on stale state
 * 6. getProviderHealthHistory() returns transitions
 * 7. getRuntimeModeHistory() returns mode transitions
 * 8. getOpenIncidents() returns open incidents
 * 9. getActiveObjectives() returns active objectives
 * 10. detectStaleState() identifies stale services
 * 11. detectStaleState() identifies stale providers
 * 12. Graceful fallback when State Graph unavailable
 * 13. Graceful fallback when ServiceManager unavailable
 * 14. Staleness threshold configurable
 * 15. Metadata includes source and freshness info
 */

const { StateAwareDiagnostics } = require('../lib/core/state-aware-diagnostics');

describe('Phase 7.3 - State-Aware Reads', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T18:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Service Status Reads', () => {
    test('getServiceStatus() returns fresh state from State Graph', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          service_name: 'OpenClaw Gateway',
          service_type: 'api',
          status: 'running',
          health: 'healthy',
          last_check_at: '2026-03-12T17:57:00.000Z', // 3 minutes ago (fresh)
          metadata: JSON.stringify({ port: '18789' })
        })
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status.status).toBe('running');
      expect(status.health).toBe('healthy');
      expect(status._metadata.source).toBe('state_graph');
      expect(status._metadata.fresh).toBe(true);
      expect(status._metadata.age_ms).toBe(3 * 60 * 1000); // 3 minutes
    });

    test('getServiceStatus() performs live check on stale state', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          service_name: 'OpenClaw Gateway',
          service_type: 'api',
          status: 'stopped', // Stale state
          health: 'unhealthy',
          last_check_at: '2026-03-12T17:00:00.000Z', // 60 minutes ago (stale)
          metadata: JSON.stringify({ port: '18789' })
        })
      };

      const mockServiceManager = {
        getServices: jest.fn().mockResolvedValue([{
          service_id: 'openclaw-gateway',
          service_name: 'OpenClaw Gateway',
          service_type: 'api',
          status: 'running', // Live state (different)
          health: 'healthy',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: { port: '18789' }
        }])
      };

      diag.setDependencies(mockStateGraph, mockServiceManager, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      // Should use live state
      expect(status.status).toBe('running');
      expect(status.health).toBe('healthy');
      expect(status._metadata.source).toBe('live');
      expect(status._metadata.reason).toBe('stale_state_detected');
      expect(status._metadata.state_drift).toBe(true);
      expect(status._metadata.stored_status).toBe('stopped');
    });

    test('getServiceStatus() detects state drift', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          status: 'stopped',
          health: 'unhealthy',
          last_check_at: '2026-03-12T17:00:00.000Z', // Stale
          metadata: '{}'
        })
      };

      const mockServiceManager = {
        getServices: jest.fn().mockResolvedValue([{
          service_id: 'openclaw-gateway',
          status: 'running', // Drift detected
          health: 'healthy',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: {}
        }])
      };

      diag.setDependencies(mockStateGraph, mockServiceManager, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status._metadata.state_drift).toBe(true);
      expect(status._metadata.stored_status).toBe('stopped');
      expect(status.status).toBe('running');
    });

    test('getAllServices() returns fresh state when available', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listServices: jest.fn().mockReturnValue([
          {
            service_id: 'openclaw-gateway',
            service_name: 'OpenClaw Gateway',
            service_type: 'api',
            status: 'running',
            health: 'healthy',
            last_check_at: '2026-03-12T17:58:00.000Z', // 2 minutes ago (fresh)
            metadata: '{}'
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const services = await diag.getAllServices();

      expect(services).toHaveLength(1);
      expect(services[0].status).toBe('running');
      expect(services[0]._metadata.source).toBe('state_graph');
      expect(services[0]._metadata.fresh).toBe(true);
    });

    test('getAllServices() performs live checks on stale state', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listServices: jest.fn().mockReturnValue([
          {
            service_id: 'openclaw-gateway',
            status: 'stopped',
            health: 'unhealthy',
            last_check_at: '2026-03-12T17:00:00.000Z', // Stale
            metadata: '{}'
          }
        ])
      };

      const mockServiceManager = {
        getServices: jest.fn().mockResolvedValue([{
          service_id: 'openclaw-gateway',
          status: 'running',
          health: 'healthy',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: {}
        }])
      };

      diag.setDependencies(mockStateGraph, mockServiceManager, null, null);

      const services = await diag.getAllServices();

      expect(services).toHaveLength(1);
      expect(services[0].status).toBe('running');
      expect(services[0]._metadata.source).toBe('live');
      expect(services[0]._metadata.reason).toBe('stale_state_detected');
    });
  });

  describe('Provider Health History', () => {
    test('getProviderHealthHistory() returns transitions', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listTransitions: jest.fn().mockReturnValue([
          {
            entity_type: 'provider',
            entity_id: 'anthropic',
            field_name: 'health',
            old_value: 'healthy',
            new_value: 'unhealthy',
            changed_by: 'runtime',
            changed_at: '2026-03-12T17:50:00.000Z',
            metadata: '{}'
          },
          {
            entity_type: 'provider',
            entity_id: 'anthropic',
            field_name: 'status',
            old_value: 'active',
            new_value: 'degraded',
            changed_by: 'runtime',
            changed_at: '2026-03-12T17:55:00.000Z',
            metadata: '{}'
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const history = await diag.getProviderHealthHistory('anthropic', 10);

      expect(history).toHaveLength(2);
      expect(history[0].field).toBe('health');
      expect(history[0].old_value).toBe('healthy');
      expect(history[0].new_value).toBe('unhealthy');
      expect(history[1].field).toBe('status');
    });

    test('Returns empty array when State Graph unavailable', async () => {
      const diag = new StateAwareDiagnostics();

      diag.setDependencies(null, null, null, null);

      const history = await diag.getProviderHealthHistory('anthropic');

      expect(history).toEqual([]);
    });
  });

  describe('Runtime Mode History', () => {
    test('getRuntimeModeHistory() returns mode transitions', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listTransitions: jest.fn().mockReturnValue([
          {
            entity_type: 'runtime_context',
            entity_id: 'runtime_mode',
            field_name: 'context_value',
            old_value: 'normal',
            new_value: 'degraded',
            changed_by: 'runtime',
            changed_at: '2026-03-12T17:45:00.000Z',
            metadata: JSON.stringify({ automatic: true })
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const history = await diag.getRuntimeModeHistory(10);

      expect(history).toHaveLength(1);
      expect(history[0].old_mode).toBe('normal');
      expect(history[0].new_mode).toBe('degraded');
      expect(history[0].metadata.automatic).toBe(true);
    });

    test('Returns empty array when State Graph unavailable', async () => {
      const diag = new StateAwareDiagnostics();

      diag.setDependencies(null, null, null, null);

      const history = await diag.getRuntimeModeHistory();

      expect(history).toEqual([]);
    });
  });

  describe('Incidents and Objectives', () => {
    test('getOpenIncidents() returns open incidents', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listIncidents: jest.fn().mockReturnValue([
          {
            incident_id: 'inc_001',
            incident_type: 'service_failure',
            severity: 'high',
            status: 'open',
            affected_services: JSON.stringify(['openclaw-gateway']),
            detected_at: '2026-03-12T17:30:00.000Z',
            detected_by: 'system',
            root_cause: null,
            action_taken: null
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const incidents = await diag.getOpenIncidents();

      expect(incidents).toHaveLength(1);
      expect(incidents[0].incident_id).toBe('inc_001');
      expect(incidents[0].severity).toBe('high');
      expect(incidents[0].affected_services).toEqual(['openclaw-gateway']);
    });

    test('getActiveObjectives() returns active objectives', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listObjectives: jest.fn().mockReturnValue([
          {
            objective_id: 'obj_001',
            objective_name: 'Fix Gateway',
            objective_type: 'task',
            status: 'active',
            priority: 'high',
            assigned_to: 'vienna',
            progress_pct: 50,
            started_at: '2026-03-12T17:00:00.000Z',
            due_at: '2026-03-12T19:00:00.000Z'
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const objectives = await diag.getActiveObjectives();

      expect(objectives).toHaveLength(1);
      expect(objectives[0].objective_id).toBe('obj_001');
      expect(objectives[0].progress_pct).toBe(50);
    });
  });

  describe('Stale State Detection', () => {
    test('detectStaleState() identifies stale services', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listServices: jest.fn().mockReturnValue([
          {
            service_id: 'openclaw-gateway',
            last_check_at: '2026-03-12T17:00:00.000Z' // 60 minutes ago (stale)
          }
        ]),
        listProviders: jest.fn().mockReturnValue([])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const report = await diag.detectStaleState();

      expect(report.stale_detected).toBe(true);
      expect(report.stale_services).toHaveLength(1);
      expect(report.stale_services[0].service_id).toBe('openclaw-gateway');
      expect(report.stale_services[0].age_ms).toBe(60 * 60 * 1000);
    });

    test('detectStaleState() identifies stale providers', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listServices: jest.fn().mockReturnValue([]),
        listProviders: jest.fn().mockReturnValue([
          {
            provider_id: 'anthropic',
            last_health_check: '2026-03-12T17:00:00.000Z' // 60 minutes ago (stale)
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const report = await diag.detectStaleState();

      expect(report.stale_detected).toBe(true);
      expect(report.stale_providers).toHaveLength(1);
      expect(report.stale_providers[0].provider_id).toBe('anthropic');
    });

    test('detectStaleState() returns false when all fresh', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        listServices: jest.fn().mockReturnValue([
          {
            service_id: 'openclaw-gateway',
            last_check_at: '2026-03-12T17:58:00.000Z' // 2 minutes ago (fresh)
          }
        ]),
        listProviders: jest.fn().mockReturnValue([
          {
            provider_id: 'anthropic',
            last_health_check: '2026-03-12T17:58:00.000Z' // 2 minutes ago (fresh)
          }
        ])
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const report = await diag.detectStaleState();

      expect(report.stale_detected).toBe(false);
      expect(report.stale_services).toHaveLength(0);
      expect(report.stale_providers).toHaveLength(0);
    });
  });

  describe('Graceful Fallback', () => {
    test('Graceful fallback when State Graph unavailable', async () => {
      const diag = new StateAwareDiagnostics();

      const mockServiceManager = {
        getServices: jest.fn().mockResolvedValue([{
          service_id: 'openclaw-gateway',
          status: 'running',
          health: 'healthy',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: {}
        }])
      };

      diag.setDependencies(null, mockServiceManager, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status.status).toBe('running');
      expect(status._metadata.source).toBe('live');
      expect(status._metadata.reason).toBe('state_graph_unavailable');
    });

    test('Graceful fallback when ServiceManager unavailable', async () => {
      const diag = new StateAwareDiagnostics();

      diag.setDependencies(null, null, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status.status).toBe('unknown');
      expect(status._metadata.source).toBe('fallback');
      expect(status._metadata.reason).toBe('service_manager_unavailable');
    });
  });

  describe('Metadata', () => {
    test('Metadata includes source and freshness info', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          status: 'running',
          health: 'healthy',
          last_check_at: '2026-03-12T17:58:00.000Z', // Fresh
          metadata: '{}'
        })
      };

      diag.setDependencies(mockStateGraph, null, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status._metadata).toHaveProperty('source');
      expect(status._metadata).toHaveProperty('age_ms');
      expect(status._metadata).toHaveProperty('fresh');
      expect(status._metadata.source).toBe('state_graph');
      expect(status._metadata.fresh).toBe(true);
    });

    test('Stale state metadata includes drift information', async () => {
      const diag = new StateAwareDiagnostics();

      const mockStateGraph = {
        getService: jest.fn().mockReturnValue({
          service_id: 'openclaw-gateway',
          status: 'stopped',
          health: 'unhealthy',
          last_check_at: '2026-03-12T17:00:00.000Z', // Stale
          metadata: '{}'
        })
      };

      const mockServiceManager = {
        getServices: jest.fn().mockResolvedValue([{
          service_id: 'openclaw-gateway',
          status: 'running',
          health: 'healthy',
          last_check_at: '2026-03-12T18:00:00.000Z',
          metadata: {}
        }])
      };

      diag.setDependencies(mockStateGraph, mockServiceManager, null, null);

      const status = await diag.getServiceStatus('openclaw-gateway');

      expect(status._metadata).toHaveProperty('reason');
      expect(status._metadata).toHaveProperty('stored_age_ms');
      expect(status._metadata).toHaveProperty('stored_status');
      expect(status._metadata).toHaveProperty('stored_health');
      expect(status._metadata).toHaveProperty('state_drift');
      expect(status._metadata.reason).toBe('stale_state_detected');
      expect(status._metadata.state_drift).toBe(true);
    });
  });
});
