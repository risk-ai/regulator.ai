# Production Fix Instructions

**Status:** Investigation complete, fixes identified  
**Time required:** ~20 minutes  
**Priority:** P0 (Production currently non-operational)

---

## Summary

Production deployment is **partially broken** due to configuration mismatch:

1. ❌ Frontend pointing to wrong backend app
2. ❌ Backend missing authentication credentials
3. ✅ CORS fix committed (awaiting deployment)

---

## Required Actions

### 1. Update Vercel Environment Variable (2 minutes)

**Why:** Frontend is calling `vienna-runtime-preview.fly.dev` (old/stale app) instead of `vienna-os.fly.dev` (correct app)

**Action:**
```bash
# Via Vercel CLI
cd /home/maxlawai/regulator.ai
vercel env rm VIENNA_RUNTIME_URL production
vercel env add VIENNA_RUNTIME_URL production
# When prompted, enter: https://vienna-os.fly.dev

# Trigger redeploy
vercel deploy --prod
```

**Or via Vercel Dashboard:**
1. Go to https://vercel.com/ai-ventures-portfolio/regulator-ai/settings/environment-variables
2. Find `VIENNA_RUNTIME_URL`
3. Edit production value to: `https://vienna-os.fly.dev`
4. Trigger new production deployment

**Validation:**
```bash
# After redeploy completes
curl https://regulator.ai
# Check page source for API calls, should reference vienna-os.fly.dev
```

---

### 2. Configure Fly Secrets (2 minutes)

**Why:** Backend cannot authenticate operators without credentials

**Action:**
```bash
# Install Fly CLI if not present
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Set secrets
flyctl secrets set \
  VIENNA_OPERATOR_PASSWORD="$(openssl rand -base64 32)" \
  VIENNA_SESSION_SECRET="$(openssl rand -hex 32)" \
  --app vienna-os

# Save password to secure location
echo "VIENNA_OPERATOR_PASSWORD=$(openssl rand -base64 32)" > ~/vienna-prod-creds.txt
chmod 600 ~/vienna-prod-creds.txt
```

**Alternative (manual password):**
```bash
flyctl secrets set \
  VIENNA_OPERATOR_PASSWORD="YourSecurePasswordHere" \
  VIENNA_SESSION_SECRET="$(openssl rand -hex 32)" \
  --app vienna-os
```

**Validation:**
```bash
# After secrets set (app auto-restarts)
curl -X POST https://vienna-os.fly.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YourSecurePasswordHere"}'

# Should return session token, NOT "Invalid credentials"
```

---

### 3. Deploy Backend with CORS Fix (5 minutes)

**Why:** Backend needs to accept requests from `https://regulator.ai`

**Status:** ✅ CORS fix already committed to main branch (`e4c7986`)

**Action:**
```bash
cd /home/maxlawai/regulator.ai/services/vienna-runtime

# Deploy updated configuration
flyctl deploy --app vienna-os

# Monitor deployment
flyctl logs --app vienna-os
```

**Validation:**
```bash
# After deploy completes
curl -H "Origin: https://regulator.ai" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://vienna-os.fly.dev/api/v1/auth/login

# Should include: Access-Control-Allow-Origin: https://regulator.ai
```

---

### 4. End-to-End Validation (10 minutes)

**After all fixes applied:**

#### Test 1: Frontend loads
```bash
curl -I https://regulator.ai
# Should return 200 OK
```

#### Test 2: Frontend can reach backend
```bash
# Open browser console at https://regulator.ai/workspace
# Check Network tab for API calls
# Should see requests to vienna-os.fly.dev (not vienna-runtime-preview.fly.dev)
```

#### Test 3: Operator login works
```bash
# Go to https://regulator.ai
# Find login form (if visible) or auth endpoint
# Enter configured password
# Should receive session cookie + redirect to workspace
```

#### Test 4: Governed execution path
```bash
# After successful login:
# 1. Navigate to chat panel
# 2. Send test message
# 3. Verify backend processes through governance pipeline
# 4. Check response includes Vienna Core metadata

# Or via API:
SESSION_COOKIE="..." # from login

curl -X POST https://vienna-os.fly.dev/api/v1/chat \
  -H "Cookie: vienna_session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"message":"show status"}'

# Should return governed response
```

---

### 5. Optional Cleanup (1 minute)

**Decommission stale Fly app:**

```bash
# Destroy old preview app (no longer needed)
flyctl apps destroy vienna-runtime-preview --yes

# Confirm destroyed
flyctl apps list
# Should NOT show vienna-runtime-preview
```

---

## Checklist

- [ ] Vercel `VIENNA_RUNTIME_URL` updated to `https://vienna-os.fly.dev`
- [ ] Vercel production redeployed
- [ ] Fly secrets configured (`VIENNA_OPERATOR_PASSWORD`, `VIENNA_SESSION_SECRET`)
- [ ] Backend deployed with CORS fix
- [ ] Frontend loads successfully
- [ ] Frontend calls correct backend
- [ ] Operator login works
- [ ] Chat/governed execution works
- [ ] (Optional) Stale app destroyed

---

## Expected Outcome

**After all fixes:**

✅ Frontend at `https://regulator.ai` operational  
✅ Backend at `https://vienna-os.fly.dev` credentialed + accessible  
✅ CORS allows cross-origin requests  
✅ Operator can authenticate  
✅ Governed execution pipeline functional  
✅ Full Intent → Plan → Policy → Approval → Execution → Verification → Ledger flow works  

**Production status:** 🟢 FULLY OPERATIONAL

---

## Troubleshooting

### Issue: "Invalid credentials" after setting password

**Cause:** Secrets not applied or app didn't restart

**Fix:**
```bash
flyctl secrets list --app vienna-os  # Verify secrets set
flyctl restart --app vienna-os       # Force restart
```

### Issue: CORS errors in browser console

**Cause:** Backend not redeployed with CORS fix or wrong origin

**Fix:**
```bash
flyctl logs --app vienna-os | grep CORS  # Check CORS config loaded
curl -I https://vienna-os.fly.dev/health | grep -i cors  # Verify headers
```

### Issue: Frontend still calling old backend

**Cause:** Vercel env var not updated or deployment cached

**Fix:**
```bash
vercel env pull .env.vercel
cat .env.vercel | grep VIENNA_RUNTIME_URL  # Verify value
vercel deploy --prod --force              # Force redeploy
```

---

## Contact

**Investigation:** Vienna (Conductor)  
**Report:** `FLY_DEPLOYMENT_INVESTIGATION_REPORT.md`  
**Date:** 2026-03-22
