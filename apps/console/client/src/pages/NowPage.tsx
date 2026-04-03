/**
 * Now Page — Vienna OS
 * 
 * 3-zone operational command surface:
 *   Zone 1: Command header (title + live state)
 *   Zone 2: Operational summary (attention + metrics)
 *   Zone 3: Activity (live events + recent audit)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useEventStream, type PipelineEvent } from '../hooks/useEventStream.js';

interface SystemSnapshot {
  agents: { total: number; active: number; suspended: number };
  proposals: { total: number; pending: number; approved: number; denied: number };
  warrants: { total: number; active: number; revoked: number; expired: number };
  audit: { total: number; recent: AuditEntry[] };
  policies: { total: number; enabled: number };
  policyRules: { total: number; enabled: number };
  anomalies: { total: number; critical: number; high: number; recent: AnomalyAlert[] };
}

interface AnomalyAlert {
  id: string;
  type: 'rate_spike' | 'scope_violation' | 'unusual_pattern' | 'repeated_denial' | 'off_hours';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agent_id: string;
  description: string;
  detected_at: string;
}

interface AuditEntry {
  id: string;
  event: string;
  action?: string;
  actor: string;
  risk_tier: number;
  details: any;
  created_at: string;
  proposal_id?: string;
  warrant_id?: string;
}

async function fetchJSON(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
}

export function NowPage() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { connected, events: liveEvents } = useEventStream({ enabled: true, maxEvents: 20 });

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      const [agentsRes, proposalsRes, warrantsRes, auditRes, policiesRes, rulesRes, anomaliesRes] = await Promise.all([
        fetchJSON('/api/v1/agents'),
        fetchJSON('/api/v1/proposals'),
        fetchJSON('/api/v1/warrants'),
        fetchJSON('/api/v1/audit/recent?limit=10'),
        fetchJSON('/api/v1/policies'),
        fetchJSON('/api/v1/policy-rules'),
        fetchJSON('/api/v1/anomalies?limit=5'),
      ]);

      const agents = agentsRes.data || [];
      const proposals = proposalsRes.data || [];
      const warrants = warrantsRes.data || [];
      const auditEntries = auditRes.data?.entries || [];
      const auditTotal = auditRes.data?.total || auditEntries.length;
      const policies = policiesRes.data || [];
      const rules = rulesRes.data || [];
      const anomalies = anomaliesRes.data || [];

      setSnapshot({
        agents: { total: agents.length, active: agents.filter((a: any) => a.status === 'active').length, suspended: agents.filter((a: any) => a.status === 'suspended').length },
        proposals: { total: proposals.length, pending: proposals.filter((p: any) => p.state === 'pending').length, approved: proposals.filter((p: any) => p.state === 'approved' || p.state === 'warranted').length, denied: proposals.filter((p: any) => p.state === 'denied').length },
        warrants: { total: warrants.length, active: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) > new Date()).length, revoked: warrants.filter((w: any) => w.revoked).length, expired: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) <= new Date()).length },
        audit: { total: auditTotal, recent: auditEntries },
        policies: { total: policies.length, enabled: policies.filter((p: any) => p.enabled).length },
        policyRules: { total: rules.length, enabled: rules.filter((r: any) => r.enabled).length },
        anomalies: { 
          total: anomalies.length, 
          critical: anomalies.filter((a: any) => a.severity === 'critical').length,
          high: anomalies.filter((a: any) => a.severity === 'high').length,
          recent: anomalies.slice(0, 5) 
        },
      });
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSnapshot(); const i = setInterval(loadSnapshot, 30000); return () => clearInterval(i); }, [loadSnapshot]);
  useEffect(() => { if (liveEvents.length > 0) loadSnapshot(); }, [liveEvents.length]);

  const nav = (s: string) => { window.location.hash = s; };

  if (!snapshot && loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ height: 24, width: 200, background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 14, width: 140, background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 80, background: 'var(--bg-secondary)', borderRadius: i === 0 ? '8px 0 0 8px' : i === 5 ? '0 8px 8px 0' : 0 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

      {/* ═══ ZONE 1: Command Header ═══ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              System Posture
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              Operational overview
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadSnapshot(); }}
            style={{
              padding: '6px 12px', fontSize: 12, color: 'var(--text-tertiary)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            ↻ {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        {/* Live state row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? '#10b981' : error ? '#ef4444' : '#f59e0b',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              {connected ? 'Streaming' : 'Polling'}
            </span>
          </div>
          {connected && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 3,
              background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              fontFamily: 'var(--font-mono)', fontWeight: 500, letterSpacing: '0.05em',
            }}>
              SSE LIVE
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 24, fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {snapshot && (<>

        {/* ═══ ZONE 2: Operational Summary ═══ */}

        {/* Attention banner */}
        {snapshot.proposals.pending > 0 && (
          <div
            onClick={() => nav('approvals')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', marginBottom: 20,
              background: 'rgba(245, 158, 11, 0.04)',
              borderRadius: 6, cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.04)'; }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#f59e0b' }}>
              {snapshot.proposals.pending} proposal{snapshot.proposals.pending !== 1 ? 's' : ''} awaiting approval
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>→</span>
          </div>
        )}

        {/* Metric band — one cohesive row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1,
          background: 'var(--border-subtle)', borderRadius: 8,
          overflow: 'hidden', marginBottom: 32,
        }}>
          <Metric label="Agents" value={snapshot.agents.active} detail={`/${snapshot.agents.total}`} onClick={() => nav('fleet')} />
          <Metric label="Proposals" value={snapshot.proposals.total} detail={snapshot.proposals.pending > 0 ? `${snapshot.proposals.pending} pending` : undefined} onClick={() => nav('intent')} />
          <Metric label="Warrants" value={snapshot.warrants.total} detail={snapshot.warrants.active > 0 ? `${snapshot.warrants.active} active` : undefined} onClick={() => nav('approvals')} />
          <Metric label="Policies" value={snapshot.policies.enabled} detail={`/${snapshot.policies.total}`} onClick={() => nav('policies')} />
          <Metric label="Rules" value={snapshot.policyRules.enabled} detail={`/${snapshot.policyRules.total}`} onClick={() => nav('policy-templates')} />
          <Metric label="Audit Events" value={snapshot.audit.total} onClick={() => nav('history')} />
        </div>

        {/* ═══ ZONE 3: Two-column activity layout ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT: Live Governance Stream */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#10b981' : 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                Live Governance
              </span>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, overflow: 'hidden' }}>
              {liveEvents.length > 0 ? (
                liveEvents.slice(0, 8).map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px',
                    borderBottom: i < Math.min(liveEvents.length, 8) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: (ev.event || '').includes('denied') ? '#ef4444' : (ev.event || '').includes('verified') ? '#10b981' : '#3b82f6',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', flex: 1, minWidth: 0 }}>
                      {(ev.event || 'unknown').replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      T{ev.risk_tier ?? 0}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {ev.actor || 'system'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  Waiting for governance events…
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Recent Activity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                Recent Activity
              </span>
              <span
                onClick={() => nav('history')}
                style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                View all →
              </span>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, overflow: 'hidden' }}>
              {(snapshot.audit.recent.length === 0 && snapshot.agents.total === 0 && snapshot.proposals.total === 0 && snapshot.warrants.total === 0) ? (
                <GettingStartedPanel />
              ) : snapshot.audit.recent.length === 0 ? (
                <div style={{ padding: '24px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>No recent events</div>
                  <span
                    onClick={() => nav('intent')}
                    style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                  >
                    Submit intent →
                  </span>
                </div>
              ) : (
                snapshot.audit.recent.slice(0, 6).map((entry, i) => {
                  const name = entry.event || entry.action || 'unknown';
                  const colors: Record<string, string> = {
                    warrant_issued: '#f59e0b', execution_verified: '#10b981', execution_denied: '#ef4444',
                    proposal_pending: '#3b82f6', proposal_denied: '#ef4444', warrant_revoked: '#f59e0b',
                  };
                  const color = colors[name] || 'var(--text-tertiary)';
                  return (
                    <div key={entry.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px',
                      borderBottom: i < Math.min(snapshot.audit.recent.length, 6) - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {name.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </>)}
    </div>
  );
}

/* ─── Getting Started Panel (shown when no real activity) ─── */
function GettingStartedPanel() {
  const demoEvents = [
    { event: 'wire_transfer_approved', actor: 'finance-agent', tier: 2, time: '2 min ago', color: '#10b981' },
    { event: 'production_deploy_check', actor: 'devops-bot', tier: 1, time: '5 min ago', color: '#3b82f6' },
    { event: 'policy_violation_denied', actor: 'rogue-agent', tier: 0, time: '12 min ago', color: '#ef4444' },
    { event: 'hipaa_access_warranted', actor: 'health-ai', tier: 1, time: '18 min ago', color: '#f59e0b' },
    { event: 'contract_review_pending', actor: 'legal-assistant', tier: 3, time: '25 min ago', color: '#8b5cf6' },
    { event: 'data_query_auto_approved', actor: 'analytics-agent', tier: 0, time: '31 min ago', color: '#10b981' },
  ];

  return (
    <div>
      {/* Demo Data Badge */}
      <div style={{ 
        padding: '8px 12px', 
        margin: '12px 16px 16px',
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.2)', 
        borderRadius: 6,
        textAlign: 'center' as const
      }}>
        <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 500 }}>
          🚀 Demo Data — Connect your first agent to see real activity
        </span>
      </div>

      {/* Simulated Live Activity Feed */}
      <div style={{ marginBottom: 16 }}>
        {demoEvents.map((event, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px',
            borderBottom: i < demoEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            opacity: 0.8
          }}>
            <div style={{ 
              width: 5, 
              height: 5, 
              borderRadius: '50%', 
              background: event.color, 
              flexShrink: 0 
            }} />
            <span style={{ 
              fontSize: 12, 
              fontWeight: 500, 
              color: 'var(--text-primary)', 
              fontFamily: 'var(--font-mono)', 
              flex: 1, 
              minWidth: 0 
            }}>
              {event.event.replace(/_/g, ' ')}
            </span>
            <span style={{ 
              fontSize: 10, 
              color: 'var(--text-tertiary)', 
              fontFamily: 'var(--font-mono)' 
            }}>
              T{event.tier}
            </span>
            <span style={{ 
              fontSize: 10, 
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              minWidth: '60px',
              textAlign: 'right' as const
            }}>
              {event.time}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ 
        padding: '16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ 
          fontSize: 11, 
          fontWeight: 500, 
          color: 'var(--text-tertiary)', 
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          marginBottom: 12 
        }}>
          Quick Start
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <QuickActionButton 
            icon="🤖" 
            label="Connect Your Agent"
            onClick={() => window.location.hash = 'connect'}
          />
          <QuickActionButton 
            icon="📋" 
            label="Explore Policy Templates"
            onClick={() => window.location.hash = 'policy-templates'}
          />
          <QuickActionButton 
            icon="🔑" 
            label="Create API Key"
            onClick={() => window.location.hash = 'api-keys'}
          />
          <QuickActionButton 
            icon="🎮" 
            label="Try Interactive Demo"
            onClick={() => window.open('https://regulator.ai/try', '_blank')}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Action Button ─── */
function QuickActionButton({ icon, label, onClick }: { 
  icon: string; 
  label: string; 
  onClick: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 150ms',
        fontSize: 12,
        color: 'var(--text-secondary)',
        fontWeight: 500
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.borderColor = 'var(--border-primary)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-primary)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ─── Metric cell (part of the unified band) ─── */
function Metric({ label, value, detail, onClick }: {
  label: string; value: number; detail?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-primary)', padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = 'var(--bg-primary)'; }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value}
        </span>
        {detail && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}


