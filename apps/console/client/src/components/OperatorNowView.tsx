/**
 * Operator "Now" View Component
 * Phase 5E: Unified Operator Command Center
 * 
 * Answers:
 * - What is happening right now?
 * - What needs attention right now?
 * - What is most likely broken right now?
 */

import React from 'react';
import { useSystemNow } from '../hooks/useSystemNow.js';
import { LiveActivityFeed } from './LiveActivityFeed.js';
import { CurrentWorkView } from './CurrentWorkView.js';
import { AttentionPanel } from './AttentionPanel.js';
import './OperatorNowView.css';

export const OperatorNowView: React.FC = () => {
  
  const { snapshot, loading, error, refresh, lastUpdated } = useSystemNow({
    refreshInterval: 5000, // Refresh every 5 seconds
    hydrateFromSSE: true,
  });
  
  
  /**
   * Get system state badge class
   */
  const getSystemStateClass = (state?: string): string => {
    switch (state) {
      case 'healthy': return 'system-healthy';
      case 'degraded': return 'system-degraded';
      case 'critical': return 'system-critical';
      case 'offline': return 'system-offline';
      default: return 'system-unknown';
    }
  };
  
  /**
   * Get system state label
   */
  const getSystemStateLabel = (state?: string): string => {
    switch (state) {
      case 'healthy': return '✓ Healthy';
      case 'degraded': return '⚠ Degraded';
      case 'critical': return '🚨 Critical';
      case 'offline': return '⚫ Offline';
      default: return '? Unknown';
    }
  };
  
  /**
   * Format last updated time
   */
  const formatLastUpdated = (): string => {
    if (!lastUpdated) return 'Never';
    
    const now = Date.now();
    const diff = now - lastUpdated.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    return lastUpdated.toLocaleTimeString();
  };
  
  if (loading && !snapshot) {
    return (
      <div className="operator-now-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading system state...</p>
        </div>
      </div>
    );
  }
  
  if (error && !snapshot) {
    return (
      <div className="operator-now-view">
        <div className="error-state">
          <h3>Error Loading System State</h3>
          <p>{error.message}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }
  
  if (!snapshot) {
    return (
      <div className="operator-now-view">
        <div className="empty-state">
          <p>No system data available</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="operator-now-view">
      {/* Top Bar: System Status, Alerts, Stream State, Freshness */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h2>Operator Command Center</h2>
          <span className={`system-state-badge ${getSystemStateClass(snapshot.systemState)}`}>
            {getSystemStateLabel(snapshot.systemState)}
          </span>
          
          {snapshot.paused && (
            <span className="pause-indicator">
              ⏸ Paused
              {snapshot.pauseReason && ` (${snapshot.pauseReason})`}
            </span>
          )}
        </div>
        
        <div className="top-bar-right">
          <div className="telemetry-status">
            <span className={`stream-indicator ${snapshot.telemetry.live ? 'live' : 'disconnected'}`}>
              {snapshot.telemetry.live ? '🟢 Live' : '🔴 Disconnected'}
            </span>
            
            <span className="last-updated">
              Updated: {formatLastUpdated()}
            </span>
            
            {snapshot.telemetry.degraded && (
              <span className="degraded-badge">⚠ Telemetry Degraded</span>
            )}
          </div>
          
          <button onClick={refresh} className="refresh-button" title="Refresh now">
            🔄
          </button>
        </div>
      </div>
      
      {/* Main Row: Queue Health, Active Objectives, Failure Rate, Provider Summary */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Queue Depth</div>
          <div className="metric-value">{snapshot.queueHealth.depth}</div>
          <div className="metric-detail">
            {snapshot.queueHealth.executing} executing · {snapshot.queueHealth.blocked} blocked
          </div>
          {snapshot.queueHealth.nearCapacity && (
            <div className="metric-alert">⚠ Near capacity</div>
          )}
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Active Objectives</div>
          <div className="metric-value">{snapshot.currentActivity.activeObjectives}</div>
          <div className="metric-detail">
            {snapshot.currentWork.length} executing envelopes
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Failure Rate</div>
          <div className={`metric-value ${snapshot.recentFailures.failureRate > 10 ? 'error' : ''}`}>
            {snapshot.recentFailures.count === 0 ? '—' : `${snapshot.recentFailures.failureRate.toFixed(1)}%`}
          </div>
          <div className="metric-detail">
            {snapshot.recentFailures.count === 0 
              ? 'No failures recorded' 
              : `${snapshot.recentFailures.count} failures · ${snapshot.recentFailures.uniqueEnvelopes} unique`
            }
          </div>
        </div>
        
        <div className="metric-card provider-health-card">
          <div className="metric-label">Provider Health</div>
          <div className="metric-value">
            {snapshot.providerHealth.healthy}/{snapshot.providerHealth.providers.length}
          </div>
          <div className="metric-detail">
            {snapshot.providerHealth.degraded > 0 && `${snapshot.providerHealth.degraded} degraded`}
            {snapshot.providerHealth.unavailable > 0 && ` · ${snapshot.providerHealth.unavailable} offline`}
          </div>
          {(snapshot.providerHealth.degraded > 0 || snapshot.providerHealth.unavailable > 0) && (
            <div className="metric-alert">⚠ Issues detected</div>
          )}
          {/* Provider Details */}
          {snapshot.providerHealth.providers.length > 0 && (
            <div className="provider-details">
              {snapshot.providerHealth.providers.map((provider) => (
                <div key={provider.name} className={`provider-item provider-${provider.state}`}>
                  <span className="provider-name">{provider.name}</span>
                  <span className="provider-state">{provider.state}</span>
                  {provider.failureRate > 0 && (
                    <span className="provider-failures">{provider.failureRate.toFixed(0)}% failures</span>
                  )}
                  {provider.lastRequestAt && (
                    <span className="provider-last-seen">
                      {(() => {
                        const lastSeen = new Date(provider.lastRequestAt);
                        const ageMs = Date.now() - lastSeen.getTime();
                        const ageMins = Math.floor(ageMs / 60000);
                        return ageMins < 1 ? 'now' : `${ageMins}m ago`;
                      })()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Dead Letters</div>
          <div className={`metric-value ${snapshot.deadLetters.growing ? 'error' : ''}`}>
            {snapshot.deadLetters.count}
          </div>
          <div className="metric-detail">
            {snapshot.deadLetters.recentCount} added recently
          </div>
          {snapshot.deadLetters.growing && (
            <div className="metric-alert">📈 Growing</div>
          )}
        </div>
      </div>
      
      {/* Second Row: Attention Panel (spans full width if critical items) */}
      {snapshot.attention.length > 0 && (
        <div className="attention-row">
          <AttentionPanel items={snapshot.attention} />
        </div>
      )}
      
      {/* Third Row: Live Activity Feed + Current Work */}
      <div className="activity-row">
        <div className="activity-column">
          <LiveActivityFeed events={snapshot.recentEvents} maxEvents={50} />
        </div>
        
        <div className="work-column">
          <CurrentWorkView work={snapshot.currentWork} />
        </div>
      </div>
      
      {/* Recent Failures Summary (if > 0) */}
      {snapshot.recentFailures.topErrors.length > 0 && (
        <div className="failures-row">
          <div className="failures-panel">
            <h4>Top Recent Errors</h4>
            <div className="error-list">
              {snapshot.recentFailures.topErrors.map((error, index) => {
                // Classify error type
                const errorCategory = (() => {
                  const msg = error.error.toLowerCase();
                  if (msg.includes('warrant') || msg.includes('unauthorized')) return 'Warrant Violation';
                  if (msg.includes('provider') || msg.includes('anthropic') || msg.includes('openai')) return 'Provider Failure';
                  if (msg.includes('timeout') || msg.includes('timed out')) return 'Execution Timeout';
                  if (msg.includes('validation') || msg.includes('invalid')) return 'Validation Error';
                  if (msg.includes('cannot read') || msg.includes('undefined') || msg.includes('null')) return 'Runtime Error';
                  return 'Execution Error';
                })();
                
                return (
                  <div key={index} className="error-item">
                    <div className="error-category">{errorCategory}</div>
                    <div className="error-message">{error.error}</div>
                    <div className="error-meta">
                      {error.count}× · Last seen {new Date(error.lastSeen).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
