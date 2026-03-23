/**
 * Approval Schema
 * Phase 17 Stage 1: Core Approval Infrastructure
 * 
 * Defines approval request structure and validation rules.
 */

const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

/**
 * Approval status states
 */
const ApprovalStatus = {
  NOT_REQUIRED: 'not_required',  // T0 actions (pseudo-state, not persisted)
  PENDING: 'pending',            // Awaiting operator decision
  APPROVED: 'approved',          // Operator approved
  DENIED: 'denied',              // Operator denied
  EXPIRED: 'expired'             // TTL exceeded before decision
};

/**
 * Required approval tiers
 */
const ApprovalTier = {
  T0: 'T0',  // No approval required
  T1: 'T1',  // Operator approval required
  T2: 'T2'   // Elevated approval required
};

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
function createApprovalRequest(params) {
  const {
    execution_id,
    plan_id,
    step_id,
    intent_id,
    required_tier,
    required_by,
    requested_by,
    ttl_seconds = 3600,  // Default 1 hour
    action_summary,
    risk_summary,
    target_entities,
    estimated_duration_ms,
    rollback_available = false
  } = params;

  // Validation
  if (!execution_id || typeof execution_id !== 'string') {
    throw new Error('APPROVAL_INVALID_EXECUTION_ID');
  }
  if (!plan_id || typeof plan_id !== 'string') {
    throw new Error('APPROVAL_INVALID_PLAN_ID');
  }
  if (!step_id || typeof step_id !== 'string') {
    throw new Error('APPROVAL_INVALID_STEP_ID');
  }
  if (!intent_id || typeof intent_id !== 'string') {
    throw new Error('APPROVAL_INVALID_INTENT_ID');
  }
  if (![ApprovalTier.T1, ApprovalTier.T2].includes(required_tier)) {
    throw new Error(`APPROVAL_INVALID_TIER: ${required_tier}`);
  }
  if (!required_by || typeof required_by !== 'string') {
    throw new Error('APPROVAL_INVALID_REQUIRED_BY');
  }
  if (!requested_by || typeof requested_by !== 'string') {
    throw new Error('APPROVAL_INVALID_REQUESTED_BY');
  }
  if (!action_summary || typeof action_summary !== 'string') {
    throw new Error('APPROVAL_INVALID_ACTION_SUMMARY');
  }
  if (!risk_summary || typeof risk_summary !== 'string') {
    throw new Error('APPROVAL_INVALID_RISK_SUMMARY');
  }
  if (!Array.isArray(target_entities) || target_entities.length === 0) {
    throw new Error('APPROVAL_INVALID_TARGET_ENTITIES');
  }
  if (typeof estimated_duration_ms !== 'number' || estimated_duration_ms < 0) {
    throw new Error('APPROVAL_INVALID_ESTIMATED_DURATION');
  }
  if (typeof rollback_available !== 'boolean') {
    throw new Error('APPROVAL_INVALID_ROLLBACK_FLAG');
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (ttl_seconds * 1000)).toISOString();

  return {
    approval_id: uuidv4(),
    execution_id,
    plan_id,
    step_id,
    intent_id,
    
    required_tier,
    required_by,
    
    status: ApprovalStatus.PENDING,
    
    requested_at: now,
    requested_by,
    expires_at: expiresAt,
    
    reviewed_by: null,
    reviewed_at: null,
    decision_reason: null,
    
    action_summary,
    risk_summary,
    target_entities,
    estimated_duration_ms,
    rollback_available,
    
    created_at: now,
    updated_at: now
  };
}

/**
 * Validate approval request structure
 * 
 * @param {Object} approval - Approval request object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateApprovalRequest(approval) {
  if (!approval || typeof approval !== 'object') {
    throw new Error('APPROVAL_INVALID_OBJECT');
  }

  const requiredFields = [
    'approval_id', 'execution_id', 'plan_id', 'step_id', 'intent_id',
    'required_tier', 'required_by', 'status', 'requested_at', 'requested_by',
    'expires_at', 'action_summary', 'risk_summary', 'target_entities',
    'estimated_duration_ms', 'rollback_available', 'created_at', 'updated_at'
  ];

  for (const field of requiredFields) {
    if (!(field in approval)) {
      throw new Error(`APPROVAL_MISSING_FIELD: ${field}`);
    }
  }

  // Status validation
  const validStatuses = Object.values(ApprovalStatus).filter(s => s !== ApprovalStatus.NOT_REQUIRED);
  if (!validStatuses.includes(approval.status)) {
    throw new Error(`APPROVAL_INVALID_STATUS: ${approval.status}`);
  }

  // Tier validation
  if (![ApprovalTier.T1, ApprovalTier.T2].includes(approval.required_tier)) {
    throw new Error(`APPROVAL_INVALID_TIER: ${approval.required_tier}`);
  }

  // Target entities validation
  if (!Array.isArray(approval.target_entities) || approval.target_entities.length === 0) {
    throw new Error('APPROVAL_INVALID_TARGET_ENTITIES');
  }

  return true;
}

/**
 * Check if approval has expired
 * 
 * @param {Object} approval - Approval request object
 * @returns {boolean} True if expired
 */
function isExpired(approval) {
  return new Date(approval.expires_at) < new Date();
}

/**
 * Check if approval status is terminal
 * 
 * @param {string} status - Approval status
 * @returns {boolean} True if terminal
 */
function isTerminalState(status) {
  return [
    ApprovalStatus.NOT_REQUIRED,
    ApprovalStatus.APPROVED,
    ApprovalStatus.DENIED,
    ApprovalStatus.EXPIRED
  ].includes(status);
}

/**
 * Check if approval grants execution permission
 * 
 * @param {string} status - Approval status
 * @returns {boolean} True if granted
 */
function isApprovalGranted(status) {
  return status === ApprovalStatus.APPROVED || status === ApprovalStatus.NOT_REQUIRED;
}

/**
 * Check if approval blocks execution
 * 
 * @param {string} status - Approval status
 * @returns {boolean} True if blocked
 */
function isApprovalBlocked(status) {
  return status === ApprovalStatus.DENIED || status === ApprovalStatus.EXPIRED;
}

/**
 * Check if approval requires operator action
 * 
 * @param {string} status - Approval status
 * @returns {boolean} True if pending
 */
function requiresOperatorAction(status) {
  return status === ApprovalStatus.PENDING;
}

/**
 * Format approval for operator display
 * 
 * @param {Object} approval - Approval request object
 * @returns {string} Human-readable approval summary
 */
function formatApprovalSummary(approval) {
  const timeUntilExpiry = Math.floor((new Date(approval.expires_at) - new Date()) / 1000 / 60);
  const expiryMessage = timeUntilExpiry > 0
    ? `Expires in ${timeUntilExpiry} minutes`
    : 'EXPIRED';

  return `
Approval Request #${approval.approval_id.substring(0, 8)}

Action: ${approval.action_summary}
Risk Tier: ${approval.required_tier}
Reason: ${approval.risk_summary}

Targets:
${approval.target_entities.map(t => `- ${t}`).join('\n')}

Estimated Duration: ${Math.floor(approval.estimated_duration_ms / 1000)} seconds
Rollback Available: ${approval.rollback_available ? 'Yes' : 'No'}

Requested: ${approval.requested_at}
${expiryMessage}
  `.trim();
}

module.exports = {
  ApprovalStatus,
  ApprovalTier,
  createApprovalRequest,
  validateApprovalRequest,
  isExpired,
  isTerminalState,
  isApprovalGranted,
  isApprovalBlocked,
  requiresOperatorAction,
  formatApprovalSummary
};
