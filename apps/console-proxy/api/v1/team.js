/**
 * Team Management API — Multi-Tenant RBAC
 * 
 * Invite users, manage roles (admin/operator/viewer), member list.
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Roles:
 * - admin: Full access (manage team, policies, agents, settings)
 * - operator: Approve actions, view audit logs, manage agents
 * - viewer: Read-only access to governance data
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/team/, '');

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── List team members ────────────────────────────────────────────
    if (req.method === 'GET' && path === '/members') {
      const result = await pool.query(`
        SELECT 
          tm.id, tm.user_id, tm.role, tm.status, tm.invited_at, tm.invited_by,
          u.email, u.name, u.last_login_at
        FROM team_members tm
        LEFT JOIN users u ON tm.user_id = u.id
        WHERE tm.tenant_id = $1
        ORDER BY tm.invited_at DESC
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── List invitations ─────────────────────────────────────────────
    if (req.method === 'GET' && path === '/invitations') {
      const result = await pool.query(`
        SELECT id, email, role, status, invited_at, invited_by, expires_at, token
        FROM team_invitations
        WHERE tenant_id = $1 AND status != 'accepted'
        ORDER BY invited_at DESC
      `, [tenantId]);

      // Don't expose tokens in list
      const invitations = result.rows.map(row => {
        const { token, ...rest } = row;
        return rest;
      });

      return res.json({ success: true, data: invitations });
    }

    // ── Send invitation ──────────────────────────────────────────────
    if (req.method === 'POST' && path === '/invite') {
      // Check if requester has admin role
      const roleCheck = await pool.query(`
        SELECT role FROM team_members 
        WHERE tenant_id = $1 AND user_id = $2
      `, [tenantId, user.user_id]);

      if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin role required' });
      }

      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ success: false, error: 'email and role required' });
      }

      if (!['admin', 'operator', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }

      // Check if user already exists in org
      const existingMember = await pool.query(`
        SELECT tm.id 
        FROM team_members tm
        LEFT JOIN users u ON tm.user_id = u.id
        WHERE tm.tenant_id = $1 AND u.email = $2
      `, [tenantId, email]);

      if (existingMember.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'User already in organization' });
      }

      // Check for pending invitation
      const pendingInvite = await pool.query(`
        SELECT id FROM team_invitations
        WHERE tenant_id = $1 AND email = $2 AND status = 'pending'
      `, [tenantId, email]);

      if (pendingInvite.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Invitation already sent' });
      }

      // Create invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const result = await pool.query(`
        INSERT INTO team_invitations (tenant_id, email, role, status, invited_by, token, expires_at)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6)
        RETURNING id, email, role, status, invited_at, invited_by, expires_at
      `, [tenantId, email, role, user.user_id, token, expiresAt]);

      // TODO: Send invitation email with token link
      // For now, just return success

      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ── Update member role ───────────────────────────────────────────
    if (req.method === 'PATCH' && path.match(/^\/members\/[^/]+\/role$/)) {
      // Check if requester has admin role
      const roleCheck = await pool.query(`
        SELECT role FROM team_members 
        WHERE tenant_id = $1 AND user_id = $2
      `, [tenantId, user.user_id]);

      if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin role required' });
      }

      const memberId = path.split('/')[2];
      const { role } = req.body;

      if (!role || !['admin', 'operator', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }

      const result = await pool.query(`
        UPDATE team_members
        SET role = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, user_id, role, status
      `, [role, memberId, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    }

    // ── Remove member ────────────────────────────────────────────────
    if (req.method === 'DELETE' && path.match(/^\/members\/[^/]+$/)) {
      // Check if requester has admin role
      const roleCheck = await pool.query(`
        SELECT role FROM team_members 
        WHERE tenant_id = $1 AND user_id = $2
      `, [tenantId, user.user_id]);

      if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin role required' });
      }

      const memberId = path.split('/')[2];

      // Prevent self-removal
      const memberCheck = await pool.query(`
        SELECT user_id FROM team_members WHERE id = $1
      `, [memberId]);

      if (memberCheck.rows.length > 0 && memberCheck.rows[0].user_id === user.user_id) {
        return res.status(400).json({ success: false, error: 'Cannot remove yourself' });
      }

      const result = await pool.query(`
        DELETE FROM team_members
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [memberId, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }

      return res.json({ success: true, data: { id: result.rows[0].id } });
    }

    // ── Revoke invitation ────────────────────────────────────────────
    if (req.method === 'DELETE' && path.match(/^\/invitations\/[^/]+$/)) {
      // Check if requester has admin role
      const roleCheck = await pool.query(`
        SELECT role FROM team_members 
        WHERE tenant_id = $1 AND user_id = $2
      `, [tenantId, user.user_id]);

      if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin role required' });
      }

      const inviteId = path.split('/')[2];

      const result = await pool.query(`
        UPDATE team_invitations
        SET status = 'revoked', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
        RETURNING id
      `, [inviteId, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invitation not found' });
      }

      return res.json({ success: true, data: { id: result.rows[0].id } });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'team' } });
    console.error('Team API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
