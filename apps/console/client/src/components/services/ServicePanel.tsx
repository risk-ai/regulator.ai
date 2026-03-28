import { useAuthStore } from '../../store/authStore.js';
/**
 * Service Panel
 * 
 * Displays OpenClaw gateway, Vienna executor, and provider health
 */

import React, { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore.js';
import { systemApi } from '../../api/system.js';

export function ServicePanel() {
  const services = useDashboardStore((state) => state.services);
  const providers = useDashboardStore((state) => state.providers);
  const [restartLoading, setRestartLoading] = useState<string | null>(null);
  const [restartResult, setRestartResult] = useState<{service: string; message: string; status: string} | null>(null);
  
  const handleRestart = async (serviceName: string) => {
    setRestartLoading(serviceName);
    setRestartResult(null); // Clear previous result
    
    try {
      const result = await systemApi.restartService(serviceName, useAuthStore((state) => state.operator) || 'system');
      setRestartResult({
        service: serviceName,
        message: result.message,
        status: result.status,
      });
      
      // Refresh service status after 2 seconds
      setTimeout(() => {
        // Trigger dashboard store refresh
        // This will be picked up by the dashboard polling interval
        console.log('[ServicePanel] Service action completed, waiting for next refresh');
      }, 2000);
    } catch (error) {
      setRestartResult({
        service: serviceName,
        message: `Failed to restart: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failed',
      });
    } finally {
      setRestartLoading(null);
    }
  };
  
  // Clear result message after 10 seconds
  React.useEffect(() => {
    if (restartResult) {
      const timer = setTimeout(() => {
        setRestartResult(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [restartResult]);
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Services</h3>
      
      {/* Restart result */}
      {restartResult && (
        <div className={`mb-4 p-3 rounded ${
          restartResult.status === 'failed' ? 'bg-red-900/30 border border-red-700' :
          restartResult.status === 'preview' ? 'bg-blue-900/30 border border-blue-700' :
          'bg-yellow-900/30 border border-yellow-700'
        }`}>
          <p className="text-sm text-white font-medium mb-1">
            {restartResult.status.toUpperCase()}: {restartResult.service}
          </p>
          <p className="text-xs text-gray-300">{restartResult.message}</p>
        </div>
      )}
      
      {/* Services list */}
      <div className="space-y-4">
        {services.map((service) => (
          <ServiceCard
            key={service.service}
            service={service}
            onRestart={handleRestart}
            isLoading={restartLoading === service.service}
          />
        ))}
        
        {services.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No services found
          </div>
        )}
      </div>
      
      {/* Providers */}
      {providers && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-md font-semibold text-white mb-3">Model Providers</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Primary:</span>
              <span className="text-white">{providers.primary}</span>
            </div>
            
            {Object.entries(providers.providers).map(([name, health]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    health.status === 'healthy' ? 'bg-green-500' :
                    health.status === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-white">{name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`${
                    health.status === 'healthy' ? 'text-green-400' :
                    health.status === 'degraded' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {health.status}
                  </span>
                  {health.latencyMs && (
                    <span className="text-gray-400">{health.latencyMs}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ServiceCardProps {
  service: {
    service: string;
    status: 'running' | 'degraded' | 'stopped' | 'unknown';
    lastHeartbeatAt?: string;
    connectivity?: 'healthy' | 'degraded' | 'offline';
    restartable: boolean;
  };
  onRestart: (serviceName: string) => void;
  isLoading: boolean;
}

function ServiceCard({ service, onRestart, isLoading }: ServiceCardProps) {
  const statusColor = {
    running: 'bg-green-500',
    degraded: 'bg-yellow-500',
    stopped: 'bg-red-500',
    unknown: 'bg-gray-500',
  }[service.status];
  
  const connectivityColor = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    offline: 'text-red-400',
  }[service.connectivity || 'offline'];
  
  return (
    <div className="bg-gray-700 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-white font-medium">{service.service}</span>
        </div>
        
        {service.restartable && (
          <button
            onClick={() => onRestart(service.service)}
            disabled={isLoading}
            className="text-sm bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Restarting...' : 'Restart'}
          </button>
        )}
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status:</span>
          <span className="text-white">{service.status}</span>
        </div>
        
        {service.connectivity && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Connectivity:</span>
            <span className={connectivityColor}>{service.connectivity}</span>
          </div>
        )}
        
        {service.lastHeartbeatAt && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last heartbeat:</span>
            <span className="text-gray-300">
              {new Date(service.lastHeartbeatAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
