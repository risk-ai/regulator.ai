export = AgentBudget;
/**
 * Phase 7.4 Stage 2: Agent Execution Budgets
 *
 * Purpose: Prevent one agent from dominating execution capacity.
 *
 * Design:
 * - Limits active envelopes per agent
 * - Limits queued envelopes per agent
 * - Protects operational fairness, not correctness
 * - Applied regardless of warrant validity
 */
declare class AgentBudget {
    constructor(policy?: {});
    policy: {
        max_active_envelopes_per_agent: any;
        max_queued_envelopes_per_agent: any;
    };
    agentActive: Map<any, any>;
    agentQueued: Map<any, any>;
    /**
     * Check if agent can admit new envelope
     *
     * @param {string} agentId - Agent proposing envelope
     * @returns {object} { allowed: boolean, reason?: string }
     */
    checkAdmission(agentId: string): object;
    /**
     * Check if agent can start execution
     *
     * @param {string} agentId - Agent whose envelope is executing
     * @returns {object} { allowed: boolean, reason?: string }
     */
    checkExecution(agentId: string): object;
    /**
     * Record envelope queued for agent
     *
     * @param {string} agentId - Agent ID
     * @param {string} envelopeId - Envelope ID
     */
    recordQueued(agentId: string, envelopeId: string): void;
    /**
     * Record envelope execution started for agent
     *
     * @param {string} agentId - Agent ID
     * @param {string} envelopeId - Envelope ID
     */
    recordExecutionStart(agentId: string, envelopeId: string): void;
    /**
     * Record envelope execution completed for agent
     *
     * @param {string} agentId - Agent ID
     * @param {string} envelopeId - Envelope ID
     */
    recordExecutionComplete(agentId: string, envelopeId: string): void;
    /**
     * Remove envelope from tracking (dequeue without execution)
     *
     * @param {string} agentId - Agent ID
     * @param {string} envelopeId - Envelope ID
     */
    removeEnvelope(agentId: string, envelopeId: string): void;
    /**
     * Get current budget state
     *
     * @returns {object} Budget utilization by agent
     */
    getState(): object;
    /**
     * Reset all budget tracking (for testing / emergency)
     */
    reset(): void;
}
//# sourceMappingURL=agent-budget.d.ts.map