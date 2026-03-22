/**
 * Pending Approvals List (Phase 17 Stage 4)
 * 
 * List view of pending approvals requiring operator action.
 */

import React, { useState, useEffect } from 'react';
import { listApprovals, type Approval } from '../../api/approvals';
import { ApprovalCard } from './ApprovalCard';

interface PendingApprovalsListProps {
  onApprovalChange?: () => void;
}

export function PendingApprovalsList({ onApprovalChange }: PendingApprovalsListProps) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'T1' | 'T2'>('all');

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
      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-neutral-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-300'
          }`}
        >
          All ({approvals.length})
        </button>
        <button
          onClick={() => setFilter('T1')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'T1'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-300'
          }`}
        >
          T1
        </button>
        <button
          onClick={() => setFilter('T2')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'T2'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-300'
          }`}
        >
          T2
        </button>
      </div>

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
              <ApprovalCard
                key={approval.approval_id}
                approval={approval}
                onAction={handleApprovalAction}
                urgent
              />
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
              <ApprovalCard
                key={approval.approval_id}
                approval={approval}
                onAction={handleApprovalAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
