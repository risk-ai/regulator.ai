/**
 * Approvals Premium — High-Urgency Authorization Queue
 * 
 * Integrates with approvals API. No duplicate sidebar/header — renders inside App.tsx shell.
 * Keyboard shortcuts for approve/deny. Live countdown timers.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { listApprovals, approveApproval, denyApproval, type Approval } from '../api/approvals.js';
import { useAuthStore } from '../store/authStore.js';
import { WarrantDetailModal } from '../components/approvals/WarrantDetailModal.js';

export default function ApprovalsPremium() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ approved: 0, denied: 0 });
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const auth = useAuthStore();

  const loadApprovals = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [pendingData, approvedData, deniedData] = await Promise.all([
        listApprovals({ status: 'pending', limit: 50 }) as any,
        listApprovals({ status: 'approved', limit: 10 }) as any,
        listApprovals({ status: 'denied', limit: 10 }) as any,
      ]);
      setApprovals(Array.isArray(pendingData) ? pendingData : pendingData.data || []);
      const resolved = [
        ...(Array.isArray(approvedData) ? approvedData : approvedData.data || []),
        ...(Array.isArray(deniedData) ? deniedData : deniedData.data || []),
      ].sort((a, b) => (b.reviewed_at || 0) - (a.reviewed_at || 0)).slice(0, 10);
      setRecentDecisions(resolved);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  // Auto-refresh every 15s for urgent queue
  useEffect(() => {
    const interval = setInterval(() => loadApprovals(), 15000);
    return () => clearInterval(interval);
  }, [loadApprovals]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (approvals.length === 0 || processingId) return;
      const first = approvals[0];
      if (e.key === 'a' || e.key === 'A') handleApprove(first.approval_id);
      if (e.key === 'd' || e.key === 'D') handleDeny(first.approval_id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [approvals, processingId]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveApproval(id, auth.user?.email || 'operator', 'Approved via console');
      setApprovals(prev => prev.filter(a => a.approval_id !== id));
      setStats(prev => ({ ...prev, approved: prev.approved + 1 }));
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (id: string) => {
    setProcessingId(id);
    try {
      await denyApproval(id, auth.user?.email || 'operator', 'Denied via console');
      setApprovals(prev => prev.filter(a => a.approval_id !== id));
      setStats(prev => ({ ...prev, denied: prev.denied + 1 }));
    } catch (err) {
      console.error('Deny failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const criticalCount = approvals.filter(a => a.tier === 'T2').length;

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'relative', zIndex: 1 }} className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Approvals</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            High-urgency queue for critical agent authorizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadApprovals(true)} disabled={refreshing}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Queue</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{approvals.length} pending</span>
            </div>
            <Clock size={18} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>
      </div>

      {/* Priority Banner */}
      {criticalCount > 0 && (
        <div className="rounded-lg py-3 px-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="text-red-400 shrink-0" size={18} />
          <span className="text-[13px] font-semibold text-red-300">
            {criticalCount} tier-2 warrant{criticalCount !== 1 ? 's' : ''} pending approval
          </span>
        </div>
      )}

      {/* Approval Cards */}
      {approvals.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>All Clear</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending approvals in the queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval, idx) => {
            const isT2 = approval.tier === 'T2';
            const borderColor = isT2 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.2)';
            const isProcessing = processingId === approval.approval_id;

            return (
              <div key={approval.approval_id}
                className={`rounded-lg p-5 transition-all cursor-pointer hover:opacity-95 ${isProcessing ? 'opacity-50' : ''}`}
                style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}` }}
                onClick={() => setSelectedApproval(approval.approval_id)}>
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isT2 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                      {approval.tier}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        {approval.approval_id}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Agent: {approval.target_id || approval.requested_by}
                      </span>
                    </div>
                  </div>
                  {approval.expires_at && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Timeout</span>
                      <CountdownTimer expiresAt={approval.expires_at} isT2={isT2} />
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-wider mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Requested Action
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {approval.action_type}: {approval.action_summary}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>Status: <span className={isT2 ? 'text-red-400' : 'text-amber-400'}>{approval.status}</span></span>
                    <span>Submitted: {approval.requested_at ? timeAgo(approval.requested_at) : '—'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleApprove(approval.approval_id); }} disabled={isProcessing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold text-[13px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeny(approval.approval_id); }} disabled={isProcessing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold text-[13px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <XCircle size={16} /> Deny
                  </button>
                </div>

                {/* Keyboard Hints (first item only) */}
                {idx === 0 && (
                  <div className="mt-2.5 flex items-center gap-4 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>A</kbd> Approve</span>
                    <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>D</kbd> Deny</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Pending</div>
          <div className="font-mono text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>{approvals.length}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Approved (session)</div>
          <div className="font-mono text-2xl font-bold text-emerald-500">{stats.approved}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Denied (session)</div>
          <div className="font-mono text-2xl font-bold text-red-500">{stats.denied}</div>
        </div>
      </div>

      {/* Recent Decisions (Approval Chain) */}
      {recentDecisions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Decisions</h2>
          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Agent</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Action</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Requested By</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reviewed By</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Decision</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Time to Resolution</th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((decision, idx) => {
                  const timeToResolution = decision.reviewed_at && decision.requested_at
                    ? formatDuration(decision.reviewed_at - decision.requested_at)
                    : '—';
                  const isApproved = decision.status === 'approved';
                  return (
                    <tr key={decision.approval_id} style={{ borderBottom: idx < recentDecisions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                          {decision.target_id?.slice(0, 12)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {decision.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {decision.requested_by}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {decision.reviewed_by || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {decision.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {timeToResolution}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {decision.reviewed_at ? timeAgo(decision.reviewed_at) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warrant Detail Modal */}
      {selectedApproval && (
        <WarrantDetailModal
          approvalId={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onApprove={() => { loadApprovals(); setStats(s => ({ ...s, approved: s.approved + 1 })); }}
          onDeny={() => { loadApprovals(); setStats(s => ({ ...s, denied: s.denied + 1 })); }}
        />
      )}
      </div>
    </div>
  );
}

/* ── Subcomponents ── */

function CountdownTimer({ expiresAt, isT2 }: { expiresAt: number; isT2: boolean }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) { setRemaining('EXPIRED'); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}m ${s.toString().padStart(2, '0')}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={`font-mono text-sm font-bold ${isT2 ? 'text-red-400' : 'text-amber-400'}`}>
      {remaining}
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
