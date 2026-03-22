/**
 * Phase 10.1d — Evaluator Gate Integration Tests
 * 
 * Tests the evaluator's integration with the reconciliation gate.
 * 
 * Core invariants:
 * 1. Evaluator may observe divergence
 * 2. Only gate may authorize reconciliation
 * 3. Passive recovery only from cooldown
 * 4. No duplicate reconciliations
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set test environment
process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { ObjectiveEvaluator } = require('../../lib/core/objective-evaluator-integrated');
const { createReconciliationGate } = require('../../lib/core/reconciliation-gate');
const { ReconciliationStatus } = require('../../lib/core/reconciliation-state-machine');

describe('Phase 10.1d — Evaluator Gate Integration', () => {
  let stateGraph;
  let gate;
  let evaluator;
  let testDbPath;

  before(async () => {
    // Initialize test State Graph
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    testDbPath = stateGraph.dbPath;

    // Initialize gate
    gate = createReconciliationGate(stateGraph);

    // Initialize evaluator with gate
    evaluator = new ObjectiveEvaluator(stateGraph, gate);

    // Seed test service
    stateGraph.upsertService({
      service_id: 'test-service',
      service_name: 'Test Service',
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

  // Category 1: Healthy State Handling

  it('1.1 — Healthy objective → No action', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.IDLE
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'healthy_no_action');
    assert.strictEqual(result.objective_satisfied, true);
    assert.strictEqual(result.reconciliation_admitted, false);
  });

  // Category 2: Drift Detection with Gate Admission

  it('2.1 — Unhealthy idle objective → Gate admits', async () => {
    // Make service unhealthy
    stateGraph.upsertService({
      service_id: 'test-service',
      status: 'stopped',
      health: 'degraded'
    });

    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.IDLE,
      reconciliation_generation: 0,
      reconciliation_attempt_count: 0
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_admitted');
    assert.strictEqual(result.reconciliation_admitted, true);
    assert.strictEqual(result.reconciliation_generation, 1); // Generation incremented
    assert.strictEqual(result.objective_satisfied, false);

    // Verify objective transitioned to reconciling
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.RECONCILING);
    assert.strictEqual(updated.reconciliation_generation, 1);
    assert.strictEqual(updated.reconciliation_attempt_count, 1);
  });

  it('2.2 — Unhealthy objective during reconciliation → Skip (deduplication)', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 1,
      reconciliation_attempt_count: 1
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'reconciliation_in_progress');

    // Verify objective unchanged
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.RECONCILING);
    assert.strictEqual(updated.reconciliation_generation, 1);
  });

  // Category 3: Cooldown Handling

  it('3.1 — Unhealthy objective in cooldown → Skip with reason', async () => {
    const cooldownUntil = Date.now() + 60000; // 1 minute from now

    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.COOLDOWN,
      reconciliation_cooldown_until: new Date(cooldownUntil).toISOString(),
      reconciliation_generation: 2,
      reconciliation_attempt_count: 1
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_skipped_cooldown');
    assert.strictEqual(result.skip_reason, 'cooldown');
    assert.strictEqual(result.reconciliation_admitted, false);

    // Verify objective unchanged
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.COOLDOWN);
  });

  it('3.2 — Unhealthy objective with expired cooldown → Gate admits', async () => {
    const cooldownUntil = Date.now() - 1000; // Expired 1 second ago

    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.COOLDOWN,
      reconciliation_cooldown_until: new Date(cooldownUntil).toISOString(),
      reconciliation_generation: 2,
      reconciliation_attempt_count: 1
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_admitted');
    assert.strictEqual(result.reconciliation_admitted, true);
    assert.strictEqual(result.reconciliation_generation, 3); // Generation incremented

    // Verify objective transitioned to reconciling
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.RECONCILING);
    assert.strictEqual(updated.reconciliation_generation, 3);
    assert.strictEqual(updated.reconciliation_attempt_count, 2); // Attempt incremented
  });

  // Category 4: Passive Recovery

  it('4.1 — Healthy objective in cooldown → Passive recovery to idle', async () => {
    // Make service healthy again
    stateGraph.upsertService({
      service_id: 'test-service',
      status: 'running',
      health: 'healthy'
    });

    const cooldownUntil = Date.now() + 60000; // Still in cooldown

    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.COOLDOWN,
      reconciliation_cooldown_until: new Date(cooldownUntil).toISOString(),
      reconciliation_generation: 3,
      reconciliation_attempt_count: 1
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'healthy_passive_recovery');
    assert.strictEqual(result.objective_satisfied, true);

    // Verify objective transitioned to idle
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.IDLE);
    assert.strictEqual(updated.reconciliation_attempt_count, 0);
    assert.strictEqual(updated.reconciliation_cooldown_until, null);
    assert.strictEqual(updated.reconciliation_last_result, 'recovered');
  });

  it('4.2 — Healthy objective in reconciling → No passive recovery', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.RECONCILING,
      reconciliation_generation: 4,
      reconciliation_attempt_count: 1
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    // Should skip (reconciliation in progress)
    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'reconciliation_in_progress');

    // Verify objective unchanged (no passive recovery from reconciling)
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.RECONCILING);
  });

  // Category 5: Safe Mode

  it('5.1 — Unhealthy objective with safe mode enabled → Skip', async () => {
    // Make service unhealthy
    stateGraph.upsertService({
      service_id: 'test-service',
      status: 'stopped',
      health: 'degraded'
    });

    // Enable safe mode
    gate.enableSafeMode();

    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.IDLE,
      reconciliation_generation: 0,
      reconciliation_attempt_count: 0
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_skipped_safe_mode');
    assert.strictEqual(result.skip_reason, 'safe_mode');
    assert.strictEqual(result.reconciliation_admitted, false);

    // Verify objective unchanged
    const updated = stateGraph.getObjective(objective.objective_id);
    assert.strictEqual(updated.reconciliation_status, ReconciliationStatus.IDLE);

    // Disable safe mode for other tests
    gate.disableSafeMode();
  });

  // Category 6: Manual Hold

  it('6.1 — Unhealthy objective with manual hold → Skip', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.IDLE,
      reconciliation_generation: 0,
      reconciliation_attempt_count: 0,
      reconciliation_manual_hold: true // Manual hold flag
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_skipped_manual_hold');
    assert.strictEqual(result.skip_reason, 'manual_hold');
    assert.strictEqual(result.reconciliation_admitted, false);
  });

  // Category 7: Degraded State

  it('7.1 — Unhealthy objective in degraded → Skip', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      reconciliation_status: ReconciliationStatus.DEGRADED,
      reconciliation_generation: 5,
      reconciliation_attempt_count: 3 // Max attempts exhausted
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.action_taken, 'drift_detected_skipped_degraded');
    assert.strictEqual(result.skip_reason, 'degraded');
    assert.strictEqual(result.reconciliation_admitted, false);
  });

  // Category 8: Disabled/Archived/Suspended Objectives

  it('8.1 — Disabled objective → Skip', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      is_enabled: false
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'objective_disabled');
  });

  it('8.2 — Archived objective → Skip', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      status: 'archived'
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'objective_archived');
  });

  it('8.3 — Suspended objective → Skip', async () => {
    const objective = stateGraph.createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { service_active: true, service_healthy: true },
      evaluation_interval: 30,
      remediation_plan: 'restart_service_plan',
      status: 'suspended'
    });

    const result = await evaluator.evaluateObjective(objective.objective_id);

    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'objective_suspended');
  });
});
