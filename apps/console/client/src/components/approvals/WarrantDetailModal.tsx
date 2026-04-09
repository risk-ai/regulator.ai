/**
 * Warrant Detail Modal
 * 
 * Shows full context for an approval: execution plan, policy rules, agent history.
 * Premium terminal aesthetic.
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { getApprovalDetail, approveApproval, denyApproval, type ApprovalDetail } from '../../api/approvals.js';

interface WarrantDetailModalProps {
  approvalId: string;
  onClose: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}

export function WarrantDetailModal({ approvalId, onClose, onApprove, onDeny }: WarrantDetailModalProps) {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [approvalId]);

  const loadDetail = async () => {
    try {
      const data = await getApprovalDetail(approvalId);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load approval detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await approveApproval(approvalId, 'operator', 'Approved via console');
      onApprove?.();
      onClose();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async () => {
    setActionLoading('deny');
    try {
      await denyApproval(approvalId, 'operator', 'Denied via console');
      onDeny?.();
      onClose();
    } catch (err) {
      console.error('Deny failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.8)' }} onClick={onClose}>
        <div className="rounded-lg p-6 max-w-md" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Warrant Not Found</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Approval ID: {approvalId}</p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const { approval, plan, execution } = detail;
  const tierColor = approval.tier === 'T1' ? 'text-red-500' : 'text-amber-500';
  const tierBorder = approval.tier === 'T1' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.85)' }} onClick={onClose}>
      <div className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: `1px solid ${tierBorder}` }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 p-6 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Warrant Detail</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded ${tierColor}`} style={{ background: approval.tier === 'T1' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${tierBorder}` }}>
                {approval.tier}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{approval.approval_id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-app)' }}>
            <X size={20} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Action Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Requested Action
            </h3>
            <div className="rounded p-4" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                {approval.action_summary}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                <span>Type: {approval.action_type}</span>
                <span>•</span>
                <span>Target: {approval.target_id}</span>
                <span>•</span>
                <span>Requested: {new Date(approval.requested_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Execution Plan */}
          {plan && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Execution Plan
              </h3>
              <div className="rounded p-4 font-mono text-xs" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <pre className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {JSON.stringify(plan, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Execution Context */}
          {execution && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Execution Context
              </h3>
              <div className="rounded p-4" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Execution ID:</span>
                    <span className="ml-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{approval.execution_id}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Plan ID:</span>
                    <span className="ml-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{approval.plan_id}</span>
                  </div>
                  {approval.step_id && (
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Step ID:</span>
                      <span className="ml-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{approval.step_id}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Requested By:</span>
                    <span className="ml-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{approval.requested_by}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          {approval.metadata && Object.keys(approval.metadata).length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Additional Context
              </h3>
              <div className="rounded p-4 font-mono text-xs" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <pre className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {JSON.stringify(approval.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Expiry Warning */}
          {approval.is_expired && (
            <div className="rounded p-3 flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <AlertTriangle className="text-red-500 shrink-0" size={18} />
              <span className="text-sm text-red-500 font-semibold">This warrant has expired and cannot be approved.</span>
            </div>
          )}

          {approval.expires_at && !approval.is_expired && (
            <div className="rounded p-3 flex items-center gap-3" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Clock className="text-amber-500 shrink-0" size={18} />
              <span className="text-sm text-amber-500 font-semibold">
                Expires: {new Date(approval.expires_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {approval.status === 'pending' && !approval.is_expired && (
          <div className="sticky bottom-0 p-6 flex items-center gap-3" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={handleApprove}
              disabled={actionLoading === 'approve'}
              className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#fff' }}
            >
              <CheckCircle size={18} />
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleDeny}
              disabled={actionLoading === 'deny'}
              className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff' }}
            >
              <XCircle size={18} />
              {actionLoading === 'deny' ? 'Denying...' : 'Deny'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
