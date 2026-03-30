/**
 * Authentication API
 * Login, register, and token management
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

const JWT_SECRET = process.env.JWT_SECRET || 'vienna-jwt-secret-change-in-production';

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/auth/, '').replace(/^\/api\/v1\/auth/, '');
  
  try {
    // Login
    if (path === '/login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'email and password required'
        });
      }
      
      // Get user
      const result = await pool.query(
        'SELECT id, email, password_hash, name, tenant_id, role FROM public.users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      const user = result.rows[0];
      
      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Generate JWT
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          tenant_id: user.tenant_id,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id,
          role: user.role
        }
      });
    }
    
    // Register
    if (path === '/register' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'email and password required'
        });
      }
      
      // Check if user exists
      const existing = await pool.query(
        'SELECT id FROM public.users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered'
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = require('crypto').randomUUID();
      const tenantId = require('crypto').randomUUID();
      
      await pool.query(
        `INSERT INTO public.users (id, email, password_hash, name, tenant_id, role, created_at)
         VALUES ($1, $2, $3, $4, $5, 'admin', NOW())`,
        [userId, email.toLowerCase(), passwordHash, name || email, tenantId]
      );
      
      // Generate JWT
      const token = jwt.sign(
        {
          sub: userId,
          email: email.toLowerCase(),
          tenant_id: tenantId,
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          name: name || email,
          tenant_id: tenantId,
          role: 'admin'
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[auth]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'AUTH_ERROR'
    });
  }
};
