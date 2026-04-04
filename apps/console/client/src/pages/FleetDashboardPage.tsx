/**
 * Fleet Dashboard — Bloomberg Terminal for AI Agents
 * 
 * Dense, real-time view of all agents under governance.
 * Dark theme, monospace numbers, maximum information density.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  fleetApi,
  type FleetOverview,
  type FleetAlert,
  type AgentDetail,
  type FleetAgent,
} from '../api/fleet.js';

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  bg: '#0a0a0f',
  card: '#12131a',
  cardHover: '#1a1b26',
  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(255,255,255,0.10)',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#7c3aed',
  cyan: '#06b6d4',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.green,
  idle: COLORS.yellow,
  suspended: COLORS.red,
  terminated: COLORS.textMuted,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: COLORS.blue,
  warning: COLORS.yellow,
  critical: COLORS.red,
};

const RESULT_COLORS: Record<string, string> = {
  executed: COLORS.green,
  approved: COLORS.green,
  denied: COLORS.yellow,
  failed: COLORS.red,
  timeout: COLORS.textMuted,
};

const TYPE_COLORS: Record<string, string> = {
  autonomous: COLORS.purple,
  'semi-autonomous': COLORS.blue,
  supervised: COLORS.cyan,
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" };
const REFRESH_MS = 15000;

// ============================================================================
// Utility
// ============================================================================

function relativeTime(ts: string | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return 'just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isStale(ts: string | null, thresholdMs = 300000): boolean {
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() > thresholdMs;
}

function trustColor(score: number): string {
  if (score > 70) return COLORS.green;
  if (score >= 40) return COLORS.yellow;
  return COLORS.red;
}

// ============================================================================
// Mini Sparkline (SVG)
// ============================================================================

function Sparkline({ data, width = 80, height = 20, color = COLORS.blue }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return <span style={{ ...MONO, color: COLORS.textMuted, fontSize: 11 }}>—</span>;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * (height - 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// Summary Card
// ============================================================================

function SummaryCard({ label, value, sub, color, sparkData }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  sparkData?: number[];
}) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      padding: '12px 16px',
      flex: '1 1 0',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color: color || COLORS.textPrimary, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ ...MONO, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{sub}</div>}
        </div>
        {sparkData && <Sparkline data={sparkData} color={color || COLORS.blue} />}
      </div>
    </div>
  );
}

// ============================================================================
// Trust Bar
// ============================================================================

function TrustBar({ score }: { score: number }) {
  const color = trustColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 60,
        height: 6,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 300ms ease',
        }} />
      </div>
      <span style={{ ...MONO, fontSize: 11, color, fontWeight: 600 }}>{score}</span>
    </div>
  );
}

// ============================================================================
// Status Dot
// ============================================================================

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || COLORS.textMuted;
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
    }} />
  );
}

// ============================================================================
// Badge
// ============================================================================

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      ...MONO,
      fontSize: 10,
      fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}33`,
      borderRadius: 3,
      padding: '1px 6px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {text}
    </span>
  );
}

// ============================================================================
// Agent Row Expanded Detail
// ============================================================================

function AgentExpandedDetail({ detail }: { detail: AgentDetail }) {
  const { metrics, recentActivity, alerts } = detail;
  const typeEntries = Object.entries(metrics.actionsByType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxType = typeEntries.length > 0 ? typeEntries[0][1] : 1;

  return (
    <tr>
      <td colSpan={11} style={{ padding: 0, border: 'none' }}>
        <div style={{
          background: '#161f2e',
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.5fr',
          gap: 20,
        }}>
          {/* Metrics */}
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                ['Actions/Day', metrics.actionsToday],
                ['Actions/Week', metrics.actionsThisWeek],
                ['Avg Latency', `${metrics.avgLatencyMs}ms`],
                ['Approval %', `${metrics.approvalRate}%`],
                ['Error %', `${metrics.errorRate}%`],
                ['Denied %', `${metrics.deniedRate}%`],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</span>
                  <span style={{ ...MONO, fontSize: 11, color: COLORS.textPrimary }}>{val}</span>
                </div>
              ))}
            </div>
            {/* Action type bars */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                Top Actions
              </div>
              {typeEntries.map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ ...MONO, fontSize: 10, color: COLORS.textSecondary, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {type}
                  </span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{ width: `${(count / maxType) * 100}%`, height: '100%', background: COLORS.blue, borderRadius: 2 }} />
                  </div>
                  <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted, width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts for this agent */}
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Active Alerts ({alerts.length})
            </div>
            {alerts.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>No active alerts</div>
            ) : (
              alerts.slice(0, 4).map(a => (
                <div key={a.id} style={{
                  background: COLORS.card,
                  border: `1px solid ${SEVERITY_COLORS[a.severity]}33`,
                  borderLeft: `3px solid ${SEVERITY_COLORS[a.severity]}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                  marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Badge text={a.severity} color={SEVERITY_COLORS[a.severity]} />
                    <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>{a.alert_type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.3 }}>{a.message}</div>
                </div>
              ))
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Recent Activity
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {recentActivity.map(act => (
                <div key={act.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <Badge text={act.result} color={RESULT_COLORS[act.result] || COLORS.textMuted} />
                  <span style={{ ...MONO, fontSize: 11, color: COLORS.textPrimary, flex: 1 }}>{act.action_type}</span>
                  {act.risk_tier && <Badge text={act.risk_tier} color={COLORS.textSecondary} />}
                  <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>{act.latency_ms}ms</span>
                  <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted, width: 55, textAlign: 'right' }}>
                    {relativeTime(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Agent Actions Dropdown
// ============================================================================

function AgentActions({ agent, onSuspend, onActivate, onAdjustTrust }: {
  agent: FleetAgent;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onAdjustTrust: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          background: 'none',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          color: COLORS.textSecondary,
          cursor: 'pointer',
          padding: '2px 6px',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            background: COLORS.card,
            border: `1px solid ${COLORS.borderActive}`,
            borderRadius: 6,
            padding: 4,
            zIndex: 100,
            minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {agent.status === 'suspended' ? (
            <DropdownItem label="⚡ Activate" onClick={() => { onActivate(agent.agent_id); setOpen(false); }} />
          ) : (
            <DropdownItem label="⏸ Suspend" onClick={() => { onSuspend(agent.agent_id); setOpen(false); }} color={COLORS.red} />
          )}
          <DropdownItem label="🎚 Adjust Trust" onClick={() => { onAdjustTrust(agent.agent_id); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function DropdownItem({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        color: color || COLORS.textSecondary,
        fontSize: 12,
        padding: '6px 10px',
        borderRadius: 4,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Alerts Panel
// ============================================================================

function AlertsPanel({ alerts, onResolve }: { alerts: FleetAlert[]; onResolve: (id: string) => void }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      padding: 16,
      maxHeight: 360,
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🚨 Alerts ({alerts.length})
        </div>
      </div>
      {alerts.length === 0 ? (
        <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', padding: 20 }}>All clear — no active alerts</div>
      ) : (
        alerts.map(a => (
          <div key={a.id} style={{
            borderLeft: `3px solid ${SEVERITY_COLORS[a.severity]}`,
            background: `${SEVERITY_COLORS[a.severity]}08`,
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge text={a.severity} color={SEVERITY_COLORS[a.severity]} />
                <span style={{ ...MONO, fontSize: 11, color: COLORS.textPrimary, fontWeight: 600 }}>
                  {a.agent_name || a.agent_id}
                </span>
                <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>{a.alert_type}</span>
              </div>
              <button
                onClick={() => onResolve(a.id)}
                style={{
                  background: 'none',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 3,
                  color: COLORS.textMuted,
                  fontSize: 10,
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.green; e.currentTarget.style.color = COLORS.green; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
              >
                Resolve
              </button>
            </div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.4 }}>{a.message}</div>
            <div style={{ ...MONO, fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>{relativeTime(a.created_at)}</div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================================
// Trust Adjust Modal
// ============================================================================

function TrustModal({ agentId, currentScore, onSubmit, onClose }: {
  agentId: string;
  currentScore: number;
  onSubmit: (score: number) => void;
  onClose: () => void;
}) {
  const [score, setScore] = useState(currentScore);
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.borderActive}`,
        borderRadius: 8,
        padding: 24,
        width: 320,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>Adjust Trust Score</div>
        <div style={{ ...MONO, fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>{agentId}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={e => setScore(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: trustColor(score) }}
          />
          <span style={{ ...MONO, fontSize: 18, fontWeight: 700, color: trustColor(score), width: 36, textAlign: 'right' }}>{score}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 4,
            color: COLORS.textSecondary, fontSize: 12, padding: '6px 14px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => onSubmit(score)} style={{
            background: COLORS.blue, border: 'none', borderRadius: 4,
            color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
          }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Fleet Dashboard Page
// ============================================================================

export function FleetDashboardPage() {
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [trustModal, setTrustModal] = useState<{ agentId: string; score: number } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  // P1: Search + filter + bulk actions
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [ov, al] = await Promise.all([
        fleetApi.getOverview(),
        fleetApi.getAlerts(),
      ]);
      setOverview(ov);
      setAlerts(al);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Load agent detail when expanded
  useEffect(() => {
    if (!expandedAgent) { setAgentDetail(null); return; }
    fleetApi.getAgent(expandedAgent).then(setAgentDetail).catch(() => setAgentDetail(null));
  }, [expandedAgent]);

  const handleSuspend = async (agentId: string) => {
    await fleetApi.suspend(agentId);
    fetchData();
  };

  const handleActivate = async (agentId: string) => {
    await fleetApi.activate(agentId);
    fetchData();
  };

  const handleTrustSubmit = async (score: number) => {
    if (trustModal) {
      await fleetApi.adjustTrust(trustModal.agentId, score);
      setTrustModal(null);
      fetchData();
    }
  };

  const handleResolveAlert = async (id: string) => {
    await fleetApi.resolveAlert(id);
    fetchData();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: COLORS.textMuted }}>
        <div style={{ ...MONO, fontSize: 14 }}>Loading fleet data...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: COLORS.red, marginBottom: 8 }}>⚠ {error || 'No data'}</div>
          <button onClick={fetchData} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 4,
            color: COLORS.textSecondary, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          }}>Retry</button>
        </div>
      </div>
    );
  }

  const { agents: allAgents, summary } = overview;

  // P1: Filter agents by search + status
  const agents = allAgents.filter(a => {
    if (searchQuery && !a.display_name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.agent_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  // P1: Bulk action handlers
  const toggleSelect = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedAgents.size === agents.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agents.map(a => a.agent_id)));
    }
  };
  const handleBulkSuspend = async () => {
    if (!confirm(`Suspend ${selectedAgents.size} agents?`)) return;
    for (const id of selectedAgents) await fleetApi.suspend(id);
    setSelectedAgents(new Set());
    fetchData();
  };
  const handleBulkActivate = async () => {
    if (!confirm(`Activate ${selectedAgents.size} agents?`)) return;
    for (const id of selectedAgents) await fleetApi.activate(id);
    setSelectedAgents(new Set());
    fetchData();
  };

  // Generate sparkline data from trend
  const trendCounts = summary.trendData.map(t => t.count);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
            Agent Fleet
          </h1>
          <div style={{ ...MONO, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
            Governance Dashboard — {summary.totalAgents} agents registered
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>
            Updated {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchData}
            style={{
              background: 'none',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.textSecondary,
              padding: '4px 10px',
              fontSize: 11,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard
          label="Active Agents"
          value={summary.activeAgents}
          sub={`${summary.totalAgents} total`}
          color={COLORS.green}
        />
        <SummaryCard
          label="Actions Today"
          value={summary.actionsToday}
          sub={`${summary.actionsThisHour}/hr`}
          color={COLORS.blue}
          sparkData={trendCounts}
        />
        <SummaryCard
          label="Avg Latency"
          value={`${summary.avgLatencyMs}ms`}
          color={summary.avgLatencyMs > 1000 ? COLORS.yellow : COLORS.textPrimary}
        />
        <SummaryCard
          label="Violations"
          value={summary.violationsCount}
          color={summary.violationsCount > 0 ? COLORS.red : COLORS.green}
        />
        <SummaryCard
          label="Alerts"
          value={summary.unresolvedAlerts}
          color={summary.unresolvedAlerts > 0 ? COLORS.yellow : COLORS.green}
        />
      </div>

      {/* P1: Search + Filter Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px', fontSize: 12, borderRadius: 4,
            border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.04)',
            color: COLORS.textPrimary, width: 200, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: 2 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: '🟢 Active' },
            { key: 'idle', label: '🟡 Idle' },
            { key: 'suspended', label: '🔴 Suspended' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: '4px 10px', fontSize: 11, borderRadius: 3, border: 'none', cursor: 'pointer',
                fontWeight: statusFilter === f.key ? 600 : 400,
                background: statusFilter === f.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: statusFilter === f.key ? COLORS.textPrimary : COLORS.textMuted,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {(searchQuery || statusFilter !== 'all') && (
          <span style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>
            {agents.length} of {allAgents.length}
          </span>
        )}
      </div>

      {/* P1: Bulk Action Bar */}
      {selectedAgents.size > 0 && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12,
          padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: 6,
          border: `1px solid rgba(59,130,246,0.15)`,
        }}>
          <span style={{ fontSize: 12, color: COLORS.blue, fontWeight: 600 }}>
            {selectedAgents.size} selected
          </span>
          <button onClick={handleBulkActivate} style={{
            padding: '4px 10px', fontSize: 11, borderRadius: 4, border: `1px solid rgba(16,185,129,0.3)`,
            background: 'rgba(16,185,129,0.1)', color: COLORS.green, cursor: 'pointer', fontWeight: 500,
          }}>
            ⚡ Activate All
          </button>
          <button onClick={handleBulkSuspend} style={{
            padding: '4px 10px', fontSize: 11, borderRadius: 4, border: `1px solid rgba(239,68,68,0.3)`,
            background: 'rgba(239,68,68,0.1)', color: COLORS.red, cursor: 'pointer', fontWeight: 500,
          }}>
            ⏸ Suspend All
          </button>
          <button onClick={() => setSelectedAgents(new Set())} style={{
            padding: '4px 10px', fontSize: 11, borderRadius: 4, border: `1px solid ${COLORS.border}`,
            background: 'transparent', color: COLORS.textMuted, cursor: 'pointer',
          }}>
            Clear
          </button>
        </div>
      )}

      {/* Main Grid: Agent Table + Alerts */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 340px' : '1fr', 
        gap: 16 
      }}>
        {/* Agent Table */}
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>

                <th style={{ padding: '10px 10px', width: 28 }}>
                  <input
                    type="checkbox"
                    checked={agents.length > 0 && selectedAgents.size === agents.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: COLORS.blue }}
                  />
                </th>
                {['', 'Agent', 'Type', 'Trust', 'Actions', 'Latency', 'Errors', 'Alerts', 'Last Seen', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left',
                    padding: '10px 10px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    ...(i === 0 ? { width: 24 } : {}),
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: COLORS.textMuted,
                  }}>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>No agents registered</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                      Agents will appear here once they connect to Vienna OS
                    </div>
                  </td>
                </tr>
              ) : (
                agents.map(agent => {
                const isExpanded = expandedAgent === agent.agent_id;
                const stale = isStale(agent.last_heartbeat);

                return (
                  <React.Fragment key={agent.agent_id}>
                    <tr
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.agent_id)}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                        cursor: 'pointer',
                        background: isExpanded ? '#161f2e' : 'transparent',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = COLORS.cardHover; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAgents.has(agent.agent_id)}
                          onChange={() => toggleSelect(agent.agent_id)}
                          style={{ cursor: 'pointer', accentColor: COLORS.blue }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <StatusDot status={agent.status} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                          {agent.display_name}
                        </div>
                        <div style={{ ...MONO, fontSize: 10, color: COLORS.textMuted }}>{agent.agent_id}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <Badge text={agent.agent_type} color={TYPE_COLORS[agent.agent_type] || COLORS.textMuted} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <TrustBar score={agent.trust_score} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ ...MONO, fontSize: 12, color: COLORS.textPrimary }}>{agent.actions_today}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ ...MONO, fontSize: 12, color: agent.avg_latency_ms > 1000 ? COLORS.yellow : COLORS.textSecondary }}>
                          {agent.avg_latency_ms}ms
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ ...MONO, fontSize: 12, color: agent.error_rate > 10 ? COLORS.red : COLORS.textSecondary }}>
                          {agent.error_rate}%
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {agent.unresolved_alerts > 0 ? (
                          <span style={{ ...MONO, fontSize: 12, color: COLORS.yellow, fontWeight: 700 }}>
                            {agent.unresolved_alerts}
                          </span>
                        ) : (
                          <span style={{ ...MONO, fontSize: 12, color: COLORS.textMuted }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ ...MONO, fontSize: 11, color: stale ? COLORS.red : COLORS.textMuted }}>
                          {relativeTime(agent.last_heartbeat)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <AgentActions
                          agent={agent}
                          onSuspend={handleSuspend}
                          onActivate={handleActivate}
                          onAdjustTrust={(id) => setTrustModal({ agentId: id, score: agent.trust_score })}
                        />
                      </td>
                    </tr>
                    {isExpanded && agentDetail && (
                      <AgentExpandedDetail detail={agentDetail} />
                    )}
                  </React.Fragment>
                );
              })
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Alerts Panel */}
        <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} />
      </div>

      {/* Agents Needing Attention */}
      {summary.agentsNeedingAttention.length > 0 && (
        <div style={{
          marginTop: 16,
          background: COLORS.card,
          border: `1px solid ${COLORS.red}33`,
          borderRadius: 6,
          padding: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            ⚠ Agents Needing Attention
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {summary.agentsNeedingAttention.map(a => (
              <div key={a.agent_id} style={{
                background: 'rgba(248,113,113,0.06)',
                border: `1px solid ${COLORS.red}22`,
                borderRadius: 4,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ ...MONO, fontSize: 12, color: COLORS.textPrimary, fontWeight: 600 }}>{a.display_name}</span>
                <span style={{ fontSize: 11, color: COLORS.red }}>{a.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Modal */}
      {trustModal && (
        <TrustModal
          agentId={trustModal.agentId}
          currentScore={trustModal.score}
          onSubmit={handleTrustSubmit}
          onClose={() => setTrustModal(null)}
        />
      )}
    </div>
  );
}
