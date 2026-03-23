/**
 * Approval Resolution Handler
 * Phase 17 Stage 3: Execution Resumption
 * 
 * Handles approval resolution and determines execution resumption path.
 * 
 * Core invariant:
 * Approval resolution is a governance checkpoint, not a bypass opportunity.
 */

const { ApprovalStatus, isExpired } = require('./approval-schema');

/**
 * Resolution outcomes
 */
const ResolutionOutcome = {
  APPROVED: 'approved',           // Continue to warrant/execution
  DENIED: 'denied',              // Stop permanently
  EXPIRED: 'expired',            // Fail closed, no retry
  MISSING: 'missing',            // Fail closed, integrity violation
  MALFORMED: 'malformed'         // Fail closed, data corruption
};

/**
 * Resolve approval status and determine execution path
 * 
 * @param {Object} approval - Approval object
 * @param {Object} step - Plan step
 * @param {Object} context - Execution context
 * @returns {Object} Resolution result
 */
function resolveApprovalStatus(approval, step, context) {
  // Missing approval (integrity violation)
  if (!approval) {
    return {
      outcome: ResolutionOutcome.MISSING,
      can_proceed: false,
      reason: 'Approval record missing',
      metadata: {
        step_id: step.step_id,
        execution_id: context.execution_id
      }
    };
  }

  // Malformed approval (data corruption)
  if (!approval.approval_id || !approval.status || !approval.tier) {
    return {
      outcome: ResolutionOutcome.MALFORMED,
      can_proceed: false,
      reason: 'Approval record malformed',
      metadata: {
        approval_id: approval.approval_id,
        step_id: step.step_id
      }
    };
  }

  // Context mismatch (wrong approval for this step)
  if (approval.execution_id !== context.execution_id || 
      approval.step_id !== step.step_id) {
    return {
      outcome: ResolutionOutcome.MALFORMED,
      can_proceed: false,
      reason: 'Approval context mismatch',
      metadata: {
        approval_id: approval.approval_id,
        expected_execution: context.execution_id,
        actual_execution: approval.execution_id,
        expected_step: step.step_id,
        actual_step: approval.step_id
      }
    };
  }

  // Expired approval (TTL exceeded)
  if (isExpired(approval)) {
    return {
      outcome: ResolutionOutcome.EXPIRED,
      can_proceed: false,
      reason: 'Approval expired',
      metadata: {
        approval_id: approval.approval_id,
        expires_at: approval.expires_at,
        resolved_at: new Date().toISOString()
      }
    };
  }

  // Status-based resolution
  switch (approval.status) {
    case ApprovalStatus.APPROVED:
      return {
        outcome: ResolutionOutcome.APPROVED,
        can_proceed: true,
        reason: 'Approval granted',
        metadata: {
          approval_id: approval.approval_id,
          reviewed_by: approval.reviewed_by,
          reviewed_at: approval.reviewed_at,
          decision_reason: approval.decision_reason
        }
      };

    case ApprovalStatus.DENIED:
      return {
        outcome: ResolutionOutcome.DENIED,
        can_proceed: false,
        reason: approval.decision_reason || 'Approval denied',
        metadata: {
          approval_id: approval.approval_id,
          reviewed_by: approval.reviewed_by,
          reviewed_at: approval.reviewed_at,
          decision_reason: approval.decision_reason
        }
      };

    case ApprovalStatus.PENDING:
      // Still pending — should not reach here if polling correctly
      return {
        outcome: ResolutionOutcome.MISSING,
        can_proceed: false,
        reason: 'Approval still pending',
        metadata: {
          approval_id: approval.approval_id,
          status: approval.status
        }
      };

    default:
      // Unknown status (data corruption)
      return {
        outcome: ResolutionOutcome.MALFORMED,
        can_proceed: false,
        reason: `Unknown approval status: ${approval.status}`,
        metadata: {
          approval_id: approval.approval_id,
          status: approval.status
        }
      };
  }
}

/**
 * Validate approval before resumption
 * 
 * Secondary validation before continuing to warrant/execution.
 * Protects against race conditions and state corruption.
 * 
 * @param {Object} approval - Approval object
 * @param {Object} step - Plan step
 * @param {Object} context - Execution context
 * @returns {Object} Validation result
 */
function validateApprovalForResumption(approval, step, context) {
  // Revalidate expiry (time may have passed since resolution)
  if (isExpired(approval)) {
    return {
      valid: false,
      reason: 'Approval expired between resolution and execution',
      metadata: {
        approval_id: approval.approval_id,
        expires_at: approval.expires_at,
        current_time: new Date().toISOString()
      }
    };
  }

  // Revalidate status (should still be APPROVED)
  if (approval.status !== ApprovalStatus.APPROVED) {
    return {
      valid: false,
      reason: 'Approval status changed between resolution and execution',
      metadata: {
        approval_id: approval.approval_id,
        expected_status: ApprovalStatus.APPROVED,
        actual_status: approval.status
      }
    };
  }

  // Revalidate context match
  if (approval.execution_id !== context.execution_id ||
      approval.step_id !== step.step_id) {
    return {
      valid: false,
      reason: 'Approval context changed between resolution and execution',
      metadata: {
        approval_id: approval.approval_id
      }
    };
  }

  return {
    valid: true,
    reason: 'Approval valid for resumption'
  };
}

/**
 * Determine ledger event type from resolution outcome
 * 
 * @param {string} outcome - ResolutionOutcome
 * @returns {string} Ledger event type
 */
function getLedgerEventType(outcome) {
  switch (outcome) {
    case ResolutionOutcome.APPROVED:
      return 'approval_resolved_approved';
    case ResolutionOutcome.DENIED:
      return 'approval_resolved_denied';
    case ResolutionOutcome.EXPIRED:
      return 'approval_resolved_expired';
    case ResolutionOutcome.MISSING:
      return 'approval_resolved_missing';
    case ResolutionOutcome.MALFORMED:
      return 'approval_resolved_malformed';
    default:
      return 'approval_resolved_unknown';
  }
}

module.exports = {
  ResolutionOutcome,
  resolveApprovalStatus,
  validateApprovalForResumption,
  getLedgerEventType
};
