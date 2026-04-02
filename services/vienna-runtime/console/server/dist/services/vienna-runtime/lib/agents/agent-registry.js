/**
 * Agent Registry — Phase 16 Stage 8 (Safety Controls)
 *
 * Manages registered agents with advanced safety controls.
 */
const { createAgent, canProposeAction, checkRateLimit } = require('../core/agent-schema.js');
class AgentRegistry {
    constructor(stateGraph = null) {
        this.agents = new Map();
        this.stateGraph = stateGraph;
        this.circuitBreakers = new Map(); // agent_id → {failures: number, last_failure: timestamp, status: open|closed}
    }
    /**
     * Register agent
     *
     * @param {object} agentData - Agent data
     * @returns {object} - Created agent
     */
    register(agentData) {
        const agent = createAgent(agentData);
        this.agents.set(agent.agent_id, agent);
        // Initialize circuit breaker
        this.circuitBreakers.set(agent.agent_id, {
            failures: 0,
            last_failure: null,
            status: 'closed'
        });
        return agent;
    }
    /**
     * Get agent
     *
     * @param {string} agent_id - Agent identifier
     * @returns {object|null} - Agent or null
     */
    get(agent_id) {
        return this.agents.get(agent_id) || null;
    }
    /**
     * List all agents
     *
     * @param {object} filters - Optional filters (status)
     * @returns {Array} - Array of agents
     */
    list(filters = {}) {
        let agents = Array.from(this.agents.values());
        if (filters.status) {
            agents = agents.filter(a => a.status === filters.status);
        }
        return agents;
    }
    /**
     * Suspend agent
     *
     * @param {string} agent_id - Agent identifier
     * @param {string} reason - Suspension reason
     */
    suspend(agent_id, reason = 'manual') {
        const agent = this.agents.get(agent_id);
        if (agent) {
            agent.status = 'suspended';
            agent.updated_at = new Date().toISOString();
            agent.metadata = {
                ...agent.metadata,
                suspension_reason: reason,
                suspended_at: new Date().toISOString()
            };
        }
    }
    /**
     * Activate agent
     *
     * @param {string} agent_id - Agent identifier
     */
    activate(agent_id) {
        const agent = this.agents.get(agent_id);
        if (agent) {
            agent.status = 'active';
            agent.updated_at = new Date().toISOString();
            // Reset circuit breaker on manual activation
            const breaker = this.circuitBreakers.get(agent_id);
            if (breaker) {
                breaker.failures = 0;
                breaker.status = 'closed';
            }
        }
    }
    /**
     * Check if agent can propose (with comprehensive safety checks)
     *
     * @param {string} agent_id - Agent identifier
     * @param {string} actionType - Intent action type
     * @param {string} riskTier - Risk tier (T0/T1/T2)
     * @returns {Promise<object>} - {allowed: boolean, reason: string}
     */
    async canPropose(agent_id, actionType, riskTier) {
        const agent = this.get(agent_id);
        if (!agent) {
            return { allowed: false, reason: 'Agent not found' };
        }
        // Check action capability
        const actionCheck = canProposeAction(agent, actionType, riskTier);
        if (!actionCheck.allowed) {
            return actionCheck;
        }
        // Check circuit breaker
        const breakerStatus = this.getCircuitBreakerStatus(agent_id);
        if (breakerStatus.open) {
            return { allowed: false, reason: `Circuit breaker open: ${breakerStatus.reason}` };
        }
        // Check rate limit (query recent proposals if State Graph available)
        const recentCount = await this.getRecentProposalCount(agent_id);
        const rateLimitCheck = checkRateLimit(agent, recentCount);
        if (!rateLimitCheck.allowed) {
            return rateLimitCheck;
        }
        return { allowed: true };
    }
    /**
     * Get recent proposal count from State Graph
     *
     * @param {string} agent_id - Agent identifier
     * @param {number} hoursAgo - Hours to look back (default 1)
     * @returns {Promise<number>} - Number of recent proposals
     */
    async getRecentProposalCount(agent_id, hoursAgo = 1) {
        if (!this.stateGraph) {
            return 0; // No State Graph, cannot track
        }
        try {
            const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
            // Query agent_proposals table
            const result = await this.stateGraph.query(`SELECT COUNT(*) as count FROM agent_proposals 
         WHERE agent_id = ? AND created_at > ?`, [agent_id, cutoff]);
            return result[0]?.count || 0;
        }
        catch (error) {
            console.error(`[AgentRegistry] Error querying proposal count: ${error.message}`);
            return 0;
        }
    }
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
    getCircuitBreakerStatus(agent_id) {
        const breaker = this.circuitBreakers.get(agent_id);
        if (!breaker) {
            return { open: false, failures: 0 };
        }
        const FAILURE_THRESHOLD = 5;
        const COOLDOWN_MINUTES = 30;
        // Check if breaker should be opened
        if (breaker.failures >= FAILURE_THRESHOLD) {
            const cooldownExpired = breaker.last_failure &&
                (Date.now() - new Date(breaker.last_failure).getTime()) > (COOLDOWN_MINUTES * 60 * 1000);
            if (cooldownExpired) {
                // Reset after cooldown
                breaker.failures = 0;
                breaker.status = 'closed';
                return { open: false, failures: 0 };
            }
            breaker.status = 'open';
            return {
                open: true,
                reason: `${breaker.failures} consecutive failures, cooldown until ${new Date(new Date(breaker.last_failure).getTime() + COOLDOWN_MINUTES * 60 * 1000).toISOString()}`,
                failures: breaker.failures
            };
        }
        return { open: false, failures: breaker.failures };
    }
    /**
     * Record proposal failure (for circuit breaker)
     *
     * @param {string} agent_id - Agent identifier
     */
    recordFailure(agent_id) {
        const breaker = this.circuitBreakers.get(agent_id);
        if (breaker) {
            breaker.failures++;
            breaker.last_failure = new Date().toISOString();
            // Auto-suspend if threshold exceeded
            const status = this.getCircuitBreakerStatus(agent_id);
            if (status.open) {
                this.suspend(agent_id, 'circuit_breaker_threshold_exceeded');
            }
        }
    }
    /**
     * Record proposal success (for circuit breaker)
     *
     * @param {string} agent_id - Agent identifier
     */
    recordSuccess(agent_id) {
        const breaker = this.circuitBreakers.get(agent_id);
        if (breaker) {
            // Reset failure count on success
            breaker.failures = 0;
        }
    }
}
module.exports = AgentRegistry;
//# sourceMappingURL=agent-registry.js.map