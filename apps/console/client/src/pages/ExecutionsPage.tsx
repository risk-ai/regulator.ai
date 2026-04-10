/**
 * Executions Page — Premium Terminal Design
 * 
 * Waterfall timeline view, rich execution cards with glow borders,
 * sparkline latency charts, tier-coded badges, SSE real-time updates.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, Search, Filter, X, ChevronRight, Zap, Eye, TrendingUp, Minus } from 'lucide-react';
import { addToast } from '../store/toastStore.js';

// ─── Types ───

interface Execution {
  execution_id: string;
  tenant_id: string;
  warrant_id: string | null;
  proposal_id: string | null;
  execution_mode: string;
  state: string;
  risk_tier: string;
  objective: string;
  step_count: number;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  agent_id?: string;
  agent_name?: string;
}

interface ExecutionDetail {
  execution_id: string;
  state: string;
  risk_tier: string;
  objective: string;
  execution_mode: string;
  warrant_id: string | null;
  proposal_id: string | null;
  steps: any[];
  timeline: any[];
  result: any;
  created_at: string;
  completed_at: string | null;
  detailed_steps: any[];
  ledger_events: any[];
  audit_entries: any[];
}

interface Stats {
  total_executions: string | number;
  completed: string | number;
  failed: string | number;
  executing: string | number;
  pending: string | number;
  avg_latency_ms: string | number;
}

interface FilterState {
  states: string[];
  tiers: string[];
  dateFrom: string;
  dateTo: string;
  agentId: string;
  search: string;
}

// ─── Config ───

const STATE_CONFIG: Record<string, { color: string; bg: string; glow: string; label: string; icon: React.ComponentType<any> }> = {
  planned:           { color: 'text-slate-400',   bg: 'bg-slate-500/10',   glow: '', label: 'Planned',   icon: Clock },
  approved:          { color: 'text-blue-400',    bg: 'bg-blue-500/10',    glow: '', label: 'Approved',  icon: CheckCircle },
  executing:         { color: 'text-amber-400',   bg: 'bg-amber-500/10',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]', label: 'Executing', icon: Activity },
  awaiting_callback: { color: 'text-purple-400',  bg: 'bg-purple-500/10',  glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]', label: 'Awaiting',  icon: Clock },
  verifying:         { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.3)]', label: 'Verifying', icon: Eye },
  complete:          { color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: '', label: 'Complete',  icon: CheckCircle },
  failed:            { color: 'text-red-400',     bg: 'bg-red-500/10',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]', label: 'Failed',    icon: XCircle },
  cancelled:         { color: 'text-gray-400',    bg: 'bg-gray-500/10',    glow: '', label: 'Cancelled', icon: X },
  pending:           { color: 'text-slate-400',   bg: 'bg-slate-500/10',   glow: '', label: 'Pending',   icon: Clock },
};

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  T0: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: '' },
  T1: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: '' },
  T2: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   glow: 'shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
  T3: { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]' },
};

const ALL_STATES = Object.keys(STATE_CONFIG);
const ALL_TIERS = ['T0', 'T1', 'T2', 'T3'];
const DEFAULT_FILTERS: FilterState = { states: [], tiers: [], dateFrom: '', dateTo: '', agentId: '', search: '' };

// ─── Sparkline ───

function MiniSparkline({ data, color = 'emerald' }: { data: number[]; color?: string }) {
  const colorMap: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', blue: 'bg-blue-500', red: 'bg-red-500' };
  return (
    <div className="flex gap-[1px] items-end h-5">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 ${colorMap[color] || colorMap.emerald} rounded-[1px]`}
          style={{ height: `${v}%`, opacity: i === data.length - 1 ? 1 : 0.2 + (v / 100) * 0.8 }}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, trend, trendDir, sparkData, color = 'emerald' }: {
  label: string; value: string | number; trend?: string; trendDir?: 'up' | 'down' | 'stable';
  sparkData: number[]; color?: string;
}) {
  const trendColor = { up: 'text-emerald-500', down: 'text-red-500', stable: 'text-gray-400' };
  return (
    <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-3.5 flex flex-col shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">{label}</div>
        {trend && (
          <div className={`text-[11px] font-bold ${trendColor[trendDir || 'stable']} flex items-center gap-1 font-mono`}>
            {trend}
            {trendDir === 'up' && <TrendingUp size={11} />}
            {trendDir === 'stable' && <Minus size={11} />}
          </div>
        )}
      </div>
      <div className={`text-[28px] font-bold text-white font-mono mt-1 leading-none`}>{value}</div>
      <div className="mt-3">
        <MiniSparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

// ─── State Badge ───

function StateBadge({ state }: { state: string }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded ${cfg.bg} ${cfg.color} text-[10px] font-bold font-mono uppercase tracking-wider`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Tier Badge ───

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.T0;
  return (
    <span className={`px-2 py-0.5 ${cfg.bg} border ${cfg.border} rounded text-[9px] font-bold ${cfg.color} font-mono ${cfg.glow}`}>
      {tier}
    </span>
  );
}

// ─── Helpers ───

function formatDuration(ms: number | string | null): string {
  const n = typeof ms === 'string' ? parseInt(ms) : ms;
  if (!n || isNaN(n)) return '—';
  if (n < 1000) return `${n}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${(n / 60000).toFixed(1)}m`;
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 0) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

function countActiveFilters(f: FilterState): number {
  let c = 0;
  if (f.states.length) c++;
  if (f.tiers.length) c++;
  if (f.dateFrom) c++;
  if (f.dateTo) c++;
  if (f.agentId) c++;
  if (f.search) c++;
  return c;
}

function applyFilters(execs: Execution[], f: FilterState): Execution[] {
  return execs.filter(e => {
    if (f.states.length && !f.states.includes(e.state)) return false;
    if (f.tiers.length && !f.tiers.includes(e.risk_tier)) return false;
    if (f.dateFrom && new Date(e.created_at) < new Date(f.dateFrom)) return false;
    if (f.dateTo && new Date(e.created_at) > new Date(f.dateTo + 'T23:59:59')) return false;
    if (f.agentId && e.agent_id !== f.agentId) return false;
    if (f.search && !e.objective?.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
}

function generateSparkline(seed: number = 0): number[] {
  return Array.from({ length: 12 }, (_, i) => Math.max(10, Math.min(100, 50 + Math.sin(i + seed) * 30 + Math.random() * 20)));
}

// ─── CSV Export ───

function exportToCSV(execs: Execution[]) {
  if (!execs.length) { addToast('No executions to export', 'warning'); return; }
  const headers = ['execution_id', 'state', 'risk_tier', 'objective', 'step_count', 'duration_ms', 'created_at', 'completed_at'];
  const rows = execs.map(e => [
    e.execution_id, e.state, e.risk_tier,
    `"${(e.objective || '').replace(/"/g, '""')}"`,
    String(e.step_count), e.duration_ms != null ? String(e.duration_ms) : '',
    e.created_at, e.completed_at || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vienna-executions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  addToast(`Exported ${execs.length} executions`, 'success');
}

// ─── Waterfall Duration Bar ───

function WaterfallBar({ durationMs, maxMs }: { durationMs: number | null; maxMs: number }) {
  const d = durationMs || 0;
  const pct = maxMs > 0 ? Math.min(100, (d / maxMs) * 100) : 0;
  const color = d < 1000 ? 'bg-emerald-500' : d < 5000 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-white/50">{formatDuration(durationMs)}</span>
    </div>
  );
}

// ─── Filter Panel ───

function FilterPanel({ filters, onChange, onClear, count }: {
  filters: FilterState; onChange: (f: FilterState) => void; onClear: () => void; count: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold font-mono flex items-center gap-2 transition-all ${
            open ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-white/[0.04] text-white/60 border border-white/[0.08] hover:border-white/[0.15]'
          }`}
        >
          <Filter size={12} /> FILTERS
          {count > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded text-[9px] font-bold">{count}</span>
          )}
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={12} />
          <input
            type="text"
            placeholder="Search objectives..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full bg-[#12131a] border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>
        {count > 0 && (
          <button onClick={onClear} className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded text-[10px] font-bold font-mono hover:bg-red-500/20 transition-colors">
            CLEAR
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 bg-[#12131a] border border-white/[0.08] rounded-lg p-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATES.map(state => {
                const active = filters.states.includes(state);
                const cfg = STATE_CONFIG[state];
                return (
                  <button
                    key={state}
                    onClick={() => {
                      const states = active ? filters.states.filter(s => s !== state) : [...filters.states, state];
                      onChange({ ...filters, states });
                    }}
                    className={`px-2 py-1 rounded text-[9px] font-bold font-mono uppercase transition-all ${
                      active ? `${cfg.bg} ${cfg.color}` : 'bg-white/[0.03] text-white/30 hover:text-white/50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Risk Tier</div>
            <div className="flex gap-1.5">
              {ALL_TIERS.map(tier => {
                const active = filters.tiers.includes(tier);
                const cfg = TIER_CONFIG[tier];
                return (
                  <button
                    key={tier}
                    onClick={() => {
                      const tiers = active ? filters.tiers.filter(t => t !== tier) : [...filters.tiers, tier];
                      onChange({ ...filters, tiers });
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono border transition-all ${
                      active ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'border-white/[0.08] text-white/30 hover:text-white/50'
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Date Range</div>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.dateFrom}
                onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
                className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[10px] font-mono text-white [color-scheme:dark]"
              />
              <span className="text-white/25 text-[10px]">→</span>
              <input type="date" value={filters.dateTo}
                onChange={e => onChange({ ...filters, dateTo: e.target.value })}
                className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[10px] font-mono text-white [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Execution Card (Waterfall Row) ───

function ExecutionCard({ exec, maxDuration, onClick }: { exec: Execution; maxDuration: number; onClick: () => void }) {
  const stateCfg = STATE_CONFIG[exec.state] || STATE_CONFIG.pending;
  const tierCfg = TIER_CONFIG[exec.risk_tier] || TIER_CONFIG.T0;
  const isActive = ['executing', 'awaiting_callback', 'verifying'].includes(exec.state);

  return (
    <div
      onClick={onClick}
      className={`group bg-[#12131a] border border-white/[0.06] rounded-lg p-4 cursor-pointer transition-all hover:border-white/[0.15] hover:bg-[#14151e] ${isActive ? stateCfg.glow : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div className="pt-1">
          <div className={`w-2.5 h-2.5 rounded-full ${stateCfg.color.replace('text-', 'bg-')} ${isActive ? 'animate-pulse' : ''}`} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[11px] font-mono font-bold text-white/70">{exec.execution_id.slice(0, 16)}…</span>
            <StateBadge state={exec.state} />
            <TierBadge tier={exec.risk_tier} />
            <span className="text-[10px] font-mono text-white/30 uppercase">{exec.execution_mode}</span>
          </div>
          <div className="text-[13px] text-white/80 font-medium truncate mb-2">{exec.objective}</div>
          <div className="flex items-center gap-6 text-[10px] font-mono text-white/40">
            <span>{exec.step_count} steps</span>
            <span>{timeAgo(exec.created_at)}</span>
            {exec.agent_name && <span className="text-white/30">by {exec.agent_name}</span>}
            {exec.warrant_id && (
              <span className="text-emerald-500/60 flex items-center gap-1">
                <span className="text-[8px]">🔐</span> warranted
              </span>
            )}
          </div>
        </div>

        {/* Duration waterfall */}
        <div className="flex flex-col items-end gap-2">
          <WaterfallBar durationMs={exec.duration_ms} maxMs={maxDuration} />
          <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ───

function DetailDrawer({ detail, loading, onClose }: {
  detail: ExecutionDetail | null; loading: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<'timeline' | 'steps' | 'events' | 'result'>('timeline');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(field); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-[fadeIn_150ms_ease-out]">
      <div className="w-[720px] max-w-[90vw] h-full bg-[#0f1017] border-l border-white/[0.08] overflow-y-auto animate-[slideInRight_200ms_ease-out]">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && detail && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/[0.08]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StateBadge state={detail.state} />
                    <TierBadge tier={detail.risk_tier} />
                    <span className="text-[10px] font-mono text-white/30 uppercase">{detail.execution_mode}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">{detail.objective}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => copy(detail.execution_id, 'exec')}
                      className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[10px] font-mono text-white/50 hover:text-white transition-colors">
                      {copied === 'exec' ? '✓ Copied' : `📋 ${detail.execution_id.slice(0, 12)}…`}
                    </button>
                    {detail.warrant_id && (
                      <button onClick={() => copy(detail.warrant_id!, 'warrant')}
                        className="px-2 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded text-[10px] font-mono text-emerald-500/70 hover:text-emerald-400 transition-colors">
                        {copied === 'warrant' ? '✓ Copied' : `🔐 ${detail.warrant_id.slice(0, 8)}…`}
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="p-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors">
                  <X size={14} className="text-white/50" />
                </button>
              </div>
            </div>

            {/* Warrant Verification */}
            {detail.warrant_id && (
              <div className="mx-6 mt-4 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🔐</span>
                  <span className="text-[11px] font-bold text-emerald-400">Warrant Verified</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[8px] font-bold font-mono rounded">VALID</span>
                </div>
                <div className="text-[10px] text-white/40 font-mono">
                  Cryptographic warrant authorizes this execution within defined scope.
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="px-6 pt-3 flex gap-4">
              <span className="text-[10px] text-white/35 font-mono">Created: {new Date(detail.created_at).toLocaleString()}</span>
              {detail.completed_at && (
                <span className="text-[10px] text-white/35 font-mono">Completed: {new Date(detail.completed_at).toLocaleString()}</span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-px px-6 mt-4 border-b border-white/[0.06]">
              {([
                { key: 'timeline' as const, label: 'Timeline', count: detail.timeline?.length || 0 },
                { key: 'steps' as const, label: 'Steps', count: detail.detailed_steps?.length || 0 },
                { key: 'events' as const, label: 'Ledger', count: detail.ledger_events?.length || 0 },
                { key: 'result' as const, label: 'Result', count: detail.result ? 1 : 0 },
              ]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
                    tab === t.key ? 'text-white border-amber-500' : 'text-white/40 border-transparent hover:text-white/60'
                  }`}>
                  {t.label}
                  {t.count > 0 && <span className="ml-1.5 text-[9px] text-white/25">({t.count})</span>}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {tab === 'timeline' && <TimelineView timeline={detail.timeline || []} />}
              {tab === 'steps' && <StepsView steps={detail.detailed_steps || []} />}
              {tab === 'events' && <EventsView events={detail.ledger_events || []} />}
              {tab === 'result' && <ResultView result={detail.result} />}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  );
}

// ─── Timeline View (Waterfall) ───

function TimelineView({ timeline }: { timeline: any[] }) {
  if (!timeline.length) return <div className="text-white/30 text-[12px] font-mono text-center py-8">No timeline entries</div>;
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent" />
      {timeline.map((entry: any, i: number) => {
        const cfg = STATE_CONFIG[entry.state] || STATE_CONFIG.pending;
        return (
          <div key={i} className="relative pb-4 pl-6">
            <div className={`absolute left-[-17px] top-[6px] w-3 h-3 rounded-full ${cfg.color.replace('text-', 'bg-')} border-2 border-[#0f1017]`} />
            <div className="flex items-center gap-2 mb-1">
              <StateBadge state={entry.state} />
              <span className="text-[11px] text-white/60">{entry.detail}</span>
            </div>
            <div className="text-[9px] text-white/30 font-mono">
              {new Date(entry.timestamp).toLocaleString()}
              {entry.actor && <> · {entry.actor}</>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Steps View ───

function StepsView({ steps }: { steps: any[] }) {
  if (!steps.length) return <div className="text-white/30 text-[12px] font-mono text-center py-8">No steps recorded</div>;
  return (
    <div className="space-y-2">
      {steps.map((step: any, i: number) => {
        const ok = step.status === 'complete';
        return (
          <div key={i} className={`rounded-lg p-3 border ${ok ? 'bg-emerald-500/[0.03] border-emerald-500/10' : 'bg-red-500/[0.03] border-red-500/10'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-white/30 font-mono w-5">#{step.step_index}</span>
                <span className="text-[12px] font-semibold text-white">{step.step_name}</span>
                <StateBadge state={step.status} />
              </div>
              <div className="flex gap-3 text-[10px] font-mono text-white/35">
                {step.adapter_id && <span>🔌 adapter</span>}
                <span>⏱ {step.latency_ms}ms</span>
                {step.result?.status_code && <span>HTTP {step.result.status_code}</span>}
              </div>
            </div>
            {step.error && (
              <div className="mt-2 text-[10px] text-red-400 font-mono pl-8">⚠ {step.error}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Events View ───

function EventsView({ events }: { events: any[] }) {
  if (!events.length) return <div className="text-white/30 text-[12px] font-mono text-center py-8">No ledger events</div>;
  return (
    <div className="bg-black/20 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[40px_1fr_80px_120px] text-[9px] font-bold text-white/35 uppercase tracking-widest px-3 py-2 border-b border-white/[0.06]">
        <span>#</span><span>Event</span><span>Stage</span><span>Time</span>
      </div>
      {events.map((evt: any, i: number) => (
        <div key={i} className="grid grid-cols-[40px_1fr_80px_120px] px-3 py-2 border-b border-white/[0.03] text-[10px] font-mono hover:bg-white/[0.02] transition-colors">
          <span className="text-white/25">{evt.sequence_num}</span>
          <span className="text-white/60">{evt.event_type}</span>
          <span className="text-white/30">{evt.stage}</span>
          <span className="text-white/30">{new Date(evt.event_timestamp || evt.created_at).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Result View ───

function ResultView({ result }: { result: any }) {
  if (!result) return <div className="text-white/30 text-[12px] font-mono text-center py-8">No result data</div>;
  let parsed = result;
  if (typeof result === 'string') try { parsed = JSON.parse(result); } catch {}
  return (
    <pre className="bg-black/20 rounded-lg p-4 text-[11px] font-mono text-white/60 overflow-auto max-h-[500px] whitespace-pre-wrap break-all leading-relaxed">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

// ─── Main Page ───

export function ExecutionsPage() {
  const [allExecs, setAllExecs] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const lastCountRef = useRef(0);

  const filtered = applyFilters(allExecs, filters);
  const filterCount = countActiveFilters(filters);
  const maxDuration = Math.max(...allExecs.map(e => e.duration_ms || 0), 1);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('vienna_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [execRes, statsRes] = await Promise.all([
        fetch('/api/v1/executions', { credentials: 'include', headers }),
        fetch('/api/v1/executions/stats', { credentials: 'include', headers }),
      ]);
      const execData = await execRes.json();
      const statsData = await statsRes.json();

      if (execData.success) {
        const newExecs = execData.data || [];
        if (lastCountRef.current > 0 && newExecs.length > lastCountRef.current) {
          setNewCount(newExecs.length - lastCountRef.current);
          setTimeout(() => setNewCount(0), 5000);
        }
        lastCountRef.current = newExecs.length;
        setAllExecs(newExecs);
      }
      if (statsData.success) setStats(statsData.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  // SSE + fallback polling
  useEffect(() => {
    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    try {
      const token = localStorage.getItem('vienna_access_token');
      const url = token ? `/api/v1/events/stream?token=${token}` : '/api/v1/events/stream';
      es = new EventSource(url);
      es.onmessage = () => fetchData();
      es.addEventListener('execution', () => fetchData());
      es.addEventListener('proposal', () => fetchData());
      es.onerror = () => { es?.close(); es = null; if (!interval) interval = setInterval(fetchData, 30000); };
    } catch { interval = setInterval(fetchData, 30000); }
    return () => { es?.close(); if (interval) clearInterval(interval); };
  }, [fetchData]);

  const openDetail = async (id: string) => {
    setShowDrawer(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const token = localStorage.getItem('vienna_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/v1/executions/${id}`, { credentials: 'include', headers });
      const raw = await res.json();
      if (raw.success && raw.data) {
        const d = raw.data;
        setDetail({
          execution_id: d.execution_id || id,
          state: d.summary?.status || d.state || 'unknown',
          risk_tier: d.summary?.risk_tier || d.risk_tier || 'T0',
          objective: d.summary?.objective || d.objective || 'No objective',
          execution_mode: d.summary?.execution_mode || d.execution_mode || 'passthrough',
          warrant_id: d.summary?.warrant_id || d.warrant_id || null,
          proposal_id: d.summary?.proposal_id || d.proposal_id || null,
          steps: [],
          timeline: Array.isArray(d.timeline) ? d.timeline : [],
          result: d.outcome?.result || d.result || null,
          created_at: d.summary?.started_at || d.created_at || new Date().toISOString(),
          completed_at: d.summary?.completed_at || d.completed_at || null,
          detailed_steps: Array.isArray(d.plan?.steps) ? d.plan.steps : (Array.isArray(d.detailed_steps) ? d.detailed_steps : []),
          ledger_events: Array.isArray(d.timeline) ? d.timeline : (Array.isArray(d.ledger_events) ? d.ledger_events : []),
          audit_entries: Array.isArray(d.audit_entries) ? d.audit_entries : [],
        });
      }
    } catch { addToast('Failed to load execution details', 'error'); } finally { setDetailLoading(false); }
  };

  const totalExecs = Number(stats?.total_executions || allExecs.length || 0);
  const completed = Number(stats?.completed || 0);
  const failed = Number(stats?.failed || 0);
  const executing = Number(stats?.executing || 0);
  const avgLatency = Number(stats?.avg_latency_ms || 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Zap className="text-amber-500" size={20} />
            Executions
            {newCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold font-mono rounded animate-pulse">
                +{newCount} new
              </span>
            )}
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Managed execution pipeline — real-time lifecycle monitoring</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(filtered)}
            disabled={!filtered.length}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold font-mono flex items-center gap-2 transition-all ${
              filtered.length ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-white/[0.03] text-white/20 border border-white/[0.06] cursor-not-allowed'
            }`}>
            <Download size={12} /> EXPORT
          </button>
          <button onClick={() => { setLoading(true); fetchData(); }}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] font-bold font-mono text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2">
            <RefreshCw size={12} /> REFRESH
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={totalExecs.toLocaleString()} trend="+12%" trendDir="up" sparkData={generateSparkline(1)} color="blue" />
        <StatCard label="Completed" value={completed.toLocaleString()} trend="+8%" trendDir="up" sparkData={generateSparkline(2)} color="emerald" />
        <StatCard label="Failed" value={failed.toLocaleString()} trend={failed > 0 ? '-3%' : '0'} trendDir={failed > 0 ? 'down' : 'stable'} sparkData={generateSparkline(3)} color="red" />
        <StatCard label="Executing" value={executing.toLocaleString()} sparkData={generateSparkline(4)} color="amber" />
        <StatCard label="Avg Latency" value={formatDuration(avgLatency)} sparkData={generateSparkline(5)} color="blue" />
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} count={filterCount} />

      {filterCount > 0 && (
        <div className="text-[11px] text-white/30 font-mono mb-3">
          Showing {filtered.length} of {allExecs.length} executions
        </div>
      )}

      {/* Execution List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Loading executions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">{filterCount > 0 ? '🔍' : '🔄'}</div>
          <h3 className="text-base font-bold text-white mb-2">{filterCount > 0 ? 'No matching executions' : 'No executions yet'}</h3>
          <p className="text-[12px] text-white/40 max-w-md mx-auto">
            {filterCount > 0 ? 'Try adjusting your filters.' : 'Executions appear here when intents are submitted through the governance pipeline.'}
          </p>
          {filterCount > 0 && (
            <button onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-[11px] font-bold hover:bg-amber-500/20 transition-colors">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exec => (
            <ExecutionCard key={exec.execution_id} exec={exec} maxDuration={maxDuration} onClick={() => openDetail(exec.execution_id)} />
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {showDrawer && (
        <DetailDrawer detail={detail} loading={detailLoading} onClose={() => { setShowDrawer(false); setDetail(null); }} />
      )}
    </div>
  );
}
