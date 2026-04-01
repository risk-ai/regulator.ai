/**
 * Runtime Page — Vienna OS
 * 
 * Live runtime metrics, pipeline health, and execution control.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { useEventStream } from '../hooks/useEventStream.js';

interface RuntimeStats {
  window: string;
  health: string;
  envelopes: { total: number; active: number; failed: number; succeeded: number };
  throughputPerMinute: number;
  errorRate: number;
  queueDepth: number;
  auditEvents: number;
}

interface ExecutionRecord {
  execution_id: string;
  action: string;
  agent_name: string;
  risk_tier: string;
  status: string;
  approved_by: string;
  executed_at: string;
}

async function fetchJSON(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
}

export function RuntimePage() {
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [window, setWindow] = useState('24h');
  const [loading, setLoading] = useState(true);
  const { connected, events } = useEventStream({ enabled: true, maxEvents: 10 });

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetchJSON(`/api/v1/runtime/stats?window=${window}`),
        fetchJSON('/api/v1/execution-records?limit=10'),
      ]);
      setStats(s.data);
      setExecutions(e.data || []);
    } catch {} finally { setLoading(false); }
  }, [window]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (events.length > 0) load(); }, [events.length]);

  const statusColors: Record<string, string> = {
    executed: '#4ade80', denied: '#f87171', expired: '#94a3b8', revoked: '#f97316', pending: '#fbbf24',
  };

  return (
    <PageLayout title="Runtime" description="Execution pipeline health and metrics">
      {/* Health banner with glow effect */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: stats?.health === 'healthy' ? '#4ade80' : '#f87171',
            boxShadow: stats?.health === 'healthy' 
              ? '0 0 12px rgba(74, 222, 128, 0.6), 0 0 6px rgba(74, 222, 128, 0.4)' 
              : '0 0 12px rgba(248, 113, 113, 0.6), 0 0 6px rgba(248, 113, 113, 0.4)'
          }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            {stats?.health || 'loading'}
          </span>
        </div>
        {connected && (
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            background: 'rgba(74, 222, 128, 0.08)', 
            color: '#4ade80', 
            border: '1px solid rgba(74, 222, 128, 0.2)', 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 600,
            boxShadow: '0 0 8px rgba(74, 222, 128, 0.3)'
          }}>SSE LIVE</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {['5m', '1h', '24h', '7d'].map(w => (
            <button key={w} onClick={() => setWindow(w)} style={{
              padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
              background: window === w ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
              border: `1px solid ${window === w ? 'rgba(167, 139, 250, 0.3)' : 'var(--border-subtle)'}`,
              color: window === w ? '#a78bfa' : 'var(--text-tertiary)', 
              cursor: 'pointer', 
              fontFamily: 'var(--font-mono)',
              boxShadow: window === w ? '0 0 8px rgba(124, 58, 237, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}>{w}</button>
          ))}
        </div>
      </div>

      {stats && (
        <>
          {/* Pipeline metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <MetricCard label="Proposals" value={stats.envelopes.total} color="#60a5fa" />
            <MetricCard label="Succeeded" value={stats.envelopes.succeeded} color="#4ade80" />
            <MetricCard label="Failed" value={stats.envelopes.failed} color="#f87171" />
            <MetricCard label="Queue" value={stats.queueDepth} color="#fbbf24" />
            <MetricCard label="Throughput" value={stats.throughputPerMinute} suffix="/min" color="#a78bfa" />
            <MetricCard label="Error Rate" value={Math.round(stats.errorRate * 100)} suffix="%" color={stats.errorRate > 0.1 ? '#f87171' : '#4ade80'} />
            <MetricCard label="Audit Events" value={stats.auditEvents} color="#94a3b8" />
          </div>

          {/* Recent executions */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>Recent Executions</div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
              {executions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No execution records yet.</div>
              ) : executions.map((ex, i) => (
                <div key={ex.execution_id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderBottom: i < executions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  borderLeft: `3px solid ${statusColors[ex.status] || '#94a3b8'}`,
                  background: `linear-gradient(90deg, ${statusColors[ex.status] || '#94a3b8'}05, transparent 60%)`,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Animated flow indicator */}
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: '3px',
                    height: '100%',
                    background: `linear-gradient(180deg, transparent, ${statusColors[ex.status] || '#94a3b8'}, transparent)`,
                    animation: ex.status === 'executed' ? 'flow-pulse 2s ease-in-out infinite' : 'none',
                  }} />
                  
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: statusColors[ex.status] || '#94a3b8', 
                    flexShrink: 0,
                    boxShadow: ex.status === 'executed' 
                      ? '0 0 8px rgba(74, 222, 128, 0.6)' 
                      : ex.status === 'failed' 
                        ? '0 0 8px rgba(248, 113, 113, 0.6)' 
                        : 'none'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{ex.action}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 600, 
                        color: statusColors[ex.status] || '#94a3b8', 
                        fontFamily: 'var(--font-mono)', 
                        padding: '1px 5px', 
                        borderRadius: '3px', 
                        background: `${statusColors[ex.status] || '#94a3b8'}12`,
                        border: `1px solid ${statusColors[ex.status] || '#94a3b8'}25`
                      }}>{ex.risk_tier}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '1px 5px', 
                        borderRadius: '3px', 
                        background: `${statusColors[ex.status] || '#94a3b8'}08`, 
                        color: statusColors[ex.status] || '#94a3b8', 
                        fontFamily: 'var(--font-mono)',
                        border: `1px solid ${statusColors[ex.status] || '#94a3b8'}20`
                      }}>{ex.status}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>{ex.agent_name || 'system'} · {ex.approved_by || 'auto'} · {ex.executed_at ? new Date(ex.executed_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </PageLayout>
  );
}

function MetricCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div style={{ 
      background: `${color}08`, 
      border: `1px solid ${color}15`, 
      borderRadius: '10px', 
      padding: '14px',
      backdropFilter: 'blur(8px)',
      boxShadow: `0 0 15px ${color}08, 0 2px 4px rgba(0, 0, 0, 0.1)`,
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 0 20px ${color}15, 0 4px 8px rgba(0, 0, 0, 0.15)`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `0 0 15px ${color}08, 0 2px 4px rgba(0, 0, 0, 0.1)`;
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color, 
          fontFamily: 'var(--font-mono)', 
          lineHeight: 1,
          textShadow: `0 0 8px ${color}40`
        }}>{value}</span>
        {suffix && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{suffix}</span>}
      </div>
    </div>
  );
}
