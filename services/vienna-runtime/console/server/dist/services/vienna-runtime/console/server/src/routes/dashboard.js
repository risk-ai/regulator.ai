/**
 * Dashboard Routes
 * GET /api/v1/dashboard
 */
import { Router } from 'express';
export function createDashboardRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/dashboard
     * Bootstrap entire dashboard state in one request
     */
    router.get('/', async (req, res) => {
        try {
            const dashboard = await vienna.bootstrapDashboard();
            const response = {
                success: true,
                data: dashboard,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'DASHBOARD_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=dashboard.js.map