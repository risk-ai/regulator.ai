/**
 * useDemoMode — Demo/Live Data Mode Detection
 * 
 * Detects whether the user has real agents connected.
 * When no agents exist, the console shows demo/sample data with clear labeling.
 * Auto-transitions to live mode when the first agent connects.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';

const DEMO_DISMISSED_KEY = 'vienna_demo_dismissed';
const DEMO_FORCE_KEY = 'vienna_demo_force';

interface DemoModeState {
  /** True when user has no real agents and hasn't force-enabled live mode */
  isDemoMode: boolean;
  /** True when user has at least 1 connected agent */
  hasRealAgents: boolean;
  /** Number of real agents */
  agentCount: number;
  /** Whether the user dismissed the demo banner */
  bannerDismissed: boolean;
  /** Whether demo mode is force-enabled from Settings */
  forcedDemo: boolean;
  /** Loading state while checking agent count */
  loading: boolean;
  /** Dismiss the demo banner (hides it, keeps demo data) */
  dismissBanner: () => void;
  /** Force demo mode on/off from Settings */
  setForcedDemo: (enabled: boolean) => void;
}

export function useDemoMode(): DemoModeState {
  const [agentCount, setAgentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(DEMO_DISMISSED_KEY) === 'true';
  });
  const [forcedDemo, setForcedDemoState] = useState(() => {
    return localStorage.getItem(DEMO_FORCE_KEY) === 'true';
  });

  // Check real agent count
  const checkAgents = useCallback(async () => {
    try {
      const agents = await apiClient.get<any[]>('/fleet/agents').catch(() => []);
      const realAgents = Array.isArray(agents) ? agents.length : 0;
      
      // If we transition from 0 → 1+ agents, clear the dismissed state
      if (realAgents > 0 && agentCount === 0 && !loading) {
        setBannerDismissed(false);
        localStorage.removeItem(DEMO_DISMISSED_KEY);
      }
      
      setAgentCount(realAgents);
    } catch {
      setAgentCount(0);
    } finally {
      setLoading(false);
    }
  }, [agentCount, loading]);

  useEffect(() => {
    checkAgents();
    // Re-check every 30 seconds (in case user connects an agent in another tab)
    const interval = setInterval(checkAgents, 30000);
    return () => clearInterval(interval);
  }, [checkAgents]);

  const hasRealAgents = agentCount > 0;
  
  // Demo mode is active when: no real agents OR user forced demo mode
  const isDemoMode = forcedDemo || (!hasRealAgents && !loading);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    localStorage.setItem(DEMO_DISMISSED_KEY, 'true');
  }, []);

  const setForcedDemo = useCallback((enabled: boolean) => {
    setForcedDemoState(enabled);
    if (enabled) {
      localStorage.setItem(DEMO_FORCE_KEY, 'true');
    } else {
      localStorage.removeItem(DEMO_FORCE_KEY);
    }
  }, []);

  return {
    isDemoMode,
    hasRealAgents,
    agentCount,
    bannerDismissed,
    forcedDemo,
    loading,
    dismissBanner,
    setForcedDemo,
  };
}
