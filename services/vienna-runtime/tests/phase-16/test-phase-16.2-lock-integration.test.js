/**
 * Phase 16.2 — Lock Integration Tests
 * 
 * Validates:
 * 1. Target extraction from plan steps
 * 2. Lock acquisition before execution
 * 3. Lock conflicts block execution
 * 4. Atomic lock set acquisition (all-or-nothing)
 * 5. Lock release in finally block (no leaks)
 * 6. Reentrant lock support (same execution)
 * 7. Lock expiry behavior
 * 8. Ledger events for lock lifecycle
 */

const assert = require('assert');
const { getStateGraph } = require('../../lib/state/state-graph');
const { PlanExecutionEngine } = require('../../lib/core/plan-execution-engine');
const { ExecutionLockManager } = require('../../lib/execution/execution-lock-manager');
const { extractTargets, buildTargetId } = require('../../lib/core/target-extractor');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Phase 16.2 — Lock Integration', () => {
  let stateGraph;
  let engine;
  let lockManager;

  beforeAll(() => {
    // Set Jest timeout for expiry tests
    jest.setTimeout(15000);
  });

  beforeEach(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    
    lockManager = new ExecutionLockManager();
    
    engine = new PlanExecutionEngine({
      stateGraph,
      executor: {
        execute: async (action, context) => ({
          success: true,
          action_id: action.action_id,
          message: 'Mock execution success'
        })
      }
    });
  });

  afterEach(async () => {
    if (stateGraph && stateGraph.close) {
      await stateGraph.close();
    }
  });

  // ============================================================
  // TEST CATEGORY A: Target Extraction
  // ============================================================

  describe('A. Target Extraction', () => {
    it('A1: Should extract service target from step', () => {
      const step = {
        step_id: 'step_1',
        action: 'restart_service',
        target_type: 'service',
        target_id: 'auth-api',
        parameters: {}
      };

      const targets = extractTargets(step);
      
      assert.strictEqual(targets.length, 1);
      assert.strictEqual(targets[0].target_type, 'service');
      assert.strictEqual(targets[0].target_id, 'target:service:auth-api');
    });

    it('A2: Should extract multiple targets from parameters', () => {
      const step = {
        step_id: 'step_1',
        action: 'restart_service_with_dependency',
        target_type: 'service',
        target_id: 'auth-api',
        parameters: {
          service_id: 'auth-api',
          endpoint_id: 'auth-endpoint'
        }
      };

      const targets = extractTargets(step);
      
      assert.ok(targets.length >= 1);
      assert.ok(targets.some(t => t.target_type === 'service'));
    });

    it('A3: Should deduplicate identical targets', () => {
      const step = {
        step_id: 'step_1',
        action: 'restart_service',
        target_type: 'service',
        target_id: 'auth-api',
        parameters: {
          service_id: 'auth-api' // Same service in parameters
        }
      };

      const targets = extractTargets(step);
      
      // Should not have duplicates
      const targetIds = targets.map(t => t.target_id);
      const uniqueIds = [...new Set(targetIds)];
      assert.strictEqual(targetIds.length, uniqueIds.length);
    });
  });

  // ============================================================
  // TEST CATEGORY B: Lock Acquisition Before Execution
  // ============================================================

  describe('B. Lock Acquisition Before Execution', () => {
    it('B1: Should acquire lock before executing step', async () => {
      const plan = {
        plan_id: 'plan_lock_test',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'test-service',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_lock_1',
        objective_id: 'obj_1'
      };

      // Execute plan
      await engine.executePlan(plan, context);

      // Verify lock was acquired (should be released after execution)
      const activeLocks = await lockManager.listActiveLocks();
      
      // Lock should be released after step completes
      const locksForService = activeLocks.filter(l => 
        l.target_type === 'service' && 
        l.target_id === 'test-service' &&
        l.execution_id === 'exec_lock_1'
      );
      
      assert.strictEqual(locksForService.length, 0, 'Lock should be released after execution');
    });

    it('B2: Should record lock_requested ledger event', async () => {
      const plan = {
        plan_id: 'plan_ledger_test',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'test-service',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_ledger_1',
        objective_id: 'obj_1'
      };

      await engine.executePlan(plan, context);

      // Check ledger for lock_requested event
      const ledgerEvents = await stateGraph.query(`
        SELECT * FROM execution_ledger_events 
        WHERE execution_id = ? AND event_type = 'lock_requested'
      `, [context.execution_id]);

      assert.ok(ledgerEvents.length > 0, 'Should have lock_requested event');
      assert.strictEqual(ledgerEvents[0].plan_id, plan.plan_id);
    });

    it('B3: Should record lock_acquired ledger event', async () => {
      const plan = {
        plan_id: 'plan_acquired_test',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'test-service',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_acquired_1',
        objective_id: 'obj_1'
      };

      await engine.executePlan(plan, context);

      const ledgerEvents = await stateGraph.query(`
        SELECT * FROM execution_ledger_events 
        WHERE execution_id = ? AND event_type = 'lock_acquired'
      `, [context.execution_id]);

      assert.ok(ledgerEvents.length > 0, 'Should have lock_acquired event');
    });
  });

  // ============================================================
  // TEST CATEGORY C: Lock Conflict Blocks Execution
  // ============================================================

  describe('C. Lock Conflict Blocks Execution', () => {
    it('C1: Should block step when target is locked by different execution', async () => {
      // Plan A acquires lock first
      const lockA = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'conflict-service',
        execution_id: 'exec_a',
        plan_id: 'plan_a',
        ttl_seconds: 300
      });

      assert.strictEqual(lockA.success, true, 'Plan A should acquire lock');

      // Plan B attempts to execute on same target
      const planB = {
        plan_id: 'plan_b',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'conflict-service',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const contextB = {
        execution_id: 'exec_b',
        objective_id: 'obj_b'
      };

      // Execute plan B
      const result = await engine.executePlan(planB, contextB);

      // Verify plan B did NOT complete successfully
      assert.ok(result.summary.status_counts.blocked > 0, 'Step should be BLOCKED');

      // Release lock A
      await lockManager.releaseLock({
        lock_id: lockA.lock_id,
        execution_id: 'exec_a'
      });
    });

    it('C2: Should record lock_denied event on conflict', async () => {
      // Lock target
      const lockA = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'denied-service',
        execution_id: 'exec_deny_a',
        plan_id: 'plan_deny_a',
        ttl_seconds: 300
      });

      assert.strictEqual(lockA.success, true);

      // Attempt conflicting execution
      const planB = {
        plan_id: 'plan_deny_b',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'denied-service',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const contextB = {
        execution_id: 'exec_deny_b'
      };

      await engine.executePlan(planB, contextB);

      // Check for lock_denied event
      const deniedEvents = await stateGraph.query(`
        SELECT * FROM execution_ledger_events 
        WHERE execution_id = ? AND event_type = 'lock_denied'
      `, [contextB.execution_id]);

      assert.ok(deniedEvents.length > 0, 'Should have lock_denied event');

      // Cleanup
      await lockManager.releaseLock({
        lock_id: lockA.lock_id,
        execution_id: 'exec_deny_a'
      });
    });
  });

  // ============================================================
  // TEST CATEGORY D: Atomic Lock Set Acquisition
  // ============================================================

  describe('D. Atomic Lock Set Acquisition', () => {
    it('D1: Should rollback partial acquisitions on conflict', async () => {
      // Lock one target
      const lockExisting = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'target-2',
        execution_id: 'exec_blocker',
        plan_id: 'plan_blocker',
        ttl_seconds: 300
      });

      assert.strictEqual(lockExisting.success, true);

      // Attempt plan with two targets (one locked)
      const plan = {
        plan_id: 'plan_atomic',
        steps: [{
          step_id: 'step_1',
          action: 'multi_target_action',
          target_type: 'service',
          target_id: 'target-1',
          parameters: {
            service_id: 'target-2' // This is locked
          },
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_atomic'
      };

      await engine.executePlan(plan, context);

      // Verify NO locks held by exec_atomic (rollback)
      const activeLocks = await lockManager.listActiveLocks();
      const atomicLocks = activeLocks.filter(l => l.execution_id === 'exec_atomic');
      
      assert.strictEqual(atomicLocks.length, 0, 'All locks should be rolled back');

      // Cleanup
      await lockManager.releaseLock({
        lock_id: lockExisting.lock_id,
        execution_id: 'exec_blocker'
      });
    });
  });

  // ============================================================
  // TEST CATEGORY E: Lock Release (No Leaks)
  // ============================================================

  describe('E. Lock Release (No Leaks)', () => {
    it('E1: Should release locks after successful execution', async () => {
      const plan = {
        plan_id: 'plan_release',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'release-test',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_release'
      };

      await engine.executePlan(plan, context);

      // Verify no active locks remain
      const activeLocks = await lockManager.listActiveLocks();
      const releaseLocks = activeLocks.filter(l => l.execution_id === 'exec_release');
      
      assert.strictEqual(releaseLocks.length, 0, 'Locks should be released');
    });

    it('E2: Should release locks even on execution failure', async () => {
      // Engine with failing executor
      const failingEngine = new PlanExecutionEngine({
        stateGraph,
        executor: {
          execute: async () => {
            throw new Error('Simulated execution failure');
          }
        }
      });

      const plan = {
        plan_id: 'plan_fail_release',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'fail-release-test',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_fail_release'
      };

      // Execute (will fail)
      await failingEngine.executePlan(plan, context);

      // Verify locks released despite failure
      const activeLocks = await lockManager.listActiveLocks();
      const failLocks = activeLocks.filter(l => l.execution_id === 'exec_fail_release');
      
      assert.strictEqual(failLocks.length, 0, 'Locks should be released even on failure');
    });

    it('E3: Should record lock_released event', async () => {
      const plan = {
        plan_id: 'plan_released_event',
        steps: [{
          step_id: 'step_1',
          action: 'restart_service',
          target_type: 'service',
          target_id: 'event-test',
          timeout_ms: 10000,
          retry_policy: { max_attempts: 1 }
        }]
      };

      const context = {
        execution_id: 'exec_released_event'
      };

      await engine.executePlan(plan, context);

      const releasedEvents = await stateGraph.query(`
        SELECT * FROM execution_ledger_events 
        WHERE execution_id = ? AND event_type = 'lock_released'
      `, [context.execution_id]);

      assert.ok(releasedEvents.length > 0, 'Should have lock_released event');
    });
  });

  // ============================================================
  // TEST CATEGORY F: Reentrant Lock Support
  // ============================================================

  describe('F. Reentrant Lock Support', () => {
    it('F1: Should allow same execution to re-acquire lock', async () => {
      const executionId = 'exec_reentrant';

      // First acquisition
      const lock1 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'reentrant-test',
        execution_id: executionId,
        plan_id: 'plan_reentrant',
        ttl_seconds: 300
      });

      assert.strictEqual(lock1.success, true);

      // Second acquisition (same execution)
      const lock2 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'reentrant-test',
        execution_id: executionId,
        plan_id: 'plan_reentrant',
        ttl_seconds: 300
      });

      assert.strictEqual(lock2.success, true);
      assert.strictEqual(lock2.reentrant, true);
      assert.strictEqual(lock2.lock_id, lock1.lock_id);

      // Cleanup
      await lockManager.releaseLock({
        lock_id: lock1.lock_id,
        execution_id: executionId
      });
    });
  });

  // ============================================================
  // TEST CATEGORY G: Lock Expiry Behavior
  // ============================================================

  describe('G. Lock Expiry Behavior', () => {
    it('G1: Should allow acquisition after lock expires', async () => {
      // Note: Jest timeout configured via jest.setTimeout() in beforeAll if needed

      // Acquire short-lived lock
      const lock1 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'expiry-test',
        execution_id: 'exec_expire_1',
        plan_id: 'plan_expire_1',
        ttl_seconds: 2 // 2 seconds
      });

      assert.strictEqual(lock1.success, true);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Clean up expired locks
      await lockManager.expireStaleLocks();

      // New execution should acquire successfully
      const lock2 = await lockManager.acquireLock({
        target_type: 'service',
        target_id: 'expiry-test',
        execution_id: 'exec_expire_2',
        plan_id: 'plan_expire_2',
        ttl_seconds: 300
      });

      assert.strictEqual(lock2.success, true);

      // Cleanup
      await lockManager.releaseLock({
        lock_id: lock2.lock_id,
        execution_id: 'exec_expire_2'
      });
    });
  });
});
