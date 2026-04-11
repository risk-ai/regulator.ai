/**
 * Fleet Premium — Dense Terminal-Style Agent Dashboard
 * 
 * Integrates with fleet API. No duplicate header — renders inside App.tsx shell.
 * Dense table layout inspired by Bloomberg/Datadog.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { fleetApi, type FleetAgent, type FleetSummary } from '../api/fleet.js';

export default function FleetPremium() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<FleetAgent[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFleet = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await fleetApi.getOverview() as any;
      setAgents(data.agents || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Fleet load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFleet(); }, [loadFleet]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => loadFleet(), 30000);
    return () => clearInterval(interval);
  }, [loadFleet]);

  const totalAgents = agents.length;
  const activeCount = agents.filter(a => a.status === 'active').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;
  const suspendedCount = agents.filter(a => a.status === 'suspended').length;
  const avgTrust = totalAgents > 0
    ? (agents.reduce((s, a) => s + (a.trust_score || 0), 0) / totalAgents).toFixed(1)
    : '0.0';
  const totalActions = summary?.actionsToday ?? agents.reduce((s, a) => s + (a.actions_today || 0), 0);
  const avgLatency = summary?.avgLatencyMs?.toFixed(1) ?? '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Fleet Console</h1>
          <p className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {totalAgents} agents registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded flex items-center gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-500 uppercase tracking-wider">Live</span>
          </div>
          <button onClick={() => loadFleet(true)} disabled={refreshing}
            className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <button onClick={() => navigate('/connect')}
            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#000' }}>
            + Connect Agent
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatCard label="Total Agents" value={`${totalAgents}`}>
          <div className="flex h-1 rounded-full overflow-hidden mt-2" style={{ background: 'var(--border-subtle)' }}>
            {activeCount > 0 && <div className="bg-emerald-500" style={{ width: `${(activeCount / Math.max(totalAgents, 1)) * 100}%` }} />}
            {idleCount > 0 && <div className="bg-amber-500" style={{ width: `${(idleCount / Math.max(totalAgents, 1)) * 100}%` }} />}
            {suspendedCount > 0 && <div className="bg-red-500" style={{ width: `${(suspendedCount / Math.max(totalAgents, 1)) * 100}%` }} />}
          </div>
          <div className="flex gap-3 text-[9px] font-mono mt-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="text-emerald-500">● {activeCount} ACT</span>
            <span className="text-amber-500">● {idleCount} IDL</span>
            <span className="text-red-500">● {suspendedCount} SUS</span>
          </div>
        </StatCard>
        <StatCard label="Avg Trust" value={`${avgTrust}`} suffix="%" valueColor="text-emerald-500" />
        <StatCard label="Actions (24h)" value={totalActions.toLocaleString()} valueColor="text-blue-500" />
        <StatCard label="Fleet Latency" value={avgLatency} suffix="ms" />
        <StatCard label="Total Warrants" value={(summary?.actionsToday ?? 0).toLocaleString()} valueColor="text-amber-500" />
      </div>

      {/* Agent Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        {agents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>No agents registered yet</p>
            <button onClick={() => navigate('/connect')} className="text-sm underline" style={{ color: 'var(--accent-primary)' }}>
              Connect your first agent →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Status', 'Agent ID', 'Name', 'Trust', 'Actions (24h)', 'Last Heartbeat', 'Latency', ''].map(h => (
                  <th key={h} className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider ${h === 'Trust' || h === 'Actions (24h)' || h === 'Latency' ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, idx) => (
                <tr key={agent.id || agent.agent_id}
                  className="transition-colors hover:opacity-90 cursor-pointer"
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                  }}
                  onClick={() => navigate(`/fleet/${agent.agent_id}`)}>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusDot(agent.status)}`} />
                      <span className="text-[10px] font-mono font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
                        {statusLabel(agent.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs" style={{ color: 'var(--accent-primary)' }}>{agent.agent_id}</span>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{agent.display_name || agent.agent_id}</span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className={`font-mono text-xs font-medium ${trustColor(agent.trust_score)}`}>
                      {agent.trust_score?.toFixed(1) ?? '—'}%
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {(agent.actions_today ?? 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {agent.avg_latency_ms?.toFixed(0) ?? '—'}ms
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                      Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function StatCard({ label, value, suffix, valueColor, children }: {
  label: string; value: string; suffix?: string; valueColor?: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md p-3.5 flex flex-col" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-bold ${valueColor || ''}`} style={!valueColor ? { color: 'var(--text-primary)' } : {}}>
          {value}
        </span>
        {suffix && <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{suffix}</span>}
      </div>
      {children}
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

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'ACT';
    case 'idle': return 'IDL';
    case 'suspended': return 'SUS';
    default: return 'UNK';
  }
}

function trustColor(score: number | undefined) {
  if (!score) return '';
  if (score >= 95) return 'text-emerald-500';
  if (score >= 85) return 'text-amber-500';
  return 'text-red-500';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
