/**
 * Policy Builder Routes — Vienna OS
 * 
 * Full CRUD + evaluation engine for governance policy rules.
 * Routes: /api/v1/policies/*
 */

import { Router, Request, Response } from 'express';
import { query, queryOne, execute, raw } from '../db/postgres.js';
import {
  evaluateAllRules,
  POLICY_TEMPLATES,
  type PolicyRule,
  type IntentContext,
  type ActionType,
  type FullEvaluationResult,
} from '../services/policyEngine.js';

// ============================================================================
// Types
// ============================================================================

interface PolicyRuleRow {
  id: string;
  name: string;
  description: string | null;
  conditions: unknown[];
  action_on_match: string;
  approval_tier: string | null;
  required_approvers: string[];
  priority: number;
  enabled: boolean;
  tenant_scope: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface CreatePolicyBody {
  name: string;
  description?: string;
  conditions: unknown[];
  action_on_match?: ActionType;
  approval_tier?: string;
  required_approvers?: string[];
  priority?: number;
  enabled?: boolean;
  tenant_scope?: string;
}

interface UpdatePolicyBody extends Partial<CreatePolicyBody> {}

interface EvaluateBody {
  context: IntentContext;
  default_action?: ActionType;
}

interface ReorderBody {
  rules: { id: string; priority: number }[];
}

// ============================================================================
// Validation
// ============================================================================

const VALID_ACTIONS: ActionType[] = ['allow', 'deny', 'require_approval', 'flag_for_review', 'rate_limit', 'escalate'];
const VALID_TIERS = ['T0', 'T1', 'T2'];

function validatePolicyBody(body: CreatePolicyBody): string | null {
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return 'name is required and must be a non-empty string';
  }
  if (body.name.length > 255) {
    return 'name must be 255 characters or less';
  }
  if (body.conditions !== undefined && !Array.isArray(body.conditions)) {
    return 'conditions must be an array';
  }
  if (body.action_on_match && !VALID_ACTIONS.includes(body.action_on_match)) {
    return `action_on_match must be one of: ${VALID_ACTIONS.join(', ')}`;
  }
  if (body.approval_tier && !VALID_TIERS.includes(body.approval_tier)) {
    return `approval_tier must be one of: ${VALID_TIERS.join(', ')}`;
  }
  if (body.required_approvers !== undefined && !Array.isArray(body.required_approvers)) {
    return 'required_approvers must be an array';
  }
  if (body.priority !== undefined && (typeof body.priority !== 'number' || body.priority < 0)) {
    return 'priority must be a non-negative number';
  }
  // Validate each condition structure
  if (body.conditions) {
    for (let i = 0; i < body.conditions.length; i++) {
      const c = body.conditions[i] as Record<string, unknown>;
      if (!c || typeof c !== 'object') {
        return `conditions[${i}] must be an object`;
      }
      if (!c.field || typeof c.field !== 'string') {
        return `conditions[${i}].field is required and must be a string`;
      }
      if (!c.operator || typeof c.operator !== 'string') {
        return `conditions[${i}].operator is required and must be a string`;
      }
      // value can be anything (string, number, array, etc.)
    }
  }
  return null;
}

// ============================================================================
// Schema Initialization
// ============================================================================

let schemaInitialized = false;

async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  try {
    await raw(`
      CREATE TABLE IF NOT EXISTS policy_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL DEFAULT '[]',
        action_on_match VARCHAR(50) NOT NULL DEFAULT 'require_approval',
        approval_tier VARCHAR(10),
        required_approvers JSONB DEFAULT '[]',
        priority INTEGER NOT NULL DEFAULT 100,
        enabled BOOLEAN NOT NULL DEFAULT true,
        tenant_scope VARCHAR(255) NOT NULL DEFAULT '*',
        created_by VARCHAR(255) NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS policy_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id UUID REFERENCES policy_rules(id) ON DELETE SET NULL,
        intent_id VARCHAR(255),
        agent_id VARCHAR(255),
        action_type VARCHAR(255),
        conditions_checked JSONB,
        result VARCHAR(50) NOT NULL,
        action_taken VARCHAR(100),
        context_snapshot JSONB,
        evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_policy_rules_enabled ON policy_rules(enabled);
      CREATE INDEX IF NOT EXISTS idx_policy_rules_priority ON policy_rules(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_policy_evaluations_rule_id ON policy_evaluations(rule_id);
      CREATE INDEX IF NOT EXISTS idx_policy_evaluations_evaluated_at ON policy_evaluations(evaluated_at DESC);
    `);
    schemaInitialized = true;
  } catch (err) {
    console.error('[policies] Schema init error:', err);
    // Don't block — tables may already exist
    schemaInitialized = true;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function rowToRule(row: PolicyRuleRow): PolicyRule {
  return {
    id: row.id,
    name: row.name,
    conditions: Array.isArray(row.conditions) ? row.conditions : JSON.parse(String(row.conditions)),
    action_on_match: row.action_on_match as ActionType,
    approval_tier: row.approval_tier || undefined,
    required_approvers: Array.isArray(row.required_approvers) ? row.required_approvers : [],
    priority: row.priority,
    enabled: row.enabled,
    tenant_scope: row.tenant_scope,
  };
}

// ============================================================================
// Router
// ============================================================================

export function createPoliciesRouter(): Router {
  const router = Router();

  // Ensure schema on first request
  router.use(async (_req, _res, next) => {
    await ensureSchema();
    next();
  });

  // --------------------------------------------------------------------------
  // GET /templates — Pre-built industry templates
  // --------------------------------------------------------------------------
  router.get('/templates', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: POLICY_TEMPLATES,
      timestamp: new Date().toISOString(),
    });
  });

  // --------------------------------------------------------------------------
  // GET /evaluations — Recent evaluation audit trail
  // --------------------------------------------------------------------------
  router.get('/evaluations', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const ruleId = req.query.rule_id as string;
      const result = req.query.result as string;

      let sql = `
        SELECT e.*, r.name as rule_name
        FROM policy_evaluations e
        LEFT JOIN policy_rules r ON r.id = e.rule_id
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (ruleId) {
        params.push(ruleId);
        sql += ` AND e.rule_id = $${params.length}`;
      }
      if (result) {
        params.push(result);
        sql += ` AND e.result = $${params.length}`;
      }

      sql += ` ORDER BY e.evaluated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const rows = await query(sql, params as never[]);

      res.json({
        success: true,
        data: rows,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] GET /evaluations error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch evaluations',
        code: 'EVALUATIONS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /evaluate — Test intent against all rules (dry-run)
  // --------------------------------------------------------------------------
  router.post('/evaluate', async (req: Request, res: Response) => {
    try {
      const body = req.body as EvaluateBody;

      if (!body.context || typeof body.context !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'context is required and must be an object',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
      }

      // Load all active rules
      const rows = await query<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE enabled = true ORDER BY priority DESC'
      );
      const rules = rows.map(rowToRule);

      const defaultAction = body.default_action || 'allow';
      const evaluation = evaluateAllRules(rules, body.context, defaultAction as ActionType);

      // Log the evaluation (for audit trail)
      if (evaluation.matched_rule) {
        try {
          await execute(
            `INSERT INTO policy_evaluations (rule_id, agent_id, action_type, conditions_checked, result, action_taken, context_snapshot)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              evaluation.matched_rule.rule_id,
              body.context.agent_id || null,
              body.context.action_type || null,
              JSON.stringify(evaluation.matched_rule.conditions_detail),
              'matched',
              evaluation.matched_rule.action,
              JSON.stringify(body.context),
            ]
          );
        } catch (logErr) {
          console.error('[policies] Evaluation logging error:', logErr);
          // Don't fail the evaluation if logging fails
        }
      }

      res.json({
        success: true,
        data: evaluation,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] POST /evaluate error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Evaluation failed',
        code: 'EVALUATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /reorder — Bulk update priorities
  // --------------------------------------------------------------------------
  router.post('/reorder', async (req: Request, res: Response) => {
    try {
      const body = req.body as ReorderBody;

      if (!body.rules || !Array.isArray(body.rules)) {
        return res.status(400).json({
          success: false,
          error: 'rules array is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
      }

      for (const item of body.rules) {
        await execute(
          'UPDATE policy_rules SET priority = $1, updated_at = NOW() WHERE id = $2',
          [item.priority, item.id]
        );
      }

      res.json({
        success: true,
        data: { updated: body.rules.length },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] POST /reorder error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Reorder failed',
        code: 'REORDER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET / — List all policy rules
  // --------------------------------------------------------------------------
  router.get('/', async (req: Request, res: Response) => {
    try {
      const enabled = req.query.enabled as string;
      const search = req.query.search as string;
      const action = req.query.action as string;

      let sql = 'SELECT * FROM policy_rules WHERE 1=1';
      const params: unknown[] = [];

      if (enabled !== undefined) {
        params.push(enabled === 'true');
        sql += ` AND enabled = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }
      if (action) {
        params.push(action);
        sql += ` AND action_on_match = $${params.length}`;
      }

      sql += ' ORDER BY priority DESC, created_at DESC';

      const rows = await query<PolicyRuleRow>(sql, params as never[]);

      // Get last triggered timestamp for each rule
      const ruleIds = rows.map(r => r.id);
      let lastTriggered: Record<string, string> = {};
      if (ruleIds.length > 0) {
        try {
          const evalRows = await query<{ rule_id: string; last_triggered: string }>(
            `SELECT rule_id, MAX(evaluated_at) as last_triggered
             FROM policy_evaluations
             WHERE rule_id = ANY($1)
             GROUP BY rule_id`,
            [ruleIds]
          );
          for (const row of evalRows) {
            lastTriggered[row.rule_id] = row.last_triggered;
          }
        } catch {
          // Non-critical
        }
      }

      const enriched = rows.map(row => ({
        ...row,
        last_triggered: lastTriggered[row.id] || null,
      }));

      res.json({
        success: true,
        data: enriched,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] GET / error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list policies',
        code: 'LIST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET /:id — Get single rule with evaluation history
  // --------------------------------------------------------------------------
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const rule = await queryOne<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE id = $1',
        [id]
      );

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: 'Policy rule not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Get recent evaluations for this rule
      const evaluations = await query(
        `SELECT * FROM policy_evaluations WHERE rule_id = $1 ORDER BY evaluated_at DESC LIMIT 20`,
        [id]
      );

      res.json({
        success: true,
        data: { ...rule, recent_evaluations: evaluations },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] GET /:id error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch policy',
        code: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST / — Create new rule
  // --------------------------------------------------------------------------
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body as CreatePolicyBody;
      const validationError = validatePolicyBody(body);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
      }

      const row = await queryOne<PolicyRuleRow>(
        `INSERT INTO policy_rules (name, description, conditions, action_on_match, approval_tier, required_approvers, priority, enabled, tenant_scope, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          body.name.trim(),
          body.description || null,
          JSON.stringify(body.conditions || []),
          body.action_on_match || 'require_approval',
          body.approval_tier || null,
          JSON.stringify(body.required_approvers || []),
          body.priority ?? 100,
          body.enabled !== false,
          body.tenant_scope || '*',
          'operator',
        ]
      );

      res.status(201).json({
        success: true,
        data: row,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] POST / error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create policy',
        code: 'CREATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // PUT /:id — Update rule (increment version)
  // --------------------------------------------------------------------------
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body as UpdatePolicyBody;

      // Check exists
      const existing = await queryOne<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE id = $1',
        [id]
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy rule not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Build dynamic update
      const sets: string[] = ['updated_at = NOW()', 'version = version + 1'];
      const params: unknown[] = [];

      if (body.name !== undefined) {
        if (!body.name.trim()) {
          return res.status(400).json({ success: false, error: 'name cannot be empty', code: 'VALIDATION_ERROR', timestamp: new Date().toISOString() });
        }
        params.push(body.name.trim());
        sets.push(`name = $${params.length}`);
      }
      if (body.description !== undefined) {
        params.push(body.description);
        sets.push(`description = $${params.length}`);
      }
      if (body.conditions !== undefined) {
        params.push(JSON.stringify(body.conditions));
        sets.push(`conditions = $${params.length}`);
      }
      if (body.action_on_match !== undefined) {
        if (!VALID_ACTIONS.includes(body.action_on_match)) {
          return res.status(400).json({ success: false, error: `Invalid action: ${body.action_on_match}`, code: 'VALIDATION_ERROR', timestamp: new Date().toISOString() });
        }
        params.push(body.action_on_match);
        sets.push(`action_on_match = $${params.length}`);
      }
      if (body.approval_tier !== undefined) {
        params.push(body.approval_tier);
        sets.push(`approval_tier = $${params.length}`);
      }
      if (body.required_approvers !== undefined) {
        params.push(JSON.stringify(body.required_approvers));
        sets.push(`required_approvers = $${params.length}`);
      }
      if (body.priority !== undefined) {
        params.push(body.priority);
        sets.push(`priority = $${params.length}`);
      }
      if (body.enabled !== undefined) {
        params.push(body.enabled);
        sets.push(`enabled = $${params.length}`);
      }
      if (body.tenant_scope !== undefined) {
        params.push(body.tenant_scope);
        sets.push(`tenant_scope = $${params.length}`);
      }

      params.push(id);
      const sql = `UPDATE policy_rules SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`;
      const updated = await queryOne<PolicyRuleRow>(sql, params as never[]);

      res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] PUT /:id error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update policy',
        code: 'UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // DELETE /:id — Soft-delete (disable)
  // --------------------------------------------------------------------------
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE id = $1',
        [id]
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy rule not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      await execute(
        'UPDATE policy_rules SET enabled = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        data: { id, disabled: true },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] DELETE /:id error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete policy',
        code: 'DELETE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /:id/duplicate — Clone a rule
  // --------------------------------------------------------------------------
  router.post('/:id/duplicate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE id = $1',
        [id]
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy rule not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      const row = await queryOne<PolicyRuleRow>(
        `INSERT INTO policy_rules (name, description, conditions, action_on_match, approval_tier, required_approvers, priority, enabled, tenant_scope, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          `${existing.name} (copy)`,
          existing.description,
          JSON.stringify(existing.conditions),
          existing.action_on_match,
          existing.approval_tier,
          JSON.stringify(existing.required_approvers),
          existing.priority,
          false, // Clones start disabled
          existing.tenant_scope,
          'operator',
        ]
      );

      res.status(201).json({
        success: true,
        data: row,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] POST /:id/duplicate error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to duplicate policy',
        code: 'DUPLICATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /:id/toggle — Enable/disable
  // --------------------------------------------------------------------------
  router.post('/:id/toggle', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne<PolicyRuleRow>(
        'SELECT * FROM policy_rules WHERE id = $1',
        [id]
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Policy rule not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await queryOne<PolicyRuleRow>(
        'UPDATE policy_rules SET enabled = NOT enabled, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[policies] POST /:id/toggle error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to toggle policy',
        code: 'TOGGLE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
