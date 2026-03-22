# Session Expiry Resolution

**Issue:** User kicked to login after navigating to Workspace  
**Cause:** Console server restart cleared in-memory sessions  
**Resolution:** Re-login required (expected behavior)

---

## Root Cause

**Session configuration:**
```typescript
const sessionTTL = parseInt(process.env.VIENNA_SESSION_TTL || '86400000', 10);
// Default: 24 hours
```

**Session storage:**
```typescript
private sessions: Map<string, Session> = new Map();
// In-memory, NOT persisted
```

**What happened:**
1. User logged in earlier today
2. Console server restarted (Phase 1 + 2 deployment at ~01:47 EDT)
3. In-memory session Map cleared
4. User navigated to Workspace
5. FileTreePanel called API → 401 (no valid session)
6. Global 401 handler → automatic logout

---

## Expected Behavior

**Session persistence:**
- ❌ NOT persisted across server restarts
- ❌ NOT stored in database or Redis
- ✅ In-memory only

**Result:**
- Server restart = all sessions lost
- Users must re-login

**This is intentional for Phase 10 (development/observation mode)**

---

## Workaround

**Immediate:**
1. Navigate to dashboard
2. Log in again
3. Session valid for 24 hours (or until next server restart)

**Session credentials:**
- Username: `vienna`
- Password: `VIENNA_OPERATOR_PASSWORD` from `.env`

---

## Session Timeout Settings

**Current configuration:**

```bash
# .env
VIENNA_SESSION_TTL=86400000  # 24 hours (default if not set)
```

**To extend session timeout:**

```bash
# Add to .env
VIENNA_SESSION_TTL=604800000  # 7 days (in milliseconds)
```

**Values:**
- 1 hour: `3600000`
- 8 hours: `28800000`
- 24 hours: `86400000` (default)
- 7 days: `604800000`

---

## Production Considerations

**Current limitations:**
1. Sessions lost on server restart
2. Sessions not shared across server instances
3. No session persistence

**For production deployment:**

### Option A: Persistent Session Store
**Use database or Redis:**

```typescript
// Replace Map with persistent store
import { RedisSessionStore } from './sessionStore.js';

class AuthService {
  private sessions: RedisSessionStore;
  
  constructor(config) {
    this.sessions = new RedisSessionStore(redis);
  }
}
```

**Pros:**
- Survives restarts
- Shareable across instances

**Cons:**
- Requires Redis or database
- More complexity

### Option B: Longer Session TTL
**Extend timeout to 7 days:**

```bash
VIENNA_SESSION_TTL=604800000
```

**Pros:**
- Simple
- Reduces re-login frequency

**Cons:**
- Still lost on restart
- Less secure (longer window)

### Option C: "Remember Me" Token
**Issue persistent refresh token:**

```typescript
// Set long-lived refresh token in localStorage
// Short-lived session in memory
// Auto-refresh on expiry
```

**Pros:**
- Best UX
- Security through rotation

**Cons:**
- Requires token refresh logic

---

## Recommended Configuration

**Development (current):**
```bash
VIENNA_SESSION_TTL=86400000  # 24 hours, in-memory
```

**Production (future):**
```bash
VIENNA_SESSION_TTL=28800000  # 8 hours
VIENNA_SESSION_STORE=redis   # Persistent
VIENNA_SESSION_REFRESH=true  # Auto-extend on activity
```

---

## Phase 7 Integration

**Session management UX improvements (Phase 7: Error Handling):**

1. **Warning before expiry:**
   ```typescript
   // Show banner 5 minutes before expiry
   if (expiresAt - now < 5 * 60 * 1000) {
     showWarning("Session expires in 5 minutes");
   }
   ```

2. **Activity-based extension:**
   ```typescript
   // Extend session on API activity
   async validateSession(sessionId) {
     const session = this.sessions.get(sessionId);
     if (session) {
       session.expiresAt = new Date(Date.now() + this.config.sessionTTL);
     }
     return session;
   }
   ```

3. **Session status in Settings:**
   ```typescript
   // Settings page shows:
   // - Session expires at: 2026-03-14 14:32 EDT
   // - Last activity: 2 minutes ago
   // - [Extend Session] button
   ```

4. **Better error messaging:**
   ```typescript
   // Instead of generic "Session expired"
   "Your session expired. Server was restarted at 01:47 EDT. Please log in again."
   ```

---

## Current Status

**Session behavior:** ✅ WORKING AS DESIGNED

**Characteristics:**
- In-memory storage
- 24-hour timeout
- Lost on server restart
- Single-operator model

**Not a bug:** Expected for development phase

**UX improvement needed:** Phase 7 (session warnings, activity extension)

---

## Action Items

### Immediate (None required)
- User can re-login
- Session valid for 24h

### Phase 7 (Session UX)
1. Add session expiry warning (5min before)
2. Add activity-based extension
3. Add session status to Settings page
4. Add "Extend Session" button
5. Improve "session expired" messaging

### Phase 8 or Production Prep
6. Evaluate persistent session store (Redis)
7. Consider refresh token mechanism
8. Add "Remember Me" option
9. Multi-instance session sharing (if needed)

---

## Summary

**Issue:** Not a bug, expected behavior  
**Cause:** Server restart cleared in-memory sessions  
**Resolution:** Re-login (valid for 24h)  
**Future:** Phase 7 will add session warnings + activity extension

**Operator action:** Re-login at dashboard

**No code changes needed at this time.**
