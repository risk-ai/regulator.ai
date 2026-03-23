/**
 * useProviderHealth Hook
 * Phase 10.5: Chat Cleanup
 * 
 * Fetch provider health with auto-refresh for real-time cooldown tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { providersApi, type ProvidersHealthSnapshot, type ProviderHealthDetail } from '../api/providers.js';

export interface UseProviderHealthResult {
  health: ProvidersHealthSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  allProvidersUnavailable: boolean;
  anyProviderDegraded: boolean;
  getRecoveryTime: (provider: ProviderHealthDetail) => number | null;
}

export interface UseProviderHealthOptions {
  refreshInterval?: number; // ms, default 5000 (5s)
  enabled?: boolean; // default true
}

/**
 * Hook to fetch and track provider health
 * 
 * Features:
 * - Auto-refresh at interval
 * - Cooldown countdown tracking
 * - Availability detection
 */
export function useProviderHealth(options: UseProviderHealthOptions = {}): UseProviderHealthResult {
  const { refreshInterval = 5000, enabled = true } = options;
  
  const [health, setHealth] = useState<ProvidersHealthSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Fetch provider health from API
   */
  const fetchHealth = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setError(null);
      const data = await providersApi.getHealth();
      setHealth(data);
      setLoading(false);
    } catch (err) {
      console.error('[useProviderHealth] Error fetching health:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [enabled]);
  
  /**
   * Public refresh method
   */
  const refresh = useCallback(async () => {
    await fetchHealth();
  }, [fetchHealth]);
  
  /**
   * Initial fetch
   */
  useEffect(() => {
    if (enabled) {
      fetchHealth();
    }
  }, [enabled, fetchHealth]);
  
  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!enabled || !refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchHealth();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchHealth]);
  
  /**
   * Calculate if all providers are unavailable
   * 
   * TRUTH: "unknown" status means no execution history yet, NOT failure.
   * Only treat "unavailable" as truly unavailable.
   * 
   * WRONG: providers.every(p => p.status !== 'healthy')
   * RIGHT: providers.every(p => p.status === 'unavailable')
   */
  const allProvidersUnavailable = useCallback((): boolean => {
    if (!health || Object.keys(health.providers).length === 0) return false; // No providers = not unavailable, just unconfigured
    
    return Object.values(health.providers).every(
      (p) => p.status === 'unavailable' // ONLY count explicitly unavailable, not unknown/degraded/healthy
    );
  }, [health])();
  
  /**
   * Calculate if any provider is degraded or unavailable
   * 
   * Note: "unknown" is not degraded - it just hasn't been used yet.
   */
  const anyProviderDegraded = useCallback((): boolean => {
    if (!health) return false;
    
    return Object.values(health.providers).some(
      (p) => p.status === 'degraded' || p.status === 'unavailable' // Exclude "unknown"
    );
  }, [health])();
  
  /**
   * Get recovery time for provider (ms from now)
   */
  const getRecoveryTime = useCallback((provider: ProviderHealthDetail): number | null => {
    if (!provider.cooldownUntil) return null;
    
    const cooldownTime = new Date(provider.cooldownUntil).getTime();
    const now = Date.now();
    const remaining = cooldownTime - now;
    
    return remaining > 0 ? remaining : null;
  }, []);
  
  return {
    health,
    loading,
    error,
    refresh,
    allProvidersUnavailable,
    anyProviderDegraded,
    getRecoveryTime,
  };
}
