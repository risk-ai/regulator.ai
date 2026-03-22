export namespace ApprovalStatus {
    let NOT_REQUIRED: string;
    let PENDING: string;
    let APPROVED: string;
    let DENIED: string;
    let EXPIRED: string;
}
export namespace ApprovalTier {
    let T0: string;
    let T1: string;
    let T2: string;
}
/**
 * Create approval request object
 *
 * @param {Object} params
 * @param {string} params.execution_id - Links to execution ledger
 * @param {string} params.plan_id - Links to plan
 * @param {string} params.step_id - Which step requires approval
 * @param {string} params.intent_id - Original intent
 * @param {string} params.required_tier - 'T1' or 'T2'
 * @param {string} params.required_by - Role/authority level
 * @param {string} params.requested_by - System component (e.g., 'plan-executor')
 * @param {number} params.ttl_seconds - Time to live in seconds
 * @param {string} params.action_summary - Human-readable action
 * @param {string} params.risk_summary - Why approval is required
 * @param {string[]} params.target_entities - What will be affected
 * @param {number} params.estimated_duration_ms - Expected execution time
 * @param {boolean} params.rollback_available - Can this be undone
 * @returns {Object} ApprovalRequest object
 */
export function createApprovalRequest(params: {
    execution_id: string;
    plan_id: string;
    step_id: string;
    intent_id: string;
    required_tier: string;
    required_by: string;
    requested_by: string;
    ttl_seconds: number;
    action_summary: string;
    risk_summary: string;
    target_entities: string[];
    estimated_duration_ms: number;
    rollback_available: boolean;
}): any;
/**
 * Validate approval request structure
 *
 * @param {Object} approval - Approval request object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateApprovalRequest(approval: any): boolean;
/**
 * Check if approval has expired
 *
 * @param {Object} approval - Approval request object
 * @returns {boolean} True if expired
 */
export function isExpired(approval: any): boolean;
/**
 * Check if approval status is terminal
 *
 * @param {string} status - Approval status
 * @returns {boolean} True if terminal
 */
export function isTerminalState(status: string): boolean;
/**
 * Check if approval grants execution permission
 *
 * @param {string} status - Approval status
 * @returns {boolean} True if granted
 */
export function isApprovalGranted(status: string): boolean;
/**
 * Check if approval blocks execution
 *
 * @param {string} status - Approval status
 * @returns {boolean} True if blocked
 */
export function isApprovalBlocked(status: string): boolean;
/**
 * Check if approval requires operator action
 *
 * @param {string} status - Approval status
 * @returns {boolean} True if pending
 */
export function requiresOperatorAction(status: string): boolean;
/**
 * Format approval for operator display
 *
 * @param {Object} approval - Approval request object
 * @returns {string} Human-readable approval summary
 */
export function formatApprovalSummary(approval: any): string;
//# sourceMappingURL=approval-schema.d.ts.map