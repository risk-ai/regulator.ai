/**
 * Activity Feed — Premium Terminal Design
 * 
 * Real-time agent activity feed with donut chart, KPI cards with glows,
 * streaming event timeline, top agents sidebar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Users, Zap, Eye, TrendingUp } from 'lucide-react';

// ─── Types ───

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  agent: { id: string; display_name: string };
  execution: { id: string; status: string; objective: string };
}

interface ActivitySummary {
  period: string;
  total_actions: number;
  actions_by_status: Record<string, number>;
  top_agents: Array<{ agent_id: string; count: number }>;
}

// ─── Helpers ───

function formatTimestamp(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Donut Chart (SVG) ───

function DonutChart({ completed, failed, pending }: { completed: number; failed: number; pending: number }) {
  const total = completed + failed + pending || 1;
  const r = 56, cx = 72, cy = 72, stroke = 10;
  const circ = 2 * Math.PI * r;
  const cLen = (completed / total) * circ;
  const fLen = (failed / total) * circ;
  const pLen = (pending / total) * circ;

  return (
    <svg width="144" height="144" viewBox="0 0 144 144">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {completed > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={`${cLen} ${circ - cLen}`} strokeDashoffset="0"
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }} />
      )}
      {failed > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke}
          strokeDasharray={`${fLen} ${circ - fLen}`} strokeDashoffset={`${-cLen}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.3))' }} />
      )}
      {pending > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={stroke}
          strokeDasharray={`${pLen} ${circ - pLen}`} strokeDashoffset={`${-(cLen + fLen)}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' }} />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#10b981" fontSize="22" fontWeight="700" fontFamily="monospace">{completed}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">COMPLETED</text>
    </svg>
  );
}

// ─── KPI Card ───

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: number; sub?: string; color: string; icon: React.ComponentType<any>;
}) {
  const colorMap: Record<string, { text: string; glow: string; border: string }> = {
    blue:    { text: 'text-blue-400',    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]',  border: 'border-blue-500/20' },
    emerald: { text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',  border: 'border-emerald-500/20' },
    red:     { text: 'text-red-400',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',   border: 'border-red-500/20' },
    amber:   { text: 'text-amber-400',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',  border: 'border-amber-500/20' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-[#12131a] border border-white/[0.08] rounded-lg p-4 ${c.glow} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={c.text} />
        <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-[26px] font-bold font-mono leading-none ${c.text}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/30 font-mono mt-1">{sub}</div>}
    </div>
  );
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; dot: string }> = {
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    failed:    { color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500' },
    pending:   { color: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-500 animate-pulse' },
    pending_approval: { color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500 animate-pulse' },
  };
  const c = cfg[status] || cfg.completed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${c.bg} ${c.color} text-[9px] font-bold font-mono uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Event Row ───

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex items-center justify-center text-[12px] font-bold text-white/60 flex-shrink-0">
        {(event.agent?.display_name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-white">{event.agent?.display_name || 'Unknown'}</span>
          <StatusBadge status={event.execution?.status || 'completed'} />
          <span className="text-[10px] font-mono text-white/25">{formatTimestamp(event.timestamp)}</span>
        </div>
        <div className="text-[11px] text-white/50 mt-0.5 truncate">
          {event.type || event.execution?.objective || '—'}
        </div>
      </div>
      <Eye size={12} className="text-white/15 group-hover:text-white/40 transition-colors mt-2 flex-shrink-0" />
    </div>
  );
}

// ─── Agent Row ───

function AgentRow({ agent, rank }: { agent: { agent_id: string; count: number }; rank: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2.5">
        <span className="w-6 text-center">
          {rank < 3 ? <span className="text-sm">{medals[rank]}</span> : <span className="text-[10px] font-mono text-white/25">#{rank + 1}</span>}
        </span>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-medium text-white">{agent.agent_id}</span>
      </div>
      <span className="text-[10px] font-bold font-mono text-white/40">{agent.count}</span>
    </div>
  );
}

// ─── Main Page ───

export default function ActivityFeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [feedRes, summaryRes] = await Promise.all([
        fetch('/api/v1/activity/feed?limit=50', { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/v1/activity/summary?period=${period}`, { credentials: 'include' }).then(r => r.json()),
      ]);
      if (feedRes.success) setEvents(feedRes.data || []);
      if (summaryRes.success) setSummary(summaryRes.data);
      setLastUpdated(new Date());
    } catch {} finally { setLoading(false); }
  }, [period]);

  useEffect(() => { setLoading(true); fetchAll(); const iv = setInterval(fetchAll, 8000); return () => clearInterval(iv); }, [fetchAll]);

  const completed = summary?.actions_by_status?.completed || 0;
  const failed = summary?.actions_by_status?.failed || 0;
  const pending = (summary?.actions_by_status?.pending || 0) + (summary?.actions_by_status?.pending_approval || 0);
  const total = summary?.total_actions || 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-blue-400" size={20} />
            Activity Feed
            <div className="flex items-center gap-2 ml-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-white/30">LIVE</span>
            </div>
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Real-time agent activity monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/25">
            {lastUpdated.toLocaleTimeString()}
          </span>
          <button onClick={() => { setLoading(true); fetchAll(); }}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] font-bold font-mono text-white/60 hover:text-white transition-all flex items-center gap-2">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Actions" value={total} sub={`Last ${period}`} color="blue" icon={Zap} />
        <KpiCard label="Completed" value={completed} sub={`${successRate}% success`} color="emerald" icon={CheckCircle} />
        <KpiCard label="Failed" value={failed} color="red" icon={XCircle} />
        <KpiCard label="Pending" value={pending} color="amber" icon={Clock} />
      </div>

      {/* Time filter */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mr-1">Period</span>
        <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5">
          {['1h', '24h', '7d', '30d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                period === p ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
              }`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Event Feed */}
        <div className="bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-blue-400" />
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Recent Activity</h3>
            </div>
            <span className="text-[9px] font-mono text-white/25">{events.length} events</span>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-3" />
              <span className="text-[11px] font-mono text-white/30">Loading…</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-[12px] font-mono">No recent activity</div>
          ) : (
            events.slice(0, 15).map(ev => <EventRow key={ev.id} event={ev} />)
          )}
        </div>

        {/* Right: Breakdown + Top Agents */}
        <div className="space-y-4">
          {/* Donut */}
          <div className="bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
            <div className="px-4 py-3 border-b border-white/[0.08]">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Breakdown
              </h3>
            </div>
            <div className="flex justify-center py-4">
              <DonutChart completed={completed} failed={failed} pending={pending} />
            </div>
            <div className="flex justify-center gap-5 pb-4 px-4">
              {[
                { label: 'Completed', value: completed, color: 'bg-emerald-500' },
                { label: 'Failed', value: failed, color: 'bg-red-500' },
                { label: 'Pending', value: pending, color: 'bg-amber-500' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />
                  <span className="text-[10px] font-mono text-white/50">{l.value} {l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Agents */}
          {summary && summary.top_agents.length > 0 && (
            <div className="bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={12} className="text-amber-400" /> Top Agents
                </h3>
              </div>
              {summary.top_agents.slice(0, 5).map((a, i) => <AgentRow key={a.agent_id} agent={a} rank={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
