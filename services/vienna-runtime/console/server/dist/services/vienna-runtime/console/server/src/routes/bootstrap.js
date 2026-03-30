/**
 * Bootstrap Routes
 *
 * Unified dashboard initialization endpoint.
 * Returns consolidated initial state for Operator Shell.
 */
import { Router } from 'express';
export function createBootstrapRouter(bootstrapService) {
    const router = Router();
    /**
     * GET /api/v1/dashboard/bootstrap
     * Get unified initial state for dashboard
     */
    router.get('/', async (req, res) => {
        try {
            const includeCurrentThread = req.query.includeCurrentThread !== 'false';
            const chatHistoryLimit = req.query.chatHistoryLimit
                ? parseInt(req.query.chatHistoryLimit)
                : 50;
            const bootstrap = await bootstrapService.getBootstrap({
                includeCurrentThread,
                chatHistoryLimit,
            });
            res.json({
                success: true,
                data: bootstrap,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[BootstrapRoute] Error fetching bootstrap:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'BOOTSTRAP_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=bootstrap.js.map