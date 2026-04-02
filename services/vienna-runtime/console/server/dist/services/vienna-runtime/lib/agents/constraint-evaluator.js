/**
 * Constraint Evaluator — Phase 16 Stage 4
 *
 * Pre-governance validation for agent proposals.
 * Enforces scope limits, risk thresholds, dependency validity.
 */
const { getMaxRiskTier } = require('../core/agent-proposal-schema.js');
class ConstraintEvaluator {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
    }
    /**
     * Evaluate agent proposal constraints
     *
     * @param {object} agentProposal - Agent proposal object
     * @param {object} agent - Agent object
     * @returns {object} - {allowed: boolean, violations: Array}
     */
    async evaluate(agentProposal, agent) {
        const violations = [];
        // Check plan step count
        if (agentProposal.plan.steps.length > agent.max_plan_steps) {
            violations.push({
                type: 'max_steps_exceeded',
                message: `Plan has ${agentProposal.plan.steps.length} steps, agent max is ${agent.max_plan_steps}`
            });
        }
        // Check risk level
        const maxRisk = getMaxRiskTier(agentProposal.plan);
        if (maxRisk === 'T2' && agent.risk_level !== 'T2_restricted') {
            violations.push({
                type: 'risk_level_exceeded',
                message: `Plan contains T2 steps, agent only allowed ${agent.risk_level}`
            });
        }
        if (maxRisk === 'T1' && agent.risk_level === 'T0_only') {
            violations.push({
                type: 'risk_level_exceeded',
                message: `Plan contains T1 steps, agent only allowed T0`
            });
        }
        // Check allowed intent types
        if (agent.allowed_intent_types.length > 0) {
            for (const step of agentProposal.plan.steps) {
                if (!agent.allowed_intent_types.includes(step.action)) {
                    violations.push({
                        type: 'intent_type_not_allowed',
                        message: `Action ${step.action} not in agent allowed list`,
                        step_id: step.step_id
                    });
                }
            }
        }
        // Check rate limit (stub: would query recent proposals)
        const recentCount = await this.getRecentProposalCount(agent.agent_id);
        if (recentCount >= agent.rate_limit_per_hour) {
            violations.push({
                type: 'rate_limit_exceeded',
                message: `Agent has ${recentCount} proposals in last hour, limit is ${agent.rate_limit_per_hour}`
            });
        }
        return {
            allowed: violations.length === 0,
            violations,
            evaluation_timestamp: new Date().toISOString()
        };
    }
    /**
     * Get recent proposal count (stub)
     *
     * @param {string} agent_id - Agent identifier
     * @returns {Promise<number>} - Count of recent proposals
     */
    async getRecentProposalCount(agent_id) {
        // Stub: return 0
        // Real: query agent_proposals table for last hour
        return 0;
    }
    /**
     * Check safe mode
     *
     * If safe mode active, restrict to investigate-only actions.
     *
     * @param {object} plan - Plan object
     * @returns {object} - {allowed: boolean, reason: string}
     */
    checkSafeMode(plan) {
        // Stub: safe mode not implemented yet
        // Real: check runtime context for safe_mode flag
        const safeMode = false;
        if (safeMode) {
            for (const step of plan.steps) {
                if (step.action !== 'investigate' && step.risk_tier !== 'T0') {
                    return {
                        allowed: false,
                        reason: 'Safe mode active: only investigate/T0 actions allowed'
                    };
                }
            }
        }
        return { allowed: true };
    }
}
module.exports = ConstraintEvaluator;
//# sourceMappingURL=constraint-evaluator.js.map