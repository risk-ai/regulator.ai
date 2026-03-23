/**
 * Model Registry
 *
 * Phase 6.12: Model Control Layer
 *
 * Centralized registry of available LLM models and their capabilities.
 * Supports operator controls for model routing and fallback behavior.
 *
 * Model Metadata:
 * - model_id: Unique identifier (e.g., 'anthropic_claude_sonnet_4_5')
 * - provider: Provider name ('anthropic', 'ollama')
 * - capabilities: Array of capability tags
 * - cost_class: 'free' | 'low' | 'medium' | 'high'
 * - priority: Routing priority (higher = preferred)
 * - status: 'enabled' | 'disabled' | 'maintenance'
 * - context_window: Max tokens
 * - supports_streaming: boolean
 */
export class ModelRegistry {
    models: Map<any, any>;
    operatorOverrides: Map<any, any>;
    /**
     * Initialize default model registry
     */
    initializeDefaultModels(): void;
    /**
     * Register a model
     */
    registerModel(model: any): void;
    /**
     * Get model by ID
     */
    getModel(modelId: any): any;
    /**
     * Get all models
     */
    getAllModels(): any[];
    /**
     * Get models by provider
     */
    getModelsByProvider(provider: any): any[];
    /**
     * Get models by capability
     */
    getModelsByCapability(capability: any): any[];
    /**
     * Get enabled models
     */
    getEnabledModels(): any[];
    /**
     * Update model status
     */
    updateModelStatus(modelId: any, status: any): any;
    /**
     * Set operator model preference
     *
     * Allows operator to override default model routing for specific tasks.
     */
    setOperatorPreference(operator: any, taskType: any, modelId: any): void;
    /**
     * Get operator model preference
     */
    getOperatorPreference(operator: any, taskType: any): any;
    /**
     * Clear operator preference
     */
    clearOperatorPreference(operator: any, taskType: any): void;
    /**
     * Get all operator preferences
     */
    getAllOperatorPreferences(operator: any): any[];
}
//# sourceMappingURL=model-registry.d.ts.map