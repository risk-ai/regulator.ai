export namespace AgentCapability {
    let INVESTIGATE: string;
    let RESTORE: string;
    let RECONCILE: string;
    let ESCALATE: string;
    let MONITOR: string;
    let ANALYZE: string;
    let VERIFY: string;
}
export namespace AgentRiskLevel {
    let T0_ONLY: string;
    let T1_ALLOWED: string;
    let T2_RESTRICTED: string;
}
export namespace AgentStatus {
    let ACTIVE: string;
    let SUSPENDED: string;
    let DEPRECATED: string;
}
/**
 * Validate agent object
 */
export function validateAgent(agent: any): boolean;
/**
 * Validate agent creation input
 */
export function validateAgentCreate(input: any): boolean;
/**
 * Create agent object
 */
export function createAgent(input: any): {
    agent_id: any;
    agent_name: any;
    description: any;
    capabilities: any;
    allowed_intent_types: any;
    risk_level: any;
    max_plan_steps: any;
    rate_limit_per_hour: any;
    status: string;
    metadata: any;
    created_at: string;
    updated_at: string;
};
/**
 * Check if agent can propose action
 */
export function canProposeAction(agent: any, actionType: any, riskTier: any): {
    allowed: boolean;
    reason: string;
} | {
    allowed: boolean;
    reason?: undefined;
};
/**
 * Check rate limit
 */
export function checkRateLimit(agent: any, recentProposalCount: any): {
    allowed: boolean;
    reason: string;
} | {
    allowed: boolean;
    reason?: undefined;
};
//# sourceMappingURL=agent-schema.d.ts.map