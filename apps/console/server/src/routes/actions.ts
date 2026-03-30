/**
 * Actions Routes
 * 
 * Execute registered action handlers directly
 * Simpler than full intent gateway for read-only operations
 */

import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db/postgres.js';
import { getHandler } from '../execution/handler-registry.js';
import { jwtAuthMiddleware, AuthenticatedRequest } from '../middleware/jwtAuth.js';

export function createActionsRouter(): Router {
  const router = Router();
  
  // Test endpoint (no auth)
  router.get('/ping', (req, res) => {
    console.log('[ActionsRouter] /ping endpoint hit!');
    res.json({ success: true, message: 'Actions router works', timestamp: new Date().toISOString() });
  });

  /**
   * POST /api/v1/actions/execute
   * Execute a registered action handler
   * 
   * Body:
   * {
   *   action_type: string,
   *   payload?: any
   * }
   */
  router.post('/execute', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    console.log('[ActionsRoute] Execute called, user:', req.user?.email || 'NOT_AUTHENTICATED');
    try {
      // Check authentication
      if (!req.user) {
        console.log('[ActionsRoute] No user on request, returning 401');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      const { action_type, payload = {} } = req.body;

      if (!action_type) {
        return res.status(400).json({
          success: false,
          error: 'action_type required',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if action type exists and is enabled
      const actionTypeRecord = await queryOne(
        'SELECT id, action_type, display_name, enabled, requires_approval FROM action_types WHERE action_type = $1',
        [action_type]
      );

      if (!actionTypeRecord) {
        return res.status(404).json({
          success: false,
          error: `Unknown action type: "${action_type}"`,
          code: 'ACTION_TYPE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!actionTypeRecord.enabled) {
        return res.status(403).json({
          success: false,
          error: `Action type "${action_type}" is currently disabled`,
          code: 'ACTION_TYPE_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get handler
      const handler = getHandler(action_type);
      if (!handler) {
        return res.status(501).json({
          success: false,
          error: `Handler not implemented for action type: "${action_type}"`,
          code: 'HANDLER_NOT_IMPLEMENTED',
          timestamp: new Date().toISOString(),
        });
      }

      // Validate payload
      if (!handler.validate(payload)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload for this action type',
          code: 'INVALID_PAYLOAD',
          timestamp: new Date().toISOString(),
        });
      }

      // Log usage
      const usageId = await execute(
        `INSERT INTO action_type_usage (action_type_id, agent_id, status)
         VALUES ($1, $2, 'submitted')
         RETURNING id`,
        [actionTypeRecord.id, req.user?.userId || 'unknown']
      );

      const startTime = Date.now();

      // Execute handler
      const context = {
        tenantId: req.user?.tenantId || 'system',
        operatorId: req.user?.userId || 'unknown',
        payload,
        timestamp: new Date(),
      };

      const result = await handler.execute(context);
      const executionTime = Date.now() - startTime;

      // Update usage log
      await execute(
        `UPDATE action_type_usage
         SET status = $1, execution_time_ms = $2
         WHERE id = $3`,
        [result.success ? 'executed' : 'failed', executionTime, usageId]
      );

      if (result.success) {
        return res.json({
          success: true,
          data: result.data,
          meta: {
            actionType: action_type,
            displayName: actionTypeRecord.display_name,
            executionTimeMs: executionTime,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error || 'Execution failed',
          code: 'EXECUTION_FAILED',
          meta: {
            actionType: action_type,
            executionTimeMs: executionTime,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('[ActionsRoute] Execution error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/actions/types
   * List all available action types
   */
  router.get('/types', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      const actionTypes = await query(`
        SELECT 
          action_type,
          display_name,
          description,
          category,
          enabled,
          requires_approval
        FROM action_types
        WHERE enabled = true
        ORDER BY category, display_name
      `);

      // Group by category
      const byCategory = actionTypes.reduce((acc: any, type: any) => {
        if (!acc[type.category]) {
          acc[type.category] = [];
        }
        acc[type.category].push({
          actionType: type.action_type,
          displayName: type.display_name,
          description: type.description,
          requiresApproval: type.requires_approval,
        });
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          total: actionTypes.length,
          byCategory,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[ActionsRoute] List types error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list action types',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

export default createActionsRouter;
