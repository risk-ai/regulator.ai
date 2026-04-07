/**
 * Activity Timeline — Vienna OS Dashboard
 * 
 * Recent governance events with:
 * - Warrant Issued
 * - Policy Evaluated
 * - Execution Blocked
 * - Approval Requested
 * 
 * Auto-refreshes every 15s
 */

import { useEffect, useState } from 'react';
import { reconciliationApi, type TimelineEvent } from '../../api/reconciliation.js';

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  error?: string;
}

export function ActivityTimeline() {
  const [state, setState] = useState<TimelineState>({
    events: [],
    loading: true,
  });

  useEffect(() => {
    loadEvents();
    
    // Refresh every 15s as per requirement
    const interval = setInterval(loadEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    try {
      const result = await reconciliationApi.getTimeline(10);
      setState({
        events: result.events,
        loading: false,
      });
    } catch (error) {
      console.error('[ActivityTimeline] Failed to load events:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load events',
      }));
    }
  };

  const getEventIcon = (eventType: string): string => {
    const typeMap: Record<string, string> = {
      'warrant_issued': '📋',
      'policy_evaluated': '✓',
      'execution_blocked': '🛑',
      'approval_requested': '👤',
      'execution_timeout': '⏱️',
      'cooldown_entry': '❄️',
      'reconciliation_complete': '✔️',
      'degraded_transition': '⚠️',
    };
    return typeMap[eventType.toLowerCase()] || '●';
  };

  const getEventColor = (eventType: string): string => {
    const typeColors: Record<string, string> = {
      'warrant_issued': 'var(--success-text)',
      'policy_evaluated': 'var(--info-text)',
      'execution_blocked': 'var(--error-text)',
      'approval_requested': 'var(--warning-text)',
      'execution_timeout': 'var(--error-text)',
      'cooldown_entry': 'var(--warning-text)',
      'reconciliation_complete': 'var(--success-text)',
      'degraded_transition': 'var(--warning-text)',
    };
    return typeColors[eventType.toLowerCase()] || 'var(--text-secondary)';
  };

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date().getTime();
    const eventTime = new Date(timestamp).getTime();
    const diffMs = now - eventTime;

    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  if (state.loading) {
    return (
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '20px',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          animation: 'pulse 2s infinite',
        }}
      >
        Loading events...
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '20px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '20px',
        }}
      >
        ACTIVITY TIMELINE
      </h3>

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {state.events.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-tertiary)',
            }}
          >
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>No recent events</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Activity will appear here as governance events occur
            </div>
          </div>
        ) : (
          state.events.map((event, i) => (
            <TimelineEventRow key={event.timestamp + '-' + i} event={event} />
          ))
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--success-text)',
            animation: 'pulse 2s infinite',
          }}
        />
        Auto-refresh every 15s
      </div>
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const icon = getEventIcon(event.event_type);
  const color = getEventColor(event.event_type);
  const relativeTime = getRelativeTime(event.timestamp);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: '12px',
        padding: '10px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.02)',
        alignItems: 'flex-start',
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: '16px',
          textAlign: 'center',
          paddingTop: '2px',
        }}
      >
        {icon}
      </div>

      {/* Event Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color,
              textTransform: 'capitalize',
            }}
          >
            {event.event_type.replace(/_/g, ' ')}
          </span>
          {event.objective_id && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {event.objective_id.substring(0, 12)}...
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          {event.summary}
        </div>
      </div>

      {/* Timestamp */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
      >
        {relativeTime}
      </div>
    </div>
  );
}

function getEventIcon(eventType: string): string {
  const typeMap: Record<string, string> = {
    'warrant_issued': '📋',
    'policy_evaluated': '✓',
    'execution_blocked': '🛑',
    'approval_requested': '👤',
    'execution_timeout': '⏱️',
    'cooldown_entry': '❄️',
    'reconciliation_complete': '✔️',
    'degraded_transition': '⚠️',
  };
  return typeMap[eventType.toLowerCase()] || '●';
}

function getEventColor(eventType: string): string {
  const typeColors: Record<string, string> = {
    'warrant_issued': 'var(--success-text)',
    'policy_evaluated': 'var(--info-text)',
    'execution_blocked': 'var(--error-text)',
    'approval_requested': 'var(--warning-text)',
    'execution_timeout': 'var(--error-text)',
    'cooldown_entry': 'var(--warning-text)',
    'reconciliation_complete': 'var(--success-text)',
    'degraded_transition': 'var(--warning-text)',
  };
  return typeColors[eventType.toLowerCase()] || 'var(--text-secondary)';
}
