/**
 * Phase 20 — Distributed Lock Manager Tests
 * 
 * Test cross-node concurrency control
 */

const DistributedLockManager = require('../../lib/distributed/governance/distributed-lock-manager-memory');

describe('Phase 20 — Distributed Lock Manager', () => {
  let lockManager;

  beforeEach(() => {
    // Use in-memory implementation (no mock)
    lockManager = new DistributedLockManager();
  });

  describe('Category A: Lock Acquisition', () => {
    test('A1: Acquires lock when available', async () => {
      const result = await lockManager.acquireLock({
        resource_id: 'postgres-prod',
        scope: 'target',
        holder_id: 'node-001'
      });

      expect(result.acquired).toBe(true);
      expect(result.lock_id).toBeTruthy();
    });

    test('A2: Blocks when lock held by another node', async () => {
      // First node acquires
      await lockManager.acquireLock({
        resource_id: 'postgres-prod',
        scope: 'target',
        holder_id: 'node-002'
      });

      // Second node tries to acquire same resource
      const result = await lockManager.acquireLock({
        resource_id: 'postgres-prod',
        scope: 'target',
        holder_id: 'node-001'
      });

      expect(result.acquired).toBe(false);
      expect(result.held_by).toBe('node-002');
    });

    test('A3: Supports different lock scopes', async () => {
      const result = await lockManager.acquireLock({
        resource_id: 'global-maintenance',
        scope: 'global',
        holder_id: 'node-001'
      });

      expect(result.acquired).toBe(true);
    });

    test('A4: Includes lock expiry time', async () => {
      const result = await lockManager.acquireLock({
        resource_id: 'nginx',
        scope: 'target',
        holder_id: 'node-001'
      });

      expect(result.expires_at).toBeTruthy();
      expect(new Date(result.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    test('A5: Supports lock timeout specification', async () => {
      const result = await lockManager.acquireLock({
        resource_id: 'redis',
        scope: 'target',
        holder_id: 'node-001',
        timeout_ms: 30000
      });

      expect(result.acquired).toBe(true);
      expect(result.expires_at).toBeTruthy();
    });
  });

  describe('Category B: Lock Release', () => {
    test('B1: Releases held lock', async () => {
      const acquireResult = await lockManager.acquireLock({
        resource_id: 'test-resource',
        holder_id: 'node-001'
      });

      const result = await lockManager.releaseLock(acquireResult.lock_id);

      expect(result.released).toBe(true);
    });

    test('B2: Handles release of nonexistent lock', async () => {
      const result = await lockManager.releaseLock('lock-999');

      expect(result.released).toBe(false);
    });

    test('B3: Prevents release by non-holder', async () => {
      const acquireResult = await lockManager.acquireLock({
        resource_id: 'test-resource',
        holder_id: 'node-002'
      });

      const result = await lockManager.releaseLock(acquireResult.lock_id, { holder_id: 'node-001' });

      expect(result.released).toBe(false);
      expect(result.reason).toContain('not held by');
    });

    test('B4: Auto-releases expired locks', async () => {
      // Acquire a lock with very short timeout
      await lockManager.acquireLock({
        resource_id: 'test-resource',
        holder_id: 'node-001',
        timeout_ms: 1
      });

      // Wait for expiry
      await new Promise(r => setTimeout(r, 10));

      const result = await lockManager.cleanupExpiredLocks();

      expect(result.released_count).toBeGreaterThan(0);
    });

    test('B5: Tracks release timestamp', async () => {
      const acquireResult = await lockManager.acquireLock({
        resource_id: 'test-resource',
        holder_id: 'node-001'
      });

      const result = await lockManager.releaseLock(acquireResult.lock_id);

      expect(result.released_at).toBeTruthy();
    });
  });

  describe('Category C: Lock Queuing', () => {
    test('C1: Queues lock request when unavailable', async () => {
      // Node 2 acquires lock
      await lockManager.acquireLock({
        resource_id: 'postgres-prod',
        scope: 'target',
        holder_id: 'node-002'
      });

      // Node 1 tries to acquire same resource
      const result = await lockManager.acquireLockWithQueue({
        resource_id: 'postgres-prod',
        scope: 'target',
        holder_id: 'node-001'
      });

      expect(result.queued).toBe(true);
      expect(result.queue_position).toBeGreaterThan(0);
    });

    test('C2: Grants lock to next in queue on release', async () => {
      // Acquire lock
      const lock = await lockManager.acquireLock({
        resource_id: 'postgres-prod',
        holder_id: 'node-000'
      });

      // Queue two requests
      lockManager._addToQueue({ resource_id: 'postgres-prod', holder_id: 'node-001' });
      lockManager._addToQueue({ resource_id: 'postgres-prod', holder_id: 'node-002' });

      const result = await lockManager.releaseLock(lock.lock_id);

      expect(result.next_holder).toBe('node-001');
    });

    test('C3: Maintains FIFO queue order', async () => {
      // Acquire lock to block others
      await lockManager.acquireLock({
        resource_id: 'nginx',
        holder_id: 'node-000'
      });

      await lockManager.acquireLockWithQueue({ resource_id: 'nginx', holder_id: 'node-001' });
      await lockManager.acquireLockWithQueue({ resource_id: 'nginx', holder_id: 'node-002' });
      await lockManager.acquireLockWithQueue({ resource_id: 'nginx', holder_id: 'node-003' });

      const queue = lockManager.getQueueStatus('nginx');

      expect(queue.positions).toEqual(['node-001', 'node-002', 'node-003']);
    });

    test('C4: Removes timed-out queue entries', async () => {
      lockManager._addToQueue({
        resource_id: 'redis',
        holder_id: 'node-001',
        queued_at: new Date(Date.now() - 120000).toISOString(),
        timeout_ms: 60000
      });

      await lockManager.cleanupTimedOutQueueEntries();

      const queue = lockManager.getQueueStatus('redis');
      expect(queue.positions.length).toBe(0);
    });

    test('C5: Provides queue wait time estimates', async () => {
      // Acquire lock
      await lockManager.acquireLock({
        resource_id: 'nginx',
        holder_id: 'node-000'
      });

      await lockManager.acquireLockWithQueue({ resource_id: 'nginx', holder_id: 'node-001' });

      const estimate = await lockManager.estimateWaitTime('nginx', 'node-001');

      expect(estimate.estimated_wait_ms).toBeGreaterThan(0);
    });
  });

  describe('Category D: Deadlock Detection', () => {
    test('D1: Detects simple circular dependency', async () => {
      // node-001 holds res-A, wants res-B
      await lockManager.acquireLock({ resource_id: 'res-A', holder_id: 'node-001' });
      // node-002 holds res-B, wants res-A
      await lockManager.acquireLock({ resource_id: 'res-B', holder_id: 'node-002' });

      lockManager._addToQueue({ resource_id: 'res-B', holder_id: 'node-001' });
      lockManager._addToQueue({ resource_id: 'res-A', holder_id: 'node-002' });

      const deadlocks = await lockManager.detectDeadlocks();

      expect(deadlocks.length).toBeGreaterThan(0);
      expect(deadlocks[0].type).toBe('circular_dependency');
    });

    test('D2: No deadlock when no circular dependencies', async () => {
      await lockManager.acquireLock({ resource_id: 'res-A', holder_id: 'node-001' });
      await lockManager.acquireLock({ resource_id: 'res-B', holder_id: 'node-002' });

      lockManager._addToQueue({ resource_id: 'res-C', holder_id: 'node-001' });

      const deadlocks = await lockManager.detectDeadlocks();

      expect(deadlocks.length).toBe(0);
    });

    test('D3: Breaks deadlock by priority', async () => {
      await lockManager.acquireLock({ resource_id: 'res-A', holder_id: 'node-001' });
      await lockManager.acquireLock({ resource_id: 'res-B', holder_id: 'node-002' });

      lockManager._addToQueue({ resource_id: 'res-B', holder_id: 'node-001', priority: 1 });
      lockManager._addToQueue({ resource_id: 'res-A', holder_id: 'node-002', priority: 2 });

      const result = await lockManager.resolveDeadlock('deadlock-001');

      expect(result.resolved).toBe(true);
      expect(result.aborted_holder).toBe('node-002'); // Lower priority
    });

    test('D4: Logs deadlock detection events', async () => {
      await lockManager.acquireLock({ resource_id: 'res-A', holder_id: 'node-001' });
      await lockManager.acquireLock({ resource_id: 'res-B', holder_id: 'node-002' });

      lockManager._addToQueue({ resource_id: 'res-B', holder_id: 'node-001' });
      lockManager._addToQueue({ resource_id: 'res-A', holder_id: 'node-002' });

      await lockManager.detectDeadlocks();

      const log = lockManager.getDeadlockLog();
      expect(log.length).toBeGreaterThan(0);
    });

    test('D5: Prevents deadlock via lock ordering', async () => {
      const result = await lockManager.acquireMultipleLocks({
        resource_ids: ['res-B', 'res-A'],  // Unordered
        holder_id: 'node-001'
      }, { enforceOrdering: true });

      expect(result.acquired).toBe(true);
      expect(result.lock_ids.length).toBe(2);
    });
  });

  describe('Category E: Lock Monitoring', () => {
    test('E1: Lists all active locks', async () => {
      await lockManager.acquireLock({ resource_id: 'nginx', holder_id: 'node-001' });
      await lockManager.acquireLock({ resource_id: 'postgres', holder_id: 'node-002' });

      const locks = await lockManager.listActiveLocks();

      expect(locks.length).toBe(2);
    });

    test('E2: Filters locks by holder', async () => {
      await lockManager.acquireLock({ resource_id: 'res-1', holder_id: 'node-001' });
      await lockManager.acquireLock({ resource_id: 'res-2', holder_id: 'node-002' });
      await lockManager.acquireLock({ resource_id: 'res-3', holder_id: 'node-001' });

      const locks = await lockManager.listActiveLocks({ held_by: 'node-001' });

      expect(locks.length).toBe(2);
    });

    test('E3: Identifies long-held locks', async () => {
      // Manually create old lock in store
      const oldLock = {
        lock_id: 'lock-old',
        resource_id: 'old-resource',
        held_by: 'node-001',
        acquired_at: new Date(Date.now() - 300000).toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString()
      };
      lockManager.lockStore._locks.set('old-resource', oldLock);

      const longLocks = await lockManager.findLongHeldLocks({ thresholdMs: 120000 });

      expect(longLocks.length).toBe(1);
      expect(longLocks[0].hold_duration_ms).toBeGreaterThan(120000);
    });

    test('E4: Provides lock contention statistics', async () => {
      // Create locks with wait counts
      const lock1 = {
        lock_id: 'lock-1',
        resource_id: 'nginx',
        held_by: 'node-001',
        wait_count: 5,
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString()
      };
      const lock2 = {
        lock_id: 'lock-2',
        resource_id: 'postgres',
        held_by: 'node-002',
        wait_count: 12,
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString()
      };
      lockManager.lockStore._locks.set('nginx', lock1);
      lockManager.lockStore._locks.set('postgres', lock2);

      const stats = await lockManager.getLockStatistics();

      expect(stats.total_active_locks).toBe(2);
      expect(stats.most_contended).toBe('postgres');
      expect(stats.avg_wait_count).toBe(8.5);
    });

    test('E5: Tracks lock acquisition success rate', async () => {
      await lockManager.acquireLock({ resource_id: 'r1', holder_id: 'n1' }); // success
      
      // Block r2 then try to acquire
      await lockManager.acquireLock({ resource_id: 'r2', holder_id: 'other' }); // success (not counted in test)
      const result2 = await lockManager.acquireLock({ resource_id: 'r2', holder_id: 'n2' }); // fail
      
      await lockManager.acquireLock({ resource_id: 'r3', holder_id: 'n3' }); // success
      await lockManager.acquireLock({ resource_id: 'r4', holder_id: 'n4' }); // success

      const stats = lockManager.getAcquisitionStats();

      // 4 successful (r1, r2-other, r3, r4) + 1 failed (r2-n2) = 5 total, 4 successful = 0.8
      expect(stats.success_rate).toBe(0.8);
      expect(stats.total_attempts).toBe(5);
      expect(stats.successful).toBe(4);
    });
  });
});
