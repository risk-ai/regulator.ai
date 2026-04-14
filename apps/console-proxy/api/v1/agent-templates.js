/**
 * Agent Templates API
 * Returns curated agent templates for quick fleet setup
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
        capabilities,
        recommended_policies,
        trust_level,
        config_template,
        tags,
        created_at
      FROM agent_templates
      ORDER BY category, name
    `);
    
    await pool.end();
    
    return res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        capabilities: row.capabilities || [],
        recommended_policies: row.recommended_policies || [],
        trust_level: row.trust_level,
        config_template: row.config_template,
        tags: row.tags || [],
        created_at: row.created_at
      }))
    });
    
  } catch (error) {
    captureException(error, { tags: { endpoint: 'agent-templates' } });
    console.error('Agent templates error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
