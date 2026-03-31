/**
 * Agent Registration & Management API
 * TENANT-ISOLATED: All queries filter by tenant_id
 * Uses regulator.agent_registry table (resolved via search_path)
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/agents/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // List agents (with pagination)
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = params.status;
      const page = parseInt(params.page || '1', 10);
      const limit = Math.min(parseInt(params.limit || '50', 10), 100);
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM agent_registry WHERE tenant_id = $1';
      const queryParams = [tenantId];
      
      if (status) {
        queryParams.push(status);
        query += ` AND status = $${queryParams.length}`;
      }
      
      query += ' ORDER BY registered_at DESC';
      queryParams.push(limit);
      query += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      query += ` OFFSET $${queryParams.length}`;
      
      const result = await pool.query(query, queryParams);
      
      let countQuery = 'SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1';
      const countParams = [tenantId];
      if (status) {
        countParams.push(status);
        countQuery += ` AND status = $${countParams.length}`;
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count, 10);
      
      // Map agent_registry columns to expected API shape
      const data = result.rows.map(r => ({
        id: r.id,
        agent_id: r.agent_id,
        name: r.display_name,
        type: r.agent_type,
        description: r.description,
        status: r.status,
        trust_score: r.trust_score,
        config: r.config,
        tags: r.tags,
        rate_limit_per_minute: r.rate_limit_per_minute,
        rate_limit_per_hour: r.rate_limit_per_hour,
        last_heartbeat: r.last_heartbeat,
        created_at: r.registered_at,
        updated_at: r.updated_at,
        tenant_id: r.tenant_id,
      }));
      
      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + result.rows.length < total,
          hasPrev: page > 1,
        },
      });
    }
    
    // Get specific agent
    if (req.method === 'GET' && path.startsWith('/')) {
      const agentId = path.substring(1);
      
      const result = await pool.query(
        'SELECT * FROM agent_registry WHERE (id::text = $1 OR agent_id = $1) AND tenant_id = $2',
        [agentId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      
      const r = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: r.id,
          agent_id: r.agent_id,
          name: r.display_name,
          type: r.agent_type,
          description: r.description,
          status: r.status,
          trust_score: r.trust_score,
          config: r.config,
          tags: r.tags,
          rate_limit_per_minute: r.rate_limit_per_minute,
          rate_limit_per_hour: r.rate_limit_per_hour,
          last_heartbeat: r.last_heartbeat,
          created_at: r.registered_at,
          updated_at: r.updated_at,
        }
      });
    }
    
    // Register new agent
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const {
        name,
        agent_id,
        type = 'autonomous',
        description,
        config = {},
        tags = [],
        rate_limit_per_minute = 60,
        rate_limit_per_hour = 1000,
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      
      const newAgentId = agent_id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await pool.query(
        `INSERT INTO agent_registry (agent_id, display_name, agent_type, description, config, tags, 
         rate_limit_per_minute, rate_limit_per_hour, status, tenant_id, registered_at, registered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), $10)
         RETURNING *`,
        [newAgentId, name, type, description || '', JSON.stringify(config), tags, 
         rate_limit_per_minute, rate_limit_per_hour, tenantId, user.sub || user.email || 'system']
      );
      
      return res.json({
        success: true,
        data: {
          id: result.rows[0].id,
          agent_id: newAgentId,
          name,
          type,
          status: 'active'
        }
      });
    }
    
    // Update agent
    if (req.method === 'PUT' && path.startsWith('/')) {
      const agentId = path.substring(1);
      const updates = [];
      const values = [];
      
      const fieldMap = {
        name: 'display_name',
        type: 'agent_type',
        description: 'description',
        status: 'status',
        trust_score: 'trust_score',
        rate_limit_per_minute: 'rate_limit_per_minute',
        rate_limit_per_hour: 'rate_limit_per_hour',
      };
      
      for (const [apiField, dbField] of Object.entries(fieldMap)) {
        if (req.body[apiField] !== undefined) {
          values.push(req.body[apiField]);
          updates.push(`${dbField} = $${values.length}`);
        }
      }
      
      if (req.body.config) {
        values.push(JSON.stringify(req.body.config));
        updates.push(`config = $${values.length}`);
      }
      
      if (req.body.tags) {
        values.push(req.body.tags);
        updates.push(`tags = $${values.length}`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }
      
      values.push(agentId);
      values.push(tenantId);
      
      await pool.query(
        `UPDATE agent_registry SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE (id::text = $${values.length - 1} OR agent_id = $${values.length - 1}) AND tenant_id = $${values.length}`,
        values
      );
      
      return res.json({
        success: true,
        data: { id: agentId, updated: updates.length }
      });
    }
    
    // Delete agent
    if (req.method === 'DELETE' && path.startsWith('/')) {
      const agentId = path.substring(1);
      
      await pool.query(
        'DELETE FROM agent_registry WHERE (id::text = $1 OR agent_id = $1) AND tenant_id = $2',
        [agentId, tenantId]
      );
      
      return res.json({
        success: true,
        data: { id: agentId, deleted: true }
      });
    }
    
    return res.status(404).json({ success: false, error: 'Not found' });
    
  } catch (error) {
    console.error('[agents]', error);
    captureException(error, { endpoint: 'agents', tenantId });
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'AGENT_ERROR'
    });
  }
};
