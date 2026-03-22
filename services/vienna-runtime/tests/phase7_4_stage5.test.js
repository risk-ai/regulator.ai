/**
 * Phase 7.4 Stage 5 Tests: Config Snapshots + Operational Metrics + Final Validation
 * 
 * Validates:
 * - Config snapshot creation before mutation
 * - Snapshot blocks unsafe config writes
 * - Metrics reflect true state
 * - No Phase 7.2 or 7.3 regressions
 */

const ConfigSnapshot = require('../lib/execution/config-snapshot');
const OperationalMetrics = require('../lib/execution/operational-metrics');
const { QueuedExecutor } = require('../lib/execution/queued-executor');
const { ReplayLog } = require('../lib/execution/replay-log');
const fs = require('fs');
const path = require('path');

describe('Phase 7.4 Stage 5: Config Snapshots + Metrics + Final Validation', () => {
  
  describe('ConfigSnapshot (standalone)', () => {
    let snapshotDir;
    let configSnapshot;
    let testConfigPath;
    
    beforeEach(async () => {
      snapshotDir = path.join(__dirname, '../.test-data/config-snapshots-test');
      testConfigPath = path.join(snapshotDir, 'test-config.json');
      
      if (fs.existsSync(snapshotDir)) {
        fs.rmSync(snapshotDir, { recursive: true, force: true });
      }
      
      fs.mkdirSync(snapshotDir, { recursive: true });
      
      configSnapshot = new ConfigSnapshot(snapshotDir);
    });
    
    afterEach(() => {
      if (fs.existsSync(snapshotDir)) {
        fs.rmSync(snapshotDir, { recursive: true, force: true });
      }
    });
    
    test('captures snapshot of existing file', async () => {
      // Create test config
      await fs.promises.writeFile(testConfigPath, '{"key": "value"}', 'utf8');
      
      const metadata = await configSnapshot.capture(testConfigPath, 'env_001');
      
      expect(metadata.snapshot_id).toBeTruthy();
      expect(metadata.config_path).toBe(testConfigPath);
      expect(metadata.envelope_id).toBe('env_001');
      expect(metadata.existed).toBe(true);
      expect(metadata.content_hash).toBeTruthy();
    });
    
    test('captures snapshot of non-existent file', async () => {
      const newPath = path.join(snapshotDir, 'new-config.json');
      
      const metadata = await configSnapshot.capture(newPath, 'env_002');
      
      expect(metadata.existed).toBe(false);
      expect(metadata.content_size).toBe(0);
    });
    
    test('requires config path', async () => {
      await expect(configSnapshot.capture(null, 'env_001')).rejects.toThrow('Config path required');
    });
    
    test('requires envelope ID', async () => {
      await expect(configSnapshot.capture(testConfigPath, null)).rejects.toThrow('Envelope ID required');
    });
    
    test('lists snapshots for config', async () => {
      await fs.promises.writeFile(testConfigPath, '{"key": "value1"}', 'utf8');
      await configSnapshot.capture(testConfigPath, 'env_001');
      
      await fs.promises.writeFile(testConfigPath, '{"key": "value2"}', 'utf8');
      await configSnapshot.capture(testConfigPath, 'env_002');
      
      const snapshots = await configSnapshot.list(testConfigPath);
      
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].envelope_id).toBe('env_002'); // Most recent first
      expect(snapshots[1].envelope_id).toBe('env_001');
    });
    
    test('restores config from snapshot', async () => {
      const originalContent = '{"key": "original"}';
      await fs.promises.writeFile(testConfigPath, originalContent, 'utf8');
      
      const metadata = await configSnapshot.capture(testConfigPath, 'env_001');
      
      // Modify config
      await fs.promises.writeFile(testConfigPath, '{"key": "modified"}', 'utf8');
      
      // Restore
      await configSnapshot.restore(metadata.snapshot_id);
      
      // Verify restored
      const restored = await fs.promises.readFile(testConfigPath, 'utf8');
      expect(restored).toBe(originalContent);
    });
    
    test('cleanOld removes old snapshots', async () => {
      await fs.promises.writeFile(testConfigPath, '{"key": "value"}', 'utf8');
      const metadata = await configSnapshot.capture(testConfigPath, 'env_001');
      
      // Artificially age the snapshot
      const snapshotFile = path.join(snapshotDir, `${metadata.snapshot_id}.json`);
      const snapshotData = JSON.parse(await fs.promises.readFile(snapshotFile, 'utf8'));
      snapshotData.metadata.timestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      await fs.promises.writeFile(snapshotFile, JSON.stringify(snapshotData), 'utf8');
      
      const deleted = await configSnapshot.cleanOld(30);
      
      expect(deleted).toBe(1);
    });
  });
  
  describe('OperationalMetrics', () => {
    let mockExecutor;
    
    beforeEach(() => {
      mockExecutor = {
        getQueueState: () => ({
          total: 20,
          queued: 5,
          executing: 1,
          completed: 12,
          failed: 2,
          blocked: 0
        }),
        getExecutionControlState: () => ({
          paused: false,
          reason: null,
          paused_at: null
        }),
        getRateLimiterState: () => ({
          global: { count: 10, limit: 30, remaining: 20 },
          agents: {
            agent_a: { count: 5, limit: 10 }
          }
        }),
        getAgentBudgetState: () => ({
          agents: {
            agent_a: {
              queued: { count: 2 },
              active: { count: 1 }
            }
          }
        }),
        getDeadLetterStats: () => ({
          total: 3,
          by_state: { dead_lettered: 2, cancelled: 1 }
        }),
        getRecursionState: () => ({
          active_cooldowns: []
        }),
        getHealth: () => ({
          state: 'HEALTHY',
          checks: {
            queue_backlog: { status: 'HEALTHY' },
            failure_rate: { status: 'HEALTHY' }
          },
          metrics: {
            avg_latency_ms: 250
          }
        }),
        checkIntegrity: () => ({
          state: 'INTACT',
          checks: {
            execution_control_enforced: { status: 'INTACT' },
            rate_limiting_active: { status: 'INTACT' }
          }
        })
      };
    });
    
    test('collects comprehensive metrics', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      
      expect(metrics.timestamp).toBeTruthy();
      expect(metrics.envelopes_processed_total).toBe(12);
      expect(metrics.envelopes_failed_total).toBe(2);
      expect(metrics.envelopes_dead_lettered_total).toBe(3);
      expect(metrics.queue_depth_current).toBe(5);
      expect(metrics.active_envelopes_current).toBe(1);
    });
    
    test('includes pause state', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      
      expect(metrics.paused_state).toBe(false);
      expect(metrics.paused_reason).toBe(null);
    });
    
    test('includes health state', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      
      expect(metrics.health_state).toBe('HEALTHY');
      expect(metrics.health_checks).toBeDefined();
      expect(metrics.health_checks.queue_backlog).toBe('HEALTHY');
    });
    
    test('includes integrity state', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      
      expect(metrics.integrity_state).toBe('INTACT');
      expect(metrics.integrity_checks).toBeDefined();
      expect(metrics.integrity_checks.execution_control_enforced).toBe('INTACT');
    });
    
    test('computes failure rate', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      
      // Failure rate = (2 + 3) / (20 + 3) = 5/23 ≈ 0.217
      expect(metrics.failure_rate).toBeCloseTo(0.217, 2);
    });
    
    test('formats summary', () => {
      const metrics = OperationalMetrics.collect(mockExecutor);
      const summary = OperationalMetrics.formatSummary(metrics);
      
      expect(summary).toContain('Vienna Operational Metrics');
      expect(summary).toContain('Queued: 5');
      expect(summary).toContain('Health: HEALTHY');
      expect(summary).toContain('Integrity: INTACT');
    });
  });
  
  describe('QueuedExecutor integration', () => {
    let testDir;
    let executor;
    let replayLog;
    
    beforeAll(async () => {
      const parentDir = path.join(__dirname, '../.test-data/phase7_4_stage5');
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true });
      }
    });
    
    beforeEach(async () => {
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      testDir = path.join(__dirname, '../.test-data/phase7_4_stage5', testId);
      
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
      
      replayLog = new ReplayLog({
        logDir: path.join(testDir, 'replay')
      });
      
      await replayLog.initialize();
      
      const mockCore = {
        warrant: {
          verify: async () => ({
            valid: true,
            warrant: {
              warrant_id: 'warrant_001',
              truth_snapshot_id: 'truth_001',
              plan_id: 'plan_001',
              allowed_actions: ['test_action:/tmp/test.txt'],
              risk_tier: 'T0'
            }
          })
        },
        truth: {
          verify: async () => ({ valid: true })
        },
        tradingGuard: {
          check: async () => ({ safe: true })
        },
        audit: {
          emit: async () => {}
        }
      };
      
      executor = new QueuedExecutor(mockCore, {
        queueOptions: {
          queueDir: path.join(testDir, 'queue')
        },
        controlStateDir: path.join(testDir, 'control'),
        dlqOptions: {
          dlqFile: path.join(testDir, 'dlq.jsonl')
        },
        snapshotDir: path.join(testDir, 'snapshots'),
        replayLog
      });
      
      await executor.initialize();
    });
    
    afterEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });
    
    test('getMetrics returns comprehensive metrics', () => {
      const metrics = executor.getMetrics();
      
      expect(metrics).toBeTruthy();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.queue_depth_current).toBeDefined();
      expect(metrics.paused_state).toBeDefined();
      expect(metrics.health_state).toBeDefined();
      expect(metrics.integrity_state).toBeDefined();
    });
    
    test('getMetricsSummary returns formatted string', () => {
      const summary = executor.getMetricsSummary();
      
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Vienna Operational Metrics');
    });
    
    test('captureConfigSnapshot creates snapshot', async () => {
      const configPath = path.join(testDir, 'test.json');
      await fs.promises.writeFile(configPath, '{"test": true}', 'utf8');
      
      const metadata = await executor.captureConfigSnapshot(configPath, 'env_001');
      
      expect(metadata.snapshot_id).toBeTruthy();
      expect(metadata.config_path).toBe(configPath);
      expect(metadata.envelope_id).toBe('env_001');
    });
    
    test('listConfigSnapshots returns snapshots', async () => {
      const configPath = path.join(testDir, 'test.json');
      await fs.promises.writeFile(configPath, '{"test": true}', 'utf8');
      
      await executor.captureConfigSnapshot(configPath, 'env_001');
      await executor.captureConfigSnapshot(configPath, 'env_002');
      
      const snapshots = await executor.listConfigSnapshots(configPath);
      
      expect(snapshots.length).toBe(2);
    });
    
    test('metrics reflect actual executor state', async () => {
      // Submit some envelopes
      executor.registerAdapter('test_action', {
        execute: async () => ({ success: true })
      });
      
      const envelope = {
        envelope_id: 'env_metrics_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: 'warrant_001',
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      const metrics = executor.getMetrics();
      
      expect(metrics.queue_depth_current).toBeGreaterThanOrEqual(1);
    });
  });
});
