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
      
      // Insert into database and return full policy
      const policy = await queryOne(`
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
        RETURNING *
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
      
      res.json({
        success: true,
        data: policy
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
      
      // Update and return full policy
      const updatedPolicy = await queryOne(`
        UPDATE policy_rules
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);
      
      res.json({
        success: true,
        data: updatedPolicy
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
   * Toggle policy enabled/disabled
   * POST /api/v1/policies/:policy_id/toggle
   */
  router.post('/:policy_id/toggle', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;
      
      // Toggle enabled field
      const policy = await queryOne(`
        UPDATE policy_rules
        SET enabled = NOT enabled, updated_at = NOW()
        WHERE id = $1
        RETURNING *
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
      console.error('[PoliciesRouter] Toggle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle policy',
        code: 'TOGGLE_ERROR'
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

  // ============================================================
  // Premium Policy Builder endpoints (Phase 6)
  // Coverage analysis, conflict detection, effectiveness metrics
  // ============================================================

  /**
   * Policy coverage analysis
   * GET /api/v1/policies/coverage
   * Returns which action types are covered by policies
   */
  router.get('/coverage', async (req: Request, res: Response) => {
    try {
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';

      // Get all enabled policies with their conditions
      const policies = await query(`
        SELECT id, name, conditions, action_on_match, enabled
        FROM policy_rules
        WHERE tenant_id = $1
        ORDER BY priority DESC
      `, [tenant_id]);

      // Known action types in Vienna OS
      const allActionTypes = [
        'data_access', 'code_execution', 'api_call', 'file_write', 'file_read',
        'network_request', 'database_query', 'secret_access', 'deployment',
        'user_notification', 'agent_spawn', 'resource_allocation', 'model_inference',
        'webhook_trigger', 'log_access', 'config_change', 'auth_action'
      ];

      // Analyze which action types each policy covers
      const coverageMap: Record<string, { policyCount: number; policies: string[] }> = {};
      for (const actionType of allActionTypes) {
        coverageMap[actionType] = { policyCount: 0, policies: [] };
      }

      for (const policy of policies) {
        const conditions = typeof policy.conditions === 'string'
          ? JSON.parse(policy.conditions)
          : policy.conditions;

        if (Array.isArray(conditions)) {
          for (const cond of conditions) {
            if (cond.field === 'action_type' || cond.field === 'intent.action_type') {
              const val = cond.value;
              if (typeof val === 'string' && coverageMap[val]) {
                coverageMap[val].policyCount++;
                coverageMap[val].policies.push(policy.name);
              } else if (val === '*' || cond.operator === 'exists') {
                // Wildcard — covers all
                for (const at of allActionTypes) {
                  coverageMap[at].policyCount++;
                  coverageMap[at].policies.push(policy.name);
                }
              }
            }
          }
        }
      }

      const coveredCount = Object.values(coverageMap).filter(v => v.policyCount > 0).length;

      res.json({
        success: true,
        data: {
          total_action_types: allActionTypes.length,
          covered_count: coveredCount,
          coverage_percentage: Math.round((coveredCount / allActionTypes.length) * 100),
          coverage: coverageMap,
          uncovered: allActionTypes.filter(at => coverageMap[at].policyCount === 0)
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Coverage analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to analyze coverage' });
    }
  });

  /**
   * Policy conflict detection
   * GET /api/v1/policies/conflicts
   * Finds overlapping/contradictory policies
   */
  router.get('/conflicts', async (req: Request, res: Response) => {
    try {
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';

      const policies = await query(`
        SELECT id, name, conditions, action_on_match, priority, enabled
        FROM policy_rules
        WHERE tenant_id = $1 AND enabled = true
        ORDER BY priority DESC
      `, [tenant_id]);

      const conflicts: Array<{
        policy_a: { id: string; name: string; action: string; priority: number };
        policy_b: { id: string; name: string; action: string; priority: number };
        overlap_type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }> = [];

      // Compare each pair of policies
      for (let i = 0; i < policies.length; i++) {
        for (let j = i + 1; j < policies.length; j++) {
          const a = policies[i];
          const b = policies[j];

          const condA = typeof a.conditions === 'string' ? JSON.parse(a.conditions) : a.conditions;
          const condB = typeof b.conditions === 'string' ? JSON.parse(b.conditions) : b.conditions;

          // Check for overlapping conditions (same field targets)
          const fieldsA = new Set((condA || []).map((c: any) => c.field));
          const fieldsB = new Set((condB || []).map((c: any) => c.field));
          const overlap = [...fieldsA].filter(f => fieldsB.has(f));

          if (overlap.length > 0 && a.action_on_match !== b.action_on_match) {
            const severity = a.action_on_match === 'allow' && b.action_on_match === 'deny' ? 'high'
              : a.action_on_match === 'deny' && b.action_on_match === 'allow' ? 'high'
              : 'medium';

            conflicts.push({
              policy_a: { id: a.id, name: a.name, action: a.action_on_match, priority: a.priority },
              policy_b: { id: b.id, name: b.name, action: b.action_on_match, priority: b.priority },
              overlap_type: 'contradictory_action',
              description: `"${a.name}" (${a.action_on_match}) and "${b.name}" (${b.action_on_match}) target overlapping conditions on fields: ${overlap.join(', ')}`,
              severity
            });
          } else if (overlap.length > 0 && a.action_on_match === b.action_on_match) {
            conflicts.push({
              policy_a: { id: a.id, name: a.name, action: a.action_on_match, priority: a.priority },
              policy_b: { id: b.id, name: b.name, action: b.action_on_match, priority: b.priority },
              overlap_type: 'redundant',
              description: `"${a.name}" and "${b.name}" both ${a.action_on_match} on overlapping conditions: ${overlap.join(', ')}`,
              severity: 'low'
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          total_conflicts: conflicts.length,
          high: conflicts.filter(c => c.severity === 'high').length,
          medium: conflicts.filter(c => c.severity === 'medium').length,
          low: conflicts.filter(c => c.severity === 'low').length,
          conflicts
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Conflict detection error:', error);
      res.status(500).json({ success: false, error: 'Failed to detect conflicts' });
    }
  });

  /**
   * Policy effectiveness metrics
   * GET /api/v1/policies/effectiveness
   * Hit rate, denial rate, false positives per policy
   */
  router.get('/effectiveness', async (req: Request, res: Response) => {
    try {
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';
      const days = parseInt(req.query.days as string) || 30;

      // Get decision counts per policy from policy_decisions table
      const stats = await query(`
        SELECT 
          pd.policy_id,
          pr.name as policy_name,
          COUNT(*) as total_evaluations,
          COUNT(*) FILTER (WHERE pd.decision = 'allow') as allows,
          COUNT(*) FILTER (WHERE pd.decision = 'deny') as denials,
          COUNT(*) FILTER (WHERE pd.decision = 'require_approval') as approvals_required,
          COUNT(*) FILTER (WHERE pd.decision = 'defer_to_operator') as deferred,
          MIN(pd.timestamp) as first_evaluation,
          MAX(pd.timestamp) as last_evaluation
        FROM policy_decisions pd
        LEFT JOIN policy_rules pr ON pr.id = pd.policy_id AND pr.tenant_id = $1
        WHERE pd.timestamp > NOW() - INTERVAL '${days} days'
        GROUP BY pd.policy_id, pr.name
        ORDER BY COUNT(*) DESC
      `, [tenant_id]);

      // Also get policies that have never been triggered
      const allPolicies = await query(`
        SELECT id, name FROM policy_rules WHERE tenant_id = $1 AND enabled = true
      `, [tenant_id]);

      const triggeredPolicyIds = new Set(stats.map((s: any) => s.policy_id));
      const neverTriggered = allPolicies.filter((p: any) => !triggeredPolicyIds.has(p.id));

      const effectiveness = stats.map((s: any) => ({
        policy_id: s.policy_id,
        policy_name: s.policy_name || s.policy_id,
        total_evaluations: parseInt(s.total_evaluations),
        allows: parseInt(s.allows),
        denials: parseInt(s.denials),
        approvals_required: parseInt(s.approvals_required),
        deferred: parseInt(s.deferred),
        denial_rate: s.total_evaluations > 0
          ? Math.round((parseInt(s.denials) / parseInt(s.total_evaluations)) * 100)
          : 0,
        first_evaluation: s.first_evaluation,
        last_evaluation: s.last_evaluation
      }));

      res.json({
        success: true,
        data: {
          period_days: days,
          policies_evaluated: stats.length,
          never_triggered: neverTriggered.map((p: any) => ({ id: p.id, name: p.name })),
          effectiveness
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Effectiveness metrics error:', error);
      res.status(500).json({ success: false, error: 'Failed to get effectiveness metrics' });
    }
  });

  /**
   * Policy version history
   * GET /api/v1/policies/:policy_id/versions
   * Returns version history for a policy (from the policies table which stores versions)
   */
  router.get('/:policy_id/versions', async (req: Request, res: Response) => {
    try {
      const { policy_id } = req.params;

      // Query the versioned policies table
      const versions = await query(`
        SELECT 
          policy_id,
          policy_version,
          policy_json,
          enabled,
          priority,
          description,
          created_at,
          updated_at
        FROM policies
        WHERE policy_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [policy_id]);

      // Also check policy_rules for the current working version
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';
      const current = await queryOne(`
        SELECT id, name, conditions, action_on_match, priority, enabled, created_at, updated_at
        FROM policy_rules
        WHERE id = $1 AND tenant_id = $2
      `, [policy_id, tenant_id]);

      res.json({
        success: true,
        data: {
          policy_id,
          current: current || null,
          versions: versions.map((v: any) => ({
            version: v.policy_version,
            policy: typeof v.policy_json === 'string' ? JSON.parse(v.policy_json) : v.policy_json,
            enabled: v.enabled === 1,
            priority: v.priority,
            description: v.description,
            created_at: v.created_at,
            updated_at: v.updated_at
          })),
          total_versions: versions.length
        }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Version history error:', error);
      res.status(500).json({ success: false, error: 'Failed to get version history' });
    }
  });

  /**
   * Bulk policy operations
   * POST /api/v1/policies/bulk
   * Enable/disable/delete multiple policies at once
   */
  router.post('/bulk', async (req: Request, res: Response) => {
    try {
      const tenant_id = (req as any).user?.tenantId || (req as any).session?.tenantId || 'default';
      const { action, policy_ids } = req.body;

      if (!Array.isArray(policy_ids) || policy_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'policy_ids must be a non-empty array' });
      }

      if (!['enable', 'disable', 'delete'].includes(action)) {
        return res.status(400).json({ success: false, error: 'action must be enable, disable, or delete' });
      }

      let affected = 0;
      const placeholders = policy_ids.map((_: any, i: number) => `$${i + 2}`).join(', ');

      if (action === 'enable') {
        const result = await execute(
          `UPDATE policy_rules SET enabled = true, updated_at = NOW() WHERE tenant_id = $1 AND id IN (${placeholders})`,
          [tenant_id, ...policy_ids]
        );
        affected = result.rowCount || 0;
      } else if (action === 'disable') {
        const result = await execute(
          `UPDATE policy_rules SET enabled = false, updated_at = NOW() WHERE tenant_id = $1 AND id IN (${placeholders})`,
          [tenant_id, ...policy_ids]
        );
        affected = result.rowCount || 0;
      } else if (action === 'delete') {
        const result = await execute(
          `DELETE FROM policy_rules WHERE tenant_id = $1 AND id IN (${placeholders})`,
          [tenant_id, ...policy_ids]
        );
        affected = result.rowCount || 0;
      }

      res.json({
        success: true,
        data: { action, requested: policy_ids.length, affected }
      });
    } catch (error) {
      console.error('[PoliciesRouter] Bulk operation error:', error);
      res.status(500).json({ success: false, error: 'Failed to execute bulk operation' });
    }
  });

  return router;
}
