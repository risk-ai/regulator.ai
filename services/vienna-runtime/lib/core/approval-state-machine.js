/**
 * Approval State Machine
 * Phase 17 Stage 1: Core Approval Infrastructure
 * 
 * Enforces deterministic approval state transitions.
 */

const { ApprovalStatus } = require('./approval-schema');

/**
 * Allowed state transitions
 * 
 * Each status maps to an array of allowed next states.
 * Terminal states have empty arrays.
 */
const ApprovalTransitions = {
  [ApprovalStatus.NOT_REQUIRED]: [],  // Terminal (pseudo-state)
  [ApprovalStatus.PENDING]: [
    ApprovalStatus.APPROVED,
    ApprovalStatus.DENIED,
    ApprovalStatus.EXPIRED
  ],
  [ApprovalStatus.APPROVED]: [],  // Terminal
  [ApprovalStatus.DENIED]: [],    // Terminal
  [ApprovalStatus.EXPIRED]: []    // Terminal
};

/**
 * Transition reasons (for audit trail)
 */
const TransitionReason = {
  OPERATOR_APPROVED: 'operator_approved',
  OPERATOR_DENIED: 'operator_denied',
  TTL_EXCEEDED: 'ttl_exceeded',
  SYSTEM_ERROR: 'system_error'
};

/**
 * Validate state transition
 * 
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} True if transition allowed
 * @throws {Error} If transition invalid
 */
function validateTransition(fromStatus, toStatus) {
  if (!(fromStatus in ApprovalTransitions)) {
    throw new Error(`APPROVAL_INVALID_STATE: ${fromStatus}`);
  }

  const allowedTransitions = ApprovalTransitions[fromStatus];

  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(`APPROVAL_INVALID_TRANSITION: ${fromStatus} -> ${toStatus}`);
  }

  return true;
}

/**
 * Check if state is terminal
 * 
 * @param {string} status - Approval status
 * @returns {boolean} True if terminal
 */
function isTerminal(status) {
  return ApprovalTransitions[status]?.length === 0;
}

/**
 * Get allowed next states
 * 
 * @param {string} status - Current status
 * @returns {string[]} Array of allowed next states
 */
function getAllowedNextStates(status) {
  if (!(status in ApprovalTransitions)) {
    throw new Error(`APPROVAL_INVALID_STATE: ${status}`);
  }
  return ApprovalTransitions[status];
}

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
function executeTransition(approval, toStatus, transitionData = {}) {
  const { reason, reviewed_by, decision_reason } = transitionData;

  // Validate transition
  validateTransition(approval.status, toStatus);

  // Build updated approval object
  const updated = {
    ...approval,
    status: toStatus,
    updated_at: new Date().toISOString()
  };

  // Add transition-specific fields
  if (toStatus === ApprovalStatus.APPROVED || toStatus === ApprovalStatus.DENIED) {
    if (!reviewed_by) {
      throw new Error('APPROVAL_MISSING_REVIEWER');
    }
    updated.reviewed_by = reviewed_by;
    updated.reviewed_at = new Date().toISOString();
    updated.decision_reason = decision_reason || null;
  }

  return updated;
}

/**
 * Validate approval state before transition
 * 
 * Pre-transition checks (e.g., expiry, terminal state)
 * 
 * @param {Object} approval - Approval object
 * @param {string} toStatus - Target status
 * @returns {Object} Validation result
 */
function validatePreTransition(approval, toStatus) {
  // Cannot transition from terminal states
  if (isTerminal(approval.status)) {
    return {
      valid: false,
      reason: `Cannot transition from terminal state: ${approval.status}`
    };
  }

  // Cannot approve/deny expired approval
  if ((toStatus === ApprovalStatus.APPROVED || toStatus === ApprovalStatus.DENIED) &&
      new Date(approval.expires_at) < new Date()) {
    return {
      valid: false,
      reason: 'Cannot approve/deny expired approval'
    };
  }

  return { valid: true };
}

/**
 * Get transition metadata for audit trail
 * 
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {Object} transitionData - Transition data
 * @returns {Object} Metadata object
 */
function getTransitionMetadata(fromStatus, toStatus, transitionData = {}) {
  return {
    from_status: fromStatus,
    to_status: toStatus,
    reason: transitionData.reason || 'unknown',
    reviewed_by: transitionData.reviewed_by || null,
    decision_reason: transitionData.decision_reason || null,
    transitioned_at: new Date().toISOString()
  };
}

/**
 * State validators (for gate logic)
 */
const StateValidators = {
  isTerminal,
  
  isGranted(status) {
    return status === ApprovalStatus.APPROVED || status === ApprovalStatus.NOT_REQUIRED;
  },
  
  isBlocked(status) {
    return status === ApprovalStatus.DENIED || status === ApprovalStatus.EXPIRED;
  },
  
  isPending(status) {
    return status === ApprovalStatus.PENDING;
  }
};

module.exports = {
  ApprovalTransitions,
  TransitionReason,
  validateTransition,
  executeTransition,
  validatePreTransition,
  isTerminal,
  getAllowedNextStates,
  getTransitionMetadata,
  StateValidators
};
