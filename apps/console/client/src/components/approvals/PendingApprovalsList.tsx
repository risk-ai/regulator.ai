/**
 * Pending Approvals List (Phase 17 Stage 4)
 * 
 * List view of pending approvals requiring operator action.
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { listApprovals, bulkApproveApprovals, bulkDenyApprovals, approveApproval, denyApproval, type Approval } from '../../api/approvals';
import { ApprovalCard } from './ApprovalCard';
import { useAuthStore } from '../../store/authStore.js';
import { addToast } from '../../store/toastStore.js';

interface PendingApprovalsListProps {
  onApprovalChange?: () => void;
  focusedApprovalId?: string | null;
  onApprovalFocus?: (approvalId: string | null) => void;
  showExpandedDetails?: boolean;
}

export const PendingApprovalsList = forwardRef<any, PendingApprovalsListProps>(({ 
  onApprovalChange, 
  focusedApprovalId, 
  onApprovalFocus,
  showExpandedDetails 
}, ref) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'T1' | 'T2'>('all');
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState<'approve' | 'deny' | null>(null);
  const [bulkDenyReason, setBulkDenyReason] = useState('');
  const [bulkActing, setBulkActing] = useState(false);
  const user = useAuthStore((state) => state.user);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { status: 'pending' };
      if (filter !== 'all') {
        filters.tier = filter;
      }
      
      const data = await listApprovals(filters);
      console.log('[PendingApprovalsList] Loaded approvals:', data.length);
      console.log('[PendingApprovalsList] First approval:', data[0]);
      setApprovals(data);
    } catch (err) {
      console.error('[PendingApprovalsList] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadApprovals, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleApprovalAction = () => {
    loadApprovals();
    if (onApprovalChange) {
      onApprovalChange();
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    approveApproval: async (approvalId: string) => {
      if (!user) return;
      try {
        await approveApproval(approvalId, user.email || 'unknown');
        addToast('Approval approved successfully', 'success');
        handleApprovalAction();
      } catch (err) {
        console.error('Failed to approve:', err);
        addToast('Failed to approve', 'error');
      }
    },
    denyApproval: async (approvalId: string) => {
      if (!user) return;
      const reason = prompt('Enter denial reason:');
      if (!reason?.trim()) return;
      
      try {
        await denyApproval(approvalId, user.email || 'unknown', reason);
        addToast('Approval denied successfully', 'success');
        handleApprovalAction();
      } catch (err) {
        console.error('Failed to deny:', err);
        addToast('Failed to deny approval', 'error');
      }
    }
  }));

  // Selection handlers
  const handleSelectApproval = (approvalId: string, selected: boolean) => {
    setSelectedApprovals(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(approvalId);
      } else {
        newSet.delete(approvalId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedApprovals(new Set(approvals.map(a => a.approval_id)));
    } else {
      setSelectedApprovals(new Set());
    }
  };

  const handleBulkAction = async (action: 'approve' | 'deny') => {
    if (selectedApprovals.size === 0 || !user) return;
    
    if (action === 'deny' && !bulkDenyReason.trim()) {
      addToast('Denial reason is required for bulk deny', 'error');
      return;
    }

    setBulkActing(true);
    const approvalIds = Array.from(selectedApprovals);
    
    try {
      if (action === 'approve') {
        await bulkApproveApprovals(approvalIds, user.email || 'unknown');
        addToast(`Successfully approved ${approvalIds.length} approvals`, 'success');
      } else {
        await bulkDenyApprovals(approvalIds, user.email || 'unknown', bulkDenyReason);
        addToast(`Successfully denied ${approvalIds.length} approvals`, 'success');
      }
      
      setSelectedApprovals(new Set());
      setShowBulkConfirm(null);
      setBulkDenyReason('');
      handleApprovalAction();
    } catch (err) {
      console.error('Bulk action failed:', err);
      addToast(`Failed to ${action} approvals`, 'error');
    } finally {
      setBulkActing(false);
    }
  };

  // Keyboard navigation
  const handleApprovalClick = (approvalId: string) => {
    if (onApprovalFocus) {
      onApprovalFocus(approvalId === focusedApprovalId ? null : approvalId);
    }
  };

  if (loading && approvals.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400 text-sm">Error: {error}</p>
        <button
          onClick={loadApprovals}
          className="mt-2 text-red-300 hover:text-red-200 underline text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Separate by expiry status
  const now = Date.now();
  const expiringSoon = approvals.filter(a => 
    a.expires_at && (a.expires_at - now) < 5 * 60 * 1000 && !a.is_expired
  );
  const normal = approvals.filter(a =>
    !a.is_expired && !(a.expires_at && (a.expires_at - now) < 5 * 60 * 1000)
  );

  return (
    <div className="space-y-4">
      {/* Filter tabs with selection controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: filter === 'all' ? 600 : 400,
              color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === 'all' ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
          >
            All ({approvals.length})
          </button>
          <button
            onClick={() => setFilter('T1')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: filter === 'T1' ? 600 : 400,
              color: filter === 'T1' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === 'T1' ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
          >
            T1
          </button>
          <button
            onClick={() => setFilter('T2')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: filter === 'T2' ? 600 : 400,
              color: filter === 'T2' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === 'T2' ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
          >
            T2
          </button>
        </div>

        {/* Select All checkbox */}
        {approvals.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={selectedApprovals.size === approvals.length && approvals.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  accentColor: 'var(--text-primary)'
                }}
              />
              Select All
            </label>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedApprovals.size > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {selectedApprovals.size} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowBulkConfirm('approve')}
              disabled={bulkActing}
              style={{
                padding: '8px 16px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: bulkActing ? 'not-allowed' : 'pointer',
                opacity: bulkActing ? 0.6 : 1,
                fontFamily: 'var(--font-sans)'
              }}
            >
              Approve All ({selectedApprovals.size})
            </button>
            <button
              onClick={() => setShowBulkConfirm('deny')}
              disabled={bulkActing}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: bulkActing ? 'not-allowed' : 'pointer',
                opacity: bulkActing ? 0.6 : 1,
                fontFamily: 'var(--font-sans)'
              }}
            >
              Deny All ({selectedApprovals.size})
            </button>
            <button
              onClick={() => setSelectedApprovals(new Set())}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk confirmation dialog */}
      {showBulkConfirm && (
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            marginBottom: '12px' 
          }}>
            {showBulkConfirm === 'approve' ? 'Bulk Approve' : 'Bulk Deny'} {selectedApprovals.size} Approvals
          </h3>
          
          {showBulkConfirm === 'deny' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: 'var(--text-secondary)', 
                marginBottom: '6px' 
              }}>
                Denial Reason (required):
              </label>
              <textarea
                value={bulkDenyReason}
                onChange={(e) => setBulkDenyReason(e.target.value)}
                placeholder="Enter reason for denying all selected approvals..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  resize: 'vertical',
                  minHeight: '60px'
                }}
                rows={3}
              />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowBulkConfirm(null);
                setBulkDenyReason('');
              }}
              disabled={bulkActing}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: bulkActing ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleBulkAction(showBulkConfirm)}
              disabled={bulkActing || (showBulkConfirm === 'deny' && !bulkDenyReason.trim())}
              style={{
                padding: '8px 16px',
                background: showBulkConfirm === 'approve' ? '#059669' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: (bulkActing || (showBulkConfirm === 'deny' && !bulkDenyReason.trim())) ? 'not-allowed' : 'pointer',
                opacity: (bulkActing || (showBulkConfirm === 'deny' && !bulkDenyReason.trim())) ? 0.6 : 1,
                fontFamily: 'var(--font-sans)'
              }}
            >
              {bulkActing ? 'Processing...' : `Confirm ${showBulkConfirm === 'approve' ? 'Approve' : 'Deny'}`}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {approvals.length === 0 && (
        <div className="text-center py-12">
          <div className="text-neutral-500 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">No pending approvals</p>
        </div>
      )}

      {/* Expiring soon section */}
      {expiringSoon.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-medium text-amber-400">
              Expiring Soon ({expiringSoon.length})
            </h3>
          </div>
          <div className="space-y-3">
            {expiringSoon.map(approval => (
              <div key={approval.approval_id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selectedApprovals.has(approval.approval_id)}
                  onChange={(e) => handleSelectApproval(approval.approval_id, e.target.checked)}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    marginTop: '4px',
                    accentColor: 'var(--text-primary)'
                  }}
                />
                <div 
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => handleApprovalClick(approval.approval_id)}
                >
                  <ApprovalCard
                    approval={approval}
                    onAction={handleApprovalAction}
                    urgent
                    focused={focusedApprovalId === approval.approval_id}
                    showExpandedDetails={focusedApprovalId === approval.approval_id && showExpandedDetails}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal approvals */}
      {normal.length > 0 && (
        <div>
          {expiringSoon.length > 0 && (
            <h3 className="text-sm font-medium text-neutral-400 mb-3">
              Pending ({normal.length})
            </h3>
          )}
          <div className="space-y-3">
            {normal.map(approval => (
              <div key={approval.approval_id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selectedApprovals.has(approval.approval_id)}
                  onChange={(e) => handleSelectApproval(approval.approval_id, e.target.checked)}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    marginTop: '4px',
                    accentColor: 'var(--text-primary)'
                  }}
                />
                <div 
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => handleApprovalClick(approval.approval_id)}
                >
                  <ApprovalCard
                    approval={approval}
                    onAction={handleApprovalAction}
                    focused={focusedApprovalId === approval.approval_id}
                    showExpandedDetails={focusedApprovalId === approval.approval_id && showExpandedDetails}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
