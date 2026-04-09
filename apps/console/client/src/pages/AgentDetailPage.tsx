/**
 * Agent Detail Page — Premium Terminal View
 * 
 * Shows single agent profile, trust history, recent activity, metrics.
 * Uses fleetApi.getAgent() for real data.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Pause, Play } from 'lucide-react';
import { fleetApi, type AgentDetail } from '../api/fleet.js';

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAgent = useCallback(async (showRefresh = false) => {
    if (!agentId) return;
    if (showRefresh) setRefreshing(true);
    try {
      const detail = await fleetApi.getAgent(agentId);
      setData(detail);
    } catch (err) {
      console.error('Agent load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => loadAgent(), 15000);
    return () => clearInterval(interval);
  }, [loadAgent]);

  const handleSuspend = async () => {
    if (!agentId) return;
    setActionLoading('suspend');
    try {
      await fleetApi.suspend(agentId);
      await loadAgent();
    } catch (err) {
      console.error('Suspend failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    if (!agentId) return;
    setActionLoading('activate');
    try {
      await fleetApi.activate(agentId);
      await loadAgent();
    } catch (err) {
      console.error('Activate failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Agent Not Found</h2>
        <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>Agent ID: {agentId}</p>
        <button onClick={() => navigate('/fleet')} className="px-4 py-2 rounded-lg font-medium" style={{ background: 'var(--accent-primary)', color: '#000' }}>
          Back to Fleet
        </button>
      </div>
    );
  }

  const { agent, recentActivity, alerts, metrics } = data;
  const statusColor = agent.status === 'active' ? 'text-emerald-500' : agent.status === 'suspended' ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/fleet')} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <ArrowLeft size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {agent.display_name}
            </h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {agent.agent_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadAgent(true)} disabled={refreshing}
            className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          {agent.status === 'active' ? (
            <button onClick={handleSuspend} disabled={actionLoading === 'suspend'}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <Pause size={14} />
              Suspend
            </button>
          ) : (
            <button onClick={handleActivate} disabled={actionLoading === 'activate'}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
              style={{ background: 'var(--accent-primary)', color: '#000' }}>
              <Play size={14} />
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500 animate-pulse' : agent.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className={`text-sm font-mono font-semibold uppercase ${statusColor}`}>
              {agent.status}
            </span>
          </div>
          <div className="h-4 w-px" style={{ background: 'var(--border-subtle)' }} />
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Type: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{agent.agent_type}</span>
          </div>
          <div className="h-4 w-px" style={{ background: 'var(--border-subtle)' }} />
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Trust: <span className={`font-mono font-semibold ${agent.trust_score >= 95 ? 'text-emerald-500' : agent.trust_score >= 85 ? 'text-amber-500' : 'text-red-500'}`}>
              {agent.trust_score.toFixed(1)}%
            </span>
          </div>
        </div>
        {agent.unresolved_alerts > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'var(--bg-app)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs font-mono text-amber-500">{agent.unresolved_alerts} alerts</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Actions Today" value={metrics.actionsToday.toLocaleString()} />
        <MetricCard label="Actions This Week" value={metrics.actionsThisWeek.toLocaleString()} />
        <MetricCard label="Avg Latency" value={`${metrics.avgLatencyMs.toFixed(1)}ms`} />
        <MetricCard label="Error Rate" value={`${(metrics.errorRate * 100).toFixed(1)}%`} />
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Actions by Type */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Actions by Type
          </h3>
          <div className="space-y-2">
            {Object.entries(metrics.actionsByType).slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{type}</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions by Result */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Actions by Result
          </h3>
          <div className="space-y-2">
            {Object.entries(metrics.actionsByResult).map(([result, count]) => (
              <div key={result} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {result === 'approved' && <CheckCircle size={12} className="text-emerald-500" />}
                  {result === 'denied' && <XCircle size={12} className="text-red-500" />}
                  {result === 'pending' && <Activity size={12} className="text-amber-500" />}
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{result}</span>
                </div>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            No recent activity
          </p>
        ) : (
          <div className="space-y-2">
            {recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between text-xs p-2 rounded hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-app)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {new Date(activity.created_at).toLocaleTimeString()}
                  </span>
                  <span className="font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                    {activity.action_type}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
                    activity.result === 'approved' ? 'bg-emerald-500/20 text-emerald-500' :
                    activity.result === 'denied' ? 'bg-red-500/20 text-red-500' :
                    'bg-amber-500/20 text-amber-500'
                  }`}>
                    {activity.result}
                  </span>
                </div>
                <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {activity.latency_ms}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <AlertTriangle size={14} className="text-amber-500" />
            Active Alerts
          </h3>
          <div className="space-y-2">
            {alerts.filter(a => !a.resolved).map((alert) => (
              <div key={alert.id} className="p-3 rounded" style={{ background: 'var(--bg-app)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {alert.alert_type}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
                    alert.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                    alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {alert.message}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  <button
                    onClick={async () => {
                      await fleetApi.resolveAlert(alert.id);
                      await loadAgent();
                    }}
                    className="text-[10px] font-semibold uppercase px-2 py-1 rounded transition-colors"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
