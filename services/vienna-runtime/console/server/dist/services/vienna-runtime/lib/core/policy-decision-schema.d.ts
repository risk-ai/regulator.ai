/**
 * Policy decision structure
 */
export type PolicyDecision = {
    /**
     * - Unique decision identifier
     */
    decision_id: string;
    /**
     * - Plan this decision applies to
     */
    plan_id: string;
    /**
     * - Policy that matched (null if no policy matched)
     */
    policy_id: string | null;
    /**
     * - Version of matched policy
     */
    policy_version: string | null;
    /**
     * - Final decision (allow|deny|require_approval|require_stronger_verification|require_precondition_check|defer_to_operator)
     */
    decision: string;
    /**
     * - Human-readable reasons for this decision
     */
    reasons: string[];
    /**
     * - Requirements imposed by this decision
     */
    requirements: PolicyDecisionRequirements;
    /**
     * - Context used during evaluation
     */
    evaluated_context: PolicyEvaluatedContext;
    /**
     * - How conflicts were resolved (if multiple policies matched)
     */
    conflict_resolution?: ConflictResolution;
    /**
     * - Unix timestamp of decision
     */
    timestamp: number;
};
/**
 * Requirements imposed by policy decision
 */
export type PolicyDecisionRequirements = {
    /**
     * - Whether operator approval is required
     */
    approval_required: boolean;
    /**
     * - Approval tier (T0|T1|T2) when approval required
     */
    approval_tier?: string;
    /**
     * - TTL for approval request in seconds
     */
    approval_ttl_seconds?: number;
    /**
     * - Minimum verification strength
     */
    required_verification_strength?: string;
    /**
     * - Precondition checks required
     */
    required_preconditions?: string[];
    /**
     * - Actor types allowed
     */
    allowed_actor_types?: string[];
    /**
     * - Minimum time between executions
     */
    min_time_between_executions_minutes?: number;
};
/**
 * Context evaluated during policy decision
 */
export type PolicyEvaluatedContext = {
    /**
     * - Summary of plan being evaluated
     */
    plan_summary: any;
    /**
     * - Results from ledger queries
     */
    ledger_query_results?: any;
    /**
     * - Runtime flags and state
     */
    runtime_context?: any;
    /**
     * - Time taken to evaluate
     */
    evaluation_time_ms: number;
};
/**
 * Conflict resolution information
 */
export type ConflictResolution = {
    /**
     * - Number of policies that matched
     */
    num_policies_matched: number;
    /**
     * - IDs of all matched policies
     */
    matched_policy_ids: string[];
    /**
     * - How conflict was resolved (highest_priority|deny_wins|requirements_merge)
     */
    resolution_strategy: string;
    /**
     * - Human-readable explanation of resolution
     */
    explanation?: string;
};
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
 * @property {string} [approval_tier] - Approval tier (T0|T1|T2) when approval required
 * @property {number} [approval_ttl_seconds] - TTL for approval request in seconds
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
export function validatePolicyDecision(decision: PolicyDecision): {
    valid: boolean;
    errors: string[];
};
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
export function createPolicyDecision({ plan_id, policy_id, policy_version, decision, reasons, requirements, evaluated_context, conflict_resolution }: {
    plan_id: string;
    policy_id: string | null;
    policy_version: string | null;
    decision: string;
    reasons: string[];
    requirements: PolicyDecisionRequirements;
    evaluated_context: PolicyEvaluatedContext;
    conflict_resolution?: ConflictResolution;
}): PolicyDecision;
/**
 * Check if a policy decision allows execution
 *
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
export function decisionAllowsExecution(decision: PolicyDecision): boolean;
/**
 * Check if a policy decision requires approval
 *
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
export function decisionRequiresApproval(decision: PolicyDecision): boolean;
/**
 * Check if a policy decision blocks execution
 *
 * @param {PolicyDecision} decision - Decision to check
 * @returns {boolean}
 */
export function decisionBlocksExecution(decision: PolicyDecision): boolean;
/**
 * Merge requirements from multiple policy decisions
 * Uses most restrictive requirement when conflicts exist
 *
 * @param {PolicyDecisionRequirements[]} requirementsArray - Array of requirements
 * @returns {PolicyDecisionRequirements}
 */
export function mergeRequirements(requirementsArray: PolicyDecisionRequirements[]): PolicyDecisionRequirements;
//# sourceMappingURL=policy-decision-schema.d.ts.map