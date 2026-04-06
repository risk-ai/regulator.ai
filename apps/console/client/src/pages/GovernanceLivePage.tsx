/**
 * Real-Time Governance Dashboard — Vienna OS
 * 
 * SSE-powered live view of the governance pipeline.
 * Shows warrants being issued, approvals resolving, chain growing
 * in real-time. Like a flight control tower for AI agents.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Zap,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  Users,
  Eye,
} from 'lucide-react';

// ─── Types ───

interface GovernanceEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DashboardStats {
  intents_per_minute: number;
  warrants_active: number;
  approvals_pending: number;
  agents_active: number;
  chain_length: number;
  anomalies_24h: number;
}

// ─── Event Type Config ───

const EVENT_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}> = {
  'intent.submitted': { icon: Zap, label: 'Intent Submitted', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'intent.approved': { icon: CheckCircle, label: 'Intent Approved', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  'intent.denied': { icon: XCircle, label: 'Intent Denied', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  'warrant.issued': { icon: Lock, label: 'Warrant Issued', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'warrant.expired': { icon: Clock, label: 'Warrant Expired', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  'warrant.tampered': { icon: AlertTriangle, label: 'TAMPER DETECTED', color: 'text-red-500', bgColor: 'bg-red-500/20' },
  'approval.required': { icon: Eye, label: 'Approval Required', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  'approval.resolved': { icon: CheckCircle, label: 'Approval Resolved', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  'agent.registered': { icon: Users, label: 'Agent Registered', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  'execution.started': { icon: Activity, label: 'Execution Started', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  'execution.completed': { icon: CheckCircle, label: 'Execution Completed', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  'execution.scope_drift': { icon: AlertTriangle, label: 'Scope Drift!', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  'anomaly.detected': { icon: AlertTriangle, label: 'Anomaly Detected', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
};

const TIER_COLORS: Record<string, string> = {
  T0: 'bg-green-500/20 text-green-400 border-green-500/30',
  T1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  T2: 'bg-red-500/20 text-red-400 border-red-500/30',
  T3: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// ─── Stat Card ───

function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  color: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
        {trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)] mt-1">{label}</div>
    </div>
  );
}

// ─── Event Row ───

function EventRow({ event }: { event: GovernanceEvent }) {
  const config = EVENT_CONFIG[event.type] || {
    icon: Activity,
    label: event.type,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  };
  const Icon = config.icon;
  const data = event.data || {};
  const riskTier = (data.risk_tier as string) || '';
  const agentId = (data.agent_id as string) || '';
  const warrantId = (data.warrant_id as string) || '';
  const action = (data.action as string) || '';

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`p-1.5 rounded ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
          {riskTier && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${TIER_COLORS[riskTier] || ''}`}>
              {riskTier}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--text-tertiary)] truncate">
          {agentId && <span>Agent: {agentId}</span>}
          {action && <span> · {action}</span>}
          {warrantId && <span> · {warrantId.slice(0, 16)}</span>}
        </div>
      </div>

      <div className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───

export function GovernanceLivePage() {
  const [events, setEvents] = useState<GovernanceEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    intents_per_minute: 0,
    warrants_active: 0,
    approvals_pending: 0,
    agents_active: 0,
    chain_length: 0,
    anomalies_24h: 0,
  });
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const maxEvents = 100;

  // Connect to SSE stream
  useEffect(() => {
    const es = new EventSource('/api/v1/stream');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'heartbeat') return;

        const event: GovernanceEvent = {
          id: data.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: data.type || data.event || 'unknown',
          timestamp: data.timestamp || new Date().toISOString(),
          data: data.data || data,
        };

        if (!paused) {
          setEvents(prev => [event, ...prev].slice(0, maxEvents));
          updateStats(event);
        }
      } catch {
        // Ignore parse errors
      }
    };

    // Also listen for specific governance events
    const governanceEvents = [
      'intent.submitted', 'intent.approved', 'intent.denied',
      'warrant.issued', 'warrant.expired',
      'approval.required', 'approval.resolved',
      'agent.registered', 'execution.started', 'execution.completed',
    ];

    for (const eventType of governanceEvents) {
      es.addEventListener(eventType, (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          const event: GovernanceEvent = {
            id: `${eventType}_${Date.now()}`,
            type: eventType,
            timestamp: new Date().toISOString(),
            data,
          };
          if (!paused) {
            setEvents(prev => [event, ...prev].slice(0, maxEvents));
            updateStats(event);
          }
        } catch { /* ignore */ }
      });
    }

    return () => es.close();
  }, [paused]);

  // Load initial stats
  useEffect(() => {
    fetch('/api/v1/metrics/summary', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setStats(prev => ({
            ...prev,
            approvals_pending: data.data.approvals?.pending || 0,
            agents_active: data.data.agents?.active || 0,
          }));
        }
      })
      .catch(() => {});

    // Load chain status
    fetch('/api/v1/warrant-chain/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setStats(prev => ({ ...prev, chain_length: data.data.chain_length || 0 }));
        }
      })
      .catch(() => {});
  }, []);

  const updateStats = useCallback((event: GovernanceEvent) => {
    setStats(prev => {
      const next = { ...prev };
      if (event.type.includes('intent.submitted')) next.intents_per_minute++;
      if (event.type.includes('warrant.issued')) next.warrants_active++;
      if (event.type.includes('warrant.expired')) next.warrants_active = Math.max(0, next.warrants_active - 1);
      if (event.type.includes('approval.required')) next.approvals_pending++;
      if (event.type.includes('approval.resolved')) next.approvals_pending = Math.max(0, next.approvals_pending - 1);
      if (event.type.includes('anomaly')) next.anomalies_24h++;
      if (event.type.includes('warrant') && event.type.includes('chained')) next.chain_length++;
      return next;
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Activity className="w-7 h-7 text-purple-400" />
            Governance Live
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Real-time governance pipeline activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              paused
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Zap} label="Intents / min" value={stats.intents_per_minute} color="text-blue-400" />
        <StatCard icon={Lock} label="Active Warrants" value={stats.warrants_active} color="text-purple-400" />
        <StatCard icon={Eye} label="Pending Approvals" value={stats.approvals_pending} color="text-amber-400" />
        <StatCard icon={Users} label="Active Agents" value={stats.agents_active} color="text-cyan-400" />
        <StatCard icon={Shield} label="Chain Length" value={stats.chain_length} color="text-green-400" />
        <StatCard icon={AlertTriangle} label="Anomalies (24h)" value={stats.anomalies_24h} color="text-orange-400" />
      </div>

      {/* Event Stream */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Event Stream</h2>
          <span className="text-xs text-[var(--text-tertiary)]">{events.length} events</span>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-tertiary)]">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-30 animate-pulse" />
              <p>Waiting for governance events...</p>
              <p className="text-sm mt-2">Events will appear here in real-time as agents submit intents.</p>
            </div>
          ) : (
            events.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default GovernanceLivePage;
