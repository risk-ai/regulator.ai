/**
 * Policy Management API
 * CRUD operations for governance policies
 */

const { requireAuth } = require('./_auth');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/policies/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // List all policies
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const enabled = params.enabled;
      const tier = params.tier;
      
      let query = 'SELECT * FROM public.policies WHERE 1=1';
      const queryParams = [];
      
      if (enabled !== undefined) {
        queryParams.push(enabled === 'true' ? 1 : 0);
        query += ` AND enabled = $${queryParams.length}`;
      }
      
      if (tier) {
        queryParams.push(tier);
        query += ` AND tier = $${queryParams.length}`;
      }
      
      query += ' ORDER BY priority DESC, created_at DESC';
      
      const result = await pool.query(query, queryParams);
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get specific policy
    if (req.method === 'GET' && path.startsWith('/')) {
      const policyId = path.substring(1);
      
      const result = await pool.query(
        'SELECT * FROM public.policies WHERE id = $1',
        [policyId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found'
        });
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // Create new policy
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const {
        name,
        description,
        tier,
        rules,
        enabled = true,
        priority = 100
      } = req.body;
      
      if (!name || !tier) {
        return res.status(400).json({
          success: false,
          error: 'name and tier required'
        });
      }
      
      const policyId = `policy_${Date.now()}`;
      
      await pool.query(
        `INSERT INTO public.policies (id, name, description, tier, rules, enabled, priority, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [policyId, name, description || '', tier, JSON.stringify(rules || {}), enabled ? 1 : 0, priority]
      );
      
      return res.json({
        success: true,
        data: {
          id: policyId,
          name,
          tier,
          enabled
        }
      });
    }
    
    // Update policy
    if (req.method === 'PUT' && path.startsWith('/')) {
      const policyId = path.substring(1);
      const {
        name,
        description,
        tier,
        rules,
        enabled,
        priority
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
      if (tier !== undefined) {
        values.push(tier);
        updates.push(`tier = $${values.length}`);
      }
      if (rules !== undefined) {
        values.push(JSON.stringify(rules));
        updates.push(`rules = $${values.length}`);
      }
      if (enabled !== undefined) {
        values.push(enabled ? 1 : 0);
        updates.push(`enabled = $${values.length}`);
      }
      if (priority !== undefined) {
        values.push(priority);
        updates.push(`priority = $${values.length}`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      values.push(policyId);
      await pool.query(
        `UPDATE public.policies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
        values
      );
      
      return res.json({
        success: true,
        data: { id: policyId, updated: updates.length }
      });
    }
    
    // Delete policy
    if (req.method === 'DELETE' && path.startsWith('/')) {
      const policyId = path.substring(1);
      
      await pool.query(
        'DELETE FROM public.policies WHERE id = $1',
        [policyId]
      );
      
      return res.json({
        success: true,
        data: { id: policyId, deleted: true }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[policies]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'POLICY_ERROR'
    });
  }
};
