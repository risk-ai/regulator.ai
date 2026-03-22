/**
 * History Page
 * Phase 2: Information Architecture
 * 
 * Execution ledger and audit trail
 */

import { PageLayout } from '../components/layout/PageLayout.js';

/**
 * History Page - Execution history and audit trail
 * 
 * Answers:
 * - What happened in the last hour?
 * - What executions completed/failed?
 * - What was the reconciliation lifecycle for objective X?
 * - What decisions did policies make?
 * - What verification checks ran?
 */
export function HistoryPage() {
  return (
    <PageLayout
      title="History"
      description="Execution ledger and audit trail"
    >
      <div className="space-y-6">
        {/* Execution Ledger Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Execution Ledger
            </h2>
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                <option>Last hour</option>
                <option>Last 6 hours</option>
                <option>Last 24 hours</option>
                <option>Last 7 days</option>
              </select>
              
              <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                <option>All statuses</option>
                <option>Completed</option>
                <option>Failed</option>
                <option>Timeout</option>
              </select>
            </div>
          </div>
          
          {/* Empty State */}
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No executions in selected time range.</p>
            <p className="text-sm mt-2">
              Try expanding time range or clearing filters.
            </p>
            <p className="text-xs mt-4 text-gray-500">
              Execution ledger shows: intent → plan → execution → verification → outcome
            </p>
          </div>
        </div>
        
        {/* Reconciliation Events Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Reconciliation Events
          </h2>
          
          {/* Empty State */}
          <div className="text-center py-8 text-gray-400">
            <p>No reconciliation events in selected time range.</p>
            <p className="text-sm mt-2">
              Events include: requested, admitted, started, completed, degraded, recovered
            </p>
          </div>
        </div>
        
        {/* Policy Decisions Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Policy Decisions
          </h2>
          
          {/* Empty State */}
          <div className="text-center py-8 text-gray-400">
            <p>No policy decisions logged.</p>
            <p className="text-sm mt-2">
              Policy evaluation history will appear here.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
