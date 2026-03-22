/**
 * Dashboard Store
 * 
 * Global Zustand store for Vienna Operator Shell state
 */

import { create } from 'zustand';
import type { SystemStatus } from '../api/types.js';
import type { ServiceStatus, ProvidersResponse } from '../api/system.js';
import type { ChatHistoryItem } from '../api/chat.js';

export interface DashboardState {
  // System state
  systemStatus: SystemStatus | null;
  services: ServiceStatus[];
  providers: ProvidersResponse | null;
  
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
