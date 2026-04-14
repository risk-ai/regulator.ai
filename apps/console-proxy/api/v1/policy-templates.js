/**
 * Policy Templates API
 * Returns curated policy templates for quick setup
 */

const { requireAuth } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query(`
      SET search_path TO regulator, public;
      
      SELECT 
        id,
        name,
        description,
        category,
        conditions,
        actions,
        priority,
        enabled,
        tags,
        created_at
      FROM policy_templates
      ORDER BY category, priority DESC, name
    `);
    
    await pool.end();
    
    return res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        conditions: row.conditions,
        actions: row.actions,
        priority: row.priority,
        enabled: row.enabled,
        tags: row.tags || [],
        created_at: row.created_at
      }))
    });
    
  } catch (error) {
    captureException(error, { tags: { endpoint: 'policy-templates' } });
    console.error('Policy templates error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
