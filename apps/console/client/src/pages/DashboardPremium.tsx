import { Activity, TrendingUp, Minus, Bell, X, RefreshCw, Shield, AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardApi } from '../api/dashboard.js';
import { useViennaStream } from '../hooks/useViennaStream.js';
import type { DashboardBootstrapResponse } from '../api/types.js';

/* ════════════════════════════════════════════════════════════════════
   Metric Card — compact KPI with sparkline
   ════════════════════════════════════════════════════════════════════ */

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  sparklineData: number[];
  color?: 'green' | 'amber' | 'blue' | 'red';
  loading?: boolean;
}

const MetricCard = ({ label, value, trend, trendDirection, sparklineData, color = 'green', loading }: MetricCardProps) => {
  const barColor = { green: 'bg-emerald-500', amber: 'bg-amber-500', blue: 'bg-blue-500', red: 'bg-red-500' };
  const trendColor = { up: 'text-emerald-500', down: 'text-red-500', stable: 'text-zinc-500' };

  if (loading) {
    return (
      <div className="bg-[#0d0e14] border border-white/[0.06] p-3.5 flex flex-col animate-pulse">
        <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
        <div className="h-7 w-14 bg-white/[0.06] rounded mb-4" />
        <div className="flex gap-px items-end h-6">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex-1 bg-white/[0.04]" style={{ height: `${20 + (i * 7) % 60}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-3.5 flex flex-col hover:border-white/[0.12] transition-colors">
      <div className="flex justify-between items-start">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label}</div>
        {trend && (
          <div className={`text-[10px] font-bold font-mono ${trendColor[trendDirection || 'stable']} flex items-center gap-1`}>
            {trend} {trendDirection === 'up' && <TrendingUp size={10} />}
            {trendDirection === 'stable' && <Minus size={10} />}
          </div>
        )}
      </div>
      <div className={`text-[26px] font-bold font-mono mt-1 leading-none ${color === 'amber' ? 'text-amber-500' : color === 'red' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="mt-3 flex gap-px items-end h-6">
        {sparklineData.map((height, i) => (
          <div
            key={i}
            className={`flex-1 ${barColor[color]}`}
            style={{ height: `${Math.max(height, 2)}%`, opacity: i === sparklineData.length - 1 ? 1 : 0.15 + (height / 100) * 0.7 }}
          />
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   Risk Distribution — horizontal bar chart by tier
   ════════════════════════════════════════════════════════════════════ */

interface RiskTier { risk_tier: string; count: number }

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  T0: { label: 'T0', color: 'text-emerald-400', bg: 'bg-emerald-500', desc: 'Auto-approved' },
  T1: { label: 'T1', color: 'text-blue-400', bg: 'bg-blue-500', desc: 'Policy-gated' },
  T2: { label: 'T2', color: 'text-amber-400', bg: 'bg-amber-500', desc: 'Human review' },
  T3: { label: 'T3', color: 'text-red-400', bg: 'bg-red-500', desc: 'Multi-party sign-off' },
  unclassified: { label: '—', color: 'text-zinc-500', bg: 'bg-zinc-600', desc: 'Unclassified' },
};

const RiskDistribution = ({ data, loading }: { data: RiskTier[]; loading: boolean }) => {
  const total = data.reduce((s, d) => s + Number(d.count), 0);
  const sorted = ['T0', 'T1', 'T2', 'T3', 'unclassified']
    .map(tier => {
      const found = data.find(d => d.risk_tier === tier);
      return { tier, count: found ? Number(found.count) : 0 };
    })
    .filter(d => d.count > 0);

  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Risk Distribution</h3>
        <span className="text-[10px] font-mono text-zinc-600">{total} warrants</span>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-6 bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-6 text-zinc-600 text-xs font-mono">No warrants issued yet</div>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ tier, count }) => {
            const cfg = TIER_CONFIG[tier] || TIER_CONFIG.unclassified;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={tier}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{cfg.desc}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">{count} <span className="text-zinc-600">({pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-1.5 bg-white/[0.04] overflow-hidden">
                  <div className={`h-full ${cfg.bg} transition-all duration-500`} style={{ width: `${pct}%`, opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   Approval Breakdown — donut-style summary
   ════════════════════════════════════════════════════════════════════ */

interface ApprovalMetrics {
  pending: number;
  approved: number;
  denied: number;
  expired: number;
  avg_resolution_seconds: number | null;
  new_this_period: number;
}

const ApprovalBreakdown = ({ data, loading }: { data: ApprovalMetrics | null; loading: boolean }) => {
  if (loading || !data) {
    return (
      <div className="bg-[#0d0e14] border border-white/[0.06] p-4 animate-pulse">
        <div className="h-3 w-32 bg-white/[0.06] rounded mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/[0.04]" />)}
        </div>
      </div>
    );
  }

  const total = data.pending + data.approved + data.denied + data.expired;
  const avgMinutes = data.avg_resolution_seconds ? Math.round(data.avg_resolution_seconds / 60) : null;

  const rows = [
    { label: 'Approved', count: data.approved, icon: <CheckCircle size={12} />, color: 'text-emerald-400', bar: 'bg-emerald-500' },
    { label: 'Denied', count: data.denied, icon: <XCircle size={12} />, color: 'text-red-400', bar: 'bg-red-500' },
    { label: 'Pending', count: data.pending, icon: <Clock size={12} />, color: 'text-amber-400', bar: 'bg-amber-500' },
    { label: 'Expired', count: data.expired, icon: <AlertTriangle size={12} />, color: 'text-zinc-500', bar: 'bg-zinc-600' },
  ];

  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Approval Pipeline</h3>
        {avgMinutes !== null && (
          <span className="text-[10px] font-mono text-zinc-600">avg {avgMinutes}m resolution</span>
        )}
      </div>
      <div className="space-y-2.5">
        {rows.map(row => {
          const pct = total > 0 ? (row.count / total) * 100 : 0;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <div className={`${row.color} shrink-0`}>{row.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-mono text-zinc-400">{row.label}</span>
                  <span className={`text-[12px] font-mono font-bold ${row.color}`}>{row.count}</span>
                </div>
                <div className="h-1 bg-white/[0.04] overflow-hidden">
                  <div className={`h-full ${row.bar} transition-all duration-500`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {data.new_this_period > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-zinc-600">
          {data.new_this_period} new requests this period
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   Activity Feed — real governance events, not generic
   ════════════════════════════════════════════════════════════════════ */

interface ActivityEvent {
  id: string;
  event_type: string;
  actor: string;
  details: any;
  created_at: string;
}

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  warrant_issued: { icon: <Shield size={11} />, color: 'text-emerald-400' },
  warrant_revoked: { icon: <XCircle size={11} />, color: 'text-red-400' },
  policy_created: { icon: <CheckCircle size={11} />, color: 'text-blue-400' },
  policy_updated: { icon: <CheckCircle size={11} />, color: 'text-blue-400' },
  agent_registered: { icon: <Activity size={11} />, color: 'text-amber-400' },
  approval_granted: { icon: <CheckCircle size={11} />, color: 'text-emerald-400' },
  approval_denied: { icon: <XCircle size={11} />, color: 'text-red-400' },
  execution_completed: { icon: <CheckCircle size={11} />, color: 'text-emerald-400' },
  execution_rejected: { icon: <AlertTriangle size={11} />, color: 'text-red-400' },
};

const formatEventMessage = (event: ActivityEvent): string => {
  const d = event.details || {};
  switch (event.event_type) {
    case 'warrant_issued': return `Warrant issued for ${d.agent_id || 'agent'} → ${d.action || d.objective || 'action'}`;
    case 'warrant_revoked': return `Warrant revoked: ${d.warrant_id || d.reason || 'manual revocation'}`;
    case 'policy_created': return `Policy "${d.name || d.policy_id || 'policy'}" created`;
    case 'policy_updated': return `Policy "${d.name || d.policy_id || 'policy'}" updated`;
    case 'agent_registered': return `Agent "${d.display_name || d.agent_id || 'agent'}" registered`;
    case 'approval_granted': return `Approval granted: ${d.action || d.intent_id || 'request'} (${d.approver || event.actor})`;
    case 'approval_denied': return `Approval denied: ${d.action || d.intent_id || 'request'} (${d.approver || event.actor})`;
    case 'execution_completed': return `Execution complete: ${d.objective || d.execution_id || 'task'}`;
    case 'execution_rejected': return `Execution rejected: ${d.reason || d.execution_id || 'task'}`;
    default: return d.event || d.message || event.event_type.replace(/_/g, ' ');
  }
};

const ActivityFeed = ({ events, loading }: { events: ActivityEvent[]; loading: boolean }) => {
  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Governance Log</h3>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-600 uppercase">Live</span>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3 p-2 bg-white/[0.02] animate-pulse">
              <div className="h-3 w-14 bg-white/[0.06] rounded" />
              <div className="h-3 flex-1 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-zinc-600 text-xs font-mono mb-1">No governance events yet</div>
          <div className="text-zinc-700 text-[10px] font-mono">Connect an agent and submit an intent to see the pipeline in action</div>
        </div>
      ) : (
        <div className="space-y-1 max-h-[380px] overflow-y-auto">
          {events.map((event) => {
            const cfg = EVENT_ICONS[event.event_type] || { icon: <Activity size={11} />, color: 'text-zinc-500' };
            const time = new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={event.id} className="flex items-start gap-2.5 py-1.5 px-2 hover:bg-white/[0.02] transition-colors group">
                <div className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-zinc-300 font-mono truncate">{formatEventMessage(event)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-zinc-600">{time}</span>
                    {event.actor && <span className="text-[9px] font-mono text-zinc-700">{event.actor}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   System Health — real endpoint checks
   ════════════════════════════════════════════════════════════════════ */

interface HealthCheck {
  label: string;
  status: 'operational' | 'degraded' | 'warning';
  detail: string;
}

const SystemHealth = ({ checks, loading }: { checks: HealthCheck[]; loading: boolean }) => {
  const statusDot = { operational: 'bg-emerald-500', degraded: 'bg-amber-500', warning: 'bg-red-500' };
  const statusText = { operational: 'text-emerald-500', degraded: 'text-amber-500', warning: 'text-red-500' };

  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-4">
      <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-3">System Health</h3>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-2.5 bg-white/[0.02] border border-white/[0.04]">
              <div className={`w-2 h-2 rounded-full ${statusDot[check.status]} ${check.status === 'operational' ? '' : 'animate-pulse'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-zinc-300">{check.label}</div>
                <div className="text-[9px] font-mono text-zinc-600">{check.detail}</div>
              </div>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${statusText[check.status]}`}>
                {check.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   Execution Trend — mini bar chart
   ════════════════════════════════════════════════════════════════════ */

interface TrendBucket { bucket: string; executions: number; completed: number; rejected: number }

const ExecutionTrend = ({ data, loading }: { data: TrendBucket[]; loading: boolean }) => {
  const maxVal = Math.max(...data.map(d => Number(d.executions)), 1);

  return (
    <div className="bg-[#0d0e14] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Execution Throughput</h3>
        <span className="text-[10px] font-mono text-zinc-600">24h</span>
      </div>
      {loading ? (
        <div className="h-24 bg-white/[0.04] animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-zinc-700 text-[10px] font-mono">
          No executions in this period
        </div>
      ) : (
        <div className="flex items-end gap-px h-24">
          {data.map((bucket, i) => {
            const h = (Number(bucket.executions) / maxVal) * 100;
            const rejected = Number(bucket.rejected);
            const hasRejected = rejected > 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-stretch justify-end gap-0" title={`${bucket.executions} executions${hasRejected ? `, ${rejected} rejected` : ''}`}>
                {hasRejected && (
                  <div className="bg-red-500/60" style={{ height: `${(rejected / maxVal) * 100}%`, minHeight: '2px' }} />
                )}
                <div className="bg-emerald-500/70 hover:bg-emerald-500 transition-colors" style={{ height: `${h - (hasRejected ? (rejected / maxVal) * 100 : 0)}%`, minHeight: '1px' }} />
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500/70" />
          <span className="text-[9px] font-mono text-zinc-600">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500/60" />
          <span className="text-[9px] font-mono text-zinc-600">Rejected</span>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   Dashboard — Main Component
   ════════════════════════════════════════════════════════════════════ */

interface DashboardData {
  activeAgents: number;
  totalAgents: number;
  warrantsToday: number;
  pendingApprovals: number;
  policyEvals: number;
  avgTrust: number;
  avgLatencyMs: number;
  totalWarrants: number;
  activeWarrants: number;
  activePolicies: number;
  executionsPeriod: number;
  auditEventsPeriod: number;
  openIncidents: number;
}

export default function DashboardPremium() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    activeAgents: 0, totalAgents: 0, warrantsToday: 0, pendingApprovals: 0,
    policyEvals: 0, avgTrust: 0, avgLatencyMs: 0, totalWarrants: 0,
    activeWarrants: 0, activePolicies: 0, executionsPeriod: 0,
    auditEventsPeriod: 0, openIncidents: 0,
  });
  const [riskData, setRiskData] = useState<RiskTier[]>([]);
  const [approvalData, setApprovalData] = useState<ApprovalMetrics | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [executionTrend, setExecutionTrend] = useState<TrendBucket[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  useViennaStream();

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('vienna_access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  /* ── Load all dashboard data ── */
  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const headers = getAuthHeaders();

    try {
      // Primary dashboard endpoint — returns everything
      const res = await fetch('/api/v1/dashboard', { credentials: 'include', headers });
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        const overview = d.overview || {};
        const agents = d.agents || [];
        const activeAgents = agents.filter((a: any) => a?.status === 'active').reduce((s: number, a: any) => s + Number(a.count || 0), 0);
        const totalAgents = agents.reduce((s: number, a: any) => s + Number(a.count || 0), 0);

        setData({
          activeAgents,
          totalAgents: Number(overview.total_agents) || totalAgents,
          warrantsToday: Number(overview.active_warrants) || 0,
          pendingApprovals: Number(overview.pending_approvals) || 0,
          policyEvals: Number(overview.evaluations_period) || 0,
          avgTrust: 0, // computed from agent data if available
          avgLatencyMs: 0,
          totalWarrants: Number(overview.total_warrants) || 0,
          activeWarrants: Number(overview.active_warrants) || 0,
          activePolicies: Number(overview.active_policies) || 0,
          executionsPeriod: Number(overview.executions_period) || 0,
          auditEventsPeriod: Number(overview.audit_events_period) || 0,
          openIncidents: Number(overview.open_incidents) || 0,
        });

        // Risk distribution
        if (d.riskDistribution) setRiskData(d.riskDistribution);

        // Approval breakdown
        if (d.approvals) {
          setApprovalData({
            pending: Number(d.approvals.pending) || 0,
            approved: Number(d.approvals.approved) || 0,
            denied: Number(d.approvals.denied) || 0,
            expired: Number(d.approvals.expired) || 0,
            avg_resolution_seconds: d.approvals.avg_resolution_seconds ? Number(d.approvals.avg_resolution_seconds) : null,
            new_this_period: Number(d.approvals.new_this_period) || 0,
          });
        }

        // Execution trend
        if (d.executionTrend) setExecutionTrend(d.executionTrend);

        // Recent activity
        if (d.recentActivity) setActivityEvents(d.recentActivity);

        // System health
        if (d.systemHealth) {
          const sh = d.systemHealth;
          setHealthChecks([
            {
              label: 'Database',
              status: 'operational',
              detail: `${Number(sh.active_api_keys) || 0} active API keys`,
            },
            {
              label: 'Webhook Delivery',
              status: Number(sh.failed_webhooks_1h) > 0 ? 'degraded' : 'operational',
              detail: Number(sh.failed_webhooks_1h) > 0
                ? `${sh.failed_webhooks_1h} failed in last hour`
                : `${Number(sh.active_webhooks) || 0} active webhooks`,
            },
            {
              label: 'Integrations',
              status: 'operational',
              detail: `${Number(sh.active_integrations) || 0} connected`,
            },
          ]);
        }

        setError(null);
      }
    } catch (err) {
      console.error('[Dashboard] Load failed:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  /* ── Sparklines ── */
  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch('/api/v1/dashboard/sparklines?metric=executions&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      fetch('/api/v1/dashboard/sparklines?metric=evaluations&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      fetch('/api/v1/dashboard/sparklines?metric=approvals&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      fetch('/api/v1/dashboard/sparklines?metric=audit&range=24h&points=10', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
    ]).then(([exec, evals, approvals, audit]) => {
      setSparklines({
        executions: exec?.points || new Array(10).fill(0),
        evaluations: evals?.points || new Array(10).fill(0),
        approvals: approvals?.points || new Array(10).fill(0),
        audit: audit?.points || new Array(10).fill(0),
      });
    });
  }, [getAuthHeaders]);

  const emptySparkline = new Array(10).fill(0);

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* Error state */}
      {error && (
        <div className="bg-red-500/[0.08] border border-red-500/20 py-2.5 px-4 flex items-center gap-3">
          <AlertTriangle className="text-red-400 shrink-0" size={14} />
          <span className="text-[11px] text-red-300/80 font-mono flex-1">{error}</span>
          <button onClick={() => loadDashboard(true)} className="text-red-400 hover:text-white transition-colors text-[10px] font-mono font-bold">
            RETRY
          </button>
        </div>
      )}

      {/* Header bar with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-mono font-bold text-white uppercase tracking-wider">Mission Control</h1>
          {!loading && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/[0.08] border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-mono text-emerald-500 uppercase">
                {data.totalAgents} agent{data.totalAgents !== 1 ? 's' : ''} · {data.activePolicies} polic{data.activePolicies !== 1 ? 'ies' : 'y'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-zinc-500 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'REFRESHING' : 'REFRESH'}
        </button>
      </div>

      {/* First-run empty state */}
      {!loading && data.totalAgents === 0 && data.totalWarrants === 0 && (
        <div className="border-2 border-dashed border-amber-500/20 p-8 text-center">
          <div className="text-[11px] font-mono text-amber-500 uppercase tracking-widest mb-2">Getting Started</div>
          <p className="text-sm text-zinc-400 font-mono mb-6 max-w-lg mx-auto">
            Connect your first agent, define a governance policy, and submit a test intent to see the full warrant pipeline.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/connect" className="px-4 py-2 bg-amber-500 text-black text-[11px] font-mono font-bold hover:bg-amber-400 transition-colors">
              CONNECT AGENT →
            </a>
            <a href="/try" className="px-4 py-2 border border-amber-500/30 text-amber-500 text-[11px] font-mono font-bold hover:border-amber-500 transition-colors">
              TRY DEMO
            </a>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Executions (24h)"
          value={loading ? '—' : data.executionsPeriod.toLocaleString()}
          sparklineData={sparklines.executions || emptySparkline}
          color="green"
          loading={loading}
        />
        <MetricCard
          label="Policy Evaluations"
          value={loading ? '—' : data.policyEvals.toLocaleString()}
          sparklineData={sparklines.evaluations || emptySparkline}
          color="blue"
          loading={loading}
        />
        <MetricCard
          label="Active Warrants"
          value={loading ? '—' : data.activeWarrants}
          trend={data.totalWarrants > 0 ? `${data.totalWarrants} total` : undefined}
          trendDirection="stable"
          sparklineData={sparklines.approvals || emptySparkline}
          color="amber"
          loading={loading}
        />
        <MetricCard
          label="Pending Approvals"
          value={loading ? '—' : data.pendingApprovals}
          trend={data.openIncidents > 0 ? `${data.openIncidents} incident${data.openIncidents > 1 ? 's' : ''}` : undefined}
          trendDirection={data.openIncidents > 0 ? 'up' : 'stable'}
          sparklineData={sparklines.audit || emptySparkline}
          color={data.pendingApprovals > 20 ? 'red' : 'amber'}
          loading={loading}
        />
      </div>

      {/* Main grid: Activity + Health/Risk/Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left 2/3: Activity + Execution Trend */}
        <div className="lg:col-span-2 space-y-3">
          <ActivityFeed events={activityEvents} loading={loading} />
          <ExecutionTrend data={executionTrend} loading={loading} />
        </div>

        {/* Right 1/3: Risk + Approvals + Health */}
        <div className="space-y-3">
          <RiskDistribution data={riskData} loading={loading} />
          <ApprovalBreakdown data={approvalData} loading={loading} />
          <SystemHealth checks={healthChecks} loading={loading} />
        </div>
      </div>
    </div>
  );
}
