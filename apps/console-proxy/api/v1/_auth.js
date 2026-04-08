/**
 * Enhanced Auth Middleware with API Key Validation & Tenant Isolation
 * SECURITY CRITICAL: All endpoints must use this
 */

const crypto = require('crypto');
const { pool } = require('../../database/client');

// FIX #6: Remove hardcoded fallback — fail hard if no secret configured
const JWT_SECRET = process.env.JWT_SECRET || process.env.VIENNA_SESSION_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET or VIENNA_SESSION_SECRET must be set. Refusing to start with insecure defaults.');
  // In serverless (Vercel), we can't process.exit — reject all auth instead
  // The requireAuth function will deny all requests when JWT_SECRET is falsy
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

function verifyToken(token) {
  try {
    if (!JWT_SECRET) return null; // No secret configured — reject all JWTs
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

async function validateApiKey(apiKey) {
  try {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Look up in database
    const result = await pool.query(
      `SELECT tenant_id, revoked, expires_at, last_used_at, id 
       FROM api_keys 
       WHERE key_hash = $1`,
      [keyHash]
    );
    
    if (result.rows.length === 0) {
      return null; // Invalid key
    }
    
    const key = result.rows[0];
    
    // Check if revoked
    if (key.revoked) {
      return null;
    }
    
    // Check if expired
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return null;
    }
    
    // Update last_used_at (fire and forget, don't await)
    pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    ).catch(err => console.error('[api_key] Failed to update last_used_at:', err));
    
    return {
      tenant_id: key.tenant_id,
      auth_method: 'api_key',
      api_key_id: key.id
    };
  } catch (error) {
    console.error('[api_key] Validation error:', error);
    return null;
  }
}

async function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization || '';
  
  // Parse query params for SSE auth (EventSource can't send headers)
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryToken = url.searchParams.get('token');
  
  // Try JWT token first (Bearer header, cookie, or query param for SSE)
  const jwtToken = authHeader.replace('Bearer ', '') || cookies.vienna_session || queryToken;
  
  if (jwtToken && !jwtToken.startsWith('vos_')) {
    // JWT authentication
    const user = verifyToken(jwtToken);
    if (user && user.tenant_id) {
      return {
        ...user,
        auth_method: 'jwt'
      };
    }
  }
  
  // Try API key (Bearer vos_xxx or X-API-Key header)
  const apiKey = (authHeader.startsWith('Bearer vos_') ? authHeader.replace('Bearer ', '') : null) 
    || req.headers['x-api-key'];
  
  if (apiKey && apiKey.startsWith('vos_')) {
    const validated = await validateApiKey(apiKey);
    if (validated) {
      return validated;
    }
  }
  
  // No valid auth found
  res.status(401).json({ 
    success: false, 
    error: 'Authentication required. Provide JWT token or API key.', 
    code: 'UNAUTHORIZED' 
  });
  return null;
}

/**
 * Helper function to add tenant isolation to SQL queries
 * Usage: const query = withTenantFilter('SELECT * FROM users WHERE active = $1', tenantId);
 */
function withTenantFilter(query, tenantId, existingParams = []) {
  const paramIndex = existingParams.length + 1;
  
  // Add tenant_id filter
  if (query.includes('WHERE')) {
    query += ` AND tenant_id = $${paramIndex}`;
  } else {
    query += ` WHERE tenant_id = $${paramIndex}`;
  }
  
  return {
    query,
    params: [...existingParams, tenantId],
    nextParamIndex: paramIndex + 1
  };
}

module.exports = { 
  requireAuth, 
  withTenantFilter,
  pool  // Export shared pool
};
