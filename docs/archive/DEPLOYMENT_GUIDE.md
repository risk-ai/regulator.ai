# Vienna OS — Deployment Guide

**Quick guide for deploying to Vercel (production + staging).**

---

## Prerequisites

1. **Vercel account** — https://vercel.com
2. **GitHub connected** — Link repo to Vercel
3. **Environment variables** — Configure in Vercel dashboard

---

## One-Time Setup

### 1. Import Projects to Vercel

**Backend (console-proxy):**
```bash
# From Vercel dashboard or CLI
vercel --cwd apps/console-proxy
# Follow prompts, name it "vienna-backend"
```

**Frontend (console):**
```bash
vercel --cwd apps/console  
# Follow prompts, name it "vienna-console"
```

**Marketing site:**
```bash
vercel --cwd apps/marketing
# Follow prompts, name it "vienna-marketing"
```

### 2. Configure Environment Variables

**Go to:** Vercel Dashboard → Project → Settings → Environment Variables

**Backend (vienna-backend):**
```
DATABASE_URL=postgresql://user:pass@host:5432/vienna_prod
JWT_SECRET=<strong-random-secret>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GITHUB_CLIENT_ID=Ov23...
GITHUB_CLIENT_SECRET=...
CONSOLE_URL=https://console.regulator.ai
API_URL=https://api.regulator.ai
```

**Frontend (vienna-console):**
```
VITE_API_URL=https://api.regulator.ai
```

**Marketing (vienna-marketing):**
```
RESEND_API_KEY=re_...
DATABASE_URL=postgresql://user:pass@host:5432/vienna_prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

**Environment:** Set "Production" for prod values, "Preview" for staging.

### 3. Configure Domains

**Backend:**
- Production: `api.regulator.ai`
- Preview: `staging-api.regulator.ai` (or auto-generated)

**Frontend:**
- Production: `console.regulator.ai`
- Preview: `staging.console.regulator.ai`

**Marketing:**
- Production: `regulator.ai` + `www.regulator.ai`

---

## Manual Deployment

### Deploy Backend

```bash
cd apps/console-proxy
vercel --prod  # Production
# or
vercel         # Preview (staging)
```

### Deploy Frontend

```bash
cd apps/console
vercel --prod  # Production
# or
vercel         # Preview
```

### Deploy Marketing

```bash
cd apps/marketing  
vercel --prod  # Production
# or
vercel         # Preview
```

---

## Automated Deployment (Optional)

**⚠️ Currently disabled** — Auto-deploy workflows exist but need GitHub secrets configured.

### To Enable Auto-Deploy:

1. **Configure GitHub Secrets:**
   - Go to: GitHub repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     ```
     VERCEL_TOKEN=<token-from-vercel-account-settings>
     VERCEL_ORG_ID=<from-vercel-settings>
     VERCEL_PROJECT_ID_BACKEND=<from-vienna-backend-settings>
     VERCEL_PROJECT_ID_CONSOLE=<from-vienna-console-settings>
     PRODUCTION_DATABASE_URL=postgresql://...
     PRODUCTION_JWT_SECRET=...
     PRODUCTION_STRIPE_SECRET_KEY=sk_live_...
     PRODUCTION_STRIPE_WEBHOOK_SECRET=whsec_...
     PRODUCTION_RESEND_API_KEY=re_...
     STAGING_DATABASE_URL=postgresql://...
     STAGING_JWT_SECRET=...
     STAGING_STRIPE_SECRET_KEY=sk_test_...
     ```

2. **Enable workflows:**
   - Edit `.github/workflows/deploy-production.yml`
   - Change `on: workflow_dispatch` to:
     ```yaml
     on:
       push:
         branches: [main]
       workflow_dispatch:
     ```

3. **Push to main** → Auto-deploys to production

---

## Quick Deploy Checklist

Before deploying:

- [ ] Tests pass (`npm test` in `sdk/node`)
- [ ] Marketing site builds (`cd apps/marketing && npm run build`)
- [ ] No TypeScript errors
- [ ] Environment variables set in Vercel

To deploy:

```bash
# Backend
cd apps/console-proxy && vercel --prod

# Frontend  
cd apps/console && vercel --prod

# Marketing
cd apps/marketing && vercel --prod
```

Verify:
- [ ] Health: https://api.regulator.ai/api/v1/health → `{"status":"healthy"}`
- [ ] Console: https://console.regulator.ai → Loads
- [ ] Marketing: https://regulator.ai → Loads

---

## Troubleshooting

### Build fails: "Module not found"

**Fix:** Check relative imports vs `@/` path alias in `tsconfig.json`

Example: Change `from '../../../../lib/xyz'` to `from '@/lib/xyz'`

### Vercel deployment fails: "Missing token"

**Fix:** Either:
1. Use manual deployment (`vercel --prod` from terminal)
2. Configure `VERCEL_TOKEN` in GitHub secrets (for CI/CD)

### Environment variable not found

**Fix:** 
1. Check Vercel dashboard → Project → Settings → Environment Variables
2. Ensure variable is set for "Production" environment
3. Redeploy after adding variable

### CORS error

**Fix:** Check `CORS_ORIGIN` in backend env variables. Should include frontend URL.

---

## Current Status

**Last deployed:** 2026-03-31  
**Method:** Manual (Vercel CLI)  
**Auto-deploy:** ❌ Disabled (needs secrets)  
**Production URLs:**
- Backend: https://api.regulator.ai
- Console: https://console.regulator.ai
- Marketing: https://regulator.ai

**Next steps:**
1. Fix marketing build errors (email service imports) ✅
2. Configure GitHub secrets (optional, for auto-deploy)
3. Test OAuth flows end-to-end
4. Deploy billing portal integration

---

**Ready to deploy? Use manual Vercel CLI commands above.**
