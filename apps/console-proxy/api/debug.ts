/**
 * Debug endpoint to test Neon connection
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!DATABASE_URL) {
      return res.json({ error: 'No DATABASE_URL' });
    }
    
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    // Test connection
    const test = await pool.query('SELECT 1 as test');
    
    // Count tables
    const tables = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Count policy templates (all)
    const allPolicies = await pool.query('SELECT COUNT(*) as count FROM policy_templates');
    
    // Count enabled policy templates
    const enabledPolicies = await pool.query('SELECT COUNT(*) as count FROM policy_templates WHERE enabled = true');
    
    // Get sample
    const sample = await pool.query('SELECT id, name, enabled FROM policy_templates LIMIT 3');
    
    await pool.end();
    
    return res.json({
      database_url_set: !!DATABASE_URL,
      database_url_preview: DATABASE_URL.substring(0, 50) + '...',
      connection_test: test.rows[0],
      tables: tables.rows[0],
      all_policies: allPolicies.rows[0],
      enabled_policies: enabledPolicies.rows[0],
      sample: sample.rows
    });
    
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
