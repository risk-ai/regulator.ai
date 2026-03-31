/**
 * Objectives Routes
 *
 * Vienna's governed work visibility and operator actions.
 * Surfaces objectives, blocked work, and action paths.
 */
import { Router } from 'express';
export function createObjectivesRouter(objectivesService, timelineService) {
    const router = Router();
    /**
     * GET /api/v1/objectives
     * Get list of objectives
     */
    router.get('/', async (req, res) => {
        try {
            const status = req.query.status;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const objectives = await objectivesService.getObjectives({
                status,
                limit,
            });
            res.json({
                success: true,
                data: {
                    objectives,
                    total: objectives.length,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching objectives:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/objectives/:id
     * Get objective detail
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const objective = await objectivesService.getObjective(id);
            if (!objective) {
                res.status(404).json({
                    success: false,
                    error: `Objective not found: ${id}`,
                    code: 'OBJECTIVE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: objective,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching objective:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVE_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/objectives/:id/cancel
     * Cancel objective
     */
    router.post('/:id/cancel', async (req, res) => {
        try {
            const { id } = req.params;
            const { operator, reason } = req.body;
            if (!operator) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required field: operator',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await objectivesService.cancelObjective(id, operator, reason || 'Operator requested cancellation');
            res.json({
                success: result.status === 'completed',
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error cancelling objective:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'CANCEL_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/objectives/:id/progress
     * Get real-time objective progress (Phase 3D)
     */
    router.get('/:id/progress', async (req, res) => {
        try {
            const { id } = req.params;
            const progress = await objectivesService.getObjectiveProgress(id);
            if (!progress) {
                res.status(404).json({
                    success: false,
                    error: `Objective progress not available: ${id}`,
                    code: 'OBJECTIVE_PROGRESS_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: progress,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching progress:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVE_PROGRESS_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/objectives/:id/metrics
     * Get objective execution metrics (Phase 3D, alias for /progress)
     */
    router.get('/:id/metrics', async (req, res) => {
        // Reuse progress endpoint (same data, different name)
        try {
            const { id } = req.params;
            const metrics = await objectivesService.getObjectiveProgress(id);
            if (!metrics) {
                res.status(404).json({
                    success: false,
                    error: `Objective metrics not available: ${id}`,
                    code: 'OBJECTIVE_METRICS_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching metrics:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVE_METRICS_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/objectives/:id/tree
     * Get objective fanout tree structure (Phase 3E)
     */
    router.get('/:id/tree', async (req, res) => {
        try {
            const { id } = req.params;
            const tree = await objectivesService.getObjectiveTree(id);
            if (!tree) {
                res.status(404).json({
                    success: false,
                    error: `Objective tree not available: ${id}`,
                    code: 'OBJECTIVE_TREE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: tree,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching tree:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVE_TREE_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/objectives/:id/timeline
     * Get objective timeline (Phase 5B)
     */
    router.get('/:id/timeline', async (req, res) => {
        if (!timelineService) {
            res.status(503).json({
                success: false,
                error: 'Timeline service not available',
                code: 'TIMELINE_SERVICE_UNAVAILABLE',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        try {
            const { id } = req.params;
            // Parse query params
            const category = req.query.category;
            const status = req.query.status;
            const limit = req.query.limit ? parseInt(req.query.limit) : 500;
            const timeline = await timelineService.getObjectiveTimeline(id, {
                category,
                status,
                limit,
            });
            if (!timeline) {
                res.status(404).json({
                    success: false,
                    error: `Objective timeline not available: ${id}`,
                    code: 'OBJECTIVE_TIMELINE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: timeline,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ObjectivesRoute] Error fetching timeline:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'OBJECTIVE_TIMELINE_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=objectives.js.map