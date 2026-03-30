/**
 * EMERGENCY AUTH MIDDLEWARE
 * Add this to all /api/v1/*.js endpoint files
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || process.env.VIENNA_SESSION_SECRET || 'fallback-secret';

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
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = (req.headers.authorization || '').replace('Bearer ', '') || cookies.vienna_session;
  
  if (!token) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentication required', 
      code: 'UNAUTHORIZED' 
    });
    return null;
  }

  const user = verifyToken(token);
  if (!user || !user.tenant_id) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token', 
      code: 'INVALID_TOKEN' 
    });
    return null;
  }

  return user;
}

module.exports = { requireAuth };
