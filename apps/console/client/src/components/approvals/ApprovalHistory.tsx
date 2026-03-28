/**
 * Approval History Component
 * Shows past approvals with metrics
 */

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ApprovalHistoryProps {
  limit?: number;
}

export function ApprovalHistory({ limit = 50 }: ApprovalHistoryProps) {
  // TODO: Fetch from API
  const history = [];

  return (
    <div className="space-y-4">
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
          {history.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-neutral-900/30 rounded-lg border border-neutral-700/30"
            >
              <div className="flex items-center gap-3">
                {item.approved ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <div className="text-sm font-medium text-neutral-200">
                    {item.action}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {item.operator} · {item.timestamp}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  item.tier === 'T2'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-blue-900/30 text-blue-400'
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
