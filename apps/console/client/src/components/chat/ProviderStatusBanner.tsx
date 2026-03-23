/**
 * Provider Status Banner
 * Phase 1: State Truth Model
 * 
 * Persistent banner showing assistant unavailability (not raw provider health)
 * 
 * TRUTH: Use assistant status, NOT raw provider health
 */

import React, { useState, useEffect } from 'react';
import { useAssistantStatus } from '../../hooks/useAssistantStatus.js';
import { useProviderHealth } from '../../hooks/useProviderHealth.js';

export const ProviderStatusBanner: React.FC = () => {
  const { available, reason, cooldownUntil } = useAssistantStatus({
    refreshInterval: 5000,
  });
  
  const { health } = useProviderHealth({
    refreshInterval: 5000,
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
  const formatRecoveryTime = (cooldownUntilISO: string): string => {
    const cooldownTime = new Date(cooldownUntilISO).getTime();
    const remainingMs = Math.max(0, cooldownTime - now);
    const seconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    return `${seconds}s`;
  };
  
  // Hide banner if assistant available
  if (available) {
    return null;
  }
  
  // Get provider details for context
  const providerStatuses = health?.providers 
    ? Object.entries(health.providers).map(([name, p]) => ({
        name,
        status: p.status,
        cooldown: p.cooldownUntil,
      }))
    : [];
  
  return (
    <div className="provider-status-banner severity-critical">
      <div className="banner-header">
        <span className="banner-icon">🚨</span>
        <span className="banner-title">Assistant Unavailable</span>
      </div>
      
      <div className="banner-body">
        {reason === 'provider_cooldown' && cooldownUntil && (
          <div className="banner-message">
            All providers in cooldown. Assistant will resume when providers recover.
            {cooldownUntil && (
              <div className="recovery-countdown">
                Recovers in: <strong>{formatRecoveryTime(cooldownUntil)}</strong>
              </div>
            )}
          </div>
        )}
        
        {reason === 'runtime_degraded' && (
          <div className="banner-message">
            Runtime degraded. Assistant temporarily disabled while system recovers.
            <div className="recovery-note">
              Runtime operations continue. Operator can still access dashboard and control plane.
            </div>
          </div>
        )}
        
        {reason === 'no_providers' && (
          <div className="banner-message">
            No LLM providers configured or available. Check provider configuration.
          </div>
        )}
        
        {reason === 'service_unavailable' && (
          <div className="banner-message">
            Chat service temporarily unavailable. Please try again later.
          </div>
        )}
        
        {/* Provider details for context */}
        {providerStatuses.length > 0 && (
          <div className="provider-list">
            {providerStatuses.map((ps) => (
              <div key={ps.name} className={`provider-status status-${ps.status}`}>
                <span className="provider-name">{ps.name}</span>
                <span className="provider-state">
                  {ps.status === 'healthy' && '✓ Healthy'}
                  {ps.status === 'degraded' && '⚠ Degraded'}
                  {ps.status === 'unavailable' && '✗ Unavailable'}
                  {ps.status === 'unknown' && '? Not yet used'}
                </span>
                {ps.cooldown && (
                  <span className="provider-recovery">
                    recovers in {formatRecoveryTime(ps.cooldown)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
