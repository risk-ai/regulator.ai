/**
 * Policies Route
 * 
 * Visual policy builder - user-defined governance rules
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import { query, queryOne, execute } from '../db/postgres.js';

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
      
      // Query policy_rules table (created by migration 001)
      const policies = await query(`
        SELECT 
          id,
          name,
          description,
          conditions,
          action_on_match,
          approval_tier,
          required_approvers,
          priority,
          enabled,
          tenant_scope,
          created_by,
          created_at,
          updated_at,
          version
        FROM policy_rules
        WHERE tenant_scope = $1 OR tenant_scope = '*'
        ORDER BY priority DESC, created_at DESC
      `, [tenant_id]);
      
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
      
      // Map frontend 'actions' array to single action_on_match field
      // Frontend sends: actions: ['require_approval', ...], we take first
      const action_on_match = Array.isArray(actions) && actions.length > 0 ? actions[0] : 'require_approval';
      
      // Extract approval_tier and required_approvers if present
      const approval_tier = req.body.approval_tier || 'T1';
      const required_approvers = req.body.required_approvers || [];
      
      // Insert into database
      const result = await queryOne<{ id: string }>(`
        INSERT INTO policy_rules (
          name,
          description,
          conditions,
          action_on_match,
          approval_tier,
          required_approvers,
          priority,
          tenant_scope,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        name,
        description || null,
        JSON.stringify(conditions),
        action_on_match,
        approval_tier,
        JSON.stringify(required_approvers),
        priority || 100,
        tenant_id,
        created_by
      ]);
      
      const policy_id = result?.id;
      
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
      
      const policy = await queryOne(`
        SELECT * FROM policy_rules WHERE id = $1
      `, [policy_id]);
      
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
      
      // Check if policy exists
      const existing = await queryOne(`SELECT id FROM policy_rules WHERE id = $1`, [policy_id]);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      // Build dynamic UPDATE statement from provided fields
      const allowedFields = ['name', 'description', 'conditions', 'action_on_match', 'approval_tier', 'required_approvers', 'priority', 'enabled'];
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${paramIndex}`);
          // JSON fields need stringifying
          if (field === 'conditions' || field === 'required_approvers') {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
          paramIndex++;
        }
      }
      
      if (setClauses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          code: 'NO_UPDATES'
        });
      }
      
      // Add updated_at and version increment
      setClauses.push(`updated_at = NOW()`);
      setClauses.push(`version = version + 1`);
      
      values.push(policy_id); // For WHERE clause
      
      await execute(`
        UPDATE policy_rules
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `, values);
      
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
      
      // Check if policy exists
      const existing = await queryOne(`SELECT id FROM policy_rules WHERE id = $1`, [policy_id]);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
          code: 'NOT_FOUND'
        });
      }
      
      await execute(`DELETE FROM policy_rules WHERE id = $1`, [policy_id]);
      
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
