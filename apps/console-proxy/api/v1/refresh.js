/**
 * JWT Refresh Token API
 * Refresh access tokens without re-authentication.
 *
 * NOTE: This endpoint does NOT require an access token (requireAuth).
 * The refresh token itself is the credential. If we required a valid
 * access token to refresh, expired tokens could never be refreshed
 * (infinite retry loop).
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../../database/client');

const JWT_SECRET = process.env.JWT_SECRET || process.env.VIENNA_SESSION_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.VIENNA_SESSION_SECRET;
if (!JWT_SECRET) console.error('[refresh] FATAL: JWT_SECRET or VIENNA_SESSION_SECRET must be set');
if (!REFRESH_SECRET) console.error('[refresh] FATAL: REFRESH_SECRET or VIENNA_SESSION_SECRET must be set');

function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Parse body (Vercel serverless may or may not have parsed it)
    let body = req.body;
    if (!body || typeof body === 'string') {
      try {
        body = typeof body === 'string' ? JSON.parse(body) : {};
      } catch {
        body = {};
      }
    }

    // Accept both camelCase (client sends) and snake_case
    const token = body.refreshToken || body.refresh_token;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'refreshToken required',
        code: 'INVALID_REQUEST',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED',
      });
    }

    // Check if refresh token is revoked
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const revoked = await pool.query(
      'SELECT revoked FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    if (revoked.rows.length > 0 && revoked.rows[0].revoked) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token revoked',
        code: 'UNAUTHORIZED',
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, email, tenant_id, role, name FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'UNAUTHORIZED',
      });
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const tokens = generateTokens(user);

    // Store new refresh token hash
    const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_tokens (id, token_hash, user_id, created_at, expires_at, revoked)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', false)
       ON CONFLICT (token_hash) DO NOTHING`,
      [crypto.randomUUID(), newHash, user.id]
    );

    // Return both camelCase (for client) and snake_case (for compat)
    return res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900,
      },
      // Legacy snake_case fields
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 900,
    });
  } catch (error) {
    console.error('[refresh]', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
};
