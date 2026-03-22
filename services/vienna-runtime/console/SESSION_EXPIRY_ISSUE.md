# Session Expiry Issue — Quick Logout on Workspace Navigation

**Reported:** 2026-03-14 02:00 EDT  
**Symptom:** User kicked to login immediately after navigating to Workspace  
**Root Cause:** Session expired, 401 on first API call → automatic logout

---

## What Happened

**User flow:**
1. User navigated to Workspace section (#workspace)
2. FilesWorkspace component mounted
3. FileTreePanel called `filesApi.list('/')` on mount
4. Backend returned 401 (session expired)
5. Global 401 handler triggered automatic logout
6. User redirected to login screen

**Expected (from user perspective):**
- Workspace loads OR session warning before expiry

**Actual:**
- Immediate redirect to login with "Session expired" (correct behavior, poor UX)

---

## Technical Details

### Session Flow

**1. FileTreePanel mounts:**
```typescript
useEffect(() => {
  loadDirectory(currentPath); // Immediate API call
}, [currentPath]);
```

**2. API call hits protected endpoint:**
```typescript
const result = await filesApi.list(path); // Requires auth
```

**3. Backend checks session:**
```typescript
// requireAuth middleware
const sessionId = req.cookies[COOKIE_NAME];
const session = await authService.validateSession(sessionId);

if (!session) {
  res.status(401).json({ code: 'SESSION_EXPIRED' });
}
```

**4. Global 401 handler triggers logout:**
```typescript
// api/client.ts
if (apiError.isAuthError) {
  if (authErrorCallback) {
    authErrorCallback(); // Sets authenticated = false
  }
  throw apiError;
}
```

**5. App sees authenticated = false:**
```typescript
if (!authenticated) {
  return <LoginScreen />;
}
```

---

## Root Causes

### Primary: Session Expired

**Session timeout:** Unknown (need to check AuthService config)

**Possible values:**
- Default: 1 hour?
- Configured: May be shorter
- No activity-based extension

**Current check result:**
```bash
$ curl http://localhost:3100/api/v1/auth/session
{"authenticated": false}
```

**Conclusion:** No valid session exists

### Secondary: Poor UX

**Issues:**
1. No warning before expiry
2. No "session expires in X minutes" indicator
3. No automatic refresh on activity
4. Abrupt redirect with no context

---

## Immediate Workaround

**For operator:**
1. Log in again
2. Navigate to Workspace
3. Session should be fresh

**Session will expire again after timeout period**

---

## Permanent Fixes

### Fix 1: Extend Session Timeout (Quick)
**Change:** Increase session duration from 1h → 8h or configurable

**Implementation:**
```typescript
// authService.ts
const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT_HOURS 
  ? parseInt(process.env.SESSION_TIMEOUT_HOURS) * 3600000 
  : 8 * 3600000; // Default 8 hours
```

**Pros:**
- Simple
- Reduces frequency

**Cons:**
- Doesn't solve UX issue
- Still abrupt when it happens

---

### Fix 2: Activity-Based Session Extension (Better)
**Change:** Extend session on every API call

**Implementation:**
```typescript
// requireAuth middleware
if (session) {
  await authService.extendSession(sessionId, SESSION_TIMEOUT);
  next();
}
```

**Pros:**
- Active users never timeout
- Industry standard

**Cons:**
- Requires session store update logic

---

### Fix 3: Session Expiry Warning (Best UX)
**Change:** Show warning 5 minutes before expiry

**Implementation:**
```typescript
// Frontend: Check session.expiresAt
const timeRemaining = new Date(expiresAt).getTime() - Date.now();

if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
  showWarning("Session expires in 5 minutes. Save your work.");
}
```

**Pros:**
- Operator has time to prepare
- Can save work before logout

**Cons:**
- Requires frontend polling or SSE

---

### Fix 4: Silent Session Refresh (Industry Standard)
**Change:** Auto-refresh session before expiry

**Implementation:**
```typescript
// Frontend: Refresh session 10 minutes before expiry
useEffect(() => {
  const checkInterval = setInterval(async () => {
    const timeRemaining = getTimeRemaining();
    
    if (timeRemaining < 10 * 60 * 1000) {
      await authApi.refreshSession();
    }
  }, 60000); // Check every minute
  
  return () => clearInterval(checkInterval);
}, []);
```

**Pros:**
- Seamless UX
- Industry standard

**Cons:**
- Requires refresh endpoint

---

## Recommended Solution

**Combination approach (Phase 7: Error Handling):**

1. **Extend timeout:** 1h → 8h (immediate)
2. **Activity extension:** Auto-extend on API calls (Phase 7)
3. **Expiry warning:** Show banner 5min before (Phase 7)
4. **Silent refresh:** Auto-refresh 10min before (Phase 8)

**Priority:**
- P0: Extend timeout to 8h (1-line config change)
- P1: Activity-based extension (Phase 7)
- P1: Expiry warning banner (Phase 7)
- P2: Silent refresh (Phase 8)

---

## Config Investigation Needed

**Check these:**
1. AuthService session timeout configuration
2. Session store (in-memory? DB? Redis?)
3. Cleanup interval
4. Session cookie MaxAge

**Commands:**
```bash
cd console/server
grep -r "SESSION\|timeout\|expire" src/services/authService.ts
grep -r "SESSION\|timeout" .env
```

---

## Phase 7 Integration

**This issue fits perfectly in Phase 7: Error Handling**

**Scope:**
- Distinguish session expiry from other 401 errors
- Show specific "Session expired" message (not generic "unauthorized")
- Add session timeout warning
- Add "Keep me logged in" option
- Add session activity extension
- Add session status indicator in Settings

**Error handling matrix entry:**
```
401 + SESSION_EXPIRED → "Your session has expired. Please log in again."
401 + UNAUTHORIZED → "Access denied. Invalid credentials."
401 + SESSION_EXPIRING → Warning banner: "Session expires in 3 minutes"
```

---

## Workaround for Current Session

**If operator is still working:**

Option A: **Increase timeout in code**
```typescript
// console/server/src/services/authService.ts
// Find session timeout constant and increase it
```

Option B: **Disable auto-logout temporarily**
```typescript
// console/client/src/api/client.ts
// Comment out authErrorCallback() call
```

Option C: **Extend session via curl (if needed)**
```bash
# Get session cookie
curl -c cookies.txt -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}'

# Use cookie for subsequent requests
curl -b cookies.txt http://localhost:3100/api/v1/files
```

---

## Testing Session Behavior

**Test session timeout:**
```bash
# 1. Log in
curl -c /tmp/session.txt -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"vienna"}'

# 2. Check session
curl -b /tmp/session.txt http://localhost:3100/api/v1/auth/session

# 3. Wait for timeout (or manually expire in DB)

# 4. Try protected endpoint
curl -b /tmp/session.txt http://localhost:3100/api/v1/files
# Should return 401 SESSION_EXPIRED
```

---

## Documentation Needed

**For Settings page (Phase 7):**
- Current session timeout value
- Last activity timestamp
- Session expires at (countdown)
- Option to extend session
- "Keep me logged in" checkbox

**For operator guide:**
- Expected session duration
- What triggers logout
- How to extend session
- What to do if session expires during work

---

## Status

**Current:** Working as designed (strict session expiry)  
**UX:** Poor (abrupt logout, no warning)  
**Priority:** P1 for Phase 7 (Error Handling)  
**Workaround:** Re-login, work faster, or increase timeout config

**Next:** Check AuthService timeout config + extend if too short

---

**Issue classification:** Not a bug, expected behavior, poor UX

**Phase assignment:** Phase 7 (Error Handling & Session Management)
