/**
 * Phase 10.1e — Coordinator Integration Tests
 * 
 * End-to-end validation that the evaluation loop is forced through the gate.
 * 
 * Test categories:
 * 1. Full healthy loop (idle → drift → admitted → execution → verification → idle)
 * 2. Duplicate evaluations (in-flight protection)
 * 3. Cooldown enforcement
 * 4. Cooldown expiry
 * 5. Degraded suppression
 * 6. Safe mode suppression
 * 7. Passive recovery
 * 8. Generation protection
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { 
  CoordinatorOutcome,
  mapEvaluationToOutcome,
  evaluateSingleObjective,
  runEvaluationCycle 
} = require('../../lib/core/objective-coordinator-integrated');
const { ReconciliationStatus } = require('../../lib/core/reconciliation-state-machine');
const { createObjective } = require('../../lib/core/objective-schema');

describe('Phase 10.1e — Coordinator Integration', () => {
  let stateGraph;

  beforeEach(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    
    // Clear test data
    stateGraph.db.prepare('DELETE FROM managed_objectives').run();
    stateGraph.db.prepare('DELETE FROM managed_objective_evaluations').run();
    stateGraph.db.prepare('DELETE FROM managed_objective_history').run();
    stateGraph.db.prepare('DELETE FROM execution_ledger_events').run();
    stateGraph.db.prepare('DELETE FROM execution_ledger_summary').run();

    // Seed a service for testing
    stateGraph.db.prepare(`
      INSERT OR REPLACE INTO services (service_id, service_name, service_type, status, health, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-service', 'test-service', 'daemon', 'running', 'healthy', new Date().toISOString(), new Date().toISOString());
  });

  afterEach(async () => {
    if (stateGraph?.db && stateGraph.db.open) {
      try {
        stateGraph.db.close();
      } catch (err) {
        // Already closed, ignore
      }
    }
  });

  // ==========================================
  // Category 1: Full Healthy Loop
  // ==========================================

  test('1.1 — Full healthy loop (idle → drift → admitted → recovered)', async () => {
    // Create objective in idle state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s',
      verification_strength: 'strong'
    });

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Create mock context with stubbed execution
    const executionResults = [];
    const context = {
      chatActionBridge: {
        executePlan: async (plan) => {
          executionResults.push(plan);
          
          // Simulate successful restart
          stateGraph.db.prepare(`
            UPDATE services SET health = ? WHERE service_id = ?
          `).run('healthy', 'test-service');

          return {
            execution_result: {
              success: true,
              outputs: { service_restarted: true }
            },
            verification_result: {
              objective_achieved: true,
              all_checks_passed: true
            },
            outcome: {
              status: 'succeeded',
              objective_achieved: true
            }
          };
        }
      }
    };

    // Run evaluation
    const result = await evaluateSingleObjective(objective, context);

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.RECONCILIATION_RECOVERED);
    expect(result.remediation.started).toBe(true);
    expect(result.remediation.final_status).toBe('idle');
    expect(executionResults.length).toBe(1);

    // Verify state transitions
    const history = stateGraph.listManagedObjectiveHistory(objective.objective_id);
    const transitions = history.map(h => `${h.from_status} → ${h.to_status}`);
    
    expect(transitions).toContain('idle → reconciling');
    expect(transitions).toContain('reconciling → idle');
  });

  // ==========================================
  // Category 2: Duplicate Evaluations
  // ==========================================

  test('2.1 — Duplicate evaluation during reconciling is skipped', async () => {
    // Create objective already in reconciling state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.RECONCILING;
    objective.reconciliation_generation = 1;
    objective.reconciliation_started_at = new Date().toISOString();

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy (drift still exists)
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Run evaluation
    const result = await evaluateSingleObjective(objective, {});

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT);
    expect(result.skip_reason).toContain('already_reconciling');
    expect(result.violation_detected).toBe(true);
  });

  // ==========================================
  // Category 3: Cooldown Enforcement
  // ==========================================

  test('3.1 — Evaluation during cooldown is skipped', async () => {
    // Create objective in cooldown state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.COOLDOWN;
    objective.reconciliation_generation = 1;
    objective.cooldown_until = new Date(Date.now() + 60000).toISOString(); // 1 min in future

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Run evaluation
    const result = await evaluateSingleObjective(objective, {});

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_COOLDOWN);
    expect(result.skip_reason).toContain('cooldown');
  });

  // ==========================================
  // Category 4: Cooldown Expiry
  // ==========================================

  test('4.1 — Cooldown expiry allows re-entry', async () => {
    // Create objective in cooldown state (expired)
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.COOLDOWN;
    objective.reconciliation_generation = 1;
    objective.cooldown_until = new Date(Date.now() - 1000).toISOString(); // Expired

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Create mock context
    const context = {
      chatActionBridge: {
        executePlan: async () => {
          // Restore service
          stateGraph.db.prepare(`
            UPDATE services SET health = ? WHERE service_id = ?
          `).run('healthy', 'test-service');

          return {
            execution_result: { success: true },
            verification_result: { objective_achieved: true },
            outcome: { status: 'succeeded', objective_achieved: true }
          };
        }
      }
    };

    // Run evaluation
    const result = await evaluateSingleObjective(objective, context);

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.RECONCILIATION_RECOVERED);
    expect(result.remediation.started).toBe(true);
  });

  // ==========================================
  // Category 5: Degraded Suppression
  // ==========================================

  test('5.1 — Degraded objective is observed but suppressed', async () => {
    // Create objective in degraded state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.DEGRADED;
    objective.reconciliation_generation = 1;

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Run evaluation
    const result = await evaluateSingleObjective(objective, {});

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_DEGRADED);
    expect(result.skip_reason).toContain('degraded');
  });

  // ==========================================
  // Category 6: Safe Mode Suppression
  // ==========================================

  test('6.1 — Safe mode blocks execution', async () => {
    // Enable safe mode
    stateGraph.db.prepare(`
      INSERT OR REPLACE INTO runtime_context (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run('safe_mode', 'true', new Date().toISOString());

    // Create objective in idle state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Run evaluation
    const result = await evaluateSingleObjective(objective, {});

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_SAFE_MODE);
    expect(result.skip_reason).toContain('safe_mode');

    // Cleanup
    stateGraph.db.prepare('DELETE FROM runtime_context WHERE key = ?').run('safe_mode');
  });

  // ==========================================
  // Category 7: Passive Recovery
  // ==========================================

  test('7.1 — Passive recovery from cooldown closes without execution', async () => {
    // Create objective in cooldown state (expired)
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.COOLDOWN;
    objective.reconciliation_generation = 1;
    objective.cooldown_until = new Date(Date.now() - 1000).toISOString(); // Expired

    stateGraph.createManagedObjective(objective);

    // Service is healthy (passive recovery occurred)
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('healthy', 'test-service');

    // Run evaluation (no context needed, no execution expected)
    const result = await evaluateSingleObjective(objective, {});

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.HEALTHY_PASSIVE_RECOVERY);
    expect(result.satisfied).toBe(true);
    expect(result.action).toBe('passive_recovery');

    // Verify state transition to idle
    const updated = stateGraph.getManagedObjective(objective.objective_id);
    expect(updated.reconciliation_status).toBe(ReconciliationStatus.IDLE);
  });

  // ==========================================
  // Category 8: Generation Protection
  // ==========================================

  test('8.1 — Generation mismatch blocks stale execution', async () => {
    // Create objective in reconciling state
    const objective = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });

    objective.reconciliation_status = ReconciliationStatus.RECONCILING;
    objective.reconciliation_generation = 3; // Current generation

    stateGraph.createManagedObjective(objective);

    // Make service unhealthy
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Create context that would execute with stale generation
    const executionAttempts = [];
    const context = {
      chatActionBridge: {
        executePlan: async () => {
          executionAttempts.push(true);
          return { execution_result: { success: false } };
        }
      }
    };

    // Run evaluation (evaluator will detect mismatch and skip)
    const result = await evaluateSingleObjective(objective, context);

    // Assertions
    expect(result.status).toBe('completed');
    expect(result.outcome).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT);
    expect(executionAttempts.length).toBe(0); // No execution attempted
  });

  // ==========================================
  // Category 9: Batch Evaluation
  // ==========================================

  test('9.1 — Batch evaluation with multiple outcomes', async () => {
    // Create 3 objectives with different states
    const obj1 = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });
    obj1.objective_id = 'obj1';
    obj1.last_evaluated_at = new Date(Date.now() - 60000).toISOString(); // Due

    const obj2 = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });
    obj2.objective_id = 'obj2';
    obj2.reconciliation_status = ReconciliationStatus.COOLDOWN;
    obj2.cooldown_until = new Date(Date.now() + 60000).toISOString();
    obj2.last_evaluated_at = new Date(Date.now() - 60000).toISOString();

    const obj3 = createObjective({
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running', health: 'healthy' },
      evaluation_interval: '30s'
    });
    obj3.objective_id = 'obj3';
    obj3.reconciliation_status = ReconciliationStatus.DEGRADED;
    obj3.last_evaluated_at = new Date(Date.now() - 60000).toISOString();

    stateGraph.createManagedObjective(obj1);
    stateGraph.createManagedObjective(obj2);
    stateGraph.createManagedObjective(obj3);

    // Make service unhealthy for all
    stateGraph.db.prepare(`
      UPDATE services SET health = ? WHERE service_id = ?
    `).run('degraded', 'test-service');

    // Create mock context
    const context = {
      chatActionBridge: {
        executePlan: async () => {
          stateGraph.db.prepare(`
            UPDATE services SET health = ? WHERE service_id = ?
          `).run('healthy', 'test-service');

          return {
            execution_result: { success: true },
            verification_result: { objective_achieved: true },
            outcome: { status: 'succeeded', objective_achieved: true }
          };
        }
      }
    };

    // Run batch evaluation
    const cycleResult = await runEvaluationCycle({ context });

    // Assertions
    expect(cycleResult.status).toBe('completed');
    expect(cycleResult.objectives_evaluated).toBe(3);
    expect(cycleResult.outcomes[CoordinatorOutcome.RECONCILIATION_RECOVERED]).toBe(1);
    expect(cycleResult.outcomes[CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_COOLDOWN]).toBe(1);
    expect(cycleResult.outcomes[CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_DEGRADED]).toBe(1);
  });

  // ==========================================
  // Category 10: Outcome Mapping
  // ==========================================

  test('10.1 — Outcome mapping handles all evaluation results', () => {
    // Healthy no action
    expect(mapEvaluationToOutcome({
      objective_satisfied: true,
      action_taken: null
    })).toBe(CoordinatorOutcome.HEALTHY_NO_ACTION);

    // Passive recovery
    expect(mapEvaluationToOutcome({
      objective_satisfied: true,
      action_taken: 'passive_recovery'
    })).toBe(CoordinatorOutcome.HEALTHY_PASSIVE_RECOVERY);

    // Admitted
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: true
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_ADMITTED);

    // Skipped - in flight
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: false,
      skip_reason: 'already_reconciling'
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT);

    // Skipped - cooldown
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: false,
      skip_reason: 'cooldown_active'
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_COOLDOWN);

    // Skipped - degraded
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: false,
      skip_reason: 'degraded'
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_DEGRADED);

    // Skipped - safe mode
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: false,
      skip_reason: 'safe_mode_active'
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_SAFE_MODE);

    // Skipped - manual hold
    expect(mapEvaluationToOutcome({
      objective_satisfied: false,
      violation_detected: true,
      reconciliation_admitted: false,
      skip_reason: 'manual_hold'
    })).toBe(CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_MANUAL_HOLD);
  });
});
