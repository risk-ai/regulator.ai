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

class AgentBudget {
  constructor(policy = {}) {
    this.policy = {
      max_active_envelopes_per_agent: policy.max_active_envelopes_per_agent || 3,
      max_queued_envelopes_per_agent: policy.max_queued_envelopes_per_agent || 10
    };
    
    // Track per-agent counts
    this.agentActive = new Map(); // agent_id → Set<envelope_id>
    this.agentQueued = new Map(); // agent_id → Set<envelope_id>
  }
  
  /**
   * Check if agent can admit new envelope
   * 
   * @param {string} agentId - Agent proposing envelope
   * @returns {object} { allowed: boolean, reason?: string }
   */
  checkAdmission(agentId) {
    const queued = this.agentQueued.get(agentId)?.size || 0;
    
    if (queued >= this.policy.max_queued_envelopes_per_agent) {
      return {
        allowed: false,
        reason: `Agent queue budget exceeded: ${queued}/${this.policy.max_queued_envelopes_per_agent} for agent ${agentId}`,
        agent_id: agentId,
        limit_type: 'AGENT_QUEUE_BUDGET'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check if agent can start execution
   * 
   * @param {string} agentId - Agent whose envelope is executing
   * @returns {object} { allowed: boolean, reason?: string }
   */
  checkExecution(agentId) {
    const active = this.agentActive.get(agentId)?.size || 0;
    
    if (active >= this.policy.max_active_envelopes_per_agent) {
      return {
        allowed: false,
        reason: `Agent execution budget exceeded: ${active}/${this.policy.max_active_envelopes_per_agent} for agent ${agentId}`,
        agent_id: agentId,
        limit_type: 'AGENT_EXECUTION_BUDGET'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Record envelope queued for agent
   * 
   * @param {string} agentId - Agent ID
   * @param {string} envelopeId - Envelope ID
   */
  recordQueued(agentId, envelopeId) {
    if (!agentId) agentId = 'unknown';
    
    if (!this.agentQueued.has(agentId)) {
      this.agentQueued.set(agentId, new Set());
    }
    this.agentQueued.get(agentId).add(envelopeId);
  }
  
  /**
   * Record envelope execution started for agent
   * 
   * @param {string} agentId - Agent ID
   * @param {string} envelopeId - Envelope ID
   */
  recordExecutionStart(agentId, envelopeId) {
    if (!agentId) agentId = 'unknown';
    
    // Move from queued to active
    this.agentQueued.get(agentId)?.delete(envelopeId);
    
    if (!this.agentActive.has(agentId)) {
      this.agentActive.set(agentId, new Set());
    }
    this.agentActive.get(agentId).add(envelopeId);
  }
  
  /**
   * Record envelope execution completed for agent
   * 
   * @param {string} agentId - Agent ID
   * @param {string} envelopeId - Envelope ID
   */
  recordExecutionComplete(agentId, envelopeId) {
    if (!agentId) agentId = 'unknown';
    
    // Remove from active
    this.agentActive.get(agentId)?.delete(envelopeId);
    
    // Clean up empty sets
    if (this.agentActive.get(agentId)?.size === 0) {
      this.agentActive.delete(agentId);
    }
  }
  
  /**
   * Remove envelope from tracking (dequeue without execution)
   * 
   * @param {string} agentId - Agent ID
   * @param {string} envelopeId - Envelope ID
   */
  removeEnvelope(agentId, envelopeId) {
    if (!agentId) agentId = 'unknown';
    
    this.agentQueued.get(agentId)?.delete(envelopeId);
    this.agentActive.get(agentId)?.delete(envelopeId);
    
    // Clean up empty sets
    if (this.agentQueued.get(agentId)?.size === 0) {
      this.agentQueued.delete(agentId);
    }
    if (this.agentActive.get(agentId)?.size === 0) {
      this.agentActive.delete(agentId);
    }
  }
  
  /**
   * Get current budget state
   * 
   * @returns {object} Budget utilization by agent
   */
  getState() {
    const agents = {};
    
    // Collect all agent IDs
    const allAgents = new Set([
      ...this.agentQueued.keys(),
      ...this.agentActive.keys()
    ]);
    
    for (const agentId of allAgents) {
      const queued = this.agentQueued.get(agentId)?.size || 0;
      const active = this.agentActive.get(agentId)?.size || 0;
      
      agents[agentId] = {
        queued: {
          count: queued,
          limit: this.policy.max_queued_envelopes_per_agent,
          remaining: Math.max(0, this.policy.max_queued_envelopes_per_agent - queued)
        },
        active: {
          count: active,
          limit: this.policy.max_active_envelopes_per_agent,
          remaining: Math.max(0, this.policy.max_active_envelopes_per_agent - active)
        }
      };
    }
    
    return {
      agents,
      policy: { ...this.policy }
    };
  }
  
  /**
   * Reset all budget tracking (for testing / emergency)
   */
  reset() {
    this.agentQueued.clear();
    this.agentActive.clear();
  }
}

module.exports = AgentBudget;
