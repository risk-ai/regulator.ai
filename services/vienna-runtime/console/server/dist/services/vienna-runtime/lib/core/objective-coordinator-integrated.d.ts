export namespace CoordinatorOutcome {
    let HEALTHY_NO_ACTION: string;
    let HEALTHY_PASSIVE_RECOVERY: string;
    let DRIFT_DETECTED_ADMITTED: string;
    let DRIFT_DETECTED_SKIPPED_IN_FLIGHT: string;
    let DRIFT_DETECTED_SKIPPED_COOLDOWN: string;
    let DRIFT_DETECTED_SKIPPED_DEGRADED: string;
    let DRIFT_DETECTED_SKIPPED_SAFE_MODE: string;
    let DRIFT_DETECTED_SKIPPED_MANUAL_HOLD: string;
    let RECONCILIATION_EXECUTION_FAILED: string;
    let RECONCILIATION_VERIFICATION_FAILED: string;
    let RECONCILIATION_RECOVERED: string;
}
/**
 * Map evaluation result to coordinator outcome
 * @param {Object} evaluationResult - Result from integrated evaluator
 * @returns {string} Coordinator outcome
 */
export function mapEvaluationToOutcome(evaluationResult: any): string;
/**
 * Emit ledger event for objective evaluation cadence
 * @param {string} eventType - Event type
 * @param {Object} objective - Objective
 * @param {Object} metadata - Additional metadata
 */
export function emitCadenceEvent(eventType: string, objective: any, metadata?: any): Promise<void>;
/**
 * Evaluate single objective with gate-aware flow
 * @param {Object} objective - Objective to evaluate
 * @param {Object} context - Execution context (chatActionBridge, etc.)
 * @returns {Promise<Object>} Evaluation result
 */
export function evaluateSingleObjective(objective: any, context?: any): Promise<any>;
/**
 * Run evaluation cycle for all due objectives
 * @param {Object} options - Evaluation options
 * @param {number} options.currentTime - Current timestamp for evaluation
 * @param {Object} options.context - Execution context (chatActionBridge for remediation)
 * @returns {Promise<Object>} Evaluation cycle results
 */
export function runEvaluationCycle(options?: {
    currentTime: number;
    context: any;
}): Promise<any>;
//# sourceMappingURL=objective-coordinator-integrated.d.ts.map