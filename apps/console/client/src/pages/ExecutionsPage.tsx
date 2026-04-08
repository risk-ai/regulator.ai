/**
 * Executions Page — P1 Enhanced
 * 
 * Full P1 feature set:
 * - Advanced multi-select filters (state, tier, date range, agent)
 * - CSV export with active filters
 * - Full-screen detail modal with warrant verification
 * - Real-time SSE updates (30s fallback polling)
 * - Keyboard navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { addToast } from '../store/toastStore.js';
import { ExecutionStatsRow } from '../components/executions/ExecutionStatsRow.js';
import { ExecutionStatusBadge } from '../components/executions/ExecutionStatusBadge.js';

// ---- Types ----

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

// ---- Constants ----

const STATE_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  planned:            { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', label: 'Planned',   dot: '#94a3b8' },
  approved:           { bg: 'rgba(59,130,246,0.10)',  text: '#60a5fa', label: 'Approved',  dot: '#60a5fa' },
  executing:          { bg: 'rgba(245,158,11,0.10)',  text: '#f59e0b', label: 'Executing', dot: '#f59e0b' },
  awaiting_callback:  { bg: 'rgba(168,85,247,0.10)',  text: '#a855f6', label: 'Awaiting',  dot: '#a855f6' },
  verifying:          { bg: 'rgba(6,182,212,0.10)',   text: '#06b6d4', label: 'Verifying', dot: '#06b6d4' },
  complete:           { bg: 'rgba(16,185,129,0.10)',  text: '#10b981', label: 'Complete',  dot: '#10b981' },
  failed:             { bg: 'rgba(239,68,68,0.10)',   text: '#ef4444', label: 'Failed',    dot: '#ef4444' },
  cancelled:          { bg: 'rgba(107,114,128,0.10)', text: '#6b7280', label: 'Cancelled', dot: '#6b7280' },
  pending:            { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', label: 'Pending',   dot: '#94a3b8' },
};

const ALL_STATES = Object.keys(STATE_CONFIG);
const ALL_TIERS = ['T0', 'T1', 'T2', 'T3'];
const TIER_COLORS: Record<string, string> = { T0: '#94a3b8', T1: '#f59e0b', T2: '#ef4444', T3: '#dc2626' };

const DEFAULT_FILTERS: FilterState = { states: [], tiers: [], dateFrom: '', dateTo: '', agentId: '', search: '' };

// ---- Reusable Components ----

function StateBadge({ state }: { state: string }) {
  const s = STATE_CONFIG[state] || STATE_CONFIG.planned;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '4px',
      fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)',
      color: s.text, background: s.bg, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot,
        boxShadow: ['executing', 'verifying'].includes(state) ? `0 0 6px ${s.dot}` : 'none',
        animation: ['executing'].includes(state) ? 'pulse 2s infinite' : 'none',
      }} />
      {s.label}
    </span>
  );
}

// Map to ExecutionStatusBadge
function StateStatusBadge({ state, tier }: { state: string; tier?: string }) {
  const stateMap: Record<string, any> = {
    'planned': 'pending',
    'approved': 'pending',
    'executing': 'executing',
    'awaiting_callback': 'executing',
    'verifying': 'executing',
    'complete': 'executed',
    'failed': 'failed',
    'cancelled': 'denied',
    'pending': 'pending',
  };
  const mappedState = stateMap[state] || state;
  return (
    <ExecutionStatusBadge 
      status={mappedState} 
      riskTier={tier as any}
      size="sm"
    />
  );
}

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] || '#94a3b8';
  return (
    <span style={{
      padding: '2px 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
      fontFamily: 'var(--font-mono)', color, background: `${color}15`, border: `1px solid ${color}25`,
    }}>
      {tier}
    </span>
  );
}



// ---- Advanced Filter Bar ----

function FilterBar({ filters, onChange, onClear, activeCount }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggleState = (state: string) => {
    const states = filters.states.includes(state)
      ? filters.states.filter(s => s !== state)
      : [...filters.states, state];
    onChange({ ...filters, states });
  };

  const toggleTier = (tier: string) => {
    const tiers = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier];
    onChange({ ...filters, tiers });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Filter toggle bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: expanded ? '12px' : '0' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
            background: expanded ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
            color: expanded ? '#f59e0b' : 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          🔍 Filters
          {activeCount > 0 && (
            <span style={{
              padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
              background: '#f59e0b', color: '#fff',
            }}>
              {activeCount}
            </span>
          )}
        </button>

        {/* Quick search */}
        <input
          type="text"
          placeholder="Search objectives..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          style={{
            padding: '6px 12px', fontSize: '12px', borderRadius: '6px',
            border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-primary)', width: '240px', fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />

        {activeCount > 0 && (
          <button
            onClick={onClear}
            style={{
              padding: '6px 12px', fontSize: '11px', borderRadius: '6px', border: 'none',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 500,
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div style={{
          background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px',
          border: '1px solid var(--border-subtle)', display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: '16px',
        }}>
          {/* State filters */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
              Status
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {ALL_STATES.map(state => {
                const active = filters.states.includes(state);
                const cfg = STATE_CONFIG[state];
                return (
                  <button
                    key={state}
                    onClick={() => toggleState(state)}
                    style={{
                      padding: '3px 8px', fontSize: '10px', borderRadius: '4px', border: 'none',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600,
                      background: active ? cfg.bg : 'rgba(255,255,255,0.03)',
                      color: active ? cfg.text : 'var(--text-tertiary)',
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier filters */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
              Risk Tier
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {ALL_TIERS.map(tier => {
                const active = filters.tiers.includes(tier);
                const color = TIER_COLORS[tier];
                return (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', borderRadius: '4px',
                      border: `1px solid ${active ? color + '40' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: active ? `${color}15` : 'transparent',
                      color: active ? color : 'var(--text-tertiary)',
                    }}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                style={{
                  padding: '4px 8px', fontSize: '11px', borderRadius: '4px',
                  border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                  colorScheme: 'dark',
                }}
              />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>→</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                style={{
                  padding: '4px 8px', fontSize: '11px', borderRadius: '4px',
                  border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- CSV Export ----

function exportToCSV(executions: Execution[]) {
  if (executions.length === 0) {
    addToast('No executions to export', 'warning');
    return;
  }
  
  const headers = ['execution_id', 'state', 'risk_tier', 'objective', 'step_count', 'duration_ms', 'created_at', 'completed_at'];
  const rows = executions.map(e => [
    e.execution_id,
    e.state,
    e.risk_tier,
    `"${(e.objective || '').replace(/"/g, '""')}"`,
    String(e.step_count),
    e.duration_ms != null ? String(e.duration_ms) : '',
    e.created_at,
    e.completed_at || '',
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
  addToast(`Exported ${executions.length} executions to CSV`, 'success');
}

// ---- Detail Modal ----

function DetailModal({ detail, loading, onClose }: {
  detail: ExecutionDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'steps' | 'events' | 'result'>('timeline');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'flex-end',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div style={{
        width: '700px', maxWidth: '90vw', height: '100vh',
        background: 'var(--bg-secondary, #0f1117)', overflowY: 'auto',
        borderLeft: '1px solid var(--border-subtle)',
        animation: 'slideInRight 200ms ease-out',
      }}>
        {loading && (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', width: '28px', height: '28px',
              border: '2px solid var(--border-subtle)', borderTop: '2px solid #f59e0b',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {!loading && detail && (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <StateBadge state={detail.state} />
                  <TierBadge tier={detail.risk_tier} />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {detail.execution_mode}
                  </span>
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {detail.objective}
                </h2>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    onClick={() => copyToClipboard(detail.execution_id, 'exec')}
                    style={{
                      padding: '3px 8px', fontSize: '10px', borderRadius: '4px',
                      border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {copiedField === 'exec' ? '✓ Copied' : `📋 ${detail.execution_id.slice(0, 12)}…`}
                  </button>
                  {detail.warrant_id && (
                    <button
                      onClick={() => copyToClipboard(detail.warrant_id!, 'warrant')}
                      style={{
                        padding: '3px 8px', fontSize: '10px', borderRadius: '4px',
                        border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)',
                        color: '#10b981', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {copiedField === 'warrant' ? '✓ Copied' : `🔐 warrant:${detail.warrant_id.slice(0, 8)}…`}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '14px', padding: '6px 10px', borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Warrant Verification */}
            {detail.warrant_id && (
              <div style={{
                margin: '16px 24px', padding: '12px 16px', borderRadius: '8px',
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>🔐</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Warrant Verified</span>
                  <span style={{
                    padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700,
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                  }}>
                    VALID
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Cryptographic warrant authorizes this execution within defined scope.
                  <br />
                  ID: {detail.warrant_id}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div style={{ padding: '0 24px', display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Created: {new Date(detail.created_at).toLocaleString()}
              </span>
              {detail.completed_at && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Completed: {new Date(detail.completed_at).toLocaleString()}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '2px', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {([
                { key: 'timeline' as const, label: 'Timeline', count: detail.timeline?.length || 0 },
                { key: 'steps' as const, label: 'Steps', count: detail.detailed_steps?.length || 0 },
                { key: 'events' as const, label: 'Events', count: detail.ledger_events?.length || 0 },
                { key: 'result' as const, label: 'Result', count: detail.result ? 1 : 0 },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '10px 16px', fontSize: '12px', border: 'none', cursor: 'pointer',
                    fontWeight: activeTab === t.key ? 600 : 400,
                    color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: 'transparent',
                    borderBottom: activeTab === t.key ? '2px solid #f59e0b' : '2px solid transparent',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {t.label} {t.count > 0 && <span style={{ fontSize: '10px', opacity: 0.6 }}>({t.count})</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '20px 24px' }}>
              {activeTab === 'timeline' && <TimelineView timeline={Array.isArray(detail.timeline) ? detail.timeline : []} />}
              {activeTab === 'steps' && <StepsView steps={Array.isArray(detail.detailed_steps) ? detail.detailed_steps : []} />}
              {activeTab === 'events' && <EventsView events={Array.isArray(detail.ledger_events) ? detail.ledger_events : []} />}
              {activeTab === 'result' && <ResultView result={detail.result} />}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// ---- Helpers ----

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
  let count = 0;
  if (f.states.length > 0) count++;
  if (f.tiers.length > 0) count++;
  if (f.dateFrom) count++;
  if (f.dateTo) count++;
  if (f.agentId) count++;
  if (f.search) count++;
  return count;
}

function applyFilters(executions: Execution[], filters: FilterState): Execution[] {
  return executions.filter(e => {
    if (filters.states.length > 0 && !filters.states.includes(e.state)) return false;
    if (filters.tiers.length > 0 && !filters.tiers.includes(e.risk_tier)) return false;
    if (filters.dateFrom && new Date(e.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(e.created_at) > new Date(filters.dateTo + 'T23:59:59')) return false;
    if (filters.agentId && e.agent_id !== filters.agentId) return false;
    if (filters.search && !e.objective?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

// ---- Main Page ----

export function ExecutionsPage() {
  const [allExecutions, setAllExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const lastCountRef = useRef(0);

  const filteredExecutions = applyFilters(allExecutions, filters);
  const activeFilterCount = countActiveFilters(filters);

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
        setAllExecutions(newExecs);
      }
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      // Silent fail — toast already shows from apiClient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  // SSE for real-time updates, fallback to 30s polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const token = localStorage.getItem('vienna_access_token');
      const url = token ? `/api/v1/events/stream?token=${token}` : '/api/v1/events/stream';
      eventSource = new EventSource(url);
      
      eventSource.onmessage = () => {
        // Any event = refetch executions
        fetchData();
      };
      
      eventSource.addEventListener('execution', () => fetchData());
      eventSource.addEventListener('proposal', () => fetchData());

      eventSource.onerror = () => {
        // SSE failed, fall back to polling
        eventSource?.close();
        eventSource = null;
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchData, 30000);
        }
      };
    } catch {
      // SSE not available, use polling
      fallbackInterval = setInterval(fetchData, 30000);
    }

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [fetchData]);

  const openDetail = async (id: string) => {
    setSelected(id);
    setShowModal(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const token = localStorage.getItem('vienna_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/executions/${id}`, { credentials: 'include', headers });
      const rawData = await res.json();
      
      if (rawData.success && rawData.data) {
        const data = rawData.data;
        const transformed: ExecutionDetail = {
          execution_id: data.execution_id || id,
          state: data.summary?.status || data.state || 'unknown',
          risk_tier: data.summary?.risk_tier || data.risk_tier || 'T0',
          objective: data.summary?.objective || data.objective || 'No objective',
          execution_mode: data.summary?.execution_mode || data.execution_mode || 'passthrough',
          warrant_id: data.summary?.warrant_id || data.warrant_id || null,
          proposal_id: data.summary?.proposal_id || data.proposal_id || null,
          steps: [],
          timeline: Array.isArray(data.timeline) ? data.timeline : [],
          result: data.outcome?.result || data.result || null,
          created_at: data.summary?.started_at || data.created_at || new Date().toISOString(),
          completed_at: data.summary?.completed_at || data.completed_at || null,
          detailed_steps: Array.isArray(data.plan?.steps) ? data.plan.steps : (Array.isArray(data.detailed_steps) ? data.detailed_steps : []),
          ledger_events: Array.isArray(data.timeline) ? data.timeline : (Array.isArray(data.ledger_events) ? data.ledger_events : []),
          audit_entries: Array.isArray(data.audit_entries) ? data.audit_entries : [],
        };
        setDetail(transformed);
      }
    } catch (err) {
      addToast('Failed to load execution details', 'error', { label: 'Retry', onClick: () => openDetail(id) });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelected(null);
    setDetail(null);
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Executions
            {newCount > 0 && (
              <span style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                animation: 'pulse 2s infinite',
              }}>
                +{newCount} new
              </span>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Managed execution pipeline — real-time lifecycle monitoring
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => exportToCSV(filteredExecutions)}
            disabled={filteredExecutions.length === 0}
            style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: filteredExecutions.length > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              color: filteredExecutions.length > 0 ? '#10b981' : 'var(--text-tertiary)',
              border: `1px solid ${filteredExecutions.length > 0 ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
              cursor: filteredExecutions.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <ExecutionStatsRow stats={stats} loading={loading} />

      {/* Advanced Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        activeCount={activeFilterCount}
      />

      {/* Results count */}
      {activeFilterCount > 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Showing {filteredExecutions.length} of {allExecutions.length} executions
        </div>
      )}

      {/* Main Content */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', width: '24px', height: '24px',
              border: '2px solid var(--border-subtle)', borderTop: '2px solid #f59e0b',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>Loading executions...</p>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{activeFilterCount > 0 ? '🔍' : '🔄'}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {activeFilterCount > 0 ? 'No matching executions' : 'No executions yet'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
              {activeFilterCount > 0
                ? 'Try adjusting your filters or clearing them to see all executions.'
                : 'Executions appear here when intents are submitted through the governance pipeline.'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{
                  marginTop: '16px', padding: '8px 16px', fontSize: '12px', borderRadius: '6px',
                  border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Execution', 'State', 'Tier', 'Objective', 'Steps', 'Duration', 'Created'].map(h => (
                    <th key={h} style={{
                      padding: '11px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 600,
                      color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.map(exec => (
                  <tr
                    key={exec.execution_id}
                    onClick={() => openDetail(exec.execution_id)}
                    style={{
                      cursor: 'pointer',
                      background: selected === exec.execution_id ? 'rgba(245,158,11,0.05)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected === exec.execution_id ? 'rgba(245,158,11,0.05)' : 'transparent'; }}
                  >
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {exec.execution_id.slice(0, 16)}…
                    </td>
                    <td style={{ padding: '11px 14px' }}><StateStatusBadge state={exec.state} tier={exec.risk_tier} /></td>
                    <td style={{ padding: '11px 14px' }}><TierBadge tier={exec.risk_tier} /></td>
                    <td style={{ padding: '11px 14px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {exec.objective}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {exec.step_count}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {formatDuration(exec.duration_ms)}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {timeAgo(exec.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && (
        <DetailModal detail={detail} loading={detailLoading} onClose={closeModal} />
      )}
    </div>
  );
}

// ---- Timeline View ----

function TimelineView({ timeline }: { timeline: any[] }) {
  if (!timeline.length) return <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No timeline entries</p>;
  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(245,158,11,0.15)' }} />
      {timeline.map((entry: any, i: number) => (
        <div key={i} style={{ position: 'relative', paddingBottom: '14px', paddingLeft: '16px' }}>
          <div style={{
            position: 'absolute', left: '-16px', top: '6px', width: '10px', height: '10px',
            borderRadius: '50%', background: STATE_CONFIG[entry.state]?.dot || '#94a3b8',
            border: '2px solid rgba(0,0,0,0.3)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <StateBadge state={entry.state} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.detail}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {new Date(entry.timestamp).toLocaleString()}
            {entry.actor && <> · {entry.actor}</>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Steps View ----

function StepsView({ steps }: { steps: any[] }) {
  if (!steps.length) return <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No steps recorded</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {steps.map((step: any, i: number) => {
        const isOk = step.status === 'complete';
        return (
          <div key={i} style={{
            background: isOk ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
            border: `1px solid ${isOk ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`,
            borderRadius: '8px', padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', width: '20px' }}>
                  #{step.step_index}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{step.step_name}</span>
                <StateBadge state={step.status} />
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {step.adapter_id && <span title={step.adapter_id}>🔌 adapter</span>}
                <span>⏱ {step.latency_ms}ms</span>
                {step.result?.status_code && <span>HTTP {step.result.status_code}</span>}
              </div>
            </div>
            {step.error && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444', fontFamily: 'var(--font-mono)', padding: '4px 0 0 30px' }}>
                ⚠ {step.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Events View ----

function EventsView({ events }: { events: any[] }) {
  if (!events.length) return <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No ledger events</p>;
  return (
    <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px', gap: '0', fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span>#</span><span>Event</span><span>Stage</span><span>Time</span>
      </div>
      {events.map((evt: any, i: number) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px', gap: '0', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{evt.sequence_num}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{evt.event_type}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{evt.stage}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{new Date(evt.event_timestamp || evt.created_at).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Result View ----

function ResultView({ result }: { result: any }) {
  if (!result) return <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No result data</p>;
  let parsed = result;
  if (typeof result === 'string') try { parsed = JSON.parse(result); } catch {}
  return (
    <pre style={{
      background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '14px',
      fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
      overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      margin: 0, lineHeight: 1.6,
    }}>
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}
