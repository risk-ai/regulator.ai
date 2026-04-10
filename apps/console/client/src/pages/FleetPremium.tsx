/**
 * Fleet — Agent Mission Control
 * 
 * Real agent data from agent_registry. Each agent card shows
 * heartbeat status, trust score, type, and registration info.
 */

import { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

interface Agent {
  id: string;
  agent_id: string;
  display_name: string;
  description: string;
  agent_type: string;
  status: string;
  trust_score: number;
  last_heartbeat: string | null;
  registered_at: string;
  tags: string[];
  rate_limit_per_minute: number;
}

function getHeartbeatStatus(lastHb: string | null): { label: string; color: string; glow: string } {
  if (!lastHb) return { label: 'NEVER', color: '#64748b', glow: 'none' };
  const age = Date.now() - new Date(lastHb).getTime();
  if (age < 5 * 60 * 1000) return { label: 'LIVE', color: '#10b981', glow: '0 0 8px rgba(16,185,129,0.5)' };
  if (age < 60 * 60 * 1000) return { label: 'STALE', color: '#f59e0b', glow: '0 0 8px rgba(245,158,11,0.3)' };
  return { label: 'OFFLINE', color: '#ef4444', glow: '0 0 8px rgba(239,68,68,0.3)' };
}

function TrustBar({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: color, transition: 'width 600ms ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

export default function FleetPremium() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'offline'>('all');
  const { isMobile } = useResponsive();

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/agents', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}` },
      });
      const json = await res.json();
      const list = json.data || json.agents || json;
      if (Array.isArray(list)) setAgents(list);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const filtered = agents.filter(a => {
    if (filter === 'all') return true;
    const hb = getHeartbeatStatus(a.last_heartbeat);
    if (filter === 'active') return hb.label === 'LIVE';
    return hb.label === 'OFFLINE' || hb.label === 'NEVER';
  });

  const liveCount = agents.filter(a => getHeartbeatStatus(a.last_heartbeat).label === 'LIVE').length;
  const staleCount = agents.filter(a => getHeartbeatStatus(a.last_heartbeat).label === 'STALE').length;
  const offlineCount = agents.length - liveCount - staleCount;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Fleet Control
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {agents.length} registered · {liveCount} live · {staleCount} stale · {offlineCount} offline
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'active', 'offline'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)',
              background: filter === f ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: filter === f ? '#d4af37' : 'var(--text-tertiary)',
              border: `1px solid ${filter === f ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'}`,
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px 20px', flex: 1, minWidth: '140px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>{liveCount}</div>
          <div style={{ fontSize: '10px', color: '#10b981', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>LIVE</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '12px 20px', flex: 1, minWidth: '140px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{staleCount}</div>
          <div style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>STALE</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 20px', flex: 1, minWidth: '140px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{offlineCount}</div>
          <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>OFFLINE</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          Scanning fleet...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🤖</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No agents match this filter</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtered.map(agent => {
            const hb = getHeartbeatStatus(agent.last_heartbeat);
            return (
              <div key={agent.id} onClick={() => setSelectedAgent(agent)} style={{
                background: 'var(--surface)', border: '1px solid var(--border-subtle)',
                padding: '16px', cursor: 'pointer', transition: 'border-color 150ms',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)')}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {agent.display_name || agent.agent_id}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {agent.agent_id}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: hb.color, boxShadow: hb.glow,
                      animation: hb.label === 'LIVE' ? 'pulse 2s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: hb.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                      {hb.label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {agent.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', lineHeight: '1.4' }}>
                    {agent.description}
                  </div>
                )}

                {/* Trust Score */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>TRUST</div>
                  <TrustBar score={agent.trust_score || 0} />
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'rgba(212,175,55,0.08)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>
                    {agent.agent_type || 'autonomous'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {agent.rate_limit_per_minute || 60} req/min
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div onClick={() => setSelectedAgent(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', zIndex: 1000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg)', border: '1px solid var(--border-subtle)',
            maxWidth: '500px', width: '100%', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                  {selectedAgent.display_name}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedAgent.agent_id}
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            {selectedAgent.description && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                {selectedAgent.description}
              </p>
            )}

            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {[
                ['Type', selectedAgent.agent_type],
                ['Status', selectedAgent.status],
                ['Trust Score', `${selectedAgent.trust_score}/100`],
                ['Rate Limit', `${selectedAgent.rate_limit_per_minute} req/min`],
                ['Registered', selectedAgent.registered_at ? new Date(selectedAgent.registered_at).toLocaleDateString() : '—'],
                ['Last Heartbeat', selectedAgent.last_heartbeat ? new Date(selectedAgent.last_heartbeat).toLocaleString() : 'Never'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                </div>
              ))}
            </div>

            {selectedAgent.tags && selectedAgent.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {selectedAgent.tags.map(t => (
                  <span key={t} style={{ padding: '2px 6px', fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.5); } }`}</style>
    </div>
  );
}
