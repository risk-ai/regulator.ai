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
class ModelRegistry {
    constructor() {
        this.models = new Map();
        this.initializeDefaultModels();
        this.operatorOverrides = new Map(); // operator-level model preferences
        console.log('[ModelRegistry] Initialized with', this.models.size, 'models');
    }
    /**
     * Initialize default model registry
     */
    initializeDefaultModels() {
        // Anthropic Claude Sonnet 4.5
        this.registerModel({
            model_id: 'anthropic_claude_sonnet_4_5',
            provider: 'anthropic',
            display_name: 'Claude Sonnet 4.5',
            capabilities: ['reasoning', 'coding', 'analysis', 'tool_use', 'complex_reasoning'],
            cost_class: 'high',
            priority: 100,
            status: 'enabled',
            context_window: 200000,
            supports_streaming: true,
            metadata: {
                input_cost_per_m: 3.0,
                output_cost_per_m: 15.0,
            },
        });
        // Anthropic Claude Haiku 4
        this.registerModel({
            model_id: 'anthropic_claude_haiku_4',
            provider: 'anthropic',
            display_name: 'Claude Haiku 4',
            capabilities: ['reasoning', 'coding', 'tool_use', 'fast_response'],
            cost_class: 'low',
            priority: 50,
            status: 'enabled',
            context_window: 200000,
            supports_streaming: true,
            metadata: {
                input_cost_per_m: 0.3,
                output_cost_per_m: 1.5,
            },
        });
        // Ollama Qwen 2.5 (0.5B)
        this.registerModel({
            model_id: 'ollama_qwen2_5_0_5b',
            provider: 'ollama',
            display_name: 'Qwen 2.5 (0.5B)',
            capabilities: ['classification', 'simple_reasoning', 'local'],
            cost_class: 'free',
            priority: 10,
            status: 'enabled',
            context_window: 32768,
            supports_streaming: true,
            metadata: {
                model_size_gb: 0.4,
                local: true,
            },
        });
        // Ollama Qwen 2.5 (3B)
        this.registerModel({
            model_id: 'ollama_qwen2_5_3b',
            provider: 'ollama',
            display_name: 'Qwen 2.5 (3B)',
            capabilities: ['reasoning', 'coding', 'analysis', 'local'],
            cost_class: 'free',
            priority: 30,
            status: 'enabled',
            context_window: 32768,
            supports_streaming: true,
            metadata: {
                model_size_gb: 2.0,
                local: true,
            },
        });
    }
    /**
     * Register a model
     */
    registerModel(model) {
        if (!model.model_id) {
            throw new Error('Model must have model_id');
        }
        this.models.set(model.model_id, {
            ...model,
            registered_at: new Date().toISOString(),
        });
        console.log(`[ModelRegistry] Registered model: ${model.display_name} (${model.model_id})`);
    }
    /**
     * Get model by ID
     */
    getModel(modelId) {
        return this.models.get(modelId) || null;
    }
    /**
     * Get all models
     */
    getAllModels() {
        return Array.from(this.models.values());
    }
    /**
     * Get models by provider
     */
    getModelsByProvider(provider) {
        return Array.from(this.models.values()).filter(m => m.provider === provider);
    }
    /**
     * Get models by capability
     */
    getModelsByCapability(capability) {
        return Array.from(this.models.values()).filter(m => m.capabilities.includes(capability));
    }
    /**
     * Get enabled models
     */
    getEnabledModels() {
        return Array.from(this.models.values()).filter(m => m.status === 'enabled');
    }
    /**
     * Update model status
     */
    updateModelStatus(modelId, status) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }
        model.status = status;
        model.updated_at = new Date().toISOString();
        console.log(`[ModelRegistry] Updated model status: ${modelId} -> ${status}`);
        return model;
    }
    /**
     * Set operator model preference
     *
     * Allows operator to override default model routing for specific tasks.
     */
    setOperatorPreference(operator, taskType, modelId) {
        const key = `${operator}:${taskType}`;
        // Validate model exists
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }
        this.operatorOverrides.set(key, {
            operator,
            task_type: taskType,
            model_id: modelId,
            set_at: new Date().toISOString(),
        });
        console.log(`[ModelRegistry] Operator preference set: ${key} -> ${modelId}`);
    }
    /**
     * Get operator model preference
     */
    getOperatorPreference(operator, taskType) {
        const key = `${operator}:${taskType}`;
        return this.operatorOverrides.get(key) || null;
    }
    /**
     * Clear operator preference
     */
    clearOperatorPreference(operator, taskType) {
        const key = `${operator}:${taskType}`;
        this.operatorOverrides.delete(key);
        console.log(`[ModelRegistry] Cleared operator preference: ${key}`);
    }
    /**
     * Get all operator preferences
     */
    getAllOperatorPreferences(operator) {
        const preferences = [];
        for (const [key, pref] of this.operatorOverrides.entries()) {
            if (pref.operator === operator) {
                preferences.push(pref);
            }
        }
        return preferences;
    }
}
module.exports = { ModelRegistry };
//# sourceMappingURL=model-registry.js.map