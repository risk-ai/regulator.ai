/**
 * Assistant Status Routes
 * Phase 1: State Truth Model
 *
 * Provides unified assistant availability status (separate from provider health)
 */
import { Router } from 'express';
export function createAssistantRouter(vienna, providerHealthService) {
    const router = Router();
    /**
     * GET /api/v1/status/assistant
     *
     * Unified assistant availability status
     *
     * TRUTH LOGIC:
     * - available = at least one provider healthy OR unknown (untested but usable)
     *              AND no active cooldown
     *              AND runtime not critically degraded
     *
     * DISTINCT FROM PROVIDER HEALTH:
     * - Provider health: can Anthropic/Ollama respond?
     * - Assistant availability: can Vienna Chat accept operator messages?
     */
    router.get('/', async (req, res) => {
        try {
            const timestamp = new Date().toISOString();
            // Default response (assume available until proven otherwise)
            let available = true;
            let reason = null;
            let cooldown_until = null;
            let providers = {};
            let degraded = false;
            // Check provider health
            if (providerHealthService) {
                try {
                    const providerHealth = await providerHealthService.getProvidersHealth();
                    // Extract provider statuses
                    for (const [name, detail] of Object.entries(providerHealth.providers)) {
                        providers[name] = detail.status;
                    }
                    // Determine availability based on provider states
                    const providerStatuses = Object.values(providerHealth.providers);
                    // Count providers by status
                    const healthyCount = providerStatuses.filter(p => p.status === 'healthy').length;
                    const unknownCount = providerStatuses.filter(p => p.status === 'unknown').length;
                    const unavailableCount = providerStatuses.filter(p => p.status === 'unavailable').length;
                    const totalProviders = providerStatuses.length;
                    // TRUTH: Assistant available if ANY provider healthy OR unknown
                    // (unknown means "not yet tested", NOT failure)
                    const anyProviderUsable = (healthyCount + unknownCount) > 0;
                    // TRUTH: Assistant unavailable if ALL providers explicitly unavailable
                    const allProvidersUnavailable = unavailableCount === totalProviders && totalProviders > 0;
                    // Check for active cooldowns
                    const providersInCooldown = providerStatuses.filter(p => p.cooldownUntil !== null);
                    const allInCooldown = providersInCooldown.length === totalProviders && totalProviders > 0;
                    // Determine earliest cooldown expiry
                    if (providersInCooldown.length > 0) {
                        const cooldownTimes = providersInCooldown
                            .map(p => p.cooldownUntil ? new Date(p.cooldownUntil).getTime() : 0)
                            .filter(t => t > 0);
                        if (cooldownTimes.length > 0) {
                            const earliestCooldown = Math.min(...cooldownTimes);
                            cooldown_until = new Date(earliestCooldown).toISOString();
                        }
                    }
                    // Determine availability and reason
                    if (allProvidersUnavailable && allInCooldown) {
                        available = false;
                        reason = 'provider_cooldown';
                    }
                    else if (allProvidersUnavailable) {
                        available = false;
                        reason = 'no_providers';
                    }
                    else if (!anyProviderUsable) {
                        // No healthy or unknown providers (only degraded?)
                        available = false;
                        reason = 'service_unavailable';
                        degraded = true;
                    }
                }
                catch (error) {
                    console.error('[AssistantRouter] Error checking provider health:', error);
                    // If we can't check provider health, assume unavailable
                    available = false;
                    reason = 'service_unavailable';
                }
            }
            else {
                // No provider health service = can't determine availability
                available = false;
                reason = 'service_unavailable';
            }
            // TODO: Add runtime health check
            // For now, assume runtime healthy if we got this far
            const response = {
                success: true,
                data: {
                    available,
                    reason,
                    cooldown_until,
                    providers,
                    degraded,
                    timestamp,
                },
                timestamp,
            };
            res.json(response);
        }
        catch (error) {
            console.error('[AssistantRouter] Error getting assistant status:', error);
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ASSISTANT_STATUS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=assistant.js.map