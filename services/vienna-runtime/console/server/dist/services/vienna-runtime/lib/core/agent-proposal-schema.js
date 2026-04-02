/**
 * Agent Proposal Schema — Phase 16 Stage 1
 *
 * Agent-generated proposals with plan structure.
 *
 * Core Invariant: Agent proposals flow through Phase 15 proposal system.
 */
/**
 * Plan Step
 *
 * Single step in a multi-step plan
 */
function validatePlanStep(step, index) {
    const errors = [];
    if (!step.step_id || typeof step.step_id !== 'string') {
        errors.push(`Step ${index}: step_id is required`);
    }
    if (!step.intent_type || typeof step.intent_type !== 'string') {
        errors.push(`Step ${index}: intent_type is required`);
    }
    if (!step.action || typeof step.action !== 'string') {
        errors.push(`Step ${index}: action is required`);
    }
    if (step.risk_tier && !['T0', 'T1', 'T2'].includes(step.risk_tier)) {
        errors.push(`Step ${index}: risk_tier must be T0, T1, or T2`);
    }
    if (step.dependencies && !Array.isArray(step.dependencies)) {
        errors.push(`Step ${index}: dependencies must be an array`);
    }
    if (errors.length > 0) {
        throw new Error(`Plan step validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate plan structure
 */
function validatePlan(plan) {
    const errors = [];
    if (!plan.plan_id || typeof plan.plan_id !== 'string') {
        errors.push('plan_id is required');
    }
    if (!plan.objective_id || typeof plan.objective_id !== 'string') {
        errors.push('objective_id is required');
    }
    if (!plan.steps || !Array.isArray(plan.steps)) {
        errors.push('steps is required and must be an array');
    }
    else if (plan.steps.length === 0) {
        errors.push('steps must contain at least one step');
    }
    else if (plan.steps.length > 20) {
        errors.push('steps cannot exceed 20 steps');
    }
    else {
        plan.steps.forEach((step, index) => {
            try {
                validatePlanStep(step, index);
            }
            catch (e) {
                errors.push(e.message);
            }
        });
    }
    if (!plan.reasoning || typeof plan.reasoning !== 'string') {
        errors.push('reasoning is required');
    }
    if (plan.expected_outcomes && !Array.isArray(plan.expected_outcomes)) {
        errors.push('expected_outcomes must be an array');
    }
    if (errors.length > 0) {
        throw new Error(`Plan validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate agent proposal
 */
function validateAgentProposal(proposal) {
    const errors = [];
    if (!proposal.agent_proposal_id || typeof proposal.agent_proposal_id !== 'string') {
        errors.push('agent_proposal_id is required');
    }
    if (!proposal.agent_id || typeof proposal.agent_id !== 'string') {
        errors.push('agent_id is required');
    }
    if (!proposal.plan) {
        errors.push('plan is required');
    }
    else {
        try {
            validatePlan(proposal.plan);
        }
        catch (e) {
            errors.push(`plan: ${e.message}`);
        }
    }
    if (!proposal.created_at || typeof proposal.created_at !== 'string') {
        errors.push('created_at is required');
    }
    if (!proposal.status || !['pending', 'approved', 'rejected', 'expired'].includes(proposal.status)) {
        errors.push('status must be pending/approved/rejected/expired');
    }
    if (errors.length > 0) {
        throw new Error(`Agent proposal validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Generate agent proposal ID
 */
function generateAgentProposalId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `agprop_${timestamp}_${random}`;
}
/**
 * Generate plan ID
 */
function generatePlanId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `plan_${timestamp}_${random}`;
}
/**
 * Generate step ID
 */
function generateStepId(planId, stepIndex) {
    return `${planId}_step_${stepIndex}`;
}
/**
 * Create agent proposal
 */
function createAgentProposal(input) {
    // Validate plan exists
    if (!input.plan) {
        throw new Error('plan is required');
    }
    // Generate IDs for steps
    const planId = input.plan.plan_id || generatePlanId();
    const steps = input.plan.steps.map((step, index) => ({
        ...step,
        step_id: step.step_id || generateStepId(planId, index)
    }));
    const plan = {
        plan_id: planId,
        objective_id: input.plan.objective_id,
        steps,
        reasoning: input.plan.reasoning,
        expected_outcomes: input.plan.expected_outcomes || [],
        risk_assessment: input.plan.risk_assessment || null,
        metadata: input.plan.metadata || {}
    };
    const agentProposal = {
        agent_proposal_id: generateAgentProposalId(),
        agent_id: input.agent_id,
        plan,
        context: input.context || {},
        created_at: new Date().toISOString(),
        status: 'pending',
        expires_at: input.expires_at || new Date(Date.now() + 3600000).toISOString() // 1 hour
    };
    validateAgentProposal(agentProposal);
    return agentProposal;
}
/**
 * Check if agent proposal is expired
 */
function isExpired(agentProposal) {
    if (agentProposal.status === 'expired')
        return true;
    return new Date() > new Date(agentProposal.expires_at);
}
/**
 * Get highest risk tier in plan
 */
function getMaxRiskTier(plan) {
    const tiers = plan.steps.map(s => s.risk_tier || 'T0');
    if (tiers.includes('T2'))
        return 'T2';
    if (tiers.includes('T1'))
        return 'T1';
    return 'T0';
}
module.exports = {
    // Validation
    validatePlan,
    validatePlanStep,
    validateAgentProposal,
    // Generation
    generateAgentProposalId,
    generatePlanId,
    generateStepId,
    // Helpers
    createAgentProposal,
    isExpired,
    getMaxRiskTier
};
//# sourceMappingURL=agent-proposal-schema.js.map