/**
 * Model Router
 * 
 * Phase 6.12: Model Control Layer
 * 
 * Routes tasks to appropriate models based on:
 * - Task type and requirements
 * - Provider health status
 * - Operator preferences
 * - Cost constraints
 * - Runtime mode (normal/degraded/local-only)
 * 
 * Routing Strategy:
 * 1. Check operator preference
 * 2. Check runtime mode constraints
 * 3. Filter by required capabilities
 * 4. Filter by provider health
 * 5. Sort by priority and cost
 * 6. Select best available model
 */

class ModelRouter {
  constructor(options = {}) {
    this.modelRegistry = options.modelRegistry; // ModelRegistry instance
    this.providerHealthManager = options.providerHealthManager; // Provider health tracker
    this.runtimeModeManager = options.runtimeModeManager; // Runtime mode state
    
    // Routing policies
    this.policies = {
      // Classification tasks: Use cheap local model if available
      classification: {
        required_capabilities: ['classification'],
        prefer_cost_class: 'free',
        fallback_to_cloud: true,
      },
      
      // Diagnostics: Use cheap model, fallback to cloud
      diagnostics: {
        required_capabilities: ['reasoning'],
        prefer_cost_class: 'low',
        fallback_to_cloud: true,
      },
      
      // Complex reasoning: Use high-capability model
      complex_reasoning: {
        required_capabilities: ['complex_reasoning'],
        prefer_cost_class: 'high',
        fallback_to_cloud: false,
      },
      
      // Coding: Use medium/high capability model
      coding: {
        required_capabilities: ['coding'],
        prefer_cost_class: 'medium',
        fallback_to_cloud: true,
      },
      
      // General chat: Use medium capability model
      general: {
        required_capabilities: ['reasoning'],
        prefer_cost_class: 'medium',
        fallback_to_cloud: true,
      },
    };
    
    console.log('[ModelRouter] Initialized');
  }
  
  /**
   * Route task to appropriate model
   * 
   * @param {object} request - Routing request
   * @param {string} request.task_type - Task type ('classification', 'diagnostics', etc.)
   * @param {string} request.operator - Operator making request
   * @param {Array<string>} request.required_capabilities - Required model capabilities
   * @param {string} request.max_cost_class - Maximum cost class allowed
   * @returns {object} Selected model or null
   */
  route(request) {
    const {
      task_type = 'general',
      operator,
      required_capabilities = [],
      max_cost_class,
    } = request;
    
    console.log(`[ModelRouter] Routing task: ${task_type} for operator: ${operator}`);
    
    // 1. Check operator preference
    if (operator) {
      const preference = this.modelRegistry.getOperatorPreference(operator, task_type);
      if (preference) {
        const model = this.modelRegistry.getModel(preference.model_id);
        if (model && model.status === 'enabled' && this.isProviderHealthy(model.provider)) {
          console.log(`[ModelRouter] Using operator preference: ${model.display_name}`);
          return {
            model,
            reason: 'operator_preference',
          };
        }
      }
    }
    
    // 2. Get routing policy
    const policy = this.policies[task_type] || this.policies.general;
    
    // 3. Check runtime mode constraints
    const runtimeMode = this.runtimeModeManager ? this.runtimeModeManager.getCurrentMode() : 'normal';
    const localOnly = runtimeMode === 'local-only';
    
    // 4. Get enabled models
    let candidates = this.modelRegistry.getEnabledModels();
    
    // 5. Filter by runtime mode
    if (localOnly) {
      candidates = candidates.filter(m => m.metadata?.local === true);
      console.log(`[ModelRouter] Runtime mode: local-only, ${candidates.length} candidates`);
    }
    
    // 6. Filter by required capabilities
    const allRequiredCapabilities = [
      ...policy.required_capabilities,
      ...required_capabilities,
    ];
    
    if (allRequiredCapabilities.length > 0) {
      candidates = candidates.filter(m => 
        allRequiredCapabilities.every(cap => m.capabilities.includes(cap))
      );
    }
    
    // 7. Filter by provider health
    candidates = candidates.filter(m => this.isProviderHealthy(m.provider));
    
    // 8. Filter by max cost class
    if (max_cost_class) {
      const costOrder = ['free', 'low', 'medium', 'high'];
      const maxIndex = costOrder.indexOf(max_cost_class);
      candidates = candidates.filter(m => {
        const modelIndex = costOrder.indexOf(m.cost_class);
        return modelIndex <= maxIndex;
      });
    }
    
    // 9. No candidates available
    if (candidates.length === 0) {
      console.error(`[ModelRouter] No models available for task: ${task_type}`);
      return null;
    }
    
    // 10. Sort by priority and cost preference
    const costOrder = ['free', 'low', 'medium', 'high'];
    const preferCostIndex = costOrder.indexOf(policy.prefer_cost_class);
    
    candidates.sort((a, b) => {
      // First priority: cost class preference (closer to preferred = better)
      const aCostIndex = costOrder.indexOf(a.cost_class);
      const bCostIndex = costOrder.indexOf(b.cost_class);
      const aCostDist = Math.abs(aCostIndex - preferCostIndex);
      const bCostDist = Math.abs(bCostIndex - preferCostIndex);
      
      if (aCostDist !== bCostDist) {
        return aCostDist - bCostDist;
      }
      
      // Second priority: model priority
      return b.priority - a.priority;
    });
    
    const selected = candidates[0];
    
    console.log(`[ModelRouter] Selected model: ${selected.display_name} (${selected.model_id})`);
    
    return {
      model: selected,
      reason: 'policy_match',
      alternatives: candidates.slice(1, 3), // Return top 2 alternatives
    };
  }
  
  /**
   * Check if provider is healthy
   */
  isProviderHealthy(provider) {
    if (!this.providerHealthManager) {
      return true; // Assume healthy if no health manager
    }
    
    try {
      const health = this.providerHealthManager.getProviderHealth(provider);
      return health && health.status !== 'unavailable';
    } catch {
      return true; // Default to healthy on error
    }
  }
  
  /**
   * Get routing statistics
   */
  getStats() {
    const models = this.modelRegistry.getAllModels();
    const enabled = models.filter(m => m.status === 'enabled');
    const byProvider = {};
    const byCostClass = {};
    
    for (const model of enabled) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
      byCostClass[model.cost_class] = (byCostClass[model.cost_class] || 0) + 1;
    }
    
    return {
      total_models: models.length,
      enabled_models: enabled.length,
      by_provider: byProvider,
      by_cost_class: byCostClass,
    };
  }
  
  /**
   * Test route (for diagnostics)
   */
  testRoute(taskType, operator = 'test') {
    return this.route({ task_type: taskType, operator });
  }
}

module.exports = { ModelRouter };
