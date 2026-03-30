/**
 * Phase 9.6 — Objective Evaluation Coordinator
 *
 * Orchestrates batch objective evaluation with ledger integration.
 *
 * Core responsibilities:
 * 1. Batch evaluation of due objectives
 * 2. Ledger cadence event emission
 * 3. Skip logic enforcement
 * 4. Bounded execution (no tight loops)
 *
 * Cadence events:
 * - objective_evaluation_due
 * - objective_evaluation_started
 * - objective_evaluation_skipped
 * - objective_evaluation_completed
 */
const { getStateGraph } = require('../state/state-graph');
const { getObjectivesDue, shouldSkipObjective, calculateNextDueTime } = require('./objective-scheduler');
const { ObjectiveEvaluator } = require('./objective-evaluator');
const { triggerRemediation } = require('./remediation-trigger');
/**
 * Emit ledger event for objective evaluation cadence
 * @param {string} eventType - Event type
 * @param {Object} objective - Objective
 * @param {Object} metadata - Additional metadata
 */
async function emitCadenceEvent(eventType, objective, metadata = {}) {
    const stateGraph = getStateGraph();
    const { v4: uuidv4 } = require('uuid');
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
        ...metadata
    };
    // Remove undefined/null values
    const cleanPayload = Object.fromEntries(Object.entries(payloadObj).filter(([_, v]) => v !== undefined && v !== null));
    const event = {
        event_id: uuidv4(),
        execution_id: objective.objective_id, // Use objective_id as execution_id
        event_type: eventType,
        stage: 'execution', // Cadence events are part of execution stage
        event_timestamp: new Date().toISOString(),
        sequence_num: sequenceNum,
        actor_type: 'system',
        actor_id: 'objective_evaluator',
        payload_json: cleanPayload
    };
    stateGraph.appendLedgerEvent(event);
}
/**
 * Evaluate single objective with distributed execution support
 *
 * PHASE 19 INTEGRATION: Route multi-step plans to distributed execution when appropriate
 *
 * @param {Object} objective - Objective to evaluate
 * @param {Object} context - Execution context (includes distributedCoordinator)
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
                duration_ms: Date.now() - startTime
            };
        }
        // Perform evaluation
        const evaluator = new ObjectiveEvaluator(stateGraph);
        const evaluationResult = await evaluator.evaluateObjective(objective.objective_id);
        // If remediation triggered, trigger it through governed pipeline
        if (evaluationResult.action_taken === 'remediation_triggered' && evaluationResult.triggered_plan_id) {
            // PHASE 19 INTEGRATION: Check if distributed execution should be used
            const plan = await stateGraph.getPlan(evaluationResult.triggered_plan_id);
            let remediationResult;
            if (context.distributedCoordinator && this._shouldUseDistributedExecution(plan, context)) {
                // Route to distributed execution
                remediationResult = await this._executeDistributed(objective.objective_id, plan, context);
            }
            else {
                // Local execution (existing path)
                remediationResult = await triggerRemediation(objective.objective_id, context // Pass context (needs chatActionBridge for execution)
                );
            }
            // Emit completion event with remediation metadata
            await emitCadenceEvent('objective_evaluation_completed', objective, {
                action: 'remediation_triggered',
                plan_id: evaluationResult.triggered_plan_id,
                remediation_triggered: remediationResult.triggered,
                execution_id: remediationResult.execution_id,
                distributed: remediationResult.distributed || false
            });
            return {
                objective_id: objective.objective_id,
                status: 'completed',
                action: 'remediation_triggered',
                plan_id: evaluationResult.triggered_plan_id,
                remediation: remediationResult,
                duration_ms: Date.now() - startTime
            };
        }
        // Emit completion event
        await emitCadenceEvent('objective_evaluation_completed', objective, {
            action: evaluationResult.action_taken,
            satisfied: evaluationResult.objective_satisfied
        });
        return {
            objective_id: objective.objective_id,
            status: 'completed',
            action: evaluationResult.action_taken,
            satisfied: evaluationResult.objective_satisfied,
            duration_ms: Date.now() - startTime
        };
    }
    catch (error) {
        // Emit failure event
        await emitCadenceEvent('objective_evaluation_failed', objective, {
            error: error.message
        });
        return {
            objective_id: objective.objective_id,
            status: 'failed',
            error: error.message,
            duration_ms: Date.now() - startTime
        };
    }
}
/**
 * Run evaluation cycle for all due objectives
 * @param {Object} options - Evaluation options
 * @param {Object} options.currentTime - Current timestamp for evaluation
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
        for (const objective of dueObjectives) {
            const result = await evaluateSingleObjective(objective, context);
            results.push(result);
        }
        return {
            status: 'completed',
            objectives_evaluated: dueObjectives.length,
            results,
            duration_ms: Date.now() - startTime
        };
    }
    catch (error) {
        return {
            status: 'failed',
            error: error.message,
            objectives_evaluated: 0,
            results: [],
            duration_ms: Date.now() - startTime
        };
    }
}
/**
 * Check if plan should use distributed execution
 *
 * @param {Object} plan - Execution plan
 * @param {Object} context - Context with distributed coordinator
 * @returns {boolean}
 */
function _shouldUseDistributedExecution(plan, context) {
    // Feature flag check
    if (!process.env.VIENNA_ENABLE_DISTRIBUTED || process.env.VIENNA_ENABLE_DISTRIBUTED !== 'true') {
        return false;
    }
    // Must have distributed coordinator
    if (!context.distributedCoordinator) {
        return false;
    }
    // Must have multi-step plan
    if (!plan.steps || plan.steps.length <= 1) {
        return false;
    }
    // Check if any step requires remote capabilities
    const requiresRemote = plan.steps.some(step => {
        return step.execution_hint === 'distributed' || step.preferred_node_id;
    });
    return requiresRemote;
}
/**
 * Execute plan via distributed execution
 *
 * @param {string} objectiveId - Objective ID
 * @param {Object} plan - Execution plan
 * @param {Object} context - Context with distributed coordinator
 * @returns {Promise<Object>} Remediation result
 */
async function _executeDistributed(objectiveId, plan, context) {
    const executionId = require('crypto').randomBytes(16).toString('hex');
    try {
        // Dispatch to distributed coordinator
        const dispatchResult = await context.distributedCoordinator.dispatchExecution(executionId, plan, context, { strategy: 'capability_match' });
        // Wait for result (could be streaming in production)
        const result = await context.distributedCoordinator.waitForResult(dispatchResult.coordination_id, { timeout: plan.timeout_ms || 300000 });
        return {
            triggered: true,
            execution_id: executionId,
            distributed: true,
            node_id: dispatchResult.node_id,
            coordination_id: dispatchResult.coordination_id,
            success: result.success,
            result: result
        };
    }
    catch (err) {
        return {
            triggered: false,
            execution_id: executionId,
            distributed: true,
            error: err.message
        };
    }
}
module.exports = {
    emitCadenceEvent,
    evaluateSingleObjective,
    runEvaluationCycle,
    _shouldUseDistributedExecution,
    _executeDistributed
};
//# sourceMappingURL=objective-coordinator.js.map