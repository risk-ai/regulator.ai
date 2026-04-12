/**
 * RBAC Manager — Vienna OS
 * 
 * Role-based access control management:
 * - List/create/edit/delete custom roles
 * - Assign/revoke roles from users
 * - View role permissions
 * - Audit log of RBAC changes
 * 
 * System roles (admin, operator, viewer, agent) are read-only.
 */

import React, { useState, useEffect } from 'react';
import { Shield, Users, Lock, Plus, Edit2, Trash2, UserPlus, UserMinus, Eye, History } from 'lucide-react';
import { apiClient } from '../../api/client.js';

// ─── Types ───

interface Role {
  id: string;
  role_name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
  assignment_count?: number;
}

interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  user_email: string;
  user_name: string;
  role_name: string;
  role_display_name: string;
  assigned_at: string;
  assigned_by: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface PermissionGroup {
  group: string;
  permissions: string[];
  description: string;
}

interface AuditEntry {
  id: string;
  action: string;
  role_id: string | null;
  role_name: string | null;
  user_id: string | null;
  user_email: string | null;
  performed_by: string;
  details: Record<string, any>;
  timestamp: string;
}

// ─── Component ───

export function RBACManager() {
  const [view, setView] = useState<'roles' | 'assignments' | 'audit'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showAssignRole, setShowAssignRole] = useState(false);

  // New role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplay, setNewRoleDisplay] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  // Assign role form
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');

  useEffect(() => {
    loadRoles();
    loadUsers();
    loadPermissionGroups();
  }, []);

  useEffect(() => {
    if (view === 'assignments') loadAssignments();
    if (view === 'audit') loadAudit();
  }, [view]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ roles: Role[] }>('/roles');
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const data = await apiClient.get<{ assignments: RoleAssignment[] }>('/roles/assignments');
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.get<{ users: User[] }>('/roles/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadPermissionGroups = async () => {
    try {
      const data = await apiClient.get<{ groups: PermissionGroup[] }>('/roles/permissions');
      setPermissionGroups(data.groups || []);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  const loadAudit = async () => {
    try {
      const data = await apiClient.get<{ entries: AuditEntry[] }>('/roles/audit?limit=50');
      setAuditLog(data.entries || []);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleDisplay.trim()) return;
    try {
      await apiClient.post('/roles', {
        role_name: newRoleName,
        display_name: newRoleDisplay,
        description: newRoleDesc,
        permissions: newRolePerms,
      });
      setShowCreateRole(false);
      setNewRoleName('');
      setNewRoleDisplay('');
      setNewRoleDesc('');
      setNewRolePerms([]);
      loadRoles();
    } catch (err) {
      console.error('Failed to create role:', err);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/roles/${roleId}`);
      loadRoles();
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const handleAssignRole = async () => {
    if (!assignUserId || !assignRoleId) return;
    try {
      await apiClient.post('/roles/assign', {
        user_id: assignUserId,
        role_id: assignRoleId,
      });
      setShowAssignRole(false);
      setAssignUserId('');
      setAssignRoleId('');
      loadAssignments();
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  const handleRevokeRole = async (assignmentId: string, userEmail: string, roleName: string) => {
    if (!confirm(`Revoke role "${roleName}" from ${userEmail}?`)) return;
    try {
      await apiClient.post('/roles/revoke', { assignment_id: assignmentId });
      loadAssignments();
    } catch (err) {
      console.error('Failed to revoke role:', err);
    }
  };

  const togglePermission = (perm: string) => {
    setNewRolePerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {(['roles', 'assignments', 'audit'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: view === tab ? '2px solid #fbbf24' : '2px solid transparent',
              color: view === tab ? '#fbbf24' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            {tab === 'roles' && <Shield size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />}
            {tab === 'assignments' && <Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />}
            {tab === 'audit' && <History size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Roles View */}
      {view === 'roles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{roles.length} roles ({roles.filter(r => r.is_system_role).length} system, {roles.filter(r => !r.is_system_role).length} custom)</div>
            <button
              onClick={() => setShowCreateRole(!showCreateRole)}
              style={{
                padding: '6px 12px',
                background: '#fbbf24',
                border: 'none',
                color: '#0A0E14',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              New Role
            </button>
          </div>

          {/* Create Role Form */}
          {showCreateRole && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.05)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '12px' }}>CREATE CUSTOM ROLE</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>ROLE NAME (lowercase, no spaces)</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                    placeholder="e.g., compliance_reviewer"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#0A0E14',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>DISPLAY NAME</label>
                  <input
                    type="text"
                    value={newRoleDisplay}
                    onChange={(e) => setNewRoleDisplay(e.target.value)}
                    placeholder="e.g., Compliance Reviewer"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#0A0E14',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>DESCRIPTION</label>
                  <input
                    type="text"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="e.g., Can review compliance reports and approve low-risk proposals"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#0A0E14',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>PERMISSIONS</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {permissionGroups.map(group => (
                      <div key={group.group} style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 700, marginBottom: '6px' }}>{group.group.toUpperCase()}</div>
                        {group.permissions.map(perm => (
                          <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8', marginBottom: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newRolePerms.includes(perm)}
                              onChange={() => togglePermission(perm)}
                              style={{ cursor: 'pointer' }}
                            />
                            {perm.replace(`${group.group}.`, '')}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowCreateRole(false)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRole}
                    disabled={!newRoleName || !newRoleDisplay}
                    style={{
                      padding: '8px 16px',
                      background: newRoleName && newRoleDisplay ? '#fbbf24' : 'rgba(251, 191, 36, 0.3)',
                      border: 'none',
                      color: '#0A0E14',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: newRoleName && newRoleDisplay ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                    }}
                  >
                    Create Role
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Roles List */}
          <div style={{ display: 'grid', gap: '8px' }}>
            {roles.map(role => (
              <div
                key={role.id}
                style={{
                  background: role.is_system_role ? 'rgba(251, 191, 36, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: role.is_system_role ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Shield size={14} color={role.is_system_role ? '#fbbf24' : '#94a3b8'} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{role.display_name}</span>
                    {role.is_system_role && (
                      <span style={{
                        fontSize: '9px',
                        color: '#fbbf24',
                        background: 'rgba(251, 191, 36, 0.1)',
                        padding: '2px 6px',
                        fontWeight: 700,
                      }}>
                        SYSTEM
                      </span>
                    )}
                    {role.assignment_count !== undefined && (
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {role.assignment_count} user{role.assignment_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{role.description}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>
                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}: {role.permissions.slice(0, 3).join(', ')}
                    {role.permissions.length > 3 && ` +${role.permissions.length - 3} more`}
                  </div>
                </div>
                {!role.is_system_role && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDeleteRole(role.id, role.display_name)}
                      style={{
                        padding: '6px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete role"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments View */}
      {view === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{assignments.length} active assignment{assignments.length !== 1 ? 's' : ''}</div>
            <button
              onClick={() => setShowAssignRole(!showAssignRole)}
              style={{
                padding: '6px 12px',
                background: '#fbbf24',
                border: 'none',
                color: '#0A0E14',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserPlus size={14} />
              Assign Role
            </button>
          </div>

          {/* Assign Role Form */}
          {showAssignRole && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.05)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '12px' }}>ASSIGN ROLE TO USER</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>USER</label>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#0A0E14',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.email} ({user.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>ROLE</label>
                  <select
                    value={assignRoleId}
                    onChange={(e) => setAssignRoleId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#0A0E14',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select role...</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.display_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowAssignRole(false)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignRole}
                    disabled={!assignUserId || !assignRoleId}
                    style={{
                      padding: '8px 16px',
                      background: assignUserId && assignRoleId ? '#fbbf24' : 'rgba(251, 191, 36, 0.3)',
                      border: 'none',
                      color: '#0A0E14',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: assignUserId && assignRoleId ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                    }}
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assignments List */}
          <div style={{ display: 'grid', gap: '8px' }}>
            {assignments.map(assignment => (
              <div
                key={assignment.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    {assignment.user_email} ({assignment.user_name})
                  </div>
                  <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                    <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {assignment.role_display_name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                    Assigned {new Date(assignment.assigned_at).toLocaleDateString()} by {assignment.assigned_by}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeRole(assignment.id, assignment.user_email, assignment.role_display_name)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <UserMinus size={12} />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit View */}
      {view === 'audit' && (
        <div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Last {auditLog.length} RBAC changes
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {auditLog.map(entry => (
              <div
                key={entry.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '10px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{entry.action.toUpperCase()}</span>
                  <span style={{ color: '#64748b', fontSize: '9px' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: '#94a3b8' }}>
                  {entry.role_name && <span>Role: <span style={{ color: '#fff' }}>{entry.role_name}</span></span>}
                  {entry.user_email && <span> • User: <span style={{ color: '#fff' }}>{entry.user_email}</span></span>}
                  {' • '} By: <span style={{ color: '#fff' }}>{entry.performed_by}</span>
                </div>
                {Object.keys(entry.details || {}).length > 0 && (
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                    {JSON.stringify(entry.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
