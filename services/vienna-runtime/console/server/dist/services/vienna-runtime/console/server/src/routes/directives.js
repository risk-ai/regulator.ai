/**
 * Directives Routes
 * POST /api/v1/directives
 *
 * Operator command submission via Vienna
 */
import { Router } from 'express';
export function createDirectivesRouter(vienna) {
    const router = Router();
    /**
     * POST /api/v1/directives
     * Submit directive to Vienna
     */
    router.post('/', async (req, res) => {
        try {
            const request = req.body;
            if (!request.operator || !request.text || !request.risk_tier) {
                const err = {
                    success: false,
                    error: 'Missing required fields: operator, text, risk_tier',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            // Validate risk tier
            if (!['T0', 'T1', 'T2'].includes(request.risk_tier)) {
                const err = {
                    success: false,
                    error: 'Invalid risk_tier: must be T0, T1, or T2',
                    code: 'INVALID_RISK_TIER',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = await vienna.submitDirective(request);
            const responseData = {
                success: true,
                directive_id: result.directive_id,
                objective_id: result.objective_id,
                created_at: result.created_at,
            };
            const response = {
                success: true,
                data: responseData,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'DIRECTIVE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=directives.js.map