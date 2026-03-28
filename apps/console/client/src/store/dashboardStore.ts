/**
 * Dashboard Store
 * 
 * Global Zustand store for Vienna Operator Shell state
 */

import { create } from 'zustand';
import type { SystemStatus, ObjectiveSummary, DecisionItem } from '../api/types.js';
import type { ServiceStatus, ProvidersResponse } from '../api/system.js';
import type { ChatHistoryItem } from '../api/chat.js';

export interface DashboardState {
  // System state
  systemStatus: SystemStatus | null;
  services: ServiceStatus[];
  providers: ProvidersResponse | null;
  
  // Objectives & Decisions
  objectives: ObjectiveSummary[];
  decisions: DecisionItem[];
  
  // Chat state
  currentThreadId: string | null;
  chatMessages: ChatHistoryItem[];
  chatLoading: boolean;
  
  // Connection state
  sseConnected: boolean;
  lastUpdate: string | null;
  
  // Loading states
  loading: {
    status: boolean;
    services: boolean;
    providers: boolean;
  };
  
  // Errors
  errors: {
    status?: string;
    services?: string;
    providers?: string;
    chat?: string;
  };
  
  // Actions
  setSystemStatus: (status: SystemStatus) => void;
  setServices: (services: ServiceStatus[]) => void;
  setProviders: (providers: ProvidersResponse) => void;
  addObjective: (objective: ObjectiveSummary) => void;
  updateObjective: (objectiveId: string, updates: Partial<ObjectiveSummary>) => void;
  setObjectives: (objectives: ObjectiveSummary[]) => void;
  addDecision: (decision: DecisionItem) => void;
  removeDecision: (decisionId: string) => void;
  setDecisions: (decisions: DecisionItem[]) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  addChatMessage: (message: ChatHistoryItem) => void;
  setChatMessages: (messages: ChatHistoryItem[]) => void;
  setChatLoading: (loading: boolean) => void;
  setSSEConnected: (connected: boolean) => void;
  setLoading: (key: keyof DashboardState['loading'], loading: boolean) => void;
  setError: (key: keyof DashboardState['errors'], error: string | undefined) => void;
  clearErrors: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Initial state
  systemStatus: null,
  services: [],
  providers: null,
  objectives: [],
  decisions: [],
  currentThreadId: null,
  chatMessages: [],
  chatLoading: false,
  sseConnected: false,
  lastUpdate: null,
  loading: {
    status: false,
    services: false,
    providers: false,
  },
  errors: {},
  
  // Actions
  setSystemStatus: (status) => set({ 
    systemStatus: status, 
    lastUpdate: new Date().toISOString() 
  }),
  
  setServices: (services) => set({ 
    services, 
    lastUpdate: new Date().toISOString() 
  }),
  
  setProviders: (providers) => set({ 
    providers, 
    lastUpdate: new Date().toISOString() 
  }),
  
  addObjective: (objective) => set((state) => ({
    objectives: [objective, ...state.objectives],
    lastUpdate: new Date().toISOString()
  })),
  
  updateObjective: (objectiveId, updates) => set((state) => ({
    objectives: state.objectives.map(obj => 
      obj.objective_id === objectiveId ? { ...obj, ...updates } : obj
    ),
    lastUpdate: new Date().toISOString()
  })),
  
  setObjectives: (objectives) => set({
    objectives,
    lastUpdate: new Date().toISOString()
  }),
  
  addDecision: (decision) => set((state) => ({
    decisions: [decision, ...state.decisions],
    lastUpdate: new Date().toISOString()
  })),
  
  removeDecision: (decisionId) => set((state) => ({
    decisions: state.decisions.filter(d => d.decision_id !== decisionId),
    lastUpdate: new Date().toISOString()
  })),
  
  setDecisions: (decisions) => set({
    decisions,
    lastUpdate: new Date().toISOString()
  }),
  
  setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),
  
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message],
  })),
  
  setChatMessages: (messages) => set({ chatMessages: messages }),
  
  setChatLoading: (loading) => set({ chatLoading: loading }),
  
  setSSEConnected: (connected) => set({ sseConnected: connected }),
  
  setLoading: (key, loading) => set((state) => ({
    loading: { ...state.loading, [key]: loading },
  })),
  
  setError: (key, error) => set((state) => ({
    errors: { ...state.errors, [key]: error },
  })),
  
  clearErrors: () => set({ errors: {} }),
}));
