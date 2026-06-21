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

      // Send invitation email via Resend
      const RESEND_KEY = process.env.RESEND_API_KEY;
      const CONSOLE_URL = process.env.CONSOLE_URL || 'https://console.regulator.ai';
      const inviteLink = `${CONSOLE_URL}/accept-invite?token=${token}`;

      if (RESEND_KEY) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Vienna OS <noreply@regulator.ai>',
              to: [email],
              subject: `You've been invited to join a Vienna OS workspace`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
                  <h2 style="color:#1a1a2e">You've been invited!</h2>
                  <p>You've been invited to join a Vienna OS governance workspace as <strong>${role}</strong>.</p>
                  <p>
                    <a href="${inviteLink}" 
                       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
                      Accept Invitation
                    </a>
                  </p>
                  <p style="color:#666;font-size:12px">This invitation expires in 7 days. If you didn't expect this, you can ignore it.</p>
                  <p style="color:#666;font-size:12px">Or copy this link: ${inviteLink}</p>
                </div>
              `,
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (!emailRes.ok) {
            const errText = await emailRes.text();
            console.error('[team/invite] Resend error:', emailRes.status, errText);
          }
        } catch (emailErr) {
          // Non-fatal: invitation record is created, email failure shouldn't block response
          console.error('[team/invite] Failed to send invitation email:', emailErr);
        }
      } else {
        console.warn('[team/invite] RESEND_API_KEY not set — invitation email not sent');
      }

      return res.status(201).json({
        success: true,
        data: { ...result.rows[0], invite_link: RESEND_KEY ? undefined : inviteLink },
      });
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

    // ── Accept invitation (public endpoint: token validates access) ──
    if (req.method === 'POST' && path === '/invitations/accept') {
      const body = req.body || {};
      const { token: inviteToken, name, password } = body;

      if (!inviteToken) {
        return res.status(400).json({ success: false, error: 'token required' });
      }

      // Look up invitation (not tenant-scoped — the token IS the credential)
      const inviteResult = await pool.query(
        `SELECT * FROM team_invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
        [inviteToken]
      );

      if (inviteResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid or expired invitation token' });
      }

      const invite = inviteResult.rows[0];

      // Check if user already exists (by email)
      let userId;
      const existingUser = await pool.query(
        'SELECT id FROM regulator.users WHERE email = $1',
        [invite.email]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
      } else {
        // Create user account
        const bcrypt = require('bcryptjs');
        const passwordHash = password ? await bcrypt.hash(password, 12) : null;
        const newUser = await pool.query(
          `INSERT INTO regulator.users (id, email, name, tenant_id, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
          [crypto.randomUUID(), invite.email, name || invite.email.split('@')[0], invite.tenant_id, passwordHash]
        );
        userId = newUser.rows[0].id;
      }

      // Add to team_members (check for existing membership first)
      const existingMembership = await pool.query(
        'SELECT id FROM team_members WHERE tenant_id = $1 AND user_id = $2',
        [invite.tenant_id, userId]
      );
      if (existingMembership.rows.length > 0) {
        await pool.query(
          'UPDATE team_members SET role = $1, status = $2, updated_at = NOW() WHERE tenant_id = $3 AND user_id = $4',
          [invite.role, 'active', invite.tenant_id, userId]
        );
      } else {
        await pool.query(
          `INSERT INTO team_members (tenant_id, user_id, role, status, invited_at, invited_by, created_at)
           VALUES ($1, $2, $3, 'active', NOW(), $4, NOW())`,
          [invite.tenant_id, userId, invite.role, invite.invited_by]
        );
      }

      // Mark invitation accepted
      await pool.query(
        `UPDATE team_invitations SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [invite.id]
      );

      return res.json({
        success: true,
        data: { email: invite.email, role: invite.role, tenant_id: invite.tenant_id },
        message: 'Invitation accepted. Please log in.',
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'team' } });
    console.error('Team API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
