/**
 * ExecutionStatusBadge Component
 * 
 * Reusable status badge with semantic colors and risk tier accents.
 * Uses design system tokens from variables.css.
 */

import React from 'react';

interface ExecutionStatusBadgeProps {
  status: 'executed' | 'denied' | 'failed' | 'pending' | 'approving' | 'complete' | 'executing' | string;
  riskTier?: 'T0' | 'T1' | 'T2' | 'T3';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// Map execution states to semantic colors
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'executed': {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: '✓',
  },
  'complete': {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: '✓',
  },
  'denied': {
    bg: 'rgba(251, 191, 36, 0.1)',
    text: '#fbbf24',
    border: 'rgba(251, 191, 36, 0.2)',
    icon: '⊘',
  },
  'failed': {
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.2)',
    icon: '✕',
  },
  'pending': {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.2)',
    icon: '⊙',
  },
  'approving': {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '◐',
  },
  'executing': {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '⟳',
  },
};

// Marketing tier colors matching design system
const TIER_COLORS: Record<string, string> = {
  'T0': '#10b981', // Emerald (safe)
  'T1': '#3b82f6', // Blue (moderate)
  'T2': '#fbbf24', // Amber (elevated)
  'T3': '#ef4444', // Red (critical)
};

export const ExecutionStatusBadge: React.FC<ExecutionStatusBadgeProps> = ({
  status,
  riskTier,
  size = 'md',
  showIcon = true,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const tierColor = riskTier ? TIER_COLORS[riskTier] : undefined;

  // Size configuration
  const sizeConfig = {
    sm: { padding: '2px 6px', fontSize: '9px', gap: '3px' },
    md: { padding: '3px 8px', fontSize: '10px', gap: '4px' },
    lg: { padding: '4px 10px', fontSize: '11px', gap: '5px' },
  };

  const sz = sizeConfig[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.gap,
        padding: sz.padding,
        borderRadius: '4px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontSize: sz.fontSize,
        // Left border accent for tier (if provided)
        borderLeft: tierColor ? `3px solid ${tierColor}` : undefined,
        position: 'relative',
      }}
      title={riskTier ? `${status} · Risk Tier ${riskTier}` : status}
    >
      {showIcon && <span style={{ fontSize: size === 'sm' ? '8px' : '10px' }}>{config.icon}</span>}
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};

export default ExecutionStatusBadge;
