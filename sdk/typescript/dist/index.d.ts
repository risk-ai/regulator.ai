/**
 * Vienna OS TypeScript SDK
 *
 * Strongly-typed SDK for Vienna OS AI Agent Governance Platform
 */
export interface ViennaConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}
export interface Intent {
    agent_id: string;
    action: string;
    payload?: Record<string, any>;
    metadata?: Record<string, any>;
    risk_tier?: 'T0' | 'T1' | 'T2' | 'T3';
    simulation?: boolean;
}
export interface IntentResult {
    pipeline: 'executed' | 'pending_approval' | 'blocked' | 'simulated';
    intent_id?: string;
    warrant?: Warrant;
    proposal?: Proposal;
    risk_tier?: string;
    reason?: string;
    would_approve?: boolean;
}
export interface Warrant {
    id: string;
    intent_id: string;
    agent_id: string;
    action: string;
    status: 'active' | 'expired' | 'revoked';
    issued_at: string;
    expires_at?: string;
    signature: string;
}
export interface Proposal {
    id: string;
    intent_id: string;
    agent_id: string;
    action: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at?: string;
    reviewer?: string;
    reason?: string;
}
export interface Agent {
    id: string;
    name: string;
    type: string;
    description?: string;
    default_tier: string;
    capabilities: string[];
    config: Record<string, any>;
    status: 'active' | 'suspended' | 'terminated';
    created_at: string;
    updated_at?: string;
}
export interface Policy {
    id: string;
    name: string;
    description?: string;
    tier: string;
    rules: Record<string, any>;
    enabled: boolean;
    priority: number;
    created_at: string;
    updated_at?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export declare class ViennaClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    constructor(config: ViennaConfig);
    private request;
    /**
     * Submit an intent for governance evaluation
     */
    submitIntent(intent: Intent): Promise<IntentResult>;
    /**
     * Simulate an intent without execution
     */
    simulate(intent: Omit<Intent, 'simulation'>): Promise<IntentResult>;
    /**
     * Verify a warrant
     */
    verifyWarrant(warrantId: string, signature?: string): Promise<{
        valid: boolean;
        warrant?: Warrant;
    }>;
    /**
     * Approve a proposal (operator action)
     */
    approveProposal(proposalId: string, params: {
        reviewer: string;
        reason?: string;
    }): Promise<{
        warrant: Warrant;
    }>;
    /**
     * Reject a proposal
     */
    rejectProposal(proposalId: string, params: {
        reviewer: string;
        reason: string;
    }): Promise<{
        proposal: Proposal;
    }>;
    /**
     * List agents (with pagination)
     */
    listAgents(params?: {
        page?: number;
        limit?: number;
        status?: 'active' | 'suspended' | 'terminated';
        tier?: string;
    }): Promise<PaginatedResponse<Agent>>;
    /**
     * Get a specific agent
     */
    getAgent(agentId: string): Promise<Agent>;
    /**
     * Register a new agent
     */
    registerAgent(agent: {
        name: string;
        type: string;
        description?: string;
        default_tier?: string;
        capabilities?: string[];
        config?: Record<string, any>;
    }): Promise<Agent>;
    /**
     * Update an agent (partial)
     */
    updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent>;
    /**
     * Delete an agent
     */
    deleteAgent(agentId: string): Promise<{
        deleted: boolean;
    }>;
    /**
     * List policies (with pagination)
     */
    listPolicies(params?: {
        page?: number;
        limit?: number;
        enabled?: boolean;
        tier?: string;
    }): Promise<PaginatedResponse<Policy>>;
    /**
     * Get a specific policy
     */
    getPolicy(policyId: string): Promise<Policy>;
    /**
     * Create a new policy
     */
    createPolicy(policy: {
        name: string;
        tier: string;
        rules: Record<string, any>;
        description?: string;
        enabled?: boolean;
        priority?: number;
    }): Promise<Policy>;
    /**
     * Update a policy (partial)
     */
    updatePolicy(policyId: string, updates: Partial<Policy>): Promise<Policy>;
    /**
     * Delete a policy
     */
    deletePolicy(policyId: string): Promise<{
        deleted: boolean;
    }>;
    /**
     * Submit multiple intents in batch
     */
    submitBatch(intents: Intent[]): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: Array<{
            index: number;
            success: boolean;
            intent_id?: string;
            error?: string;
        }>;
    }>;
    /**
     * Get system health
     */
    health(): Promise<{
        status: string;
        uptime?: number;
        version?: string;
    }>;
}
export default ViennaClient;
//# sourceMappingURL=index.d.ts.map