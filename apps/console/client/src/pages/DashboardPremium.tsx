/**
 * Dashboard Premium — Operator Control Center
 * 
 * Premium redesign: information-dense situation room.
 * Integrates with dashboard bootstrap API + SSE stream.
 * No duplicate header — renders inside App.tsx shell (MainNav).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, AlertCircle, TrendingDown, Shield } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore.js';
import { bootstrapApi } from '../api/bootstrap.js';
import { fleetApi, type FleetAgent, type FleetSummary } from '../api/fleet.js';
import { listApprovals, type Approval } from '../api/approvals.js';
import { useViennaStream } from '../hooks/useViennaStream.js';

interface LiveEvent {
  id: string;
  time: string;
  agent: string;
  action: string;
  type: 'success' | 'warning' | 'info';
}

export default function DashboardPremium() {
  const navigate = useNavigate();
  const { systemStatus, setSystemStatus, setServices } = useDashboardStore();
  const [fleet, setFleet] = useState<{ agents: FleetAgent[]; summary: FleetSummary | null }>({ agents: [], summary: null });
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);

  // SSE stream for live events
  useViennaStream({
    onEvent: (event: any) => {
      if (event.type === 'warrant_issued' || event.type === 'execution_complete' || event.type === 'policy_violation') {
        setLiveEvents(prev => [{
          id: crypto.randomUUID(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          agent: event.agent_id || 'system',
          action: event.summary || event.type.replace(/_/g, ' '),
          type: event.type === 'policy_violation' ? 'warning' : event.type === 'execution_complete' ? 'success' : 'info',
        }, ...prev.slice(0, 19)]);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashData, fleetData, approvalData, metricsData] = await Promise.allSettled([
          bootstrapApi.dashboard(),
          fleetApi.getOverview(),
          listApprovals({ status: 'pending' }),
          fetch('/api/v1/system/health/detailed').then(r => r.json()).then(d => d.data),
        ]);

        if (cancelled) return;

        if (dashData.status === 'fulfilled') {
          const d = dashData.value as any;
          if (d.systemStatus) setSystemStatus(d.systemStatus);
          if (d.services) setServices(d.services);
        }

        if (fleetData.status === 'fulfilled') {
          const f = fleetData.value as any;
          setFleet({
            agents: f.agents || [],
            summary: f.summary || null,
          });
        }

        if (approvalData.status === 'fulfilled') {
          const a = approvalData.value as any;
          setApprovals(Array.isArray(a) ? a : a.data || []);
        }

        if (metricsData.status === 'fulfilled') {
          setSystemMetrics(metricsData.value);
        }
      } catch (err) {
        console.error('Dashboard bootstrap failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeAgents = fleet.agents.filter(a => a.status === 'active').length;
  const totalAgents = fleet.agents.length;
  const avgTrust = totalAgents > 0
    ? (fleet.agents.reduce((s, a) => s + (a.trust_score || 0), 0) / totalAgents).toFixed(1)
    : '—';
  const pendingApprovals = approvals.length;
  const actionsToday = fleet.summary?.actionsToday ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Observation Banner */}
      <div className="rounded-lg py-2.5 px-4 flex items-center gap-3"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Activity className="text-blue-400" size={16} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          System Monitoring Active
        </span>
        <div className="h-4 w-px" style={{ background: 'rgba(59,130,246,0.3)' }} />
        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          Real-time governance in effect. All agent actions monitored.
        </span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Active Agents" value={`${activeAgents}`} subtext={`of ${totalAgents} total`} trend={null} color="emerald" />
        <KPICard label="Actions Today" value={actionsToday.toLocaleString()} subtext="governed executions" trend={fleet.summary ? '+' : null} color="emerald" />
        <KPICard label="Pending Approvals" value={`${pendingApprovals}`} subtext={pendingApprovals > 0 ? 'requires attention' : 'queue clear'} trend={null} color={pendingApprovals > 0 ? 'amber' : 'emerald'} onClick={() => navigate('/approvals')} />
        <KPICard label="Avg Trust Score" value={`${avgTrust}%`} subtext="fleet average" trend={null} color="emerald" />
      </div>

      {/* Fleet Status + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Fleet Grid */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fleet Status</h2>
            <button onClick={() => navigate('/fleet')} className="text-xs font-mono hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>VIEW ALL →</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(fleet.agents.length > 0 ? fleet.agents.slice(0, 6) : placeholderAgents).map((agent) => (
              <div key={agent.agent_id || agent.id} className="rounded p-2.5 transition-colors hover:opacity-90 cursor-pointer"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}
                onClick={() => navigate('/fleet')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{agent.display_name || agent.agent_id}</span>
                  <div className={`w-2 h-2 rounded-full ${statusDot(agent.status)}`} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  <span>Trust: {agent.trust_score?.toFixed(0) ?? '—'}%</span>
                  <span>{agent.actions_today ?? 0} actions</span>
                </div>
              </div>
            ))}
          </div>
          {fleet.agents.length === 0 && (
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
              No agents registered. <button onClick={() => navigate('/connect')} className="underline" style={{ color: 'var(--accent-primary)' }}>Connect one →</button>
            </p>
          )}
        </div>

        {/* Live Activity */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Live Activity</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">STREAMING</span>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {liveEvents.length > 0 ? liveEvents.map((event) => (
              <div key={event.id} className="rounded p-2 flex items-start gap-2 text-[11px]"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                <span className="font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>{event.time}</span>
                <span className="font-mono shrink-0" style={{ color: 'var(--accent-primary)' }}>{event.agent}</span>
                <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>{event.action}</span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${event.type === 'success' ? 'bg-emerald-500' : event.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              </div>
            )) : (
              <div className="text-xs font-mono py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                Waiting for events… SSE stream connected.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HealthCard label="Runtime Status" value={systemStatus?.database ? 'OPERATIONAL' : 'CHECKING…'} sub={systemStatus ? `Uptime: ${systemStatus.uptime || '—'}` : 'Connecting…'} color="emerald" />
        <HealthCard label="Database" value={systemStatus?.database ? 'HEALTHY' : 'CHECKING…'} sub={`Pool: ${systemStatus?.connections || '—'}`} color="emerald" />
        <HealthCard label="Pending Approvals" value={`${pendingApprovals}`} sub={pendingApprovals > 0 ? 'Requires operator action' : 'All clear'} color={pendingApprovals > 0 ? 'amber' : 'emerald'} onClick={() => navigate('/approvals')} />
      </div>

      {/* Performance Monitor */}
      {systemMetrics && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            Performance Monitor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Memory Usage */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Memory Usage
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-blue-500">
                  {systemMetrics.checks?.memory?.rss_mb || 0}
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>MB</span>
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                Heap: {systemMetrics.checks?.memory?.heap_used_mb || 0}/{systemMetrics.checks?.memory?.heap_total_mb || 0} MB
              </div>
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full bg-blue-500" style={{ width: `${Math.min(((systemMetrics.checks?.memory?.heap_used_mb || 0) / (systemMetrics.checks?.memory?.heap_total_mb || 1)) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Database Latency */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Database Latency
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-emerald-500">
                  {systemMetrics.checks?.database?.latency_ms?.toFixed(0) || '—'}
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>ms</span>
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                Status: {systemMetrics.checks?.database?.status || 'unknown'}
              </div>
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(((systemMetrics.checks?.database?.latency_ms || 0) / 100) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Disk Usage */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Disk Usage
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-3xl font-bold ${(systemMetrics.checks?.disk?.usage_percent || 0) > 75 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {systemMetrics.checks?.disk?.usage_percent || 0}
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>%</span>
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                Status: {systemMetrics.checks?.disk?.status || 'unknown'}
              </div>
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <div className={`h-full ${(systemMetrics.checks?.disk?.usage_percent || 0) > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${systemMetrics.checks?.disk?.usage_percent || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Subcomponents ── */

function KPICard({ label, value, subtext, trend, color, onClick }: {
  label: string; value: string; subtext: string; trend: string | null; color: string; onClick?: () => void;
}) {
  return (
    <div className={`rounded-lg p-3.5 flex flex-col ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
        {trend && (
          <div className={`text-[11px] font-bold font-mono flex items-center gap-1 ${color === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>
            {trend} <TrendingUp size={12} />
          </div>
        )}
      </div>
      <div className={`text-[28px] font-bold font-mono mt-1 leading-none ${color === 'amber' ? 'text-amber-500' : ''}`} style={color !== 'amber' ? { color: 'var(--text-primary)' } : {}}>
        {value}
      </div>
      <div className="text-[10px] mt-auto pt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{subtext}</div>
    </div>
  );
}

function HealthCard({ label, value, sub, color, onClick }: {
  label: string; value: string; sub: string; color: string; onClick?: () => void;
}) {
  const borderColor = color === 'amber' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)';
  return (
    <div className={`rounded-lg p-4 ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}` }}
      onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</h3>
        <div className={`w-2 h-2 rounded-full ${color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      </div>
      <div className={`text-xl font-bold font-mono ${color === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>{value}</div>
      <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function statusDot(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-500';
    case 'idle': return 'bg-amber-500';
    case 'suspended': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

const placeholderAgents: any[] = [];
