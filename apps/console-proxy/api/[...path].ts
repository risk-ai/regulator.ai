/**
 * Vercel Serverless Function: Direct Backend Integration
 * 
 * Handles all /api/* requests directly instead of proxying.
 * Connects to Neon PostgreSQL for data.
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEON_DATABASE_URL = process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_4wSRU8FXqtiO@ep-flat-wildflower-an6sdkxt.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Simple health check
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.replace(/^\/api\//, '') || '';
  
  // Health check
  if (path === 'v1/health' || path === 'health') {
    return res.status(200).json({
      success: true,
      data: {
        runtime: {
          status: "healthy",
          platform: "vercel-serverless",
          uptime_seconds: Math.floor(Date.now() / 1000)
        },
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Policy templates
  if (path.startsWith('v1/policy-templates')) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: NEON_DATABASE_URL });
    
    try {
      const result = await pool.query(`
        SELECT id, name, category, description, scope, actions, conditions, tier, tags, active, created_at, updated_at
        FROM policy_templates
        ORDER BY category, name
      `);
      
      await pool.end();
      
      return res.status(200).json({
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      await pool.end();
      return res.status(500).json({
        success: false,
        error: error.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
  
  // Agent templates  
  if (path.startsWith('v1/agent-templates')) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: NEON_DATABASE_URL });
    
    try {
      const result = await pool.query(`
        SELECT id, name, role, description, capabilities, default_policies, configuration, tags, active, created_at, updated_at
        FROM agent_templates
        ORDER BY role, name
      `);
      
      await pool.end();
      
      return res.status(200).json({
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      await pool.end();
      return res.status(500).json({
        success: false,
        error: error.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
  
  // Auth endpoints
  if (path.startsWith('v1/auth/login')) {
    // Simple demo login - replace with real auth
    const { email, password } = req.body as any;
    
    if (email === 'demo@regulator.ai' && password === 'demo') {
      return res.status(200).json({
        success: true,
        data: {
          token: 'demo-token-' + Date.now(),
          user: {
            id: 'demo-user',
            email: 'demo@regulator.ai',
            name: 'Demo User'
          }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'AUTH_FAILED'
    });
  }
  
  // Fallback for other endpoints
  return res.status(501).json({
    success: false,
    error: `Endpoint /${path} not yet implemented`,
    code: 'NOT_IMPLEMENTED',
    timestamp: new Date().toISOString()
  });
}
