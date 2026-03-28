/**
 * Approval History Component
 * Shows past approvals with metrics
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalHistoryProps {
  limit?: number;
}

interface ApprovalHistoryItem {
  approval_id: string;
  tier: string;
  action_type: string;
  action_summary: string;
  status: 'approved' | 'denied';
  reviewed_by: string;
  reviewed_at: number;
  decision_reason?: string;
}

export function ApprovalHistory({ limit = 50 }: ApprovalHistoryProps) {
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    denied: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch both approved and denied
        const [approvedRes, deniedRes] = await Promise.all([
          fetch(`/api/v1/approvals?status=approved&limit=${limit}`, { credentials: 'include' }),
          fetch(`/api/v1/approvals?status=denied&limit=${limit}`, { credentials: 'include' })
        ]);

        const approvedData = await approvedRes.json();
        const deniedData = await deniedRes.json();

        const combined = [
          ...(approvedData.data || []),
          ...(deniedData.data || [])
        ].sort((a, b) => b.reviewed_at - a.reviewed_at).slice(0, limit);

        setHistory(combined);

        // Calculate stats
        const approved = combined.filter(item => item.status === 'approved').length;
        const denied = combined.filter(item => item.status === 'denied').length;
        const responseTimes = combined
          .filter(item => item.reviewed_at && item.requested_at)
          .map(item => item.reviewed_at - item.requested_at);
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        setStats({
          total: combined.length,
          approved,
          denied,
          avgResponseTime
        });
      } catch (error) {
        console.error('Failed to fetch approval history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [limit]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-neutral-400 mt-3">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/50 p-4">
            <div className="text-sm text-neutral-400">Total Decisions</div>
            <div className="text-2xl font-bold text-neutral-200 mt-1">{stats.total}</div>
          </div>
          <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/50 p-4">
            <div className="text-sm text-neutral-400">Approved</div>
            <div className="text-2xl font-bold text-green-400 mt-1">{stats.approved}</div>
          </div>
          <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/50 p-4">
            <div className="text-sm text-neutral-400">Denied</div>
            <div className="text-2xl font-bold text-red-400 mt-1">{stats.denied}</div>
          </div>
          <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/50 p-4">
            <div className="text-sm text-neutral-400">Avg Response Time</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {Math.round(stats.avgResponseTime / 1000)}s
            </div>
          </div>
        </div>
      )}
      
      {history.length === 0 ? (
        <div className="text-center py-12 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
          <Clock className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
          <p className="text-neutral-400">No approval history yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Approved and denied requests will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.approval_id}
              className="flex items-center justify-between p-4 bg-neutral-900/30 rounded-lg border border-neutral-700/30 hover:border-neutral-600/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                {item.status === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-200 truncate">
                    {item.action_summary || item.action_type || 'Action'}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {item.reviewed_by || 'Unknown operator'} · {formatDistanceToNow(item.reviewed_at)} ago
                  </div>
                  {item.decision_reason && (
                    <div className="text-xs text-neutral-400 mt-1 italic">
                      "{item.decision_reason}"
                    </div>
                  )}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded text-xs font-medium flex-shrink-0 ${
                  item.tier === 'T2'
                    ? 'bg-red-900/30 text-red-400 border border-red-700/50'
                    : 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                }`}
              >
                {item.tier}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
