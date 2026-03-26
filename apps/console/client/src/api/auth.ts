/**
 * Auth API Client — Vienna OS
 * 
 * Registration, login, logout, session check.
 */

import { apiClient } from './client.js';

export interface SessionInfo {
  authenticated: boolean;
  operator?: string;
  tenantId?: string;
  sessionId?: string;
  expiresAt?: string;
}

export interface LoginResponse {
  operator: string;
  tenantId?: string;
  sessionId: string;
  expiresAt: string;
}

export interface RegisterResponse {
  operator: string;
  tenantId: string;
  plan: string;
  sessionId: string;
  expiresAt: string;
}

export interface LogoutResponse {
  message: string;
}

/**
 * Login with username + password
 */
export async function login(password: string, username?: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse, { username?: string; password: string }>(
    '/auth/login',
    { username, password }
  );
}

/**
 * Register new operator account
 */
export async function register(params: {
  username: string;
  password: string;
  email?: string;
  company?: string;
  plan?: string;
}): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse, typeof params>('/auth/register', params);
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
