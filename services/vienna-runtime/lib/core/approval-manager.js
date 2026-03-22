/**
 * Approval Manager
 * Phase 17 Stage 1: Core Approval Infrastructure
 * 
 * Central service for approval request lifecycle management.
 */

const {
  ApprovalStatus,
  ApprovalTier,
  createApprovalRequest,
  validateApprovalRequest,
  isExpired
} = require('./approval-schema');

const {
  validateTransition,
  executeTransition,
  validatePreTransition,
  isTerminal,
  TransitionReason,
  getTransitionMetadata
} = require('./approval-state-machine');

class ApprovalManager {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Create new approval request
   * 
   * @param {Object} params - Approval request parameters
   * @returns {Promise<Object>} Created approval
   */
  async createApprovalRequest(params) {
    // Create approval object
    const approval = createApprovalRequest(params);

    // Validate schema
    validateApprovalRequest(approval);

    // Persist to State Graph
    await this.stateGraph.createApproval(approval);

    return approval;
  }

  /**
   * Get approval by ID
   * 
   * @param {string} approval_id - Approval ID
   * @returns {Promise<Object|null>} Approval object or null
   */
  async getApproval(approval_id) {
    return await this.stateGraph.getApproval(approval_id);
  }

  /**
   * Get approval by execution and step context
   * 
   * @param {string} execution_id - Execution ID
   * @param {string} step_id - Step ID
   * @returns {Promise<Object|null>} Approval object or null
   */
  async getApprovalByContext(execution_id, step_id) {
    return await this.stateGraph.getApprovalByExecutionStep(execution_id, step_id);
  }

  /**
   * List pending approvals
   * 
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of approval objects
   */
  async listPendingApprovals(filters = {}) {
    return await this.stateGraph.listApprovals({
      status: ApprovalStatus.PENDING,
      ...filters
    });
  }

  /**
   * Approve pending approval
   * 
   * @param {string} approval_id - Approval ID
   * @param {string} reviewed_by - Operator ID
   * @param {string} decision_reason - Optional explanation
   * @returns {Promise<Object>} Updated approval
   * @throws {Error} If approval not found or transition invalid
   */
  async approve(approval_id, reviewed_by, decision_reason = null) {
    const approval = await this.getApproval(approval_id);

    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND');
    }

    // Pre-transition validation
    const preCheck = validatePreTransition(approval, ApprovalStatus.APPROVED);
    if (!preCheck.valid) {
      throw new Error(`APPROVAL_TRANSITION_INVALID: ${preCheck.reason}`);
    }

    // Execute transition
    const updated = executeTransition(approval, ApprovalStatus.APPROVED, {
      reason: TransitionReason.OPERATOR_APPROVED,
      reviewed_by,
      decision_reason
    });

    // Persist updated state
    await this.stateGraph.updateApproval(approval_id, updated);

    return updated;
  }

  /**
   * Deny pending approval
   * 
   * @param {string} approval_id - Approval ID
   * @param {string} reviewed_by - Operator ID
   * @param {string} denial_reason - Explanation (required)
   * @returns {Promise<Object>} Updated approval
   * @throws {Error} If approval not found or transition invalid
   */
  async deny(approval_id, reviewed_by, denial_reason) {
    if (!denial_reason || typeof denial_reason !== 'string') {
      throw new Error('APPROVAL_DENIAL_REASON_REQUIRED');
    }

    const approval = await this.getApproval(approval_id);

    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND');
    }

    // Pre-transition validation
    const preCheck = validatePreTransition(approval, ApprovalStatus.DENIED);
    if (!preCheck.valid) {
      throw new Error(`APPROVAL_TRANSITION_INVALID: ${preCheck.reason}`);
    }

    // Execute transition
    const updated = executeTransition(approval, ApprovalStatus.DENIED, {
      reason: TransitionReason.OPERATOR_DENIED,
      reviewed_by,
      decision_reason: denial_reason
    });

    // Persist updated state
    await this.stateGraph.updateApproval(approval_id, updated);

    return updated;
  }

  /**
   * Mark approval as expired
   * 
   * @param {string} approval_id - Approval ID
   * @returns {Promise<Object>} Updated approval
   * @throws {Error} If approval not found or transition invalid
   */
  async expire(approval_id) {
    const approval = await this.getApproval(approval_id);

    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND');
    }

    // Verify actually expired
    if (!isExpired(approval)) {
      throw new Error('APPROVAL_NOT_EXPIRED');
    }

    // Execute transition
    const updated = executeTransition(approval, ApprovalStatus.EXPIRED, {
      reason: TransitionReason.TTL_EXCEEDED
    });

    // Persist updated state
    await this.stateGraph.updateApproval(approval_id, updated);

    return updated;
  }

  /**
   * Check approval status with expiry detection
   * 
   * Returns current status, with automatic expiry detection.
   * Does NOT mutate database, just returns effective status.
   * 
   * @param {Object} approval - Approval object
   * @returns {string} Effective status
   */
  getEffectiveStatus(approval) {
    // If already terminal, return as-is
    if (isTerminal(approval.status)) {
      return approval.status;
    }

    // If pending but expired, return expired (read-time detection)
    if (approval.status === ApprovalStatus.PENDING && isExpired(approval)) {
      return ApprovalStatus.EXPIRED;
    }

    return approval.status;
  }

  /**
   * Sweep expired approvals
   * 
   * Batch operation to mark expired pending approvals as expired.
   * Should be called periodically by background service.
   * 
   * @returns {Promise<number>} Number of approvals expired
   */
  async sweepExpired() {
    const pending = await this.listPendingApprovals();
    let expiredCount = 0;

    for (const approval of pending) {
      if (isExpired(approval)) {
        try {
          await this.expire(approval.approval_id);
          expiredCount++;
        } catch (err) {
          // Log but continue sweep
          console.error(`Failed to expire approval ${approval.approval_id}:`, err.message);
        }
      }
    }

    return expiredCount;
  }

  /**
   * Validate transition (public interface)
   * 
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @returns {boolean} True if valid
   * @throws {Error} If transition invalid
   */
  validateTransition(fromStatus, toStatus) {
    return validateTransition(fromStatus, toStatus);
  }
}

module.exports = ApprovalManager;
