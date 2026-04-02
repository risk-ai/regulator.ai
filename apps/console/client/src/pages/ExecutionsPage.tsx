/**
 * Executions Page — Phase 5 Task 5.4
 * 
 * Lists all executions with state, risk tier, latency.
 * Matches FleetDashboardPage style (dark theme, monospace, dense).
 */

import React, { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface Execution {
  execution_id: string;
  tenant_id: string;
  state: ExecutionState;
  risk_tier: string;
  objective: string;
  warrant_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  step_count?: number;
  total_latency_ms?: number;
}

type ExecutionState = 'planned' | 'approved' | 'executing' | 'awaiting_callback' | 'verifying' | 'complete' | 'failed' | 'cancelled';

type FilterState = 'all' | ExecutionState;

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  bg: '#0a0a0f',
  card: '#12131a',
  cardHover: '#1a1b26',
  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(255,255,255,0.10)',
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

const STATE_COLORS: Record<ExecutionState, string> = {
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

function truncateId(id: string): string {
  return id.substring(0, 12) + '...';
}

function formatLatency(ms: number | undefined): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [filter, setFilter] = useState<FilterState>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutions();
    const interval = setInterval(fetchExecutions, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function fetchExecutions() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/executions`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch executions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setExecutions(data.data || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch executions:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  const filteredExecutions = filter === 'all'
    ? executions
    : executions.filter(e => e.state === filter);

  const stateCount = (state: ExecutionState) =>
    executions.filter(e => e.state === state).length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: COLORS.bg, 
      color: COLORS.textPrimary,
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 600, 
          marginBottom: '8px',
          ...MONO,
        }}>
          Executions
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: '14px' }}>
          Real-time execution monitoring
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <FilterButton 
          label="All" 
          count={executions.length} 
          active={filter === 'all'} 
          onClick={() => setFilter('all')} 
        />
        <FilterButton 
          label="Planned" 
          count={stateCount('planned')} 
          active={filter === 'planned'} 
          onClick={() => setFilter('planned')}
          color={STATE_COLORS.planned}
        />
        <FilterButton 
          label="Executing" 
          count={stateCount('executing')} 
          active={filter === 'executing'} 
          onClick={() => setFilter('executing')}
          color={STATE_COLORS.executing}
        />
        <FilterButton 
          label="Complete" 
          count={stateCount('complete')} 
          active={filter === 'complete'} 
          onClick={() => setFilter('complete')}
          color={STATE_COLORS.complete}
        />
        <FilterButton 
          label="Failed" 
          count={stateCount('failed')} 
          active={filter === 'failed'} 
          onClick={() => setFilter('failed')}
          color={STATE_COLORS.failed}
        />
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div style={{ color: COLORS.textMuted, ...MONO }}>
          Loading executions...
        </div>
      )}
      
      {error && (
        <div style={{ 
          backgroundColor: COLORS.card, 
          border: `1px solid ${COLORS.red}`,
          padding: '16px',
          borderRadius: '8px',
          color: COLORS.red,
          ...MONO,
        }}>
          Error: {error}
        </div>
      )}

      {/* Executions Table */}
      {!loading && !error && (
        <div style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...MONO }}>
            <thead>
              <tr style={{ 
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderBottom: `1px solid ${COLORS.border}`,
              }}>
                <Th>Execution ID</Th>
                <Th>State</Th>
                <Th>Risk</Th>
                <Th>Objective</Th>
                <Th>Steps</Th>
                <Th>Latency</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {filteredExecutions.length === 0 ? (
                <tr>
                  <td 
                    colSpan={7} 
                    style={{ 
                      padding: '40px', 
                      textAlign: 'center', 
                      color: COLORS.textMuted,
                    }}
                  >
                    No executions found
                  </td>
                </tr>
              ) : (
                filteredExecutions.map(exec => (
                  <ExecutionRow
                    key={exec.execution_id}
                    execution={exec}
                    onClick={() => setSelectedExecution(exec.execution_id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function FilterButton({ 
  label, 
  count, 
  active, 
  onClick, 
  color = COLORS.textPrimary 
}: { 
  label: string; 
  count: number; 
  active: boolean; 
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: active ? color : COLORS.card,
        border: `1px solid ${active ? color : COLORS.border}`,
        borderRadius: '8px',
        color: active ? '#000' : COLORS.textSecondary,
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        ...MONO,
        transition: 'all 0.15s ease',
      }}
    >
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 600,
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {children}
    </th>
  );
}

function ExecutionRow({ execution, onClick }: { execution: Execution; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? COLORS.cardHover : 'transparent',
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
    >
      <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textSecondary }}>
        {truncateId(execution.execution_id)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <StateBadge state={execution.state} />
      </td>
      <td style={{ padding: '12px 16px' }}>
        <RiskBadge tier={execution.risk_tier} />
      </td>
      <td style={{ 
        padding: '12px 16px', 
        fontSize: '13px', 
        color: COLORS.textPrimary,
        maxWidth: '300px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {execution.objective}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textSecondary }}>
        {execution.step_count || 0}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textSecondary }}>
        {formatLatency(execution.total_latency_ms)}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textMuted }}>
        {relativeTime(execution.created_at)}
      </td>
    </tr>
  );
}

function StateBadge({ state }: { state: ExecutionState }) {
  const color = STATE_COLORS[state];
  return (
    <span style={{
      padding: '4px 8px',
      backgroundColor: `${color}22`,
      border: `1px solid ${color}`,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      color: color,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {state}
    </span>
  );
}

function RiskBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    'T0': COLORS.green,
    'T1': COLORS.blue,
    'T2': COLORS.yellow,
    'T3': COLORS.red,
  };
  const color = colors[tier] || COLORS.gray;
  
  return (
    <span style={{
      padding: '4px 8px',
      backgroundColor: `${color}22`,
      border: `1px solid ${color}`,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      color: color,
      ...MONO,
    }}>
      {tier}
    </span>
  );
}
