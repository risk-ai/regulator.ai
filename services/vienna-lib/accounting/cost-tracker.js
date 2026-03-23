/**
 * Cost Tracker
 * Phase 29: Resource Accounting
 * 
 * Tracks execution costs and enforces budget limits.
 */

class CostTracker {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Estimate cost for intent (before execution)
   * 
   * @param {Object} intent - Intent object
   * @returns {Promise<number>} Estimated cost in USD
   */
  async estimateCost(intent) {
    // Simple cost model: $0.01 per execution
    // TODO: Implement token-based cost calculation
    return 0.01;
  }

  /**
   * Check if tenant has available budget
   * 
   * @param {string} tenantId
   * @param {number} estimatedCost
   * @returns {Promise<Object>} { allowed, available, currency }
   */
  async checkBudget(tenantId, estimatedCost) {
    const tenant = this.stateGraph.getTenant(tenantId);
    
    if (!tenant) {
      // Default: unlimited budget for unknown tenants
      return {
        allowed: true,
        available: Infinity,
        currency: 'USD'
      };
    }

    const budgetLimit = tenant.budget_limit || Infinity;
    const budgetUsed = tenant.budget_used || 0;
    const available = budgetLimit - budgetUsed;

    const allowed = estimatedCost <= available;

    return {
      allowed,
      available,
      currency: 'USD'
    };
  }

  /**
   * Calculate actual cost after execution
   * 
   * @param {string} executionId
   * @returns {Promise<Object>} { amount, currency, breakdown }
   */
  async calculateActualCost(executionId) {
    // Query execution ledger for token usage
    // For now, return nominal cost
    return {
      amount: 0.01,
      currency: 'USD',
      breakdown: {
        input_tokens: 0,
        output_tokens: 0,
        model: 'unknown'
      }
    };
  }

  /**
   * Record cost to State Graph
   * 
   * @param {string} executionId
   * @param {string} tenantId
   * @param {number} amount
   * @param {Object} breakdown
   * @returns {Promise<void>}
   */
  async recordCost(executionId, tenantId, amount, breakdown) {
    const costId = `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.stateGraph.createExecutionCost(
      costId,
      executionId,
      tenantId,
      amount,
      'USD',
      breakdown,
      new Date().toISOString()
    );

    // Update tenant budget used
    const tenant = this.stateGraph.getTenant(tenantId);
    if (tenant) {
      const budgetUsed = (tenant.budget_used || 0) + amount;
      this.stateGraph.updateTenant(tenantId, { budget_used: budgetUsed });
    }
  }
}

module.exports = { CostTracker };
