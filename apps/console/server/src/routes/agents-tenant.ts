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

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres.js';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.js';
import { tenantContextMiddleware, getTenantId, getUserId } from '../middleware/tenantContext.js';

const router = Router();

// Apply authentication + tenant context to ALL routes
router.use(jwtAuthMiddleware);
router.use(tenantContextMiddleware);

interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

/**
 * GET /api/v1/agents
 * List all agents for current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    const agents = await query<Agent>(
      `SELECT id, display_name as name, agent_type as type, status, last_heartbeat, registered_at as created_at, config as metadata
       FROM agent_registry
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY registered_at DESC`,
      [tenantId]
    );
    
    res.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
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
router.post('/', async (req: Request, res: Response) => {
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
    
    const agent = await queryOne<Agent>(
      `INSERT INTO agent_registry (tenant_id, agent_id, display_name, agent_type, status, config, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, display_name as name, agent_type as type, status, registered_at as created_at, config as metadata`,
      [tenantId, name.toLowerCase().replace(/\s+/g, '-'), name, type, 'active', JSON.stringify(metadata), 'console']
    );
    
    res.status(201).json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    
    const agent = await queryOne<Agent>(
      `SELECT id, display_name as name, agent_type as type, status, last_heartbeat, registered_at as created_at, config as metadata
       FROM agent_registry
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    
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
  } catch (error: any) {
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
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { status = 'active', metadata } = req.body;
    
    // Verify agent belongs to tenant
    const agent = await queryOne<Agent>(
      'SELECT id FROM agent_registry WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)',
      [id, tenantId]
    );
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Update heartbeat
    const updated = await queryOne<Agent>(
      `UPDATE agent_registry
       SET last_heartbeat = NOW(),
           status = $1,
           config = COALESCE($2, config),
           updated_at = NOW()
       WHERE id = $3 AND (tenant_id = $4 OR tenant_id IS NULL)
       RETURNING id, status, last_heartbeat`,
      [status, metadata ? JSON.stringify(metadata) : null, id, tenantId]
    );
    
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
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
