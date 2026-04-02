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
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createExecutionRouter(vienna: ViennaRuntimeService): Router;
//# sourceMappingURL=execution.d.ts.map