/**
 * Policies Route
 * 
 * Visual policy builder - user-defined governance rules
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createPoliciesRouter(viennaRuntime: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * List policies for tenant
   * GET /api/v1/policies
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Get tenant_id from authenticated session (set by auth middleware)
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';
      
      // TEMP: Return empty array until StateGraph API is updated
      // Vienna Core is operational, but legacy route needs refactoring
      const policies: any[] = [];
      
      res.json({
        success: true,
        data: {
          policies,
          total: policies.length,
        },
      });
    } catch (error) {
      console.error('[PoliciesRouter] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list policies',
        code: 'LIST_ERROR'
      });
    }
  });

  /**
   * Create policy
   * POST /api/v1/policies
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name, description, conditions, actions, priority } = req.body;
      
      // Validation
      if (!name || !conditions || !actions) {
        return res.status(400).json({
          success: false,
          error: 'name, conditions, and actions are required',
          code: 'VALIDATION_ERROR'
        });
      }
      
      if (!Array.isArray(conditions) || !Array.isArray(actions)) {
        return res.status(400).json({
          success: false,
          error: 'conditions and actions must be arrays',
          code: 'INVALID_FORMAT'
        });
      }
      
      // Get tenant_id and operator_id from authenticated session (set by auth middleware)
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';
      const created_by = (req as any).user?.email || (req as any).session?.operator || 'unknown';
      
      const stateGraph = viennaRuntime.getStateGraph();
      const policy_id = stateGraph.createPolicy({
        tenant_id,
        name,
        description,
        conditions,
        actions,
        priority,
        created_by
      });
      
      res.json({
        success: true,
        data: {
          policy_id,
          message: `Policy '${name}' created successfully`
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create policy',
        code: 'CREATE_ERROR'
      });
    }
  });

  /**
   * Get policy by ID
   * GET /api/v1/policies/:policy_id
   */
  router.get('/:policy_id', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;
      
      const stateGraph = viennaRuntime.getStateGraph();
      const policy = stateGraph.getPolicy(policy_id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: policy
      });
    } catch (error) {
      console.error('[PoliciesRouter] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get policy',
        code: 'GET_ERROR'
      });
    }
  });

  /**
   * Update policy
   * PATCH /api/v1/policies/:policy_id
   */
  router.patch('/:policy_id', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;
      const updates = req.body;
      
      const stateGraph = viennaRuntime.getStateGraph();
      
      // Check if policy exists
      const existing = stateGraph.getPolicy(policy_id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      stateGraph.updatePolicy(policy_id, updates);
      
      res.json({
        success: true,
        data: {
          policy_id,
          message: 'Policy updated successfully'
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update policy',
        code: 'UPDATE_ERROR'
      });
    }
  });

  /**
   * Delete policy
   * DELETE /api/v1/policies/:policy_id
   */
  router.delete('/:policy_id', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;
      
      const stateGraph = viennaRuntime.getStateGraph();
      
      // Check if policy exists
      const existing = stateGraph.getPolicy(policy_id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      stateGraph.deletePolicy(policy_id);
      
      res.json({
        success: true,
        data: {
          policy_id,
          message: 'Policy deleted successfully'
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete policy',
        code: 'DELETE_ERROR'
      });
    }
  });

  /**
   * Test policy against example intent
   * POST /api/v1/policies/:policy_id/test
   */
  router.post('/:policy_id/test', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;
      const { intent } = req.body;
      
      if (!intent) {
        return res.status(400).json({
          success: false,
          error: 'intent is required for testing',
          code: 'VALIDATION_ERROR'
        });
      }
      
      const stateGraph = viennaRuntime.getStateGraph();
      const policy = stateGraph.getPolicy(policy_id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      // Evaluate policy conditions
      const allConditionsMet = policy.conditions.every((condition: any) => {
        return stateGraph._evaluateCondition(condition, intent);
      });
      
      res.json({
        success: true,
        data: {
          matches: allConditionsMet,
          would_apply: allConditionsMet ? policy.actions : [],
          message: allConditionsMet 
            ? `Policy '${policy.name}' would apply to this intent`
            : `Policy '${policy.name}' would NOT apply to this intent`
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test policy',
        code: 'TEST_ERROR'
      });
    }
  });

  return router;
}
