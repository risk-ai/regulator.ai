/**
 * DemoBanner — Demo Mode Indicator
 * 
 * Shows when user is viewing sample/demo data.
 * Provides clear path to connect first agent.
 * Collapses to a small pill when dismissed.
 */

import React from 'react';

interface DemoBannerProps {
  isDemoMode: boolean;
  bannerDismissed: boolean;
  hasRealAgents: boolean;
  agentCount: number;
  onDismiss: () => void;
  onNavigate: (section: string) => void;
}

export function DemoBanner({
  isDemoMode,
  bannerDismissed,
  hasRealAgents,
  agentCount,
  onDismiss,
  onNavigate,
}: DemoBannerProps) {
  if (!isDemoMode) return null;

  // Collapsed pill mode (banner was dismissed)
  if (bannerDismissed) {
    return (
      <div
        onClick={() => onNavigate('connect')}
        style={{
          position: 'fixed',
          top: '52px',
          right: '16px',
          zIndex: 998,
          padding: '4px 10px',
          borderRadius: '12px',
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: '11px',
          fontWeight: 600,
          color: '#f59e0b',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          transition: 'all 150ms',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        🧪 Demo
      </div>
    );
  }

  // Full banner
  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)',
      borderBottom: '1px solid rgba(245,158,11,0.15)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      fontFamily: 'var(--font-sans)',
      animation: 'slideInFromTop 200ms ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{ fontSize: '16px' }}>🧪</span>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
            Demo Mode
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            You're viewing sample data. Connect your first agent to see real governance in action.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => onNavigate('connect')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            background: '#f59e0b',
            color: '#000',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Connect Agent →
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(245,158,11,0.2)',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>

      <style>{`
        @keyframes slideInFromTop {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * DemoBadge — Small inline badge for demo data items
 */
export function DemoBadge({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span style={{
      padding: '1px 5px',
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: 700,
      color: '#f59e0b',
      background: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.2)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontFamily: 'var(--font-mono)',
      verticalAlign: 'middle',
      marginLeft: '6px',
    }}>
      DEMO
    </span>
  );
}
