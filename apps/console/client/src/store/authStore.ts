/**
 * Auth Store
 * 
 * Global auth state management with automatic 401 recovery.
 */

import { create } from 'zustand';
import { login, logout, checkSession } from '../api/auth.js';
import { setAuthErrorCallback } from '../api/client.js';

interface AuthState {
  // State
  authenticated: boolean;
  operator: string | null;
  sessionExpiresAt: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Register global 401 handler on store creation
  setAuthErrorCallback(() => {
    console.warn('[AuthStore] Global 401 handler triggered');
    set({
      authenticated: false,
      operator: null,
      sessionExpiresAt: null,
      loading: false,
      error: 'Session expired',
    });
  });
  
  return {
  // Initial state
  authenticated: false,
  operator: null,
  sessionExpiresAt: null,
  loading: true,
  error: null,
  
  // Login action
  login: async (password: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await login(password);
      
      set({
        authenticated: true,
        operator: response.operator,
        sessionExpiresAt: response.expiresAt,
        loading: false,
        error: null,
      });
      
      return true;
    } catch (error: any) {
      // Map backend error codes to user-friendly messages
      let errorMessage = 'Login failed';
      
      if (error?.code === 'INVALID_CREDENTIALS') {
        errorMessage = 'Incorrect operator password';
      } else if (error?.code === 'INVALID_REQUEST') {
        errorMessage = 'Invalid login request';
      } else if (error?.code === 'TIMEOUT') {
        errorMessage = 'Login request timed out';
      } else if (error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Cannot connect to Vienna backend';
      } else if (error?.code === 'INVALID_CONTENT_TYPE' || error?.code === 'JSON_PARSE_ERROR') {
        errorMessage = 'Unexpected response from server - please check console logs';
        console.error('[AuthStore] Login parse error:', error);
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({
        authenticated: false,
        operator: null,
        sessionExpiresAt: null,
        loading: false,
        error: errorMessage,
      });
      
      return false;
    }
  },
  
  // Logout action
  logout: async () => {
    set({ loading: true });
    
    try {
      await logout();
      
      set({
        authenticated: false,
        operator: null,
        sessionExpiresAt: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear state anyway
      set({
        authenticated: false,
        operator: null,
        sessionExpiresAt: null,
        loading: false,
        error: null,
      });
    }
  },
  
  // Check session action
  checkSession: async () => {
    set({ loading: true });
    
    try {
      const session = await checkSession();
      
      set({
        authenticated: session.authenticated,
        operator: session.operator || null,
        sessionExpiresAt: session.expiresAt || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Session check error:', error);
      
      set({
        authenticated: false,
        operator: null,
        sessionExpiresAt: null,
        loading: false,
        error: null,
      });
    }
  },
  
  // Clear error action
  clearError: () => {
    set({ error: null });
  },
};
});
