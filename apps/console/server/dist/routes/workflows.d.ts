/**
 * Workflow Routes
 *
 * Phase 6.11: Multi-step workflow engine API
 *
 * GET /api/v1/workflows - List available workflow templates
 * GET /api/v1/workflows/instances - List workflow instances
 * POST /api/v1/workflows/:templateId/create - Create workflow from template
 * GET /api/v1/workflows/:workflowId - Get workflow details
 * POST /api/v1/workflows/:workflowId/approve - Approve workflow for execution
 * POST /api/v1/workflows/:workflowId/execute - Execute workflow
 * POST /api/v1/workflows/:workflowId/cancel - Cancel workflow
 */
import { Router } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createWorkflowRouter(vienna: ViennaRuntimeService): Router;
//# sourceMappingURL=workflows.d.ts.map