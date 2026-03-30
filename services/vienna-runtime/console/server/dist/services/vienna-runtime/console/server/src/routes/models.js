/**
 * Model Control Routes
 *
 * Phase 6.12: Model registry and routing API
 *
 * GET /api/v1/models - List all models
 * GET /api/v1/models/enabled - List enabled models
 * POST /api/v1/models/:modelId/status - Update model status
 *
 * GET /api/v1/models/preferences - Get operator preferences
 * POST /api/v1/models/preferences - Set operator preference
 * DELETE /api/v1/models/preferences/:taskType - Clear operator preference
 *
 * POST /api/v1/models/route - Route task to model
 * GET /api/v1/models/stats - Get routing statistics
 * POST /api/v1/models/route/test - Test routing for task type
 */
import { Router } from 'express';
export function createModelsRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/models
     * List all models
     */
    router.get('/', async (req, res) => {
        try {
            const models = vienna.getAllModelsFromRegistry();
            const response = {
                success: true,
                data: { models },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'MODELS_LIST_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/models/enabled
     * List enabled models only
     */
    router.get('/enabled', async (req, res) => {
        try {
            const models = vienna.getEnabledModels();
            const response = {
                success: true,
                data: { models },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ENABLED_MODELS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/models/:modelId/status
     * Update model status
     */
    router.post('/:modelId/status', async (req, res) => {
        try {
            const { modelId } = req.params;
            const { status } = req.body;
            if (!status || !['enabled', 'disabled', 'maintenance'].includes(status)) {
                const err = {
                    success: false,
                    error: 'Invalid status. Must be: enabled, disabled, or maintenance',
                    code: 'INVALID_STATUS',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const model = vienna.updateModelStatus(modelId, status);
            const response = {
                success: true,
                data: { model },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'MODEL_STATUS_UPDATE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(err);
        }
    });
    /**
     * GET /api/v1/models/preferences
     * Get operator model preferences
     */
    router.get('/preferences', async (req, res) => {
        try {
            const operator = req.session?.operator || 'unknown';
            const preferences = vienna.getOperatorModelPreferences(operator);
            const response = {
                success: true,
                data: { preferences },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PREFERENCES_LIST_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/models/preferences
     * Set operator model preference
     */
    router.post('/preferences', async (req, res) => {
        try {
            const operator = req.session?.operator || 'unknown';
            const { task_type, model_id } = req.body;
            if (!task_type || !model_id) {
                const err = {
                    success: false,
                    error: 'Missing required fields: task_type, model_id',
                    code: 'MISSING_FIELDS',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            vienna.setOperatorModelPreference(operator, task_type, model_id);
            const response = {
                success: true,
                data: {
                    operator,
                    task_type,
                    model_id,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PREFERENCE_SET_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(err);
        }
    });
    /**
     * DELETE /api/v1/models/preferences/:taskType
     * Clear operator model preference
     */
    router.delete('/preferences/:taskType', async (req, res) => {
        try {
            const operator = req.session?.operator || 'unknown';
            const { taskType } = req.params;
            vienna.clearOperatorModelPreference(operator, taskType);
            const response = {
                success: true,
                data: {
                    operator,
                    task_type: taskType,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'PREFERENCE_DELETE_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(err);
        }
    });
    /**
     * POST /api/v1/models/route
     * Route task to appropriate model
     */
    router.post('/route', async (req, res) => {
        try {
            const operator = req.session?.operator || 'unknown';
            const { task_type, required_capabilities, max_cost_class, } = req.body;
            if (!task_type) {
                const err = {
                    success: false,
                    error: 'Missing required field: task_type',
                    code: 'MISSING_TASK_TYPE',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = vienna.routeTaskToModel({
                task_type,
                operator,
                required_capabilities,
                max_cost_class,
            });
            if (!result) {
                const err = {
                    success: false,
                    error: 'No model available for task',
                    code: 'NO_MODEL_AVAILABLE',
                    timestamp: new Date().toISOString(),
                };
                res.status(503).json(err);
                return;
            }
            const response = {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ROUTING_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/models/stats
     * Get model routing statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            const stats = vienna.getModelRoutingStats();
            const response = {
                success: true,
                data: stats,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'STATS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/models/route/test
     * Test model routing for task type
     */
    router.post('/route/test', async (req, res) => {
        try {
            const operator = req.session?.operator || 'unknown';
            const { task_type } = req.body;
            if (!task_type) {
                const err = {
                    success: false,
                    error: 'Missing required field: task_type',
                    code: 'MISSING_TASK_TYPE',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            const result = vienna.testModelRouting(task_type, operator);
            const response = {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'TEST_ROUTING_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=models.js.map