/**
 * Vienna Console API Client
 * 
 * Typed fetch wrapper for all backend API calls.
 * 
 * Global 401 Handler: If any protected endpoint returns 401, the client
 * automatically triggers logout to prevent false authenticated state.
 */

import type { SuccessResponse, ErrorResponse } from './types.js';

// Default to same-origin for all deployments
// Vite proxy in dev, Express serves in production
const API_BASE = '/api/v1';
const DEFAULT_TIMEOUT = 30000; // 30s

// Auth error callback (set by auth store to avoid circular dependency)
let authErrorCallback: (() => void) | null = null;

export function setAuthErrorCallback(callback: () => void) {
  authErrorCallback = callback;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}

export class ApiClient {
  constructor(
    private baseUrl: string = API_BASE,
    private defaultTimeout: number = DEFAULT_TIMEOUT
  ) {}

  /**
   * Typed fetch wrapper
   */
  async fetch<T>(
    path: string,
    options?: RequestInit & { timeout?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout || this.defaultTimeout;
    
    // Setup abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      // Validate content-type (be lenient - accept missing or JSON-like types)
      const contentType = response.headers.get('content-type');
      
      // Handle response body parsing
      let data: any;
      const text = await response.text();
      
      // Try to parse as JSON if:
      // - content-type includes 'json'
      // - OR content-type is missing/empty (some proxies strip headers)
      // - OR response body looks like JSON
      const looksLikeJson = text.trim().startsWith('{') || text.trim().startsWith('[');
      const hasJsonContentType = contentType?.toLowerCase().includes('json');
      
      if (hasJsonContentType || !contentType || looksLikeJson) {
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          // JSON parse failed - this IS an error
          throw new ApiError(
            `Failed to parse response as JSON: ${text.substring(0, 100)}`,
            'JSON_PARSE_ERROR',
            response.status
          );
        }
      } else {
        // Definitely not JSON (HTML, plain text, etc.)
        throw new ApiError(
          `Expected JSON response, got ${contentType || 'no content-type'}: ${text.substring(0, 100)}`,
          'INVALID_CONTENT_TYPE',
          response.status
        );
      }
      
      // Handle error response
      if (!response.ok) {
        const error = data as ErrorResponse;
        const apiError = new ApiError(
          error.error || 'Request failed',
          error.code || 'UNKNOWN',
          response.status,
          error.details
        );
        
        // Global 401 handler: trigger logout on authentication errors
        if (apiError.isAuthError && authErrorCallback) {
          console.warn('[ApiClient] 401/403 detected, triggering logout');
          authErrorCallback();
        }
        
        throw apiError;
      }
      
      // Extract data from success response
      const success = data as SuccessResponse<T>;
      return success.data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 'TIMEOUT', 408);
        }
        throw new ApiError(error.message, 'NETWORK_ERROR', 0);
      }
      
      throw new ApiError('Unknown error', 'UNKNOWN', 0);
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = path;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const query = searchParams.toString();
      if (query) {
        url = `${path}?${query}`;
      }
    }
    
    return this.fetch<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T, B = unknown>(path: string, body: B): Promise<T> {
    return this.fetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T, B = unknown>(path: string, body: B): Promise<T> {
    return this.fetch<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: 'DELETE' });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
