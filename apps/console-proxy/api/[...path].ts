/**
 * Vienna OS Backend API - Vercel Serverless
 * Direct Neon PostgreSQL connection
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Neon connection pool
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
    }
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = (req.url || '').replace(/^\/api\//, '').split('?')[0];
  
  try {
    // Health check
    if (path === 'v1/health' || path === 'health') {
      const db = getPool();
      const start = Date.now();
      await db.query('SELECT 1');
      const latency = Date.now() - start;
      
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        mode: 'vercel-serverless',
        checks: {
          database: {
            status: 'healthy',
            latency_ms: latency
          }
        }
      });
    }
    
    // Policy Templates
    if (path.startsWith('v1/policy-templates')) {
      const db = getPool();
      const result = await db.query(`
        SELECT id, name, category, description, icon, enabled, priority, rules, tags, use_count, created_at, updated_at
        FROM policy_templates
        WHERE enabled = true
        ORDER BY category, name
      `);
      
      return res.json({
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    }
    
    // Agent Templates
    if (path.startsWith('v1/agent-templates')) {
      const db = getPool();
      const result = await db.query(`
        SELECT id, name, description, framework, icon, enabled, config, policies, integration_code, quick_start_guide, tags, use_count, created_at, updated_at
        FROM agent_templates
        WHERE enabled = true
        ORDER BY framework, name
      `);
      
      return res.json({
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    }
    
    // Analytics Overview
    if (path.startsWith('v1/analytics/overview')) {
      return res.json({
        success: true,
        data: {
          totalAgents: 0,
          totalPolicies: 0,
          totalExecutions: 0,
          successRate: 0
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Activity Feed
    if (path.startsWith('v1/activity')) {
      return res.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      });
    }
    
    // Auth - Demo login
    if (path === 'v1/auth/login') {
      const { email, password } = req.body as any;
      
      if (email === 'demo@regulator.ai' && password === 'demo') {
        return res.json({
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
    
    // Fallback
    return res.status(501).json({
      success: false,
      error: `Endpoint not yet implemented: /${path}`,
      code: 'NOT_IMPLEMENTED',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`[API Error] ${path}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}
