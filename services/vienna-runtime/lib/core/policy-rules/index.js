/**
 * Policy Rules Registry
 * 
 * Central registry of all Vienna OS execution policies.
 * Policies are structured, versioned, and machine-checkable.
 * 
 * Initial production-worthy policies:
 * 1. prod_gateway_restart - Prod gateway restart requires approval
 * 2. trading_critical_protection - Protect trading-critical services
 * 3. max_restarts_per_hour - Rate limit restarts
 * 4. stronger_verification_in_prod - Require stronger verification in prod
 * 5. operator_only_t1_t2_prod - Operator-only for T1/T2 in prod
 */

const { createPolicy, DECISION_TYPES, ACTOR_TYPES, VERIFICATION_STRENGTH } = require('../policy-schema');

/**
 * Load all active policies
 * 
 * @returns {Promise<Array>} Array of policy objects
 */
async function loadPolicies() {
  return [
    // Policy 1: Production gateway restart requires approval
    createPolicy({
      policy_id: 'prod_gateway_restart',
      policy_version: '1.0.0',
      description: 'Production gateway restart requires operator approval',
      scope: {
        objective: 'recover_gateway',
        environment: 'prod',
        target_id: 'openclaw-gateway'
      },
      conditions: {},
      ledger_constraints: {},
      requirements: {
        approval_required: true,
        required_verification_strength: VERIFICATION_STRENGTH.OBJECTIVE_STABILITY
      },
      decision: DECISION_TYPES.REQUIRE_APPROVAL,
      priority: 100,
      enabled: true
    }),

    // Policy 2: Trading-critical service protection
    createPolicy({
      policy_id: 'trading_critical_protection',
      policy_version: '1.0.0',
      description: 'Protect trading-critical services from unauthorized restarts',
      scope: {
        target_id: ['kalshi-cron', 'kalshi-api', 'nba-data-feed'],
        risk_tier: ['T1', 'T2']
      },
      conditions: {
        actor_type: [ACTOR_TYPES.OPERATOR]
      },
      ledger_constraints: {},
      requirements: {
        approval_required: true,
        required_verification_strength: VERIFICATION_STRENGTH.FULL_RECOVERY,
        allowed_actor_types: [ACTOR_TYPES.OPERATOR]
      },
      decision: DECISION_TYPES.REQUIRE_APPROVAL,
      priority: 200, // Higher priority than general rules
      enabled: true
    }),

    // Policy 3: Max restarts per hour (any service)
    createPolicy({
      policy_id: 'max_restarts_per_hour',
      policy_version: '1.0.0',
      description: 'Deny restart if service restarted >3 times in last hour',
      scope: {
        objective: ['recover_gateway', 'restart_service', 'recover_service']
      },
      conditions: {},
      ledger_constraints: {
        max_executions_per_hour: 3,
        lookback_window: '1h'
      },
      requirements: {},
      decision: DECISION_TYPES.DENY,
      priority: 150,
      enabled: true
    }),

    // Policy 4: Stronger verification in production
    createPolicy({
      policy_id: 'stronger_verification_in_prod',
      policy_version: '1.0.0',
      description: 'Production environments require stronger verification',
      scope: {
        environment: 'prod',
        risk_tier: ['T1', 'T2']
      },
      conditions: {
        required_verification_strength: VERIFICATION_STRENGTH.BASIC
      },
      ledger_constraints: {},
      requirements: {
        required_verification_strength: VERIFICATION_STRENGTH.OBJECTIVE_STABILITY
      },
      decision: DECISION_TYPES.REQUIRE_STRONGER_VERIFICATION,
      priority: 95, // Higher than operator_only (90) to ensure verification requirement is set
      enabled: true
    }),

    // Policy 5: Operator-only for T1/T2 in production
    createPolicy({
      policy_id: 'operator_only_t1_t2_prod',
      policy_version: '1.0.0',
      description: 'T1/T2 actions in production require operator actor',
      scope: {
        environment: 'prod',
        risk_tier: ['T1', 'T2']
      },
      conditions: {},
      ledger_constraints: {},
      requirements: {
        allowed_actor_types: [ACTOR_TYPES.OPERATOR]
      },
      decision: DECISION_TYPES.REQUIRE_APPROVAL,
      priority: 90,
      enabled: true
    }),

    // Policy 6: Block consecutive failures
    createPolicy({
      policy_id: 'block_after_consecutive_failures',
      policy_version: '1.0.0',
      description: 'Block execution after 3 consecutive failures',
      scope: {
        objective: ['recover_gateway', 'restart_service', 'recover_service']
      },
      conditions: {},
      ledger_constraints: {
        max_failures_before_block: 3
      },
      requirements: {},
      decision: DECISION_TYPES.DENY,
      priority: 180,
      enabled: true
    })
  ];
}

/**
 * Get policy by ID
 * 
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object|null>}
 */
async function getPolicyById(policyId) {
  const policies = await loadPolicies();
  return policies.find(p => p.policy_id === policyId) || null;
}

/**
 * Get policies by scope criteria
 * 
 * @param {Object} criteria - Scope criteria
 * @returns {Promise<Array>}
 */
async function getPoliciesByScope(criteria) {
  const policies = await loadPolicies();
  
  return policies.filter(policy => {
    const scope = policy.scope;
    
    for (const [key, value] of Object.entries(criteria)) {
      const scopeValue = scope[key];
      
      if (!scopeValue) continue;
      
      if (Array.isArray(scopeValue)) {
        if (!scopeValue.includes(value)) return false;
      } else {
        if (scopeValue !== value) return false;
      }
    }
    
    return true;
  });
}

module.exports = {
  loadPolicies,
  getPolicyById,
  getPoliciesByScope
};
