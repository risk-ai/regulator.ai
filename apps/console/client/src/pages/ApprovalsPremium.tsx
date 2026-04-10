/**
 * Approvals — Governance Decision Queue
 * 
 * Real pending approval requests from DB. Operators can approve/deny
 * with one click. Shows risk tier, requesting agent, action, expiry.
 */

import { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

interface Approval {
  id: string;
  required_tier: string;
  action_type: string;
  description: string;
  agent_id: string;
  agent_name?: string;
  status: string;
  requested_at: string;
  expires_at?: string;
  payload?: any;
}

const TIER_STYLES: Record<string, { bg: string; border: string; color: string; glow: string }> = {
  T0: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', color: '#10b981', glow: '0 0 12px rgba(16,185,129,0.2)' },
  T1: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b', glow: '0 0 12px rgba(245,158,11,0.2)' },
  T2: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', glow: '0 0 16px rgba(239,68,68,0.3)' },
  T3: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.3)', color: '#a855f7', glow: '0 0 16px rgba(168,85,247,0.3)' },
};

function getTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

function getTimeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'EXPIRED';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export default function ApprovalsPremium() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [actioning, setActioning] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  const headers = { 'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}` };

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/approvals?status=${filter}`, {
        credentials: 'include', headers,
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApprovals(json.data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    setActioning(id);
    try {
      await fetch(`/api/v1/approvals/${id}/${action}`, {
        method: 'POST', credentials: 'include', headers,
        body: JSON.stringify({ operator: 'console', reason: `${action}d from console` }),
      });
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch { /* silent */ }
    finally { setActioning(null); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Approval Queue
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {approvals.length} {filter} request{approvals.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['pending', 'approved', 'denied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)',
              background: filter === f ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: filter === f ? '#d4af37' : 'var(--text-tertiary)',
              border: `1px solid ${filter === f ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'}`,
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          Loading approval queue...
        </div>
      ) : approvals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {filter === 'pending' ? '✅' : filter === 'approved' ? '🔑' : '🚫'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>
            {filter === 'pending' ? 'No pending approvals' : `No ${filter} requests`}
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
            {filter === 'pending' ? 'All governance requests have been resolved' : 'Try a different filter'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {approvals.map(approval => {
            const tier = approval.required_tier || 'T1';
            const style = TIER_STYLES[tier] || TIER_STYLES.T1;
            const isActioning = actioning === approval.id;

            return (
              <div key={approval.id} style={{
                background: 'var(--surface)',
                border: `1px solid ${style.border}`,
                boxShadow: style.glow,
                padding: '20px',
                transition: 'all 200ms',
                opacity: isActioning ? 0.5 : 1,
              }}>
                {/* Top row: tier + agent + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                      letterSpacing: '0.05em',
                    }}>
                      {tier}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {approval.action_type || 'governance_action'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {approval.requested_at ? getTimeAgo(approval.requested_at) : ''}
                  </span>
                </div>

                {/* Description */}
                {approval.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: '1.5' }}>
                    {approval.description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    Agent: <span style={{ color: 'var(--text-primary)' }}>{approval.agent_name || approval.agent_id || '—'}</span>
                  </span>
                  {approval.expires_at && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      Expires: <span style={{ color: getTimeRemaining(approval.expires_at) === 'EXPIRED' ? '#ef4444' : '#f59e0b' }}>
                        {getTimeRemaining(approval.expires_at)}
                      </span>
                    </span>
                  )}
                </div>

                {/* Actions */}
                {filter === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAction(approval.id, 'approve')}
                      disabled={isActioning}
                      style={{
                        flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)', cursor: isActioning ? 'wait' : 'pointer',
                      }}
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      onClick={() => handleAction(approval.id, 'deny')}
                      disabled={isActioning}
                      style={{
                        flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)', cursor: isActioning ? 'wait' : 'pointer',
                      }}
                    >
                      ✗ DENY
                    </button>
                  </div>
                )}

                {/* Status badge for non-pending */}
                {filter !== 'pending' && (
                  <div style={{
                    padding: '6px 12px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)',
                    background: approval.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: approval.status === 'approved' ? '#10b981' : '#ef4444',
                    border: `1px solid ${approval.status === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    textAlign: 'center',
                  }}>
                    {approval.status?.toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
