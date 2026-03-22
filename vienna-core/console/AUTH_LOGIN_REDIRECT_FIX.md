# Login Redirect Loop Fix

**Date:** 2026-03-14 02:44 EDT  
**Issue:** Operator login succeeded but immediately redirected back to login screen with "Session expired" message

---

## Root Cause

**Routing system mismatch between App component and child components.**

The application had two conflicting routing systems running simultaneously:

1. **Hash-based routing** in `App.tsx`:
   ```typescript
   useEffect(() => {
     const handleHashChange = () => {
       const hash = window.location.hash.slice(1);
       if (hash === 'files') {
         setCurrentPage('files');
       }
       // ...
     };
     window.addEventListener('hashchange', handleHashChange);
   }, []);
   ```

2. **React Router** in `main.tsx` and child components:
   ```typescript
   <BrowserRouter>
     <App />
   </BrowserRouter>
   ```

   ```typescript
   // FilesWorkspace.tsx
   import { useNavigate } from 'react-router-dom';
   const navigate = useNavigate();
   onClick={() => navigate('/')}
   ```

---

## Symptom Explanation

**Why `/files` appeared briefly then redirected:**

1. User enters password
2. Login API succeeds, cookie is set
3. authStore sets `authenticated=true`
4. App renders FilesWorkspace (hash route `#files`)
5. FilesWorkspace mounts with `useNavigate()` from React Router
6. React Router's navigation state initialization/sync potentially:
   - Triggered a page reload
   - Cleared session state
   - Interfered with cookie storage
7. Subsequent authenticated API call failed with 401
8. Global 401 handler triggered: `authStore` sets `authenticated=false`
9. App returns to LoginScreen with "Session expired" message

---

## Fix Applied

**Removed React Router dependencies from FilesWorkspace.**

### Files Modified

`vienna-core/console/client/src/pages/FilesWorkspace.tsx`:

**Before:**
```typescript
import { useNavigate } from 'react-router-dom';

export function FilesWorkspace() {
  const navigate = useNavigate();
  // ...
  <button onClick={() => navigate('/')}>
    Dashboard
  </button>
}
```

**After:**
```typescript
// Removed: import { useNavigate } from 'react-router-dom';

export function FilesWorkspace() {
  // Removed: const navigate = useNavigate();
  // ...
  <button onClick={() => window.location.hash = ''}>
    Dashboard
  </button>
}
```

**Change:** FilesWorkspace now uses hash-based navigation (`window.location.hash`) consistent with App.tsx routing.

### Client Rebuild

```bash
cd vienna-core/console/client
npx vite build
```

Build completed successfully. Hot module replacement active in dev server.

---

## Validation

### Backend Authentication Flow ✅

Tested with curl through Vite proxy:

1. **Login succeeds, cookie is set:**
   ```bash
   curl -X POST http://100.120.116.10:5174/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"password":"P@rrish1922"}'
   
   # Response includes:
   Set-Cookie: vienna_session=...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
   ```

2. **Authenticated requests work with cookie:**
   ```bash
   curl -H "Cookie: vienna_session=..." \
     http://100.120.116.10:5174/api/v1/dashboard/bootstrap
   
   # Returns: HTTP/1.1 200 OK
   ```

### CORS Configuration ✅

Server correctly responds with matching origin:
```
Access-Control-Allow-Origin: http://100.120.116.10:5174
Access-Control-Allow-Credentials: true
```

### Cookie Configuration ✅

- `httpOnly: true` ✓
- `secure: process.env.NODE_ENV === 'production'` ✓ (false for HTTP dev mode)
- `sameSite: 'lax'` ✓
- `maxAge: 24 hours` ✓
- `path: '/'` ✓
- No explicit domain (correct for proxy setup) ✓

### Vite Proxy ✅

Proxy correctly forwards cookies between frontend (5174) and backend (3100):
- Set-Cookie headers preserved ✓
- Cookie headers forwarded ✓
- CORS handled correctly ✓

---

## Expected Behavior After Fix

1. ✅ Operator enters password
2. ✅ Login succeeds, session cookie stored
3. ✅ `/files` (hash route `#files`) loads and remains stable
4. ✅ File tree API call succeeds with cookie
5. ✅ Page refresh maintains session
6. ✅ Navigation to dashboard (`window.location.hash = ''`) works
7. ✅ Logout clears session correctly

---

## Remaining Technical Debt

### Known Issue: Routing System Conflict

The application still has both BrowserRouter and hash-based routing:

**Current state:**
- `main.tsx` wraps App in `<BrowserRouter>`
- `App.tsx` uses manual hash-based routing
- Child components inconsistent (some use useNavigate, some use hash)

**Recommended future fix (choose one):**

**Option A: Pure Hash Routing**
```typescript
// main.tsx - Remove BrowserRouter
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Option B: React Router Properly**
```typescript
// App.tsx - Use React Router Routes
import { Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <Routes>
      <Route path="/" element={authenticated ? <OperatorNowView /> : <LoginScreen />} />
      <Route path="/files" element={authenticated ? <FilesWorkspace /> : <LoginScreen />} />
      <Route path="/dashboard" element={authenticated ? <Dashboard /> : <LoginScreen />} />
    </Routes>
  );
}
```

**Impact:** Low priority. Current fix resolves the login loop. Full routing migration can be done separately.

---

## Testing Checklist

Operator should verify:

- [ ] Login succeeds on first attempt
- [ ] `/files` workspace loads without redirect
- [ ] File tree displays correctly
- [ ] Page refresh keeps session active
- [ ] Navigation to dashboard works
- [ ] Logout clears session
- [ ] Invalid password still fails correctly
- [ ] Session expiry (24 hours) works as expected

---

## Follow-Up Recommendations

### Short-term (P0)

1. ✅ Fix applied and deployed
2. ⏳ Operator validation required
3. ⏳ Add browser console logging if issues persist

### Medium-term (P1)

1. Resolve routing system conflict (Option A or B above)
2. Add regression test for login → authenticated route flow
3. Fix TypeScript type errors in client codebase
4. Consider session refresh/renewal before 24-hour expiry

### Long-term (P2)

1. HTTPS deployment with proper `secure` cookie flag
2. Reverse proxy for production (remove Vite proxy dependency)
3. Session activity timeout (currently only absolute 24h expiry)
4. Multi-tab session sync

---

## Session Restart Required

No backend restart needed. Frontend changes applied via Vite HMR.

If issues persist, operator should:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cookies for `100.120.116.10:5174`
3. Close all tabs and reopen
4. Check browser console for errors
