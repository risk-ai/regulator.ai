/**
 * Vienna Provider Capability Registry (Phase 6.5)
 * 
 * Defines provider capabilities and fallback chains for recovery copilot.
 * 
 * Design constraints:
 * - Providers propose, runtime executes
 * - No autonomous recovery execution
 * - Recovery copilot = diagnostic intelligence + proposals
 */

/**
 * Provider capability registry
 * 
 * Maps provider IDs to their capabilities and characteristics.
 */
const PROVIDER_REGISTRY = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    capabilities: [
      'planning',
      'synthesis',
      'final_output',
      'legal_reasoning',
    ],
    costTier: 'premium',
    fallbackTo: 'local',
    degradedModeEligible: false,
    alwaysAvailable: false,
    description: 'Premium LLM for high-quality reasoning and final outputs',
  },
  
  local: {
    id: 'local',
    name: 'Local LLM',
    capabilities: [
      'diagnostics',
      'summarization',
      'classification',
      'recovery_planning',
      'operator_copilot',
    ],
    costTier: 'free',
    fallbackTo: null,
    degradedModeEligible: true,
    alwaysAvailable: true,
    description: 'Local LLM for diagnostics, recovery guidance, and degraded-mode operations',
  },
  
  openclaw: {
    id: 'openclaw',
    name: 'OpenClaw',
    capabilities: [
      'planning',
      'synthesis',
      'diagnostics',
      'summarization',
      'classification',
    ],
    costTier: 'medium',
    fallbackTo: 'local',
    degradedModeEligible: true,
    alwaysAvailable: false,
    description: 'OpenClaw provider for general-purpose tasks',
  },
};

/**
 * Get provider spec by ID
 * 
 * @param {string} providerId
 * @returns {object|null}
 */
function getProviderSpec(providerId) {
  return PROVIDER_REGISTRY[providerId] || null;
}

/**
 * Get all providers with a given capability
 * 
 * @param {string} capability
 * @returns {Array<object>}
 */
function getProvidersWithCapability(capability) {
  return Object.values(PROVIDER_REGISTRY).filter(spec =>
    spec.capabilities.includes(capability)
  );
}

/**
 * Get preferred provider for a capability (lowest cost tier that's healthy)
 * 
 * @param {string} capability
 * @param {Set<string>} healthyProviders
 * @returns {object|null}
 */
function getPreferredProvider(capability, healthyProviders) {
  const tierOrder = {
    free: 0,
    low: 1,
    medium: 2,
    premium: 3,
  };
  
  const eligible = getProvidersWithCapability(capability)
    .filter(spec => healthyProviders.has(spec.id))
    .sort((a, b) => tierOrder[a.costTier] - tierOrder[b.costTier]);
  
  return eligible[0] || null;
}

/**
 * Get fallback chain for a provider
 * 
 * @param {string} providerId
 * @returns {Array<string>}
 */
function getFallbackChain(providerId) {
  const chain = [];
  let current = providerId;
  const seen = new Set();
  
  while (current && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    
    const spec = getProviderSpec(current);
    current = spec?.fallbackTo || null;
  }
  
  return chain;
}

/**
 * Get all providers eligible for degraded mode
 * 
 * @returns {Array<object>}
 */
function getDegradedModeProviders() {
  return Object.values(PROVIDER_REGISTRY).filter(spec => spec.degradedModeEligible);
}

/**
 * Get all always-available providers
 * 
 * @returns {Array<object>}
 */
function getAlwaysAvailableProviders() {
  return Object.values(PROVIDER_REGISTRY).filter(spec => spec.alwaysAvailable);
}

module.exports = {
  PROVIDER_REGISTRY,
  getProviderSpec,
  getProvidersWithCapability,
  getPreferredProvider,
  getFallbackChain,
  getDegradedModeProviders,
  getAlwaysAvailableProviders,
};
