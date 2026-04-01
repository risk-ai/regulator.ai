/**
 * Auth Utilities
 * JWT parsing and tenant extraction
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || process.env.VIENNA_SESSION_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET or VIENNA_SESSION_SECRET must be set.');

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

/**
 * Extract tenant_id from request (JWT token in cookie or Authorization header)
 */
function extractTenantId(req) {
  try {
    const cookies = parseCookies(req.headers?.cookie);
    const token = cookies?.vienna_session || (req.headers?.authorization || '').replace('Bearer ', '');
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.tenant_id || null;
  } catch { return null; }
}

/**
 * Require authentication (middleware)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} options - { optional: boolean }
 * @returns {Promise<Object|null>} User payload or null if optional
 */
async function requireAuth(req, res, options = {}) {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies?.vienna_session || (req.headers?.authorization || '').replace('Bearer ', '');
  
  if (!token) {
    if (options.optional) return null;
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    if (options.optional) return null;
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
  
  return payload;
}

module.exports = {
  parseCookies,
  verifyToken,
  extractTenantId,
  requireAuth,
};
