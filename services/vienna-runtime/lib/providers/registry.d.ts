export namespace PROVIDER_REGISTRY {
    namespace anthropic {
        let id: string;
        let name: string;
        let capabilities: string[];
        let costTier: string;
        let fallbackTo: string;
        let degradedModeEligible: boolean;
        let alwaysAvailable: boolean;
        let description: string;
    }
    namespace local {
        let id_1: string;
        export { id_1 as id };
        let name_1: string;
        export { name_1 as name };
        let capabilities_1: string[];
        export { capabilities_1 as capabilities };
        let costTier_1: string;
        export { costTier_1 as costTier };
        let fallbackTo_1: any;
        export { fallbackTo_1 as fallbackTo };
        let degradedModeEligible_1: boolean;
        export { degradedModeEligible_1 as degradedModeEligible };
        let alwaysAvailable_1: boolean;
        export { alwaysAvailable_1 as alwaysAvailable };
        let description_1: string;
        export { description_1 as description };
    }
    namespace openclaw {
        let id_2: string;
        export { id_2 as id };
        let name_2: string;
        export { name_2 as name };
        let capabilities_2: string[];
        export { capabilities_2 as capabilities };
        let costTier_2: string;
        export { costTier_2 as costTier };
        let fallbackTo_2: string;
        export { fallbackTo_2 as fallbackTo };
        let degradedModeEligible_2: boolean;
        export { degradedModeEligible_2 as degradedModeEligible };
        let alwaysAvailable_2: boolean;
        export { alwaysAvailable_2 as alwaysAvailable };
        let description_2: string;
        export { description_2 as description };
    }
}
/**
 * Get provider spec by ID
 *
 * @param {string} providerId
 * @returns {object|null}
 */
export function getProviderSpec(providerId: string): object | null;
/**
 * Get all providers with a given capability
 *
 * @param {string} capability
 * @returns {Array<object>}
 */
export function getProvidersWithCapability(capability: string): Array<object>;
/**
 * Get preferred provider for a capability (lowest cost tier that's healthy)
 *
 * @param {string} capability
 * @param {Set<string>} healthyProviders
 * @returns {object|null}
 */
export function getPreferredProvider(capability: string, healthyProviders: Set<string>): object | null;
/**
 * Get fallback chain for a provider
 *
 * @param {string} providerId
 * @returns {Array<string>}
 */
export function getFallbackChain(providerId: string): Array<string>;
/**
 * Get all providers eligible for degraded mode
 *
 * @returns {Array<object>}
 */
export function getDegradedModeProviders(): Array<object>;
/**
 * Get all always-available providers
 *
 * @returns {Array<object>}
 */
export function getAlwaysAvailableProviders(): Array<object>;
//# sourceMappingURL=registry.d.ts.map