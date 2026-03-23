/**
 * Live Activity Feed Component
 * Phase 5E: Operator "Now" View
 * 
 * Real-time stream of meaningful execution events.
 * Newest first, filterable, deduplicated.
 */

import React, { useState, useMemo } from 'react';
import type { ActivityEvent } from '../api/system.js';
import './LiveActivityFeed.css';

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  maxEvents?: number;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  events,
  maxEvents = 50,
}) => {
  const [filter, setFilter] = useState<'all' | 'failures' | 'alerts'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  
  /**
   * Filter events based on selection
   */
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (filter === 'failures') {
      filtered = events.filter(e =>
        e.type.includes('failed') ||
        e.severity === 'critical'
      );
    } else if (filter === 'alerts') {
      filtered = events.filter(e =>
        e.type === 'alert.created' ||
        e.severity === 'warning' ||
        e.severity === 'critical'
      );
    }
    
    return filtered.slice(0, maxEvents);
  }, [events, filter, maxEvents]);
  
  /**
   * Get event icon based on type
   */
  const getEventIcon = (event: ActivityEvent): string => {
    if (event.type.includes('failed')) return '❌';
    if (event.type.includes('completed')) return '✅';
    if (event.type.includes('started')) return '▶️';
    if (event.type === 'alert.created') return '⚠️';
    if (event.type.includes('provider')) return '🔌';
    if (event.type.includes('objective')) return '🎯';
    return '📝';
  };
  
  /**
   * Get severity badge class
   */
  const getSeverityClass = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'warning': return 'severity-warning';
      case 'info':
      default: return 'severity-info';
    }
  };
  
  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  return (
    <div className="live-activity-feed">
      <div className="feed-header">
        <h3>Live Activity</h3>
        <div className="feed-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Events</option>
            <option value="failures">Failures Only</option>
            <option value="alerts">Alerts Only</option>
          </select>
          
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
      </div>
      
      <div className="feed-list" data-auto-scroll={autoScroll}>
        {filteredEvents.length === 0 ? (
          <div className="feed-empty">
            <p>No events to display</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className={`feed-item ${getSeverityClass(event.severity)}`}
            >
              <div className="feed-item-icon">{getEventIcon(event)}</div>
              
              <div className="feed-item-content">
                <div className="feed-item-summary">
                  {event.summary}
                </div>
                
                <div className="feed-item-meta">
                  <span className="feed-item-time">{formatTime(event.timestamp)}</span>
                  
                  {event.objectiveId && (
                    <span className="feed-item-tag objective-tag">
                      {event.objectiveId.substring(0, 12)}
                    </span>
                  )}
                  
                  {event.envelopeId && (
                    <span className="feed-item-tag envelope-tag">
                      {event.envelopeId.substring(0, 12)}
                    </span>
                  )}
                  
                  {event.provider && (
                    <span className="feed-item-tag provider-tag">
                      {event.provider}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="feed-footer">
        Showing {filteredEvents.length} of {events.length} events
      </div>
    </div>
  );
};
