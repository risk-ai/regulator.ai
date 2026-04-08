/**
 * Fleet Stats Row Component
 * 
 * Enhanced stats row displaying aggregate fleet metrics
 * Shows: Total agents by status, average trust, risk tier breakdown, pending approvals
 */

import React from 'react';

// ============================================================================
// CSS Tokens
// ============================================================================

const COLORS = {
  card: 'var(--bg-primary)',
  border: 'var(--border-subtle)',
  green: 'var(--success-text)',
  yellow: 'var(--warning-text)',
  red: 'var(--error-text)',
  blue: 'var(--info-text)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-tertiary)',
};

const RISK_TIER_COLORS = {
  T0: '#10b981',
  T1: '#10b981',
  T2: '#fbbf24',
  T3: '#ef4444',
} as const;

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" };

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  label,
  value,
  unit,
  color,
  secondaryValue,
  children,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  secondaryValue?: { label: string; value: string | number };
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        padding: '12px 16px',
        flex: '1 1 0',
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <div
          style={{
            ...MONO,
            fontSize: 24,
            fontWeight: 700,
            color: color || COLORS.textPrimary,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {unit && (
          <span
            style={{
              ...MONO,
              fontSize: 11,
              color: COLORS.textSecondary,
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {secondaryValue && (
        <div
          style={{
            ...MONO,
            fontSize: 10,
            color: COLORS.textMuted,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{secondaryValue.label}</span>
          <span>{secondaryValue.value}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Status Breakdown Mini Chart
// ============================================================================

function StatusBreakdown({
  activeCount,
  idleCount,
  suspendedCount,
}: {
  activeCount: number;
  idleCount: number;
  suspendedCount: number;
}) {
  const total = activeCount + idleCount + suspendedCount;
  if (total === 0) return null;

  const activePercent = (activeCount / total) * 100;
  const idlePercent = (idleCount / total) * 100;
  const suspendedPercent = (suspendedCount / total) * 100;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 4,
          borderRadius: 2,
          overflow: 'hidden',
          flex: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      >
        {activePercent > 0 && (
          <div
            style={{
              width: `${activePercent}%`,
              background: COLORS.green,
            }}
          />
        )}
        {idlePercent > 0 && (
          <div
            style={{
              width: `${idlePercent}%`,
              background: COLORS.yellow,
            }}
          />
        )}
        {suspendedPercent > 0 && (
          <div
            style={{
              width: `${suspendedPercent}%`,
              background: COLORS.red,
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 9, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
        <span style={{ color: COLORS.green }}>●{activeCount}</span>
        <span style={{ color: COLORS.yellow }}>●{idleCount}</span>
        <span style={{ color: COLORS.red }}>●{suspendedCount}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Risk Tier Breakdown
// ============================================================================

function RiskTierBreakdown({
  t0: t0Count,
  t1: t1Count,
  t2: t2Count,
  t3: t3Count,
}: {
  t0: number;
  t1: number;
  t2: number;
  t3: number;
}) {
  const total = t0Count + t1Count + t2Count + t3Count;
  if (total === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginTop: 8,
      }}
    >
      {[
        { tier: 'T0', count: t0Count, color: RISK_TIER_COLORS.T0 },
        { tier: 'T1', count: t1Count, color: RISK_TIER_COLORS.T1 },
        { tier: 'T2', count: t2Count, color: RISK_TIER_COLORS.T2 },
        { tier: 'T3', count: t3Count, color: RISK_TIER_COLORS.T3 },
      ].map(({ tier, count, color }) => (
        <div
          key={tier}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: 6,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${color}33`,
            borderRadius: 4,
          }}
        >
          <div style={{ ...MONO, fontSize: 9, color, fontWeight: 600, marginBottom: 2 }}>
            {tier}
          </div>
          <div style={{ ...MONO, fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>
            {count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Fleet Stats Row Component
// ============================================================================

export interface FleetStatsRowProps {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  suspendedAgents: number;
  avgTrustScore: number;
  t0Count: number;
  t1Count: number;
  t2Count: number;
  t3Count: number;
  pendingApprovals: number;
  actionsToday: number;
  avgLatencyMs: number;
  unresolvedAlerts: number;
}

export function FleetStatsRow({
  totalAgents,
  activeAgents,
  idleAgents,
  suspendedAgents,
  avgTrustScore,
  t0Count,
  t1Count,
  t2Count,
  t3Count,
  pendingApprovals,
  actionsToday,
  avgLatencyMs,
  unresolvedAlerts,
}: FleetStatsRowProps) {
  const trendColor = avgTrustScore > 70 ? COLORS.green : avgTrustScore >= 40 ? COLORS.yellow : COLORS.red;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {/* Total Agents */}
      <StatCard
        label="Total Agents"
        value={totalAgents}
        color={COLORS.textPrimary}
        secondaryValue={{ label: 'Registered', value: totalAgents }}
      >
        <StatusBreakdown
          activeCount={activeAgents}
          idleCount={idleAgents}
          suspendedCount={suspendedAgents}
        />
      </StatCard>

      {/* Average Trust Score */}
      <StatCard
        label="Avg Trust Score"
        value={Math.round(avgTrustScore)}
        unit="%"
        color={trendColor}
        secondaryValue={{ label: 'Fleet health', value: trendColor === COLORS.green ? '✓ Good' : trendColor === COLORS.yellow ? '⚠ Fair' : '✗ Low' }}
      />

      {/* Actions Today */}
      <StatCard
        label="Actions Today"
        value={actionsToday}
        color={COLORS.blue}
        secondaryValue={{ label: 'Real-time', value: 'flowing' }}
      />

      {/* Avg Latency */}
      <StatCard
        label="Avg Latency"
        value={avgLatencyMs}
        unit="ms"
        color={avgLatencyMs > 1000 ? COLORS.yellow : COLORS.green}
        secondaryValue={{
          label: 'Status',
          value: avgLatencyMs > 1000 ? '⚠ Slow' : '✓ Fast',
        }}
      />

      {/* Unresolved Alerts */}
      <StatCard
        label="Unresolved Alerts"
        value={unresolvedAlerts}
        color={unresolvedAlerts > 0 ? COLORS.yellow : COLORS.green}
        secondaryValue={{
          label: 'Status',
          value: unresolvedAlerts > 0 ? `${unresolvedAlerts} pending` : 'All clear',
        }}
      />

      {/* Pending Approvals */}
      {pendingApprovals > 0 && (
        <StatCard
          label="⚡ Pending Approvals"
          value={pendingApprovals}
          color={COLORS.yellow}
          secondaryValue={{
            label: 'Status',
            value: 'Awaiting',
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Enhanced Row with Tier Breakdown (alternative display)
// ============================================================================

export function FleetStatsRowCompact({
  totalAgents,
  activeAgents,
  idleAgents,
  suspendedAgents,
  avgTrustScore,
  t0Count,
  t1Count,
  t2Count,
  t3Count,
  pendingApprovals,
  actionsToday,
  avgLatencyMs,
  unresolvedAlerts,
}: FleetStatsRowProps) {
  const trendColor = avgTrustScore > 70 ? COLORS.green : avgTrustScore >= 40 ? COLORS.yellow : COLORS.red;

  return (
    <div>
      {/* Primary Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <StatCard
          label="Fleet Status"
          value={totalAgents}
          color={COLORS.textPrimary}
        />
        <StatCard
          label="Avg Trust Score"
          value={Math.round(avgTrustScore)}
          unit="%"
          color={trendColor}
        />
        <StatCard
          label="Unresolved Alerts"
          value={unresolvedAlerts}
          color={unresolvedAlerts > 0 ? COLORS.yellow : COLORS.green}
        />
        {pendingApprovals > 0 && (
          <StatCard
            label="⚡ Pending Approvals"
            value={pendingApprovals}
            color={COLORS.yellow}
          />
        )}
      </div>

      {/* Status breakdown */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '12px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Status Breakdown
        </div>
        <StatusBreakdown
          activeCount={activeAgents}
          idleCount={idleAgents}
          suspendedCount={suspendedAgents}
        />
      </div>

      {/* Risk tier breakdown */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '12px 16px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Risk Tier Distribution
        </div>
        <RiskTierBreakdown t0={t0Count} t1={t1Count} t2={t2Count} t3={t3Count} />
      </div>
    </div>
  );
}
