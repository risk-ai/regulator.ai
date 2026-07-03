/**
 * Execution Detail Page — Phase 5 Task 5.4
 * 
 * Shows full execution details: timeline, steps, ledger events.
 * Matches FleetDashboardPage style (dark theme, monospace).
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExecutionStatusBadge } from '../components/executions/ExecutionStatusBadge.js';
import { WarrantTimeline } from '../components/executions/WarrantTimeline.js';

// ============================================================================
// Types
// ============================================================================

interface ExecutionDetail {
  execution_id: string;
  tenant_id: string;
  state: string;
  risk_tier: string;
  objective: string;
  warrant_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  timeline: TimelineEntry[];
  detailed_steps: DetailedStep[];
  ledger_events: LedgerEvent[];
  total_latency_ms?: number;
}

interface TimelineEntry {
  state: string;
  detail: string;
  timestamp: string;
  actor?: string;
  step_index?: number;
  error?: string;
}

interface DetailedStep {
  step_index: number;
  step_name: string;
  tier: string;
  status: string;
  adapter_id: string | null;
  adapter_used?: string;
  latency_ms?: number;
  status_code?: number;
  result?: any;
}

interface LedgerEvent {
  event_type: string;
  payload_json: any;
  timestamp: string;
  sequence_num: number;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  bg: '#0a0a0f',
  card: '#12131a',
  cardHover: '#1a1b26',
  border: 'rgba(255,255,255,0.06)',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  gray: '#6b7280',
  amber: '#f59e0b',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
};

const STATE_COLORS: Record<string, string> = {
  planned: COLORS.gray,
  approved: COLORS.blue,
  executing: COLORS.amber,
  awaiting_callback: COLORS.yellow,
  verifying: COLORS.blue,
  complete: COLORS.green,
  failed: COLORS.red,
  cancelled: COLORS.gray,
};

const MONO: React.CSSProperties = { 
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" 
};

const API_BASE = '/api/v1';

// ============================================================================
// Utility
// ============================================================================

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString();
}

function relativeTime(ts: string | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return 'just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatLatency(ms: number | undefined): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    if (executionId) {
      fetchExecutionDetail(executionId);
    }
  }, [executionId]);

  async function fetchExecutionDetail(id: string) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/executions/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch execution: ${response.statusText}`);
      }
      
      const result = await response.json();
      const rawData = result.data;
      
      // Transform API response to match expected shape
      const execution: ExecutionDetail = {
        execution_id: rawData.execution_id,
        tenant_id: rawData.summary?.tenant_id || 'unknown',
        state: rawData.summary?.status || 'unknown',
        risk_tier: rawData.summary?.risk_tier || 'T0',
        objective: rawData.summary?.objective || 'No objective provided',
        warrant_id: rawData.summary?.warrant_id || null,
        created_at: rawData.summary?.started_at || new Date().toISOString(),
        updated_at: rawData.summary?.updated_at || new Date().toISOString(),
        completed_at: rawData.summary?.completed_at || null,
        timeline: Array.isArray(rawData.timeline) ? rawData.timeline.map((event: any) => ({
          state: event.stage || event.event_type || 'unknown',
          detail: event.summary || event.event_type || 'No details',
          timestamp: event.event_timestamp || new Date().toISOString(),
          actor: event.actor,
          step_index: event.step_index,
          error: event.status === 'failed' ? (event.summary || 'Unknown error') : undefined,
        })) : [],
        detailed_steps: rawData.plan?.steps ? (Array.isArray(rawData.plan.steps) ? rawData.plan.steps.map((step: any, index: number) => ({
          step_index: index,
          step_name: step.action || step.step_name || `Step ${index + 1}`,
          tier: step.tier || rawData.summary?.risk_tier || 'T0',
          status: step.status || 'pending',
          adapter_id: step.adapter_id || null,
          adapter_used: step.adapter_used,
          latency_ms: step.latency_ms,
          status_code: step.status_code,
          result: step.result,
        })) : []) : [],
        ledger_events: Array.isArray(rawData.timeline) ? rawData.timeline.map((event: any, i: number) => ({
          event_type: event.event_type || 'unknown',
          payload_json: event,
          timestamp: event.event_timestamp || new Date().toISOString(),
          sequence_num: i,
        })) : [],
        total_latency_ms: rawData.summary?.total_latency_ms,
      };
      
      setExecution(execution);
      setLoading(false);
    } catch (err: any) {

      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: COLORS.bg, 
        color: COLORS.textPrimary,
        padding: '24px',
      }}>
        <div style={{ color: COLORS.textMuted, ...MONO }}>
          Loading execution...
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: COLORS.bg, 
        color: COLORS.textPrimary,
        padding: '24px',
      }}>
        <div style={{ 
          backgroundColor: COLORS.card, 
          border: `1px solid ${COLORS.red}`,
          padding: '16px',
          borderRadius: '8px',
          color: COLORS.red,
          ...MONO,
        }}>
          Error: {error || 'Execution not found'}
        </div>
        <button
          onClick={() => navigate('/executions')}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            color: COLORS.textPrimary,
            cursor: 'pointer',
            ...MONO,
          }}
        >
          ← Back to Executions
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: COLORS.bg, 
      color: COLORS.textPrimary,
      padding: '24px',
    }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/executions')}
        style={{
          marginBottom: '24px',
          padding: '8px 16px',
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '8px',
          color: COLORS.textSecondary,
          cursor: 'pointer',
          fontSize: '13px',
          ...MONO,
        }}
      >
        ← Back to Executions
      </button>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, ...MONO, margin: 0 }}>
            {execution.execution_id}
          </h1>
          <ExecutionStatusBadge 
            status={execution.state as any} 
            riskTier={execution.risk_tier as any}
            size="md"
            showIcon={true}
          />
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: '14px', marginBottom: '12px' }}>
          {execution.objective}
        </p>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: COLORS.textSecondary }}>
          {execution.warrant_id && (
            <span>Warrant: <code style={MONO}>{execution.warrant_id}</code></span>
          )}
          <span>Created: {relativeTime(execution.created_at)}</span>
          {execution.completed_at && (
            <span>Completed: {relativeTime(execution.completed_at)}</span>
          )}
          {execution.total_latency_ms && (
            <span>Total Latency: {formatLatency(execution.total_latency_ms)}</span>
          )}
        </div>
      </div>

      {/* Warrant Lifecycle Timeline */}
      {execution.warrant_id && (
        <div style={{ marginBottom: '32px' }}>
          <WarrantTimeline
            stages={[
              { stage: 'requested', status: 'complete', timestamp: execution.created_at },
              { stage: 'evaluated', status: 'complete', timestamp: execution.created_at },
              {
                stage: execution.state === 'complete' || execution.state === 'executed' ? 'approved' : 'denied',
                status: execution.state === 'complete' || execution.state === 'executed' ? 'complete' : 'failed',
                timestamp: execution.updated_at,
              },
              {
                stage: execution.state === 'complete' || execution.state === 'executed' ? 'executed' : 'blocked',
                status: execution.state === 'complete' || execution.state === 'executed' ? 'complete' : 'failed',
                timestamp: execution.completed_at || execution.updated_at,
              },
            ]}
            warrantsId={execution.warrant_id}
          />
        </div>
      )}

      {/* Timeline */}
      <Section title="Execution Timeline">
        <Timeline entries={execution.timeline} />
      </Section>

      {/* Steps */}
      <Section title="Steps">
        <Steps steps={execution.detailed_steps} />
      </Section>

      {/* Ledger Events (Collapsible) */}
      <Section title="Ledger Events" collapsible expanded={showLedger} onToggle={() => setShowLedger(!showLedger)}>
        {showLedger && (
          <LedgerEvents events={execution.ledger_events} />
        )}
      </Section>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function Section({ 
  title, 
  children,
  collapsible = false,
  expanded = true,
  onToggle,
}: { 
  title: string; 
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '16px',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={collapsible ? onToggle : undefined}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, ...MONO }}>
          {title}
        </h2>
        {collapsible && (
          <span style={{ color: COLORS.textMuted, fontSize: '14px' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  
  if (safeEntries.length === 0) {
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        color: COLORS.textMuted,
        fontSize: '13px',
        ...MONO,
      }}>
        No timeline events available
      </div>
    );
  }
  
  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: '11px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        backgroundColor: COLORS.border,
      }} />

      {safeEntries.map((entry, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
          {/* Dot */}
          <div style={{
            position: 'absolute',
            left: '-27px',
            top: '4px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: STATE_COLORS[entry.state] || COLORS.gray,
            border: `2px solid ${COLORS.bg}`,
          }} />

          {/* Content */}
          <div style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '12px',
            borderLeft: `3px solid ${STATE_COLORS[entry.state] || COLORS.gray}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <ExecutionStatusBadge status={entry.state as any} size="sm" />
              <span style={{ fontSize: '11px', color: COLORS.textMuted, ...MONO }}>
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: COLORS.textSecondary }}>
              {entry.detail}
            </div>
            {entry.error && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: COLORS.red,
                fontFamily: 'monospace',
              }}>
                Error: {entry.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Steps({ steps }: { steps: DetailedStep[] }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const safeSteps = Array.isArray(steps) ? steps : [];
  
  if (safeSteps.length === 0) {
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        color: COLORS.textMuted,
        fontSize: '13px',
        ...MONO,
      }}>
        No execution steps available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {safeSteps.map(step => (
        <div 
          key={step.step_index}
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setExpandedStep(expandedStep === step.step_index ? null : step.step_index)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '11px', 
                color: COLORS.textMuted, 
                fontWeight: 600,
                ...MONO,
              }}>
                {step.step_index}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {step.step_name}
              </span>
              <StatusBadge status={step.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: COLORS.textMuted }}>
              {step.latency_ms && <span>{formatLatency(step.latency_ms)}</span>}
              {step.status_code && <span>HTTP {step.status_code}</span>}
              <span>{expandedStep === step.step_index ? '▼' : '▶'}</span>
            </div>
          </div>

          {expandedStep === step.step_index && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: COLORS.textSecondary }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Tier:</strong> {step.tier}
              </div>
              {step.adapter_id && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Adapter:</strong> <code style={MONO}>{step.adapter_id}</code>
                </div>
              )}
              {step.adapter_used && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Adapter Used:</strong> {step.adapter_used}
                </div>
              )}
              {step.result && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Result:</strong>
                  <pre style={{ 
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflowX: 'auto',
                    ...MONO,
                  }}>
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LedgerEvents({ events }: { events: LedgerEvent[] }) {
  const safeEvents = Array.isArray(events) ? events : [];
  
  if (safeEvents.length === 0) {
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        color: COLORS.textMuted,
        fontSize: '13px',
        ...MONO,
      }}>
        No ledger events available
      </div>
    );
  }
  
  return (
    <div style={{ 
      backgroundColor: COLORS.card, 
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '16px',
      maxHeight: '400px',
      overflowY: 'auto',
    }}>
      {safeEvents.map((event, i) => (
        <div 
          key={i}
          style={{
            paddingBottom: '12px',
            marginBottom: '12px',
            borderBottom: i < events.length - 1 ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.blue, ...MONO }}>
              {event.event_type}
            </span>
            <span style={{ fontSize: '11px', color: COLORS.textMuted, ...MONO }}>
              #{event.sequence_num} · {formatTimestamp(event.timestamp)}
            </span>
          </div>
          <pre style={{ 
            fontSize: '11px', 
            color: COLORS.textSecondary,
            margin: 0,
            ...MONO,
          }}>
            {JSON.stringify(event.payload_json, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: COLORS.green,
    failed: COLORS.red,
    executing: COLORS.amber,
    pending: COLORS.gray,
    skipped: COLORS.textMuted,
  };
  const color = colors[status] || COLORS.gray;
  
  return (
    <span style={{
      padding: '3px 6px',
      backgroundColor: `${color}22`,
      border: `1px solid ${color}`,
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: 600,
      color: color,
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}
