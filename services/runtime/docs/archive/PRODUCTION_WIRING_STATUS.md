# Production Wiring Status Report

**Date**: 2026-03-22 17:20 EDT  
**Status**: Configured and deployed, pending final validation

## Deployment Architecture

### GitHub Source of Truth
- **Repository**: `https://github.com/risk-ai/regulator.ai`
- **Branch**: `main`
- **Latest Commit**: `cef36ab` - "feat: configure production API endpoint for Vercel deployment"

### Backend (Fly.io)
- **App Name**: `vienna-os`
- **URL**: `https://vienna-os.fly.dev`
- **Status**: ✅ Deployed and healthy
- **Last Deploy**: 2026-03-22 21:15 UTC
- **Health Check**: `https://vienna-os.fly.dev/health` → `200 OK`

#### Backend Configuration
- **CORS Origins**: 
  - `https://vienna-core-eight.vercel.app`
  - `https://regulator.ai`
- **Required Secrets** (all set):
  - `ANTHROPIC_API_KEY`
  - `VIENNA_OPERATOR_NAME`
  - `VIENNA_OPERATOR_PASSWORD`
  - `VIENNA_SESSION_SECRET`
  - `CORS_ORIGIN` (singular, as code expects)
  - `OPERATOR_PASSWORD`
  - `SESSION_SECRET`

### Frontend (Vercel)
- **Project**: `vienna-core`
- **Workspace**: `max-andersons-projects-6562eb7f`
- **Production URL**: `https://vienna-core-eight.vercel.app`
- **Build Source**: `vienna-core/console/client/`
- **Build Command**: `cd console/client && npm ci && npm run build`
- **Output Directory**: `console/client/dist`

#### Frontend Configuration
- **API Endpoint**: Configured via `.env.production`
  ```
  VITE_API_BASE=https://vienna-os.fly.dev/api/v1
  ```
- **API Client**: Updated to read `import.meta.env.VITE_API_BASE`

### Domain Status
- **regulator.ai**: Points to Next.js marketing site (separate Vercel project)
- **Vienna Console**: Accessible at `vienna-core-eight.vercel.app`

## Changes Made (2026-03-22)

### 1. Backend CORS Fix
```bash
fly secrets set CORS_ORIGIN="https://vienna-core-eight.vercel.app,https://regulator.ai" --app vienna-os
fly secrets unset CORS_ORIGINS --app vienna-os  # Removed incorrect plural version
```

### 2. Frontend API Configuration
- Created `vienna-core/console/client/.env.production`:
  ```
  VITE_API_BASE=https://vienna-os.fly.dev/api/v1
  ```

### 3. API Client Update
- Modified `vienna-core/console/client/src/api/client.ts`:
  ```typescript
  const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
  ```

### 4. Vercel Proxy Config (Reverted)
- Initially tried Vercel rewrites, but not needed for static builds
- Frontend makes direct requests to backend (CORS handles cross-origin)

## Production Validation Checklist

### Backend Health
- [✅] `/health` endpoint responds `200 OK`
- [✅] CORS headers present for frontend origin
- [✅] All required secrets configured
- [✅] App running and healthy on Fly

### Frontend Build
- [ ] Latest commit deployed to Vercel
- [ ] Production build uses `VITE_API_BASE` environment variable
- [ ] Static assets served correctly

### End-to-End Flow
- [ ] Open `https://vienna-core-eight.vercel.app`
- [ ] Login works (auth cookies set correctly)
- [ ] API requests go to `https://vienna-os.fly.dev/api/v1/*`
- [ ] No CORS errors in browser console
- [ ] Session handling works
- [ ] Health/status displays correctly

## Manual Validation Steps

1. **Trigger Vercel Rebuild** (if auto-deploy didn't trigger):
   ```bash
   cd ~/.openclaw/workspace/vienna-core
   vercel --prod --scope max-andersons-projects-6562eb7f
   ```

2. **Test Frontend**:
   ```bash
   curl -s https://vienna-core-eight.vercel.app/ | grep -o '<title>Vienna'
   ```
   Expected: `<title>Vienna`

3. **Test CORS from Browser**:
   Open browser console on `https://vienna-core-eight.vercel.app`:
   ```javascript
   fetch('https://vienna-os.fly.dev/api/v1/health', {credentials: 'include'})
     .then(r => r.json())
     .then(console.log)
   ```
   Expected: No CORS error, health data returned

4. **Test Login Flow**:
   - Navigate to `https://vienna-core-eight.vercel.app`
   - Enter operator credentials
   - Verify auth cookie is set
   - Verify dashboard loads

## Deferred Items (Non-Blocking)

1. **Custom Domain for Vienna Console**:
   - Current URL (`vienna-core-eight.vercel.app`) is a Vercel preview URL
   - Consider adding a custom domain like `console.regulator.ai` or `vienna.regulator.ai`
   - Steps: DNS CNAME → Vercel domain settings

2. **Remove Stale Vercel Deployments**:
   - Many preview deployments exist
   - Clean up old deployments to reduce clutter

3. **Repository Structure**:
   - `regulator.ai` GitHub repo contains both marketing site (root) and Vienna console (nested `vienna-core/`)
   - Consider splitting into separate repos for cleaner separation

## Remaining Issues (None Blocking)

None identified. All core wiring is in place.

## Production URLs

- **Backend API**: https://vienna-os.fly.dev/api/v1/
- **Frontend App**: https://vienna-core-eight.vercel.app/
- **Marketing Site**: https://regulator.ai/

## Next Steps

1. Wait for Vercel deployment to complete (~2-3 minutes from latest push)
2. Perform end-to-end validation checklist
3. If validation passes → production is fully wired
4. If issues found → debug and iterate

---

**Operator**: Max Anderson  
**Session**: 2026-03-22 WebChat  
**Task**: Full production wiring fix (GitHub → Vercel → Fly)
