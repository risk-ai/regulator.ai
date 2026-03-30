/**
 * Tenant-Scoped Agents Routes
 *
 * SECURITY: All routes filter by tenant_id for data isolation
 *
 * GET    /api/v1/agents          - List tenant's agents
 * POST   /api/v1/agents          - Register new agent
 * GET    /api/v1/agents/:id      - Get agent details
 * POST   /api/v1/agents/:id/heartbeat - Agent heartbeat
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
 * GET /api/v1/agents
 * List all agents for current tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const agents = await query(`SELECT id, name, type, status, last_heartbeat, created_at, metadata
       FROM agents
       WHERE tenant_id = $1
       ORDER BY created_at DESC`, [tenantId]);
        res.json({
            success: true,
            data: agents,
            count: agents.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Agents] List failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'AGENTS_LIST_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/v1/agents
 * Register new agent for current tenant
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { name, type, metadata = {} } = req.body;
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, type',
                code: 'INVALID_REQUEST',
                timestamp: new Date().toISOString(),
            });
        }
        const agent = await queryOne(`INSERT INTO agents (tenant_id, name, type, status, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, name, type, status, created_at, metadata`, [tenantId, name, type, 'active', JSON.stringify(metadata)]);
        res.status(201).json({
            success: true,
            data: agent,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Agents] Create failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'AGENT_CREATE_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * GET /api/v1/agents/:id
 * Get agent details (tenant-scoped)
 */
router.get('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const agent = await queryOne(`SELECT id, name, type, status, last_heartbeat, created_at, metadata
       FROM agents
       WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
                code: 'AGENT_NOT_FOUND',
                timestamp: new Date().toISOString(),
            });
        }
        res.json({
            success: true,
            data: agent,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Agents] Get failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'AGENT_GET_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/v1/agents/:id/heartbeat
 * Update agent heartbeat (tenant-scoped)
 */
router.post('/:id/heartbeat', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const { status = 'active', metadata } = req.body;
        // Verify agent belongs to tenant
        const agent = await queryOne('SELECT id FROM agents WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
                code: 'AGENT_NOT_FOUND',
                timestamp: new Date().toISOString(),
            });
        }
        // Update heartbeat
        const updated = await queryOne(`UPDATE agents
       SET last_heartbeat = NOW(),
           status = $1,
           metadata = COALESCE($2, metadata),
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, status, last_heartbeat`, [status, metadata ? JSON.stringify(metadata) : null, id, tenantId]);
        res.json({
            success: true,
            data: updated,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Agents] Heartbeat failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'HEARTBEAT_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
export default router;
//# sourceMappingURL=agents-tenant.js.map