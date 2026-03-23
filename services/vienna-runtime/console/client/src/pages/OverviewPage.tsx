/**
 * Overview Page
 * 
 * Primary operator landing page showing:
 * - System health and architecture
 * - Current capabilities and status
 * - Key metrics and recent activity
 * - Pending operator actions
 */

import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';

interface SystemHealth {
  frontend: 'healthy' | 'degraded' | 'offline';
  backend: 'healthy' | 'degraded' | 'offline';
  stateGraph: 'healthy' | 'degraded' | 'offline';
}

interface CapabilityStatus {
  name: string;
  status: 'live' | 'feature_flag' | 'integrated' | 'preview';
  description: string;
}

export function OverviewPage() {
  const [health, setHealth] = useState<SystemHealth>({
    frontend: 'healthy',
    backend: 'healthy',
    stateGraph: 'healthy',
  });
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Check backend health
        const response = await fetch('/api/v1/system/status');
        const data = await response.json();
        
        setHealth({
          frontend: 'healthy',
          backend: response.ok ? 'healthy' : 'degraded',
          stateGraph: data.state_graph?.healthy ? 'healthy' : 'degraded',
        });
      } catch (error) {
        setHealth({
          frontend: 'healthy',
          backend: 'offline',
          stateGraph: 'offline',
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkHealth();
  }, []);
  
  const capabilities: CapabilityStatus[] = [
    {
      name: 'Governed Execution Pipeline',
      status: 'live',
      description: 'Intent → Plan → Policy → Approval → Warrant → Execution → Verification → Ledger',
    },
    {
      name: 'Operator Approval Workflow',
      status: 'live',
      description: 'T1/T2 action review and approval with audit trail',
    },
    {
      name: 'Multi-Step Plan Execution',
      status: 'live',
      description: 'Governed orchestration with per-step enforcement',
    },
    {
      name: 'State Graph Memory',
      status: 'live',
      description: 'Persistent system state with 18 operational tables',
    },
    {
      name: 'Policy Engine',
      status: 'live',
      description: 'Constraint-based governance with 10 constraint types',
    },
    {
      name: 'Verification Layer',
      status: 'live',
      description: 'Independent post-execution validation',
    },
    {
      name: 'Execution Ledger',
      status: 'live',
      description: 'Forensic audit trail with immutable events',
    },
    {
      name: 'Reconciliation Control Plane',
      status: 'live',
      description: 'Governed autonomous remediation with circuit breakers',
    },
    {
      name: 'Learning System',
      status: 'feature_flag',
      description: 'Pattern detection and policy recommendations',
    },
    {
      name: 'Distributed Execution',
      status: 'feature_flag',
      description: 'Multi-node orchestration with HTTP transport',
    },
    {
      name: 'Distributed Locks',
      status: 'feature_flag',
      description: 'Cross-node concurrency control',
    },
    {
      name: 'Economic Governance',
      status: 'preview',
      description: 'Cost tracking and budget enforcement',
    },
    {
      name: 'Trust & Provenance',
      status: 'preview',
      description: 'Attestation and verification chains',
    },
    {
      name: 'Simulation',
      status: 'preview',
      description: 'Pre-execution outcome modeling',
    },
  ];
  
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '●';
      case 'degraded': return '◐';
      case 'offline': return '○';
      default: return '?';
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'feature_flag': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'integrated': return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'preview': return 'bg-gray-700/50 text-gray-300 border-gray-600';
      default: return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'Live';
      case 'feature_flag': return 'Feature Flag';
      case 'integrated': return 'Integrated';
      case 'preview': return 'Preview';
      default: return status;
    }
  };
  
  if (loading) {
    return (
      <PageLayout title="Overview" description="Vienna OS Production Status">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading system status...</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Overview" description="Vienna OS Production Status">
      <div className="space-y-6">
        {/* System Health */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">System Health</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Console Frontend</span>
                <span className={`text-2xl ${getHealthColor(health.frontend)}`}>
                  {getHealthIcon(health.frontend)}
                </span>
              </div>
              <p className="text-xs text-gray-400">console.regulator.ai</p>
              <p className="text-xs text-gray-500 mt-1">React + Vite SPA</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Runtime Backend</span>
                <span className={`text-2xl ${getHealthColor(health.backend)}`}>
                  {getHealthIcon(health.backend)}
                </span>
              </div>
              <p className="text-xs text-gray-400">vienna-os.fly.dev</p>
              <p className="text-xs text-gray-500 mt-1">Node.js + Express</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">State Graph</span>
                <span className={`text-2xl ${getHealthColor(health.stateGraph)}`}>
                  {getHealthIcon(health.stateGraph)}
                </span>
              </div>
              <p className="text-xs text-gray-400">SQLite Memory Layer</p>
              <p className="text-xs text-gray-500 mt-1">18 operational tables</p>
            </div>
          </div>
        </div>
        
        {/* Architecture Map */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Production Architecture</h2>
          
          <div className="space-y-3">
            <div className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">regulator.ai</span>
                <span className="text-xs text-gray-400">Vercel</span>
              </div>
              <p className="text-sm text-gray-400">Marketing & product site</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">console.regulator.ai</span>
                <span className="text-xs text-gray-400">Vercel</span>
              </div>
              <p className="text-sm text-gray-400">Operator dashboard (this console)</p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">vienna-os.fly.dev</span>
                <span className="text-xs text-gray-400">Fly.io IAD</span>
              </div>
              <p className="text-sm text-gray-400">Runtime backend + execution engine</p>
            </div>
          </div>
        </div>
        
        {/* Capabilities Matrix */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Current Capabilities</h2>
          
          <div className="space-y-2">
            {capabilities.map((capability) => (
              <div
                key={capability.name}
                className="bg-gray-900/50 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-white">{capability.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeClass(capability.status)}`}>
                      {getStatusLabel(capability.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{capability.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.hash = 'approvals'}
              className="bg-gray-900/50 hover:bg-gray-900 border border-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-sm font-medium text-white mb-1">Pending Approvals</div>
              <div className="text-xs text-gray-400">Review T1/T2 actions</div>
            </button>
            
            <button
              onClick={() => window.location.hash = 'now'}
              className="bg-gray-900/50 hover:bg-gray-900 border border-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-sm font-medium text-white mb-1">Now View</div>
              <div className="text-xs text-gray-400">Current activity</div>
            </button>
            
            <button
              onClick={() => window.location.hash = 'history'}
              className="bg-gray-900/50 hover:bg-gray-900 border border-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-sm font-medium text-white mb-1">Execution History</div>
              <div className="text-xs text-gray-400">Audit trail</div>
            </button>
            
            <button
              onClick={() => window.location.hash = 'runtime'}
              className="bg-gray-900/50 hover:bg-gray-900 border border-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-sm font-medium text-white mb-1">Runtime Status</div>
              <div className="text-xs text-gray-400">Control plane</div>
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
