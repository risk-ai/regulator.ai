/**
 * Remediation trigger result
 */
export type RemediationTriggerResult = {
    objective_id: string;
    /**
     * - Current objective state after trigger
     */
    objective_state: string;
    /**
     * - ID of remediation plan created
     */
    triggered_plan_id: string | null;
    /**
     * - Execution ledger ID (if remediation started)
     */
    execution_id: string | null;
    /**
     * - Policy evaluation summary
     */
    policy_decision: any | null;
    /**
     * - Final remediation outcome
     */
    remediation_outcome: any | null;
    /**
     * - Verification result
     */
    verification_outcome: any | null;
    /**
     * - Whether remediation was triggered
     */
    triggered: boolean;
    /**
     * - Why remediation was not triggered (if applicable)
     */
    suppression_reason: string | null;
};
/**
 * Trigger remediation workflow for a violated objective
 *
 * @param {string} objectiveId - Objective ID
 * @param {Object} context - Execution context
 * @param {Object} context.chatActionBridge - Chat action bridge instance (for execution)
 * @param {string} context.triggered_by - Who/what triggered remediation
 * @returns {Promise<RemediationTriggerResult>}
 */
export function triggerRemediation(objectiveId: string, context?: {
    chatActionBridge: any;
    triggered_by: string;
}): Promise<RemediationTriggerResult>;
/**
 * Batch trigger remediation for multiple objectives
 *
 * @param {string[]} objectiveIds - Array of objective IDs
 * @param {Object} context - Execution context
 * @returns {Promise<RemediationTriggerResult[]>}
 */
export function triggerRemediationBatch(objectiveIds: string[], context?: any): Promise<RemediationTriggerResult[]>;
/**
 * Check if objective is eligible for remediation
 * @param {Object} objective - Objective from State Graph
 * @returns {{eligible: boolean, reason?: string}}
 */
export function checkRemediationEligibility(objective: any): {
    eligible: boolean;
    reason?: string;
};
/**
 * Remediation trigger result
 * @typedef {Object} RemediationTriggerResult
 * @property {string} objective_id
 * @property {string} objective_state - Current objective state after trigger
 * @property {string|null} triggered_plan_id - ID of remediation plan created
 * @property {string|null} execution_id - Execution ledger ID (if remediation started)
 * @property {Object|null} policy_decision - Policy evaluation summary
 * @property {Object|null} remediation_outcome - Final remediation outcome
 * @property {Object|null} verification_outcome - Verification result
 * @property {boolean} triggered - Whether remediation was triggered
 * @property {string|null} suppression_reason - Why remediation was not triggered (if applicable)
 */
/**
 * Check if objective is in a remediating state (deduplication)
 * @param {string} state - Current objective state
 * @returns {boolean}
 */
export function isRemediating(state: string): boolean;
//# sourceMappingURL=remediation-trigger.d.ts.map