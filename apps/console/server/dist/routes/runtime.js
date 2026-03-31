/**
 * Runtime Routes
 *
 * Real-time execution visibility for Envelope Visualizer.
 * Shows envelope state, dependencies, warrants, verification.
 */
import { Router } from 'express';
export function createRuntimeRouter(vienna, statsService) {
    const router = Router();
    /**
     * GET /api/v1/runtime/envelopes
     * List all envelopes (recent first)
     */
    router.get('/envelopes', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const status = req.query.status;
            const objectiveId = req.query.objective_id;
            const envelopes = await vienna.getRuntimeEnvelopes({
                limit,
                status,
                objectiveId,
            });
            res.json({
                success: true,
                data: envelopes,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[RuntimeRoute] Error fetching envelopes:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'RUNTIME_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/runtime/envelopes/:id
     * Get envelope detail
     */
    router.get('/envelopes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const envelope = await vienna.getRuntimeEnvelope(id);
            if (!envelope) {
                res.status(404).json({
                    success: false,
                    error: `Envelope not found: ${id}`,
                    code: 'ENVELOPE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: envelope,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[RuntimeRoute] Error fetching envelope:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'RUNTIME_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/runtime/objectives/:id/execution
     * Get execution tree for objective
     */
    router.get('/objectives/:id/execution', async (req, res) => {
        try {
            const { id } = req.params;
            const execution = await vienna.getObjectiveExecution(id);
            if (!execution) {
                res.status(404).json({
                    success: false,
                    error: `Objective execution not found: ${id}`,
                    code: 'OBJECTIVE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: execution,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[RuntimeRoute] Error fetching objective execution:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'RUNTIME_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/runtime/stats
     * Get runtime statistics (Phase 5C)
     */
    router.get('/stats', async (req, res) => {
        if (!statsService) {
            res.status(503).json({
                success: false,
                error: 'Runtime stats service not available',
                code: 'STATS_SERVICE_UNAVAILABLE',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        try {
            const window = req.query.window || '5m';
            // Validate window
            const validWindows = ['5m', '15m', '1h', '24h'];
            if (!validWindows.includes(window)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid time window. Must be one of: ${validWindows.join(', ')}`,
                    code: 'INVALID_WINDOW',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const stats = await statsService.getRuntimeStats(window);
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[RuntimeRoute] Error fetching stats:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'RUNTIME_STATS_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=runtime.js.map