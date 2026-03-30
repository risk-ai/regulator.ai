/**
 * Policy Schema
 *
 * Defines the structure for Vienna OS execution policies.
 * Policies govern plan admissibility before warrant issuance.
 *
 * Core Invariant:
 * All execution admissibility decisions must be made by the Policy Engine
 * before warrant issuance.
 */
/**
 * Policy object structure
 *
 * @typedef {Object} Policy
 * @property {string} policy_id - Unique policy identifier
 * @property {string} policy_version - Semantic version (e.g., "1.0.0")
 * @property {PolicyScope} scope - When this policy applies
 * @property {PolicyConditions} conditions - What must be true for evaluation
 * @property {LedgerConstraints} [ledger_constraints] - Historical limits from execution ledger
 * @property {PolicyRequirements} requirements - What must be satisfied for approval
 * @property {string} decision - Default decision if conditions match (allow|deny|require_approval|require_stronger_verification)
 * @property {number} priority - Higher number = higher priority (for conflict resolution)
 * @property {boolean} enabled - Whether this policy is active
 * @property {string} [description] - Human-readable policy explanation
 * @property {number} [created_at] - Unix timestamp
 * @property {number} [updated_at] - Unix timestamp
 */
/**
 * Policy scope - when this policy applies
 *
 * @typedef {Object} PolicyScope
 * @property {string|string[]} [objective] - Objective name(s) this applies to
 * @property {string|string[]} [environment] - Environment(s) this applies to (prod, test, local)
 * @property {string|string[]} [risk_tier] - Risk tier(s) this applies to (T0, T1, T2)
 * @property {string|string[]} [target_id] - Target entity ID(s) (e.g., service names)
 * @property {string|string[]} [actor_type] - Actor type(s) (operator, system, automation)
 */
/**
 * Policy conditions - what must be true for this policy to evaluate
 *
 * @typedef {Object} PolicyConditions
 * @property {string[]} [actor_type] - Required actor types
 * @property {string[]} [required_verification_strength] - Minimum verification strength
 * @property {boolean} [trading_window_active] - Must trading window be active/inactive
 * @property {Object} [custom] - Custom condition key-value pairs
 */
/**
 * Ledger constraints - historical limits from execution ledger
 *
 * @typedef {Object} LedgerConstraints
 * @property {number} [max_executions_per_hour] - Max executions of this objective per hour
 * @property {number} [max_executions_per_day] - Max executions of this objective per day
 * @property {number} [max_failures_before_block] - Max consecutive failures before blocking
 * @property {string} [lookback_window] - Time window for ledger queries (e.g., "1h", "24h")
 * @property {string} [must_not_have_status] - Block if last execution has this status
 */
/**
 * Policy requirements - what must be satisfied for approval
 *
 * @typedef {Object} PolicyRequirements
 * @property {boolean} [approval_required] - Whether operator approval is required
 * @property {string} [required_verification_strength] - Minimum verification strength (none|basic|objective_stability|full_recovery)
 * @property {string[]} [required_preconditions] - Precondition checks that must pass
 * @property {string[]} [allowed_actor_types] - Actor types allowed to execute
 * @property {number} [min_time_between_executions_minutes] - Minimum time between executions
 */
/**
 * Decision types
 */
const DECISION_TYPES = {
    ALLOW: 'allow',
    DENY: 'deny',
    REQUIRE_APPROVAL: 'require_approval',
    REQUIRE_STRONGER_VERIFICATION: 'require_stronger_verification',
    REQUIRE_PRECONDITION_CHECK: 'require_precondition_check',
    DEFER_TO_OPERATOR: 'defer_to_operator'
};
/**
 * Verification strength levels (weakest to strongest)
 */
const VERIFICATION_STRENGTH = {
    NONE: 'none',
    BASIC: 'basic',
    OBJECTIVE_STABILITY: 'objective_stability',
    FULL_RECOVERY: 'full_recovery'
};
/**
 * Actor types
 */
const ACTOR_TYPES = {
    OPERATOR: 'operator',
    SYSTEM: 'system',
    AUTOMATION: 'automation'
};
/**
 * Risk tiers
 */
const RISK_TIERS = {
    T0: 'T0',
    T1: 'T1',
    T2: 'T2'
};
/**
 * Validate policy structure
 *
 * @param {Policy} policy - Policy object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validatePolicy(policy) {
    const errors = [];
    if (!policy.policy_id || typeof policy.policy_id !== 'string') {
        errors.push('policy_id is required and must be a string');
    }
    if (!policy.policy_version || typeof policy.policy_version !== 'string') {
        errors.push('policy_version is required and must be a string');
    }
    if (!policy.scope || typeof policy.scope !== 'object') {
        errors.push('scope is required and must be an object');
    }
    if (!policy.decision || !Object.values(DECISION_TYPES).includes(policy.decision)) {
        errors.push(`decision must be one of: ${Object.values(DECISION_TYPES).join(', ')}`);
    }
    if (typeof policy.priority !== 'number') {
        errors.push('priority must be a number');
    }
    if (typeof policy.enabled !== 'boolean') {
        errors.push('enabled must be a boolean');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Create a new policy with defaults
 *
 * @param {Partial<Policy>} policyData - Policy data
 * @returns {Policy}
 */
function createPolicy(policyData) {
    const now = Date.now();
    const policy = {
        policy_id: policyData.policy_id,
        policy_version: policyData.policy_version || '1.0.0',
        scope: policyData.scope || {},
        conditions: policyData.conditions || {},
        ledger_constraints: policyData.ledger_constraints || {},
        requirements: policyData.requirements || {},
        decision: policyData.decision,
        priority: policyData.priority !== undefined ? policyData.priority : 0,
        enabled: policyData.enabled !== undefined ? policyData.enabled : true,
        description: policyData.description || '',
        created_at: policyData.created_at || now,
        updated_at: policyData.updated_at || now
    };
    const validation = validatePolicy(policy);
    if (!validation.valid) {
        throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
    }
    return policy;
}
/**
 * Check if a value matches a scope criterion
 *
 * @param {any} value - Value to check
 * @param {any} criterion - Criterion (string, array, or undefined)
 * @returns {boolean}
 */
function matchesScopeCriterion(value, criterion) {
    if (!criterion)
        return true; // No criterion = always matches
    if (Array.isArray(criterion)) {
        return criterion.includes(value);
    }
    return criterion === value;
}
/**
 * Check if a policy's scope matches a plan
 *
 * @param {Policy} policy - Policy to check
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
function policyMatchesPlan(policy, plan) {
    const scope = policy.scope;
    // Check each scope criterion
    if (!matchesScopeCriterion(plan.objective, scope.objective)) {
        return false;
    }
    if (!matchesScopeCriterion(plan.environment, scope.environment)) {
        return false;
    }
    if (!matchesScopeCriterion(plan.risk_tier, scope.risk_tier)) {
        return false;
    }
    if (scope.target_id) {
        // Check if any step targets match
        const stepTargets = plan.steps
            .filter(s => s.target_id)
            .map(s => s.target_id);
        if (!stepTargets.some(t => matchesScopeCriterion(t, scope.target_id))) {
            return false;
        }
    }
    if (scope.actor_type && plan.actor) {
        if (!matchesScopeCriterion(plan.actor.type, scope.actor_type)) {
            return false;
        }
    }
    return true;
}
module.exports = {
    DECISION_TYPES,
    VERIFICATION_STRENGTH,
    ACTOR_TYPES,
    RISK_TIERS,
    validatePolicy,
    createPolicy,
    matchesScopeCriterion,
    policyMatchesPlan
};
//# sourceMappingURL=policy-schema.js.map