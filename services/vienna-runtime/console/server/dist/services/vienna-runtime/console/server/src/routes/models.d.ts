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
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createModelsRouter(vienna: ViennaRuntimeService): Router;
//# sourceMappingURL=models.d.ts.map