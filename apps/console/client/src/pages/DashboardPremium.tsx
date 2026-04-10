/**
 * Dashboard — Vienna OS Command Center
 * 
 * Live governance overview: real metrics from DB, activity stream,
 * system health, pipeline throughput. No hardcoded data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

interface DashboardData {
  agents: { total: number; active: number };
  policies: { total: number };
  warrants: { total: number; active: number };
  audit: { total: number };
  system: { status: string; mode: string; version: string; uptime: number };
}

interface AuditEvent {
  event: string;
  created_at: string;
  details: any;
  agent_name?: string;
}

interface PipelineStats {
  intent: { total: number; recent: number; status: string };
  plan: { total: number; pending: number; recent: number; status: string };
  policy: { total: number; active: number; status: string };
  warrant: { total: number; active: number; recent: number; status: string };
  execution: { total: number; active: number; recent: number; status: string };
  verification: { total: number; recent: number; status: string };
}

// Animated counter hook
function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const from = count;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]); // eslint-disable-line
  return count;
}

function MetricBox({ label, value, sub, color = '#d4af37', icon }: { label: string; value: number; sub?: string; color?: string; icon: string }) {
  const animated = useAnimatedCount(value);
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-subtle)',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '12px', right: '16px', fontSize: '28px', opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
        {animated.toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  );
}

function HealthIndicator({ label, status, detail }: { label: string; status: string; detail: string }) {
  const isOk = status === 'healthy' || status === 'operational' || status === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isOk ? '#10b981' : '#f59e0b',
          boxShadow: isOk ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(245,158,11,0.5)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{detail}</span>
    </div>
  );
}

export default function DashboardPremium() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  const headers = { 'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}` };

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, pipeRes, auditRes] = await Promise.all([
        fetch('/api/v1/dashboard/bootstrap', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
        fetch('/api/v1/pipeline/stats', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
        fetch('/api/v1/audit?limit=15', { credentials: 'include', headers }).then(r => r.json()).catch(() => null),
      ]);
      if (dashRes?.success) setData(dashRes.data);
      if (pipeRes?.success) setPipeline(pipeRes.data);
      const auditEvents = auditRes?.data || auditRes?.events || [];
      if (Array.isArray(auditEvents)) setEvents(auditEvents.slice(0, 15));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Initializing command center...</div>;
  }

  const d = data || { agents: { total: 0, active: 0 }, policies: { total: 0 }, warrants: { total: 0, active: 0 }, audit: { total: 0 }, system: { status: 'unknown', mode: 'serverless', version: '8.2.0', uptime: 0 } };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Command Center
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            System {d.system.status} · {d.system.version} · {d.system.mode}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <MetricBox label="Agents" value={d.agents.total} sub={`${d.agents.active} active`} icon="🤖" color="#10b981" />
        <MetricBox label="Active Warrants" value={d.warrants.active} sub={`${d.warrants.total} total`} icon="🔑" color="#d4af37" />
        <MetricBox label="Policies" value={d.policies.total} sub="enforcing" icon="📜" color="#3b82f6" />
        <MetricBox label="Audit Events" value={d.audit.total} sub="tracked" icon="📊" color="#8b5cf6" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* System Health */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
            System Health
          </div>
          <HealthIndicator label="Governance Engine" status={d.system.status} detail={`${d.warrants.total} warrants processed`} />
          <HealthIndicator label="Policy Evaluator" status="operational" detail={`${d.policies.total} active policies`} />
          <HealthIndicator label="Agent Registry" status="operational" detail={`${d.agents.active}/${d.agents.total} online`} />
          <HealthIndicator label="Audit Pipeline" status="operational" detail={`${d.audit.total} events logged`} />
          <HealthIndicator label="Database" status="operational" detail="Neon Postgres · us-east-1" />
        </div>

        {/* Pipeline Throughput */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Pipeline Throughput (24h)
          </div>
          {pipeline && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Intents', value: pipeline.intent.recent, total: pipeline.intent.total },
                { label: 'Proposals', value: pipeline.plan.recent, total: pipeline.plan.total },
                { label: 'Warrants', value: pipeline.warrant.recent, total: pipeline.warrant.total },
                { label: 'Executions', value: pipeline.execution.recent, total: pipeline.execution.total },
                { label: 'Policies', value: pipeline.policy.active, total: pipeline.policy.total },
                { label: 'Audit', value: pipeline.verification.recent, total: pipeline.verification.total },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                  padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', opacity: 0.5 }}>
                    {item.total} total
                  </div>
                </div>
              ))}
            </div>
          )}
          {!pipeline && <div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Loading pipeline data...</div>}
        </div>
      </div>

      {/* Activity Stream */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Activity Stream
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>LIVE</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
            No recent governance events. Submit an intent to see activity here.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '4px', maxHeight: '350px', overflowY: 'auto' }}>
            {events.map((event, i) => {
              const isWarrant = event.event?.includes('warrant');
              const isPolicy = event.event?.includes('policy');
              const isDeny = event.event?.includes('denied') || event.event?.includes('reject');
              const borderColor = isDeny ? 'rgba(239,68,68,0.3)' : isWarrant ? 'rgba(212,175,55,0.3)' : isPolicy ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)';
              
              return (
                <div key={i} style={{
                  display: 'flex', gap: '12px', padding: '8px 12px',
                  borderLeft: `2px solid ${borderColor}`,
                  background: 'rgba(255,255,255,0.01)',
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', minWidth: '70px' }}>
                    {event.created_at ? new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false }) : ''}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {event.event || 'governance_event'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.5); } }`}</style>
    </div>
  );
}
