import { Activity, TrendingUp, Minus, Bell, Cpu, X, RefreshCw, Globe } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardApi } from '../api/dashboard.js';
import { useViennaStream } from '../hooks/useViennaStream.js';
import type { DashboardBootstrapResponse } from '../api/types.js';

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

// ── Animated Globe Background ──────────────────────────────────────────────

const AnimatedGlobeBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connections, setConnections] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; progress: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Globe parameters
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    let rotation = 0;

    // Generate random points on sphere surface
    const generateSpherePoint = () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return { theta, phi };
    };

    // Project 3D point to 2D
    const project = (theta: number, phi: number, rot: number) => {
      const x3d = radius * Math.sin(phi) * Math.cos(theta + rot);
      const y3d = radius * Math.sin(phi) * Math.sin(theta + rot);
      const z3d = radius * Math.cos(phi);
      return {
        x: centerX + x3d,
        y: centerY + y3d,
        z: z3d,
        visible: z3d > -radius * 0.3, // Only show front hemisphere
      };
    };

    // Generate connections
    const updateConnections = () => {
      setConnections(prev => {
        const newConns = prev.map(c => ({ ...c, progress: c.progress + 0.01 })).filter(c => c.progress < 1);
        
        // Add new connection occasionally
        if (Math.random() < 0.05) {
          const p1 = generateSpherePoint();
          const p2 = generateSpherePoint();
          const proj1 = project(p1.theta, p1.phi, rotation);
          const proj2 = project(p2.theta, p2.phi, rotation);
          if (proj1.visible && proj2.visible) {
            newConns.push({
              x1: proj1.x,
              y1: proj1.y,
              x2: proj2.x,
              y2: proj2.y,
              progress: 0,
            });
          }
        }
        return newConns;
      });
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw globe outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw latitude/longitude lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < 8; i++) {
        const phi = (i / 8) * Math.PI;
        ctx.beginPath();
        for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
          const p = project(theta, phi, rotation);
          if (p.visible) {
            if (theta === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }

      // Draw connections
      connections.forEach(conn => {
        const x = conn.x1 + (conn.x2 - conn.x1) * conn.progress;
        const y = conn.y1 + (conn.y2 - conn.y1) * conn.progress;
        
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.6 * (1 - conn.progress)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(conn.x1, conn.y1);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw moving dot
        ctx.fillStyle = `rgba(251, 191, 36, ${0.8 * (1 - conn.progress)})`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      rotation += 0.002; // Slow rotation
      updateConnections();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [connections]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.15 }}
    />
  );
};

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
      // Fetch dashboard bootstrap with all metrics
      const bootstrap: DashboardBootstrapResponse = await dashboardApi.bootstrap();

      // Defensive: handle missing or malformed data
      const agents = Array.isArray(bootstrap?.agents) ? bootstrap.agents : [];
      const activeAgents = agents.filter((a: any) => a?.status === 'active').length;
      const totalAgents = agents.length;
      const avgTrust = agents.length > 0
        ? agents.reduce((s: number, a: any) => s + (Number(a?.trust_score) || 0), 0) / agents.length
        : 0;

      // Get counts from bootstrap data (with fallbacks)
      const warrantsToday = Array.isArray(bootstrap?.active_execution) ? bootstrap.active_execution.length : 0;
      const pendingApprovals = bootstrap?.queue_state?.blocked || 0;
      const policyEvals = Array.isArray(bootstrap?.decisions) ? bootstrap.decisions.length : 0;
      const avgLatencyMs = bootstrap?.metrics?.avg_latency_ms || 0;

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
    // Poll real activity from audit log
    const token = localStorage.getItem('vienna_access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/v1/activity/feed?limit=20', { credentials: 'include', headers });
        const data = await res.json();
        if (data.success && data.data) {
          const mapped = data.data.map((e: any) => ({
            id: e.id,
            timestamp: new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: (e.type || '').includes('warrant') ? 'warrant' as const
              : (e.type || '').includes('policy') ? 'policy' as const
              : (e.type || '').includes('agent') ? 'agent' as const
              : 'proposal' as const,
            message: e.details?.event || e.execution?.objective || e.type || 'System event',
            severity: (e.risk_tier === 'T3' || e.risk_tier === 'T2') ? 'warning' as const : 'info' as const,
          }));
          setActivityEvents(mapped);
        }
      } catch { /* silent */ }
    };
    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, [loading]);

  // Derive system health from data
  const governanceStatus: SystemStatusProps['status'] = data.avgLatencyMs > 500 ? 'degraded' : 'operational';
  const queueStatus: SystemStatusProps['status'] = data.pendingApprovals > 50 ? 'warning' : data.pendingApprovals > 20 ? 'degraded' : 'operational';

  // Fetch real sparkline data
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  useEffect(() => {
    const token = localStorage.getItem('vienna_access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    Promise.all([
      fetch('/api/v1/dashboard/sparklines?metric=executions&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      fetch('/api/v1/dashboard/sparklines?metric=evaluations&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      fetch('/api/v1/dashboard/sparklines?metric=approvals&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
    ]).then(([exec, evals, approvals]) => {
      setSparklines({
        executions: exec?.points || [0,0,0,0,0,0,0,0,0,0],
        evaluations: evals?.points || [0,0,0,0,0,0,0,0,0,0],
        approvals: approvals?.points || [0,0,0,0,0,0,0,0,0,0],
      });
    });
  }, []);
  const defaultSparkline = sparklines.executions || [0,0,0,0,0,0,0,0,0,0];

  return (
    <div className="min-h-screen relative">
      {/* Animated Globe Background */}
      <AnimatedGlobeBackground />
      
      {/* Content wrapper (above globe) */}
      <div className="relative" style={{ zIndex: 1 }}>
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
    </div>
  );
}
