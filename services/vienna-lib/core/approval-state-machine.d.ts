/**
 * Allowed state transitions
 *
 * Each status maps to an array of allowed next states.
 * Terminal states have empty arrays.
 */
export const ApprovalTransitions: {
    [ApprovalStatus.NOT_REQUIRED]: undefined[];
    [ApprovalStatus.PENDING]: string[];
    [ApprovalStatus.APPROVED]: undefined[];
    [ApprovalStatus.DENIED]: undefined[];
    [ApprovalStatus.EXPIRED]: undefined[];
};
export namespace TransitionReason {
    let OPERATOR_APPROVED: string;
    let OPERATOR_DENIED: string;
    let TTL_EXCEEDED: string;
    let SYSTEM_ERROR: string;
}
/**
 * Validate state transition
 *
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} True if transition allowed
 * @throws {Error} If transition invalid
 */
export function validateTransition(fromStatus: string, toStatus: string): boolean;
/**
 * Execute state transition with validation
 *
 * @param {Object} approval - Current approval object
 * @param {string} toStatus - Target status
 * @param {Object} transitionData - Additional transition data
 * @param {string} transitionData.reason - Transition reason
 * @param {string} transitionData.reviewed_by - Operator ID (for approve/deny)
 * @param {string} transitionData.decision_reason - Explanation (optional)
 * @returns {Object} Updated approval object
 * @throws {Error} If transition invalid
 */
export function executeTransition(approval: any, toStatus: string, transitionData?: {
    reason: string;
    reviewed_by: string;
    decision_reason: string;
}): any;
/**
 * Validate approval state before transition
 *
 * Pre-transition checks (e.g., expiry, terminal state)
 *
 * @param {Object} approval - Approval object
 * @param {string} toStatus - Target status
 * @returns {Object} Validation result
 */
export function validatePreTransition(approval: any, toStatus: string): any;
/**
 * Check if state is terminal
 *
 * @param {string} status - Approval status
 * @returns {boolean} True if terminal
 */
export function isTerminal(status: string): boolean;
/**
 * Get allowed next states
 *
 * @param {string} status - Current status
 * @returns {string[]} Array of allowed next states
 */
export function getAllowedNextStates(status: string): string[];
/**
 * Get transition metadata for audit trail
 *
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {Object} transitionData - Transition data
 * @returns {Object} Metadata object
 */
export function getTransitionMetadata(fromStatus: string, toStatus: string, transitionData?: any): any;
export namespace StateValidators {
    export { isTerminal };
    export function isGranted(status: any): boolean;
    export function isBlocked(status: any): boolean;
    export function isPending(status: any): boolean;
}
import { ApprovalStatus } from "./approval-schema";
//# sourceMappingURL=approval-state-machine.d.ts.map