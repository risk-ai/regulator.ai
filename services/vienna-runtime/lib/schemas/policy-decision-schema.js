/**
 * Policy Decision Schema
 * 
 * Defines the structure for policy evaluation decisions.
 * PolicyDecision is the output of PolicyEngine.evaluate().
 * 
 * Core Invariant:
 * A warrant can only be issued if a PolicyDecision exists and allows execution
 * (either unconditionally or with requirements satisfied).
 */

const { DECISION_TYPES } = require('./policy-schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Policy decision structure
 * 
 * @typedef {Object} PolicyDecision
 * @property {string} decision_id - Unique decision identifier
 * @property {string} plan_id - Plan this decision applies to
 * @property {string|null} policy_id - Policy that matched (null if no policy matched)
 * @property {string|null} policy_version - Version of matched policy
 * @property {string} decision - Final decision (allow|deny|require_approval|require_stronger_verification|require_precondition_check|defer_to_operator)
 * @property {string[]} reasons - Human-readable reasons for this decision
 * @property {PolicyDecisionRequirements} requirements - Requirements imposed by this decision
 * @property {PolicyEvaluatedContext} evaluated_context - Context used during evaluation
 * @property {ConflictResolution} [conflict_resolution] - How conflicts were resolved (if multiple policies matched)
 * @property {number} timestamp - Unix timestamp of decision
 */

/**
 * Requirements imposed by policy decision
 * 
 * @typedef {Object} PolicyDecisionRequirements
 * @property {boolean} approval_required - Whether operator approval is required
 * @property {string} [required_verification_strength] - Minimum verification strength
 * @property {string[]} [required_preconditions] - Precondition checks required
 * @property {string[]} [allowed_actor_types] - Actor types allowed
 * @property {number} [min_time_between_executions_minutes] - Minimum time between executions
 */

/**
 * Context evaluated during policy decision
 * 
 * @typedef {Object} PolicyEvaluatedContext
 * @property {Object} plan_summary - Summary of plan being evaluated
 * @property {Object} [ledger_query_results] - Results from ledger queries
 * @property {Object} [runtime_context] - Runtime flags and state
 * @property {number} evaluation_time_ms - Time taken to evaluate
 */

/**
 * Conflict resolution information
 * 
 * @typedef {Object} ConflictResolution
 * @property {number} num_policies_matched - Number of policies that matched
 * @property {string[]} matched_policy_ids - IDs of all matched policies
 * @property {string} resolution_strategy - How conflict was resolved (highest_priority|deny_wins|requirements_merge)
 * @property {string} [explanation] - Human-readable explanation of resolution
 */

/**
 * Validate policy decision structure
 * 
 * @param {PolicyDecision} decision - Decision to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validatePolicyDecision(decision) {
  const errors = [];

  if (!decision.decision_id || typeof decision.decision_id !== 'string') {
    errors.push('decision_id is required and must be a string');
  }

  if (!decision.plan_id || typeof decision.plan_id !== 'string') {
    errors.push('plan_id is required and must be a string');
  }

  if (!decision.decision || !Object.values(DECISION_TYPES).includes(decision.decision)) {
    errors.push(`decision must be one of: ${Object.values(DECISION_TYPES).join(', ')}`);
  }

  if (!Array.isArray(decision.reasons)) {
    errors.push('reasons must be an array');
  }

  if (!decision.requirements || typeof decision.requirements !== 'object') {
    errors.push('requirements must be an object');
  }

  if (!decision.evaluated_context || typeof decision.evaluated_context !== 'object') {
    errors.push('evaluated_context must be an object');
  }

  if (typeof decision.timestamp !== 'number') {
    errors.push('timestamp must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a policy decision
 * 
 * @param {Object} params - Decision parameters
 * @param {string} params.plan_id - Plan ID
 * @param {string|null} params.policy_id - Matched policy ID (null if no match)
 * @param {string|null} params.policy_version - Matched policy version
 * @param {string} params.decision - Decision type
 * @param {string[]} params.reasons - Reasons for decision
 * @param {PolicyDecisionRequirements} params.requirements - Requirements
 * @param {PolicyEvaluatedContext} params.evaluated_context - Evaluated context
 * @param {ConflictResolution} [params.conflict_resolution] - Conflict resolution info
 * @returns {PolicyDecision}
 */
function createPolicyDecision({
  plan_id,
  policy_id,
  policy_version,
  decision,
  reasons,
  requirements,
  evaluated_context,
  conflict_resolution
}) {
  const policyDecision = {
    decision_id: uuidv4(),
    plan_id,
    policy_id,
    policy_version,
    decision,
    reasons: reasons || [],
    requirements: requirements || {
      approval_required: false
    },
    evaluated_context: evaluated_context || {
      plan_summary: {},
      evaluation_time_ms: 0
    },
    conflict_resolution,
    timestamp: Date.now()
  };

  const validation = validatePolicyDecision(policyDecision);
  if (!validation.valid) {
    throw new Error(`Invalid policy decision: ${validation.errors.join(', ')}`);
  }

  return policyDecision;
}

/**
 * Check if a policy decision allows execution
 * 
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
function decisionAllowsExecution(decision) {
  return decision.decision === DECISION_TYPES.ALLOW ||
         decision.decision === DECISION_TYPES.REQUIRE_APPROVAL;
}

/**
 * Check if a policy decision requires approval
 * 
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
function decisionRequiresApproval(decision) {
  return decision.decision === DECISION_TYPES.REQUIRE_APPROVAL ||
         decision.requirements.approval_required === true;
}

/**
 * Check if a policy decision blocks execution
 * 
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
function decisionBlocksExecution(decision) {
  return decision.decision === DECISION_TYPES.DENY;
}

/**
 * Merge requirements from multiple policy decisions
 * Uses most restrictive requirement when conflicts exist
 * 
 * @param {PolicyDecisionRequirements[]} requirementsArray - Array of requirements
 * @returns {PolicyDecisionRequirements}
 */
function mergeRequirements(requirementsArray) {
  const merged = {
    approval_required: false,
    required_preconditions: [],
    allowed_actor_types: []
  };

  for (const reqs of requirementsArray) {
    // Approval: any true = true
    if (reqs.approval_required) {
      merged.approval_required = true;
    }

    // Verification strength: strongest wins
    if (reqs.required_verification_strength) {
      const current = merged.required_verification_strength;
      const incoming = reqs.required_verification_strength;
      
      const strengths = ['none', 'basic', 'objective_stability', 'full_recovery'];
      const currentIdx = current ? strengths.indexOf(current) : -1;
      const incomingIdx = strengths.indexOf(incoming);
      
      if (incomingIdx > currentIdx) {
        merged.required_verification_strength = incoming;
      }
    }

    // Preconditions: union
    if (reqs.required_preconditions) {
      for (const precond of reqs.required_preconditions) {
        if (!merged.required_preconditions.includes(precond)) {
          merged.required_preconditions.push(precond);
        }
      }
    }

    // Actor types: intersection (most restrictive)
    if (reqs.allowed_actor_types && reqs.allowed_actor_types.length > 0) {
      if (merged.allowed_actor_types.length === 0) {
        merged.allowed_actor_types = [...reqs.allowed_actor_types];
      } else {
        merged.allowed_actor_types = merged.allowed_actor_types.filter(
          a => reqs.allowed_actor_types.includes(a)
        );
      }
    }

    // Min time: maximum (most restrictive)
    if (reqs.min_time_between_executions_minutes) {
      const current = merged.min_time_between_executions_minutes || 0;
      merged.min_time_between_executions_minutes = Math.max(
        current,
        reqs.min_time_between_executions_minutes
      );
    }
  }

  return merged;
}

module.exports = {
  validatePolicyDecision,
  createPolicyDecision,
  decisionAllowsExecution,
  decisionRequiresApproval,
  decisionBlocksExecution,
  mergeRequirements
};
