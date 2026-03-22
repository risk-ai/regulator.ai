/**
 * Vienna Economic Model
 * 
 * Cost accounting, budget enforcement, resource-aware scheduling.
 */

/**
 * Cost Model for Actions
 */
class CostModel {
  constructor() {
    // Base cost table (in abstract cost units)
    this.baseCosts = {
      // Compute classes
      'compute:light': 1,
      'compute:medium': 5,
      'compute:heavy': 20,
      'compute:intensive': 100,

      // LLM inference
      'llm:haiku:1k_tokens': 0.25,
      'llm:sonnet:1k_tokens': 3.0,
      'llm:opus:1k_tokens': 15.0,

      // Network operations
      'network:http_request': 0.1,
      'network:large_payload': 1.0,
      'network:distributed_call': 5.0,

      // Storage operations
      'storage:read': 0.1,
      'storage:write': 0.5,
      'storage:delete': 0.2,

      // Verification operations
      'verification:simple': 1,
      'verification:complex': 5,

      // Service operations
      'service:restart': 10,
      'service:health_check': 1
    };
  }

  /**
   * Estimate cost for an action
   */
  estimateCost(action, context = {}) {
    let cost = 0;

    // Base action cost
    const actionType = action.action_type || action.type;
    const computeClass = action.compute_class || 'compute:medium';
    cost += this.baseCosts[computeClass] || 5;

    // Add LLM costs if applicable
    if (action.requires_llm) {
      const model = action.llm_model || context.default_model || 'sonnet';
      const tokens = action.estimated_tokens || 1000;
      const costPer1k = this.baseCosts[`llm:${model}:1k_tokens`] || 3.0;
      cost += (tokens / 1000) * costPer1k;
    }

    // Add network costs
    if (action.network_operations) {
      const networkOps = Array.isArray(action.network_operations) 
        ? action.network_operations.length 
        : action.network_operations;
      cost += networkOps * (this.baseCosts['network:http_request'] || 0.1);
    }

    // Add storage costs
    if (action.storage_operations) {
      for (const op of action.storage_operations) {
        cost += this.baseCosts[`storage:${op}`] || 0.5;
      }
    }

    // Add verification costs
    if (action.verification_required) {
      const verificationComplexity = action.verification_complexity || 'simple';
      cost += this.baseCosts[`verification:${verificationComplexity}`] || 1;
    }

    // Priority multiplier
    if (action.priority) {
      const multipliers = { low: 0.5, normal: 1.0, high: 1.5, critical: 2.0 };
      cost *= multipliers[action.priority] || 1.0;
    }

    return Math.ceil(cost); // Round up to nearest cost unit
  }

  /**
   * Estimate cost for a plan
   */
  estimatePlanCost(plan, context = {}) {
    let totalCost = 0;

    if (plan.steps && Array.isArray(plan.steps)) {
      for (const step of plan.steps) {
        totalCost += this.estimateCost(step, context);
      }
    }

    // Add orchestration overhead
    const orchestrationCost = plan.steps ? plan.steps.length * 0.5 : 0;
    totalCost += orchestrationCost;

    return Math.ceil(totalCost);
  }

  /**
   * Record actual cost
   */
  recordActualCost(executionId, actualCost, breakdown = {}) {
    return {
      execution_id: executionId,
      actual_cost: actualCost,
      breakdown,
      recorded_at: new Date().toISOString()
    };
  }
}

/**
 * Budget Model
 */
class Budget {
  constructor(data) {
    this.budget_id = data.budget_id;
    this.scope = data.scope; // 'tenant', 'workspace', 'objective', 'operator'
    this.scope_id = data.scope_id;
    this.limit = data.limit; // Cost units
    this.spent = data.spent || 0;
    this.reserved = data.reserved || 0;
    this.period = data.period || 'monthly'; // 'daily', 'weekly', 'monthly', 'annual'
    this.period_start = data.period_start || new Date().toISOString();
    this.period_end = data.period_end || this._calculatePeriodEnd(data.period_start, data.period);
    this.status = data.status || 'active';
  }

  /**
   * Check if budget can accommodate cost
   */
  canAfford(estimatedCost) {
    const available = this.limit - (this.spent + this.reserved);
    return available >= estimatedCost;
  }

  /**
   * Reserve budget for planned execution
   */
  reserve(estimatedCost) {
    if (!this.canAfford(estimatedCost)) {
      throw new Error(`BUDGET_EXCEEDED: Cannot reserve ${estimatedCost} units (available: ${this.getAvailable()})`);
    }
    this.reserved += estimatedCost;
    return this.reserved;
  }

  /**
   * Release reserved budget
   */
  releaseReservation(reservedCost) {
    this.reserved = Math.max(0, this.reserved - reservedCost);
    return this.reserved;
  }

  /**
   * Charge actual cost
   */
  charge(actualCost) {
    this.spent += actualCost;
    return this.spent;
  }

  /**
   * Get available budget
   */
  getAvailable() {
    return this.limit - (this.spent + this.reserved);
  }

  /**
   * Get utilization percentage
   */
  getUtilization() {
    return ((this.spent + this.reserved) / this.limit) * 100;
  }

  /**
   * Check if budget is exhausted
   */
  isExhausted() {
    return this.getAvailable() <= 0;
  }

  /**
   * Calculate period end
   */
  _calculatePeriodEnd(periodStart, period) {
    const start = new Date(periodStart);
    switch (period) {
      case 'daily':
        return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(start.setMonth(start.getMonth() + 1)).toISOString();
      case 'annual':
        return new Date(start.setFullYear(start.getFullYear() + 1)).toISOString();
      default:
        return new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  toJSON() {
    return {
      budget_id: this.budget_id,
      scope: this.scope,
      scope_id: this.scope_id,
      limit: this.limit,
      spent: this.spent,
      reserved: this.reserved,
      available: this.getAvailable(),
      utilization: this.getUtilization(),
      period: this.period,
      period_start: this.period_start,
      period_end: this.period_end,
      status: this.status
    };
  }
}

/**
 * Budget Manager
 */
class BudgetManager {
  constructor() {
    this.budgets = new Map();
    this.costModel = new CostModel();
  }

  /**
   * Create a budget
   */
  createBudget(budgetData) {
    const budget = new Budget({
      budget_id: budgetData.budget_id || this._generateBudgetId(),
      ...budgetData
    });
    this.budgets.set(budget.budget_id, budget);
    return budget;
  }

  /**
   * Get budget by ID
   */
  getBudget(budgetId) {
    return this.budgets.get(budgetId);
  }

  /**
   * Get budget for scope
   */
  getBudgetForScope(scope, scopeId) {
    for (const budget of this.budgets.values()) {
      if (budget.scope === scope && budget.scope_id === scopeId && budget.status === 'active') {
        return budget;
      }
    }
    return null;
  }

  /**
   * Check if action can be afforded
   */
  async checkAffordability(action, context) {
    const estimatedCost = this.costModel.estimateCost(action, context);
    
    const checks = [];

    // Check tenant budget
    if (context.tenant_id) {
      const tenantBudget = this.getBudgetForScope('tenant', context.tenant_id);
      if (tenantBudget) {
        checks.push({
          scope: 'tenant',
          budget_id: tenantBudget.budget_id,
          can_afford: tenantBudget.canAfford(estimatedCost),
          available: tenantBudget.getAvailable(),
          estimated_cost: estimatedCost
        });
      }
    }

    // Check workspace budget
    if (context.workspace_id) {
      const workspaceBudget = this.getBudgetForScope('workspace', context.workspace_id);
      if (workspaceBudget) {
        checks.push({
          scope: 'workspace',
          budget_id: workspaceBudget.budget_id,
          can_afford: workspaceBudget.canAfford(estimatedCost),
          available: workspaceBudget.getAvailable(),
          estimated_cost: estimatedCost
        });
      }
    }

    // Check operator budget
    if (context.operator_id) {
      const operatorBudget = this.getBudgetForScope('operator', context.operator_id);
      if (operatorBudget) {
        checks.push({
          scope: 'operator',
          budget_id: operatorBudget.budget_id,
          can_afford: operatorBudget.canAfford(estimatedCost),
          available: operatorBudget.getAvailable(),
          estimated_cost: estimatedCost
        });
      }
    }

    const allAffordable = checks.every(c => c.can_afford);

    return {
      affordable: allAffordable,
      estimated_cost: estimatedCost,
      checks
    };
  }

  /**
   * Reserve budget for execution
   */
  async reserveBudget(executionId, estimatedCost, context) {
    const reservations = [];

    // Reserve from tenant budget
    if (context.tenant_id) {
      const budget = this.getBudgetForScope('tenant', context.tenant_id);
      if (budget) {
        budget.reserve(estimatedCost);
        reservations.push({ scope: 'tenant', budget_id: budget.budget_id, amount: estimatedCost });
      }
    }

    // Reserve from workspace budget
    if (context.workspace_id) {
      const budget = this.getBudgetForScope('workspace', context.workspace_id);
      if (budget) {
        budget.reserve(estimatedCost);
        reservations.push({ scope: 'workspace', budget_id: budget.budget_id, amount: estimatedCost });
      }
    }

    return {
      execution_id: executionId,
      reservations,
      total_reserved: estimatedCost
    };
  }

  /**
   * Charge actual cost after execution
   */
  async chargeExecution(executionId, actualCost, estimatedCost, context) {
    const charges = [];

    // Release reservation and charge actual
    if (context.tenant_id) {
      const budget = this.getBudgetForScope('tenant', context.tenant_id);
      if (budget) {
        budget.releaseReservation(estimatedCost);
        budget.charge(actualCost);
        charges.push({ scope: 'tenant', budget_id: budget.budget_id, amount: actualCost });
      }
    }

    if (context.workspace_id) {
      const budget = this.getBudgetForScope('workspace', context.workspace_id);
      if (budget) {
        budget.releaseReservation(estimatedCost);
        budget.charge(actualCost);
        charges.push({ scope: 'workspace', budget_id: budget.budget_id, amount: actualCost });
      }
    }

    return {
      execution_id: executionId,
      charges,
      total_charged: actualCost
    };
  }

  /**
   * List budgets
   */
  listBudgets(filters = {}) {
    let budgets = Array.from(this.budgets.values());

    if (filters.scope) {
      budgets = budgets.filter(b => b.scope === filters.scope);
    }
    if (filters.scope_id) {
      budgets = budgets.filter(b => b.scope_id === filters.scope_id);
    }
    if (filters.status) {
      budgets = budgets.filter(b => b.status === filters.status);
    }

    return budgets;
  }

  /**
   * Generate budget ID
   */
  _generateBudgetId() {
    return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global budget manager instance
 */
let globalBudgetManager = null;

function getBudgetManager() {
  if (!globalBudgetManager) {
    globalBudgetManager = new BudgetManager();
  }
  return globalBudgetManager;
}

module.exports = {
  CostModel,
  Budget,
  BudgetManager,
  getBudgetManager
};
