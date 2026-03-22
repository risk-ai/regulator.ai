/**
 * Provider Status Banner
 * Phase 10.5: Chat Cleanup
 * 
 * Persistent banner showing provider health issues
 * Replaces error spam in chat messages
 */

import React, { useState, useEffect } from 'react';
import { useProviderHealth } from '../../hooks/useProviderHealth.js';
import type { ProviderHealthDetail } from '../../api/providers.js';

export const ProviderStatusBanner: React.FC = () => {
  const { health, allProvidersUnavailable, anyProviderDegraded, getRecoveryTime } = useProviderHealth({
    refreshInterval: 5000, // Refresh every 5s for countdown
  });
  
  const [now, setNow] = useState(Date.now());
  
  // Update every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  /**
   * Format recovery time as countdown
   */
  const formatRecoveryTime = (recoveryMs: number): string => {
    const seconds = Math.max(0, Math.floor(recoveryMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    return `${seconds}s`;
  };
  
  /**
   * Get banner severity level
   */
  const getSeverity = (): 'critical' | 'warning' | 'info' => {
    if (allProvidersUnavailable) return 'critical';
    if (anyProviderDegraded) return 'warning';
    return 'info';
  };
  
  /**
   * Check if all providers are just unknown (no usage yet)
   */
  const allProvidersUnknown = health && Object.values(health.providers).every(
    (p) => p.status === 'unknown'
  );
  
  // Hide banner if all providers healthy or just unknown (untested but available)
  if (!health || (!allProvidersUnavailable && !anyProviderDegraded && !allProvidersUnknown)) {
    return null;
  }
  
  // Hide banner if all providers are unknown (they're usable, just not tested yet)
  if (allProvidersUnknown) {
    return null;
  }
  
  const severity = getSeverity();
  const providers = Object.values(health.providers);
  
  // Get provider statuses for display
  const providerStatuses: { name: string; status: string; recovery?: string }[] = providers.map((p) => {
    const recoveryMs = getRecoveryTime(p);
    return {
      name: p.provider,
      status: p.status,
      recovery: recoveryMs ? formatRecoveryTime(recoveryMs) : undefined,
    };
  });
  
  return (
    <div className={`provider-status-banner severity-${severity}`}>
      <div className="banner-header">
        <span className="banner-icon">
          {severity === 'critical' && '🚨'}
          {severity === 'warning' && '⚠️'}
          {severity === 'info' && 'ℹ️'}
        </span>
        <span className="banner-title">
          {allProvidersUnavailable && 'Chat Unavailable'}
          {!allProvidersUnavailable && anyProviderDegraded && 'Provider Issues'}
        </span>
      </div>
      
      <div className="banner-body">
        {allProvidersUnavailable && (
          <div className="banner-message">
            All providers in cooldown or unavailable. Chat will resume when providers recover.
          </div>
        )}
        
        <div className="provider-list">
          {providerStatuses.map((ps) => (
            <div key={ps.name} className={`provider-status status-${ps.status}`}>
              <span className="provider-name">{ps.name}</span>
              <span className="provider-state">
                {ps.status === 'healthy' && '✓ Healthy'}
                {ps.status === 'degraded' && '⚠ Degraded'}
                {ps.status === 'unavailable' && '✗ Unavailable'}
                {ps.status === 'unknown' && '? Unknown'}
              </span>
              {ps.recovery && (
                <span className="provider-recovery">
                  recovers in {ps.recovery}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {health.degradedReasons && health.degradedReasons.length > 0 && (
          <div className="degraded-reasons">
            {health.degradedReasons
              .filter(reason => !reason.includes('stale telemetry')) // Hide "stale telemetry" for unknown status
              .map((reason, i) => (
                <div key={i} className="degraded-reason">• {reason}</div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
};
