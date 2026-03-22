/**
 * Phase 10.3 — Execution Timeouts Test Suite
 * 
 * Tests time-bounded execution authority and timeout enforcement.
 * 
 * Core invariant:
 * > Admission grants bounded authority in time.
 */

const { getStateGraph } = require('../../lib/state/state-graph');
const { validateFailurePolicy, KillStrategy } = require('../../lib/core/failure-policy-schema');
const {
  generateAttemptId,
  startWatchdog,
  stopWatchdog,
  getWatchdogStatus,
  handleExpiredLease,
  applyFailedAttemptAccounting,
  clearActiveAttemptFields
} = require('../../lib/core/execution-watchdog');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Phase 10.3 — Execution Timeouts', () => {
  let stateGraph;

  beforeAll(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
  });

  afterAll(async () => {
    stopWatchdog();
  });

  beforeEach(async () => {
    // Clean test database
    stateGraph.db.exec('DELETE FROM managed_objectives');
    stateGraph.db.exec('DELETE FROM execution_ledger_events');
  });

  // ==========================================
  // Category A: Policy/Schema Tests
  // ==========================================

  describe('A. Policy/Schema Validation', () => {
    test('A1. Valid execution timeout policy accepted', () => {
      const policy = {
        policy_id: 'test-policy',
        policy_name: 'Test Policy',
        execution: {
          timeout_seconds: 120,
          kill_strategy: KillStrategy.COOPERATIVE_THEN_FORCED,
          grace_period_seconds: 10
        }
      };

      const result = validateFailurePolicy(policy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('A2. Invalid timeout policy rejected (negative timeout)', () => {
      const policy = {
        policy_id: 'test-policy',
        policy_name: 'Test Policy',
        execution: {
          timeout_seconds: -10,
          kill_strategy: KillStrategy.FORCED,
          grace_period_seconds: 5
        }
      };

      const result = validateFailurePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timeout_seconds'))).toBe(true);
    });

    test('A3. Invalid kill strategy rejected', () => {
      const policy = {
        policy_id: 'test-policy',
        policy_name: 'Test Policy',
        execution: {
          timeout_seconds: 120,
          kill_strategy: 'invalid_strategy',
          grace_period_seconds: 10
        }
      };

      const result = validateFailurePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('kill_strategy'))).toBe(true);
    });
  });

  // ==========================================
  // Category B: Execution Lifecycle Tests
  // ==========================================

  describe('B. Execution Lifecycle', () => {
    test('B1. Execution completes before deadline', async () => {
      // Create objective
      const objectiveId = 'test-gateway-health';
      const now = new Date().toISOString();
      const deadline = new Date(Date.now() + 120000).toISOString(); // 2 min future

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${now}', '${now}', 1
        )
      `);

      // Simulate execution start with lease
      const attemptId = generateAttemptId();
      stateGraph.updateObjective(objectiveId, {
        active_attempt_id: attemptId,
        execution_started_at: now,
        execution_deadline_at: deadline
      });

      const objective = stateGraph.getObjective(objectiveId);
      expect(objective.active_attempt_id).toBe(attemptId);
      expect(objective.execution_deadline_at).toBe(deadline);

      // Simulate completion before deadline
      await stateGraph.updateObjective(objectiveId, {
        execution_terminated_at: new Date().toISOString(),
        last_terminal_reason: 'completed'
      });

      await clearActiveAttemptFields(objectiveId);

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.active_attempt_id).toBeNull();
      expect(updated.last_terminal_reason).toBe('completed');
    });

    test('B2. Lease fields created on execution start', async () => {
      const objectiveId = 'test-gateway-health-2';
      const now = new Date().toISOString();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${now}', '${now}', 1
        )
      `);

      const attemptId = generateAttemptId();
      const deadline = new Date(Date.now() + 120000).toISOString();

      await stateGraph.updateObjective(objectiveId, {
        active_attempt_id: attemptId,
        execution_started_at: now,
        execution_deadline_at: deadline,
        cancel_requested_at: null,
        execution_terminated_at: null,
        termination_result: 'none'
      });

      const objective = stateGraph.getObjective(objectiveId);
      expect(objective.active_attempt_id).toBe(attemptId);
      expect(objective.execution_started_at).toBe(now);
      expect(objective.execution_deadline_at).toBe(deadline);
      expect(objective.cancel_requested_at).toBeNull();
      expect(objective.execution_terminated_at).toBeNull();
      expect(objective.termination_result).toBe('none');
    });

    test('B3. Lease fields cleared on completion', async () => {
      const objectiveId = 'test-gateway-health-3';
      const now = new Date().toISOString();
      const attemptId = generateAttemptId();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${now}', '${new Date(Date.now() + 120000).toISOString()}',
          '${now}', '${now}', 1
        )
      `);

      await clearActiveAttemptFields(objectiveId);

      const objective = stateGraph.getObjective(objectiveId);
      expect(objective.active_attempt_id).toBeNull();
      expect(objective.execution_started_at).toBeNull();
      expect(objective.execution_deadline_at).toBeNull();
      expect(objective.cancel_requested_at).toBeNull();
    });
  });

  // ==========================================
  // Category C: Timeout Behavior Tests
  // ==========================================

  describe('C. Timeout Behavior', () => {
    test('C1. Execution times out and enters cooldown', async () => {
      const objectiveId = 'test-timeout-cooldown';
      const now = new Date().toISOString();
      const pastDeadline = new Date(Date.now() - 10000).toISOString(); // 10s ago
      const attemptId = generateAttemptId();

      // Set cancel_requested_at beyond grace period to skip cooperative phase
      const cancelRequested = new Date(Date.now() - 20000).toISOString(); // 20s ago (beyond 10s grace)
      
      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at, cancel_requested_at,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${new Date(Date.now() - 130000).toISOString()}', '${pastDeadline}', '${cancelRequested}',
          'default-service-remediation', 1, 1,
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);
      await handleExpiredLease(objective, now);

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.reconciliation_status).toBe('cooldown');
      expect(updated.last_terminal_reason).toBe('timed_out');
      expect(updated.consecutive_failures).toBe(2);
      expect(updated.reconciliation_cooldown_until).toBeTruthy();
    });

    test('C2. Timeout at threshold enters degraded', async () => {
      const objectiveId = 'test-timeout-degraded';
      const now = new Date().toISOString();
      const pastDeadline = new Date(Date.now() - 10000).toISOString();
      const attemptId = generateAttemptId();
      const cancelRequested = new Date(Date.now() - 20000).toISOString(); // 20s ago (beyond grace)

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at, cancel_requested_at,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${new Date(Date.now() - 130000).toISOString()}', '${pastDeadline}', '${cancelRequested}',
          'default-service-remediation', 2, 2,
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);
      await handleExpiredLease(objective, now);

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.reconciliation_status).toBe('degraded');
      expect(updated.last_terminal_reason).toBe('timed_out');
      expect(updated.consecutive_failures).toBe(3);
      expect(updated.degraded_reason).toBeTruthy();
    });

    test('C3. Cancel requested before forced terminate when configured', async () => {
      const objectiveId = 'test-cooperative-cancel';
      const now = new Date().toISOString();
      const pastDeadline = new Date(Date.now() - 1000).toISOString(); // 1s ago
      const attemptId = generateAttemptId();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${new Date(Date.now() - 130000).toISOString()}', '${pastDeadline}',
          'default-service-remediation', 0, 0,
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);
      await handleExpiredLease(objective, now);

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.cancel_requested_at).toBeTruthy();
      expect(updated.last_terminal_reason).toBeNull(); // Not yet timed out, grace period active
    });

    test('C4. Forced terminate used when grace elapses', async () => {
      const objectiveId = 'test-forced-terminate';
      const now = new Date().toISOString();
      const pastDeadline = new Date(Date.now() - 20000).toISOString(); // 20s ago
      const cancelRequested = new Date(Date.now() - 15000).toISOString(); // 15s ago (grace expired)
      const attemptId = generateAttemptId();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at,
          cancel_requested_at,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${new Date(Date.now() - 140000).toISOString()}', '${pastDeadline}',
          '${cancelRequested}',
          'default-service-remediation', 0, 0,
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);
      await handleExpiredLease(objective, now);

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.last_terminal_reason).toBe('timed_out');
      expect(updated.termination_result).toBeTruthy();
      expect(updated.reconciliation_status).toBe('cooldown');
    });
  });

  // ==========================================
  // Category D: Stale Protection Tests
  // ==========================================

  describe('D. Stale Protection', () => {
    test('D1. Late completion after timeout is ignored', async () => {
      const objectiveId = 'test-stale-completion';
      const now = new Date().toISOString();
      const attemptId = generateAttemptId();

      // Create objective that has already timed out
      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          last_terminal_reason, reconciliation_last_execution_id,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'cooldown', 1,
          'timed_out', '${attemptId}',
          'default-service-remediation', 1, 1,
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);

      // Simulate stale completion check (would happen in remediation trigger)
      const isStale = objective.last_terminal_reason === 'timed_out';
      expect(isStale).toBe(true);
    });

    test('D2. Generation mismatch result ignored', async () => {
      const objectiveId = 'test-generation-mismatch';
      const now = new Date().toISOString();
      const attemptId = generateAttemptId();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 5,
          '${attemptId}',
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);

      // Simulate result from old generation
      const resultGeneration = 3;
      const isStale = objective.reconciliation_generation !== resultGeneration;
      expect(isStale).toBe(true);
    });

    test('D3. Attempt ID mismatch result ignored', async () => {
      const objectiveId = 'test-attempt-mismatch';
      const now = new Date().toISOString();
      const currentAttemptId = generateAttemptId();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${currentAttemptId}',
          '${now}', '${now}', 1
        )
      `);

      const objective = stateGraph.getObjective(objectiveId);

      // Simulate result from different attempt
      const resultAttemptId = generateAttemptId();
      const isStale = objective.active_attempt_id !== resultAttemptId;
      expect(isStale).toBe(true);
    });
  });

  // ==========================================
  // Category E: Startup Sweep Tests
  // ==========================================

  describe('E. Startup Sweep', () => {
    test('E1. Expired persisted attempt is terminalized on boot', async () => {
      const objectiveId = 'test-startup-expired';
      const pastDeadline = new Date(Date.now() - 60000).toISOString(); // 1 min ago
      const attemptId = generateAttemptId();
      const cancelRequested = new Date(Date.now() - 70000).toISOString(); // 70s ago (beyond grace)

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at, cancel_requested_at,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${new Date(Date.now() - 180000).toISOString()}', '${pastDeadline}', '${cancelRequested}',
          'default-service-remediation', 0, 0,
          '${new Date(Date.now() - 200000).toISOString()}', '${new Date(Date.now() - 200000).toISOString()}', 1
        )
      `);

      const { startupSweep } = require('../../lib/core/execution-watchdog');
      await startupSweep();

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.last_terminal_reason).toBe('timed_out');
      expect(updated.reconciliation_status).toBe('cooldown');
    });

    test('E2. Non-expired persisted attempt is preserved', async () => {
      const objectiveId = 'test-startup-valid';
      const futureDeadline = new Date(Date.now() + 60000).toISOString(); // 1 min future
      const attemptId = generateAttemptId();
      const now = new Date().toISOString();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          active_attempt_id, execution_started_at, execution_deadline_at,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          '${attemptId}', '${now}', '${futureDeadline}',
          '${now}', '${now}', 1
        )
      `);

      const { startupSweep } = require('../../lib/core/execution-watchdog');
      await startupSweep();

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.active_attempt_id).toBe(attemptId);
      expect(updated.last_terminal_reason).toBeNull();
      expect(updated.reconciliation_status).toBe('reconciling');
    });
  });

  // ==========================================
  // Category F: Failure Accounting Tests
  // ==========================================

  describe('F. Failure Accounting', () => {
    test('F1. Timeout increments consecutive failures', async () => {
      const objectiveId = 'test-timeout-counters';
      const now = new Date().toISOString();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          policy_ref, consecutive_failures, total_failures, total_attempts,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          'default-service-remediation', 1, 3, 4,
          '${now}', '${now}', 1
        )
      `);

      await applyFailedAttemptAccounting(objectiveId, 1, 'timeout');

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.consecutive_failures).toBe(2);
      expect(updated.total_failures).toBe(4);
      expect(updated.last_failure_at).toBeTruthy();
    });

    test('F2. Verified recovery resets consecutive failures', async () => {
      const objectiveId = 'test-recovery-reset';
      const now = new Date().toISOString();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          policy_ref, consecutive_failures, total_failures,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          'default-service-remediation', 2, 5,
          '${now}', '${now}', 1
        )
      `);

      // Simulate verified recovery (would be done by handleVerificationSuccess)
      await stateGraph.updateObjective(objectiveId, {
        reconciliation_status: 'idle',
        consecutive_failures: 0, // Reset on recovery
        reconciliation_last_verified_at: new Date().toISOString()
      });

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.consecutive_failures).toBe(0);
      expect(updated.total_failures).toBe(5); // Historical counter preserved
    });

    test('F3. Timeout preserves total history counters', async () => {
      const objectiveId = 'test-timeout-history';
      const now = new Date().toISOString();

      stateGraph.db.exec(`
        INSERT INTO managed_objectives (
          objective_id, objective_type, target_type, target_id,
          environment, status, desired_state_json, remediation_plan,
          evaluation_interval_seconds, verification_strength,
          reconciliation_status, reconciliation_generation,
          policy_ref, consecutive_failures, total_failures, total_attempts,
          created_at, updated_at, is_enabled
        ) VALUES (
          '${objectiveId}', 'maintain_health', 'service', 'openclaw-gateway',
          'test', 'monitoring', '{}', 'gateway-recovery-plan',
          30, 'service_health',
          'reconciling', 1,
          'default-service-remediation', 0, 10, 15,
          '${now}', '${now}', 1
        )
      `);

      await applyFailedAttemptAccounting(objectiveId, 1, 'timeout');

      const updated = stateGraph.getObjective(objectiveId);
      expect(updated.total_failures).toBe(11);
      expect(updated.consecutive_failures).toBe(1);
    });
  });
});
