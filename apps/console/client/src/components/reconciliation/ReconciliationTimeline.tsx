/**
 * Reconciliation Timeline
 * 
 * Phase 10.5: Event feed showing reconciliation lifecycle
 * Replaces generic audit trail with runtime narrative
 */

import { useState, useEffect } from 'react';
import { reconciliationApi, type TimelineEvent } from '../../api/reconciliation.js';
import './ReconciliationTimeline.css';

export function ReconciliationTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 100; // Fixed limit for Phase 10.5

  // Fetch timeline every 10 seconds
  useEffect(() => {
    fetchTimeline();

    const interval = setInterval(fetchTimeline, 10000);
    return () => clearInterval(interval);
  }, [limit]);

  const fetchTimeline = async () => {
    try {
      const result = await reconciliationApi.getTimeline(limit);
      setEvents(result.events);
      setError(null);
    } catch (err) {
      console.error('[ReconciliationTimeline] Error fetching timeline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getEventClass = (eventType: string): string => {
    // Info events (blue)
    if (['drift_detected', 'reconciliation_admitted', 'first_evaluation'].includes(eventType)) {
      return 'info';
    }

    // Running/success events (green)
    if (['execution_started', 'execution_completed', 'recovered', 'healthy', 'healthy_confirmed'].includes(eventType)) {
      return 'success';
    }

    // Warning events (yellow)
    if (['reconciliation_skipped', 'cooldown_entered', 'monitoring_resumed'].includes(eventType)) {
      return 'warning';
    }

    // Error events (red)
    if (['execution_timeout', 'execution_failed', 'degraded', 'verification_failed'].includes(eventType)) {
      return 'error';
    }

    return 'neutral';
  };

  const getEventIcon = (eventType: string): string => {
    const eventClass = getEventClass(eventType);

    switch (eventClass) {
      case 'info': return '●';
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return '○';
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="reconciliation-timeline">
        <div className="panel-header">
          <h3>Reconciliation Timeline</h3>
          <span className="event-count">Loading...</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading timeline...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reconciliation-timeline">
        <div className="panel-header">
          <h3>Reconciliation Timeline</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="reconciliation-timeline">
        <div className="panel-header">
          <h3>Reconciliation Timeline</h3>
          <span className="event-count">0 events</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            No recent reconciliation events.<br />
            <span className="text-muted">Timeline will populate when objectives are evaluated.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reconciliation-timeline">
      <div className="panel-header">
        <h3>Reconciliation Timeline</h3>
        <span className="event-count">Last {events.length} events</span>
      </div>

      <div className="panel-body">
        <div className="timeline-container">
          {events.map((event, index) => {
            const eventClass = getEventClass(event.event_type);
            const icon = getEventIcon(event.event_type);

            return (
              <div key={`${event.timestamp}-${index}`} className={`timeline-event ${eventClass}`}>
                <div className="event-time">
                  {formatTime(event.timestamp)}
                </div>
                <div className="event-icon">
                  <span className={`icon ${eventClass}`}>{icon}</span>
                </div>
                <div className="event-content">
                  <div className="event-header">
                    <span className="event-objective">{event.objective_id}</span>
                    {event.generation !== null && (
                      <span className="event-generation">gen {event.generation}</span>
                    )}
                  </div>
                  <div className="event-summary">
                    {event.summary}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
