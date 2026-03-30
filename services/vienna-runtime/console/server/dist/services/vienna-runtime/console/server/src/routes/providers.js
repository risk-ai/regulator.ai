/**
 * Provider Routes
 *
 * Model provider status and health.
 */
import { Router } from 'express';
export function createProvidersRouter(vienna, providerHealthService) {
    const router = Router();
    /**
     * GET /api/v1/providers
     * Get status of all model providers
     */
    router.get('/', async (req, res) => {
        try {
            const providers = await vienna.getProviders();
            res.json({
                success: true,
                data: providers,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ProvidersRoute] Error fetching providers:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PROVIDERS_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/providers/health
     * Get comprehensive health status for all providers
     * Phase 5D: Provider Health Truthfulness
     *
     * NOTE: Must be before /:providerName route to avoid conflict
     */
    router.get('/health', async (req, res) => {
        try {
            if (!providerHealthService) {
                res.status(503).json({
                    success: false,
                    error: 'Provider health service not available',
                    code: 'SERVICE_UNAVAILABLE',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const health = await providerHealthService.getProvidersHealth();
            res.json({
                success: true,
                data: health,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ProvidersRoute] Error fetching provider health:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PROVIDER_HEALTH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/providers/:providerName
     * Get status of specific provider
     */
    router.get('/:providerName', async (req, res) => {
        try {
            const { providerName } = req.params;
            const providers = await vienna.getProviders();
            const provider = providers.providers[providerName];
            if (!provider) {
                res.status(404).json({
                    success: false,
                    error: `Provider not found: ${providerName}`,
                    code: 'PROVIDER_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: provider,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ProvidersRoute] Error fetching provider:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PROVIDER_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/providers/:providerName/health
     * Get detailed health status for specific provider
     * Phase 5D: Provider Health Truthfulness
     */
    router.get('/:providerName/health', async (req, res) => {
        try {
            const { providerName } = req.params;
            if (!providerHealthService) {
                res.status(503).json({
                    success: false,
                    error: 'Provider health service not available',
                    code: 'SERVICE_UNAVAILABLE',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const health = await providerHealthService.getProviderHealth(providerName);
            if (!health) {
                res.status(404).json({
                    success: false,
                    error: `Provider health not found: ${providerName}`,
                    code: 'PROVIDER_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: health,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ProvidersRoute] Error fetching provider health:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PROVIDER_HEALTH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=providers.js.map