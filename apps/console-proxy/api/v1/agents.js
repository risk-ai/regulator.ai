/**
const { requireAuth } = require('./_auth');
 * Agent Registration & Management API
 * Register, configure, and monitor AI agents
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/agents/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // List all agents
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = params.status;
      const tier = params.tier;
      
      let query = 'SELECT * FROM public.agents WHERE 1=1';
      const queryParams = [];
      
      if (status) {
        queryParams.push(status);
        query += ` AND status = $${queryParams.length}`;
      }
      
      if (tier) {
        queryParams.push(tier);
        query += ` AND default_tier = $${queryParams.length}`;
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, queryParams);
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get specific agent
    if (req.method === 'GET' && path.startsWith('/') && !path.includes('/')) {
      const agentId = path.substring(1);
      
      const agent = await pool.query(
        'SELECT * FROM public.agents WHERE id = $1',
        [agentId]
      );
      
      if (agent.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }
      
      // Get agent's execution stats
      const stats = await pool.query(
        `SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN e.event_type = 'execution_completed' THEN 1 END) as completed,
          COUNT(CASE WHEN e.event_type = 'execution_rejected' THEN 1 END) as rejected
        FROM execution_ledger_events e
        WHERE e.execution_id IN (
          SELECT execution_id FROM execution_ledger_events 
          WHERE event_type = 'execution_requested'
        )`
      );
      
      return res.json({
        success: true,
        data: {
          ...agent.rows[0],
          stats: stats.rows[0]
        }
      });
    }
    
    // Register new agent
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const {
        name,
        type,
        description,
        default_tier = 'T0',
        capabilities = [],
        config = {}
      } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'name and type required'
        });
      }
      
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await pool.query(
        `INSERT INTO public.agents (id, name, type, description, default_tier, capabilities, config, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())`,
        [agentId, name, type, description || '', default_tier, JSON.stringify(capabilities), JSON.stringify(config)]
      );
      
      return res.json({
        success: true,
        data: {
          id: agentId,
          name,
          type,
          default_tier,
          status: 'active'
        }
      });
    }
    
    // Update agent
    if (req.method === 'PUT' && path.startsWith('/')) {
      const agentId = path.substring(1).split('/')[0];
      const {
        name,
        description,
        default_tier,
        capabilities,
        config,
        status
      } = req.body;
      
      const updates = [];
      const values = [];
      
      if (name !== undefined) {
        values.push(name);
        updates.push(`name = $${values.length}`);
      }
      if (description !== undefined) {
        values.push(description);
        updates.push(`description = $${values.length}`);
      }
      if (default_tier !== undefined) {
        values.push(default_tier);
        updates.push(`default_tier = $${values.length}`);
      }
      if (capabilities !== undefined) {
        values.push(JSON.stringify(capabilities));
        updates.push(`capabilities = $${values.length}`);
      }
      if (config !== undefined) {
        values.push(JSON.stringify(config));
        updates.push(`config = $${values.length}`);
      }
      if (status !== undefined) {
        values.push(status);
        updates.push(`status = $${values.length}`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      values.push(agentId);
      await pool.query(
        `UPDATE public.agents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
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
        'DELETE FROM public.agents WHERE id = $1',
        [agentId]
      );
      
      return res.json({
        success: true,
        data: { id: agentId, deleted: true }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[agents]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'AGENT_ERROR'
    });
  }
};
