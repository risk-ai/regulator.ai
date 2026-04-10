/**
 * useDemoMode — Demo/Live Data Mode Detection
 * 
 * Users start with a clean workspace (no demo data).
 * Demo data is opt-in via the onboarding wizard (POST /api/v1/demo/seed).
 * 
 * This hook detects whether:
 * - The user has real (non-demo) agents connected
 * - Demo data has been seeded
 * - The user has force-enabled demo mode from Settings
 * 
 * Auto-transitions to live mode when the first real agent connects.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';

const DEMO_DISMISSED_KEY = 'vienna_demo_dismissed';
const DEMO_FORCE_KEY = 'vienna_demo_force';

interface DemoModeState {
  /** True when user has no real agents and demo data exists, or force-enabled */
  isDemoMode: boolean;
  /** True when user has at least 1 non-demo agent */
  hasRealAgents: boolean;
  /** Number of real (non-demo) agents */
  agentCount: number;
  /** Whether the user dismissed the demo banner */
  bannerDismissed: boolean;
  /** Whether demo mode is force-enabled from Settings */
  forcedDemo: boolean;
  /** Loading state while checking agent count */
  loading: boolean;
  /** True when workspace is completely empty (no agents, no demo data) */
  isEmptyWorkspace: boolean;
  /** Dismiss the demo banner (hides it, keeps demo data) */
  dismissBanner: () => void;
  /** Force demo mode on/off from Settings */
  setForcedDemo: (enabled: boolean) => void;
}

export function useDemoMode(): DemoModeState {
  const [agentCount, setAgentCount] = useState<number>(0);
  const [hasDemoAgents, setHasDemoAgents] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(DEMO_DISMISSED_KEY) === 'true';
  });
  const [forcedDemo, setForcedDemoState] = useState(() => {
    return localStorage.getItem(DEMO_FORCE_KEY) === 'true';
  });

  // Check agent count, distinguishing real from demo agents
  const checkAgents = useCallback(async () => {
    try {
      const response = await apiClient.get<any[]>('/agents').catch(() => ({ data: [] }));
      const agents = (response as any)?.data || response || [];
      const agentList = Array.isArray(agents) ? agents : [];
      
      // An agent is "real" only if it has a recent heartbeat (< 1 hour old).
      // Seed/demo data has heartbeats from days/weeks ago.
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();
      
      const realAgents = agentList.filter((a: any) => {
        if (a.name?.startsWith('[Demo]')) return false;
        if (!a.last_heartbeat) return false;
        const hbAge = now - new Date(a.last_heartbeat).getTime();
        return hbAge < ONE_HOUR_MS;
      });
      const demoAgents = agentList.filter((a: any) => 
        a.name?.startsWith('[Demo]') || 
        !a.last_heartbeat || 
        (now - new Date(a.last_heartbeat).getTime()) >= ONE_HOUR_MS
      );
      
      // If we transition from 0 → 1+ real agents, clear the dismissed state
      if (realAgents.length > 0 && agentCount === 0 && !loading) {
        setBannerDismissed(false);
        localStorage.removeItem(DEMO_DISMISSED_KEY);
      }
      
      setAgentCount(realAgents.length);
      setHasDemoAgents(demoAgents.length > 0);
    } catch {
      setAgentCount(0);
      setHasDemoAgents(false);
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
  const isEmptyWorkspace = !hasRealAgents && !hasDemoAgents && !loading;
  
  // Demo mode is active when: force-enabled OR (has demo agents but no real agents)
  const isDemoMode = forcedDemo || (hasDemoAgents && !hasRealAgents && !loading);

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
    isEmptyWorkspace,
    dismissBanner,
    setForcedDemo,
  };
}
