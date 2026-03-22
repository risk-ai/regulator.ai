# Login Loop Diagnosis

**Issue:** User stuck at login screen after entering password  
**Symptom:** Login appears to succeed but immediately returns to login  
**Status:** Investigating frontend auth flow

---

## What We Know

### Backend Working ✅
```bash
$ curl -X POST http://localhost:3100/api/v1/auth/login \
  -d '{"password":"P@rrish1922"}'
  
{"success":true,"data":{"operator":"vienna","sessionId":"...","expiresAt":"..."}}
```

**Cookie set properly:**
```
Set-Cookie: vienna_session=...; HttpOnly; Path=/; Max-Age=86400
```

**Session validation works:**
```bash
$ curl -b cookies.txt http://localhost:3100/api/v1/auth/session

{"authenticated":true,"operator":"vienna","expiresAt":"..."}
```

### Vite Proxy Working ✅
```bash
$ curl -X POST http://100.120.116.10:5174/api/v1/auth/login \
  -d '{"password":"P@rrish1922"}'
  
{"success":true,...}
```

**Proxy configured:**
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3100',
    changeOrigin: true,
  }
}
```

---

## Suspected Issues

### 1. Frontend Auth Flow

**Auth store login flow:**
```typescript
login: async (password: string) => {
  const response = await login(password); // API call
  
  set({
    authenticated: true,
    operator: response.operator,
    sessionExpiresAt: response.expiresAt,
  });
  
  return true;
}
```

**Potential issue:** After setting `authenticated: true`, App.tsx checks session on mount:
```typescript
useEffect(() => {
  checkSession(); // Might override login state
}, []);
```

**If checkSession runs immediately after login:**
1. Login sets `authenticated: true`
2. Component re-renders
3. useEffect runs checkSession()
4. checkSession calls `/api/v1/auth/session`
5. If cookies not properly sent → returns `authenticated: false`
6. Overrides login state → back to login screen

---

### 2. Cookie Credentials Issue

**API client config:**
```typescript
const response = await fetch(url, {
  credentials: 'include', // ✅ Correct
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**This should work, but check:**
- Is `credentials: 'include'` being applied to ALL requests?
- Is the cookie being sent on subsequent requests?
- Is there a CORS issue with credentials?

---

### 3. CORS Configuration

**Backend CORS:**
```typescript
CORS_ORIGIN=http://100.120.116.10:5174

app.use(cors({
  origin: 'http://100.120.116.10:5174',
  credentials: true, // ✅ Required for cookies
}));
```

**This looks correct.**

---

### 4. Session Check Race Condition

**App.tsx flow:**
```typescript
function App() {
  const { authenticated, checkSession } = useAuthStore();
  
  // Check on mount
  useEffect(() => {
    checkSession();
  }, []);
  
  // If not authenticated, show login
  if (!authenticated) {
    return <LoginScreen />;
  }
  
  // Otherwise show app
  return <MainNav>...</MainNav>;
}
```

**Potential race:**
1. User logs in successfully
2. `authenticated` set to `true` in store
3. App re-renders, sees `authenticated: true`
4. useEffect runs `checkSession()`
5. If session cookie not sent → `authenticated` set back to `false`
6. App re-renders, sees `authenticated: false`
7. Shows login screen again

---

## Debugging Steps

### Check Browser DevTools (if operator can provide)

**Network tab:**
1. Submit login form
2. Check POST `/api/v1/auth/login` response
   - Status should be 200
   - Response should have `success: true`
   - Check Response Headers for `Set-Cookie`
3. Check next request (likely GET `/api/v1/auth/session`)
   - Check Request Headers for `Cookie: vienna_session=...`
   - If cookie missing → cookie not being stored
   - If cookie present but 401 → backend issue

**Console tab:**
- Check for errors
- Check for auth-related warnings
- Look for "[ApiClient] 401/403 detected" message

**Application tab:**
- Check Cookies for domain `100.120.116.10`
- Should see `vienna_session` cookie
- If missing → cookie not being set

---

## Potential Fixes

### Fix 1: Prevent checkSession Override

**Change App.tsx to not override after login:**
```typescript
useEffect(() => {
  // Only check session if not already authenticated
  if (!authenticated) {
    checkSession();
  }
}, []);
```

**Or use a flag:**
```typescript
const [initialCheckDone, setInitialCheckDone] = useState(false);

useEffect(() => {
  checkSession().finally(() => setInitialCheckDone(true));
}, []);

if (loading || !initialCheckDone) {
  return <LoadingScreen />;
}
```

---

### Fix 2: Add Delay After Login

**In authStore login:**
```typescript
login: async (password: string) => {
  const response = await login(password);
  
  set({
    authenticated: true,
    operator: response.operator,
    sessionExpiresAt: response.expiresAt,
  });
  
  // Give browser time to store cookie
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return true;
}
```

---

### Fix 3: Check Session After Login

**In authStore login:**
```typescript
login: async (password: string) => {
  const response = await login(password);
  
  // Don't trust login response, verify with session check
  const session = await checkSession();
  
  if (session.authenticated) {
    set({
      authenticated: true,
      operator: session.operator,
      sessionExpiresAt: session.expiresAt,
    });
    return true;
  }
  
  return false;
}
```

---

### Fix 4: Cookie Domain Issue

**Check if cookie domain mismatch:**

Backend sets cookie with:
```typescript
{
  httpOnly: true,
  secure: false, // NODE_ENV !== 'production'
  sameSite: 'lax',
  path: '/',
  // domain not set → defaults to request domain
}
```

**If request comes from `100.120.116.10:5174`:**
- Cookie domain defaults to `100.120.116.10`
- Should work for both `:5174` and `:3100` on same IP

**Potential issue:** If browser treats ports as different origins for cookies

**Fix:** Explicitly set domain:
```typescript
{
  domain: '100.120.116.10',
  // other options...
}
```

---

## Recommended Action

**For operator (immediate debug):**

Open browser DevTools (F12) and:
1. Go to Network tab
2. Try logging in
3. Find POST `/api/v1/auth/login` request
4. Check if response includes `Set-Cookie` header
5. Find next GET `/api/v1/auth/session` request
6. Check if request includes `Cookie` header

**Share findings:**
- "Set-Cookie present in login response: yes/no"
- "Cookie sent in session check: yes/no"
- "Any console errors: [paste errors]"

---

## Quick Fix Attempt

Let me try modifying App.tsx to prevent session check override:
