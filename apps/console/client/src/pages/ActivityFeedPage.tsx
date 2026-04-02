/**
 * Activity Feed — Vienna OS
 * 
 * Dark, premium operational feed. Two-column control-plane surface.
 * Layout: Header → KPI strip → Time filter → [Left: Feed + Agents | Right: Breakdown + Agents]
 */

import React, { useState, useEffect, useCallback } from 'react';

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

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  failed: '#ef4444',
  pending: '#f59e0b',
  pending_approval: '#f59e0b',
};

const STATUS_BG: Record<string, string> = {
  completed: 'rgba(16, 185, 129, 0.12)',
  failed: 'rgba(239, 68, 68, 0.12)',
  pending: 'rgba(245, 158, 11, 0.12)',
  pending_approval: 'rgba(245, 158, 11, 0.12)',
};

const AGENT_ICONS = ['🤖', '⚡', '🔒', '📊', '🛡️', '🔧', '📡', '🎯', '🧠', '💎'];

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function DonutChart({ completed, failed, pending }: { completed: number; failed: number; pending: number }) {
  const total = completed + failed + pending || 1;
  const r = 70, cx = 90, cy = 90, stroke = 14;
  const circumference = 2 * Math.PI * r;

  const completedPct = completed / total;
  const failedPct = failed / total;
  const pendingPct = pending / total;

  const completedLen = completedPct * circumference;
  const failedLen = failedPct * circumference;
  const pendingLen = pendingPct * circumference;

  const completedOffset = 0;
  const failedOffset = -(completedLen);
  const pendingOffset = -(completedLen + failedLen);

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* Completed arc */}
      {completed > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={`${completedLen} ${circumference - completedLen}`}
          strokeDashoffset={completedOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      )}
      {/* Failed arc */}
      {failed > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke}
          strokeDasharray={`${failedLen} ${circumference - failedLen}`}
          strokeDashoffset={failedOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      )}
      {/* Pending arc */}
      {pending > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={stroke}
          strokeDasharray={`${pendingLen} ${circumference - pendingLen}`}
          strokeDashoffset={pendingOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      )}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#10b981" fontSize="28" fontWeight="700"
        fontFamily="var(--font-mono, monospace)">{completed}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11"
        fontFamily="var(--font-mono, monospace)" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</text>
    </svg>
  );
}

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
    } catch (e) {
      console.error('Activity fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const completed = summary?.actions_by_status?.completed || 0;
  const failed = summary?.actions_by_status?.failed || 0;
  const pending = (summary?.actions_by_status?.pending || 0) + (summary?.actions_by_status?.pending_approval || 0);
  const total = summary?.total_actions || 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const S = {
    page: {
      padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto',
    } as React.CSSProperties,
    // Header
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '24px 0 20px',
    } as React.CSSProperties,
    title: {
      fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', margin: 0, lineHeight: 1.3,
    } as React.CSSProperties,
    subtitle: {
      fontSize: 13, color: 'var(--text-tertiary, rgba(255,255,255,0.45))', marginTop: 4,
    } as React.CSSProperties,
    headerRight: {
      display: 'flex', alignItems: 'center', gap: 12,
    } as React.CSSProperties,
    timestamp: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
      fontFamily: 'var(--font-mono, monospace)',
    } as React.CSSProperties,
    refreshBtn: {
      fontSize: 12, padding: '6px 14px', borderRadius: 6,
      background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary, rgba(255,255,255,0.7))',
      border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    } as React.CSSProperties,
    // KPI strip
    kpiRow: {
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16,
    } as React.CSSProperties,
    kpiCard: (accent: string) => ({
      background: 'var(--surface-secondary, #12131a)', borderRadius: 8,
      padding: '16px 18px', borderLeft: `3px solid ${accent}`,
    }) as React.CSSProperties,
    kpiLabel: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.45))',
      textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 6,
      fontFamily: 'var(--font-mono, monospace)',
    } as React.CSSProperties,
    kpiValue: (color: string) => ({
      fontSize: 26, fontWeight: 700, color, lineHeight: 1,
      fontFamily: 'var(--font-mono, monospace)',
    }) as React.CSSProperties,
    kpiSub: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))', marginTop: 4,
    } as React.CSSProperties,
    // Time filter
    filterRow: {
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
    } as React.CSSProperties,
    filterLabel: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
      fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' as const,
      letterSpacing: '0.04em', marginRight: 4,
    } as React.CSSProperties,
    filterBtn: (active: boolean) => ({
      fontSize: 12, padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
      fontFamily: 'var(--font-mono, monospace)', fontWeight: active ? 600 : 400,
      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      color: active ? 'var(--text-primary, #e2e8f0)' : 'var(--text-tertiary, rgba(255,255,255,0.5))',
      border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.15s ease',
    }) as React.CSSProperties,
    // Main two-column
    columns: {
      display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start',
    } as React.CSSProperties,
    // Panel
    panel: {
      background: 'var(--surface-secondary, #12131a)', borderRadius: 10, overflow: 'hidden',
    } as React.CSSProperties,
    panelHeader: {
      padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    } as React.CSSProperties,
    panelTitle: {
      fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)',
    } as React.CSSProperties,
    panelAction: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))', cursor: 'pointer',
      fontFamily: 'var(--font-mono, monospace)',
    } as React.CSSProperties,
    // Event row
    eventRow: {
      padding: '12px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.1s ease', cursor: 'default',
    } as React.CSSProperties,
    eventAvatar: {
      width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 14, flexShrink: 0,
      background: 'rgba(255,255,255,0.06)',
    } as React.CSSProperties,
    eventBody: { flex: 1, minWidth: 0 } as React.CSSProperties,
    eventTopLine: {
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const,
    } as React.CSSProperties,
    eventActor: {
      fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)',
    } as React.CSSProperties,
    badge: (status: string) => ({
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      color: STATUS_COLORS[status] || '#94a3b8',
      background: STATUS_BG[status] || 'rgba(255,255,255,0.06)',
      textTransform: 'uppercase' as const, letterSpacing: '0.03em',
      fontFamily: 'var(--font-mono, monospace)',
    }) as React.CSSProperties,
    eventTime: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.35))',
      fontFamily: 'var(--font-mono, monospace)',
    } as React.CSSProperties,
    eventAction: {
      fontSize: 12, color: 'var(--text-secondary, rgba(255,255,255,0.6))', marginTop: 2,
    } as React.CSSProperties,
    viewLink: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
      fontFamily: 'var(--font-mono, monospace)', cursor: 'pointer',
      flexShrink: 0, alignSelf: 'center',
      textDecoration: 'none',
    } as React.CSSProperties,
    // Agent row
    agentRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    } as React.CSSProperties,
    agentLeft: {
      display: 'flex', alignItems: 'center', gap: 10,
    } as React.CSSProperties,
    agentRank: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.35))',
      fontFamily: 'var(--font-mono, monospace)', width: 20, textAlign: 'right' as const,
    } as React.CSSProperties,
    agentIcon: {
      width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, background: 'rgba(255,255,255,0.06)',
    } as React.CSSProperties,
    agentName: {
      fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #e2e8f0)',
    } as React.CSSProperties,
    agentActions: {
      fontSize: 11, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
      fontFamily: 'var(--font-mono, monospace)', cursor: 'pointer',
    } as React.CSSProperties,
    // Donut panel
    donutCenter: {
      display: 'flex', justifyContent: 'center', padding: '20px 0 10px',
    } as React.CSSProperties,
    legendRow: {
      display: 'flex', justifyContent: 'center', gap: 16, padding: '0 18px 14px', flexWrap: 'wrap' as const,
    } as React.CSSProperties,
    legendItem: (color: string) => ({
      display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
      color: 'var(--text-secondary, rgba(255,255,255,0.6))',
      fontFamily: 'var(--font-mono, monospace)',
    }) as React.CSSProperties,
    legendDot: (color: string) => ({
      width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
    }) as React.CSSProperties,
    // Compact agent panel (right column)
    compactAgentRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    } as React.CSSProperties,
    // Spinner
    spinner: {
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0',
      color: 'var(--text-tertiary, rgba(255,255,255,0.4))', fontSize: 13,
    } as React.CSSProperties,
    empty: {
      padding: '40px 18px', textAlign: 'center' as const,
      color: 'var(--text-tertiary, rgba(255,255,255,0.35))', fontSize: 13,
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* ── Row 1: Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Activity Feed</h1>
          <div style={S.subtitle}>Real-time view of all agent activity in your organization</div>
        </div>
        <div style={S.headerRight}>
          <span style={S.timestamp}>
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
          <button style={S.refreshBtn} onClick={() => { setLoading(true); fetchAll(); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Row 2: KPI Strip ── */}
      <div style={S.kpiRow}>
        <div style={S.kpiCard('#6366f1')}>
          <div style={S.kpiLabel}>Total Actions</div>
          <div style={S.kpiValue('#818cf8')}>{total}</div>
          <div style={S.kpiSub}>Last {period}</div>
        </div>
        <div style={S.kpiCard('#10b981')}>
          <div style={S.kpiLabel}>Completed</div>
          <div style={S.kpiValue('#10b981')}>{completed}</div>
          <div style={S.kpiSub}>{successRate}% success rate</div>
        </div>
        <div style={S.kpiCard('#ef4444')}>
          <div style={S.kpiLabel}>Failed</div>
          <div style={S.kpiValue('#ef4444')}>{failed}</div>
        </div>
        <div style={S.kpiCard('#f59e0b')}>
          <div style={S.kpiLabel}>Pending</div>
          <div style={S.kpiValue('#f59e0b')}>{pending}</div>
        </div>
      </div>

      {/* ── Row 3: Time Filter ── */}
      <div style={S.filterRow}>
        <span style={S.filterLabel}>Time period:</span>
        {['1h', '24h', '7d', '30d'].map((p) => (
          <button key={p} style={S.filterBtn(period === p)} onClick={() => setPeriod(p)}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Row 4: Two-Column Content ── */}
      <div style={S.columns}>
        {/* ═══ Left Column (primary) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Activity */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={S.panelTitle}>Recent Activity</span>
              <span style={S.panelAction}>{events.length} events</span>
            </div>
            {loading ? (
              <div style={S.spinner}>Loading activity…</div>
            ) : events.length === 0 ? (
              <div style={S.empty}>No recent activity</div>
            ) : (
              events.slice(0, 12).map((ev) => (
                <div key={ev.id} style={S.eventRow}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={S.eventAvatar}>
                    {(ev.agent?.display_name || '?')[0].toUpperCase()}
                  </div>
                  <div style={S.eventBody}>
                    <div style={S.eventTopLine}>
                      <span style={S.eventActor}>{ev.agent?.display_name || 'Unknown Agent'}</span>
                      <span style={S.badge(ev.execution?.status || 'completed')}>
                        {ev.execution?.status || 'completed'}
                      </span>
                      <span style={S.eventTime}>{formatTimestamp(ev.timestamp)}</span>
                    </div>
                    <div style={S.eventAction}>{ev.type || ev.execution?.objective || '—'}</div>
                  </div>
                  <span style={S.viewLink}>View →</span>
                </div>
              ))
            )}
          </div>

          {/* Top Agents (left, wider) */}
          {summary && summary.top_agents.length > 0 && (
            <div style={S.panel}>
              <div style={S.panelHeader}>
                <span style={S.panelTitle}>Top Agents</span>
                <span style={S.panelAction}>Actions →</span>
              </div>
              {summary.top_agents.slice(0, 5).map((agent, i) => (
                <div key={agent.agent_id} style={S.agentRow}>
                  <div style={S.agentLeft}>
                    <span style={S.agentRank}>#{i + 1}</span>
                    <span style={S.agentName}>{agent.agent_id}</span>
                  </div>
                  <span style={S.agentActions}>{agent.count} actions →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Right Column (secondary) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event Breakdown */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={{ ...S.panelTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                Event Breakdown
              </span>
            </div>
            <div style={S.donutCenter}>
              <DonutChart completed={completed} failed={failed} pending={pending} />
            </div>
            <div style={S.legendRow}>
              <div style={S.legendItem('#10b981')}>
                <span style={S.legendDot('#10b981')} /> {completed} Completed
              </div>
              <div style={S.legendItem('#ef4444')}>
                <span style={S.legendDot('#ef4444')} /> {failed} Failed
              </div>
              <div style={S.legendItem('#f59e0b')}>
                <span style={S.legendDot('#f59e0b')} /> {pending} Pending
              </div>
            </div>
            {/* Link to top agents */}
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{
                padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
                fontFamily: 'var(--font-mono, monospace)', cursor: 'pointer',
              }}>
                Top Agents →
              </div>
            </div>
          </div>

          {/* Compact Top Agents (right) */}
          {summary && summary.top_agents.length > 0 && (
            <div style={S.panel}>
              <div style={S.panelHeader}>
                <span style={S.panelTitle}>Top Agents</span>
              </div>
              {summary.top_agents.slice(0, 5).map((agent, i) => (
                <div key={agent.agent_id} style={S.compactAgentRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={S.agentRank}>#{i + 1}</span>
                    <div style={{
                      width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, background: 'rgba(255,255,255,0.06)',
                    }}>
                      {AGENT_ICONS[i % AGENT_ICONS.length]}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary, #e2e8f0)' }}>
                      {agent.agent_id}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary, rgba(255,255,255,0.4))',
                    fontFamily: 'var(--font-mono, monospace)' }}>
                    actions ›
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
