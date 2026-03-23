# Stage 6 Boundary Fix Complete

**Date:** 2026-03-16 17:03 EDT  
**Commit:** `0dd992f`

---

## Boundary Violation Fixed

**Issue:** Workspace pages were making direct runtime fetches, bypassing the auth-protected shell proxy.

**Files corrected:**
- `src/app/workspace/investigations/page.tsx`
- `src/app/workspace/investigations/[id]/page.tsx`
- `src/app/workspace/incidents/page.tsx`
- `src/app/workspace/incidents/[id]/page.tsx`

---

## Changes Applied

### Before (WRONG - Direct Runtime Access)
```typescript
const baseUrl = process.env.VIENNA_RUNTIME_BASE_URL || 'http://localhost:4001'
const res = await fetch(`${baseUrl}/api/investigations`, ...)
```

**Problems:**
- Bypasses shell auth layer
- Exposes runtime directly to browser
- Creates CORS issues
- Violates architecture boundary

### After (CORRECT - Shell Proxy Access)
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const res = await fetch(`${baseUrl}/api/workspace/investigations`, ...)
```

**Benefits:**
- Routes through auth-protected proxy
- Preserves shell → runtime boundary
- No CORS issues
- Correct architecture enforcement

---

## Environment Variable Alignment

**Shell runtime client uses:** `VIENNA_RUNTIME_URL`
```typescript
// src/lib/vienna-runtime-client.ts
const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';
```

**Workspace pages now use:** `NEXT_PUBLIC_APP_URL`
```typescript
// src/app/workspace/*/page.tsx
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
```

**Vercel configuration verified:**
```
VIENNA_RUNTIME_URL=https://vienna-runtime-preview.fly.dev ✅
```

---

## Architecture Enforcement

**Correct data flow:**
```
Browser
  ↓
Shell UI (/workspace/*)
  ↓
Shell API Proxy (/api/workspace/*)
  ↓
Vienna Runtime Client (uses VIENNA_RUNTIME_URL)
  ↓
Vienna Runtime (https://vienna-runtime-preview.fly.dev)
```

**All workspace pages now follow this pattern.**

---

## Build Status

```bash
npm run build
```

**Result:** ✅ Build successful

**Dynamic routes:**
- `/api/workspace/investigations` → ƒ Dynamic
- `/api/workspace/investigations/[id]` → ƒ Dynamic
- `/api/workspace/incidents` → ƒ Dynamic
- `/api/workspace/incidents/[id]` → ƒ Dynamic
- `/workspace/investigations` → ƒ Dynamic
- `/workspace/investigations/[id]` → ƒ Dynamic
- `/workspace/incidents` → ƒ Dynamic
- `/workspace/incidents/[id]` → ƒ Dynamic

All workspace routes correctly marked as server-side dynamic (no static prerendering).

---

## Git Status

**Branch:** `feat/vienna-stage6-production-integration`

**Commit message:**
```
fix(shell): route workspace data through shell proxy boundary

- remove direct runtime fetches from workspace pages
- standardize on shell proxy access pattern (/api/workspace/*)
- replace VIENNA_RUNTIME_BASE_URL with NEXT_PUBLIC_APP_URL
- preserve auth-protected shell to runtime boundary
- all workspace UI now routes through /api/workspace/* proxy
```

**Pushed to:** `origin/feat/vienna-stage6-production-integration`

---

## Next Steps

**Waiting for:** Vercel redeploy to complete

**Once deployed, validate:**

1. **Shell proxy routes**
   ```bash
   curl -i https://regulator-ai.vercel.app/api/workspace/investigations
   curl -i https://regulator-ai.vercel.app/api/workspace/incidents
   ```

2. **Browser workspace**
   - Open https://regulator-ai.vercel.app/workspace
   - Check investigations load
   - Check incidents load
   - Verify detail pages work
   - Confirm no runtime unavailable errors
   - Confirm no CORS errors

3. **Network inspection**
   - Open browser DevTools → Network tab
   - Verify requests go to `/api/workspace/*`
   - Verify NO direct requests to `vienna-runtime-preview.fly.dev`

---

## Expected Results After Redeploy

### Shell Proxy Routes

**Test:**
```bash
curl https://regulator-ai.vercel.app/api/workspace/investigations
```

**Expected:**
```json
{
  "investigations": [...]
}
```

**NOT:**
```json
{
  "error": "runtime_error",
  "message": "Vienna Runtime is currently unavailable..."
}
```

### Browser Workspace

**Navigation:** https://regulator-ai.vercel.app/workspace

**Expected:**
- ✅ Investigations list loads
- ✅ Incidents list loads
- ✅ Detail pages work
- ✅ No "Runtime unavailable" warnings
- ✅ No CORS errors in console

---

## Boundary Enforcement Summary

| Component | Pattern | Status |
|-----------|---------|--------|
| Shell API proxy | Uses `VIENNA_RUNTIME_URL` | ✅ Correct |
| Workspace pages | Use `/api/workspace/*` | ✅ Fixed |
| Vienna Runtime client | Connects to runtime | ✅ Correct |
| Browser requests | Go through shell proxy | ✅ Enforced |

**Boundary violation resolved. Architecture enforcement complete.**

---

**Status:** Committed and pushed. Awaiting Vercel redeploy for validation.
