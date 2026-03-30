/**
 * JWT Refresh Token API
 * Refresh access tokens without re-authentication
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

const JWT_SECRET = process.env.JWT_SECRET || 'vienna-jwt-secret-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'vienna-refresh-secret-change-in-production';

function generateTokens(user) {
  // Short-lived access token (15 minutes)
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Long-lived refresh token (7 days)
  const refreshToken = jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'refresh_token required'
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Check if refresh token is revoked
    const revoked = await pool.query(
      'SELECT revoked FROM public.refresh_tokens WHERE token_hash = $1',
      [crypto.createHash('sha256').update(refresh_token).digest('hex')]
    );
    
    if (revoked.rows.length > 0 && revoked.rows[0].revoked) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token revoked',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Get user
    const user = await pool.query(
      'SELECT id, email, tenant_id, role, name FROM public.users WHERE id = $1',
      [decoded.sub]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.rows[0]);
    
    // Store new refresh token hash
    await pool.query(
      `INSERT INTO public.refresh_tokens (token_hash, user_id, created_at, expires_at, revoked)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '7 days', false)
       ON CONFLICT (token_hash) DO NOTHING`,
      [crypto.createHash('sha256').update(tokens.refreshToken).digest('hex'), user.rows[0].id]
    );
    
    return res.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 900 // 15 minutes
    });
    
  } catch (error) {
    console.error('[refresh]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'REFRESH_ERROR'
    });
  }
};
