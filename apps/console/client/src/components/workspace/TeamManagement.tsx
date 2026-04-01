/**
 * Team Management — Vienna OS
 * 
 * User management, invites, and RBAC for workspaces.
 */

import React, { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  last_login_at: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  owner: { label: 'Owner', color: '#D4A520', desc: 'Full access, billing, workspace settings' },
  admin: { label: 'Admin', color: '#a78bfa', desc: 'Manage agents, policies, and team members' },
  operator: { label: 'Operator', color: '#10b981', desc: 'Approve/deny proposals, manage warrants' },
  viewer: { label: 'Viewer', color: '#94a3b8', desc: 'Read-only access to dashboard and audit trail' },
};

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('operator');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetch('/api/v1/users', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setMembers((data.data || []).map((u: any) => ({
        id: u.id, email: u.email, name: u.name || u.email?.split('@')[0],
        role: u.role || 'viewer', last_login_at: u.last_login_at,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail('');
      setShowInvite(false);
    } catch {} finally { setInviting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Team Members</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          style={{
            padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
            background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          + Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
          borderRadius: '10px', padding: '14px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@company.com"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', outline: 'none',
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
              }}
            >
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              style={{
                padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: inviting ? 'var(--bg-tertiary)' : '#7c3aed',
                border: 'none', color: '#fff', cursor: inviting ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {ROLE_CONFIG[inviteRole]?.desc}
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No team members found.</div>
        ) : members.map((m, i) => {
          const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.viewer;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
              borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: `${roleConfig.color}15`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: roleConfig.color,
              }}>
                {(m.name || m.email)[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name || m.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.email}</div>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                color: roleConfig.color, background: `${roleConfig.color}12`,
                border: `1px solid ${roleConfig.color}20`, fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
              }}>
                {roleConfig.label}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : 'Never'}
              </span>
            </div>
          );
        })}
      </div>

      {/* RBAC reference */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Role Permissions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{
              background: `${cfg.color}06`, border: `1px solid ${cfg.color}12`,
              borderRadius: '8px', padding: '10px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, marginBottom: '4px' }}>{cfg.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{cfg.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
