/**
 * Workspace Auth Middleware (Stage 6)
 * 
 * Provides authentication enforcement for workspace proxy routes.
 * This is a minimal implementation that establishes the auth boundary.
 * 
 * Production deployment should replace this with NextAuth or Clerk.
 * 
 * Current implementation: Bearer token validation against env-configured secret.
 * This allows:
 * - Immediate auth boundary enforcement
 * - Service-to-service auth for staging/production
 * - Clear upgrade path to OAuth/OIDC
 */

import { NextRequest, NextResponse } from 'next/server'

interface AuthResult {
  authenticated: boolean
  userId?: string
  error?: string
}

/**
 * Authenticate request using Bearer token.
 * 
 * Expected header: `Authorization: Bearer <token>`
 * 
 * Token validation:
 * - Token must match WORKSPACE_AUTH_TOKEN env var
 * - If no token configured, auth is disabled (dev mode)
 * 
 * Future: Replace with NextAuth session validation or Clerk userId extraction.
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  const authToken = process.env.WORKSPACE_AUTH_TOKEN
  
  // If no auth token configured, allow access (local dev mode)
  if (!authToken) {
    return {
      authenticated: true,
      userId: 'dev-user',
    }
  }
  
  // Extract Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header',
    }
  }
  
  // Validate Bearer token format
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format (expected: Bearer <token>)',
    }
  }
  
  const providedToken = match[1]
  
  // Validate token
  if (providedToken !== authToken) {
    return {
      authenticated: false,
      error: 'Invalid authentication token',
    }
  }
  
  // Success
  return {
    authenticated: true,
    userId: 'authenticated-user', // Replace with actual user ID extraction in production
  }
}

/**
 * Require authentication for a route handler.
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = requireAuth(request)
 *   if (authResult instanceof NextResponse) {
 *     return authResult // Auth failed, return 401
 *   }
 *   
 *   const { userId } = authResult
 *   // ... handle authenticated request
 * }
 * ```
 */
export function requireAuth(request: NextRequest): AuthResult | NextResponse {
  const result = authenticateRequest(request)
  
  if (!result.authenticated) {
    return NextResponse.json(
      { error: result.error || 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return result
}

/**
 * Authorization helper (placeholder for future role-based access control).
 * 
 * Current implementation: All authenticated users have operator access.
 * 
 * Future: Implement role-based checks (operator, admin, viewer).
 */
export function hasWorkspaceAccess(authResult: AuthResult): boolean {
  // For now, all authenticated users have workspace access
  return authResult.authenticated
}

/**
 * Require workspace access for a route handler.
 * 
 * This adds authorization on top of authentication.
 * For Stage 6, this is equivalent to requireAuth, but provides
 * a clear upgrade path for role-based access control.
 */
export function requireWorkspaceAccess(request: NextRequest): AuthResult | NextResponse {
  const authResult = requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult // Auth failed
  }
  
  if (!hasWorkspaceAccess(authResult)) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient workspace access' },
      { status: 403 }
    )
  }
  
  return authResult
}
