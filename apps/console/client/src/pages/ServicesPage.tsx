/**
 * Services Page — Premium Terminal Design
 * 
 * Infrastructure health board with glowing status indicators,
 * governance engine cards, live health polling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Server, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

// ─── Types ───

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

const ENGINES = [
  { name: 'Policy Engine', icon: '📋', desc: 'Rule evaluation & enforcement', key: 'pipeline' },
  { name: 'Warrant System', icon: '🔐', desc: 'Cryptographic signing & TTL', key: 'pipeline' },
  { name: 'Agent Registry', icon: '🤖', desc: 'Trust scores & rate limiting', key: 'agents' },
  { name: 'Webhook Dispatch', icon: '🔔', desc: 'Event notifications', key: 'webhooks' },
  { name: 'SSE Streaming', icon: '📡', desc: 'Real-time event stream', key: 'sse' },
  { name: 'Auth & RBAC', icon: '🔑', desc: 'JWT, API keys, rate limiting', key: 'auth' },
];

const INFRA = [
  { label: 'Database', value: 'Neon Postgres', icon: '💾', key: 'database' },
  { label: 'Compute', value: 'Vercel Serverless', icon: '⚡', key: null },
  { label: 'CDN', value: 'Vercel Edge', icon: '🌐', key: null },
  { label: 'DNS', value: 'Vercel DNS', icon: '🔗', key: null },
  { label: 'SSL', value: "Let's Encrypt", icon: '🔒', key: null },
  { label: 'Email', value: 'Resend', icon: '📧', key: null },
];

// ─── Helpers ───

function formatUptime(s: number) {
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function getCheckStatus(health: HealthCheck | null, key: string) {
  if (!health?.checks) return { status: 'unknown', healthy: false };
  const check = (health.checks as any)[key];
  if (!check) return { status: 'unknown', healthy: false };
  return { status: check.status, healthy: check.status === 'healthy', ...check };
}

// ─── Main Page ───

export function ServicesPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health', { credentials: 'include' });
      setHealth(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const allHealthy = health?.status === 'healthy';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Server className="text-emerald-400" size={20} />
            Services
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Infrastructure health & governance engine status</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] font-bold font-mono text-white/50 hover:text-white transition-all flex items-center gap-2">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading && !health ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Checking health...</span>
        </div>
      ) : health && (
        <>
          {/* Overall Status Banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-6 ${
            allHealthy
              ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
              : 'bg-red-500/5 border-red-500/20 shadow-[0_0_16px_rgba(239,68,68,0.15)]'
          }`}>
            <div className={`w-3 h-3 rounded-full animate-pulse ${allHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={`text-[12px] font-bold font-mono uppercase ${allHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
              All Systems {allHealthy ? 'Operational' : 'Degraded'}
            </span>
            <span className="text-[10px] font-mono text-white/25 ml-auto">
              v{health.version} · {health.mode} · uptime {formatUptime(health.uptime_seconds)}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Endpoints', value: health.endpoints?.total || 0, sub: `${health.endpoints?.healthy || 0} healthy`, color: 'amber' },
              { label: 'DB Latency', value: health.checks?.database?.latency_ms || 0, sub: 'ms', color: (health.checks?.database?.latency_ms || 0) > 200 ? 'red' : 'emerald' },
              { label: 'Proposals', value: health.checks?.pipeline?.proposals || 0, sub: 'total', color: 'blue' },
              { label: 'Audit Events', value: health.checks?.pipeline?.audit_events || 0, sub: 'total', color: 'blue' },
              { label: 'Agents', value: health.checks?.agents?.count || 0, sub: 'registered', color: 'amber' },
              { label: 'Webhooks', value: health.checks?.webhooks?.active || 0, sub: 'active', color: 'amber' },
            ].map(s => {
              const colorMap: Record<string, string> = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400', blue: 'text-blue-400' };
              return (
                <div key={s.label} className="bg-[#12131a] border border-white/[0.08] rounded-lg p-3 text-center">
                  <div className={`text-[22px] font-bold font-mono leading-none ${colorMap[s.color]}`}>{s.value}</div>
                  <div className="text-[9px] text-white/25 font-mono mt-0.5">{s.sub}</div>
                  <div className="text-[9px] text-white/35 uppercase tracking-wider font-bold mt-1">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Governance Engines */}
          <div className="mb-6">
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Governance Engines</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ENGINES.map(engine => {
                const chk = getCheckStatus(health, engine.key);
                const isHealthy = chk.healthy;
                return (
                  <div key={engine.name} className={`bg-[#12131a] border rounded-lg p-4 transition-all ${
                    isHealthy
                      ? 'border-white/[0.06] hover:border-emerald-500/20'
                      : 'border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{engine.icon}</span>
                        <span className="text-[12px] font-bold text-white">{engine.name}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                        isHealthy ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[9px] font-bold font-mono uppercase ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isHealthy ? 'Operational' : chk.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/30">{engine.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Infrastructure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INFRA.map(svc => {
                const isHealthy = svc.key ? getCheckStatus(health, svc.key).healthy : true;
                return (
                  <div key={svc.label} className="bg-[#12131a] border border-white/[0.06] rounded-lg p-4">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-base">{svc.icon}</span>
                      <span className="text-[12px] font-bold text-white">{svc.label}</span>
                      <div className={`w-2 h-2 rounded-full ml-auto ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="text-[11px] font-mono text-white/50">{svc.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
