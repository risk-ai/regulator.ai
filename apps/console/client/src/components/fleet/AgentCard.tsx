/**
 * Agent Card Component
 * 
 * Premium agent status card for FleetDashboardPage
 * Displays: name, status, trust score, last activity, warrant, risk tier
 */

import React from 'react';
import type { FleetAgent } from '../../api/fleet.js';
import { RISK_TIER_COLORS, RISK_TIER_LABELS } from '../../constants/riskTiers.js';

// ============================================================================
// CSS Tokens (from variables.css)
// ============================================================================

const COLORS = {
  bg: 'var(--bg-app)',
  card: 'var(--bg-primary)',
  cardHover: 'var(--bg-secondary)',
  border: 'var(--border-subtle)',
  borderActive: 'var(--border-default)',
  borderStrong: 'var(--border-strong)',
  green: 'var(--success-text)',
  yellow: 'var(--warning-text)',
  red: 'var(--error-text)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-tertiary)',
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.green,
  idle: COLORS.yellow,
  suspended: COLORS.red,
  terminated: COLORS.textMuted,
};

const WARRANT_COLORS: Record<string, string> = {
  'Active Warrant': COLORS.green,
  'No Warrant': COLORS.textMuted,
  'Expired': COLORS.red,
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" };

// ============================================================================
// Utility Functions
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

function isStale(ts: string | null, thresholdMs = 300000): boolean {
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() > thresholdMs;
}

function trustColor(score: number): string {
  if (score > 70) return COLORS.green;
  if (score >= 40) return COLORS.yellow;
  return COLORS.red;
}

// ============================================================================
// Pulsing Status Dot
// ============================================================================

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || COLORS.textMuted;
  const isPulsing = status === 'active';
  
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: isPulsing ? `0 0 6px ${color}` : 'none',
        animation: isPulsing ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
      }}
    />
  );
}

// ============================================================================
// Mini Badge
// ============================================================================

function Badge({ text, color, small }: { text: string; color: string; small?: boolean }) {
  return (
    <span
      style={{
        ...MONO,
        fontSize: small ? 9 : 10,
        fontWeight: 600,
        color,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        borderRadius: 3,
        padding: small ? '1px 4px' : '2px 6px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

// ============================================================================
// Trust Score Bar
// ============================================================================

function TrustBar({ score }: { score: number }) {
  const color = trustColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <span style={{ ...MONO, fontSize: 11, color, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

// ============================================================================
// Agent Card Component
// ============================================================================

export interface AgentCardProps {
  agent: FleetAgent;
  riskTier: 'T0' | 'T1' | 'T2' | 'T3';
  warrantStatus: 'Active Warrant' | 'No Warrant' | 'Expired';
  onClick?: () => void;
  onAdjustTrust?: () => void;
  onSuspend?: () => void;
  onActivate?: () => void;
}

export function AgentCard({
  agent,
  riskTier,
  warrantStatus,
  onClick,
  onAdjustTrust,
  onSuspend,
  onActivate,
}: AgentCardProps) {
  const stale = isStale(agent.last_heartbeat);
  const tierColor = RISK_TIER_COLORS[riskTier];
  const tierLabel = RISK_TIER_LABELS[riskTier];

  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `4px solid ${tierColor}`,
        borderRadius: 6,
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = COLORS.cardHover;
          e.currentTarget.style.borderColor = COLORS.borderActive;
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = COLORS.card;
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header: Status + Name + Risk Tier */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <StatusDot status={agent.status} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.display_name}
            </div>
            <div
              style={{
                ...MONO,
                fontSize: 10,
                color: COLORS.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.agent_id}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
          <Badge text={riskTier} color={tierColor} small />
          <span style={{ ...MONO, fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {tierLabel}
          </span>
        </div>
      </div>

      {/* Trust Score */}
      <div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Trust Score
        </div>
        <TrustBar score={agent.trust_score} />
      </div>

      {/* Last Activity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Last Activity
        </div>
        <span style={{ ...MONO, fontSize: 11, color: stale ? COLORS.red : COLORS.textSecondary }}>
          {relativeTime(agent.last_heartbeat)}
        </span>
      </div>

      {/* Warrant Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Warrant
        </div>
        <Badge text={warrantStatus} color={WARRANT_COLORS[warrantStatus] || COLORS.textMuted} />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {agent.status === 'suspended' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivate?.();
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${COLORS.green}33`,
              background: 'rgba(16,185,129,0.1)',
              color: COLORS.green,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${COLORS.green}66`;
              e.currentTarget.style.background = 'rgba(16,185,129,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${COLORS.green}33`;
              e.currentTarget.style.background = 'rgba(16,185,129,0.1)';
            }}
          >
            ⚡ Activate
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSuspend?.();
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${COLORS.red}33`,
              background: 'rgba(239,68,68,0.1)',
              color: COLORS.red,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${COLORS.red}66`;
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${COLORS.red}33`;
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            }}
          >
            ⏸ Suspend
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdjustTrust?.();
          }}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${COLORS.borderStrong}`,
            background: 'transparent',
            color: COLORS.textSecondary,
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = COLORS.borderActive;
            e.currentTarget.style.color = COLORS.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = COLORS.borderStrong;
            e.currentTarget.style.color = COLORS.textSecondary;
          }}
        >
          🎚 Adjust
        </button>
      </div>
    </div>
  );
}
