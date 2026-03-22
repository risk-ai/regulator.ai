/**
 * Auth API Client
 * 
 * Authentication endpoints.
 */

import { apiClient } from './client.js';

export interface SessionInfo {
  authenticated: boolean;
  operator?: string;
  sessionId?: string;
  expiresAt?: string;
}

export interface LoginResponse {
  operator: string;
  sessionId: string;
  expiresAt: string;
}

export interface LogoutResponse {
  message: string;
}

/**
 * Login with password
 */
export async function login(password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse, { password: string }>('/auth/login', { password });
}

/**
 * Logout and invalidate session
 */
export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse, Record<string, never>>('/auth/logout', {});
}

/**
 * Check current session status
 */
export async function checkSession(): Promise<SessionInfo> {
  return apiClient.get<SessionInfo>('/auth/session');
}
