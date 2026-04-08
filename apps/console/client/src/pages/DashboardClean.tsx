/**
 * Dashboard Page — Clean Operator Design
 * 
 * Implements Superdesign draft: c0cb53e1-c84c-4eb2-9cbb-1e58310a111d
 * "Vienna OS Console — Clean Operator Dashboard"
 * 
 * Features:
 * - 4 KPI metric cards with sparklines
 * - 3 system health status cards
 * - Activity timeline with live events
 * - Runtime control panel
 * - Premium dark layered design
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  Bell, 
  Server, 
  HardDrive, 
  Link as LinkIcon,
  ShieldCheck,
  Activity as ActivityIcon
} from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore.js';
import { bootstrapApi } from '../api/bootstrap.js';
import { useViennaStream } from '../hooks/useViennaStream.js';
import { MetricCard } from '../components/ui/MetricCard';
import { HealthCard } from '../components/ui/HealthCard';
import { 
  ActivityTimeline, 
  type ActivityEvent 
} from '../components/ui/ActivityTimelineCard';
import { RuntimeControlPanel } from '../components/ui/RuntimeControlPanel';
import { Banner } from '../components/ui/Banner';

export function DashboardClean() {
  const navigate = useNavigate();
  const systemStatus = useDashboardStore((state) => state.systemStatus);
  const setSystemStatus = useDashboardStore((state) => state.setSystemStatus);
  const setServices = useDashboardStore((state) => state.setServices);
  const setProviders = useDashboardStore((state) => state.setProviders);
  const setLoading = useDashboardStore((state) => state.setLoading);
  const setError = useDashboardStore((state) => state.setError);
  const loading = useDashboardStore((state) => state.loading);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  // Connect to SSE stream
  useViennaStream();
  
  // Initial bootstrap load
  useEffect(() => {
    loadBootstrap();
  }, []);
  
  const loadBootstrap = async () => {
    setLoading('status', true);
    setLoading('services', true);
    setLoading('providers', true);
    
    try {
      const bootstrap = await bootstrapApi.getBootstrap();
      
      if (bootstrap.systemStatus.available && bootstrap.systemStatus.data) {
        setSystemStatus(bootstrap.systemStatus.data);
        setError('status', undefined);
      } else {
        setError('status', bootstrap.systemStatus.error || 'System status unavailable');
      }
      
      if (bootstrap.services.available && bootstrap.services.data) {
        setServices(bootstrap.services.data);
        setError('services', undefined);
      } else {
        setError('services', bootstrap.services.error || 'Services unavailable');
      }
      
      if (bootstrap.providers.available && bootstrap.providers.data) {
        setProviders(bootstrap.providers.data);
        setError('providers', undefined);
      } else {
        setError('providers', bootstrap.providers.error || 'Providers unavailable');
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

  // Mock activity events (TODO: replace with real SSE events)
  const activityEvents: ActivityEvent[] = [
    {
      id: '1',
      icon: '📋',
      iconBg: 'emerald',
      title: 'System Operational',
      description: 'All governance systems nominal. Execution pipeline healthy.',
      timestamp: new Date().toISOString(),
      relativeTime: 'now',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#12131a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              Operator Control Plane
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-11 h-11 flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={() => navigate('/runtime')}
              className="px-6 py-2.5 bg-violet-600 text-white text-[15px] font-semibold rounded-xl hover:bg-violet-700 transition-all shadow-xl"
            >
              Force Reconciliation
            </button>
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full border-2 border-violet-500/30" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-10 py-12 w-full space-y-12">
        
        {/* System Status Banner */}
        {!bannerDismissed && (
          <Banner
            icon={ShieldCheck}
            iconColor="blue"
            title="System operational — All services nominal"
            description="Real-time governance monitoring active. Execution pipeline healthy."
            dismissible
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Summary Metrics Row (4 KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <MetricCard
            label="Active Envelopes"
            value={systemStatus?.active_envelopes ?? 0}
            trend={{ value: '+0.0%', direction: 'neutral' }}
            sparkline={[60, 100, 70, 90, 80, 85]}
            status="healthy"
            loading={loading.status}
          />
          
          <MetricCard
            label="Blocked Envelopes"
            value={systemStatus?.blocked_envelopes ?? 0}
            trend={{ value: '—', direction: 'neutral' }}
            sparkline={[40, 70, 95, 75, 90, 100]}
            status={
              (systemStatus?.blocked_envelopes ?? 0) > 10 ? 'warning' : 'healthy'
            }
            loading={loading.status}
          />
          
          <MetricCard
            label="Dead Letters"
            value={systemStatus?.dead_letter_count ?? 0}
            trend={{ value: '—', direction: 'neutral' }}
            sparkline={[65, 50, 85, 95, 80, 100]}
            status={
              (systemStatus?.dead_letter_count ?? 0) > 0 ? 'critical' : 'healthy'
            }
            loading={loading.status}
          />
          
          <MetricCard
            label="Queue Depth"
            value={systemStatus?.queue_depth ?? 0}
            status={
              (systemStatus?.queue_depth ?? 0) > 100 ? 'critical' :
              (systemStatus?.queue_depth ?? 0) > 50 ? 'warning' :
              'healthy'
            }
            loading={loading.status}
          />
        </div>

        {/* System Health Grid */}
        <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[15px] font-bold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.2em]">
              System Component Health
            </h3>
            <span className="text-[12px] text-[rgba(255,255,255,0.35)] font-mono">
              LAST UPDATED: {new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })} EDT
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <HealthCard
              title="Public API"
              icon={Server}
              status="healthy"
              metrics={[
                { label: 'Latency', value: '45ms' },
                { label: 'Uptime', value: '99.98%', highlight: true },
              ]}
              healthPercentage={95}
              loading={loading.status}
            />
            
            <HealthCard
              title="Database Pool"
              icon={HardDrive}
              status="healthy"
              metrics={[
                { label: 'Latency', value: '12ms' },
                { label: 'Uptime', value: '99.99%', highlight: true },
              ]}
              healthPercentage={98}
              loading={loading.status}
            />
            
            <HealthCard
              title="Integrations"
              icon={LinkIcon}
              status="degraded"
              metrics={[
                { label: 'Latency', value: '234ms', highlight: true },
                { label: 'Uptime', value: '98.50%' },
              ]}
              healthPercentage={70}
              loading={loading.status}
            />
          </div>
        </div>

        {/* Activity Timeline & Runtime Control */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Activity Timeline (2/3 width) */}
          <div className="lg:col-span-2">
            <ActivityTimeline
              events={activityEvents}
              onViewAll={() => navigate('/history')}
              loading={loading.status}
            />
          </div>
          
          {/* Runtime Control (1/3 width) */}
          <RuntimeControlPanel
            status={{
              operatingMode: systemStatus?.executor_state?.toUpperCase() ?? 'UNKNOWN',
              governanceLock: systemStatus?.paused ? 'inactive' : 'active',
              reconciliationInterval: systemStatus?.health?.latency_ms_avg ? `${systemStatus.health.latency_ms_avg}ms` : '—',
              emergencyHaltEnabled: !systemStatus?.paused,
            }}
            onEmergencyHalt={() => {
              if (confirm('Are you sure you want to initiate an emergency halt?')) {
                console.log('Emergency halt initiated');
                // TODO: Implement emergency halt API call
              }
            }}
            loading={loading.status}
          />
        </div>
      </main>

      {/* Page Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 mt-12 bg-[#12131a]/50">
        <div className="max-w-7xl mx-auto px-10 flex items-center justify-between text-[11px] text-[rgba(255,255,255,0.25)] font-mono uppercase tracking-widest font-semibold">
          <div>VIENNA OS v2.4.0 • 2026-04-08</div>
          <div className="flex gap-8">
            <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
              Architecture
            </button>
            <button onClick={() => navigate('/security')} className="hover:text-white transition-colors">
              Security Protocols
            </button>
            <button onClick={() => navigate('/policies')} className="hover:text-white transition-colors">
              Policy Registry
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SECURE CLOUD SYNC
          </div>
        </div>
      </footer>
    </div>
  );
}
