/**
 * Now Page — Vienna OS
 * 
 * Live system posture dashboard with SSE real-time events.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
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

  // SSE real-time events
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
      const policies = policiesRes.data || [];
      const rules = rulesRes.data || [];

      setSnapshot({
        agents: { total: agents.length, active: agents.filter((a: any) => a.status === 'active').length, suspended: agents.filter((a: any) => a.status === 'suspended').length },
        proposals: { total: proposals.length, pending: proposals.filter((p: any) => p.state === 'pending').length, approved: proposals.filter((p: any) => p.state === 'approved' || p.state === 'warranted').length, denied: proposals.filter((p: any) => p.state === 'denied').length },
        warrants: { total: warrants.length, active: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) > new Date()).length, revoked: warrants.filter((w: any) => w.revoked).length, expired: warrants.filter((w: any) => !w.revoked && new Date(w.expires_at) <= new Date()).length },
        audit: { total: auditEntries.length, recent: auditEntries },
        policies: { total: policies.length, enabled: policies.filter((p: any) => p.enabled).length },
        policyRules: { total: rules.length, enabled: rules.filter((r: any) => r.enabled).length },
      });
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSnapshot(); const i = setInterval(loadSnapshot, 30000); return () => clearInterval(i); }, [loadSnapshot]);

  // Refresh on new SSE events
  useEffect(() => { if (liveEvents.length > 0) loadSnapshot(); }, [liveEvents.length]);

  const nav = (s: string) => { window.location.hash = s; };

  return (
    <PageLayout title="System Posture" description="Live operational status">
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#4ade80' : error ? '#f87171' : '#fbbf24' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {connected ? 'STREAMING' : 'POLLING'} · {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          {connected && (
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              SSE LIVE
            </span>
          )}
        </div>
        <button onClick={() => { setLoading(true); loadSnapshot(); }} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>↻ Refresh</button>
      </div>

      {error && <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>{error}</div>}

      {snapshot && (<>
        {/* Pending banner */}
        {snapshot.proposals.pending > 0 && (
          <div onClick={() => nav('approvals')} style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>⏳</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>{snapshot.proposals.pending} proposal{snapshot.proposals.pending !== 1 ? 's' : ''} awaiting approval</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Click to review →</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <StatCard label="Agents" value={snapshot.agents.active} total={snapshot.agents.total} suffix="active" color="#a78bfa" onClick={() => nav('fleet')} />
          <StatCard label="Proposals" value={snapshot.proposals.total} sub={`${snapshot.proposals.pending} pending · ${snapshot.proposals.approved} approved`} color="#60a5fa" onClick={() => nav('intent')} />
          <StatCard label="Warrants" value={snapshot.warrants.active} total={snapshot.warrants.total} suffix="active" color="#D4A520" onClick={() => nav('approvals')} />
          <StatCard label="Policies" value={snapshot.policies.enabled} total={snapshot.policies.total} suffix="enabled" color="#4ade80" onClick={() => nav('policies')} />
          <StatCard label="Rules" value={snapshot.policyRules.enabled} total={snapshot.policyRules.total} suffix="enabled" color="#818cf8" onClick={() => nav('policy-templates')} />
          <StatCard label="Audit Events" value={snapshot.audit.total} sub="recent shown below" color="#94a3b8" onClick={() => nav('history')} />
        </div>

        {/* Live events from SSE */}
        {liveEvents.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Pipeline Events</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>via SSE</span>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
              {liveEvents.slice(0, 5).map((ev, i) => (
                <LiveEventRow key={i} event={ev} isLast={i === Math.min(liveEvents.length, 5) - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Recent audit */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Pipeline Activity</span>
            <button onClick={() => nav('history')} style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>View all →</button>
          </div>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
            {snapshot.audit.recent.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No audit events yet. Submit an intent to see the pipeline.</div>
            ) : snapshot.audit.recent.map((entry, i) => (
              <AuditRow key={entry.id || i} entry={entry} isLast={i === snapshot.audit.recent.length - 1} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <QuickAction icon="🎯" label="Submit Intent" desc="Run an action through the pipeline" onClick={() => nav('intent')} />
          <QuickAction icon="📋" label="Review Approvals" desc="Approve or deny pending proposals" onClick={() => nav('approvals')} />
          <QuickAction icon="🤖" label="Agent Fleet" desc="View agents and trust scores" onClick={() => nav('fleet')} />
          <QuickAction icon="📜" label="Audit History" desc="Browse the immutable ledger" onClick={() => nav('history')} />
        </div>
      </>)}

      {!snapshot && !error && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </PageLayout>
  );
}

function StatCard({ label, value, total, suffix, sub, color, onClick }: { label: string; value: number; total?: number; suffix?: string; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: `${color}08`, border: `1px solid ${color}15`, borderRadius: '10px', padding: '16px', cursor: onClick ? 'pointer' : 'default', transition: 'all 150ms' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</span>
        {total !== undefined && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>/{total}</span>}
        {suffix && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function LiveEventRow({ event, isLast }: { event: PipelineEvent; isLast: boolean }) {
  const colors: Record<string, string> = { warrant_issued: '#D4A520', execution_verified: '#4ade80', execution_denied: '#f87171', proposal_pending: '#60a5fa', proposal_denied: '#f87171', warrant_revoked: '#f97316' };
  const eventName = event.event || 'unknown';
  const color = colors[eventName] || '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)', background: 'rgba(74, 222, 128, 0.02)' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 1s' }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{eventName.replace(/_/g, ' ')}</span>
      <span style={{ fontSize: '10px', color, fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: '3px', background: `${color}12` }}>T{event.risk_tier ?? 0}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{event.actor || 'system'}</span>
    </div>
  );
}

function AuditRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const eventName = entry.event || entry.action || 'unknown';
  const colors: Record<string, string> = { warrant_issued: '#D4A520', execution_verified: '#4ade80', execution_denied: '#f87171', proposal_pending: '#60a5fa', proposal_denied: '#f87171', warrant_revoked: '#f97316', intent_rejected: '#ef4444', operator_login: '#94a3b8' };
  const color = colors[eventName] || '#94a3b8';
  const tier = ['T0', 'T1', 'T2', 'T3'][entry.risk_tier ?? 0] || `T${entry.risk_tier}`;
  const time = entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{eventName.replace(/_/g, ' ')}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color, fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: '3px', background: `${color}12` }}>{tier}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{entry.actor || 'system'} · {time}</div>
      </div>
      {entry.proposal_id && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{entry.proposal_id.substring(0, 8)}...</span>}
    </div>
  );
}

function QuickAction({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px 16px', cursor: 'pointer', transition: 'all 150ms', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
}
