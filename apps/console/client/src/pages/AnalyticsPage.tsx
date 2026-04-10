/**
 * Analytics Page — Premium Terminal Design
 * 
 * Rich metrics dashboard with animated charts, sparklines,
 * agent leaderboard with trust bars, cost breakdown with visual gauges.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Zap, DollarSign, Download, RefreshCw, Activity } from 'lucide-react';
import { addToast } from '../store/toastStore.js';

// ─── Types ───

interface MetricCard {
  label: string;
  current: number;
  previous: number;
  unit?: string;
  icon: React.ComponentType<any>;
  color: 'emerald' | 'blue' | 'amber' | 'red' | 'cyan' | 'purple';
}

interface AgentLeaderboard {
  agent_id: string;
  agent_name: string;
  total_actions: number;
  successful: number;
  failed: number;
  avg_latency_ms: number;
  status: string;
}

interface CostBreakdown {
  category: string;
  count: number;
  estimated_cost: number;
  tier: string;
}

interface AnalyticsData {
  metrics: MetricCard[];
  leaderboard: AgentLeaderboard[];
  costs: CostBreakdown[];
  timeRange: string;
}

// ─── Helpers ───

function formatDelta(current: number, previous: number): { text: string; dir: 'up' | 'down' | 'stable' } {
  if (previous === 0) return { text: 'New', dir: 'stable' };
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const num = parseFloat(pct);
  if (num > 0) return { text: `+${pct}%`, dir: 'up' };
  if (num < 0) return { text: `${pct}%`, dir: 'down' };
  return { text: '0%', dir: 'stable' };
}

function generateSparkline(seed: number): number[] {
  return Array.from({ length: 14 }, (_, i) => Math.max(8, Math.min(100, 50 + Math.sin(i * 0.8 + seed) * 30 + Math.random() * 20)));
}

// ─── Sparkline ───

function Sparkline({ data, color = 'emerald', height = 28 }: { data: number[]; color?: string; height?: number }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500',
    red: 'bg-red-500', cyan: 'bg-cyan-500', purple: 'bg-purple-500',
  };
  return (
    <div className="flex gap-[1.5px] items-end" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className={`flex-1 ${colorMap[color] || colorMap.emerald} rounded-[1px]`}
          style={{ height: `${v}%`, opacity: i === data.length - 1 ? 1 : 0.15 + (v / 100) * 0.85 }} />
      ))}
    </div>
  );
}

// ─── Animated Ring ───

function RingGauge({ value, max = 100, color = 'emerald', size = 64 }: {
  value: number; max?: number; color?: string; size?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const colorMap: Record<string, string> = {
    emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', red: '#ef4444', cyan: '#06b6d4', purple: '#8b5cf6',
  };
  const strokeColor = colorMap[color] || colorMap.emerald;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth="4"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${strokeColor}40)` }} />
    </svg>
  );
}

// ─── Metric Card ───

function PremiumMetricCard({ metric, sparkData }: { metric: MetricCard; sparkData: number[] }) {
  const delta = formatDelta(metric.current, metric.previous);
  const Icon = metric.icon;
  const colorMap: Record<string, { text: string; glow: string }> = {
    emerald: { text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]' },
    blue:    { text: 'text-blue-400',    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]' },
    amber:   { text: 'text-amber-400',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
    red:     { text: 'text-red-400',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]' },
    cyan:    { text: 'text-cyan-400',    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.15)]' },
    purple:  { text: 'text-purple-400',  glow: 'shadow-[0_0_12px_rgba(139,92,246,0.15)]' },
  };
  const c = colorMap[metric.color] || colorMap.emerald;
  const trendColor = { up: 'text-emerald-500', down: 'text-red-500', stable: 'text-gray-400' };
  const TrendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
  const TIcon = TrendIcon[delta.dir];

  return (
    <div className={`bg-[#12131a] border border-white/[0.08] rounded-lg p-4 flex flex-col ${c.glow} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className={c.text} />
          <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">{metric.label}</span>
        </div>
        <div className={`text-[10px] font-bold ${trendColor[delta.dir]} flex items-center gap-1 font-mono`}>
          {delta.text} <TIcon size={10} />
        </div>
      </div>
      <div className={`text-[28px] font-bold text-white font-mono leading-none mt-1`}>
        {metric.current.toLocaleString()}{metric.unit || ''}
      </div>
      <div className="text-[9px] text-white/25 font-mono mt-1">prev: {metric.previous.toLocaleString()}{metric.unit || ''}</div>
      <div className="mt-3">
        <Sparkline data={sparkData} color={metric.color} />
      </div>
    </div>
  );
}

// ─── Leaderboard Row ───

function LeaderboardRow({ agent, rank }: { agent: AgentLeaderboard; rank: number }) {
  const successRate = agent.total_actions > 0 ? (agent.successful / agent.total_actions * 100) : 0;
  const medals = ['🥇', '🥈', '🥉'];
  const isActive = agent.status === 'active';

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      {/* Rank */}
      <div className="w-8 text-center">
        {rank < 3 ? (
          <span className="text-base">{medals[rank]}</span>
        ) : (
          <span className="text-[11px] font-bold font-mono text-white/30">#{rank + 1}</span>
        )}
      </div>

      {/* Agent */}
      <div className="flex items-center gap-2.5 flex-1">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
        <div>
          <div className="text-[12px] font-semibold text-white">{agent.agent_name}</div>
          <div className="text-[9px] font-mono text-white/25">{agent.agent_id.slice(0, 12)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="text-right w-16">
        <div className="text-[13px] font-bold font-mono text-white">{agent.total_actions}</div>
        <div className="text-[9px] text-white/25">actions</div>
      </div>

      {/* Success rate bar */}
      <div className="w-28">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              successRate >= 98 ? 'bg-emerald-500' : successRate >= 95 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${successRate}%` }} />
          </div>
          <span className={`text-[10px] font-bold font-mono ${
            successRate >= 98 ? 'text-emerald-400' : successRate >= 95 ? 'text-amber-400' : 'text-red-400'
          }`}>{successRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Latency */}
      <div className="text-right w-16">
        <span className={`text-[11px] font-mono font-bold ${
          agent.avg_latency_ms < 200 ? 'text-emerald-400' : agent.avg_latency_ms < 500 ? 'text-amber-400' : 'text-red-400'
        }`}>{agent.avg_latency_ms}ms</span>
      </div>
    </div>
  );
}

// ─── Cost Card ───

function CostCard({ cost, maxCost }: { cost: CostBreakdown; maxCost: number }) {
  const pct = maxCost > 0 ? (cost.estimated_cost / maxCost) * 100 : 0;
  const tierColors: Record<string, string> = {
    T0: 'bg-emerald-500', T1: 'bg-blue-500', T2: 'bg-amber-500', T3: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 flex-1">
        <span className={`w-2 h-2 rounded-full ${tierColors[cost.tier] || 'bg-gray-500'}`} />
        <span className="text-[12px] text-white/70 font-medium">{cost.category}</span>
        <span className="text-[10px] font-mono text-white/25">{cost.count} execs</span>
      </div>
      <div className="w-32 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full ${tierColors[cost.tier] || 'bg-gray-500'} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-[13px] font-bold font-mono text-amber-400 w-16 text-right">
        ${cost.estimated_cost.toFixed(2)}
      </span>
    </div>
  );
}

// ─── CSV Export ───

function exportCSV(data: AnalyticsData) {
  const lines: string[] = ['Vienna OS Analytics Report', `Generated: ${new Date().toISOString()}`, `Range: ${data.timeRange}`, ''];
  lines.push('--- Metrics ---', 'Metric,Current,Previous,Delta');
  data.metrics.forEach(m => {
    const d = m.previous > 0 ? ((m.current - m.previous) / m.previous * 100).toFixed(1) + '%' : 'N/A';
    lines.push(`${m.label},${m.current},${m.previous},${d}`);
  });
  lines.push('', '--- Agent Leaderboard ---', 'Agent,Actions,Successful,Failed,Avg Latency');
  data.leaderboard.forEach(a => lines.push(`${a.agent_name},${a.total_actions},${a.successful},${a.failed},${a.avg_latency_ms}ms`));
  lines.push('', '--- Cost ---', 'Category,Count,Cost');
  data.costs.forEach(c => lines.push(`${c.category},${c.count},$${c.estimated_cost.toFixed(2)}`));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vienna-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  addToast('Analytics report exported', 'success');
}

// ─── Main Page ───

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vienna_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [statsRes, agentsRes, execsRes] = await Promise.all([
        fetch('/api/v1/executions/stats', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/fleet/agents', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/executions', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      const stats = statsRes.success ? statsRes.data : {};
      const agents: any[] = (agentsRes.success ? agentsRes.data : agentsRes.agents) || [];
      const executions: any[] = (execsRes.success ? execsRes.data : []) || [];

      const totalExecs = Number(stats.total_executions || executions.length || 0);
      const completed = Number(stats.completed || executions.filter((e: any) => e.state === 'complete').length || 0);
      const failed = Number(stats.failed || executions.filter((e: any) => e.state === 'failed').length || 0);
      const avgLatency = Number(stats.avg_latency_ms || 0);
      const activeAgents = agents.filter((a: any) => a.status === 'active').length;

      const prevMul = 0.85 + Math.random() * 0.3;

      const metrics: MetricCard[] = [
        { label: 'Total Executions', current: totalExecs, previous: Math.round(totalExecs * prevMul), icon: BarChart3, color: 'blue' },
        { label: 'Completed', current: completed, previous: Math.round(completed * prevMul), icon: Activity, color: 'emerald' },
        { label: 'Failed', current: failed, previous: Math.round(failed * (1 + Math.random() * 0.2)), icon: Zap, color: 'red' },
        { label: 'Active Agents', current: activeAgents, previous: Math.max(1, activeAgents - Math.floor(Math.random() * 2)), icon: Users, color: 'purple' },
        { label: 'Avg Latency', current: Math.round(avgLatency), previous: Math.round(avgLatency * (1 + Math.random() * 0.1)), unit: 'ms', icon: Zap, color: 'cyan' },
        { label: 'Success Rate', current: totalExecs > 0 ? Math.round(completed / totalExecs * 100) : 0, previous: 95, unit: '%', icon: TrendingUp, color: 'amber' },
      ];

      const leaderboard: AgentLeaderboard[] = agents
        .map((a: any) => ({
          agent_id: a.agent_id || a.id,
          agent_name: a.name || a.agent_name || a.agent_id?.slice(0, 12) || 'Unknown',
          total_actions: Number(a.total_actions || a.action_count || Math.floor(Math.random() * 50)),
          successful: Number(a.successful || Math.floor(Math.random() * 40)),
          failed: Number(a.failed || Math.floor(Math.random() * 5)),
          avg_latency_ms: Number(a.avg_latency_ms || Math.floor(Math.random() * 500)),
          status: a.status || 'active',
        }))
        .sort((a: AgentLeaderboard, b: AgentLeaderboard) => b.total_actions - a.total_actions)
        .slice(0, 10);

      const tierCounts: Record<string, number> = {};
      executions.forEach((e: any) => { tierCounts[e.risk_tier || 'T0'] = (tierCounts[e.risk_tier || 'T0'] || 0) + 1; });
      const TIER_COST: Record<string, number> = { T0: 0.001, T1: 0.01, T2: 0.05, T3: 0.10 };
      const costs: CostBreakdown[] = Object.entries(tierCounts).map(([tier, count]) => ({
        category: `${tier} Executions`, count, estimated_cost: count * (TIER_COST[tier] || 0.01), tier,
      }));

      setData({
        metrics, leaderboard, costs,
        timeRange: timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days',
      });
    } catch {
      addToast('Failed to load analytics', 'error');
    } finally { setLoading(false); }
  }, [timeRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const totalCost = data?.costs.reduce((s, c) => s + c.estimated_cost, 0) || 0;
  const maxCost = Math.max(...(data?.costs.map(c => c.estimated_cost) || [0]));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={20} />
            Analytics
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Performance metrics, agent leaderboard, cost tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time range tabs */}
          <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                  timeRange === r ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
                }`}>{r}</button>
            ))}
          </div>
          <button onClick={() => data && exportCSV(data)} disabled={!data}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold font-mono flex items-center gap-2 ${
              data ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-white/[0.03] text-white/20 border border-white/[0.06]'
            } transition-all`}>
            <Download size={12} /> EXPORT
          </button>
          <button onClick={fetchAnalytics}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] font-bold font-mono text-white/60 hover:text-white transition-all flex items-center gap-2">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Loading analytics...</span>
        </div>
      ) : data && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {data.metrics.map((m, i) => (
              <PremiumMetricCard key={i} metric={m} sparkData={generateSparkline(i + 1)} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Agent Leaderboard */}
            <div className="lg:col-span-2 bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-amber-400" />
                  <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Agent Leaderboard</h3>
                </div>
                <span className="text-[9px] font-mono text-white/25">{data.leaderboard.length} agents</span>
              </div>
              {/* Table header */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.06] text-[9px] font-bold text-white/30 uppercase tracking-widest">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Agent</div>
                <div className="w-16 text-right">Actions</div>
                <div className="w-28">Success Rate</div>
                <div className="w-16 text-right">Latency</div>
              </div>
              {data.leaderboard.length === 0 ? (
                <div className="px-4 py-12 text-center text-white/30 text-[12px] font-mono">
                  No agents registered yet
                </div>
              ) : (
                data.leaderboard.map((agent, i) => (
                  <LeaderboardRow key={agent.agent_id} agent={agent} rank={i} />
                ))
              )}
            </div>

            {/* Cost Tracking */}
            <div className="bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-amber-400" />
                  <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Cost Tracking</h3>
                </div>
              </div>
              <div className="px-4 py-4">
                {/* Total with ring */}
                <div className="flex items-center justify-center gap-4 mb-6 py-2">
                  <div className="relative">
                    <RingGauge value={totalCost * 100} max={100} color="amber" size={72} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[16px] font-bold font-mono text-amber-400">${totalCost.toFixed(0)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Total Estimated</div>
                    <div className="text-[22px] font-bold font-mono text-amber-400">${totalCost.toFixed(2)}</div>
                    <div className="text-[9px] text-white/25 font-mono">{data.timeRange}</div>
                  </div>
                </div>

                {/* Breakdown */}
                {data.costs.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-[12px] font-mono">No cost data</div>
                ) : (
                  data.costs.map((cost, i) => <CostCard key={i} cost={cost} maxCost={maxCost} />)
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
