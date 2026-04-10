/**
 * Runtime Page — Premium Terminal Design
 * 
 * Live pipeline metrics with glowing health indicators,
 * sparkline throughput, execution records with status glow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, RefreshCw, Zap, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useEventStream } from '../hooks/useEventStream.js';

// ─── Types ───

interface RuntimeStats {
  window: string;
  health: string;
  envelopes: { total: number; active: number; failed: number; succeeded: number };
  throughputPerMinute: number;
  errorRate: number;
  queueDepth: number;
  auditEvents: number;
}

interface ExecutionRecord {
  execution_id: string;
  action: string;
  agent_name: string;
  risk_tier: string;
  status: string;
  approved_by: string;
  executed_at: string;
}

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  executed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  denied:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-500' },
  expired:  { color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20',    dot: 'bg-gray-500' },
  revoked:  { color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  dot: 'bg-orange-500' },
  pending:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-500 animate-pulse' },
};

const TIER_CFG: Record<string, { color: string; bg: string; border: string }> = {
  T0: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  T1: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  T2: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  T3: { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

// ─── Metric Card ───

function MetricCard({ label, value, suffix, color, icon: Icon }: {
  label: string; value: number; suffix?: string; color: string; icon: React.ComponentType<any>;
}) {
  const colorMap: Record<string, { text: string; glow: string }> = {
    blue:    { text: 'text-blue-400',    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]' },
    emerald: { text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]' },
    red:     { text: 'text-red-400',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]' },
    amber:   { text: 'text-amber-400',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
    gray:    { text: 'text-gray-400',    glow: '' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-[#12131a] border border-white/[0.08] rounded-lg p-3.5 ${c.glow} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={c.text} />
        <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[24px] font-bold font-mono leading-none ${c.text}`}>{value}</span>
        {suffix && <span className="text-[10px] text-white/30">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Main Page ───

export function RuntimePage() {
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [window, setWindow] = useState('24h');
  const [loading, setLoading] = useState(true);
  const { connected, events } = useEventStream({ enabled: true, maxEvents: 10 });

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetch(`/api/v1/runtime/stats?window=${window}`, { credentials: 'include' }).then(r => r.json()),
        fetch('/api/v1/execution-records?limit=10', { credentials: 'include' }).then(r => r.json()),
      ]);
      setStats(s.data);
      setExecutions(e.data || []);
    } catch {} finally { setLoading(false); }
  }, [window]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (events.length > 0) load(); }, [events.length]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-amber-400" size={20} />
            Runtime
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Execution pipeline health and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Health indicator */}
          {stats && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              stats.health === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-red-500/10 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${stats.health === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold font-mono uppercase ${stats.health === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.health}
              </span>
            </div>
          )}
          {connected && (
            <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold font-mono text-emerald-400">
              SSE LIVE
            </span>
          )}
          {/* Window selector */}
          <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5">
            {['5m', '1h', '24h', '7d'].map(w => (
              <button key={w} onClick={() => setWindow(w)}
                className={`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                  window === w ? 'bg-amber-500/15 text-amber-400' : 'text-white/30 hover:text-white/50'
                }`}>{w}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Loading runtime...</span>
        </div>
      ) : stats && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
            <MetricCard label="Proposals" value={stats.envelopes.total} color="blue" icon={Activity} />
            <MetricCard label="Succeeded" value={stats.envelopes.succeeded} color="emerald" icon={CheckCircle} />
            <MetricCard label="Failed" value={stats.envelopes.failed} color="red" icon={XCircle} />
            <MetricCard label="Queue" value={stats.queueDepth} color="amber" icon={Clock} />
            <MetricCard label="Throughput" value={stats.throughputPerMinute} suffix="/min" color="amber" icon={Zap} />
            <MetricCard label="Error Rate" value={Math.round(stats.errorRate * 100)} suffix="%" color={stats.errorRate > 0.1 ? 'red' : 'emerald'} icon={AlertTriangle} />
            <MetricCard label="Audit Events" value={stats.auditEvents} color="gray" icon={Activity} />
          </div>

          {/* Execution Records */}
          <div className="bg-[#12131a] border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap size={12} className="text-amber-400" /> Recent Executions
              </h3>
              <button onClick={load} className="p-1.5 hover:bg-white/[0.04] rounded transition-colors">
                <RefreshCw size={12} className="text-white/30" />
              </button>
            </div>
            {executions.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-[12px] font-mono">No execution records yet.</div>
            ) : (
              executions.map((ex, i) => {
                const sCfg = STATUS_CFG[ex.status] || STATUS_CFG.pending;
                const tCfg = TIER_CFG[ex.risk_tier] || TIER_CFG.T0;
                return (
                  <div key={ex.execution_id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${sCfg.dot} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold font-mono text-white">{ex.action}</span>
                        <span className={`px-1.5 py-0.5 ${tCfg.bg} border ${tCfg.border} rounded text-[8px] font-bold ${tCfg.color} font-mono`}>
                          {ex.risk_tier}
                        </span>
                        <span className={`px-1.5 py-0.5 ${sCfg.bg} border ${sCfg.border} rounded text-[8px] font-bold ${sCfg.color} font-mono`}>
                          {ex.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/25 font-mono mt-0.5">
                        {ex.agent_name || 'system'} · {ex.approved_by || 'auto'} · {ex.executed_at ? new Date(ex.executed_at).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
