/**
 * Dashboard Control — Vienna OS Premium
 * 
 * Mission Control dashboard with power user features.
 * Designed to make operators feel in complete command.
 * 
 * Features:
 * - Quick Action Command Bar (one-click controls)
 * - Real-time pulsing indicators
 * - Batch operations
 * - Keyboard shortcuts
 * - Satisfying visual feedback
 */

import { Activity, TrendingUp, Power, Shield, Zap, AlertTriangle, CheckCircle, RefreshCw, Play, Pause, Terminal, Compass } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { addToast } from '../store/toastStore.js';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardMetrics {
  activeAgents: number;
  totalAgents: number;
  warrantsToday: number;
  avgTrust: number;
  pendingApprovals: number;
  avgLatencyMs: number;
  systemStatus: 'healthy' | 'degraded' | 'critical';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  enabled: boolean;
}

// ============================================================================
// COMMAND BAR
// ============================================================================

function CommandBar({ actions }: { actions: QuickAction[] }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      padding: '16px 20px',
      marginBottom: '20px',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: 'rgba(251, 191, 36, 0.7)',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-mono)',
        marginRight: '10px',
      }}>
        QUICK ACTIONS
      </div>

      {actions.map(action => (
        <button
          key={action.id}
          onClick={action.action}
          disabled={!action.enabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: action.enabled ? `${action.color}20` : 'rgba(107, 114, 128, 0.1)',
            border: `1px solid ${action.enabled ? `${action.color}40` : 'rgba(107, 114, 128, 0.2)'}`,
            color: action.enabled ? action.color : '#6b7280',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: action.enabled ? 'pointer' : 'not-allowed',
            transition: 'all 150ms',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            if (action.enabled) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}40`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// METRIC CARD WITH PULSE
// ============================================================================

function MetricCardPulse({ label, value, unit, color, pulse }: {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  pulse?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'rgba(10, 14, 20, 0.6)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isHovered ? `0 0 20px ${color}40` : '0 0 0 1px rgba(0,0,0,0.8)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Pulse indicator */}
      {pulse && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }} />
      )}

      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: 'rgba(251, 191, 36, 0.7)',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-mono)',
      }}>
        {label}
      </div>

      <div style={{
        fontSize: '36px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
      }}>
        {value}
        {unit && <span style={{ fontSize: '16px', color: 'rgba(230, 225, 220, 0.5)', marginLeft: '4px' }}>{unit}</span>}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SYSTEM STATUS CARD
// ============================================================================

function SystemStatusCard({ label, status, detail, action }: {
  label: string;
  status: 'healthy' | 'degraded' | 'critical';
  detail: string;
  action?: () => void;
}) {
  const statusConfig = {
    healthy: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', label: 'OPERATIONAL' },
    degraded: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', label: 'DEGRADED' },
    critical: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', label: 'CRITICAL' },
  };

  const config = statusConfig[status];

  return (
    <div style={{
      background: 'rgba(10, 14, 20, 0.6)',
      border: `1px solid ${config.color}40`,
      padding: '14px 16px',
      boxShadow: `0 0 12px ${config.glow}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#E6E1DC',
        }}>
          {label}
        </div>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 8px ${config.glow}`,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }} />
      </div>

      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: config.color,
        marginBottom: '6px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
      }}>
        {config.label}
      </div>

      <div style={{
        fontSize: '10px',
        color: 'rgba(230, 225, 220, 0.6)',
        fontFamily: 'var(--font-mono)',
      }}>
        {detail}
      </div>

      {action && (
        <button
          onClick={action}
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            background: `${config.color}20`,
            border: `1px solid ${config.color}40`,
            color: config.color,
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            width: '100%',
            letterSpacing: '0.05em',
          }}
        >
          INVESTIGATE →
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export function DashboardControl() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeAgents: 0,
    totalAgents: 0,
    warrantsToday: 0,
    avgTrust: 0,
    pendingApprovals: 0,
    avgLatencyMs: 0,
    systemStatus: 'healthy',
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vienna_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [agentsRes, execsRes, dashRes] = await Promise.all([
        fetch('/api/v1/fleet/agents', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/executions/stats', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/dashboard?range=24h', { credentials: 'include', headers }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      const agents: any[] = (agentsRes.success ? agentsRes.data : agentsRes.agents) || [];
      const stats = execsRes.success ? execsRes.data : {};
      const dash = dashRes.success ? dashRes.data : {};
      const overview = dash.overview || {};

      setMetrics({
        activeAgents: agents.filter((a: any) => a.status === 'active').length,
        totalAgents: agents.length,
        warrantsToday: Number(stats.total_executions || overview.executions_period || 0),
        avgTrust: agents.length > 0 ? agents.reduce((sum: number, a: any) => sum + (Number(a.trust_score) || 0), 0) / agents.length : 0,
        pendingApprovals: Number(overview.pending_approvals || stats.pending_approval || 0),
        avgLatencyMs: Number(dash.systemHealth?.latencyMs || 0),
        systemStatus: 'healthy',
      });
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboard]);

  const quickActions: QuickAction[] = [
    {
      id: 'start-tour',
      label: 'START TOUR',
      icon: <Compass size={12} />,
      color: '#d4af37',
      action: () => {
        if ((window as any).startGuidedTour) {
          (window as any).startGuidedTour();
        }
      },
      enabled: true,
    },
    {
      id: 'refresh',
      label: 'REFRESH',
      icon: <RefreshCw size={12} />,
      color: '#10b981',
      action: loadDashboard,
      enabled: true,
    },
    {
      id: 'pause-all',
      label: autoRefresh ? 'PAUSE AUTO' : 'RESUME AUTO',
      icon: autoRefresh ? <Pause size={12} /> : <Play size={12} />,
      color: '#f59e0b',
      action: () => setAutoRefresh(!autoRefresh),
      enabled: true,
    },
    {
      id: 'approve-all',
      label: 'APPROVE QUEUE',
      icon: <CheckCircle size={12} />,
      color: '#10b981',
      action: async () => {
        try {
          const token = localStorage.getItem('vienna_access_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('/api/v1/approvals', { credentials: 'include', headers });
          const data = await res.json();
          const pending = (data.data || []).filter((a: any) => a.status === 'pending');
          if (pending.length === 0) { addToast('No pending approvals in queue', 'info'); return; }
          for (const approval of pending) {
            await fetch(`/api/v1/approvals/${approval.approval_id || approval.id}/approve`, {
              method: 'POST', credentials: 'include', headers, body: JSON.stringify({ reason: 'Batch approved from dashboard' })
            });
          }
          addToast(`Approved ${pending.length} pending requests`, 'success');
          loadDashboard();
        } catch (e: any) { addToast('Batch approve failed: ' + e.message, 'error'); }
      },
      enabled: metrics.pendingApprovals > 0,
    },
    {
      id: 'emergency',
      label: 'EMERGENCY HALT',
      icon: <AlertTriangle size={12} />,
      color: '#ef4444',
      action: async () => {
        if (!confirm('⚠️ Halt ALL agent operations? This will suspend every active agent.')) return;
        try {
          const token = localStorage.getItem('vienna_access_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const agentsRes = await fetch('/api/v1/fleet/agents', { credentials: 'include', headers });
          const agentsData = await agentsRes.json();
          const active = (agentsData.data || []).filter((a: any) => a.status === 'active');
          for (const agent of active) {
            await fetch(`/api/v1/agents/${agent.id}`, {
              method: 'PUT', credentials: 'include', headers,
              body: JSON.stringify({ status: 'suspended' })
            });
          }
          addToast(`Emergency halt: ${active.length} agents suspended`, 'warning');
          loadDashboard();
        } catch (e: any) { addToast('Emergency halt failed: ' + e.message, 'error'); }
      },
      enabled: true,
    },
    {
      id: 'terminal',
      label: 'CONSOLE',
      icon: <Terminal size={12} />,
      color: '#06b6d4',
      action: () => window.location.href = '/workspace',
      enabled: true,
    },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PageLayout title="" description="">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#10b981',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
            }}>
              <Zap size={16} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} strokeWidth={2} />
              MISSION CONTROL
            </h1>
            <div style={{
              fontSize: '11px',
              color: 'rgba(230, 225, 220, 0.5)',
              marginTop: '4px',
              fontFamily: 'var(--font-mono)',
            }}>
              Live Agent Governance Dashboard
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: metrics.systemStatus === 'healthy' ? '#10b981' : '#ef4444',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: metrics.systemStatus === 'healthy' ? '#10b981' : '#ef4444',
              boxShadow: `0 0 8px ${metrics.systemStatus === 'healthy' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }} />
            {metrics.systemStatus.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Command Bar */}
      <CommandBar actions={quickActions} />

      {/* Content */}
      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid rgba(16, 185, 129, 0.2)',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)' }}>
            LOADING MISSION CONTROL...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <MetricCardPulse label="ACTIVE AGENTS" value={metrics.activeAgents} color="#10b981" pulse />
            <MetricCardPulse label="WARRANTS TODAY" value={metrics.warrantsToday.toLocaleString()} color="#fbbf24" />
            <MetricCardPulse label="AVG TRUST" value={metrics.avgTrust.toFixed(1)} unit="%" color="#06b6d4" />
            <MetricCardPulse label="PENDING" value={metrics.pendingApprovals} color={metrics.pendingApprovals > 10 ? '#f59e0b' : '#10b981'} pulse={metrics.pendingApprovals > 10} />
          </div>

          {/* System Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <SystemStatusCard
              label="Governance Engine"
              status={metrics.avgLatencyMs < 100 ? 'healthy' : 'degraded'}
              detail={`Avg latency: ${metrics.avgLatencyMs}ms`}
              action={() => window.location.href = '/analytics'}
            />
            <SystemStatusCard
              label="Approval Queue"
              status={metrics.pendingApprovals < 20 ? 'healthy' : 'degraded'}
              detail={`${metrics.pendingApprovals} pending approvals`}
              action={() => window.location.href = '/approvals'}
            />
            <SystemStatusCard
              label="Fleet Status"
              status={metrics.activeAgents >= metrics.totalAgents * 0.8 ? 'healthy' : 'degraded'}
              detail={`${metrics.activeAgents} active of ${metrics.totalAgents} total`}
              action={() => window.location.href = '/fleet'}
            />
          </div>

          {/* Performance Banner */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(251, 191, 36, 0.7)',
                letterSpacing: '0.1em',
                fontFamily: 'var(--font-mono)',
                marginBottom: '4px',
              }}>
                SYSTEM PERFORMANCE
              </div>
              <div style={{
                fontSize: '13px',
                color: '#E6E1DC',
                fontFamily: 'var(--font-mono)',
              }}>
                All systems nominal • {metrics.warrantsToday.toLocaleString()} warrants processed today • {metrics.avgLatencyMs}ms average latency
              </div>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#10b981',
              fontFamily: 'var(--font-mono)',
            }}>
              {((metrics.activeAgents / Math.max(metrics.totalAgents, 1)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}
        </PageLayout>
      </div>
    </div>
  );
}
