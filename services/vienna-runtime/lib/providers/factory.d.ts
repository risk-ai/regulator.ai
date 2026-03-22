/**
 * Create and register Anthropic provider
 *
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Provider instance
 */
export function createAnthropicProvider(healthManager: ProviderHealthManager, config?: object): Promise<object>;
/**
 * Create and register Local provider (Ollama)
 *
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Provider instance
 */
export function createLocalProvider(healthManager: ProviderHealthManager, config?: object): Promise<object>;
/**
 * Initialize all providers
 *
 * @param {ProviderHealthManager} healthManager
 * @param {object} config
 * @returns {Promise<object>} Map of provider instances
 */
export function initializeProviders(healthManager: ProviderHealthManager, config?: object): Promise<object>;
/**
 * Get active provider for chat (fallback chain: anthropic → local)
 *
 * @param {ProviderHealthManager} healthManager
 * @param {object} providers
 * @returns {object|null} Active provider instance
 */
export function getActiveProvider(healthManager: ProviderHealthManager, providers: object): object | null;
//# sourceMappingURL=factory.d.ts.map