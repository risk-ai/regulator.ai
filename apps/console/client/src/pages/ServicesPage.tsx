/**
 * Services Page
 * Phase 2: Information Architecture
 * 
 * Infrastructure monitoring and health
 */

import { PageLayout } from '../components/layout/PageLayout.js';
// import { ProviderHealthPanel } from '../components/ProviderHealthPanel.js';
import { ServicePanel } from '../components/services/ServicePanel.js';

/**
 * Services Page - Infrastructure monitoring
 * 
 * Answers:
 * - Are providers healthy?
 * - Is the console backend running?
 * - Is the gateway operational?
 * - What services are degraded?
 * - What is the policy engine status?
 */
export function ServicesPage() {
  return (
    <PageLayout
      title="Services"
      description="Infrastructure monitoring and health"
    >
      <div className="space-y-6">
        {/* Provider Health Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Provider Health
          </h2>
          {/* <ProviderHealthPanel /> */}
        </div>
        
        {/* Gateway Services Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Gateway Services
          </h2>
          <ServicePanel />
        </div>
        
        {/* Governance Engines Panel - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Governance Engines
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Policy Engine', status: 'operational' },
              { name: 'Verification Engine', status: 'operational' },
              { name: 'Execution Watchdog', status: 'operational' },
              { name: 'Reconciliation Gate', status: 'operational' },
              { name: 'Circuit Breaker Manager', status: 'operational' },
            ].map((engine) => (
              <div
                key={engine.name}
                className="bg-gray-700 border border-gray-600 rounded p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{engine.name}</span>
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                    {engine.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  <div>Recent activity: -</div>
                  <div>Last evaluation: -</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* State Graph Status Panel - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            State Graph Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 border border-gray-600 rounded p-4">
              <div className="text-sm text-gray-400">Database Size</div>
              <div className="text-2xl font-semibold text-white mt-1">~15MB</div>
            </div>
            
            <div className="bg-gray-700 border border-gray-600 rounded p-4">
              <div className="text-sm text-gray-400">Tables</div>
              <div className="text-2xl font-semibold text-white mt-1">15</div>
            </div>
            
            <div className="bg-gray-700 border border-gray-600 rounded p-4">
              <div className="text-sm text-gray-400">Integrity</div>
              <div className="text-2xl font-semibold text-green-400 mt-1">✓ Healthy</div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
