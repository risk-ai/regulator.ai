# Runbook: Configure Vercel (Product Shell)

**Purpose:** Configure Vercel environment for regulator.ai product shell  
**Audience:** DevOps, Platform Engineers  
**Prerequisite:** Vercel account, project connected to GitHub repo

---

## Quick Reference

**Set environment variable:**
```bash
vercel env add VARIABLE_NAME <environment>
```

**Trigger redeploy:**
```bash
git push origin main  # Production
git push origin <branch>  # Preview
```

---

## Step 1: Access Vercel Project

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select project: `regulator-ai`
3. Click Settings → Environment Variables

**Via CLI:**
```bash
vercel env ls
```

---

## Step 2: Configure Shell Environment Variables

### Required Variables

**All Environments:**

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...@neon.tech/regulator` | Shell database (proposals, warrants) |
| `VIENNA_RUNTIME_URL` | `https://vienna-runtime.fly.dev` | Runtime service URL |

### Optional Variables

**Staging/Production Only:**

| Variable | Value | Notes |
|----------|-------|-------|
| `WORKSPACE_AUTH_TOKEN` | `<base64-token>` | Workspace auth (not needed for dev) |
| `NEXTAUTH_SECRET` | `<secret>` | Future: NextAuth session secret |
| `NEXTAUTH_URL` | `https://app.example.com` | Future: NextAuth callback URL |
| `GOOGLE_CLIENT_ID` | `<client-id>` | Future: Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `<client-secret>` | Future: Google OAuth |

---

## Step 3: Configure Preview Environment

**Set preview variables:**

```bash
# Database (Neon preview branch)
vercel env add DATABASE_URL preview
# Enter: postgresql://user:pass@ep-name.neon.tech/regulator_preview?sslmode=require

# Vienna Runtime (preview instance)
vercel env add VIENNA_RUNTIME_URL preview
# Enter: https://vienna-runtime-preview.fly.dev

# Auth token (preview)
vercel env add WORKSPACE_AUTH_TOKEN preview
# Enter: <generate via: openssl rand -base64 32>
```

**Or via dashboard:**

1. Settings → Environment Variables
2. Click "Add New"
3. Name: `DATABASE_URL`
4. Value: `postgresql://...`
5. Environment: ☑ Preview
6. Click "Save"

**Verify:**
```bash
vercel env ls
```

**Expected output:**
```
DATABASE_URL            Preview
VIENNA_RUNTIME_URL      Preview
WORKSPACE_AUTH_TOKEN    Preview
```

---

## Step 4: Configure Production Environment

**Set production variables:**

```bash
# Database (Neon production)
vercel env add DATABASE_URL production
# Enter: postgresql://user:pass@ep-name.neon.tech/regulator_prod?sslmode=require

# Vienna Runtime (production instance)
vercel env add VIENNA_RUNTIME_URL production
# Enter: https://vienna-runtime.fly.dev

# Auth token (production)
vercel env add WORKSPACE_AUTH_TOKEN production
# Enter: <generate via: openssl rand -base64 32>
```

**Verify:**
```bash
vercel env ls
```

**Expected output:**
```
DATABASE_URL            Production
VIENNA_RUNTIME_URL      Production
WORKSPACE_AUTH_TOKEN    Production
```

---

## Step 5: Configure Development Environment (Local)

**Create `.env.local` file:**

```bash
# In repo root
cat > .env.local << 'EOF'
# Local development configuration

# Database (local or Neon dev)
DATABASE_URL=postgresql://user:pass@localhost:5432/regulator_dev

# Vienna Runtime (local)
VIENNA_RUNTIME_URL=http://localhost:3001

# Auth (disabled for local dev)
# WORKSPACE_AUTH_TOKEN=  # Intentionally not set
EOF
```

**⚠️ IMPORTANT:** Never commit `.env.local` (already in `.gitignore`)

**Verify:**
```bash
cat .env.local
# Should show local config
```

---

## Step 6: Trigger Deployment

### Preview Deployment

**Automatic (on PR):**
1. Create PR or push to branch
2. Vercel auto-deploys preview
3. Preview URL: `https://<branch>.vercel.app`

**Manual:**
```bash
vercel --preview
```

### Production Deployment

**Automatic (on merge to main):**
1. Merge PR to `main`
2. Vercel auto-deploys to production
3. Production URL: `https://app.your-domain.com`

**Manual:**
```bash
vercel --prod
```

---

## Step 7: Verify Deployment

### Check Deployment Status

**Via dashboard:**
1. Go to Deployments tab
2. Check latest deployment status
3. Click deployment to see logs

**Via CLI:**
```bash
vercel ls
```

**Expected output:**
```
Age  Deployment                              State     URL
2m   regulator-ai-abc123.vercel.app         READY     https://...
```

### Check Environment Variables Loaded

**SSH into deployment (not available in Vercel)**

**Alternative: Check via logs**

Vercel doesn't expose environment variables directly. Instead:

1. Add diagnostic route (temporary):
   ```typescript
   // src/app/api/debug/env/route.ts
   export async function GET() {
     return Response.json({
       vienna_runtime_url: !!process.env.VIENNA_RUNTIME_URL,
       database_url: !!process.env.DATABASE_URL,
       workspace_auth_token: !!process.env.WORKSPACE_AUTH_TOKEN
     });
   }
   ```

2. Call endpoint:
   ```bash
   curl https://preview.vercel.app/api/debug/env
   # {"vienna_runtime_url":true,"database_url":true,...}
   ```

3. Remove diagnostic route after verification

---

## Step 8: Test Shell → Runtime Connection

**Test from deployed shell:**

```bash
# Test investigations proxy
curl https://preview.vercel.app/api/workspace/investigations

# With auth (if configured):
curl -H "Authorization: Bearer <token>" \
  https://preview.vercel.app/api/workspace/investigations
```

**Expected response:**
```json
[]
```
or
```json
[
  {
    "id": "inv_001",
    "name": "Investigation Name",
    ...
  }
]
```

**Test in browser:**

1. Navigate to https://preview.vercel.app/workspace
2. Should load workspace UI
3. Click "Investigations"
4. Should load investigation list (may be empty)
5. Check Network tab: requests to `/api/workspace/investigations`
6. Verify no CORS errors in console

---

## Smoke Tests

### Test 1: Homepage Loads

```bash
curl https://preview.vercel.app
# Expected: 200 OK with HTML
```

### Test 2: Workspace Loads

```bash
curl https://preview.vercel.app/workspace
# Expected: 200 OK with workspace HTML
```

### Test 3: Runtime Proxy Works

```bash
curl https://preview.vercel.app/api/workspace/investigations
# Expected: 200 OK with JSON (may be empty array)
```

### Test 4: Auth Enforced (Production Only)

```bash
# Without token (should fail)
curl -i https://app.your-domain.com/api/workspace/investigations
# Expected: 401 Unauthorized

# With valid token (should succeed)
curl -H "Authorization: Bearer <token>" \
  https://app.your-domain.com/api/workspace/investigations
# Expected: 200 OK
```

---

## Rollback

**Vercel keeps deployment history. Rollback to previous deployment:**

1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"

**Or via CLI:**
```bash
# List deployments
vercel ls

# Promote specific deployment to production
vercel promote <deployment-url>
```

---

## Troubleshooting

### Environment variables not loaded

**Check variable configuration:**
```bash
vercel env ls
```

**Common issues:**
- Variable set for wrong environment (Preview vs Production)
- Variable name typo
- Deployment cached before variable added

**Solution:**
```bash
# Trigger redeploy to pick up new variables
vercel --prod --force
```

### Database connection failing

**Check DATABASE_URL:**
- Is it set for correct environment?
- Is password correct?
- Is SSL mode correct (`?sslmode=require`)?
- Is Neon database active (not paused)?

**Test connection:**
```bash
# From local with same DATABASE_URL:
node -e "const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URL}); c.connect().then(()=>console.log('OK')).catch(e=>console.error(e))"
```

### Runtime connection failing

**Check VIENNA_RUNTIME_URL:**
```bash
curl https://vienna-runtime-preview.fly.dev/health
# Should return: {"status":"healthy",...}
```

**Common issues:**
- Runtime not deployed
- Runtime unhealthy
- CORS not configured for shell origin
- Wrong runtime URL in Vercel

**Solution:**
```bash
# Verify runtime is up
curl https://vienna-runtime-preview.fly.dev/health

# Update Vercel variable
vercel env rm VIENNA_RUNTIME_URL preview
vercel env add VIENNA_RUNTIME_URL preview
# Enter: https://vienna-runtime-preview.fly.dev

# Redeploy
git push origin <branch>
```

### CORS errors in browser

**Symptoms:**
- Browser console: "CORS policy blocked..."
- Network tab: preflight OPTIONS request failing

**Solution:**

1. Check runtime CORS configuration:
   ```bash
   fly ssh console --app vienna-runtime-preview
   # Inside: echo $CORS_ORIGINS
   ```

2. Update runtime CORS_ORIGINS:
   ```bash
   fly secrets set CORS_ORIGINS=https://preview.vercel.app,https://*.vercel.app \
     --app vienna-runtime-preview
   ```

3. Restart runtime:
   ```bash
   fly apps restart --app vienna-runtime-preview
   ```

---

## Preview vs Production Differences

### Preview Environment

- Auto-deploys on PR creation/update
- URL: `https://<branch>.vercel.app`
- Uses preview DATABASE_URL
- Uses preview VIENNA_RUNTIME_URL
- May use different auth token
- Good for testing changes before production

### Production Environment

- Auto-deploys on merge to `main`
- URL: `https://app.your-domain.com` (custom domain)
- Uses production DATABASE_URL
- Uses production VIENNA_RUNTIME_URL
- Uses production auth token
- Requires all tests passing

---

## Security Best Practices

### Never commit secrets

✅ **Good:**
```bash
# .env.local (gitignored)
DATABASE_URL=postgresql://...
```

❌ **Bad:**
```bash
# .env (committed to git)
DATABASE_URL=postgresql://...
```

### Rotate secrets periodically

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -base64 32)

# Update in Vercel
vercel env rm WORKSPACE_AUTH_TOKEN production
vercel env add WORKSPACE_AUTH_TOKEN production
# Enter: $NEW_TOKEN

# Redeploy
git push origin main
```

### Use separate secrets per environment

Never reuse production secrets in preview.

---

## Cheat Sheet

| Task | Command |
|------|---------|
| List env vars | `vercel env ls` |
| Add env var | `vercel env add <name> <environment>` |
| Remove env var | `vercel env rm <name> <environment>` |
| Deploy preview | `vercel --preview` |
| Deploy production | `vercel --prod` |
| List deployments | `vercel ls` |
| Promote to prod | `vercel promote <url>` |

---

## Next Steps

After Vercel configuration:

1. Verify all environment variables set
2. Test preview deployment
3. Test production deployment
4. Monitor logs for errors
5. Set up custom domain (if needed)
6. Configure DNS (if needed)
