/**
 * Approval Requirement Normalizer
 * Phase 17 Stage 2: Policy Integration
 * 
 * Central determination of approval requirement from policy decision.
 * 
 * Core Invariant:
 * All approval requirement decisions must be deterministic and fail-closed.
 * Ambiguous or missing approval metadata → DENY execution.
 */

const { DECISION_TYPES } = require('./policy-schema');
const { ApprovalTier } = require('./approval-schema');

/**
 * Approval requirement result
 * 
 * @typedef {Object} ApprovalRequirement
 * @property {boolean} required - Whether approval is required
 * @property {string|null} tier - Approval tier (T0|T1|T2|null)
 * @property {string} reason - Why approval is/isn't required
 * @property {number|null} ttl - TTL in seconds (null = use default)
 * @property {boolean} fail_closed - Whether requirement was fail-closed due to ambiguity
 */

/**
 * Determine approval requirement from policy decision
 * 
 * Maps policy decision → normalized approval requirement.
 * 
 * Decision logic:
 * - T0 risk tier → no approval
 * - T1 risk tier → approval required (tier=T1)
 * - T2 risk tier → approval required (tier=T2)
 * - policy decision = REQUIRE_APPROVAL → approval required
 * - policy requirements.approval_required = true → approval required
 * - ambiguous tier with approval required → FAIL CLOSED
 * - missing approval metadata when approval required → FAIL CLOSED
 * 
 * @param {Object} policyDecision - Policy decision object
 * @param {Object} stepContext - Step context (risk_tier, action, target_id)
 * @returns {ApprovalRequirement}
 */
function determineApprovalRequirement(policyDecision, stepContext = {}) {
  const riskTier = stepContext.risk_tier || 'T0';
  const policyDecision_type = policyDecision.decision;
  const policyRequirements = policyDecision.requirements || {};

  // ============================================================
  // RULE 1: Check if policy explicitly requires approval
  // ============================================================
  const approvalRequiredByPolicy = 
    policyDecision_type === DECISION_TYPES.REQUIRE_APPROVAL ||
    policyRequirements.approval_required === true;

  // ============================================================
  // RULE 2: T0 → No approval UNLESS policy explicitly requires it
  // ============================================================
  if (riskTier === 'T0' && !approvalRequiredByPolicy) {
    return {
      required: false,
      tier: null,
      reason: 'T0 actions do not require approval',
      ttl: null,
      fail_closed: false
    };
  }

  if (!approvalRequiredByPolicy && riskTier === 'T1') {
    // T1 but policy doesn't require approval → require approval (conservative)
    return {
      required: true,
      tier: ApprovalTier.T1,
      reason: 'T1 actions require approval by default',
      ttl: 3600, // 1 hour default for T1
      fail_closed: false
    };
  }

  if (!approvalRequiredByPolicy && riskTier === 'T2') {
    // T2 but policy doesn't require approval → require approval (conservative)
    return {
      required: true,
      tier: ApprovalTier.T2,
      reason: 'T2 actions require approval by default',
      ttl: 1800, // 30 minutes default for T2
      fail_closed: false
    };
  }

  if (!approvalRequiredByPolicy) {
    // Policy doesn't require approval and not T1/T2 → no approval
    return {
      required: false,
      tier: null,
      reason: 'Policy does not require approval',
      ttl: null,
      fail_closed: false
    };
  }

  // ============================================================
  // RULE 3: Approval required — determine tier
  // ============================================================
  
  // Extract tier from policy or step context
  let tier = null;

  // Priority: explicit policy tier > step risk_tier
  if (policyRequirements.approval_tier) {
    tier = policyRequirements.approval_tier;
  } else if (riskTier === 'T1' || riskTier === 'T2') {
    tier = riskTier;
  }

  // ============================================================
  // FAIL CLOSED: Missing or ambiguous tier
  // ============================================================
  if (!tier || !Object.values(ApprovalTier).includes(tier)) {
    return {
      required: true,
      tier: ApprovalTier.T2, // Fail to highest tier
      reason: 'FAIL_CLOSED: Approval required but tier ambiguous or missing',
      ttl: 1800, // Conservative TTL
      fail_closed: true
    };
  }

  // ============================================================
  // SUCCESS: Valid approval requirement
  // ============================================================
  
  const ttl = _determineTTL(tier, policyRequirements);

  return {
    required: true,
    tier,
    reason: `Approval required: ${policyDecision_type}, risk_tier=${riskTier}`,
    ttl,
    fail_closed: false
  };
}

/**
 * Determine TTL based on tier and policy requirements
 * 
 * @private
 * @param {string} tier - Approval tier
 * @param {Object} policyRequirements - Policy requirements
 * @returns {number} TTL in seconds
 */
function _determineTTL(tier, policyRequirements) {
  // Explicit policy TTL takes precedence
  if (policyRequirements.approval_ttl_seconds) {
    return policyRequirements.approval_ttl_seconds;
  }

  // Default TTL by tier
  switch (tier) {
    case ApprovalTier.T0:
      return null; // T0 should not require approval, but if it does, no TTL
    case ApprovalTier.T1:
      return 3600; // 1 hour
    case ApprovalTier.T2:
      return 1800; // 30 minutes
    default:
      return 1800; // Conservative default
  }
}

/**
 * Validate approval requirement result
 * 
 * @param {ApprovalRequirement} requirement - Requirement to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateApprovalRequirement(requirement) {
  const errors = [];

  if (typeof requirement.required !== 'boolean') {
    errors.push('required must be boolean');
  }

  if (requirement.required && !requirement.tier) {
    errors.push('tier required when approval required');
  }

  if (requirement.tier && !Object.values(ApprovalTier).includes(requirement.tier)) {
    errors.push(`tier must be one of: ${Object.values(ApprovalTier).join(', ')}`);
  }

  if (typeof requirement.reason !== 'string') {
    errors.push('reason must be string');
  }

  if (requirement.ttl !== null && typeof requirement.ttl !== 'number') {
    errors.push('ttl must be number or null');
  }

  if (typeof requirement.fail_closed !== 'boolean') {
    errors.push('fail_closed must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  determineApprovalRequirement,
  validateApprovalRequirement
};
