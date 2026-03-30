/**
 * Tenant-Scoped Policies Routes
 *
 * SECURITY: All routes filter by tenant_id for data isolation
 *
 * GET    /api/v1/policies        - List tenant's policies
 * POST   /api/v1/policies        - Create new policy
 * GET    /api/v1/policies/:id    - Get policy details
 * PUT    /api/v1/policies/:id    - Update policy
 * DELETE /api/v1/policies/:id    - Delete policy
 */
import { Router } from 'express';
import { query, queryOne } from '../db/postgres.js';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.js';
import { tenantContextMiddleware, getTenantId } from '../middleware/tenantContext.js';
const router = Router();
// Apply authentication + tenant context to ALL routes
router.use(jwtAuthMiddleware);
router.use(tenantContextMiddleware);
/**
 * GET /api/v1/policies
 * List all policies for current tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const policies = await query(`SELECT id, name, description, enabled, priority, created_at, updated_at
       FROM policies
       WHERE tenant_id = $1
       ORDER BY priority DESC, created_at DESC`, [tenantId]);
        // Get rules for each policy
        const policiesWithRules = await Promise.all(policies.map(async (policy) => {
            const rules = await query(`SELECT id, rule_type, conditions, action, enabled
           FROM policy_rules
           WHERE policy_id = $1
           ORDER BY id`, [policy.id]);
            return { ...policy, rules };
        }));
        res.json({
            success: true,
            data: policiesWithRules,
            count: policiesWithRules.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Policies] List failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'POLICIES_LIST_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/v1/policies
 * Create new policy for current tenant
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { name, description, enabled = true, priority = 0, rules = [] } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: name',
                code: 'INVALID_REQUEST',
                timestamp: new Date().toISOString(),
            });
        }
        // Create policy
        const policy = await queryOne(`INSERT INTO policies (tenant_id, name, description, enabled, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, name, description, enabled, priority, created_at`, [tenantId, name, description || null, enabled, priority]);
        if (!policy) {
            throw new Error('Failed to create policy');
        }
        // Create rules if provided
        const createdRules = [];
        for (const rule of rules) {
            const { rule_type, conditions, action, enabled: ruleEnabled = true } = rule;
            if (!rule_type || !conditions || !action) {
                continue; // Skip invalid rules
            }
            const createdRule = await queryOne(`INSERT INTO policy_rules (policy_id, rule_type, conditions, action, enabled)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, rule_type, conditions, action, enabled`, [policy.id, rule_type, JSON.stringify(conditions), action, ruleEnabled]);
            if (createdRule) {
                createdRules.push(createdRule);
            }
        }
        res.status(201).json({
            success: true,
            data: { ...policy, rules: createdRules },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Policies] Create failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'POLICY_CREATE_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * GET /api/v1/policies/:id
 * Get policy details (tenant-scoped)
 */
router.get('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const policy = await queryOne(`SELECT id, name, description, enabled, priority, created_at, updated_at
       FROM policies
       WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (!policy) {
            return res.status(404).json({
                success: false,
                error: 'Policy not found',
                code: 'POLICY_NOT_FOUND',
                timestamp: new Date().toISOString(),
            });
        }
        // Get rules
        const rules = await query(`SELECT id, rule_type, conditions, action, enabled
       FROM policy_rules
       WHERE policy_id = $1
       ORDER BY id`, [policy.id]);
        res.json({
            success: true,
            data: { ...policy, rules },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Policies] Get failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'POLICY_GET_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * PUT /api/v1/policies/:id
 * Update policy (tenant-scoped)
 */
router.put('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const { name, description, enabled, priority } = req.body;
        // Verify policy belongs to tenant
        const existing = await queryOne('SELECT id FROM policies WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Policy not found',
                code: 'POLICY_NOT_FOUND',
                timestamp: new Date().toISOString(),
            });
        }
        // Update policy
        const updated = await queryOne(`UPDATE policies
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           enabled = COALESCE($3, enabled),
           priority = COALESCE($4, priority),
           updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING id, name, description, enabled, priority, updated_at`, [name, description, enabled, priority, id, tenantId]);
        res.json({
            success: true,
            data: updated,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Policies] Update failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'POLICY_UPDATE_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * DELETE /api/v1/policies/:id
 * Delete policy (tenant-scoped)
 */
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        // Verify policy belongs to tenant
        const existing = await queryOne('SELECT id FROM policies WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Policy not found',
                code: 'POLICY_NOT_FOUND',
                timestamp: new Date().toISOString(),
            });
        }
        // Delete rules first (cascade)
        await query('DELETE FROM policy_rules WHERE policy_id = $1', [id]);
        // Delete policy
        await query('DELETE FROM policies WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({
            success: true,
            data: { id, deleted: true },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Policies] Delete failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'POLICY_DELETE_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
export default router;
//# sourceMappingURL=policies-tenant.js.map