/**
 * Top Status Bar
 * 
 * Displays Vienna system health, execution state, queue depth, and connection status
 */

import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore.js';
import { useAuthStore } from '../../store/authStore.js';

export function TopStatusBar() {
  const systemStatus = useDashboardStore((state) => state.systemStatus);
  const sseConnected = useDashboardStore((state) => state.sseConnected);
  const providers = useDashboardStore((state) => state.providers);
  const services = useDashboardStore((state) => state.services);
  const { operator, logout } = useAuthStore();
  
  const handleLogout = async () => {
    if (confirm('Logout from Vienna Console?')) {
      await logout();
    }
  };
  
  // System health badge
  const healthColor = systemStatus ? ({
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
    offline: 'bg-gray-500',
  }[systemStatus.system_state] || 'bg-gray-500') : 'bg-gray-500';
  
  // Execution state badge
  const executionColor = systemStatus ? ({
    running: 'bg-green-500',
    paused: 'bg-yellow-500',
    recovering: 'bg-orange-500',
    stopped: 'bg-red-500',
  }[systemStatus.executor_state] || 'bg-gray-500') : 'bg-gray-500';
  
  // Provider health
  const primaryProvider = providers?.primary || 'unknown';
  const primaryHealth = providers?.providers[primaryProvider];
  const providerHealthy = primaryHealth?.status === 'healthy';
  
  // Service health (OpenClaw)
  const openclawService = services.find(s => s.service === 'openclaw-gateway');
  const openclawHealthy = openclawService?.status === 'running';
  
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Vienna Title */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-white">Vienna</span>
            <span className="text-sm text-gray-400">Operator Shell</span>
          </div>
          
          {/* Workspace Navigation */}
          <div className="flex items-center gap-1 border-l border-gray-700 pl-6">
            <a
              href="#dashboard"
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                window.location.hash === '#dashboard' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Dashboard
            </a>
            <a
              href="#now"
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                window.location.hash === '#now' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Operator Command Center - Phase 5E"
            >
              Now ⚡
            </a>
            <a
              href="#files"
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                window.location.hash === '#files' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Files
            </a>
          </div>
          
          {/* System Health */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${healthColor}`} />
            <span className="text-sm text-gray-300">
              {systemStatus?.system_state || 'loading'}
            </span>
          </div>
          
          {/* Execution State */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${executionColor}`} />
            <span className="text-sm text-gray-300">
              {systemStatus?.executor_state || 'loading'}
              {systemStatus?.paused && systemStatus.pause_reason && (
                <span className="text-gray-500 ml-1">({systemStatus.pause_reason})</span>
              )}
            </span>
          </div>
          
          {/* Queue Depth */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Queue:</span>
            <span className="text-sm text-white">
              {systemStatus?.queue_depth ?? '—'}
            </span>
            {systemStatus && systemStatus.active_envelopes > 0 && (
              <span className="text-sm text-gray-400">
                ({systemStatus.active_envelopes} active)
              </span>
            )}
          </div>
          
          {/* Provider */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${providerHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">{primaryProvider}</span>
          </div>
          
          {/* OpenClaw */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${openclawHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">openclaw</span>
          </div>
        </div>
        
        {/* Connection Status and Operator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {sseConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Operator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Operator:</span>
            <span className="text-sm text-white">{operator || 'unknown'}</span>
          </div>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
