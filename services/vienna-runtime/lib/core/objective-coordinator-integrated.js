/**
 * Phase 10.1e — Gate-Aware Objective Coordinator
 * 
 * Orchestrates batch objective evaluation through the reconciliation gate.
 * 
 * Core principle:
 * > Coordinator orchestrates, does not decide.
 * 
 * Coordinator responsibilities:
 * 1. Load objectives
 * 2. Run integrated evaluator
 * 3. Inspect evaluator outcome
 * 4. Invoke integrated trigger if admitted
 * 5. Record metrics/events
 * 
 * Coordinator MUST NEVER:
 * - Mutate reconciliation state directly
 * - Start execution without gate admission
 * - Override cooldown/degraded/safe mode
 * - Declare recovery (that's verification's job)
 * 
 * Architecture:
 * Coordinator → Integrated Evaluator → Reconciliation Gate → Integrated Trigger → Execution → Verification
 */

const { getStateGraph } = require('../state/state-graph');
const { getObjectivesDue, shouldSkipObjective } = require('./objective-scheduler');
const { ObjectiveEvaluator } = require('./objective-evaluator-integrated');
const { executeAdmittedRemediation } = require('./remediation-trigger-integrated');

/**
 * Outcome types the coordinator understands
 */
const CoordinatorOutcome = {
  HEALTHY_NO_ACTION: 'healthy_no_action',
  HEALTHY_PASSIVE_RECOVERY: 'healthy_passive_recovery',
  DRIFT_DETECTED_ADMITTED: 'drift_detected_admitted',
  DRIFT_DETECTED_SKIPPED_IN_FLIGHT: 'drift_detected_skipped_in_flight',
  DRIFT_DETECTED_SKIPPED_COOLDOWN: 'drift_detected_skipped_cooldown',
  DRIFT_DETECTED_SKIPPED_DEGRADED: 'drift_detected_skipped_degraded',
  DRIFT_DETECTED_SKIPPED_SAFE_MODE: 'drift_detected_skipped_safe_mode',
  DRIFT_DETECTED_SKIPPED_MANUAL_HOLD: 'drift_detected_skipped_manual_hold',
  RECONCILIATION_EXECUTION_FAILED: 'reconciliation_execution_failed',
  RECONCILIATION_VERIFICATION_FAILED: 'reconciliation_verification_failed',
  RECONCILIATION_RECOVERED: 'reconciliation_recovered'
};

/**
 * Map evaluation result to coordinator outcome
 * @param {Object} evaluationResult - Result from integrated evaluator
 * @returns {string} Coordinator outcome
 */
function mapEvaluationToOutcome(evaluationResult) {
  // Healthy states
  if (evaluationResult.objective_satisfied) {
    if (evaluationResult.action_taken === 'passive_recovery') {
      return CoordinatorOutcome.HEALTHY_PASSIVE_RECOVERY;
    }
    return CoordinatorOutcome.HEALTHY_NO_ACTION;
  }

  // Drift detected, check admission status
  if (evaluationResult.violation_detected) {
    if (evaluationResult.reconciliation_admitted) {
      return CoordinatorOutcome.DRIFT_DETECTED_ADMITTED;
    }

    // Skipped, determine reason
    const reason = evaluationResult.skip_reason || 'unknown';
    
    if (reason.includes('in_flight') || reason.includes('already_reconciling')) {
      return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT;
    }
    if (reason.includes('cooldown')) {
      return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_COOLDOWN;
    }
    if (reason.includes('degraded')) {
      return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_DEGRADED;
    }
    if (reason.includes('safe_mode')) {
      return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_SAFE_MODE;
    }
    if (reason.includes('manual_hold') || reason.includes('suspended')) {
      return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_MANUAL_HOLD;
    }

    // Default: in-flight (conservative)
    return CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT;
  }

  // Default: no action
  return CoordinatorOutcome.HEALTHY_NO_ACTION;
}

/**
 * Emit ledger event for objective evaluation cadence
 * @param {string} eventType - Event type
 * @param {Object} objective - Objective
 * @param {Object} metadata - Additional metadata
 */
async function emitCadenceEvent(eventType, objective, metadata = {}) {
  const stateGraph = getStateGraph();
  const { randomUUID } = require('crypto');
  
  // Get current sequence number for this objective
  const db = stateGraph.db;
  const maxSeq = db.prepare(`
    SELECT MAX(sequence_num) as max_seq 
    FROM execution_ledger_events 
    WHERE execution_id = ?
  `).get(objective.objective_id);
  
  const sequenceNum = (maxSeq?.max_seq || 0) + 1;
  
  // Build payload for ledger event
  const payloadObj = {
    objective_type: objective.objective_type,
    target_id: objective.target_id,
    status: objective.status,
    reconciliation_status: objective.reconciliation_status,
    reconciliation_generation: objective.reconciliation_generation,
    ...metadata
  };
  
  // Remove undefined/null values
  const cleanPayload = Object.fromEntries(
    Object.entries(payloadObj).filter(([_, v]) => v !== undefined && v !== null)
  );
  
  const event = {
    event_id: randomUUID(),
    execution_id: objective.objective_id,
    event_type: eventType,
    stage: 'execution',
    event_timestamp: new Date().toISOString(),
    sequence_num: sequenceNum,
    actor_type: 'system',
    actor_id: 'objective_coordinator',
    payload_json: cleanPayload
  };

  stateGraph.appendLedgerEvent(event);
}

/**
 * Evaluate single objective with gate-aware flow
 * @param {Object} objective - Objective to evaluate
 * @param {Object} context - Execution context (chatActionBridge, etc.)
 * @returns {Promise<Object>} Evaluation result
 */
async function evaluateSingleObjective(objective, context = {}) {
  const stateGraph = getStateGraph();
  const startTime = Date.now();

  try {
    // Emit evaluation started event
    await emitCadenceEvent('objective_evaluation_started', objective);

    // Check skip conditions (defensive, should already be filtered)
    const { skip, reason } = shouldSkipObjective(objective);
    if (skip) {
      await emitCadenceEvent('objective_evaluation_skipped', objective, { reason });
      return {
        objective_id: objective.objective_id,
        status: 'skipped',
        reason,
        outcome: null,
        duration_ms: Date.now() - startTime
      };
    }

    // Run integrated evaluator (gate-aware)
    const evaluator = new ObjectiveEvaluator(stateGraph);
    const evaluationResult = await evaluator.evaluateObjective(objective.objective_id);

    // Map to coordinator outcome
    const outcome = mapEvaluationToOutcome(evaluationResult);

    // Handle outcome
    switch (outcome) {
      case CoordinatorOutcome.HEALTHY_NO_ACTION:
      case CoordinatorOutcome.HEALTHY_PASSIVE_RECOVERY:
        // No action needed, record and continue
        await emitCadenceEvent('objective_evaluation_completed', objective, {
          outcome,
          satisfied: evaluationResult.objective_satisfied,
          action: evaluationResult.action_taken
        });

        return {
          objective_id: objective.objective_id,
          status: 'completed',
          outcome,
          satisfied: evaluationResult.objective_satisfied,
          action: evaluationResult.action_taken,
          duration_ms: Date.now() - startTime
        };

      case CoordinatorOutcome.DRIFT_DETECTED_ADMITTED:
        // Gate admitted remediation, invoke integrated trigger
        const generation = evaluationResult.reconciliation_generation;
        
        if (!generation) {
          throw new Error('Gate admitted reconciliation but no generation provided');
        }

        // Invoke integrated trigger (gate-controlled execution)
        const remediationResult = await executeAdmittedRemediation(
          objective.objective_id,
          generation,
          context
        );

        // Determine final outcome based on remediation result
        let finalOutcome = outcome;
        if (remediationResult.started) {
          if (remediationResult.final_status === 'idle') {
            finalOutcome = CoordinatorOutcome.RECONCILIATION_RECOVERED;
          } else if (remediationResult.final_status === 'cooldown') {
            if (remediationResult.verification_result && !remediationResult.verification_result.objective_achieved) {
              finalOutcome = CoordinatorOutcome.RECONCILIATION_VERIFICATION_FAILED;
            } else {
              finalOutcome = CoordinatorOutcome.RECONCILIATION_EXECUTION_FAILED;
            }
          }
        }

        // Emit completion event with remediation metadata
        await emitCadenceEvent('objective_evaluation_completed', objective, {
          outcome: finalOutcome,
          remediation_started: remediationResult.started,
          execution_id: remediationResult.execution_id,
          final_status: remediationResult.final_status,
          generation
        });

        return {
          objective_id: objective.objective_id,
          status: 'completed',
          outcome: finalOutcome,
          remediation: remediationResult,
          generation,
          duration_ms: Date.now() - startTime
        };

      case CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_IN_FLIGHT:
      case CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_COOLDOWN:
      case CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_DEGRADED:
      case CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_SAFE_MODE:
      case CoordinatorOutcome.DRIFT_DETECTED_SKIPPED_MANUAL_HOLD:
        // Gate denied remediation, record skip reason
        await emitCadenceEvent('objective_evaluation_skipped', objective, {
          outcome,
          skip_reason: evaluationResult.skip_reason,
          violation_detected: evaluationResult.violation_detected
        });

        return {
          objective_id: objective.objective_id,
          status: 'completed',
          outcome,
          skip_reason: evaluationResult.skip_reason,
          violation_detected: evaluationResult.violation_detected,
          duration_ms: Date.now() - startTime
        };

      default:
        // Unknown outcome, log and continue
        console.warn(`[Coordinator] Unknown outcome: ${outcome}`);
        await emitCadenceEvent('objective_evaluation_completed', objective, {
          outcome: 'unknown',
          evaluation_result: evaluationResult
        });

        return {
          objective_id: objective.objective_id,
          status: 'completed',
          outcome: 'unknown',
          duration_ms: Date.now() - startTime
        };
    }

  } catch (error) {
    // Emit failure event
    await emitCadenceEvent('objective_evaluation_failed', objective, {
      error: error.message
    });

    return {
      objective_id: objective.objective_id,
      status: 'failed',
      outcome: null,
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Run evaluation cycle for all due objectives
 * @param {Object} options - Evaluation options
 * @param {number} options.currentTime - Current timestamp for evaluation
 * @param {Object} options.context - Execution context (chatActionBridge for remediation)
 * @returns {Promise<Object>} Evaluation cycle results
 */
async function runEvaluationCycle(options = {}) {
  const startTime = Date.now();
  const currentTime = options.currentTime || Date.now();
  const context = options.context || {};

  try {
    // Get objectives due for evaluation
    const dueObjectives = await getObjectivesDue({ currentTime });

    if (dueObjectives.length === 0) {
      return {
        status: 'completed',
        objectives_evaluated: 0,
        results: [],
        outcomes: {},
        duration_ms: Date.now() - startTime
      };
    }

    // Emit due events for all objectives
    for (const objective of dueObjectives) {
      await emitCadenceEvent('objective_evaluation_due', objective, {
        last_evaluated_at: objective.last_evaluated_at,
        evaluation_interval: objective.evaluation_interval
      });
    }

    // Evaluate each objective
    const results = [];
    const outcomeCounts = {};

    for (const objective of dueObjectives) {
      const result = await evaluateSingleObjective(objective, context);
      results.push(result);

      // Track outcome counts
      if (result.outcome) {
        outcomeCounts[result.outcome] = (outcomeCounts[result.outcome] || 0) + 1;
      }
    }

    return {
      status: 'completed',
      objectives_evaluated: dueObjectives.length,
      results,
      outcomes: outcomeCounts,
      duration_ms: Date.now() - startTime
    };

  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
      objectives_evaluated: 0,
      results: [],
      outcomes: {},
      duration_ms: Date.now() - startTime
    };
  }
}

module.exports = {
  CoordinatorOutcome,
  mapEvaluationToOutcome,
  emitCadenceEvent,
  evaluateSingleObjective,
  runEvaluationCycle
};
