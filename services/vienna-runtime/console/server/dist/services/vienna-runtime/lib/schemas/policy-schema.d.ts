/**
 * Policy object structure
 */
export type Policy = {
    /**
     * - Unique policy identifier
     */
    policy_id: string;
    /**
     * - Semantic version (e.g., "1.0.0")
     */
    policy_version: string;
    /**
     * - When this policy applies
     */
    scope: PolicyScope;
    /**
     * - What must be true for evaluation
     */
    conditions: PolicyConditions;
    /**
     * - Historical limits from execution ledger
     */
    ledger_constraints?: LedgerConstraints;
    /**
     * - What must be satisfied for approval
     */
    requirements: PolicyRequirements;
    /**
     * - Default decision if conditions match (allow|deny|require_approval|require_stronger_verification)
     */
    decision: string;
    /**
     * - Higher number = higher priority (for conflict resolution)
     */
    priority: number;
    /**
     * - Whether this policy is active
     */
    enabled: boolean;
    /**
     * - Human-readable policy explanation
     */
    description?: string;
    /**
     * - Unix timestamp
     */
    created_at?: number;
    /**
     * - Unix timestamp
     */
    updated_at?: number;
};
/**
 * Policy scope - when this policy applies
 */
export type PolicyScope = {
    /**
     * - Objective name(s) this applies to
     */
    objective?: string | string[];
    /**
     * - Environment(s) this applies to (prod, test, local)
     */
    environment?: string | string[];
    /**
     * - Risk tier(s) this applies to (T0, T1, T2)
     */
    risk_tier?: string | string[];
    /**
     * - Target entity ID(s) (e.g., service names)
     */
    target_id?: string | string[];
    /**
     * - Actor type(s) (operator, system, automation)
     */
    actor_type?: string | string[];
};
/**
 * Policy conditions - what must be true for this policy to evaluate
 */
export type PolicyConditions = {
    /**
     * - Required actor types
     */
    actor_type?: string[];
    /**
     * - Minimum verification strength
     */
    required_verification_strength?: string[];
    /**
     * - Must trading window be active/inactive
     */
    trading_window_active?: boolean;
    /**
     * - Custom condition key-value pairs
     */
    custom?: any;
};
/**
 * Ledger constraints - historical limits from execution ledger
 */
export type LedgerConstraints = {
    /**
     * - Max executions of this objective per hour
     */
    max_executions_per_hour?: number;
    /**
     * - Max executions of this objective per day
     */
    max_executions_per_day?: number;
    /**
     * - Max consecutive failures before blocking
     */
    max_failures_before_block?: number;
    /**
     * - Time window for ledger queries (e.g., "1h", "24h")
     */
    lookback_window?: string;
    /**
     * - Block if last execution has this status
     */
    must_not_have_status?: string;
};
/**
 * Policy requirements - what must be satisfied for approval
 */
export type PolicyRequirements = {
    /**
     * - Whether operator approval is required
     */
    approval_required?: boolean;
    /**
     * - Minimum verification strength (none|basic|objective_stability|full_recovery)
     */
    required_verification_strength?: string;
    /**
     * - Precondition checks that must pass
     */
    required_preconditions?: string[];
    /**
     * - Actor types allowed to execute
     */
    allowed_actor_types?: string[];
    /**
     * - Minimum time between executions
     */
    min_time_between_executions_minutes?: number;
};
export namespace DECISION_TYPES {
    let ALLOW: string;
    let DENY: string;
    let REQUIRE_APPROVAL: string;
    let REQUIRE_STRONGER_VERIFICATION: string;
    let REQUIRE_PRECONDITION_CHECK: string;
    let DEFER_TO_OPERATOR: string;
}
export namespace VERIFICATION_STRENGTH {
    let NONE: string;
    let BASIC: string;
    let OBJECTIVE_STABILITY: string;
    let FULL_RECOVERY: string;
}
export namespace ACTOR_TYPES {
    let OPERATOR: string;
    let SYSTEM: string;
    let AUTOMATION: string;
}
export namespace RISK_TIERS {
    let T0: string;
    let T1: string;
    let T2: string;
}
/**
 * Validate policy structure
 *
 * @param {Policy} policy - Policy object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePolicy(policy: Policy): {
    valid: boolean;
    errors: string[];
};
/**
 * Create a new policy with defaults
 *
 * @param {Partial<Policy>} policyData - Policy data
 * @returns {Policy}
 */
export function createPolicy(policyData: Partial<Policy>): Policy;
/**
 * Check if a value matches a scope criterion
 *
 * @param {any} value - Value to check
 * @param {any} criterion - Criterion (string, array, or undefined)
 * @returns {boolean}
 */
export function matchesScopeCriterion(value: any, criterion: any): boolean;
/**
 * Check if a policy's scope matches a plan
 *
 * @param {Policy} policy - Policy to check
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
export function policyMatchesPlan(policy: Policy, plan: any): boolean;
//# sourceMappingURL=policy-schema.d.ts.map