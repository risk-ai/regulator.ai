export namespace ReconciliationStatus {
    let IDLE: string;
    let RECONCILING: string;
    let COOLDOWN: string;
    let DEGRADED: string;
    let SAFE_MODE: string;
}
export namespace TransitionReason {
    let DRIFT_DETECTED: string;
    let COOLDOWN_EXPIRED: string;
    let VERIFICATION_SUCCESS: string;
    let PASSIVE_RECOVERY: string;
    let EXECUTION_FAILED: string;
    let VERIFICATION_FAILED: string;
    let TIMEOUT: string;
    let ATTEMPTS_EXHAUSTED: string;
    let MANUAL_RESET: string;
    let MANUAL_ESCALATION: string;
    let SAFE_MODE_ENTERED: string;
    let SAFE_MODE_RELEASED: string;
    let STALE_RECONCILIATION: string;
}
/**
 * Transition Table
 *
 * Defines valid state transitions and their reasons.
 * Format: { from: { to: [allowed_reasons] } }
 */
export const TransitionTable: {
    [ReconciliationStatus.IDLE]: {
        [ReconciliationStatus.RECONCILING]: string[];
        [ReconciliationStatus.SAFE_MODE]: string[];
        [ReconciliationStatus.DEGRADED]: string[];
    };
    [ReconciliationStatus.RECONCILING]: {
        [ReconciliationStatus.IDLE]: string[];
        [ReconciliationStatus.COOLDOWN]: string[];
        [ReconciliationStatus.DEGRADED]: string[];
        [ReconciliationStatus.SAFE_MODE]: string[];
    };
    [ReconciliationStatus.COOLDOWN]: {
        [ReconciliationStatus.RECONCILING]: string[];
        [ReconciliationStatus.IDLE]: string[];
        [ReconciliationStatus.DEGRADED]: string[];
        [ReconciliationStatus.SAFE_MODE]: string[];
    };
    [ReconciliationStatus.DEGRADED]: {
        [ReconciliationStatus.IDLE]: string[];
        [ReconciliationStatus.SAFE_MODE]: string[];
    };
    [ReconciliationStatus.SAFE_MODE]: {
        [ReconciliationStatus.IDLE]: string[];
        [ReconciliationStatus.DEGRADED]: string[];
    };
};
export namespace DEFAULT_POLICY {
    let max_reconciliation_attempts: number;
    let cooldown_duration_seconds: number;
    let execution_timeout_seconds: number;
    let verification_timeout_seconds: number;
    let stale_reconciliation_timeout_seconds: number;
    let degraded_requires_manual_reset: boolean;
    let safe_mode_release_conservative: boolean;
}
/**
 * Check if a transition is valid
 *
 * @param {string} fromStatus - Current reconciliation status
 * @param {string} toStatus - Target reconciliation status
 * @param {string} reason - Transition reason
 * @returns {boolean} True if transition is allowed
 */
export function canTransition(fromStatus: string, toStatus: string, reason: string): boolean;
/**
 * Get allowed next states for a given status
 *
 * @param {string} status - Current reconciliation status
 * @returns {string[]} Array of allowed next statuses
 */
export function getAllowedNextStates(status: string): string[];
/**
 * Get allowed reasons for a transition
 *
 * @param {string} fromStatus - Current reconciliation status
 * @param {string} toStatus - Target reconciliation status
 * @returns {string[]} Array of allowed reasons
 */
export function getAllowedReasons(fromStatus: string, toStatus: string): string[];
/**
 * Apply a state transition
 *
 * Returns an update object with fields to be written to the objective.
 * Does NOT perform the database write itself.
 *
 * @param {object} objective - Current objective state
 * @param {string} toStatus - Target reconciliation status
 * @param {string} reason - Transition reason
 * @param {object} context - Additional context (execution_id, error, etc.)
 * @returns {object} Update object with reconciliation fields
 * @throws {Error} If transition is invalid
 */
export function applyTransition(objective: object, toStatus: string, reason: string, context?: object): object;
/**
 * Check if objective is eligible for reconciliation
 *
 * @param {object} objective - Objective state
 * @param {object} options - Check options (global_safe_mode, current_time)
 * @returns {object} { eligible: boolean, reason: string }
 */
export function isEligibleForReconciliation(objective: object, options?: object): object;
/**
 * Check if objective is in a terminal state (requires intervention)
 *
 * @param {object} objective - Objective state
 * @returns {boolean} True if terminal
 */
export function isTerminalState(objective: object): boolean;
/**
 * Check if objective is currently remediating
 *
 * @param {object} objective - Objective state
 * @returns {boolean} True if remediating
 */
export function isRemediating(objective: object): boolean;
/**
 * Check if objective is in cooldown
 *
 * @param {object} objective - Objective state
 * @param {string} current_time - Current time (ISO string)
 * @returns {boolean} True if in active cooldown
 */
export function isInCooldown(objective: object, current_time?: string): boolean;
/**
 * Check if objective has retry attempts remaining
 *
 * @param {object} objective - Objective state
 * @param {object} policy - Reconciliation policy
 * @returns {boolean} True if attempts remain
 */
export function hasAttemptsRemaining(objective: object, policy?: object): boolean;
/**
 * Check if reconciliation is stale (hung)
 *
 * @param {object} objective - Objective state
 * @param {object} policy - Reconciliation policy
 * @param {string} current_time - Current time (ISO string)
 * @returns {boolean} True if stale
 */
export function isStaleReconciliation(objective: object, policy?: object, current_time?: string): boolean;
/**
 * Determine next status after failure
 *
 * @param {object} objective - Current objective state
 * @param {object} policy - Reconciliation policy
 * @returns {string} Next status (cooldown or degraded)
 */
export function determineFailureStatus(objective: object, policy?: object): string;
/**
 * Get reconciliation state summary for operator visibility
 *
 * @param {object} objective - Objective state
 * @returns {object} Human-readable summary
 */
export function getReconciliationSummary(objective: object): object;
//# sourceMappingURL=reconciliation-state-machine.d.ts.map