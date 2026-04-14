/**
 * Team Management Page — Vienna OS
 * 
 * Invite users, manage roles (admin/operator/viewer), member list with role editing.
 * RBAC: Role-based access control for multi-tenant organizations.
 * 
 * Features:
 * - Invite users via email
 * - Role assignment (Admin, Operator, Viewer)
 * - Member list with status
 * - Role editing
 * - Remove members
 * - Pending invitations
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { addToast } from '../store/toastStore.js';
import { Users, Mail, Shield, Trash2, Edit2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  invited_at: string;
  invited_by: string;
  last_login: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  invited_at: string;
  invited_by: string;
  expires_at: string;
}

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access: manage team, policies, agents, and settings',
    icon: '👑',
    color: '#ef4444',
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Approve actions, view audit logs, manage agents',
    icon: '⚡',
    color: '#f59e0b',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to governance data and analytics',
    icon: '👁️',
    color: '#10b981',
  },
];

export function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/v1/team/members', { credentials: 'include' }),
        fetch('/api/v1/team/invitations', { credentials: 'include' }),
      ]);

      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();

      if (membersData.success) setMembers(membersData.data);
      if (invitesData.success) setInvitations(invitesData.data);
    } catch (error) {
      addToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) {
      addToast('Email and role required', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/v1/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (data.success) {
        addToast(`Invitation sent to ${inviteEmail}`, 'success');
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('operator');
        loadTeamData();
      } else {
        addToast(data.error || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      addToast('Network error', 'error');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/v1/team/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        addToast('Role updated', 'success');
        setEditingMember(null);
        loadTeamData();
      } else {
        addToast(data.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      addToast('Network error', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;

    try {
      const response = await fetch(`/api/v1/team/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        addToast('Member removed', 'success');
        loadTeamData();
      } else {
        addToast(data.error || 'Failed to remove member', 'error');
      }
    } catch (error) {
      addToast('Network error', 'error');
    }
  };

  const handleRevokeInvitation = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/v1/team/invitations/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        addToast('Invitation revoked', 'success');
        loadTeamData();
      } else {
        addToast(data.error || 'Failed to revoke invitation', 'error');
      }
    } catch (error) {
      addToast('Network error', 'error');
    }
  };

  if (loading) {
    return (
      <PageLayout title="Team Management" description="Loading...">
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
          Loading team data...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Team Management" description="Invite users and manage role-based access">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <strong>{members.length}</strong> team members
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
              {invitations.filter(i => i.status === 'pending').length} pending invitations
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Mail size={16} />
            Invite Member
          </button>
        </div>

        {/* Roles Legend */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {ROLES.map(role => (
            <div key={role.id} style={{
              background: 'var(--bg-primary)',
              border: `1px solid ${role.color}33`,
              borderRadius: '8px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{role.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: role.color }}>{role.name}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                {role.description}
              </p>
            </div>
          ))}
        </div>

        {/* Team Members Table */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Users size={18} className="text-amber-500" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Team Members
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Member
                  </th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Role
                  </th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Last Login
                  </th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const role = ROLES.find(r => r.id === member.role);
                  const isEditing = editingMember?.id === member.id;
                  
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.name || member.email}
                          </div>
                          {member.name && (
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                              {member.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {isEditing ? (
                          <select
                            value={member.role}
                            onChange={(e) => {
                              const newRole = e.target.value as 'admin' | 'operator' | 'viewer';
                              handleUpdateRole(member.id, newRole);
                            }}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                            }}
                          >
                            {ROLES.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            background: `${role?.color}22`,
                            color: role?.color,
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}>
                            <span>{role?.icon}</span>
                            {role?.name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: member.status === 'active' ? '#10b981' : 
                                 member.status === 'pending' ? '#f59e0b' : '#ef4444',
                        }}>
                          {member.status === 'active' && <CheckCircle size={14} />}
                          {member.status === 'pending' && <Clock size={14} />}
                          {member.status === 'suspended' && <XCircle size={14} />}
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!isEditing ? (
                            <button
                              onClick={() => setEditingMember(member)}
                              style={{
                                padding: '6px 10px',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                              }}
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingMember(null)}
                              style={{
                                padding: '6px 10px',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.id, member.email)}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              color: '#fca5a5',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                            }}
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.filter(i => i.status === 'pending').length > 0 && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginTop: '24px',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Clock size={18} className="text-amber-500" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Pending Invitations
              </h2>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {invitations.filter(i => i.status === 'pending').map(invite => {
                const role = ROLES.find(r => r.id === invite.role);
                return (
                  <div key={invite.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {invite.email}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Invited {new Date(invite.invited_at).toLocaleDateString()} • Role: {role?.name}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeInvitation(invite.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }} onClick={() => setShowInviteModal(false)}>
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Invite Team Member
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Role
              </label>
              {ROLES.map(role => (
                <label key={role.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: inviteRole === role.id ? `${role.color}22` : 'var(--bg-app)',
                  border: inviteRole === role.id ? `1px solid ${role.color}66` : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={inviteRole === role.id}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span>{role.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {role.name}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                      {role.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default TeamManagementPage;
