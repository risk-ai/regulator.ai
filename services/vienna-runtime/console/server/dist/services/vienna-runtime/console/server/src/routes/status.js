/**
 * Status Routes
 * GET /api/v1/status
 */
import { Router } from 'express';
export function createStatusRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/status
     * Top-bar system status snapshot
     */
    router.get('/', async (req, res) => {
        try {
            const status = await vienna.getSystemStatus();
            const response = {
                success: true,
                data: status,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'STATUS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=status.js.map