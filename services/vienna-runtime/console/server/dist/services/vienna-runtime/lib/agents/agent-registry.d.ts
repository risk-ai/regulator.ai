export = AgentRegistry;
declare class AgentRegistry {
    constructor(stateGraph?: any);
    agents: Map<any, any>;
    stateGraph: any;
    circuitBreakers: Map<any, any>;
    /**
     * Register agent
     *
     * @param {object} agentData - Agent data
     * @returns {object} - Created agent
     */
    register(agentData: object): object;
    /**
     * Get agent
     *
     * @param {string} agent_id - Agent identifier
     * @returns {object|null} - Agent or null
     */
    get(agent_id: string): object | null;
    /**
     * List all agents
     *
     * @param {object} filters - Optional filters (status)
     * @returns {Array} - Array of agents
     */
    list(filters?: object): any[];
    /**
     * Suspend agent
     *
     * @param {string} agent_id - Agent identifier
     * @param {string} reason - Suspension reason
     */
    suspend(agent_id: string, reason?: string): void;
    /**
     * Activate agent
     *
     * @param {string} agent_id - Agent identifier
     */
    activate(agent_id: string): void;
    /**
     * Check if agent can propose (with comprehensive safety checks)
     *
     * @param {string} agent_id - Agent identifier
     * @param {string} actionType - Intent action type
     * @param {string} riskTier - Risk tier (T0/T1/T2)
     * @returns {Promise<object>} - {allowed: boolean, reason: string}
     */
    canPropose(agent_id: string, actionType: string, riskTier: string): Promise<object>;
    /**
     * Get recent proposal count from State Graph
     *
     * @param {string} agent_id - Agent identifier
     * @param {number} hoursAgo - Hours to look back (default 1)
     * @returns {Promise<number>} - Number of recent proposals
     */
    getRecentProposalCount(agent_id: string, hoursAgo?: number): Promise<number>;
    /**
     * Get circuit breaker status
     *
     * Implements circuit breaker pattern:
     * - closed: normal operation
     * - open: too many failures, agent suspended
     * - half-open: testing after cooldown (not implemented yet)
     *
     * @param {string} agent_id - Agent identifier
     * @returns {object} - {open: boolean, reason: string, failures: number}
     */
    getCircuitBreakerStatus(agent_id: string): object;
    /**
     * Record proposal failure (for circuit breaker)
     *
     * @param {string} agent_id - Agent identifier
     */
    recordFailure(agent_id: string): void;
    /**
     * Record proposal success (for circuit breaker)
     *
     * @param {string} agent_id - Agent identifier
     */
    recordSuccess(agent_id: string): void;
}
//# sourceMappingURL=agent-registry.d.ts.map