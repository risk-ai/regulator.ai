/**
 * Gate Decision Result
 */
export type GateDecision = {
    /**
     * - Whether reconciliation is admitted
     */
    admitted: boolean;
    /**
     * - Reason for admission or skip
     */
    reason: string;
    /**
     * - Reconciliation generation (if admitted)
     */
    generation: number | null;
    /**
     * - State updates to apply (if admitted)
     */
    updates: any | null;
    /**
     * - Additional context
     */
    metadata: any | null;
};
/**
 * Gate Decision Result
 *
 * @typedef {Object} GateDecision
 * @property {boolean} admitted - Whether reconciliation is admitted
 * @property {string} reason - Reason for admission or skip
 * @property {number|null} generation - Reconciliation generation (if admitted)
 * @property {Object|null} updates - State updates to apply (if admitted)
 * @property {Object|null} metadata - Additional context
 */
/**
 * Reconciliation Gate
 *
 * Stateless service for admission control.
 * State mutations applied via StateGraph.
 */
export class ReconciliationGate {
    constructor(stateGraph: any, options?: {});
    stateGraph: any;
    options: {
        global_safe_mode: boolean;
    };
    /**
     * Request reconciliation admission for an objective
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Admission context (drift_reason, intent_id, etc.)
     * @returns {GateDecision} Admission decision
     */
    requestAdmission(objectiveId: string, context?: any): GateDecision;
    /**
     * Admit reconciliation with atomic state update
     *
     * This is the single-flight enforcement point.
     * Uses compare-and-swap pattern on reconciliation_status.
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Admission context
     * @returns {Object} { admitted: boolean, generation: number|null, reason: string }
     */
    admitAndTransition(objectiveId: string, context?: any): any;
    /**
     * Batch admission check (without state mutation)
     *
     * Used by evaluator to determine which objectives need reconciliation.
     *
     * @param {string[]} objectiveIds - Array of objective IDs
     * @param {Object} context - Shared context
     * @returns {Object[]} Array of decisions
     */
    batchCheckEligibility(objectiveIds: string[], context?: any): any[];
    /**
     * Get gate status summary
     *
     * @returns {Object} Current gate configuration
     */
    getStatus(): any;
    /**
     * Enable global safe mode
     *
     * Blocks all new reconciliation admissions.
     */
    enableSafeMode(reason?: string): void;
    /**
     * Disable global safe mode
     *
     * Allows reconciliation admissions.
     */
    disableSafeMode(reason?: string): void;
    /**
     * Check if objective can be admitted (read-only)
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Context
     * @returns {Object} { eligible: boolean, reason: string }
     */
    checkEligibility(objectiveId: string, context?: any): any;
    /**
     * Manually reset objective to idle state
     *
     * Operator override for degraded or stuck objectives.
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Reset context (reason, operator)
     * @returns {Object} { success: boolean, message: string }
     */
    manualReset(objectiveId: string, context?: any): any;
    /**
     * Load failure policy for objective
     */
    _loadPolicy(objective: any): any;
    /**
     * Evaluate failure policy against objective state
     *
     * Returns: { allowed: boolean, reason: string, metadata: object }
     */
    _evaluatePolicy(objective: any, policy: any, context?: {}): {
        allowed: boolean;
        reason: string;
        metadata: {
            consecutive_failures?: undefined;
            max_allowed?: undefined;
            cooldown_until?: undefined;
            remaining_seconds?: undefined;
            degraded_threshold?: undefined;
            warning?: undefined;
            policy_ref?: undefined;
            attempts_remaining?: undefined;
        };
    } | {
        allowed: boolean;
        reason: string;
        metadata: {
            consecutive_failures: any;
            max_allowed: any;
            cooldown_until?: undefined;
            remaining_seconds?: undefined;
            degraded_threshold?: undefined;
            warning?: undefined;
            policy_ref?: undefined;
            attempts_remaining?: undefined;
        };
    } | {
        allowed: boolean;
        reason: string;
        metadata: {
            cooldown_until: any;
            remaining_seconds: number;
            consecutive_failures?: undefined;
            max_allowed?: undefined;
            degraded_threshold?: undefined;
            warning?: undefined;
            policy_ref?: undefined;
            attempts_remaining?: undefined;
        };
    } | {
        allowed: boolean;
        reason: string;
        metadata: {
            consecutive_failures: any;
            degraded_threshold: any;
            warning: string;
            max_allowed?: undefined;
            cooldown_until?: undefined;
            remaining_seconds?: undefined;
            policy_ref?: undefined;
            attempts_remaining?: undefined;
        };
    } | {
        allowed: boolean;
        reason: string;
        metadata: {
            policy_ref: any;
            consecutive_failures: any;
            attempts_remaining: number;
            max_allowed?: undefined;
            cooldown_until?: undefined;
            remaining_seconds?: undefined;
            degraded_threshold?: undefined;
            warning?: undefined;
        };
    };
}
/**
 * Create reconciliation gate instance
 *
 * @param {Object} stateGraph - State graph instance
 * @param {Object} options - Gate options
 * @returns {ReconciliationGate} Gate instance
 */
export function createReconciliationGate(stateGraph: any, options?: any): ReconciliationGate;
//# sourceMappingURL=reconciliation-gate.d.ts.map