/**
 * useAssistantStatus Hook
 * Phase 1: State Truth Model
 * 
 * Unified assistant availability status (separate from raw provider health)
 * 
 * TRUTH: Assistant availability is NOT the same as provider health
 * - Provider health: can Anthropic/Ollama respond?
 * - Assistant availability: can Vienna Chat accept operator messages?
 */

import { useState, useEffect, useCallback } from 'react';

export type AssistantUnavailableReason =
  | 'provider_cooldown'
  | 'runtime_degraded'
  | 'no_providers'
  | 'service_unavailable';

export interface AssistantStatus {
  available: boolean;
  reason: AssistantUnavailableReason | null;
  cooldown_until: string | null;
  providers: Record<string, string>; // provider name → status
  degraded: boolean;
  timestamp: string;
}

export interface UseAssistantStatusResult {
  status: AssistantStatus | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  
  // Convenience accessors
  available: boolean;
  reason: AssistantUnavailableReason | null;
  cooldownUntil: string | null;
  degraded: boolean;
}

export interface UseAssistantStatusOptions {
  refreshInterval?: number; // ms, default 5000 (5s)
  enabled?: boolean; // default true
}

/**
 * Hook to fetch and track assistant availability
 * 
 * Features:
 * - Auto-refresh at interval
 * - Cooldown countdown tracking
 * - Availability detection
 * - Separate from provider health polling
 */
export function useAssistantStatus(options: UseAssistantStatusOptions = {}): UseAssistantStatusResult {
  const { refreshInterval = 5000, enabled = true } = options;
  
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Fetch assistant status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setError(null);
      const response = await fetch('/api/v1/status/assistant');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const json = await response.json();
      
      if (json.success && json.data) {
        setStatus(json.data);
        setLoading(false);
      } else {
        throw new Error(json.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('[useAssistantStatus] Error fetching status:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
      
      // On error, assume unavailable
      setStatus({
        available: false,
        reason: 'service_unavailable',
        cooldown_until: null,
        providers: {},
        degraded: true,
        timestamp: new Date().toISOString(),
      });
    }
  }, [enabled]);
  
  /**
   * Public refresh method
   */
  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);
  
  /**
   * Initial fetch
   */
  useEffect(() => {
    if (enabled) {
      fetchStatus();
    }
  }, [enabled, fetchStatus]);
  
  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!enabled || !refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchStatus();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchStatus]);
  
  return {
    status,
    loading,
    error,
    refresh,
    
    // Convenience accessors
    available: status?.available ?? true, // Default to available until proven otherwise
    reason: status?.reason ?? null,
    cooldownUntil: status?.cooldown_until ?? null,
    degraded: status?.degraded ?? false,
  };
}
