/**
 * Events Router
 *
 * SSE stream endpoints and event management
 */
import { Router } from 'express';
import { handleSSEConnection, getSSEStats, getRecentEvents, emitTestEvent } from '../sse/sseHandler.js';
import { eventBus } from '../services/eventBus.js';
export function createEventsRouter() {
    const router = Router();
    /**
     * GET /api/v1/events/stream
     * SSE endpoint for real-time event streaming
     * Query params:
     * - types: comma-separated list of event types to filter
     * - tenant_id: tenant isolation (required)
     */
    router.get('/stream', handleSSEConnection);
    /**
     * GET /api/v1/events/stats
     * Get SSE and event bus statistics
     */
    router.get('/stats', getSSEStats);
    /**
     * GET /api/v1/events/recent
     * Get recent events for debugging
     * Query params:
     * - tenant_id: required
     * - limit: max events to return (default 50)
     */
    router.get('/recent', getRecentEvents);
    /**
     * POST /api/v1/events/test
     * Emit a test event (development only)
     */
    router.post('/test', emitTestEvent);
    /**
     * GET /api/v1/events/bus/stats
     * Get detailed event bus statistics
     */
    router.get('/bus/stats', (req, res) => {
        try {
            const stats = eventBus.getStats();
            const eventCounts = eventBus.getEventCounts();
            res.json({
                success: true,
                data: {
                    ...stats,
                    eventCounts,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[Events] Error getting event bus stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get event bus statistics',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * DELETE /api/v1/events/bus/subscriptions
     * Clear all internal event subscriptions (admin/testing only)
     */
    router.delete('/bus/subscriptions', (req, res) => {
        try {
            eventBus.clearSubscriptions();
            res.json({
                success: true,
                message: 'All event bus subscriptions cleared',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[Events] Error clearing subscriptions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear subscriptions',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=events.js.map