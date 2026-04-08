/**
 * Status Card — Vienna OS
 * 
 * Premier card component with clean borders, proper spacing, and semantic colors.
 */

import React from 'react';

interface StatusCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'amber';
}

const accentBorders: Record<string, string> = {
  default: 'var(--border-subtle)',
  success: 'rgba(74, 222, 128, 0.2)',
  warning: 'rgba(251, 191, 36, 0.2)',
  error: 'rgba(248, 113, 113, 0.2)',
  info: 'rgba(96, 165, 250, 0.2)',
  amber: 'rgba(245, 158, 11, 0.2)',
};

export function StatusCard({ title, children, className = '', accent = 'default' }: StatusCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-primary)',
        border: `1px solid ${accentBorders[accent]}`,
        borderRadius: '12px',
        padding: '20px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h3 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '16px',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  value: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
}

const statusColors: Record<string, string> = {
  healthy: 'var(--success-text)',
  warning: 'var(--warning-text)',
  critical: 'var(--error-text)',
  neutral: 'var(--text-secondary)',
};

export function StatusRow({ label, value, status = 'neutral' }: StatusRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 0',
    }}>
      <span style={{
        fontSize: '13px',
        color: 'var(--text-tertiary)',
        fontWeight: 400,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '13px',
        fontWeight: 600,
        color: statusColors[status],
        fontFamily: 'var(--font-mono)',
      }}>
        {value}
      </span>
    </div>
  );
}
