/**
 * Approvals Page (Phase 17 Stage 4)
 * 
 * Main page for approval workflow management.
 */

import React, { useState } from 'react';
import { PendingApprovalsList } from '../components/approvals/PendingApprovalsList';

export function ApprovalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleApprovalChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100 mb-2">
            Approvals
          </h1>
          <p className="text-sm text-neutral-400">
            Review and approve pending T1/T2 actions requiring operator authorization.
          </p>
        </div>

        {/* Pending approvals */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">
            Pending Actions
          </h2>
          <PendingApprovalsList
            key={refreshKey}
            onApprovalChange={handleApprovalChange}
          />
        </div>

        {/* Info panel */}
        <div className="mt-8 bg-neutral-900/50 border border-neutral-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">
            About Approvals
          </h3>
          <div className="text-xs text-neutral-400 space-y-2">
            <p>
              <strong className="text-neutral-300">T1 (Moderate risk):</strong> Service restarts,
              configuration changes, non-trading actions.
            </p>
            <p>
              <strong className="text-neutral-300">T2 (High risk):</strong> Trading-critical services,
              trading configuration, irreversible changes.
            </p>
            <p className="pt-2 border-t border-neutral-700">
              All approval decisions are recorded in the audit trail.
              Expired approvals cannot be approved and must be re-requested.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
