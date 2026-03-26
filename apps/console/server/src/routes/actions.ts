/**
 * Custom Actions Route
 * 
 * Manage tenant-specific custom action types
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createActionsRouter(viennaRuntime: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * List custom actions for tenant
   * GET /api/v1/actions
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      // TODO: Get tenant_id from authenticated session
      const tenant_id = 'default'; // Placeholder for now
      
      const stateGraph = viennaRuntime.getStateGraph();
      const actions = stateGraph.listCustomActions(tenant_id);
      
      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('[ActionsRouter] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list actions',
        code: 'LIST_ERROR'
      });
    }
  });

  /**
   * Create custom action
   * POST /api/v1/actions
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { action_name, intent_type, risk_tier, schema_json, description } = req.body;
      
      // Validation
      if (!action_name || !intent_type || !risk_tier) {
        return res.status(400).json({
          success: false,
          error: 'action_name, intent_type, and risk_tier are required',
          code: 'VALIDATION_ERROR'
        });
      }
      
      if (!['T0', 'T1', 'T2'].includes(risk_tier)) {
        return res.status(400).json({
          success: false,
          error: 'risk_tier must be T0, T1, or T2',
          code: 'INVALID_RISK_TIER'
        });
      }
      
      // TODO: Get tenant_id from authenticated session
      const tenant_id = 'default';
      
      const stateGraph = viennaRuntime.getStateGraph();
      const action_id = stateGraph.createCustomAction({
        tenant_id,
        action_name,
        intent_type,
        risk_tier,
        schema_json,
        description
      });
      
      res.json({
        success: true,
        data: {
          action_id,
          message: `Custom action '${action_name}' created successfully`
        }
      });
    } catch (error) {
      console.error('[ActionsRouter] Create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create action',
        code: 'CREATE_ERROR'
      });
    }
  });

  /**
   * Get custom action by ID
   * GET /api/v1/actions/:action_id
   */
  router.get('/:action_id', async (req: Request, res: Response) => {
    try {
      const { action_id } = req.params;
      
      const stateGraph = viennaRuntime.getStateGraph();
      const action = stateGraph.getCustomAction(action_id);
      
      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Action not found',
          code: 'NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: action
      });
    } catch (error) {
      console.error('[ActionsRouter] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get action',
        code: 'GET_ERROR'
      });
    }
  });

  /**
   * Update custom action
   * PATCH /api/v1/actions/:action_id
   */
  router.patch('/:action_id', async (req: Request, res: Response) => {
    try {
      const { action_id } = req.params;
      const updates = req.body;
      
      const stateGraph = viennaRuntime.getStateGraph();
      
      // Check if action exists
      const existing = stateGraph.getCustomAction(action_id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Action not found',
          code: 'NOT_FOUND'
        });
      }
      
      stateGraph.updateCustomAction(action_id, updates);
      
      res.json({
        success: true,
        data: {
          action_id,
          message: 'Custom action updated successfully'
        }
      });
    } catch (error) {
      console.error('[ActionsRouter] Update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update action',
        code: 'UPDATE_ERROR'
      });
    }
  });

  /**
   * Delete custom action
   * DELETE /api/v1/actions/:action_id
   */
  router.delete('/:action_id', async (req: Request, res: Response) => {
    try {
      const { action_id } = req.params;
      
      const stateGraph = viennaRuntime.getStateGraph();
      
      // Check if action exists
      const existing = stateGraph.getCustomAction(action_id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Action not found',
          code: 'NOT_FOUND'
        });
      }
      
      stateGraph.deleteCustomAction(action_id);
      
      res.json({
        success: true,
        data: {
          action_id,
          message: 'Custom action deleted successfully'
        }
      });
    } catch (error) {
      console.error('[ActionsRouter] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete action',
        code: 'DELETE_ERROR'
      });
    }
  });

  return router;
}
