/**
 * Decisions Routes
 * GET /api/v1/decisions
 *
 * Operator inbox - aggregated decision items requiring attention
 */
import { Router } from 'express';
export function createDecisionsRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/decisions
     * Get all items requiring operator decision
     */
    router.get('/', async (req, res) => {
        try {
            const decisions = await vienna.getDecisions();
            const response = {
                success: true,
                data: decisions,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'DECISIONS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=decisions.js.map