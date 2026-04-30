/**
 * Policy Management API
 * CRUD operations for governance policies
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, withTenantFilter, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/policies/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = await requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // List all policies (with pagination)
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const enabled = params.enabled;
      const riskTier = params.risk_tier || params.tier;
      const page = parseInt(params.page || '1', 10);
      const limit = Math.min(parseInt(params.limit || '50', 10), 100);
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM policies WHERE tenant_id = $1';
      const queryParams = [tenantId];
      
      if (enabled !== undefined) {
        queryParams.push(enabled === 'true');
        query += ` AND enabled = $${queryParams.length}`;
      }
      
      if (riskTier) {
        queryParams.push(parseInt(riskTier, 10));
        query += ` AND risk_tier = $${queryParams.length}`;
      }
      
      query += ' ORDER BY priority DESC, created_at DESC';
      
      // Add pagination
      queryParams.push(limit);
      query += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      query += ` OFFSET $${queryParams.length}`;
      
      const result = await pool.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM policies WHERE tenant_id = $1';
      const countParams = [tenantId];
      
      if (enabled !== undefined) {
        countParams.push(enabled === 'true');
        countQuery += ` AND enabled = $${countParams.length}`;
      }
      
      if (riskTier) {
        countParams.push(parseInt(riskTier, 10));
        countQuery += ` AND risk_tier = $${countParams.length}`;
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
    
    // Get specific policy
    if (req.method === 'GET' && path.startsWith('/')) {
      const policyId = path.substring(1);
      
      const result = await pool.query(
        'SELECT * FROM policies WHERE id = $1 AND tenant_id = $2',
        [policyId, tenantId]
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
        risk_tier,
        tier,          // accept legacy param name
        rules,
        enabled = true,
        priority = 100
      } = req.body;
      
      const riskTier = risk_tier ?? tier ?? 1;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'name is required'
        });
      }
      
      const policyId = require('crypto').randomUUID();
      
      await pool.query(
        `INSERT INTO policies (id, name, description, risk_tier, rules, enabled, priority, tenant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [policyId, name, description || '', riskTier, JSON.stringify(rules || {}), enabled !== false, priority, tenantId]
      );
      
      return res.json({
        success: true,
        data: {
          id: policyId,
          name,
          risk_tier: riskTier,
          enabled,
          priority
        }
      });
    }
    
    // Update policy
    if (req.method === 'PUT' && path.startsWith('/')) {
      const policyId = path.substring(1);
      const {
        name,
        description,
        risk_tier,
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
      const riskTierValue = risk_tier ?? tier;
      if (riskTierValue !== undefined) {
        values.push(parseInt(riskTierValue, 10));
        updates.push(`risk_tier = $${values.length}`);
      }
      if (rules !== undefined) {
        values.push(JSON.stringify(rules));
        updates.push(`rules = $${values.length}`);
      }
      if (enabled !== undefined) {
        values.push(enabled !== false);
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
      values.push(tenantId);
      await pool.query(
        `UPDATE policies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length - 1} AND tenant_id = $${values.length}`,
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
        'DELETE FROM policies WHERE id = $1 AND tenant_id = $2',
        [policyId, tenantId]
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
    captureException(error, { endpoint: 'policies', tenantId });
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'POLICY_ERROR'
    });
  }
};
