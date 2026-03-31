/**
 * Replay Routes
 *
 * GET /api/v1/replay
 * GET /api/v1/replay/:envelopeId
 */
import { Router } from 'express';
export function createReplayRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/replay
     * Query replay log with filters
     */
    router.get('/', async (req, res) => {
        try {
            const params = {
                objective_id: req.query.objective_id,
                envelope_id: req.query.envelope_id,
                event_type: req.query.event_type,
                start: req.query.start,
                end: req.query.end,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            };
            const result = await vienna.queryReplay(params);
            const responseData = {
                events: result.events,
                total: result.total,
                has_more: result.has_more,
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
                code: 'REPLAY_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/replay/:envelopeId
     * Get all replay events for specific envelope
     */
    router.get('/:envelopeId', async (req, res) => {
        try {
            const events = await vienna.getEnvelopeReplay(req.params.envelopeId);
            const response = {
                success: true,
                data: events,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ENVELOPE_REPLAY_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=replay.js.map