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

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

export function createWorkflowRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/workflows
   * List available workflow templates
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const workflows = vienna.getAvailableWorkflows();
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { workflows },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_LIST_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/workflows/instances
   * List all workflow instances
   */
  router.get('/instances', async (req: Request, res: Response) => {
    try {
      const instances = vienna.getAllWorkflows();
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { instances },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_INSTANCES_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/workflows/:templateId/create
   * Create workflow instance from template
   */
  router.post('/:templateId/create', async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const operator = (req as any).session?.operator || 'unknown';
      
      const workflow = vienna.createWorkflow(templateId, {
        operator,
        ...req.body.context,
      });
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { workflow },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_CREATE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(err);
    }
  });

  /**
   * GET /api/v1/workflows/:workflowId
   * Get workflow details
   */
  router.get('/:workflowId', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const workflow = vienna.getWorkflow(workflowId);
      
      if (!workflow) {
        const err: ErrorResponse = {
          success: false,
          error: 'Workflow not found',
          code: 'WORKFLOW_NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(err);
        return;
      }
      
      const response: SuccessResponse<any> = {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_GET_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/workflows/:workflowId/approve
   * Approve workflow for execution
   */
  router.post('/:workflowId/approve', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const operator = (req as any).session?.operator || 'unknown';
      
      const workflow = vienna.approveWorkflow(workflowId, operator);
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { workflow },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_APPROVE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(err);
    }
  });

  /**
   * POST /api/v1/workflows/:workflowId/execute
   * Execute workflow
   */
  router.post('/:workflowId/execute', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      
      // Execute workflow (async)
      const workflow = await vienna.executeWorkflow(workflowId);
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { workflow },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_EXECUTE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(err);
    }
  });

  /**
   * POST /api/v1/workflows/:workflowId/cancel
   * Cancel workflow
   */
  router.post('/:workflowId/cancel', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const operator = (req as any).session?.operator || 'unknown';
      
      const workflow = vienna.cancelWorkflow(workflowId, operator);
      
      const response: SuccessResponse<any> = {
        success: true,
        data: { workflow },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_CANCEL_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(err);
    }
  });

  return router;
}
