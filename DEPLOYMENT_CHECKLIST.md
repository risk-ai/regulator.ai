# Vienna OS — Deployment Checklist

**Before deploying new features to production.**

---

## Pre-Deployment Audit

### 1. Code Quality

- [ ] All tests pass (`sdk/node`: `npm test`)
- [ ] No console errors in browser (F12 → Console tab)
- [ ] No TypeScript errors (`apps/console`: `npm run build`)
- [ ] Linter passes (`npm run lint` in relevant directories)

### 2. Dependencies

- [ ] All `package.json` dependencies installed
- [ ] No missing modules (`node -e "require('./path/to/file')"` for new files)
- [ ] Production dependencies only (no devDependencies in runtime code)

### 3. Environment Variables

**Backend (`apps/console-proxy`):**
- [ ] `DATABASE_URL` set (PostgreSQL connection string)
- [ ] `JWT_SECRET` set (strong secret, not default)
- [ ] `STRIPE_SECRET_KEY` set (if billing enabled)
- [ ] `STRIPE_WEBHOOK_SECRET` set (if webhooks enabled)
- [ ] `RESEND_API_KEY` set (if email enabled)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (if OAuth enabled)
- [ ] `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (if OAuth enabled)
- [ ] `CONSOLE_URL` set (https://console.regulator.ai)
- [ ] `API_URL` set (https://api.regulator.ai)

**Frontend (`apps/console`):**
- [ ] `VITE_API_URL` set (https://api.regulator.ai)

### 4. Database

- [ ] Migrations run (`apps/console-proxy/database/*.sql`)
- [ ] Tables exist: `tenants`, `users`, `agents`, `policies`, `warrants`, `api_keys`, `webhooks`
- [ ] Indexes created (`database/indexes.sql`)
- [ ] No missing columns (check schema against queries)

### 5. Routes & Endpoints

- [ ] New routes added to `vercel.json`
- [ ] Health check works: `curl https://api.regulator.ai/api/v1/health`
- [ ] No 404s on new endpoints
- [ ] CORS headers present (`Access-Control-Allow-Origin`)

### 6. Security

- [ ] No secrets in code (use environment variables)
- [ ] No console.log of sensitive data
- [ ] SQL queries use parameterized statements (no string interpolation)
- [ ] Rate limiting enabled (check `rateLimitBuckets` in `api/server.js`)
- [ ] JWT tokens expire (check `exp` claim)
- [ ] HTTPS enforced (no http:// URLs in production)

### 7. Error Handling

- [ ] All async functions have try/catch
- [ ] Errors return JSON (not HTML stack traces)
- [ ] 401 for auth failures, 403 for permissions, 404 for not found, 500 for server errors
- [ ] User-friendly error messages (no internal details exposed)

---

## Staging Deployment

### 1. Push to `develop` branch

```bash
git checkout develop
git merge main
git push origin develop
```

### 2. GitHub Actions Workflow

- [ ] `.github/workflows/deploy-staging.yml` runs
- [ ] Backend deployed to Vercel (staging environment)
- [ ] Frontend deployed to Vercel (staging environment)
- [ ] Smoke tests pass (health checks)

### 3. Manual Testing

**Backend:**
- [ ] Health: https://staging-api.regulator.ai/api/v1/health → `{"status":"healthy"}`
- [ ] Docs: https://staging-api.regulator.ai/api/v1/docs → Swagger UI loads
- [ ] Auth: Login works
- [ ] API: Submit intent, approve, verify warrant

**Frontend:**
- [ ] Console: https://staging.console.regulator.ai → Loads
- [ ] Login: Email/password works
- [ ] OAuth: Google/GitHub login works (if enabled)
- [ ] Dashboard: Displays agents, policies, warrants
- [ ] Now page: SSE stream updates in real-time

**Billing (if enabled):**
- [ ] Billing portal: POST /api/v1/billing/portal → Returns Stripe URL
- [ ] Customer portal: Opens Stripe portal, shows subscription

**OAuth (if enabled):**
- [ ] Google: /api/v1/auth/google → Redirects to Google
- [ ] GitHub: /api/v1/auth/github → Redirects to GitHub
- [ ] Callback: Returns JWT token, redirects to console

### 4. Performance

- [ ] API response time < 200ms (check logs)
- [ ] Frontend load time < 2s
- [ ] No memory leaks (monitor for 15 minutes)

### 5. Monitoring

- [ ] Vercel logs show no errors
- [ ] Database queries under 100ms
- [ ] No rate limit violations

---

## Production Deployment

### 1. Push to `main` branch

```bash
git checkout main
git merge develop
git push origin main
```

### 2. GitHub Actions Workflow

- [ ] `.github/workflows/deploy-production.yml` runs
- [ ] Backend deployed to Vercel (production)
- [ ] Frontend deployed to Vercel (production)
- [ ] Smoke tests pass
- [ ] Deployment tag created (`deploy-YYYYMMDD-HHMMSS`)

### 3. Post-Deployment Checks

**Immediate (within 5 minutes):**
- [ ] Health: https://api.regulator.ai/api/v1/health → `{"status":"healthy"}`
- [ ] Frontend: https://console.regulator.ai → Loads
- [ ] Login: Auth works
- [ ] Docs: https://api.regulator.ai/api/v1/docs → Swagger UI loads

**Within 1 hour:**
- [ ] No errors in Vercel logs
- [ ] No customer support tickets
- [ ] API response times normal
- [ ] SSE streams working (check Now page)

**Within 24 hours:**
- [ ] No regressions reported
- [ ] User engagement stable (check GA4)
- [ ] Database performance normal

### 4. Rollback Plan

**If critical bug found:**

1. **Revert deployment:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Or redeploy previous version:**
   ```bash
   git checkout <previous-commit>
   vercel --prod --token=$VERCEL_TOKEN
   ```

3. **Check Vercel dashboard:**
   - Go to https://vercel.com/vienna-os
   - Click "Rollback" on previous deployment

**If database migration fails:**
- Restore from backup (Neon/Supabase snapshots)
- Do NOT run new migrations until fixed

---

## New Feature Checklist (Apply to Each Feature)

### OAuth (Google/GitHub)

- [x] Dependencies installed: `passport`, `passport-google-oauth20`, `passport-github2`, `jsonwebtoken`
- [x] Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [x] Routes added: `/api/v1/auth/google`, `/api/v1/auth/github`, `/api/v1/auth/google/callback`, `/api/v1/auth/github/callback`
- [x] Database: `users` table has `oauth_provider`, `oauth_provider_id`, `avatar_url` columns
- [x] Callback URL configured in Google/GitHub OAuth apps
- [ ] **DEPLOY:** Test OAuth flow end-to-end on staging

### Billing Portal

- [x] Dependencies installed: `stripe`
- [x] Environment variables: `STRIPE_SECRET_KEY`
- [x] Route added: `/api/v1/billing/portal`
- [x] Database: `tenants` table has `stripe_customer_id` column
- [x] Error handling: Returns 503 if Stripe not configured
- [ ] **DEPLOY:** Test portal URL generation on staging
- [ ] **DEPLOY:** Verify Stripe customer portal opens correctly

### Swagger UI

- [x] Dependencies installed: `swagger-ui-express`, `yamljs`
- [x] Route added: `/api/v1/docs`
- [x] OpenAPI spec: `apps/console-proxy/openapi.yaml` exists and valid
- [ ] **DEPLOY:** Test Swagger UI loads at /api/v1/docs
- [ ] **DEPLOY:** Verify API endpoints listed correctly

### SDK Tests & Examples

- [x] Tests: `sdk/node/tests/client.test.ts` (16 tests, all passing)
- [x] Examples: 5 files in `sdk/node/examples/`
- [x] Dependencies: `vitest` installed
- [x] CI: Tests run on GitHub Actions
- [ ] **PUBLISH:** Bump SDK version to 0.2.0
- [ ] **PUBLISH:** Publish to npm (`npm publish`)

### Docker Setup

- [x] `Dockerfile` created (Node 20 Alpine)
- [x] `docker-compose.yml` created (PostgreSQL + backend + frontend)
- [x] `.dockerignore` created
- [x] `DOCKER.md` documentation written
- [ ] **TEST:** Build Docker image locally (`docker build .`)
- [ ] **TEST:** Run `docker compose up` and verify all services start

### CI/CD Workflows

- [x] `.github/workflows/deploy-staging.yml` created
- [x] `.github/workflows/deploy-production.yml` created
- [x] Secrets configured in GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_BACKEND`, `VERCEL_PROJECT_ID_CONSOLE`
- [ ] **TEST:** Push to `develop` → triggers staging deploy
- [ ] **TEST:** Push to `main` → triggers production deploy
- [ ] **TEST:** Smoke tests pass on both environments

---

## Common Issues & Fixes

### Issue: Module not found error

**Symptom:** `Error: Cannot find module 'xyz'`

**Fix:**
```bash
cd apps/console-proxy
npm install xyz --save
git add package.json package-lock.json
git commit -m "fix: add missing dependency xyz"
```

### Issue: Database query fails (column not found)

**Symptom:** `ERROR: column "xyz" does not exist`

**Fix:**
1. Check migration file (`database/*.sql`)
2. Run migration on staging database
3. Verify column exists: `SELECT * FROM information_schema.columns WHERE table_name = 'tablename';`

### Issue: OAuth callback fails (redirect URI mismatch)

**Symptom:** Google/GitHub shows "redirect_uri_mismatch" error

**Fix:**
1. Go to Google Cloud Console / GitHub OAuth Apps
2. Add callback URL: `https://api.regulator.ai/api/v1/auth/google/callback`
3. Wait 5 minutes for propagation

### Issue: Stripe API error (invalid key)

**Symptom:** `StripeAuthenticationError: Invalid API Key provided`

**Fix:**
1. Check Vercel environment variables: `STRIPE_SECRET_KEY`
2. Verify key starts with `sk_live_` (production) or `sk_test_` (staging)
3. Redeploy after fixing

### Issue: CORS error in browser

**Symptom:** `Access to fetch at '...' has been blocked by CORS policy`

**Fix:**
1. Check `CORS_ORIGIN` environment variable in backend
2. Should include: `https://console.regulator.ai,https://api.regulator.ai`
3. Verify CORS headers in response: `curl -I https://api.regulator.ai/api/v1/health`

---

## Deployment History

| Date | Commit | Features | Status |
|------|--------|----------|--------|
| 2026-03-31 | `c53647b` | OAuth, billing, Docker, CI/CD fixes | ✅ Staged |
| 2026-03-31 | `36e7c17` | OAuth, billing, Docker, CI/CD | ✅ Complete |
| 2026-03-31 | `e1b6c3c` | SDK tests, examples, Swagger UI | ✅ Deployed |

---

## Sign-Off

**Before merging to production:**

- [ ] Vienna (Technical Lead) approves
- [ ] Smoke tests pass on staging
- [ ] No blockers or critical bugs
- [ ] Deployment window confirmed (avoid Friday afternoons)

**Post-deployment:**

- [ ] Monitor Vercel logs for 30 minutes
- [ ] Check error rate in GA4
- [ ] Verify no customer complaints
- [ ] Update `DEPLOYMENT_HISTORY.md` with results

---

**Ready to deploy? Run through this checklist twice. Ship when confident.**
