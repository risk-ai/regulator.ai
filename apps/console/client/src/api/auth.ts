/**
 * Auth API Client — Vienna OS
 * 
 * Registration, login, logout, session check.
 */

import { apiClient } from './client.js';

export interface SessionInfo {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  tenant?: {
    id: string;
    name?: string;
    slug?: string;
  };
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  tenant: {
    id: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
    plan: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  apiKey?: {
    key: string;
    id: string;
    note: string;
  };
}

export interface LogoutResponse {
  message: string;
}

/**
 * Login with email + password
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse, { email: string; password: string }>(
    '/auth/login',
    { email, password }
  );
}

/**
 * Register new operator account
 */
export async function register(params: {
  email: string;
  password: string;
  name?: string;
  company?: string;
  plan?: string;
}): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse, typeof params>('/auth/register', params);
}

/**
 * Logout and invalidate session
 */
export async function logout(refreshToken?: string): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse, { refreshToken?: string }>('/auth/logout', { refreshToken });
}

/**
 * Get current user info (requires JWT)
 */
export async function getCurrentUser(): Promise<SessionInfo> {
  return apiClient.get<SessionInfo>('/auth/me', { timeout: 5000 });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  return apiClient.post<{ accessToken: string; expiresIn: number }, { refreshToken: string }>(
    '/auth/refresh',
    { refreshToken }
  );
}
