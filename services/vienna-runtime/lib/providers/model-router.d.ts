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
export class ModelRouter {
    constructor(options?: {});
    modelRegistry: any;
    providerHealthManager: any;
    runtimeModeManager: any;
    policies: {
        classification: {
            required_capabilities: string[];
            prefer_cost_class: string;
            fallback_to_cloud: boolean;
        };
        diagnostics: {
            required_capabilities: string[];
            prefer_cost_class: string;
            fallback_to_cloud: boolean;
        };
        complex_reasoning: {
            required_capabilities: string[];
            prefer_cost_class: string;
            fallback_to_cloud: boolean;
        };
        coding: {
            required_capabilities: string[];
            prefer_cost_class: string;
            fallback_to_cloud: boolean;
        };
        general: {
            required_capabilities: string[];
            prefer_cost_class: string;
            fallback_to_cloud: boolean;
        };
    };
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
    route(request: {
        task_type: string;
        operator: string;
        required_capabilities: Array<string>;
        max_cost_class: string;
    }): object;
    /**
     * Check if provider is healthy
     */
    isProviderHealthy(provider: any): boolean;
    /**
     * Get routing statistics
     */
    getStats(): {
        total_models: any;
        enabled_models: any;
        by_provider: {};
        by_cost_class: {};
    };
    /**
     * Test route (for diagnostics)
     */
    testRoute(taskType: any, operator?: string): any;
}
//# sourceMappingURL=model-router.d.ts.map