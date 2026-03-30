/**
 * Remediation trigger result
 */
export type RemediationTriggerResult = {
    objective_id: string;
    /**
     * - Whether execution started
     */
    started: boolean;
    /**
     * - Execution ledger ID (if started)
     */
    execution_id: string | null;
    /**
     * - Why execution was rejected (if not started)
     */
    rejection_reason: string | null;
    /**
     * - Execution outcome
     */
    execution_result: any | null;
    /**
     * - Verification outcome
     */
    verification_result: any | null;
    /**
     * - Final reconciliation status
     */
    final_status: string;
    /**
     * - Reconciliation generation at completion
     */
    generation: number;
};
/**
 * Execute remediation for admitted objective
 *
 * This is the gate-controlled execution path.
 *
 * @param {string} objectiveId - Objective ID
 * @param {number} admittedGeneration - Generation from gate admission
 * @param {Object} context - Execution context
 * @param {Object} context.chatActionBridge - Chat action bridge instance (for execution)
 * @param {boolean} context.global_safe_mode - Safe mode flag
 * @returns {Promise<RemediationTriggerResult>}
 */
export function executeAdmittedRemediation(objectiveId: string, admittedGeneration: number, context?: {
    chatActionBridge: any;
    global_safe_mode: boolean;
}): Promise<RemediationTriggerResult>;
/**
 * Remediation trigger result
 * @typedef {Object} RemediationTriggerResult
 * @property {string} objective_id
 * @property {boolean} started - Whether execution started
 * @property {string|null} execution_id - Execution ledger ID (if started)
 * @property {string|null} rejection_reason - Why execution was rejected (if not started)
 * @property {Object|null} execution_result - Execution outcome
 * @property {Object|null} verification_result - Verification outcome
 * @property {string} final_status - Final reconciliation status
 * @property {number} generation - Reconciliation generation at completion
 */
/**
 * Check execution preconditions
 *
 * @param {Object} objective - Objective from State Graph
 * @param {number} admittedGeneration - Generation from gate admission
 * @param {Object} options - Additional options (safe_mode check)
 * @returns {{allowed: boolean, reason?: string}}
 */
export function checkExecutionPreconditions(objective: any, admittedGeneration: number, options?: any): {
    allowed: boolean;
    reason?: string;
};
/**
 * Handle execution failure
 *
 * Transitions:
 * - If attempts remain: reconciling → cooldown
 * - If exhausted: reconciling → degraded
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} error - Error message
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
export function handleExecutionFailure(stateGraph: any, objective: any, error: string, executionId: string): any;
/**
 * Handle verification failure
 *
 * Same transition logic as execution failure.
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} error - Error message
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
export function handleVerificationFailure(stateGraph: any, objective: any, error: string, executionId: string): any;
/**
 * Handle verification success
 *
 * This is the ONLY automatic path from reconciling to idle.
 *
 * Transition: reconciling → idle
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
export function handleVerificationSuccess(stateGraph: any, objective: any, executionId: string): any;
//# sourceMappingURL=remediation-trigger-integrated.d.ts.map