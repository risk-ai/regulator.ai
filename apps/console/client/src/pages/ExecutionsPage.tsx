/**
 * Executions Page — Phase 5
 * 
 * Execution monitoring: list + detail views with full lifecycle visibility.
 * Dark theme, consistent with Vienna OS console design system.
 */

import React, { useState, useEffect, useCallback } from 'react';

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

const TIER_COLORS: Record<string, string> = { T0: '#94a3b8', T1: '#f59e0b', T2: '#ef4444', T3: '#dc2626' };

// ---- Components ----

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

function StatCard({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: string }) {
  return (
    <div style={{
      background: 'var(--bg-primary)', borderRadius: '10px', padding: '18px 20px',
      borderLeft: `3px solid ${color}`, flex: '1 1 0', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </div>
        </div>
        <span style={{ fontSize: '22px', opacity: 0.5 }}>{icon}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        No executions yet
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
        Executions appear here when intents are submitted through the governance pipeline.
        Configure an action type with execution steps, then submit an intent to see it in action.
      </p>
      <div style={{
        marginTop: '20px', padding: '12px 16px', background: 'rgba(124,58,237,0.06)',
        borderRadius: '8px', display: 'inline-block', fontSize: '12px', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)',
      }}>
        Intent → Policy → Warrant → Execute → Verify → Complete
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-block', width: '24px', height: '24px',
        border: '2px solid var(--border-subtle)', borderTop: '2px solid #7c3aed',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>Loading executions...</p>
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

// ---- Main Page ----

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?state=${filter}` : '';
      const [execRes, statsRes] = await Promise.all([
        fetch(`/api/v1/executions${params}`, { credentials: 'include' }),
        fetch('/api/v1/executions/stats', { credentials: 'include' }),
      ]);
      const execData = await execRes.json();
      const statsData = await statsRes.json();
      if (execData.success) setExecutions(execData.data || []);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, [fetchData]);

  const loadDetail = async (id: string) => {
    if (selected === id) { setSelected(null); setDetail(null); return; }
    setSelected(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/executions/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setDetail(data.data);
    } catch (err) { console.error(err); } finally { setDetailLoading(false); }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'executing', label: '⏳ Active' },
    { key: 'complete', label: '✓ Complete' },
    { key: 'failed', label: '✗ Failed' },
    { key: 'planned', label: '○ Planned' },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Executions
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Managed execution pipeline — real-time lifecycle monitoring
          </p>
        </div>
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

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <StatCard value={Number(stats.total_executions)} label="Total" color="#818cf8" icon="📊" />
          <StatCard value={Number(stats.completed)} label="Completed" color="#10b981" icon="✅" />
          <StatCard value={Number(stats.failed)} label="Failed" color="#ef4444" icon="❌" />
          <StatCard value={Number(stats.executing)} label="In Progress" color="#f59e0b" icon="⏳" />
          <StatCard value={formatDuration(stats.avg_latency_ms)} label="Avg Duration" color="#06b6d4" icon="⚡" />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: 'fit-content' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 16px', fontSize: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: filter === f.key ? 600 : 400,
              color: filter === f.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: filter === f.key ? 'rgba(255,255,255,0.08)' : 'transparent',
              fontFamily: 'var(--font-sans)', transition: 'all 150ms',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {loading ? <LoadingSpinner /> : executions.length === 0 ? <EmptyState /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
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
              {executions.map(exec => {
                const isSelected = selected === exec.execution_id;
                return (
                  <React.Fragment key={exec.execution_id}>
                    <tr
                      onClick={() => loadDetail(exec.execution_id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(124,58,237,0.05)' : 'transparent',
                        borderBottom: isSelected ? 'none' : '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {exec.execution_id.slice(0, 16)}…
                      </td>
                      <td style={{ padding: '11px 14px' }}><StateBadge state={exec.state} /></td>
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

                    {/* Inline detail panel */}
                    {isSelected && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                          <DetailPanel detail={detail} loading={detailLoading} onClose={() => { setSelected(null); setDetail(null); }} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Detail Panel ----

function DetailPanel({ detail, loading, onClose }: { detail: ExecutionDetail | null; loading: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'steps' | 'events' | 'result'>('timeline');

  if (loading) return (
    <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid var(--border-subtle)', borderTop: '2px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!detail) return null;

  const tabs = [
    { key: 'timeline' as const, label: 'Timeline', count: (detail.timeline || []).length },
    { key: 'steps' as const, label: 'Steps', count: (detail.detailed_steps || []).length },
    { key: 'events' as const, label: 'Events', count: (detail.ledger_events || []).length },
    { key: 'result' as const, label: 'Result', count: detail.result ? 1 : 0 },
  ];

  return (
    <div style={{ background: 'rgba(0,0,0,0.12)', borderTop: '1px solid rgba(124,58,237,0.15)' }}>
      {/* Detail header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StateBadge state={detail.state} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{detail.objective}</span>
          <TierBadge tier={detail.risk_tier} />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {detail.execution_mode}
            {detail.warrant_id && ` · warrant:${detail.warrant_id.slice(0, 8)}`}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px', padding: '4px 8px' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 14px', fontSize: '12px', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              borderBottom: activeTab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {t.label} {t.count > 0 && <span style={{ fontSize: '10px', opacity: 0.6 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 20px', maxHeight: '400px', overflowY: 'auto' }}>
        {activeTab === 'timeline' && <TimelineView timeline={detail.timeline || []} />}
        {activeTab === 'steps' && <StepsView steps={detail.detailed_steps || []} />}
        {activeTab === 'events' && <EventsView events={detail.ledger_events || []} />}
        {activeTab === 'result' && <ResultView result={detail.result} />}
      </div>
    </div>
  );
}

// ---- Timeline View ----

function TimelineView({ timeline }: { timeline: any[] }) {
  if (!timeline.length) return <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No timeline entries</p>;
  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      {/* Vertical line */}
      <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(124,58,237,0.15)' }} />
      {timeline.map((entry: any, i: number) => (
        <div key={i} style={{ position: 'relative', paddingBottom: '14px', paddingLeft: '16px' }}>
          {/* Dot */}
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
            {step.action?.url && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', padding: '0 0 0 30px' }}>
                {step.action.method || step.action.type} → {step.action.url}
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
      overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      margin: 0, lineHeight: 1.6,
    }}>
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}
