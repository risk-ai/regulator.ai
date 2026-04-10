/**
 * Execution Pipeline Status — Premium
 * 
 * Animated governance pipeline: Intent → Plan → Policy → Warrant → Execution → Verification
 * Pulls real counts from /api/v1/pipeline/stats
 */

import React, { useState, useEffect } from 'react';

interface StageData {
  total: number;
  recent?: number;
  active?: number;
  pending?: number;
  status: 'active' | 'idle';
}

interface PipelineStats {
  intent: StageData;
  plan: StageData;
  policy: StageData;
  warrant: StageData;
  execution: StageData;
  verification: StageData;
}

const STAGE_CONFIG = [
  { key: 'intent', label: 'INTENT', icon: '🎯', desc: 'Agent requests' },
  { key: 'plan', label: 'PLAN', icon: '📋', desc: 'Proposals' },
  { key: 'policy', label: 'POLICY', icon: '📜', desc: 'Evaluations' },
  { key: 'warrant', label: 'WARRANT', icon: '🔑', desc: 'Granted' },
  { key: 'execution', label: 'EXECUTION', icon: '⚡', desc: 'Active' },
  { key: 'verification', label: 'VERIFICATION', icon: '✅', desc: 'Audited' },
] as const;

export function ExecutionPipelineStatus() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ text: string; time: string }>>([]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/pipeline/stats', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}` },
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch {
      // silent
    }

    // Also fetch recent audit events for the ticker
    try {
      const response = await fetch('/api/v1/audit?limit=5', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}` },
      });
      if (response.ok) {
        const json = await response.json();
        const events = json.data || json.events || [];
        if (Array.isArray(events)) {
          setRecentEvents(events.slice(0, 5).map((e: any) => ({
            text: e.event || e.action || 'governance event',
            time: e.created_at ? new Date(e.created_at).toLocaleTimeString() : '',
          })));
        }
      }
    } catch {
      // silent
    }
  };

  const getStageValue = (key: string): string => {
    if (!stats) return '—';
    const stage = stats[key as keyof PipelineStats];
    if (!stage) return '—';
    if (key === 'policy') return String(stage.active ?? stage.total);
    if (key === 'warrant') return String(stage.active ?? stage.total);
    if (key === 'execution') return String(stage.active ?? 0);
    return String(stage.total);
  };

  const getStageStatus = (key: string): 'active' | 'idle' => {
    if (!stats) return 'idle';
    return stats[key as keyof PipelineStats]?.status || 'idle';
  };

  return (
    <div>
      {/* Pipeline Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
          Execution Pipeline
        </h3>
        {stats && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {stats.intent.total + stats.plan.total + stats.warrant.total + stats.execution.total} total events
          </span>
        )}
      </div>

      {/* Pipeline Stages */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        flexWrap: 'wrap',
      }}>
        {STAGE_CONFIG.map((stage, index) => {
          const isActive = getStageStatus(stage.key) === 'active';
          const value = getStageValue(stage.key);
          
          return (
            <React.Fragment key={stage.key}>
              <div style={{
                background: isActive ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'}`,
                padding: '16px 20px',
                minWidth: '120px',
                textAlign: 'center',
                position: 'relative',
                transition: 'all 300ms',
              }}>
                {/* Pulse indicator for active stages */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    animation: 'pulse 2s ease-in-out infinite',
                  }} />
                )}
                
                <div style={{ fontSize: '11px', fontWeight: 700, color: isActive ? '#d4af37' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: isActive ? '#d4af37' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {stage.desc}
                </div>
              </div>
              
              {index < STAGE_CONFIG.length - 1 && (
                <div style={{
                  color: isActive ? '#d4af37' : 'var(--text-tertiary)',
                  fontSize: '16px',
                  padding: '0 4px',
                  opacity: 0.6,
                }}>
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Live Ticker */}
      {recentEvents.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#d4af37', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            LIVE
          </span>
          <div style={{ display: 'flex', gap: '16px', overflow: 'hidden' }}>
            {recentEvents.map((event, i) => (
              <span key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {event.text} <span style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>{event.time}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
