# Workspace Auth Model (Stage 6)

**Date:** 2026-03-14  
**Status:** ✅ IMPLEMENTED

---

## Authentication Approach

**Current implementation:** Bearer token validation

**Auth middleware:** `src/lib/auth-middleware.ts`

### How it works

1. **Development mode** (no `WORKSPACE_AUTH_TOKEN` configured)
   - All requests allowed
   - User identified as `dev-user`
   - Enables frictionless local development

2. **Staging/production mode** (`WORKSPACE_AUTH_TOKEN` configured)
   - Requires `Authorization: Bearer <token>` header
   - Token must match `WORKSPACE_AUTH_TOKEN` environment variable
   - Invalid/missing token → 401 Unauthorized
   - Valid token → Request proceeds

### Request flow

```
Browser/Client
  ↓
  Authorization: Bearer <token>
  ↓
Next.js API Route (/api/workspace/*)
  ↓
requireWorkspaceAccess(request)
  ↓
  [Auth check]
  ├─ No WORKSPACE_AUTH_TOKEN → Allow (dev mode)
  ├─ Valid token → Allow
  └─ Invalid/missing token → 401 Unauthorized
  ↓
Vienna Runtime Proxy
  ↓
Vienna Runtime Service
```

---

## Authorization Model

**Current implementation:** Binary access control

All authenticated users have full workspace access.

### Access levels

- **Authenticated user:** Full workspace access (investigations, incidents, artifacts, traces)
- **Unauthenticated user:** No access (401 Unauthorized)

### Role-based access control (future)

The current auth middleware includes placeholders for RBAC:

- `hasWorkspaceAccess(authResult)` — Can be extended to check roles
- `requireWorkspaceAccess(request)` — Already separated from `requireAuth()` for future role enforcement

**Planned roles:**
- **Operator:** Full read/write workspace access
- **Viewer:** Read-only workspace access
- **Admin:** Workspace + system configuration access

**Not yet implemented.** Stage 6 establishes the boundary; RBAC is deferred.

---

## Protected Routes

All workspace proxy routes now enforce authentication:

✅ `GET /api/workspace/investigations`  
✅ `GET /api/workspace/investigations/[id]`  
✅ `GET /api/workspace/incidents`  
✅ `POST /api/workspace/incidents`  
✅ `GET /api/workspace/incidents/[id]`  
✅ `GET /api/workspace/artifacts`  

**Trace routes:** Directory structure exists but no route handlers yet (no auth needed).

---

## Environment Configuration

### Development (local)

No configuration required. Auth is disabled when `WORKSPACE_AUTH_TOKEN` is not set.

```bash
# .env.local (development)
# WORKSPACE_AUTH_TOKEN is intentionally not set
VIENNA_RUNTIME_URL=http://localhost:3200
```

### Staging/Production

Set `WORKSPACE_AUTH_TOKEN` to a strong random value:

```bash
# Generate token
openssl rand -base64 32

# .env.production (Vercel environment)
WORKSPACE_AUTH_TOKEN=<generated-token>
VIENNA_RUNTIME_URL=https://vienna-runtime.fly.io
```

**Token rotation:** Change `WORKSPACE_AUTH_TOKEN` and redeploy.

---

## Client Usage

### Browser/Frontend

For client-side requests (development):

```typescript
// Development mode — no auth header needed
const response = await fetch('/api/workspace/investigations');
```

For client-side requests (production):

```typescript
// Production mode — include auth token
const token = process.env.NEXT_PUBLIC_WORKSPACE_AUTH_TOKEN;
const response = await fetch('/api/workspace/investigations', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**Note:** For production browser access, token should be obtained via session cookie (NextAuth) or client-side auth provider (Clerk), not exposed as `NEXT_PUBLIC_*`.

### Service-to-service

For runtime-to-shell requests (if needed later):

```typescript
const response = await fetch('https://regulator.ai/api/workspace/investigations', {
  headers: {
    'Authorization': `Bearer ${process.env.WORKSPACE_AUTH_TOKEN}`,
  },
});
```

---

## Security Considerations

### Current model

✅ **Auth enforced at shell boundary** (correct)  
✅ **Runtime does not enforce auth** (correct — shell is the gateway)  
✅ **Development mode friction removed** (correct — no auth locally)  
✅ **Production mode requires token** (correct — boundary exists)  

⚠️ **Token is shared secret, not per-user**  
⚠️ **No user identity tracking beyond "authenticated"**  
⚠️ **No role-based access control**  
⚠️ **Browser would need to know token (not production-ready for public access)**  

### Acceptable for Stage 6

This auth model is **production-capable for service-to-service or operator-only access**, but **not yet production-ready for end-user browser access**.

**Use cases this supports:**
- Staging environment with known operators
- Service-to-service auth between shell and runtime
- Internal tooling access
- Development environments

**Use cases this does NOT support:**
- Public user access (no user registration/login)
- Multi-tenant access (no user identity)
- Audit trail with user attribution (userId is static)

---

## Future Hardening (Post-Stage 6)

### Near-term (before public release)

**Replace Bearer token auth with NextAuth or Clerk:**

1. Install auth provider:
   ```bash
   npm install next-auth @auth/core
   # or
   npm install @clerk/nextjs
   ```

2. Configure OAuth provider (Google, GitHub, etc.)

3. Update `auth-middleware.ts`:
   ```typescript
   import { getServerSession } from 'next-auth'
   
   export async function authenticateRequest(request: NextRequest) {
     const session = await getServerSession()
     if (!session) {
       return { authenticated: false, error: 'Not logged in' }
     }
     return { authenticated: true, userId: session.user.id }
   }
   ```

4. Add session validation to all protected routes (same middleware pattern)

### Medium-term (role-based access)

**Implement role-based authorization:**

1. Add `roles` table to database
2. Add `user_roles` junction table
3. Update `hasWorkspaceAccess()` to check user roles
4. Add role checks to specific routes:
   ```typescript
   if (!hasRole(authResult.userId, 'operator')) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

### Long-term (service-to-service trust)

**If Vienna Runtime needs to authenticate requests from shell:**

1. Add shared secret validation in runtime
2. Or: Use JWT signing for shell→runtime requests
3. Or: Use mutual TLS for transport-level auth

**Current decision:** Runtime trusts shell implicitly (shell is the only caller).

---

## Migration Path

### Stage 6 → NextAuth migration

1. Install NextAuth
2. Configure OAuth provider
3. Update `auth-middleware.ts` to use `getServerSession()`
4. No changes needed to route handlers (middleware stays the same)
5. Update environment docs with OAuth client ID/secret

**Estimated effort:** 2-4 hours

### Bearer token → Session cookie

No client code changes needed if frontend uses `fetch()` without explicit `Authorization` header (session cookie is automatic).

---

## Testing Auth

### Development mode

```bash
# No auth configured
curl http://localhost:3000/api/workspace/investigations
# Should succeed (dev mode)
```

### Production mode

```bash
# Auth configured
export WORKSPACE_AUTH_TOKEN="test-token-123"

# No auth header
curl http://localhost:3000/api/workspace/investigations
# Should return 401

# Invalid token
curl -H "Authorization: Bearer wrong-token" http://localhost:3000/api/workspace/investigations
# Should return 401

# Valid token
curl -H "Authorization: Bearer test-token-123" http://localhost:3000/api/workspace/investigations
# Should succeed
```

---

## What Remains for Future Hardening

| Feature | Status | Priority |
|---------|--------|----------|
| Bearer token auth | ✅ Implemented | - |
| Session-based auth (NextAuth) | ⏭ Deferred | P1 (before public release) |
| Role-based access control | ⏭ Deferred | P2 (before multi-user release) |
| User identity tracking | ⏭ Deferred | P2 (for audit trails) |
| Service-to-service auth (runtime→shell) | ⏭ Deferred | P3 (if bidirectional needed) |
| Token rotation policy | ⏭ Deferred | P2 (for production ops) |

---

## Exit Criteria (Stage 6)

✅ **Auth enforced on workspace proxy routes**  
✅ **Unauthenticated access blocked in production mode**  
✅ **Development mode remains frictionless**  
✅ **Auth model documented**  
✅ **Clear upgrade path to NextAuth**  

**Stage 6 auth requirement met.**

---

**Conclusion:** Workspace boundary is now auth-protected. Production deployment can control access via `WORKSPACE_AUTH_TOKEN`. Future upgrade to NextAuth/Clerk is straightforward and won't require route handler changes.
