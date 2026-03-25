/**
 * Top Status Bar — Vienna OS
 * 
 * Premier design: clean status indicators, branded header, professional spacing.
 * Uses CSS variables from the Vienna Design System.
 */

import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore.js';
import { useAuthStore } from '../../store/authStore.js';

export function TopStatusBar() {
  const systemStatus = useDashboardStore((state) => state.systemStatus);
  const sseConnected = useDashboardStore((state) => state.sseConnected);
  const { operator, logout } = useAuthStore();
  
  const handleLogout = async () => {
    if (confirm('Logout from Vienna Console?')) {
      await logout();
    }
  };
  
  const systemState = systemStatus?.system_state || 'loading';
  const executorState = systemStatus?.executor_state || 'loading';
  const queueDepth = systemStatus?.queue_depth ?? 0;
  
  const stateColors: Record<string, string> = {
    healthy: '#4ade80',
    running: '#4ade80',
    degraded: '#fbbf24',
    paused: '#fbbf24',
    recovering: '#fb923c',
    critical: '#f87171',
    stopped: '#f87171',
    offline: '#6b7280',
    loading: '#6b7280',
  };
  
  return (
    <header style={{
      background: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left: Brand + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Vienna<span style={{ color: '#7c3aed' }}>OS</span>
          </span>
        </div>
        
        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-default)' }} />
        
        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusPill 
            color={stateColors[systemState] || '#6b7280'} 
            label={systemState === 'healthy' ? 'Healthy' : systemState.charAt(0).toUpperCase() + systemState.slice(1)} 
          />
          <StatusPill 
            color={stateColors[executorState] || '#6b7280'} 
            label={`Executor: ${executorState}`} 
          />
          {queueDepth > 0 && (
            <StatusPill 
              color="#60a5fa" 
              label={`Queue: ${queueDepth}`} 
            />
          )}
        </div>
      </div>
      
      {/* Right: Connection + Operator + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Connection */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          background: sseConnected ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)',
          border: `1px solid ${sseConnected ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`,
        }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: sseConnected ? '#4ade80' : '#f87171',
            boxShadow: sseConnected ? '0 0 6px rgba(74, 222, 128, 0.4)' : 'none',
          }} />
          <span style={{ 
            fontSize: '12px', 
            color: sseConnected ? '#4ade80' : '#f87171',
            fontWeight: 500,
          }}>
            {sseConnected ? 'Live' : 'Reconnecting…'}
          </span>
        </div>
        
        {/* Operator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: '#a78bfa',
          }}>
            {(operator || 'V').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {operator || 'Operator'}
          </span>
        </div>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: 'var(--text-tertiary)',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
            e.currentTarget.style.background = 'none';
          }}
          title="Logout"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: '100px',
      background: `${color}10`,
      border: `1px solid ${color}20`,
      fontSize: '12px',
      fontWeight: 500,
      color: color,
      whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
      }} />
      {label}
    </div>
  );
}
