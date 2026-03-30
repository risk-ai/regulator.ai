/**
 * Execution Routes
 *
 * GET    /api/v1/execution/active
 * GET    /api/v1/execution/queue
 * GET    /api/v1/execution/blocked
 * GET    /api/v1/execution/metrics
 * GET    /api/v1/execution/health
 * GET    /api/v1/execution/integrity
 * POST   /api/v1/execution/pause
 * POST   /api/v1/execution/resume
 * POST   /api/v1/execution/integrity-check
 * POST   /api/v1/execution/emergency-override
 */
import { Router } from 'express';
export function createExecutionRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/execution/active
     * Get currently executing envelopes
     */
    router.get('/active', async (req, res) => {
        try {
            const envelopes = await vienna.getActiveEnvelopes();
            const response = {
                success: true,
                data: envelopes,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTIVE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/queue
     * Get queue state snapshot
     */
    router.get('/queue', async (req, res) => {
        try {
            const queue = await vienna.getQueueState();
            const response = {
                success: true,
                data: queue,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'QUEUE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/blocked
     * Get blocked envelopes
     */
    router.get('/blocked', async (req, res) => {
        try {
            const blocked = await vienna.getBlockedEnvelopes();
            const response = {
                success: true,
                data: blocked,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'BLOCKED_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/metrics
     * Get execution metrics
     */
    router.get('/metrics', async (req, res) => {
        try {
            const metrics = await vienna.getExecutionMetrics();
            const response = {
                success: true,
                data: metrics,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'METRICS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/health
     * Get health snapshot
     */
    router.get('/health', async (req, res) => {
        try {
            const health = await vienna.getHealth();
            const response = {
                success: true,
                data: health,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'HEALTH_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/integrity
     * Get integrity snapshot (cached)
     */
    router.get('/integrity', async (req, res) => {
        try {
            // Return cached integrity check result
            // For manual trigger, use POST /api/v1/execution/integrity-check
            const integrity = await vienna.checkIntegrity('system');
            const response = {
                success: true,
                data: integrity,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'INTEGRITY_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/execution/pause
     * Pause execution
     */
    router.post('/pause', async (req, res) => {
        try {
            const request = req.body;
            if (!request.operator || !request.reason) {
                const err = {
                    success: false,
                    error: 'Missing required fields: operator, reason',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = await vienna.pauseExecution(request);
            const responseData = {
                success: true,
                paused_at: result.paused_at,
                queued_envelopes_paused: result.queued_envelopes_paused,
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
                code: 'PAUSE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/execution/resume
     * Resume execution
     */
    router.post('/resume', async (req, res) => {
        try {
            const request = req.body;
            if (!request.operator) {
                const err = {
                    success: false,
                    error: 'Missing required field: operator',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = await vienna.resumeExecution(request);
            const responseData = {
                success: true,
                resumed_at: result.resumed_at,
                envelopes_resumed: result.envelopes_resumed,
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
                code: 'RESUME_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/execution/integrity-check
     * Manually trigger integrity check
     */
    router.post('/integrity-check', async (req, res) => {
        try {
            const request = req.body;
            if (!request.operator) {
                const err = {
                    success: false,
                    error: 'Missing required field: operator',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const integrity = await vienna.checkIntegrity(request.operator);
            const responseData = {
                success: true,
                integrity,
                checked_at: new Date().toISOString(),
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
                code: 'INTEGRITY_CHECK_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/execution/emergency-override
     * Activate emergency trading guard override
     *
     * CRITICAL: Requires Metternich approval
     * Max duration: 60 minutes
     * Trading guard bypass only
     * Full audit trail required
     */
    router.post('/emergency-override', async (req, res) => {
        try {
            const request = req.body;
            // Validate required fields
            if (!request.operator || !request.reason || !request.metternich_approval_id) {
                const err = {
                    success: false,
                    error: 'Missing required fields: operator, reason, metternich_approval_id',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            // Validate duration
            if (!request.duration_minutes || request.duration_minutes > 60 || request.duration_minutes < 1) {
                const err = {
                    success: false,
                    error: 'Duration must be between 1 and 60 minutes',
                    code: 'INVALID_DURATION',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = await vienna.activateEmergencyOverride(request);
            const responseData = {
                success: true,
                override_id: result.override_id,
                activated_at: result.activated_at,
                expires_at: result.expires_at,
                audit_event_id: result.audit_event_id,
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
                code: 'OVERRIDE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/execution/envelopes/:id/lineage
     * Get envelope lineage chain (Phase 3E)
     */
    router.get('/envelopes/:id/lineage', async (req, res) => {
        try {
            const { id } = req.params;
            const lineage = await vienna.getEnvelopeLineage(id);
            const response = {
                success: true,
                data: {
                    envelope_id: id,
                    lineage,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('[ExecutionRoute] Error fetching lineage:', error);
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ENVELOPE_LINEAGE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=execution.js.map