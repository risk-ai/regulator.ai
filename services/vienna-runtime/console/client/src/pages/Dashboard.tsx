/**
 * Dashboard Page
 * 
 * Phase 10.5: Operator Control Plane Dashboard
 * Restructured to reflect Vienna's governed reconciliation architecture
 */

import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore.js';
import { bootstrapApi } from '../api/bootstrap.js';
import { StatusCard, StatusRow } from '../components/dashboard/StatusCard.js';
import { ChatPanel } from '../components/chat/ChatPanel.js';
import { ServicePanel } from '../components/services/ServicePanel.js';
import { useViennaStream } from '../hooks/useViennaStream.js';
import { PanelErrorBoundary } from '../components/common/ErrorBoundary.js';

// Phase 10.5: New reconciliation-focused components
import { RuntimeControlPanel } from '../components/runtime/RuntimeControlPanel';
import { ReconciliationActivityPanel } from '../components/reconciliation/ReconciliationActivityPanel.js';
import { ExecutionLeasesPanel } from '../components/reconciliation/ExecutionLeasesPanel.js';
import { CircuitBreakersPanel } from '../components/reconciliation/CircuitBreakersPanel.js';
import { ReconciliationTimeline } from '../components/reconciliation/ReconciliationTimeline.js';
import { ExecutionPipelineStatus } from '../components/reconciliation/ExecutionPipelineStatus.js';

export function Dashboard() {
  const systemStatus = useDashboardStore((state) => state.systemStatus);
  const setSystemStatus = useDashboardStore((state) => state.setSystemStatus);
  const setServices = useDashboardStore((state) => state.setServices);
  const setProviders = useDashboardStore((state) => state.setProviders);
  const setCurrentThreadId = useDashboardStore((state) => state.setCurrentThreadId);
  const setChatMessages = useDashboardStore((state) => state.setChatMessages);
  const setLoading = useDashboardStore((state) => state.setLoading);
  const setError = useDashboardStore((state) => state.setError);
  
  // Connect to SSE stream
  useViennaStream();
  
  // Initial bootstrap load
  useEffect(() => {
    loadBootstrap();
  }, []);
  
  const loadBootstrap = async () => {
    console.log('[Dashboard] Loading bootstrap...');
    
    setLoading('status', true);
    setLoading('services', true);
    setLoading('providers', true);
    
    try {
      const bootstrap = await bootstrapApi.getBootstrap();
      
      console.log('[Dashboard] Bootstrap loaded:', {
        systemStatus: bootstrap.systemStatus.available,
        providers: bootstrap.providers.available,
        services: bootstrap.services.available,
        chat: bootstrap.chat.available,
      });
      
      // Hydrate system status
      if (bootstrap.systemStatus.available && bootstrap.systemStatus.data) {
        setSystemStatus(bootstrap.systemStatus.data);
        setError('status', undefined);
      } else {
        setError('status', bootstrap.systemStatus.error || 'System status unavailable');
      }
      
      // Hydrate services
      if (bootstrap.services.available && bootstrap.services.data) {
        setServices(bootstrap.services.data);
        setError('services', undefined);
      } else {
        setError('services', bootstrap.services.error || 'Services unavailable');
      }
      
      // Hydrate providers
      if (bootstrap.providers.available && bootstrap.providers.data) {
        setProviders(bootstrap.providers.data);
        setError('providers', undefined);
      } else {
        setError('providers', bootstrap.providers.error || 'Providers unavailable');
      }
      
      // Hydrate chat
      if (bootstrap.chat.available) {
        if (bootstrap.chat.currentThreadId) {
          setCurrentThreadId(bootstrap.chat.currentThreadId);
          localStorage.setItem('vienna:currentThreadId', bootstrap.chat.currentThreadId);
          console.log('[Dashboard] Restored thread:', bootstrap.chat.currentThreadId);
        }
        
        if (bootstrap.chat.recentMessages && bootstrap.chat.recentMessages.length > 0) {
          setChatMessages(bootstrap.chat.recentMessages);
          console.log('[Dashboard] Restored messages:', bootstrap.chat.recentMessages.length);
        }
      } else {
        console.warn('[Dashboard] Chat unavailable:', bootstrap.chat.error);
      }
      
    } catch (error) {
      console.error('[Dashboard] Failed to load bootstrap:', error);
      setError('status', 'Bootstrap failed');
      setError('services', 'Bootstrap failed');
      setError('providers', 'Bootstrap failed');
    } finally {
      setLoading('status', false);
      setLoading('services', false);
      setLoading('providers', false);
    }
  };

  // Determine observation window status
  const getObservationWindowStatus = (): { active: boolean; message: string } => {
    // Phase 10.3 deployed 2026-03-13 21:52 EDT
    const deploymentTime = new Date('2026-03-13T21:52:00-04:00').getTime();
    const windowDuration = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const remaining = Math.max(0, (deploymentTime + windowDuration) - now);

    if (remaining > 0) {
      const hoursRemaining = Math.floor(remaining / (60 * 60 * 1000));
      const minutesRemaining = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return {
        active: true,
        message: `Phase 10.3 observation window active — ${hoursRemaining}h ${minutesRemaining}m remaining`,
      };
    }

    return {
      active: false,
      message: 'Phase 10.3 observation window complete',
    };
  };

  const observationWindow = getObservationWindowStatus();
  
  return (
    <div className="space-y-6">
      {/* Observation Window Banner (Phase 10.3) */}
      {observationWindow.active && (
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-blue-400 text-xl">●</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-100">
                {observationWindow.message}
              </div>
              <div className="text-xs text-blue-300 mt-1">
                Execution timeout enforcement operational. Monitoring for stable behavior.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Runtime Control State + Execution Control + Infrastructure Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PanelErrorBoundary panelName="Runtime Control Panel">
          <RuntimeControlPanel />
        </PanelErrorBoundary>

        {/* Execution Control (existing) */}
        <StatusCard title="Execution Control">
          {systemStatus ? (
            <>
              <StatusRow
                label="Executor"
                value={systemStatus.executor_state}
                status={
                  systemStatus.executor_state === 'running' ? 'healthy' :
                  systemStatus.executor_state === 'paused' ? 'warning' :
                  'critical'
                }
              />
              <StatusRow
                label="Paused"
                value={systemStatus.paused ? 'YES' : 'NO'}
                status={systemStatus.paused ? 'warning' : 'healthy'}
              />
              {systemStatus.pause_reason && (
                <StatusRow
                  label="Reason"
                  value={systemStatus.pause_reason}
                  status="neutral"
                />
              )}
              <StatusRow
                label="Trading Guard"
                value={systemStatus.trading_guard_state}
                status={systemStatus.trading_guard_state === 'active' ? 'healthy' : 'neutral'}
              />
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">Loading...</div>
          )}
        </StatusCard>

        {/* Infrastructure Services */}
        <PanelErrorBoundary panelName="Service Panel">
          <ServicePanel />
        </PanelErrorBoundary>
      </div>

      {/* Row 2: Reconciliation Activity (Full Width) */}
      <PanelErrorBoundary panelName="Reconciliation Activity Panel">
        <ReconciliationActivityPanel />
      </PanelErrorBoundary>

      {/* Row 3: Execution Leases + Circuit Breakers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelErrorBoundary panelName="Execution Leases Panel">
          <ExecutionLeasesPanel />
        </PanelErrorBoundary>

        <PanelErrorBoundary panelName="Circuit Breakers Panel">
          <CircuitBreakersPanel />
        </PanelErrorBoundary>
      </div>

      {/* Row 4: Execution Pipeline (Full Width) */}
      <PanelErrorBoundary panelName="Execution Pipeline">
        <ExecutionPipelineStatus />
      </PanelErrorBoundary>

      {/* Row 5: Reconciliation Timeline (Full Width) */}
      <PanelErrorBoundary panelName="Reconciliation Timeline">
        <ReconciliationTimeline />
      </PanelErrorBoundary>

      {/* Row 6: Vienna Operator Chat (Full Width) */}
      <PanelErrorBoundary panelName="Chat Panel">
        <ChatPanel />
      </PanelErrorBoundary>
    </div>
  );
}
