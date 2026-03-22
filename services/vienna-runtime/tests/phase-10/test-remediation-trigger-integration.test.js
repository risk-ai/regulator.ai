/**
 * Phase 10.1d — Remediation Trigger Integration Tests
 * 
 * Tests the remediation trigger's gate integration and lifecycle handling.
 * 
 * Core invariants:
 * 1. No execution unless reconciliation_status === 'reconciling'
 * 2. Generation must match admitted generation
 * 3. Execution success alone does NOT declare recovery
 * 4. Only verification may close reconciling → idle
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set test environment
process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const {
  executeAdmittedRemediation,
  checkExecutionPreconditions,
  handleExecutionFailure,
  handleVerificationFailure,
  handleVerificationSuccess
} = require('../../lib/core/remediation-trigger-integrated');
const { ReconciliationStatus } = require('../../lib/core/reconciliation-state-machine');
const { createObjective } = require('../../lib/core/objective-schema');

describe('Phase 10.1d — Remediation Trigger Integration', () => {
  let stateGraph;
  let testDbPath;

  before(async () => {
    // Initialize test State Graph
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    testDbPath = stateGraph.dbPath;

    // Seed test service
    stateGraph.createService({
      service_id: 'test-service',
      service_name: 'Test Service',
      service_type: 'daemon',
      status: 'running',
      health: 'healthy'
    });
  });

  after(() => {
    // Cleanup test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // Category 1: Precondition Checks

  it('1.1 — Refuses execution if not reconciling', () => {
    const objective = {
      objective_id: 'test-obj-1',
      reconciliation_status: ReconciliationStatus.IDLE,
      reconciliation_generation: 1,
      manual_hold: false
    };

    const result = checkExecutionPreconditions(objective, 1);

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'invalid_status_idle');
  });

  it('1.2 — Refuses stale generation', () => {
    const objective = {
      objective_id: 'test-obj-2',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 2,
      manual_hold: false
    };

    const result = checkExecutionPreconditions(objective, 1); // Stale generation

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'generation_mismatch');
    assert.strictEqual(result.metadata.expected, 1);
    assert.strictEqual(result.metadata.actual, 2);
  });

  it('1.3 — Refuses manual hold', () => {
    const objective = {
      objective_id: 'test-obj-3',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 1,
      manual_hold: true
    };

    const result = checkExecutionPreconditions(objective, 1);

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'manual_hold');
  });

  it('1.4 — Refuses safe mode', () => {
    const objective = {
      objective_id: 'test-obj-4',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 1,
      manual_hold: false
    };

    const result = checkExecutionPreconditions(objective, 1, {
      global_safe_mode: true
    });

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'safe_mode');
  });

  it('1.5 — Allows valid admitted reconciliation', () => {
    const objective = {
      objective_id: 'test-obj-5',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 1,
      manual_hold: false
    };

    const result = checkExecutionPreconditions(objective, 1);

    assert.strictEqual(result.allowed, true);
  });

  // Category 2: Execution Failure Handling

  it('2.1 — Execution failure with attempts remaining → cooldown', () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 1;
    objConfig.reconciliation_attempt_count = 1; // 2 attempts remaining

    const objective = stateGraph.createObjective(objConfig);

    const result = handleExecutionFailure(
      stateGraph,
      objective,
      'Test execution failure',
      'exec-123'
    );

    assert.strictEqual(result.status, ReconciliationStatus.COOLDOWN);
    assert.ok(result.cooldown_until);
    assert.strictEqual(result.attempts_remaining, 2);

    // Verify objective updated
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.COOLDOWN);
    assert.strictEqual(updated.reconciliation_last_result, 'execution_failed');
    assert.strictEqual(updated.reconciliation_last_error, 'Test execution failure');
    assert.strictEqual(updated.reconciliation_last_execution_id, 'exec-123');
  });

  it('2.2 — Execution failure with attempts exhausted → degraded', () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 2;
    objConfig.reconciliation_attempt_count = 3; // Max attempts

    const objective = stateGraph.createObjective(objConfig);

    const result = handleExecutionFailure(
      stateGraph,
      objective,
      'Test execution failure',
      'exec-456'
    );

    assert.strictEqual(result.status, ReconciliationStatus.DEGRADED);
    assert.strictEqual(result.attempts_exhausted, true);

    // Verify objective updated
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.DEGRADED);
    assert.strictEqual(updated.reconciliation_last_result, 'execution_failed');
    assert.strictEqual(updated.reconciliation_last_error, 'Test execution failure');
  });

  // Category 3: Verification Failure Handling

  it('3.1 — Verification failure with attempts remaining → cooldown', () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 3;
    objConfig.reconciliation_attempt_count = 1;

    const objective = stateGraph.createObjective(objConfig);

    const result = handleVerificationFailure(
      stateGraph,
      objective,
      'Service still unhealthy',
      'exec-789'
    );

    assert.strictEqual(result.status, ReconciliationStatus.COOLDOWN);
    assert.ok(result.cooldown_until);

    // Verify objective updated
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.COOLDOWN);
    assert.strictEqual(updated.reconciliation_last_result, 'verification_failed');
    assert.strictEqual(updated.reconciliation_last_error, 'Service still unhealthy');
  });

  it('3.2 — Verification failure with attempts exhausted → degraded', () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 4;
    objConfig.reconciliation_attempt_count = 3;

    const objective = stateGraph.createObjective(objConfig);

    const result = handleVerificationFailure(
      stateGraph,
      objective,
      'Service still unhealthy',
      'exec-999'
    );

    assert.strictEqual(result.status, ReconciliationStatus.DEGRADED);

    // Verify objective updated
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.DEGRADED);
  });

  // Category 4: Verification Success (Only Path to Idle)

  it('4.1 — Verification success closes reconciling → idle', () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 5;
    objConfig.reconciliation_attempt_count = 2;

    const objective = stateGraph.createObjective(objConfig);

    const result = handleVerificationSuccess(
      stateGraph,
      objective,
      'exec-success'
    );

    assert.strictEqual(result.status, ReconciliationStatus.IDLE);
    assert.strictEqual(result.recovered, true);

    // Verify objective updated
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.IDLE);
    assert.strictEqual(updated.reconciliation_attempt_count, 0); // Reset
    assert.strictEqual(updated.reconciliation_last_result, 'recovered');
    assert.strictEqual(updated.reconciliation_last_error, null); // Cleared
    assert.strictEqual(updated.reconciliation_cooldown_until, null); // Cleared
    assert.ok(updated.reconciliation_last_verified_at);
  });

  // Category 5: End-to-End Rejection Tests

  it('5.1 — executeAdmittedRemediation rejects objective not found', async () => {
    const result = await executeAdmittedRemediation('nonexistent', 1, {});

    assert.strictEqual(result.started, false);
    assert.strictEqual(result.rejection_reason, 'objective_not_found');
  });

  it('5.2 — executeAdmittedRemediation rejects wrong status', async () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.IDLE; // Wrong status

    const objective = stateGraph.createObjective(objConfig);

    const result = await executeAdmittedRemediation(
      objective.objective_id,
      1,
      {}
    );

    assert.strictEqual(result.started, false);
    assert.strictEqual(result.rejection_reason, 'invalid_status_idle');
    assert.strictEqual(result.final_status, ReconciliationStatus.IDLE);
  });

  it('5.3 — executeAdmittedRemediation rejects generation mismatch', async () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 5;

    const objective = stateGraph.createObjective(objConfig);

    const result = await executeAdmittedRemediation(
      objective.objective_id,
      3, // Stale generation
      {}
    );

    assert.strictEqual(result.started, false);
    assert.strictEqual(result.rejection_reason, 'generation_mismatch');
    assert.strictEqual(result.rejection_metadata.expected, 3);
    assert.strictEqual(result.rejection_metadata.actual, 5);
  });

  it('5.4 — executeAdmittedRemediation rejects safe mode after admission', async () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'test-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 6;
    objConfig.reconciliation_attempt_count = 0;

    const objective = stateGraph.createObjective(objConfig);

    const result = await executeAdmittedRemediation(
      objective.objective_id,
      6,
      { global_safe_mode: true } // Safe mode enabled after admission
    );

    assert.strictEqual(result.started, false);
    assert.strictEqual(result.rejection_reason, 'safe_mode');
  });

  it('5.5 — executeAdmittedRemediation handles missing plan', async () => {
    const objConfig = createObjective({
      target_id: 'test-service',
      desired_state: { service_active: true },
      remediation_plan: 'nonexistent-plan',
      evaluation_interval: '30s'
    });
    objConfig.reconciliation_status = ReconciliationStatus.RECONCILING;
    objConfig.reconciliation_generation = 7;
    objConfig.reconciliation_attempt_count = 0;

    const objective = stateGraph.createObjective(objConfig);

    const result = await executeAdmittedRemediation(
      objective.objective_id,
      7,
      {}
    );

    assert.strictEqual(result.started, false);
    assert.strictEqual(result.rejection_reason, 'plan_not_found');
    assert.strictEqual(result.final_status, ReconciliationStatus.DEGRADED);

    // Verify objective transitioned to degraded
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.DEGRADED);
  });
});
