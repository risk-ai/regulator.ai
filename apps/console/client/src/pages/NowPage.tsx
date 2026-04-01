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

  // Refresh on new SSE events
  useEffect(() => { if (liveEvents.length > 0) loadSnapshot(); }, [liveEvents.length]);

  const nav = (s: string) => { window.location.hash = s; };

  // Check if this is an empty/new workspace
  const isEmptyWorkspace = snapshot && 
    snapshot.agents.total === 0 && 
    snapshot.proposals.total === 0 && 
    snapshot.warrants.total === 0 && 
    snapshot.policies.total === 0 && 
    snapshot.policyRules.total === 0;

  return (
    <PageLayout title="System Posture" description="Live operational status">
      {/* Grid background pattern */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(rgba(124, 58, 237, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.02) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
        zIndex: -1
      }} />

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: connected ? '#4ade80' : error ? '#f87171' : '#fbbf24',
              boxShadow: connected ? '0 0 15px rgba(74, 222, 128, 0.6)' : error ? '0 0 15px rgba(248, 113, 113, 0.6)' : '0 0 15px rgba(251, 191, 36, 0.6)',
              animation: connected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {connected ? 'STREAMING' : 'POLLING'} · {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          {connected && (
            <span style={{ 
              fontSize: '10px', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: 'rgba(74, 222, 128, 0.12)', 
              color: '#4ade80', 
              border: '1px solid rgba(74, 222, 128, 0.3)', 
              fontFamily: 'var(--font-mono)', 
              fontWeight: 600,
              boxShadow: '0 0 10px rgba(74, 222, 128, 0.15)'
            }}>
              SSE LIVE
            </span>
          )}
        </div>
        <button 
          onClick={() => { setLoading(true); loadSnapshot(); }} 
          style={{ 
            padding: '6px 14px', 
            borderRadius: '8px', 
            fontSize: '11px', 
            background: 'var(--bg-secondary)', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer', 
            fontFamily: 'var(--font-sans)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >↻ Refresh</button>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--error-bg)', 
          borderRadius: '12px', 
          padding: '14px 18px', 
          marginBottom: '20px', 
          fontSize: '13px', 
          color: 'var(--error-text)',
        }}>
          {error}
        </div>
      )}

      {/* Welcome Screen for Empty Workspace */}
      {isEmptyWorkspace && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(167, 139, 250, 0.08))',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle glow effect */}
          <div style={{ 
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 50%)',
            animation: 'pulse 4s ease-in-out infinite'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: 'var(--text-primary)', 
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Welcome to Vienna OS
            </h2>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-secondary)', 
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              lineHeight: '1.5'
            }}>
              Your AI governance platform is ready. Start by setting up your first agent, creating policies, or generating an API key for programmatic access.
            </p>
            
            {/* Quick start actions */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              <QuickStartCard 
                icon="🤖" 
                title="Register an Agent" 
                description="Add your first AI agent to the fleet"
                onClick={() => nav('fleet')}
                primary
              />
              <QuickStartCard 
                icon="📋" 
                title="Create a Policy" 
                description="Define governance rules and constraints"
                onClick={() => nav('policies')}
              />
              <QuickStartCard 
                icon="🔑" 
                title="Generate API Key" 
                description="Get programmatic access to the platform"
                onClick={() => nav('api-keys')}
              />
            </div>
          </div>
        </div>
      )}

      {snapshot && !isEmptyWorkspace && (<>
        {/* Pending Approvals Banner */}
        {snapshot.proposals.pending > 0 && (
          <div 
            onClick={() => nav('approvals')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-3)', 
              padding: 'var(--space-4) 0',
              marginBottom: 'var(--space-6)', 
              cursor: 'pointer',
              transition: 'opacity 150ms'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: 'var(--warning-text)' 
            }} />
            <span className="text-body" style={{ fontWeight: 600, color: 'var(--warning-text)' }}>
              {snapshot.proposals.pending} proposal{snapshot.proposals.pending !== 1 ? 's' : ''} awaiting approval
            </span>
            <span className="text-helper">→</span>
          </div>
        )}

        {/* KPI Dashboard */}
        <div className="section-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <StatCard label="Agents" value={snapshot.agents.active} total={snapshot.agents.total} suffix="active" color="#a78bfa" onClick={() => nav('fleet')} />
          <StatCard label="Proposals" value={snapshot.proposals.total} sub={`${snapshot.proposals.pending} pending · ${snapshot.proposals.approved} approved`} color="#60a5fa" onClick={() => nav('intent')} />
          <StatCard label="Warrants" value={snapshot.warrants.active} total={snapshot.warrants.total} suffix="active" color="#fbbf24" onClick={() => nav('approvals')} />
          <StatCard label="Policies" value={snapshot.policies.enabled} total={snapshot.policies.total} suffix="enabled" color="#4ade80" onClick={() => nav('policies')} />
          <StatCard label="Rules" value={snapshot.policyRules.enabled} total={snapshot.policyRules.total} suffix="enabled" color="#818cf8" onClick={() => nav('policy-templates')} />
          <StatCard label="Audit Events" value={snapshot.audit.total} sub="recent shown below" color="#94a3b8" onClick={() => nav('history')} />
        </div>

        {/* Live Pipeline Events */}
        {liveEvents.length > 0 && (
          <div className="section-gap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-text)', animation: 'pulse 2s infinite' }} />
              <span className="text-section-label">Live Pipeline Events</span>
              <span className="text-helper" style={{ fontFamily: 'var(--font-mono)' }}>via SSE</span>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {liveEvents.slice(0, 5).map((ev, i) => (
                <LiveEventRow key={i} event={ev} isLast={i === Math.min(liveEvents.length, 5) - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Pipeline Activity */}
        <div className="section-gap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span className="text-section-label">Recent Pipeline Activity</span>
            <button 
              onClick={() => nav('history')} 
              className="btn-premium"
              style={{ 
                padding: 'var(--space-2) var(--space-3)', 
                fontSize: 'var(--text-helper)'
              }}
            >
              View all →
            </button>
          </div>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {snapshot.audit.recent.length === 0 ? (
              <div style={{ 
                padding: 'var(--space-6)', 
                textAlign: 'center', 
                color: 'var(--text-tertiary)', 
                fontSize: 'var(--text-body)' 
              }}>
                No audit events yet. Submit an intent to see the pipeline in action.
              </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0' }}>
          {/* Loading skeleton with shimmer */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
            gap: '16px', 
            width: '100%',
            marginBottom: '40px' 
          }}>
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                style={{ 
                  background: 'linear-gradient(90deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  border: '1px solid rgba(124, 58, 237, 0.1)', 
                  borderRadius: '12px', 
                  height: '120px'
                }}
              />
            ))}
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(124, 58, 237, 0.2)', 
            borderTopColor: '#a78bfa', 
            borderRadius: '50%', 
            animation: 'spin 0.8s linear infinite',
            boxShadow: '0 0 15px rgba(167, 139, 250, 0.3)'
          }} />
        </div>
      )}
    </PageLayout>
  );
}

function StatCard({ label, value, total, suffix, sub, color, onClick }: { label: string; value: number; total?: number; suffix?: string; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="kpi-card"
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div className="label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span className="value" style={{ color }}>{value}</span>
        {total !== undefined && <span className="text-helper">/{total}</span>}
        {suffix && <span className="text-helper">{suffix}</span>}
      </div>
      {sub && <div className="text-helper" style={{ marginTop: 'var(--space-2)' }}>{sub}</div>}
    </div>
  );
}

function LiveEventRow({ event, isLast }: { event: PipelineEvent; isLast: boolean }) {
  const colors: Record<string, string> = { 
    warrant_issued: 'var(--warning-text)', 
    execution_verified: 'var(--success-text)', 
    execution_denied: 'var(--error-text)', 
    proposal_pending: 'var(--info-text)', 
    proposal_denied: 'var(--error-text)', 
    warrant_revoked: 'var(--warning-text)' 
  };
  const eventName = event.event || 'unknown';
  const color = colors[eventName] || 'var(--text-tertiary)';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 'var(--space-3)', 
      padding: 'var(--space-3) var(--space-5)', 
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      background: 'var(--success-bg)',
      height: '48px'
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-text)', animation: 'pulse 1s' }} />
      <span className="text-helper" style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {eventName.replace(/_/g, ' ')}
      </span>
      <span className="status-badge neutral" style={{ fontSize: 'var(--text-helper)' }}>
        T{event.risk_tier ?? 0}
      </span>
      <span className="text-helper" style={{ marginLeft: 'auto' }}>{event.actor || 'system'}</span>
    </div>
  );
}

function AuditRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const eventName = entry.event || entry.action || 'unknown';
  const colors: Record<string, string> = { 
    warrant_issued: 'var(--warning-text)', 
    execution_verified: 'var(--success-text)', 
    execution_denied: 'var(--error-text)', 
    proposal_pending: 'var(--info-text)', 
    proposal_denied: 'var(--error-text)', 
    warrant_revoked: 'var(--warning-text)', 
    intent_rejected: 'var(--error-text)', 
    operator_login: 'var(--text-tertiary)' 
  };
  const color = colors[eventName] || 'var(--text-tertiary)';
  const tier = ['T0', 'T1', 'T2', 'T3'][entry.risk_tier ?? 0] || `T${entry.risk_tier}`;
  const time = entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : '';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 'var(--space-4)', 
      padding: 'var(--space-4) var(--space-5)', 
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      height: '48px'
    }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="text-body" style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {eventName.replace(/_/g, ' ')}
          </span>
          <span className="status-badge neutral" style={{ 
            fontSize: 'var(--text-helper)', 
            fontWeight: 600, 
            color, 
            fontFamily: 'var(--font-mono)', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            background: `${color}15`,
            border: `1px solid ${color}30`
          }}>{tier}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{entry.actor || 'system'} · {time}</div>
      </div>
      {entry.proposal_id && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{entry.proposal_id.substring(0, 8)}...</span>}
    </div>
  );
}

function QuickAction({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick} 
      style={{ 
        background: 'var(--bg-primary)', 
        borderRadius: '12px', 
        padding: '16px 18px', 
        cursor: 'pointer', 
        transition: 'all 200ms ease', 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-primary)';
      }}
    >
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{desc}</div>
      </div>
    </div>
  );
}

function QuickStartCard({ icon, title, description, onClick, primary }: { icon: string; title: string; description: string; onClick: () => void; primary?: boolean }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: primary 
          ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(167, 139, 250, 0.08))'
          : 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))',
        border: primary 
          ? '1px solid rgba(124, 58, 237, 0.4)'
          : '1px solid rgba(124, 58, 237, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = primary 
          ? '0 10px 30px rgba(124, 58, 237, 0.25)'
          : '0 8px 25px rgba(124, 58, 237, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {primary && (
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 50%)',
          animation: 'pulse 3s ease-in-out infinite'
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: '8px',
          margin: '0 0 8px 0'
        }}>{title}</h3>
        <p style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)', 
          lineHeight: '1.4',
          margin: 0
        }}>{description}</p>
      </div>
    </div>
  );
}
