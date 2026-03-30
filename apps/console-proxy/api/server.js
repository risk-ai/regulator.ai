const { Pool } = require('pg');
const crypto = require('crypto');

// Lazy pool init
let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    // Set search path to regulator schema
    pool.on('connect', (client) => {
      client.query("SET search_path TO regulator, public");
    });
  }
  return pool;
}

async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

// Simple JWT
const JWT_SECRET = process.env.JWT_SECRET || process.env.VIENNA_SESSION_SECRET || 'fallback-secret';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
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

// Simple bcrypt comparison using crypto (won't work with bcryptjs hashes, but let's try)
async function comparePassword(plain, hash) {
  try {
    // Use bcryptjs if available, fall back to direct comparison
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

async function hashPassword(plain) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(plain, 10);
}

// Parse cookies
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

// CORS headers
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Parse body
function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body) return resolve(req.body);
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

// Extract and verify auth from request, returns user payload or null
function getAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = (req.headers.authorization || '').replace('Bearer ', '') || cookies.vienna_session;
  if (!token) return null;
  return verifyToken(token);
}

// Require auth — returns user or sends 401
function requireAuth(req, res) {
  const user = getAuth(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    return null;
  }
  if (!user.tenant_id) {
    res.status(401).json({ success: false, error: 'Invalid token (missing tenant)', code: 'INVALID_TOKEN' });
    return null;
  }
  return user;
}

module.exports = async function handler(req, res) {
  cors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname;

  try {
    // Health check (public)
    if (path === '/health' || path === '/api/v1/health') {
      const start = Date.now();
      await query('SELECT 1');
      const dbLatency = Date.now() - start;
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '8.1.0',
        mode: 'vercel-serverless',
        checks: {
          database: { status: 'healthy', latency_ms: dbLatency },
        }
      });
    }

    // Auth: Login (public)
    if (path === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }

      const users = await query(
        'SELECT id, email, name, password_hash, tenant_id, role FROM regulator.users WHERE email = $1 LIMIT 1',
        [email]
      );
      
      if (users.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = users[0];
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = createToken({
        sub: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role || 'admin',
      });

      // Set cookie
      res.setHeader('Set-Cookie', `vienna_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
      
      // Audit log
      query(
        `INSERT INTO regulator.audit_log (event, actor, details, tenant_id, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        ['operator_login', user.name || user.email, JSON.stringify({ email: user.email, ip: req.headers['x-forwarded-for'] || 'unknown' }), user.tenant_id]
      ).catch(() => {});

      // Update last_login_at
      query('UPDATE regulator.users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id,
          role: user.role || 'admin',
        },
        token,
      });
    }

    // Auth: Register (public)
    if (path === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password, name, company, plan } = body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }

      // Check existing
      const existing = await query('SELECT id FROM regulator.users WHERE email = $1', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      const id = crypto.randomUUID();
      const tenantId = crypto.randomUUID();
      const slug = (company || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      const passwordHash = await hashPassword(password);
      
      // Create tenant first
      await query(
        `INSERT INTO regulator.tenants (id, name, slug, created_at) VALUES ($1, $2, $3, NOW())`,
        [tenantId, company || email.split('@')[0], slug]
      );

      await query(
        `INSERT INTO regulator.users (id, email, name, password_hash, tenant_id, role, created_at)
         VALUES ($1, $2, $3, $4, $5, 'admin', NOW())`,
        [id, email, name || email.split('@')[0], passwordHash, tenantId]
      );

      const token = createToken({
        sub: id,
        email,
        tenant_id: tenantId,
        role: 'admin',
      });

      res.setHeader('Set-Cookie', `vienna_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
      
      return res.status(201).json({
        success: true,
        user: { id, email, name: name || email.split('@')[0], tenant_id: tenantId, role: 'admin' },
        token,
      });
    }

    // Auth: Check session (public)
    if (path === '/api/v1/auth/check' || path === '/api/v1/auth/session') {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.vienna_session || (req.headers.authorization || '').replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session' });
      }

      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          id: payload.sub,
          email: payload.email,
          tenant_id: payload.tenant_id,
          role: payload.role,
        }
      });
    }

    // Auth: Logout (public)
    if (path === '/api/v1/auth/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', 'vienna_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      return res.status(200).json({ success: true });
    }

    // Status (public)
    if (path === '/api/v1/system/status' || path === '/api/v1/status') {
      return res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          mode: 'vercel-serverless',
          timestamp: new Date().toISOString(),
          version: '8.1.0',
        }
      });
    }

    // Policy templates (public, static)
    if (path === '/api/v1/policy-templates') {
      return res.status(200).json({ success: true, data: [] });
    }

    // Reconciliation safe-mode (public, static)
    if (path === '/api/v1/reconciliation/safe-mode') {
      return res.status(200).json({ success: true, data: { active: false } });
    }

    // ========================================================
    // PROTECTED ROUTES — require auth + tenant isolation
    // ========================================================

    if (path.startsWith('/api/')) {
      const user = requireAuth(req, res);
      if (!user) return; // 401 already sent

      const tenantId = user.tenant_id;

      // Dashboard bootstrap (tenant-scoped counts)
      if (path === '/api/v1/dashboard/bootstrap') {
        const [agents, warrants, policies] = await Promise.all([
          query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM regulator.agent_registry WHERE tenant_id = $1', [tenantId]),
          query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE revoked = false AND expires_at > NOW()) as active FROM regulator.warrants WHERE tenant_id = $1', [tenantId]),
          query('SELECT COUNT(*) as total FROM regulator.policies WHERE tenant_id = $1', [tenantId]),
        ]);
        return res.status(200).json({
          success: true,
          data: {
            system: { status: 'healthy', mode: 'vercel-serverless', version: '8.1.0' },
            agents: { total: parseInt(agents[0]?.total || 0), active: parseInt(agents[0]?.active || 0) },
            warrants: { total: parseInt(warrants[0]?.total || 0), active: parseInt(warrants[0]?.active || 0) },
            policies: { total: parseInt(policies[0]?.total || 0) },
            executions: { total: 0, recent: [] },
          }
        });
      }

      // Agents list (tenant-scoped)
      if (path === '/api/v1/agents' && req.method === 'GET') {
        const agents = await query(
          'SELECT * FROM regulator.agent_registry WHERE tenant_id = $1 ORDER BY registered_at DESC LIMIT 50',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: agents });
      }

      // Policies list (tenant-scoped)
      if (path === '/api/v1/policies' && req.method === 'GET') {
        const policies = await query(
          'SELECT * FROM regulator.policies WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
          [tenantId]
        );
        // Get policy rules for this tenant
        const rules = await query(
          'SELECT id, name, description, conditions, action_on_match, approval_tier, required_approvers, priority, enabled FROM regulator.policy_rules WHERE tenant_id = $1 ORDER BY priority DESC, id',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: policies, rules, count: policies.length });
      }

      // Warrants list (tenant-scoped)
      if (path.match(/\/api\/v1\/(warrants|approvals)/) && req.method === 'GET') {
        const warrants = await query(
          'SELECT * FROM regulator.warrants WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: warrants });
      }

      // Proposals list (tenant-scoped)
      if (path === '/api/v1/proposals' && req.method === 'GET') {
        const proposals = await query(
          'SELECT * FROM regulator.proposals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: proposals });
      }

      // Audit log (tenant-scoped)
      if (path === '/api/v1/audit/recent') {
        const events = await query(
          'SELECT * FROM regulator.audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: events });
      }

      // API keys (tenant-scoped)
      if (path === '/api/v1/auth/api-keys' && req.method === 'GET') {
        const keys = await query(
          'SELECT id, name, key_prefix, scopes, expires_at, created_at, last_used_at FROM regulator.api_keys WHERE tenant_id = $1 ORDER BY created_at DESC',
          [tenantId]
        );
        return res.status(200).json({ success: true, data: keys });
      }

      // Default: return empty success for unimplemented tenant-scoped routes
      return res.status(200).json({ 
        success: true, 
        data: [],
        _note: 'Lightweight mode - limited API surface'
      });
    }

    // Not found
    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (err) {
    console.error('[API Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};
