/**
 * Action Types Routes
 *
 * Custom Action Type Registry for Vienna OS.
 * Allows operators to define ANY action type beyond the preset 11.
 *
 * GET    /api/v1/action-types              — List all (filterable by category, enabled)
 * GET    /api/v1/action-types/categories   — List all categories
 * POST   /api/v1/action-types/validate     — Validate payload against schema
 * GET    /api/v1/action-types/:id          — Get single with usage stats
 * POST   /api/v1/action-types              — Create custom action type
 * PUT    /api/v1/action-types/:id          — Update (builtins: enabled toggle only)
 * DELETE /api/v1/action-types/:id          — Delete (custom only)
 * GET    /api/v1/action-types/:id/usage    — Usage history
 */
import { Router } from 'express';
import { query, queryOne, execute } from '../db/postgres.js';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
function validateActionTypeSlug(slug) {
    return /^[a-z][a-z0-9_]{1,253}$/.test(slug);
}
function validateRiskTier(tier) {
    return ['T0', 'T1', 'T2'].includes(tier);
}
function validateColor(color) {
    return /^#[0-9a-fA-F]{6}$/.test(color);
}
/**
 * Simple JSON Schema validation (subset — checks type, required, properties)
 */
function validatePayloadAgainstSchema(payload, schema) {
    const errors = [];
    if (!schema || Object.keys(schema).length === 0) {
        return { valid: true, errors: [] };
    }
    // Check required fields
    const required = schema.required || [];
    for (const field of required) {
        if (!(field in payload)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    // Check property types
    const properties = schema.properties || {};
    for (const [key, value] of Object.entries(payload)) {
        const propSchema = properties[key];
        if (propSchema?.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== propSchema.type) {
                errors.push(`Field "${key}" expected type "${propSchema.type}", got "${actualType}"`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
// ─── Router ──────────────────────────────────────────────────────────────────
export function createActionTypesRouter() {
    const router = Router();
    /**
     * GET /api/v1/action-types/categories
     * List all distinct categories
     */
    router.get('/categories', async (_req, res) => {
        try {
            const rows = await query(`SELECT category, COUNT(*)::text as count 
         FROM action_types 
         GROUP BY category 
         ORDER BY category`);
            res.json({
                success: true,
                data: rows.map(r => ({ category: r.category, count: parseInt(r.count, 10) })),
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error listing categories:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/action-types/validate
     * Validate a payload against an action type's JSON schema
     */
    router.post('/validate', async (req, res) => {
        try {
            const { action_type, payload } = req.body;
            if (!action_type || !payload) {
                return res.status(400).json({
                    success: false,
                    error: 'action_type and payload required',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
            }
            const actionType = await queryOne('SELECT * FROM action_types WHERE action_type = $1', [action_type]);
            if (!actionType) {
                return res.status(404).json({
                    success: false,
                    error: `Action type "${action_type}" not found. Register it first via POST /api/v1/action-types`,
                    code: 'ACTION_TYPE_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
            }
            const result = validatePayloadAgainstSchema(payload, actionType.payload_schema);
            res.json({
                success: true,
                data: {
                    action_type: actionType.action_type,
                    valid: result.valid,
                    errors: result.errors,
                    schema: actionType.payload_schema,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Validation error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/action-types
     * List all action types (filterable by category, enabled)
     */
    router.get('/', async (req, res) => {
        try {
            const { category, enabled } = req.query;
            let sql = 'SELECT at.*, COALESCE(u.usage_count, 0)::int as usage_count FROM action_types at LEFT JOIN (SELECT action_type_id, COUNT(*) as usage_count FROM action_type_usage GROUP BY action_type_id) u ON at.id = u.action_type_id WHERE 1=1';
            const params = [];
            let paramIdx = 1;
            if (category && category !== 'all') {
                sql += ` AND at.category = $${paramIdx++}`;
                params.push(category);
            }
            if (enabled !== undefined) {
                sql += ` AND at.enabled = $${paramIdx++}`;
                params.push(enabled === 'true');
            }
            sql += ' ORDER BY at.is_builtin DESC, at.category, at.display_name';
            const rows = await query(sql, params);
            res.json({
                success: true,
                data: rows,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error listing:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/action-types/:id
     * Get single action type with usage stats
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const actionType = await queryOne('SELECT * FROM action_types WHERE id = $1', [id]);
            if (!actionType) {
                return res.status(404).json({
                    success: false,
                    error: 'Action type not found',
                    code: 'NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
            }
            // Get usage stats (last 7 days, grouped by day)
            const usageStats = await query(`SELECT DATE(executed_at) as day, COUNT(*)::text as count
         FROM action_type_usage
         WHERE action_type_id = $1 AND executed_at > NOW() - INTERVAL '7 days'
         GROUP BY DATE(executed_at)
         ORDER BY day`, [id]);
            // Get total usage count
            const totalUsage = await queryOne('SELECT COUNT(*)::text as count FROM action_type_usage WHERE action_type_id = $1', [id]);
            res.json({
                success: true,
                data: {
                    ...actionType,
                    usage_count: parseInt(totalUsage?.count || '0', 10),
                    usage_last_7_days: usageStats.map(s => ({
                        day: s.day,
                        count: parseInt(s.count, 10),
                    })),
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error fetching:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/action-types
     * Create a custom action type
     */
    router.post('/', async (req, res) => {
        try {
            const body = req.body;
            if (!body.display_name) {
                return res.status(400).json({
                    success: false,
                    error: 'display_name is required',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
            }
            // Auto-generate slug if not provided
            const actionTypeSlug = body.action_type || slugify(body.display_name);
            if (!validateActionTypeSlug(actionTypeSlug)) {
                return res.status(400).json({
                    success: false,
                    error: 'action_type must start with a letter and contain only lowercase letters, numbers, and underscores (2-254 chars)',
                    code: 'INVALID_SLUG',
                    timestamp: new Date().toISOString(),
                });
            }
            if (body.default_risk_tier && !validateRiskTier(body.default_risk_tier)) {
                return res.status(400).json({
                    success: false,
                    error: 'default_risk_tier must be T0, T1, or T2',
                    code: 'INVALID_RISK_TIER',
                    timestamp: new Date().toISOString(),
                });
            }
            if (body.color && !validateColor(body.color)) {
                return res.status(400).json({
                    success: false,
                    error: 'color must be a valid hex color (e.g., #3b82f6)',
                    code: 'INVALID_COLOR',
                    timestamp: new Date().toISOString(),
                });
            }
            const operator_id = req.session?.operator?.id || 'console';
            const created = await queryOne(`INSERT INTO action_types (action_type, display_name, description, category, payload_schema, default_risk_tier, is_builtin, icon, color, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9)
         RETURNING *`, [
                actionTypeSlug,
                body.display_name,
                body.description || null,
                body.category || 'custom',
                JSON.stringify(body.payload_schema || {}),
                body.default_risk_tier || 'T1',
                body.icon || 'activity',
                body.color || '#3b82f6',
                operator_id,
            ]);
            res.status(201).json({
                success: true,
                data: created,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            // Handle unique constraint violation
            if (error.code === '23505' || error.message?.includes('unique')) {
                return res.status(409).json({
                    success: false,
                    error: 'An action type with this identifier already exists',
                    code: 'DUPLICATE_ACTION_TYPE',
                    timestamp: new Date().toISOString(),
                });
            }
            console.error('[ActionTypes] Error creating:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * PUT /api/v1/action-types/:id
     * Update an action type (builtins: only enabled toggle allowed)
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const existing = await queryOne('SELECT * FROM action_types WHERE id = $1', [id]);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Action type not found',
                    code: 'NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
            }
            // Builtins: only allow toggling enabled
            if (existing.is_builtin) {
                if (body.enabled !== undefined) {
                    await execute('UPDATE action_types SET enabled = $1, updated_at = NOW() WHERE id = $2', [body.enabled, id]);
                    const updated = await queryOne('SELECT * FROM action_types WHERE id = $1', [id]);
                    return res.json({
                        success: true,
                        data: updated,
                        timestamp: new Date().toISOString(),
                    });
                }
                return res.status(403).json({
                    success: false,
                    error: 'Built-in action types can only have their enabled status toggled',
                    code: 'BUILTIN_IMMUTABLE',
                    timestamp: new Date().toISOString(),
                });
            }
            // Validate fields
            if (body.default_risk_tier && !validateRiskTier(body.default_risk_tier)) {
                return res.status(400).json({
                    success: false,
                    error: 'default_risk_tier must be T0, T1, or T2',
                    code: 'INVALID_RISK_TIER',
                    timestamp: new Date().toISOString(),
                });
            }
            if (body.color && !validateColor(body.color)) {
                return res.status(400).json({
                    success: false,
                    error: 'color must be a valid hex color',
                    code: 'INVALID_COLOR',
                    timestamp: new Date().toISOString(),
                });
            }
            // Build dynamic UPDATE
            const sets = [];
            const params = [];
            let paramIdx = 1;
            if (body.display_name !== undefined) {
                sets.push(`display_name = $${paramIdx++}`);
                params.push(body.display_name);
            }
            if (body.description !== undefined) {
                sets.push(`description = $${paramIdx++}`);
                params.push(body.description);
            }
            if (body.category !== undefined) {
                sets.push(`category = $${paramIdx++}`);
                params.push(body.category);
            }
            if (body.payload_schema !== undefined) {
                sets.push(`payload_schema = $${paramIdx++}`);
                params.push(JSON.stringify(body.payload_schema));
            }
            if (body.default_risk_tier !== undefined) {
                sets.push(`default_risk_tier = $${paramIdx++}`);
                params.push(body.default_risk_tier);
            }
            if (body.icon !== undefined) {
                sets.push(`icon = $${paramIdx++}`);
                params.push(body.icon);
            }
            if (body.color !== undefined) {
                sets.push(`color = $${paramIdx++}`);
                params.push(body.color);
            }
            if (body.enabled !== undefined) {
                sets.push(`enabled = $${paramIdx++}`);
                params.push(body.enabled);
            }
            if (sets.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
            }
            sets.push('updated_at = NOW()');
            params.push(id);
            const updated = await queryOne(`UPDATE action_types SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`, params);
            res.json({
                success: true,
                data: updated,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error updating:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * DELETE /api/v1/action-types/:id
     * Delete a custom action type (builtins cannot be deleted)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const existing = await queryOne('SELECT * FROM action_types WHERE id = $1', [id]);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Action type not found',
                    code: 'NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
            }
            if (existing.is_builtin) {
                return res.status(403).json({
                    success: false,
                    error: 'Built-in action types cannot be deleted. You can disable them instead.',
                    code: 'BUILTIN_PROTECTED',
                    timestamp: new Date().toISOString(),
                });
            }
            // Delete usage records first (FK constraint)
            await execute('DELETE FROM action_type_usage WHERE action_type_id = $1', [id]);
            await execute('DELETE FROM action_types WHERE id = $1', [id]);
            res.json({
                success: true,
                data: { deleted: true, action_type: existing.action_type },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error deleting:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/action-types/:id/usage
     * Get usage history for an action type
     */
    router.get('/:id/usage', async (req, res) => {
        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const existing = await queryOne('SELECT id FROM action_types WHERE id = $1', [id]);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Action type not found',
                    code: 'NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
            }
            const rows = await query(`SELECT * FROM action_type_usage
         WHERE action_type_id = $1
         ORDER BY executed_at DESC
         LIMIT $2 OFFSET $3`, [id, limit, offset]);
            const total = await queryOne('SELECT COUNT(*)::text as count FROM action_type_usage WHERE action_type_id = $1', [id]);
            res.json({
                success: true,
                data: {
                    usage: rows,
                    total: parseInt(total?.count || '0', 10),
                    limit,
                    offset,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ActionTypes] Error fetching usage:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'ACTION_TYPES_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=action-types.js.map