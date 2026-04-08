/**
 * Services Page — Vienna OS
 * Live infrastructure health from /api/v1/health endpoint.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';

interface HealthCheck {
  status: string;
  timestamp: string;
  version: string;
  mode: string;
  uptime_seconds: number;
  checks: {
    database: { status: string; latency_ms: number };
    pipeline: { status: string; proposals: number; audit_events: number };
    agents: { status: string; count: number };
    webhooks: { status: string; active: number };
    sse: { status: string; endpoint: string };
    auth: { status: string; methods: string[] };
  };
  endpoints: { total: number; healthy: number };
}

const governanceEngines = [
  { name: 'Policy Engine', icon: '📋', desc: 'Rule evaluation & enforcement', key: 'pipeline' },
  { name: 'Warrant System', icon: '🔐', desc: 'Cryptographic signing & TTL', key: 'pipeline' },
  { name: 'Agent Registry', icon: '🤖', desc: 'Trust scores & rate limiting', key: 'agents' },
  { name: 'Webhook Dispatch', icon: '🔔', desc: 'Event notifications via HTTP', key: 'webhooks' },
  { name: 'SSE Streaming', icon: '📡', desc: 'Real-time event stream', key: 'sse' },
  { name: 'Auth & RBAC', icon: '🔑', desc: 'JWT, API keys, rate limiting', key: 'auth' },
];

export function ServicesPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health', { credentials: 'include' });
      const data = await res.json();
      setHealth(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const getStatus = (key: string) => {
    if (!health?.checks) return { status: 'unknown', color: '#94a3b8' };
    const check = (health.checks as any)[key];
    if (!check) return { status: 'unknown', color: '#94a3b8' };
    const s = check.status;
    return {
      status: s === 'healthy' ? 'Operational' : s === 'warning' ? 'Warning' : s === 'unhealthy' ? 'Down' : s,
      color: s === 'healthy' ? '#10b981' : s === 'warning' ? '#f59e0b' : '#ef4444',
    };
  };

  const formatUptime = (s: number) => {
    if (s < 60) return `${Math.floor(s)}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  };

  return (
    <PageLayout title="Services" description="Infrastructure health & governance engine status">

      {/* Overall status */}
      {health && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 0' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: health.status === 'healthy' ? '#10b981' : '#ef4444' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: health.status === 'healthy' ? '#10b981' : '#ef4444' }}>ALL SYSTEMS {health.status === 'healthy' ? 'OPERATIONAL' : 'DEGRADED'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>v{health.version} · {health.mode} · uptime {formatUptime(health.uptime_seconds)}</span>
        </div>
      )}

      {/* Stat cards */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          <MiniStat label="Endpoints" value={health.endpoints?.total || 0} sub={`${health.endpoints?.healthy || 0} healthy`} color="#f59e0b" />
          <MiniStat label="DB Latency" value={health.checks?.database?.latency_ms || 0} sub="ms" color={health.checks?.database?.latency_ms > 200 ? '#ef4444' : '#10b981'} />
          <MiniStat label="Proposals" value={health.checks?.pipeline?.proposals || 0} sub="total" color="#60a5fa" />
          <MiniStat label="Audit Events" value={health.checks?.pipeline?.audit_events || 0} sub="total" color="#94a3b8" />
          <MiniStat label="Agents" value={health.checks?.agents?.count || 0} sub="registered" color="#D4A520" />
          <MiniStat label="Webhooks" value={health.checks?.webhooks?.active || 0} sub="active" color="#f97316" />
        </div>
      )}

      {/* Governance Engines */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Governance Engines</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {governanceEngines.map(engine => {
            const { status, color } = getStatus(engine.key);
            return (
              <div key={engine.name} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{engine.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{engine.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{engine.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '100px', background: `${color}10`, border: `1px solid ${color}25` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color, textTransform: 'uppercase' }}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Infrastructure */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Infrastructure</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { label: 'Database', value: 'Neon Postgres', sub: `${health?.checks?.database?.latency_ms || '?'}ms latency`, icon: '💾', status: health?.checks?.database?.status },
            { label: 'Compute', value: 'Vercel Serverless', sub: 'US East (iad1)', icon: '⚡', status: 'healthy' },
            { label: 'CDN', value: 'Vercel Edge', sub: 'Global distribution', icon: '🌐', status: 'healthy' },
            { label: 'DNS', value: 'Vercel DNS', sub: '*.regulator.ai', icon: '🔗', status: 'healthy' },
            { label: 'SSL', value: 'Let\'s Encrypt', sub: 'Auto-renewed', icon: '🔒', status: 'healthy' },
            { label: 'Email', value: 'Resend', sub: 'Transactional', icon: '📧', status: 'healthy' },
          ].map(svc => (
            <div key={svc.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>{svc.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{svc.label}</span>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: svc.status === 'healthy' ? '#10b981' : '#ef4444', marginLeft: 'auto' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{svc.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{svc.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && !health && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </PageLayout>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div style={{ background: `${color}06`, border: `1px solid ${color}12`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{sub}</div>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
