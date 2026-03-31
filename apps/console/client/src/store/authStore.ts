/**
 * Auth Store
 * 
 * Global auth state management with JWT tokens and automatic 401 recovery.
 */

import { create } from 'zustand';
import { login, logout, getCurrentUser, register, refreshToken } from '../api/auth.js';
import { setAuthErrorCallback } from '../api/client.js';

interface AuthState {
  // State
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  } | null;
  tenant: {
    id: string;
    name?: string;
    slug?: string;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (params: { email: string; password: string; name?: string; company?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register global 401 handler on store creation
  setAuthErrorCallback(() => {
    console.warn('[AuthStore] Global 401 handler triggered');
    const state = get();
    if (state.refreshToken) {
      // Try to refresh token first
      state.refreshAccessToken().catch(() => {
        // Refresh failed, logout
        set({
          authenticated: false,
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
          error: 'Session expired',
        });
      });
    } else {
      set({
        authenticated: false,
        user: null,
        tenant: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: 'Session expired',
      });
    }
  });
  
  return {
    // Initial state
    authenticated: false,
    user: null,
    tenant: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
    error: null,
    
    // Register action
    register: async (params) => {
      set({ loading: true, error: null });
      try {
        const response = await register(params);
        
        // Store tokens in localStorage
        localStorage.setItem('vienna_access_token', response.tokens.accessToken);
        localStorage.setItem('vienna_refresh_token', response.tokens.refreshToken);
        
        set({
          authenticated: true,
          user: response.user,
          tenant: response.tenant,
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          loading: false,
          error: null,
        });
        return true;
      } catch (error: any) {
        set({
          loading: false,
          error: error?.message || 'Registration failed',
        });
        return false;
      }
    },

    // Login action
    login: async (email: string, password: string) => {
      set({ loading: true, error: null });
      
      try {
        const response = await login(email, password);
        
        // Store tokens in localStorage
        localStorage.setItem('vienna_access_token', response.tokens.accessToken);
        localStorage.setItem('vienna_refresh_token', response.tokens.refreshToken);
        
        set({
          authenticated: true,
          user: response.user,
          tenant: response.tenant,
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          loading: false,
          error: null,
        });
        
        return true;
      } catch (error: any) {
        // Map backend error codes to user-friendly messages
        let errorMessage = 'Login failed';
        
        if (error?.code === 'INVALID_CREDENTIALS') {
          errorMessage = 'Incorrect email or password';
        } else if (error?.code === 'INVALID_REQUEST') {
          errorMessage = 'Invalid login request';
        } else if (error?.code === 'TIMEOUT') {
          errorMessage = 'Login request timed out';
        } else if (error?.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error — check your connection';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        set({
          loading: false,
          error: errorMessage,
        });
        
        return false;
      }
    },

    // OAuth login (receive JWT token from OAuth callback)
    loginWithOAuth: async (token: string) => {
      set({ loading: true, error: null });
      try {
        // Store token
        localStorage.setItem('vienna_access_token', token);
        
        // Fetch user details with the token
        const response = await getCurrentUser();
        
        set({
          authenticated: true,
          user: response.user || null,
          tenant: response.tenant || null,
          accessToken: token,
          refreshToken: null, // OAuth tokens may not have refresh tokens initially
          loading: false,
          error: null,
        });
        return true;
      } catch (error: any) {
        console.error('[AuthStore] OAuth login failed:', error);
        set({
          loading: false,
          error: error?.message || 'OAuth login failed',
        });
        return false;
      }
    },
    
    // Logout action
    logout: async () => {
      set({ loading: true, error: null });
      
      try {
        const state = get();
        await logout(state.refreshToken || undefined);
        
        // Clear tokens from localStorage
        localStorage.removeItem('vienna_access_token');
        localStorage.removeItem('vienna_refresh_token');
        
        set({
          authenticated: false,
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        console.error('[AuthStore] Logout error:', error);
        
        // Clear state anyway
        localStorage.removeItem('vienna_access_token');
        localStorage.removeItem('vienna_refresh_token');
        
        set({
          authenticated: false,
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
          error: null,
        });
      }
    },

    // Check session (on app load)
    checkSession: async () => {
      set({ loading: true, error: null });
      
      try {
        // Try to get current user with stored token
        const storedToken = localStorage.getItem('vienna_access_token');
        const storedRefreshToken = localStorage.getItem('vienna_refresh_token');
        
        if (!storedToken || !storedRefreshToken) {
          set({ authenticated: false, loading: false });
          return;
        }
        
        const response = await getCurrentUser();
        
        set({
          authenticated: true,
          user: response.user || null,
          tenant: response.tenant || null,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        console.warn('[AuthStore] Session check failed:', error);
        
        // Try to refresh token
        const state = get();
        if (state.refreshToken) {
          const refreshed = await state.refreshAccessToken();
          if (!refreshed) {
            // Refresh failed, clear session
            localStorage.removeItem('vienna_access_token');
            localStorage.removeItem('vienna_refresh_token');
            set({ authenticated: false, loading: false });
          }
        } else {
          localStorage.removeItem('vienna_access_token');
          localStorage.removeItem('vienna_refresh_token');
          set({ authenticated: false, loading: false });
        }
      }
    },

    // Refresh access token
    refreshAccessToken: async () => {
      const state = get();
      const storedRefreshToken = state.refreshToken || localStorage.getItem('vienna_refresh_token');
      
      if (!storedRefreshToken) {
        return false;
      }
      
      try {
        const response = await refreshToken(storedRefreshToken);
        
        localStorage.setItem('vienna_access_token', response.accessToken);
        
        set({
          accessToken: response.accessToken,
        });
        
        return true;
      } catch (error) {
        console.error('[AuthStore] Token refresh failed:', error);
        return false;
      }
    },

    // Clear error
    clearError: () => {
      set({ error: null });
    },
  };
});
