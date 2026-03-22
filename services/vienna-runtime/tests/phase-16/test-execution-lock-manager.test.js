/**
 * Phase 16.2 — Execution Lock Manager Tests
 * 
 * Test suite for target-level concurrency guards.
 * 
 * Categories:
 * A. Lock Acquisition (5 tests)
 * B. Lock Release (4 tests)
 * C. Plan Execution Integration (6 tests)
 * D. Lock Expiration (3 tests)
 * E. Ledger Integration (4 tests)
 * 
 * Total: 22 tests
 */

const { ExecutionLockManager } = require('../../lib/execution/execution-lock-manager');
const { getStateGraph } = require('../../lib/state/state-graph');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Phase 16.2 — Execution Lock Manager', () => {
  let lockManager;
  let stateGraph;

  beforeAll(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    lockManager = new ExecutionLockManager();
  });

  beforeEach(async () => {
    // Clean locks table
    stateGraph.db.prepare('DELETE FROM execution_locks').run();
  });

  afterAll(async () => {
    await stateGraph.close();
  });

  // ===================================
  // Category A: Lock Acquisition
  // ===================================

  describe('Category A: Lock Acquisition', () => {
    test('A1: Acquire lock on free target → SUCCESS', async () => {
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        plan_id: 'plan_001',
        ttl_seconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.lock_id).toBeDefined();
      expect(result.acquired_at).toBeDefined();
      expect(result.expires_at).toBeDefined();
      expect(result.reentrant).toBeUndefined();
    });

    test('A2: Acquire lock on locked target → DENIED', async () => {
      // First execution acquires lock
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      // Second execution tries to acquire same lock
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_002',
        ttl_seconds: 300
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('TARGET_LOCKED');
      expect(result.locked_by).toBe('exec_001');
      expect(result.expires_at).toBeDefined();
    });

    test('A3: Acquire lock on same target by same execution → SUCCESS (reentrant)', async () => {
      // First acquisition
      const first = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      // Second acquisition (reentrant)
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.lock_id).toBe(first.lock_id);
      expect(result.reentrant).toBe(true);
    });

    test('A4: Acquire lock on expired lock → SUCCESS (stale lock cleared)', async () => {
      // Acquire lock with 1 second TTL
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 1
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to acquire again
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_002',
        ttl_seconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.lock_id).toBeDefined();
    });

    test('A5: Acquire lock with invalid target type → ERROR', async () => {
      await expect(
        lockManager.acquireLock({
          target_type: 'invalid',
          target_id: 'test',
          execution_id: 'exec_001'
        })
      ).rejects.toThrow('INVALID_TARGET_TYPE');
    });
  });

  // ===================================
  // Category B: Lock Release
  // ===================================

  describe('Category B: Lock Release', () => {
    test('B1: Release active lock → SUCCESS', async () => {
      const lock = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      const result = await lockManager.releaseLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_001'
      });

      expect(result.success).toBe(true);
      expect(result.released_at).toBeDefined();
      expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
    });

    test('B2: Release already released lock → IDEMPOTENT', async () => {
      const lock = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      await lockManager.releaseLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_001'
      });

      // Release again
      const result = await lockManager.releaseLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_001'
      });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('ALREADY_RELEASED');
    });

    test('B3: Release lock by different execution → ERROR', async () => {
      const lock = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      const result = await lockManager.releaseLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_002'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('NOT_OWNER');
      expect(result.owner).toBe('exec_001');
    });

    test('B4: Release non-existent lock → IDEMPOTENT', async () => {
      const result = await lockManager.releaseLock({
        lock_id: 'lock_nonexistent',
        execution_id: 'exec_001'
      });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('ALREADY_RELEASED');
    });
  });

  // ===================================
  // Category C: Plan Execution Integration
  // (Placeholder for PlanExecutor integration tests)
  // ===================================

  describe('Category C: Plan Execution Integration', () => {
    test('C1: Execute plan with free target → locks acquired and released', async () => {
      // This will be implemented after PlanExecutor integration
      // For now, verify lock lifecycle manually
      
      const lock = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        plan_id: 'plan_001',
        ttl_seconds: 300
      });

      expect(lock.success).toBe(true);

      // Simulate plan execution
      // ... steps ...

      const release = await lockManager.releaseLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_001'
      });

      expect(release.success).toBe(true);
    });

    test('C2: Execute plan with locked target → DENIED', async () => {
      // Lock target with exec_001
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      // Try to lock with exec_002
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_002',
        plan_id: 'plan_002',
        ttl_seconds: 300
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('TARGET_LOCKED');
    });

    test.skip('C3: Execute multi-target plan → all locks acquired', async () => {
      // Placeholder for multi-target lock acquisition
      // Will implement with PlanExecutor integration
    });

    test.skip('C4: Execute plan with partial lock acquisition → rollback', async () => {
      // Placeholder for atomic lock set acquisition
      // Will implement with PlanExecutor integration
    });

    test.skip('C5: Execute plan with step failure → locks released', async () => {
      // Placeholder for lock release on failure
      // Will implement with PlanExecutor integration
    });

    test('C6: Execute concurrent plans on different targets → SUCCESS', async () => {
      // Lock different targets
      const lock1 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      const lock2 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'vienna-console',
        execution_id: 'exec_002',
        ttl_seconds: 300
      });

      expect(lock1.success).toBe(true);
      expect(lock2.success).toBe(true);
      expect(lock1.lock_id).not.toBe(lock2.lock_id);
    });
  });

  // ===================================
  // Category D: Lock Expiration
  // ===================================

  describe('Category D: Lock Expiration', () => {
    test('D1: Expire stale locks → marked as expired', async () => {
      // Acquire lock with 1 second TTL
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 1
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Run cleanup
      const result = await lockManager.expireStaleLocks();

      expect(result.expired_count).toBe(1);
      expect(result.expired_locks).toHaveLength(1);
      expect(result.expired_locks[0].target_id).toBe('openclaw-gateway');
    });

    test('D2: Acquire lock after expiration → SUCCESS', async () => {
      // Acquire lock with 1 second TTL
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 1
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Expire stale locks
      await lockManager.expireStaleLocks();

      // Try to acquire again
      const result = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_002',
        ttl_seconds: 300
      });

      expect(result.success).toBe(true);
    });

    test('D3: Extend lock via heartbeat → TTL extended', async () => {
      const lock = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 60
      });

      const result = await lockManager.extendLock({
        lock_id: lock.lock_id,
        execution_id: 'exec_001',
        extension_seconds: 120
      });

      expect(result.success).toBe(true);
      expect(result.new_expires_at).toBeGreaterThan(lock.expires_at);
      expect(result.extension_seconds).toBe(120);
    });
  });

  // ===================================
  // Category E: Ledger Integration
  // (Tests for ledger event persistence)
  // ===================================

  describe('Category E: Ledger Integration', () => {
    test.skip('E1: Lock acquired event persisted → SUCCESS', async () => {
      // Placeholder for ledger integration
      // Will implement with PlanExecutor integration
    });

    test.skip('E2: Lock denied event persisted → SUCCESS', async () => {
      // Placeholder for ledger integration
      // Will implement with PlanExecutor integration
    });

    test.skip('E3: Lock released event persisted → SUCCESS', async () => {
      // Placeholder for ledger integration
      // Will implement with PlanExecutor integration
    });

    test.skip('E4: Lock expired event persisted → SUCCESS', async () => {
      // Placeholder for ledger integration
      // Will implement with PlanExecutor integration
    });
  });

  // ===================================
  // Statistics and Utilities
  // ===================================

  describe('Statistics and Utilities', () => {
    test('Get lock statistics', async () => {
      // Acquire some locks
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      await lockManager.acquireLock({
        target_type: 'endpoint',
        target_id: 'openclaw',
        execution_id: 'exec_002',
        ttl_seconds: 300
      });

      const stats = await lockManager.getStatistics();

      expect(stats.active).toBe(2);
      expect(stats.by_target.service).toBe(1);
      expect(stats.by_target.endpoint).toBe(1);
    });

    test('List active locks', async () => {
      await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'openclaw-gateway',
        execution_id: 'exec_001',
        ttl_seconds: 300
      });

      const locks = await lockManager.listActiveLocks();

      expect(locks).toHaveLength(1);
      expect(locks[0].target_id).toBe('openclaw-gateway');
      expect(locks[0].status).toBe('active');
    });
  });
});
