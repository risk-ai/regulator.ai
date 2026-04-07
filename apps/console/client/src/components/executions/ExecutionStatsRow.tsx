/**
 * ExecutionStatsRow Component
 * 
 * Displays top-level execution statistics in a responsive grid.
 * Shows: Total, Executed, Denied, Pending, Failed, Avg Duration
 */

import React from 'react';

interface ExecutionStats {
  total_executions?: number | string;
  executed?: number | string;
  denied?: number | string;
  pending?: number | string;
  failed?: number | string;
  executing?: number | string;
  avg_latency_ms?: number | string;
  avg_duration_ms?: number | string;
}

interface StatCardProps {
  value: string | number;
  label: string;
  color: string;
  icon: string;
  subtext?: string;
}

function formatDuration(ms: number | string | null | undefined): string {
  if (!ms) return '—';
  const n = typeof ms === 'string' ? parseInt(ms) : ms;
  if (isNaN(n)) return '—';
  if (n < 1000) return `${n}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${(n / 60000).toFixed(1)}m`;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color, icon, subtext }) => {
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        borderRadius: '10px',
        padding: '18px 20px',
        borderLeft: `3px solid ${color}`,
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: color,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            marginBottom: '4px',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {subtext && (
          <div
            style={{
              fontSize: '9px',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            {subtext}
          </div>
        )}
      </div>
      <div style={{ fontSize: '28px', opacity: 0.5, flexShrink: 0 }}>{icon}</div>
    </div>
  );
};

interface ExecutionStatsRowProps {
  stats: ExecutionStats | null;
  loading?: boolean;
}

export const ExecutionStatsRow: React.FC<ExecutionStatsRowProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '10px',
              padding: '18px 20px',
              height: '80px',
              animation: 'pulse 2s infinite',
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const total = Number(stats.total_executions) || 0;
  const executed = Number(stats.executed) || 0;
  const denied = Number(stats.denied) || 0;
  const pending = Number(stats.pending) || 0;
  const failed = Number(stats.failed) || 0;
  const executing = Number(stats.executing) || 0;
  const avgLatency = stats.avg_latency_ms || stats.avg_duration_ms || 0;

  // Calculate completion percentage
  const completionPercentage =
    total > 0 ? Math.round(((executed + denied + failed) / total) * 100) : 0;

  return (
    <div style={{ marginBottom: '20px' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <StatCard
          value={total}
          label="Total Executions"
          color="#818cf8"
          icon="📊"
          subtext={`${completionPercentage}% completed`}
        />
        <StatCard
          value={executed}
          label="Executed"
          color="#10b981"
          icon="✅"
          subtext={total > 0 ? `${Math.round((executed / total) * 100)}% of total` : undefined}
        />
        <StatCard
          value={denied}
          label="Denied"
          color="#fbbf24"
          icon="⊘"
          subtext={total > 0 ? `${Math.round((denied / total) * 100)}% of total` : undefined}
        />
        <StatCard
          value={failed}
          label="Failed"
          color="#ef4444"
          icon="❌"
          subtext={total > 0 ? `${Math.round((failed / total) * 100)}% of total` : undefined}
        />
        <StatCard
          value={pending + executing}
          label="In Progress"
          color="#f59e0b"
          icon="⏳"
          subtext={`${pending} queued, ${executing} executing`}
        />
        <StatCard
          value={formatDuration(avgLatency)}
          label="Avg Duration"
          color="#06b6d4"
          icon="⚡"
        />
      </div>
    </div>
  );
};

export default ExecutionStatsRow;
