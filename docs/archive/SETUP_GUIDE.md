# Vienna OS — Environment Setup Guide

**For Max:** Step-by-step instructions to configure external services and deploy Vienna OS.

---

## Overview

Vienna OS requires configuration of several external services:
1. **Google OAuth** (for "Sign in with Google")
2. **GitHub OAuth** (for "Sign in with GitHub")
3. **Stripe** (for billing portal)
4. **Sentry** (for error tracking)
5. **Vercel** (deployment + environment variables)
6. **Database** (PostgreSQL migrations)

**Time estimate:** 30-45 minutes total

---

## 1. Google OAuth Setup (10 min)

**Purpose:** Allow users to sign in with Google accounts

### Steps:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Create a new project or select existing: "Vienna OS"

2. **Enable Google+ API**
   - Navigate to: **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

3. **Create OAuth Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "Vienna OS Production"
   
4. **Configure Authorized Redirect URIs**
   - Add this exact URL:
     ```
     https://api.regulator.ai/api/v1/auth/google/callback
     ```
   
5. **Save Credentials**
   - Copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
   - Copy the **Client Secret** (looks like `GOCSPX-abc123...`)
   - Save both for later (Step 6)

---

## 2. GitHub OAuth Setup (5 min)

**Purpose:** Allow users to sign in with GitHub accounts

### Steps:

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Click **OAuth Apps** → **New OAuth App**

2. **Create OAuth App**
   - Application name: `Vienna OS`
   - Homepage URL: `https://regulator.ai`
   - Authorization callback URL:
     ```
     https://api.regulator.ai/api/v1/auth/github/callback
     ```
   - Click **Register application**

3. **Save Credentials**
   - Copy the **Client ID** (looks like `Ov23li...`)
   - Click **Generate a new client secret**
   - Copy the **Client Secret** (looks like `ghp_...` or long random string)
   - Save both for later (Step 6)

---

## 3. Stripe Setup (10 min)

**Purpose:** Allow users to manage billing (update payment, view invoices, cancel)

### Steps:

1. **Create/Login to Stripe Account**
   - Visit: https://dashboard.stripe.com
   - Sign up if you don't have an account (free)
   - Activate your account (may require business verification)

2. **Enable Customer Portal**
   - Go to: **Settings** → **Billing** → **Customer Portal**
   - Click **Activate**
   - Configure branding (optional):
     - Business name: "Vienna OS"
     - Logo: Upload Vienna shield logo
     - Accent color: `#7c3aed` (Vienna purple)
   - Click **Save**

3. **Get API Key**
   - Go to: **Developers** → **API Keys**
   - **For testing (first):**
     - Copy **Secret key** (test mode) — starts with `sk_test_...`
   - **For production:**
     - Toggle to **Live mode** (top right)
     - Copy **Secret key** (live mode) — starts with `sk_live_...`
   - Save for later (Step 6)

4. **Optional: Create Test Subscription**
   - Go to **Products** → **Add Product**
   - Name: "Vienna OS Professional"
   - Price: $99/month
   - Save product ID for testing

---

## 4. Sentry Setup (5 min)

**Purpose:** Track errors and exceptions in production

### Steps:

1. **Create/Login to Sentry Account**
   - Visit: https://sentry.io
   - Sign up (free tier: 5,000 errors/month)

2. **Create New Project**
   - Platform: **Node.js**
   - Project name: "vienna-os-backend"
   - Team: Default team
   - Click **Create Project**

3. **Get DSN**
   - After project creation, you'll see setup instructions
   - Copy the **DSN** (looks like `https://abc123@o123.ingest.sentry.io/456`)
   - Save for later (Step 6)

**Optional:** Create second project for frontend (`vienna-os-console`)

---

## 5. Database Migrations (5 min)

**Purpose:** Add OAuth and Stripe columns to database

### Steps:

1. **Connect to your database**
   - If using Neon.tech, go to dashboard and click **SQL Editor**
   - Or use `psql`:
     ```bash
     psql $DATABASE_URL
     ```

2. **Run migrations**
   ```sql
   -- Add OAuth columns to users table
   ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

   -- Add Stripe customer ID to tenants table
   ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

   -- Create index for faster OAuth lookups
   CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id);
   ```

3. **Verify**
   ```sql
   -- Check users table
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('oauth_provider', 'oauth_provider_id', 'avatar_url');

   -- Check tenants table
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'tenants' 
   AND column_name = 'stripe_customer_id';
   ```
   
   Should return 4 rows total (3 from users, 1 from tenants).

---

## 6. Configure Vercel Environment Variables (10 min)

**Purpose:** Make all credentials available to the backend

### Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com
   - Select project: **vienna-backend** (console-proxy)

2. **Go to Settings → Environment Variables**
   - URL: https://vercel.com/[your-username]/vienna-backend/settings/environment-variables

3. **Add Production Variables**

   Click **Add Variable** for each:

   **OAuth (Google):**
   ```
   Name: GOOGLE_CLIENT_ID
   Value: [paste Client ID from Step 1]
   Environment: Production
   ```
   ```
   Name: GOOGLE_CLIENT_SECRET
   Value: [paste Client Secret from Step 1]
   Environment: Production
   ```

   **OAuth (GitHub):**
   ```
   Name: GITHUB_CLIENT_ID
   Value: [paste Client ID from Step 2]
   Environment: Production
   ```
   ```
   Name: GITHUB_CLIENT_SECRET
   Value: [paste Client Secret from Step 2]
   Environment: Production
   ```

   **Stripe:**
   ```
   Name: STRIPE_SECRET_KEY
   Value: [paste Secret Key from Step 3]
   Environment: Production
   ```

   **Sentry:**
   ```
   Name: SENTRY_DSN
   Value: [paste DSN from Step 4]
   Environment: Production
   ```

   **Core (should already exist, verify):**
   ```
   Name: JWT_SECRET
   Value: [your existing secret or generate: openssl rand -base64 32]
   Environment: Production
   ```
   ```
   Name: DATABASE_URL
   Value: [your PostgreSQL connection string]
   Environment: Production
   ```
   ```
   Name: CONSOLE_URL
   Value: https://console.regulator.ai
   Environment: Production
   ```
   ```
   Name: API_URL
   Value: https://api.regulator.ai
   Environment: Production
   ```

4. **Optional: Add Preview Variables**
   - Repeat above for "Preview" environment (for staging/PR deploys)
   - Use **test mode** Stripe key for preview
   - Use separate Sentry project for preview (optional)

---

## 7. Deploy to Production (5 min)

### Option A: Auto-Deploy (Git Push)

**If CI/CD workflows are enabled:**
```bash
cd /path/to/regulator-ai-repo
git push origin main
```

Vercel will auto-deploy on push.

### Option B: Manual Deploy (Vercel CLI)

**Backend:**
```bash
cd apps/console-proxy
vercel --prod
```

**Frontend:**
```bash
cd apps/console
vercel --prod
```

**Marketing:**
```bash
cd apps/marketing
vercel --prod
```

---

## 8. Verify Deployment (5 min)

### Backend Checks

1. **Health endpoint:**
   ```bash
   curl https://api.regulator.ai/api/v1/health
   # Should return: {"status":"healthy"}
   ```

2. **OAuth endpoints:**
   ```bash
   # Google OAuth (should redirect to Google)
   curl -I https://api.regulator.ai/api/v1/auth/google
   
   # GitHub OAuth (should redirect to GitHub)
   curl -I https://api.regulator.ai/api/v1/auth/github
   ```

3. **Sentry (check Sentry dashboard for test event)**

### Frontend Checks

1. **Console loads:**
   - Visit: https://console.regulator.ai
   - Should see login page

2. **OAuth buttons appear:**
   - Click "Sign in with Google" → Redirects to Google
   - Click "Sign in with GitHub" → Redirects to GitHub

3. **After OAuth login:**
   - Should redirect back to console
   - User should be logged in
   - Dashboard should load

### Billing Portal Check

1. **Login to console**
2. **Go to Settings page**
3. **Click "Manage Billing"**
4. **Should open Stripe customer portal**

---

## 9. Troubleshooting

### "OAuth redirect_uri_mismatch" error

**Cause:** Callback URL doesn't match what's configured in Google/GitHub

**Fix:**
1. Double-check callback URLs in Google/GitHub settings
2. Must be exact match: `https://api.regulator.ai/api/v1/auth/google/callback`
3. No trailing slash, no http (must be https)

### "Billing not configured" error

**Cause:** Stripe secret key not set in Vercel

**Fix:**
1. Check Vercel dashboard → Environment Variables
2. Verify `STRIPE_SECRET_KEY` exists and is correct
3. Redeploy after adding variable

### Sentry not receiving errors

**Cause:** DSN not configured or incorrect

**Fix:**
1. Check `SENTRY_DSN` in Vercel environment variables
2. Verify DSN format: `https://[key]@[org].ingest.sentry.io/[project]`
3. Check Sentry project settings for correct DSN

### User can't login after OAuth

**Cause:** Database missing OAuth columns

**Fix:**
1. Run migrations from Step 5
2. Verify columns exist:
   ```sql
   \d users  -- Should show oauth_provider, oauth_provider_id, avatar_url
   ```

---

## 10. Optional: Test with Personal Accounts

### Test OAuth Flow

1. **Google:**
   - Go to https://console.regulator.ai
   - Click "Sign in with Google"
   - Select your Google account
   - Should create user account and log you in
   - Check database: `SELECT * FROM users WHERE email = 'your@gmail.com';`

2. **GitHub:**
   - Logout
   - Click "Sign in with GitHub"
   - Authorize the app
   - Should log you in with same account if email matches

### Test Billing Portal

**Note:** You'll need a Stripe customer ID first.

**To create test customer:**
1. Go to Stripe dashboard
2. **Customers** → **Add Customer**
3. Email: your email
4. Copy customer ID (`cus_...`)
5. In database:
   ```sql
   UPDATE tenants SET stripe_customer_id = 'cus_...' WHERE id = 'your-tenant-id';
   ```
6. Now "Manage Billing" button should work

---

## Summary Checklist

- [ ] Google OAuth configured (Client ID + Secret in Vercel)
- [ ] GitHub OAuth configured (Client ID + Secret in Vercel)
- [ ] Stripe customer portal enabled (Secret Key in Vercel)
- [ ] Sentry project created (DSN in Vercel)
- [ ] Database migrations run (OAuth + Stripe columns)
- [ ] Vercel environment variables set (all 10+ vars)
- [ ] Backend deployed to production
- [ ] Frontend deployed to production
- [ ] Health checks pass
- [ ] OAuth login works end-to-end
- [ ] Billing portal opens successfully
- [ ] Errors appear in Sentry dashboard

---

## What You DON'T Need to Set Up

**Already working:**
- ✅ API endpoints (all 28 endpoints deployed)
- ✅ Console UI (21 pages)
- ✅ Database (PostgreSQL on Neon)
- ✅ Domain routing (api.regulator.ai, console.regulator.ai)
- ✅ HTTPS/SSL (Vercel handles this)
- ✅ Swagger UI (https://api.regulator.ai/api/v1/docs)

**Optional for later:**
- ⏸ MFA/2FA (not implemented yet)
- ⏸ Usage-based billing (Flat pricing for now: $49/$99)
- ⏸ Notification backend (Frontend ready, backend returns empty array)

---

## Getting Help

**If you get stuck:**
1. Check Vercel deployment logs (real-time errors)
2. Check Sentry dashboard (production errors)
3. Check browser console (F12 → Console tab)
4. Ping Vienna in #agent-coordination

**Common first-time deploy issues:**
- Missing environment variable → Add in Vercel settings, redeploy
- OAuth callback mismatch → Double-check exact URL in Google/GitHub
- Database column missing → Run migrations from Step 5

---

**After all steps complete, Vienna OS will be fully operational! 🚀**
