/**
 * Agent Schema — Phase 16 Stage 1
 *
 * Agent registration and capability definition.
 *
 * Core Invariant: Agents propose only. They cannot execute.
 */
/**
 * Agent Capabilities
 *
 * What actions an agent can propose
 */
const AgentCapability = {
    INVESTIGATE: 'investigate',
    RESTORE: 'restore',
    RECONCILE: 'reconcile',
    ESCALATE: 'escalate',
    MONITOR: 'monitor',
    ANALYZE: 'analyze',
    VERIFY: 'verify'
};
/**
 * Agent Risk Level
 *
 * Maximum risk tier an agent can propose
 */
const AgentRiskLevel = {
    T0_ONLY: 'T0_only', // Read-only, safe actions
    T1_ALLOWED: 'T1_allowed', // Side-effects allowed
    T2_RESTRICTED: 'T2_restricted' // High-stakes (requires special approval)
};
/**
 * Agent Status
 */
const AgentStatus = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DEPRECATED: 'deprecated'
};
/**
 * Validate agent object
 */
function validateAgent(agent) {
    const errors = [];
    // Required fields
    if (!agent.agent_id || typeof agent.agent_id !== 'string') {
        errors.push('agent_id is required and must be a string');
    }
    else if (!/^agent_[a-z0-9_]+$/.test(agent.agent_id)) {
        errors.push('agent_id must match pattern: agent_<name>');
    }
    if (!agent.agent_name || typeof agent.agent_name !== 'string') {
        errors.push('agent_name is required and must be a string');
    }
    if (!agent.capabilities || !Array.isArray(agent.capabilities)) {
        errors.push('capabilities is required and must be an array');
    }
    else {
        const validCapabilities = Object.values(AgentCapability);
        for (const cap of agent.capabilities) {
            if (!validCapabilities.includes(cap)) {
                errors.push(`Invalid capability: ${cap}`);
            }
        }
    }
    if (!agent.risk_level || !Object.values(AgentRiskLevel).includes(agent.risk_level)) {
        errors.push(`risk_level must be one of: ${Object.values(AgentRiskLevel).join(', ')}`);
    }
    if (!agent.status || !Object.values(AgentStatus).includes(agent.status)) {
        errors.push(`status must be one of: ${Object.values(AgentStatus).join(', ')}`);
    }
    if (!agent.created_at || typeof agent.created_at !== 'string') {
        errors.push('created_at is required and must be ISO 8601 datetime');
    }
    if (errors.length > 0) {
        throw new Error(`Agent validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate agent creation input
 */
function validateAgentCreate(input) {
    const errors = [];
    if (!input.agent_id || typeof input.agent_id !== 'string') {
        errors.push('agent_id is required');
    }
    else if (!/^agent_[a-z0-9_]+$/.test(input.agent_id)) {
        errors.push('agent_id must match pattern: agent_<name>');
    }
    if (!input.agent_name || typeof input.agent_name !== 'string') {
        errors.push('agent_name is required');
    }
    if (!input.capabilities || !Array.isArray(input.capabilities)) {
        errors.push('capabilities is required and must be an array');
    }
    if (!input.risk_level || !Object.values(AgentRiskLevel).includes(input.risk_level)) {
        errors.push(`risk_level must be one of: ${Object.values(AgentRiskLevel).join(', ')}`);
    }
    if (errors.length > 0) {
        throw new Error(`Agent creation validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Create agent object
 */
function createAgent(input) {
    validateAgentCreate(input);
    const agent = {
        agent_id: input.agent_id,
        agent_name: input.agent_name,
        description: input.description || null,
        capabilities: input.capabilities,
        allowed_intent_types: input.allowed_intent_types || [],
        risk_level: input.risk_level,
        max_plan_steps: input.max_plan_steps || 5,
        rate_limit_per_hour: input.rate_limit_per_hour || 10,
        status: 'active',
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    validateAgent(agent);
    return agent;
}
/**
 * Check if agent can propose action
 */
function canProposeAction(agent, actionType, riskTier) {
    if (agent.status !== 'active') {
        return { allowed: false, reason: 'Agent is not active' };
    }
    // Check risk level
    if (riskTier === 'T2' && agent.risk_level !== AgentRiskLevel.T2_RESTRICTED) {
        return { allowed: false, reason: 'Agent cannot propose T2 actions' };
    }
    if (riskTier === 'T1' && agent.risk_level === AgentRiskLevel.T0_ONLY) {
        return { allowed: false, reason: 'Agent can only propose T0 actions' };
    }
    // Check allowed intent types
    if (agent.allowed_intent_types.length > 0 && !agent.allowed_intent_types.includes(actionType)) {
        return { allowed: false, reason: `Agent not allowed to propose ${actionType}` };
    }
    return { allowed: true };
}
/**
 * Check rate limit
 */
function checkRateLimit(agent, recentProposalCount) {
    if (recentProposalCount >= agent.rate_limit_per_hour) {
        return { allowed: false, reason: 'Rate limit exceeded' };
    }
    return { allowed: true };
}
module.exports = {
    // Enums
    AgentCapability,
    AgentRiskLevel,
    AgentStatus,
    // Validation
    validateAgent,
    validateAgentCreate,
    // Helpers
    createAgent,
    canProposeAction,
    checkRateLimit
};
//# sourceMappingURL=agent-schema.js.map