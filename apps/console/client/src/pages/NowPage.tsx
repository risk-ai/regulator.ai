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
      const [agentsRes, proposalsRes, warrantsRes, auditRes, policiesRes, rulesRes] = await Promise.all([
        fetchJSON('/api/v1/agents'),
        fetchJSON('/api/v1/proposals'),
        fetchJSON('/api/v1/warrants'),
        fetchJSON('/api/v1/audit/recent?limit=10'),
        fetchJSON('/api/v1/policies'),
        fetchJSON('/api/v1/policy-rules'),
      ]);

      const agents = agentsRes.data || [];
      const proposals = proposalsRes.data || [];
      const warrants = warrantsRes.data || [];
      const auditEntries = auditRes.data?.entries || [];
      const auditTotal = auditRes.data?.total || auditEntries.length;
      const policies = policiesRes.data || [];
      const rules = rulesRes.data || [];

      setSnapshot({
        agents: { total: agents.length, active: agents.filter((a: any) => a.status === 'active').length, suspended: agents.filter((a: any) => a.status === 'suspended').length },
        proposals: { total: proposals.length, pending: proposals.filter((p: any) => p.state === 'pending').length, approved: proposals.filter((p: any) => p.state === 'approved' || p.state === 'warranted').length, denied: proposals.filter((p: any) => p.state === 'denied').length },
        warrants: { total: warrants.length, active: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) > new Date()).length, revoked: warrants.filter((w: any) => w.revoked).length, expired: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) <= new Date()).length },
        audit: { total: auditTotal, recent: auditEntries },
        policies: { total: policies.length, enabled: policies.filter((p: any) => p.enabled).length },
        policyRules: { total: rules.length, enabled: rules.filter((r: any) => r.enabled).length },
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
          overflow: 'hidden', marginBottom: 40,
        }}>
          <Metric label="Agents" value={snapshot.agents.active} detail={`/${snapshot.agents.total}`} onClick={() => nav('fleet')} />
          <Metric label="Proposals" value={snapshot.proposals.total} detail={snapshot.proposals.pending > 0 ? `${snapshot.proposals.pending} pending` : undefined} onClick={() => nav('intent')} />
          <Metric label="Warrants" value={snapshot.warrants.total} detail={snapshot.warrants.active > 0 ? `${snapshot.warrants.active} active` : undefined} onClick={() => nav('approvals')} />
          <Metric label="Policies" value={snapshot.policies.enabled} detail={`/${snapshot.policies.total}`} onClick={() => nav('policies')} />
          <Metric label="Rules" value={snapshot.policyRules.enabled} detail={`/${snapshot.policyRules.total}`} onClick={() => nav('policy-templates')} />
          <Metric label="Audit Events" value={snapshot.audit.total} onClick={() => nav('history')} />
        </div>

        {/* ═══ ZONE 3: Activity ═══ */}

        {/* Live events */}
        {liveEvents.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                Live Events
              </span>
            </div>
            {liveEvents.slice(0, 5).map((ev, i) => (
              <EventRow key={i} name={ev.event || 'unknown'} actor={ev.actor} tier={ev.risk_tier} />
            ))}
          </div>
        )}

        {/* Recent audit */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
          {snapshot.audit.recent.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>
              No events yet. Submit an intent to see the governance pipeline in action.
            </p>
          ) : (
            snapshot.audit.recent.map((entry, i) => (
              <EventRow
                key={entry.id || i}
                name={entry.event || entry.action || 'unknown'}
                actor={entry.actor}
                tier={entry.risk_tier}
                time={entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : undefined}
                proposalId={entry.proposal_id}
              />
            ))
          )}
        </div>

      </>)}
    </div>
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

/* ─── Event row (used for both live + audit) ─── */
function EventRow({ name, actor, tier, time, proposalId }: {
  name: string; actor?: string; tier?: number; time?: string; proposalId?: string;
}) {
  const eventColors: Record<string, string> = {
    warrant_issued: '#f59e0b', execution_verified: '#10b981', execution_denied: '#ef4444',
    proposal_pending: '#3b82f6', proposal_denied: '#ef4444', warrant_revoked: '#f59e0b',
    intent_rejected: '#ef4444',
  };
  const color = eventColors[name] || 'var(--text-tertiary)';
  const tierLabel = tier !== undefined ? `T${tier}` : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
      fontSize: 13,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {name.replace(/_/g, ' ')}
      </span>
      {tierLabel && (
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {tierLabel}
        </span>
      )}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>
        {actor || 'system'}
      </span>
      {time && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{time}</span>}
    </div>
  );
}
