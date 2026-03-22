/**
 * Provider Factory (Phase 6.6)
 * 
 * Creates and registers LLM providers with ProviderHealthManager.
 * Handles Anthropic and Local provider initialization.
 */

const { AnthropicProvider } = require('./anthropic/client.js');
const { LocalProvider } = require('./local/client.js');

/**
 * Create and register Anthropic provider
 * 
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Provider instance
 */
async function createAnthropicProvider(healthManager, config = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY || config.apiKey;
  
  if (!apiKey) {
    console.warn('[ProviderFactory] ANTHROPIC_API_KEY not set, skipping Anthropic provider');
    return null;
  }
  
  try {
    const provider = new AnthropicProvider({
      apiKey,
      defaultModel: config.defaultModel || 'claude-sonnet-4-5',
      classificationModel: config.classificationModel || 'claude-haiku-4-5-20251001',
    });
    
    // Register with health manager
    healthManager.registerProvider('anthropic', provider);
    
    console.log('[ProviderFactory] Created Anthropic provider');
    return provider;
  } catch (error) {
    console.error('[ProviderFactory] Failed to create Anthropic provider:', error);
    return null;
  }
}

/**
 * Create and register Local provider (Ollama)
 * 
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Provider instance
 */
async function createLocalProvider(healthManager, config = {}) {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || config.baseUrl || 'http://127.0.0.1:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || config.model || 'qwen2.5:0.5b';
  
  try {
    const provider = new LocalProvider({
      baseUrl: ollamaUrl,
      model: ollamaModel,
      contextSize: config.contextSize || 8192,
    });
    
    // Register with health manager
    healthManager.registerProvider('local', provider);
    
    console.log('[ProviderFactory] Created Local provider (Ollama)');
    return provider;
  } catch (error) {
    console.error('[ProviderFactory] Failed to create Local provider:', error);
    return null;
  }
}

/**
 * Initialize all providers
 * 
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Map of provider instances
 */
async function initializeProviders(healthManager, config = {}) {
  console.log('[ProviderFactory] Initializing providers...');
  
  const providers = {
    anthropic: null,
    local: null,
  };
  
  // Create Anthropic provider
  providers.anthropic = await createAnthropicProvider(
    healthManager,
    config.anthropic || {}
  );
  
  // Create Local provider
  providers.local = await createLocalProvider(
    healthManager,
    config.local || {}
  );
  
  // Start health monitoring
  healthManager.start();
  
  const registeredCount = Object.values(providers).filter(p => p !== null).length;
  console.log(`[ProviderFactory] Initialized ${registeredCount}/2 providers`);
  
  return providers;
}

/**
 * Get active provider for chat (fallback chain: anthropic → local)
 * 
 * @param {ProviderHealthManager} healthManager
 * @param {object} providers
 * @returns {object|null} Active provider instance
 */
function getActiveProvider(healthManager, providers) {
  // Check Anthropic first
  if (providers.anthropic) {
    const anthropicHealth = healthManager.checkAvailability('anthropic');
    if (anthropicHealth.available) {
      return {
        name: 'anthropic',
        instance: providers.anthropic,
      };
    }
  }
  
  // Fall back to local
  if (providers.local) {
    const localHealth = healthManager.checkAvailability('local');
    if (localHealth.available) {
      return {
        name: 'local',
        instance: providers.local,
      };
    }
  }
  
  // No providers available
  return null;
}

module.exports = {
  createAnthropicProvider,
  createLocalProvider,
  initializeProviders,
  getActiveProvider,
};
