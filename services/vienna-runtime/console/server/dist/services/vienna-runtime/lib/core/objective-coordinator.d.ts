/**
 * Emit ledger event for objective evaluation cadence
 * @param {string} eventType - Event type
 * @param {Object} objective - Objective
 * @param {Object} metadata - Additional metadata
 */
export function emitCadenceEvent(eventType: string, objective: any, metadata?: any): Promise<void>;
/**
 * Evaluate single objective with distributed execution support
 *
 * PHASE 19 INTEGRATION: Route multi-step plans to distributed execution when appropriate
 *
 * @param {Object} objective - Objective to evaluate
 * @param {Object} context - Execution context (includes distributedCoordinator)
 * @returns {Promise<Object>} Evaluation result
 */
export function evaluateSingleObjective(objective: any, context?: any): Promise<any>;
/**
 * Run evaluation cycle for all due objectives
 * @param {Object} options - Evaluation options
 * @param {Object} options.currentTime - Current timestamp for evaluation
 * @param {Object} options.context - Execution context (chatActionBridge for remediation)
 * @returns {Promise<Object>} Evaluation cycle results
 */
export function runEvaluationCycle(options?: {
    currentTime: any;
    context: any;
}): Promise<any>;
/**
 * Check if plan should use distributed execution
 *
 * @param {Object} plan - Execution plan
 * @param {Object} context - Context with distributed coordinator
 * @returns {boolean}
 */
export function _shouldUseDistributedExecution(plan: any, context: any): boolean;
/**
 * Execute plan via distributed execution
 *
 * @param {string} objectiveId - Objective ID
 * @param {Object} plan - Execution plan
 * @param {Object} context - Context with distributed coordinator
 * @returns {Promise<Object>} Remediation result
 */
export function _executeDistributed(objectiveId: string, plan: any, context: any): Promise<any>;
//# sourceMappingURL=objective-coordinator.d.ts.map