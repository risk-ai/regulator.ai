/**
 * Agent Registration & Management API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');

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
      const tier = params.tier;
      const page = parseInt(params.page || '1', 10);
      const limit = Math.min(parseInt(params.limit || '50', 10), 100); // Max 100
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM public.agents WHERE tenant_id = $1';
      const queryParams = [tenantId];
      
      if (status) {
        queryParams.push(status);
        query += ` AND status = $${queryParams.length}`;
      }
      
      if (tier) {
        queryParams.push(tier);
        query += ` AND default_tier = $${queryParams.length}`;
      }
      
      query += ' ORDER BY created_at DESC';
      
      // Add pagination
      queryParams.push(limit);
      query += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      query += ` OFFSET $${queryParams.length}`;
      
      const result = await pool.query(query, queryParams);
      
      // Get total count for pagination metadata
      let countQuery = 'SELECT COUNT(*) FROM public.agents WHERE tenant_id = $1';
      const countParams = [tenantId];
      
      if (status) {
        countParams.push(status);
        countQuery += ` AND status = $${countParams.length}`;
      }
      
      if (tier) {
        countParams.push(tier);
        countQuery += ` AND default_tier = $${countParams.length}`;
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count, 10);
      
      return res.json({
        success: true,
        data: result.rows,
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
        'SELECT * FROM public.agents WHERE id = $1 AND tenant_id = $2',
        [agentId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
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
        `INSERT INTO public.agents (id, name, type, description, default_tier, capabilities, config, status, tenant_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())`,
        [agentId, name, type, description || '', default_tier, JSON.stringify(capabilities), JSON.stringify(config), tenantId]
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
      const agentId = path.substring(1);
      const updates = [];
      const values = [];
      
      const fields = ['name', 'description', 'default_tier', 'status'];
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          values.push(req.body[field]);
          updates.push(`${field} = $${values.length}`);
        }
      }
      
      if (req.body.capabilities) {
        values.push(JSON.stringify(req.body.capabilities));
        updates.push(`capabilities = $${values.length}`);
      }
      
      if (req.body.config) {
        values.push(JSON.stringify(req.body.config));
        updates.push(`config = $${values.length}`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      values.push(agentId);
      values.push(tenantId);
      
      await pool.query(
        `UPDATE public.agents SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}`,
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
        'DELETE FROM public.agents WHERE id = $1 AND tenant_id = $2',
        [agentId, tenantId]
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
