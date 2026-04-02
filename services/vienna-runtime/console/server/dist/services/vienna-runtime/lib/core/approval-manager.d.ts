export = ApprovalManager;
declare class ApprovalManager {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Create new approval request
     *
     * @param {Object} params - Approval request parameters
     * @returns {Promise<Object>} Created approval
     */
    createApprovalRequest(params: any): Promise<any>;
    /**
     * Get approval by ID
     *
     * @param {string} approval_id - Approval ID
     * @returns {Promise<Object|null>} Approval object or null
     */
    getApproval(approval_id: string): Promise<any | null>;
    /**
     * Get approval by execution and step context
     *
     * @param {string} execution_id - Execution ID
     * @param {string} step_id - Step ID
     * @returns {Promise<Object|null>} Approval object or null
     */
    getApprovalByContext(execution_id: string, step_id: string): Promise<any | null>;
    /**
     * List pending approvals
     *
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Array of approval objects
     */
    listPendingApprovals(filters?: any): Promise<any[]>;
    /**
     * Approve pending approval
     *
     * @param {string} approval_id - Approval ID
     * @param {string} reviewed_by - Operator ID
     * @param {string} decision_reason - Optional explanation
     * @returns {Promise<Object>} Updated approval
     * @throws {Error} If approval not found or transition invalid
     */
    approve(approval_id: string, reviewed_by: string, decision_reason?: string): Promise<any>;
    /**
     * Deny pending approval
     *
     * @param {string} approval_id - Approval ID
     * @param {string} reviewed_by - Operator ID
     * @param {string} denial_reason - Explanation (required)
     * @returns {Promise<Object>} Updated approval
     * @throws {Error} If approval not found or transition invalid
     */
    deny(approval_id: string, reviewed_by: string, denial_reason: string): Promise<any>;
    /**
     * Mark approval as expired
     *
     * @param {string} approval_id - Approval ID
     * @returns {Promise<Object>} Updated approval
     * @throws {Error} If approval not found or transition invalid
     */
    expire(approval_id: string): Promise<any>;
    /**
     * Check approval status with expiry detection
     *
     * Returns current status, with automatic expiry detection.
     * Does NOT mutate database, just returns effective status.
     *
     * @param {Object} approval - Approval object
     * @returns {string} Effective status
     */
    getEffectiveStatus(approval: any): string;
    /**
     * Sweep expired approvals
     *
     * Batch operation to mark expired pending approvals as expired.
     * Should be called periodically by background service.
     *
     * @returns {Promise<number>} Number of approvals expired
     */
    sweepExpired(): Promise<number>;
    /**
     * Validate transition (public interface)
     *
     * @param {string} fromStatus - Current status
     * @param {string} toStatus - Target status
     * @returns {boolean} True if valid
     * @throws {Error} If transition invalid
     */
    validateTransition(fromStatus: string, toStatus: string): boolean;
}
//# sourceMappingURL=approval-manager.d.ts.map