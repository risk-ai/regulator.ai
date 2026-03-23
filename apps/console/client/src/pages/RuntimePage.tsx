/**
 * Runtime Page
 * Phase 2: Information Architecture
 * 
 * Governed reconciliation control plane
 */

import { PageLayout } from '../components/layout/PageLayout.js';
import { RuntimeControlPanel } from '../components/runtime/RuntimeControlPanel';
import { SafeModeControl } from '../components/control-plane/SafeModeControl.js';

/**
 * Runtime Page - Operator control plane for governed reconciliation
 * 
 * Answers:
 * - What is Vienna reconciling right now?
 * - What execution authority is active?
 * - What circuit breakers are protecting the system?
 * - What is the reconciliation timeline?
 * - What is the execution pipeline status?
 */
export function RuntimePage() {
  return (
    <PageLayout
      title="Runtime"
      description="Governed reconciliation control plane"
    >
      <div className="space-y-6">
        {/* Safe Mode Control Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <SafeModeControl />
        </div>

        {/* Reconciliation Activity Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Reconciliation Activity
          </h2>
          <RuntimeControlPanel />
        </div>
        
        {/* Execution Leases Panel - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Execution Leases
          </h2>
          <div className="text-center py-8 text-gray-400">
            <p>No active execution leases.</p>
            <p className="text-sm mt-2">
              Vienna is not currently executing any bounded reconciliations.
            </p>
          </div>
        </div>
        
        {/* Circuit Breakers Panel - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Circuit Breakers
          </h2>
          <div className="text-center py-8 text-gray-400">
            <p>All circuit breakers healthy.</p>
            <p className="text-sm mt-2">
              No repeated failures detected.
            </p>
          </div>
        </div>
        
        {/* Reconciliation Timeline - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Reconciliation Timeline
          </h2>
          <div className="text-center py-8 text-gray-400">
            <p>No recent reconciliation events.</p>
            <p className="text-sm mt-2">
              Timeline will show drift detection, admission, execution, and verification events.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
