/**
 * RBAC Roles & Permissions API
 * Full CRUD for roles, user-role assignments, and permission checks.
 * TENANT-ISOLATED: All queries filter by tenant_id
 *
 * Schema: roles (id, tenant_id, role_name, display_name, description, permissions, is_system_role)
 *         user_role_assignments (id, tenant_id, user_id, role_id, assigned_by, assigned_at, expires_at)
 *         role_audit_log (id, tenant_id, action, target_role_id, target_user_id, actor_id, details)
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/roles/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── List all roles ──────────────────────────────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const roles = await pool.query(
        'SELECT * FROM roles WHERE tenant_id = $1 ORDER BY is_system_role DESC, role_name ASC',
        [tenantId]
      );
      return res.json({ success: true, data: roles.rows });
    }

    // ── Get specific role with assignments ──────────────────────────
    // Reserved sub-paths that should NOT be treated as role IDs
    const reservedPaths = ['/assignments', '/permissions', '/users', '/audit'];
    if (req.method === 'GET' && path.match(/^\/[^/]+$/) && !reservedPaths.some(rp => path === rp)) {
      const roleId = path.substring(1);
      const role = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND tenant_id = $2',
        [roleId, tenantId]
      );
      if (role.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      const assignments = await pool.query(
        `SELECT ura.*, u.email, u.name 
         FROM user_role_assignments ura 
         LEFT JOIN users u ON u.id = ura.user_id
         WHERE ura.role_id = $1 AND ura.tenant_id = $2
         ORDER BY ura.assigned_at DESC`,
        [roleId, tenantId]
      );
      return res.json({
        success: true,
        data: { ...role.rows[0], assignments: assignments.rows },
      });
    }

    // ── Create custom role ──────────────────────────────────────────
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const body = await parseBody(req);
      const { role_name, display_name, description, permissions = [] } = body;
      if (!role_name) {
        return res.status(400).json({ success: false, error: 'role_name is required' });
      }
      const result = await pool.query(
        `INSERT INTO roles (tenant_id, role_name, display_name, description, permissions, is_system_role)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
        [tenantId, role_name, display_name || role_name, description || null, JSON.stringify(permissions)]
      );
      // Audit
      await pool.query(
        `INSERT INTO role_audit_log (tenant_id, action, target_role_id, actor_id, details)
         VALUES ($1, 'role_created', $2, $3, $4)`,
        [tenantId, result.rows[0].id, user.sub || user.email || 'system', JSON.stringify({ role_name, permissions })]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ── Update role ─────────────────────────────────────────────────
    if (req.method === 'PUT' && path.match(/^\/[^/]+$/)) {
      const roleId = path.substring(1);
      const body = await parseBody(req);
      
      // Don't allow editing system roles
      const existing = await pool.query(
        'SELECT is_system_role FROM roles WHERE id = $1 AND tenant_id = $2',
        [roleId, tenantId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      if (existing.rows[0].is_system_role) {
        return res.status(403).json({ success: false, error: 'Cannot modify system roles' });
      }

      const sets = []; const vals = []; let idx = 1;
      for (const [k, v] of Object.entries(body)) {
        if (['display_name', 'description', 'permissions'].includes(k)) {
          sets.push(`${k} = $${idx}`);
          vals.push(k === 'permissions' ? JSON.stringify(v) : v);
          idx++;
        }
      }
      if (sets.length > 0) {
        vals.push(roleId, tenantId);
        await pool.query(
          `UPDATE roles SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1}`,
          vals
        );
      }
      const updated = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      return res.json({ success: true, data: updated.rows[0] });
    }

    // ── Delete custom role ──────────────────────────────────────────
    if (req.method === 'DELETE' && path.match(/^\/[^/]+$/)) {
      const roleId = path.substring(1);
      const existing = await pool.query(
        'SELECT is_system_role, role_name FROM roles WHERE id = $1 AND tenant_id = $2',
        [roleId, tenantId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      if (existing.rows[0].is_system_role) {
        return res.status(403).json({ success: false, error: 'Cannot delete system roles' });
      }
      // Remove assignments first
      await pool.query('DELETE FROM user_role_assignments WHERE role_id = $1 AND tenant_id = $2', [roleId, tenantId]);
      await pool.query('DELETE FROM roles WHERE id = $1 AND tenant_id = $2', [roleId, tenantId]);
      await pool.query(
        `INSERT INTO role_audit_log (tenant_id, action, target_role_id, actor_id, details)
         VALUES ($1, 'role_deleted', $2, $3, $4)`,
        [tenantId, roleId, user.sub || user.email || 'system', JSON.stringify({ role_name: existing.rows[0].role_name })]
      );
      return res.json({ success: true, data: { deleted: true } });
    }

    // ── List all assignments ────────────────────────────────────────
    if (req.method === 'GET' && path === '/assignments') {
      const assignments = await pool.query(
        `SELECT ura.*, r.role_name, r.display_name AS role_display_name, u.email, u.name AS user_name
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         LEFT JOIN users u ON u.id = ura.user_id
         WHERE ura.tenant_id = $1
         ORDER BY ura.assigned_at DESC`,
        [tenantId]
      );
      return res.json({ success: true, data: assignments.rows });
    }

    // ── Assign role to user ─────────────────────────────────────────
    if (req.method === 'POST' && path === '/assign') {
      const body = await parseBody(req);
      const { user_id, role_id, expires_at } = body;
      if (!user_id || !role_id) {
        return res.status(400).json({ success: false, error: 'user_id and role_id are required' });
      }
      const result = await pool.query(
        `INSERT INTO user_role_assignments (tenant_id, user_id, role_id, assigned_by, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, user_id, role_id) DO UPDATE SET assigned_at = NOW(), expires_at = $5
         RETURNING *`,
        [tenantId, user_id, role_id, user.sub || user.email || 'system', expires_at || null]
      );
      await pool.query(
        `INSERT INTO role_audit_log (tenant_id, action, target_role_id, target_user_id, actor_id, details)
         VALUES ($1, 'assignment_created', $2, $3, $4, $5)`,
        [tenantId, role_id, user_id, user.sub || user.email || 'system', JSON.stringify({ expires_at })]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ── Revoke role from user ───────────────────────────────────────
    if (req.method === 'POST' && path === '/revoke') {
      const body = await parseBody(req);
      const { user_id, role_id } = body;
      if (!user_id || !role_id) {
        return res.status(400).json({ success: false, error: 'user_id and role_id are required' });
      }
      await pool.query(
        'DELETE FROM user_role_assignments WHERE tenant_id = $1 AND user_id = $2 AND role_id = $3',
        [tenantId, user_id, role_id]
      );
      await pool.query(
        `INSERT INTO role_audit_log (tenant_id, action, target_role_id, target_user_id, actor_id)
         VALUES ($1, 'assignment_revoked', $2, $3, $4)`,
        [tenantId, role_id, user_id, user.sub || user.email || 'system']
      );
      return res.json({ success: true, data: { revoked: true } });
    }

    // ── List available permissions ───────────────────────────────────
    if (req.method === 'GET' && path === '/permissions') {
      return res.json({
        success: true,
        data: [
          { group: 'Tenant', permissions: ['tenant:manage'] },
          { group: 'Users', permissions: ['users:list', 'users:create', 'users:update', 'users:delete'] },
          { group: 'Policies', permissions: ['policies:list', 'policies:create', 'policies:update', 'policies:delete'] },
          { group: 'Intents', permissions: ['intents:submit', 'intents:list', 'intents:view'] },
          { group: 'Executions', permissions: ['executions:report', 'executions:list', 'executions:view'] },
          { group: 'Approvals', permissions: ['approvals:list', 'approvals:approve_t1', 'approvals:approve_t2', 'approvals:approve_t3'] },
          { group: 'Fleet', permissions: ['fleet:list', 'fleet:manage', 'fleet:trust_modify'] },
          { group: 'Audit', permissions: ['audit:list', 'audit:export'] },
          { group: 'Integrations', permissions: ['integrations:list', 'integrations:manage'] },
          { group: 'Compliance', permissions: ['compliance:view', 'compliance:generate'] },
          { group: 'API Keys', permissions: ['api_keys:list', 'api_keys:create', 'api_keys:revoke'] },
          { group: 'Settings', permissions: ['settings:view', 'settings:manage'] },
          { group: 'Retention', permissions: ['retention:view', 'retention:manage'] },
        ],
      });
    }

    // ── Audit log for RBAC changes ──────────────────────────────────
    if (req.method === 'GET' && path === '/audit') {
      const limit = Math.min(parseInt(params.limit || '50', 10), 200);
      const result = await pool.query(
        `SELECT * FROM role_audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit]
      );
      return res.json({ success: true, data: result.rows });
    }

    // ── Users list (for assignment UI) ──────────────────────────────
    if (req.method === 'GET' && path === '/users') {
      const users = await pool.query(
        'SELECT id, email, name, role FROM users WHERE tenant_id = $1 ORDER BY email',
        [tenantId]
      );
      return res.json({ success: true, data: users.rows });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[roles]', error);
    captureException(error, { endpoint: 'roles', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'ROLES_ERROR' });
  }
};

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}
