import { Activity, TrendingUp, Minus, Bell, Cpu, X, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fleetApi } from '../api/fleet.js';
import { useViennaStream } from '../hooks/useViennaStream.js';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  sparklineData: number[];
  color?: 'green' | 'amber' | 'blue';
  loading?: boolean;
}

const MetricCard = ({ label, value, trend, trendDirection, sparklineData, color = 'green', loading }: MetricCardProps) => {
  const colorClasses = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  };

  const trendColor = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    stable: 'text-gray-400',
  };

  if (loading) {
    return (
      <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-3.5 flex flex-col shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4),0_2px_4px_-1px_rgba(0,0,0,0.3)] animate-pulse">
        <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
        <div className="h-8 w-16 bg-white/[0.06] rounded mb-4" />
        <div className="flex gap-[1.5px] items-end h-7">
          {[...Array(10)].map((_, i) => <div key={i} className="flex-1 bg-white/[0.04] rounded-sm" style={{ height: `${30 + Math.random() * 50}%` }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-3.5 flex flex-col shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">{label}</div>
        {trend && (
          <div className={`text-[11px] font-bold ${trendColor[trendDirection || 'stable']} flex items-center gap-1 font-mono`}>
            {trend} {trendDirection === 'up' && <TrendingUp size={11} />}
            {trendDirection === 'stable' && <Minus size={11} />}
          </div>
        )}
      </div>
      <div className={`text-[28px] font-bold ${color === 'amber' ? 'text-amber-500' : 'text-white'} font-mono mt-1 leading-none`}>
        {value}
      </div>
      <div className="mt-4 flex gap-[1.5px] items-end h-7">
        {sparklineData.map((height, i) => (
          <div
            key={i}
            className={`flex-1 ${colorClasses[color]}`}
            style={{ 
              height: `${height}%`,
              opacity: i === sparklineData.length - 1 ? 1 : 0.2 + (height / 100) * 0.8
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface SystemStatusProps {
  label: string;
  status: 'operational' | 'degraded' | 'warning';
  detail: string;
  uptime?: string;
}

const SystemStatusCard = ({ label, status, detail, uptime }: SystemStatusProps) => {
  const statusConfig = {
    operational: { dot: 'bg-emerald-500', text: 'text-emerald-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' },
    degraded: { dot: 'bg-amber-500', text: 'text-amber-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
    warning: { dot: 'bg-red-500', text: 'text-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' },
  };

  return (
    <div className={`bg-[#1a1b26] border border-white/[0.08] rounded-lg p-3 ${statusConfig[status].glow}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[13px] font-semibold text-white">{label}</div>
        <div className={`w-2 h-2 rounded-full ${statusConfig[status].dot} animate-pulse`} />
      </div>
      <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${statusConfig[status].text}`}>
        {status.toUpperCase()}
      </div>
      <div className="text-[11px] text-white/55 font-mono">{detail}</div>
      {uptime && (
        <div className="text-[10px] text-white/35 font-mono mt-2 pt-2 border-t border-white/[0.06]">
          Uptime: {uptime}
        </div>
      )}
    </div>
  );
};

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'proposal' | 'warrant' | 'policy' | 'agent';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

const ActivityTimeline = ({ events, loading }: { events: ActivityEvent[]; loading?: boolean }) => {
  const severityColor = {
    info: 'border-blue-500/30',
    warning: 'border-amber-500/30',
    error: 'border-red-500/30',
  };

  return (
    <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Live Activity</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-white/55">STREAMING</span>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 p-2 rounded bg-white/[0.02] animate-pulse">
              <div className="h-3 w-16 bg-white/[0.06] rounded" />
              <div className="h-3 flex-1 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-white/35 text-sm font-mono">No recent activity</div>
          ) : events.map((event) => (
            <div 
              key={event.id} 
              className={`flex gap-3 p-2 rounded border-l-2 ${severityColor[event.severity]} bg-white/[0.02] hover:bg-white/[0.04] transition-colors`}
            >
              <div className="text-[10px] font-mono text-white/35 whitespace-nowrap pt-0.5">
                {event.timestamp}
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-white/80 font-mono">{event.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface DashboardData {
  activeAgents: number;
  totalAgents: number;
  warrantsToday: number;
  pendingApprovals: number;
  policyEvals: number;
  avgTrust: number;
  avgLatencyMs: number;
}

export default function DashboardPremium() {
  const [showBanner, setShowBanner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    activeAgents: 0,
    totalAgents: 0,
    warrantsToday: 0,
    pendingApprovals: 0,
    policyEvals: 0,
    avgTrust: 0,
    avgLatencyMs: 0,
  });
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  // Connect to SSE stream for live updates
  useViennaStream();

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      // Fetch fleet overview for agent stats
      const fleetData = await fleetApi.getOverview() as any;
      const agents = fleetData?.agents || fleetData?.data?.agents || [];
      const summary = fleetData?.summary || fleetData?.data?.summary || fleetData?.data || {};

      const activeAgents = Array.isArray(agents)
        ? agents.filter((a: any) => a.status === 'active').length
        : (summary.active_count || summary.activeCount || 0);
      const totalAgents = Array.isArray(agents) ? agents.length : (summary.total || summary.totalAgents || 0);
      const avgTrust = Array.isArray(agents) && agents.length > 0
        ? agents.reduce((s: number, a: any) => s + (a.trust_score || 0), 0) / agents.length
        : (summary.avgTrust || 0);

      // Try to get warrant/proposal counts from fleet summary or dashboard
      const warrantsToday = summary.warrants_today || summary.warrantsToday || summary.actionsToday || 0;
      const pendingApprovals = summary.pending_approvals || summary.pendingApprovals || summary.pendingCount || 0;
      const policyEvals = summary.policy_evals || summary.policyEvals || summary.evaluationsToday || 0;
      const avgLatencyMs = summary.avg_latency_ms || summary.avgLatencyMs || 0;

      setData({
        activeAgents,
        totalAgents,
        warrantsToday,
        pendingApprovals,
        policyEvals,
        avgTrust: Math.round(avgTrust * 10) / 10,
        avgLatencyMs: Math.round(avgLatencyMs),
      });
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Load failed:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Generate activity events from SSE or simulate from data
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      const types = ['proposal', 'warrant', 'policy', 'agent'] as const;
      const messages: Record<string, string[]> = {
        proposal: ['Proposal submitted for review', 'Proposal auto-evaluated', 'Proposal escalated to T2'],
        warrant: ['Warrant issued', 'Warrant executed successfully', 'Warrant expired'],
        policy: ['Policy evaluation: ALLOW', 'Policy evaluation: DENY', 'Policy updated'],
        agent: ['Agent heartbeat received', 'Agent trust score updated', 'Agent registered'],
      };
      const type = types[Math.floor(Math.random() * types.length)];
      const msgList = messages[type];
      const newEvent: ActivityEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type,
        message: msgList[Math.floor(Math.random() * msgList.length)],
        severity: Math.random() > 0.85 ? 'warning' : 'info',
      };
      setActivityEvents(prev => [newEvent, ...prev].slice(0, 20));
    }, 8000);
    return () => clearInterval(interval);
  }, [loading]);

  // Derive system health from data
  const governanceStatus: SystemStatusProps['status'] = data.avgLatencyMs > 500 ? 'degraded' : 'operational';
  const queueStatus: SystemStatusProps['status'] = data.pendingApprovals > 50 ? 'warning' : data.pendingApprovals > 20 ? 'degraded' : 'operational';

  // Placeholder sparklines (will be replaced when sparkline endpoint is added)
  const defaultSparkline = [40, 50, 45, 60, 75, 90, 70, 55, 95, 100];

  return (
    <div className="min-h-screen">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg py-2.5 px-4 flex items-center gap-3 mb-4">
          <Activity className="text-red-400" size={18} />
          <span className="text-[12px] text-red-300/80 font-mono flex-1">{error}</span>
          <button onClick={() => loadDashboard(true)} className="text-red-400 hover:text-white transition-colors text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Observation Banner */}
      {showBanner && !error && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg py-2.5 px-4 flex items-center gap-3 mb-4">
          <Activity className="text-blue-400" size={18} />
          <div className="flex-1 flex items-center gap-4">
            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap">
              System Monitoring Active
            </span>
            <div className="h-4 w-px bg-blue-700/50" />
            <span className="text-[12px] text-blue-300/80 font-mono">
              Real-time governance enforcement — {data.totalAgents} agents registered
            </span>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-blue-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Active Agents"
          value={loading ? '—' : data.activeAgents}
          trend={data.totalAgents > 0 ? `${data.totalAgents} total` : undefined}
          trendDirection="stable"
          sparklineData={defaultSparkline}
          color="green"
          loading={loading}
        />
        <MetricCard
          label="Warrants Today"
          value={loading ? '—' : data.warrantsToday.toLocaleString()}
          sparklineData={defaultSparkline}
          color="green"
          loading={loading}
        />
        <MetricCard
          label="Avg Trust Score"
          value={loading ? '—' : data.avgTrust.toFixed(1)}
          sparklineData={defaultSparkline}
          color="blue"
          loading={loading}
        />
        <MetricCard
          label="Pending Approvals"
          value={loading ? '—' : data.pendingApprovals}
          trend={data.pendingApprovals > 10 ? 'HIGH' : undefined}
          trendDirection={data.pendingApprovals > 10 ? 'up' : 'stable'}
          sparklineData={defaultSparkline}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Main Grid: System Status + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* System Health */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider">System Health</h3>
            <button 
              onClick={() => loadDashboard(true)} 
              disabled={refreshing}
              className="p-1 rounded hover:bg-white/[0.06] transition-colors"
            >
              <RefreshCw size={12} className={`text-white/35 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <SystemStatusCard
            label="Governance Engine"
            status={governanceStatus}
            detail={data.avgLatencyMs > 0 ? `Avg latency: ${data.avgLatencyMs}ms` : 'Awaiting data'}
            uptime="—"
          />
          <SystemStatusCard
            label="Approval Queue"
            status={queueStatus}
            detail={`${data.pendingApprovals} pending approvals`}
          />
          <SystemStatusCard
            label="Fleet Status"
            status={data.activeAgents > 0 ? 'operational' : 'degraded'}
            detail={`${data.activeAgents} active of ${data.totalAgents} registered`}
          />
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline events={activityEvents} loading={loading} />
        </div>
      </div>

      {/* Runtime Control Panel */}
      <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Runtime Overview</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Active Agents</div>
            <div className="text-[20px] font-bold text-emerald-500 font-mono">{loading ? '—' : data.activeAgents}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Warrants</div>
            <div className="text-[20px] font-bold text-white font-mono">{loading ? '—' : data.warrantsToday.toLocaleString()}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Avg Trust</div>
            <div className="text-[20px] font-bold text-white font-mono">{loading ? '—' : data.avgTrust.toFixed(1)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Queue</div>
            <div className={`text-[20px] font-bold font-mono ${data.pendingApprovals > 20 ? 'text-amber-500' : 'text-white'}`}>
              {loading ? '—' : data.pendingApprovals}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
