/**
 * Approval Card (Phase 17 Stage 4)
 * 
 * Individual approval card with approve/deny controls.
 */

import React, { useState } from 'react';
import { approveApproval, denyApproval, type Approval } from '../../api/approvals';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

interface ApprovalCardProps {
  approval: Approval;
  onAction: () => void;
  urgent?: boolean;
}

export function ApprovalCard({ approval, onAction, urgent = false }: ApprovalCardProps) {
  const operator = useAuthStore((state) => state.operator);
  const [acting, setActing] = useState(false);
  const [showDenyReason, setShowDenyReason] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Debug: Log approval data
  React.useEffect(() => {
    console.log('[ApprovalCard] Rendering approval:', {
      approval_id: approval.approval_id,
      tier: approval.tier,
      target_id: approval.target_id,
      requested_at: approval.requested_at,
      requested_at_type: typeof approval.requested_at,
    });
  }, [approval]);

  const handleApprove = async () => {
    if (!operator) {
      setError('Not authenticated');
      return;
    }
    
    try {
      setActing(true);
      setError(null);
      
      await approveApproval(approval.approval_id, operator);
      onAction();
    } catch (err) {
      console.error('Approve failed:', err);
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActing(false);
    }
  };

  const handleDeny = async () => {
    if (!denyReason.trim()) {
      setError('Denial reason is required');
      return;
    }
    
    if (!operator) {
      setError('Not authenticated');
      return;
    }

    try {
      setActing(true);
      setError(null);
      
      await denyApproval(approval.approval_id, operator, denyReason);
      onAction();
    } catch (err) {
      console.error('Deny failed:', err);
      setError(err instanceof Error ? err.message : 'Denial failed');
    } finally {
      setActing(false);
    }
  };

  const isExpired = approval.is_expired;
  const timeUntilExpiry = approval.time_until_expiry_ms 
    ? Math.floor(approval.time_until_expiry_ms / 1000 / 60) 
    : null;

  return (
    <div
      className={`rounded-lg border p-4 ${
        urgent
          ? 'bg-amber-950/20 border-amber-500/30'
          : 'bg-neutral-900/50 border-neutral-700/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                approval.tier === 'T2'
                  ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                  : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
              }`}
            >
              {approval.tier}
            </span>
            <span className="text-neutral-400 text-xs">
              {approval.action_type}
            </span>
          </div>
          <h4 className="text-sm font-medium text-neutral-200">
            {approval.action_summary}
          </h4>
        </div>
      </div>

      {/* Target */}
      <div className="text-xs text-neutral-400 mb-3">
        <span className="font-medium">Target:</span> {approval.target_id}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <span className="text-neutral-500">Requested:</span>{' '}
          <span className="text-neutral-300">
            {approval.requested_at 
              ? formatDistanceToNow(approval.requested_at, { addSuffix: true })
              : 'Unknown'}
          </span>
        </div>
        {timeUntilExpiry !== null && (
          <div>
            <span className="text-neutral-500">Expires:</span>{' '}
            <span
              className={
                timeUntilExpiry < 5
                  ? 'text-amber-400 font-medium'
                  : 'text-neutral-300'
              }
            >
              {timeUntilExpiry}m
            </span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Deny reason input */}
      {showDenyReason && (
        <div className="mb-3">
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Reason for denial (required)"
            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>
      )}

      {/* Actions */}
      {!isExpired && (
        <div className="flex gap-2">
          {showDenyReason ? (
            <>
              <button
                onClick={handleDeny}
                disabled={acting || !denyReason.trim()}
                className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded text-sm font-medium transition-colors"
              >
                {acting ? 'Denying...' : 'Confirm Deny'}
              </button>
              <button
                onClick={() => {
                  setShowDenyReason(false);
                  setDenyReason('');
                  setError(null);
                }}
                disabled={acting}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={acting}
                className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded text-sm font-medium transition-colors"
              >
                {acting ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowDenyReason(true)}
                disabled={acting}
                className="flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-neutral-300 rounded text-sm font-medium transition-colors"
              >
                Deny
              </button>
            </>
          )}
        </div>
      )}

      {isExpired && (
        <div className="text-center py-2 text-xs text-neutral-500">
          Expired
        </div>
      )}
    </div>
  );
}
