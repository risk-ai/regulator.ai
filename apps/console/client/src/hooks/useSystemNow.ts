/**
 * useSystemNow Hook
 * Phase 5E: Operator "Now" View
 * 
 * Fetch and subscribe to unified system state.
 * Snapshot first, then hydrate via SSE.
 */

import { useState, useEffect, useCallback } from 'react';
import { systemApi, type SystemNowSnapshot } from '../api/system.js';
// import { useViennaStream } from './useViennaStream.js'; // Temporarily disabled

export interface UseSystemNowResult {
  snapshot: SystemNowSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook to access unified system "now" snapshot
 * 
 * Lifecycle:
 * 1. Fetch initial snapshot on mount
 * 2. Subscribe to SSE for real-time updates
 * 3. Hydrate snapshot from relevant SSE events
 * 4. Allow manual refresh
 */
export function useSystemNow(options: {
  refreshInterval?: number; // Auto-refresh interval in ms (default: none)
  hydrateFromSSE?: boolean; // Whether to update from SSE events (default: true)
} = {}): UseSystemNowResult {
  const { refreshInterval, hydrateFromSSE = true } = options;
  
  const [snapshot, setSnapshot] = useState<SystemNowSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Subscribe to SSE stream (disabled temporarily - causing type errors)
  // const { events } = useViennaStream({
  //   enabled: hydrateFromSSE,
  // });
  const events: any[] = [];
  
  /**
   * Fetch snapshot from API
   */
  const fetchSnapshot = useCallback(async () => {
    try {
      console.log('[useSystemNow] Fetching snapshot...');
      setLoading(true);
      setError(null);
      
      const data = await systemApi.getSystemNow();
      console.log('[useSystemNow] Snapshot received:', data);
      
      setSnapshot(data);
      setLastUpdated(new Date());
      setLoading(false);
      console.log('[useSystemNow] Snapshot loaded successfully');
    } catch (err) {
      console.error('[useSystemNow] Error fetching snapshot:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, []);
  
  /**
   * Refresh snapshot (public API)
   */
  const refresh = useCallback(async () => {
    await fetchSnapshot();
  }, [fetchSnapshot]);
  
  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);
  
  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchSnapshot();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, fetchSnapshot]);
  
  /**
   * Hydrate snapshot from SSE events
   * TEMPORARILY DISABLED - SSE hook needs refactoring to expose events array
   */
  // useEffect(() => {
  //   if (!hydrateFromSSE || !snapshot || events.length === 0) return;
  //   // ... hydration logic
  // }, [events, hydrateFromSSE, snapshot]);
  
  return {
    snapshot,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}
