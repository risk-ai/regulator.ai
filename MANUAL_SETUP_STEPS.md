# Stage 6 Manual Setup Steps

**Date:** 2026-03-21  
**Status:** Authentication Required

---

## Current Status

✅ **Fly.io:** Authenticated as max@law.ai  
❌ **Vercel:** Not authenticated (login required)  
❌ **Project:** Not linked to Vercel

---

## Step-by-Step Setup

### Step 1: Authenticate with Vercel (Required)

**Action:** Open terminal and run:

```bash
vercel login
```

**What happens:**
- Browser window opens
- You'll be asked to authorize the Vercel CLI
- Choose your Vercel account
- Confirm authorization
- CLI will show "Success! You are now authenticated"

**Expected result:**
```bash
vercel whoami
# Should show: your-vercel-username
```

---

### Step 2: Link GitHub Repository to Vercel Project

**Two options:**

#### Option A: Import via Vercel Dashboard (Easier)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select GitHub (you may need to install/configure Vercel GitHub App)
4. Find repository: `risk-ai/regulator.ai`
5. Click "Import"
6. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
7. Add environment variable:
   - Key: `VIENNA_RUNTIME_URL`
   - Value: `https://vienna-runtime-preview.fly.dev`
   - Environments: Preview + Development
8. Click "Deploy"

#### Option B: Link via CLI (Alternative)

```bash
cd /home/maxlawai/regulator.ai
vercel link
```

**Prompts you'll see:**
- Set up and deploy? **Y**
- Which scope? **[Select your account/team]**
- Link to existing project? **Y** (if project exists) or **N** (create new)
- What's your project's name? **regulator-ai** (or your existing project name)
- In which directory is your code located? **./** (press Enter)

**Expected result:**
```
✅ Linked to [your-account]/regulator-ai
```

---

### Step 3: Configure Environment Variable

After linking, configure the runtime URL:

```bash
cd /home/maxlawai/regulator.ai

# Add environment variable
echo "https://vienna-runtime-preview.fly.dev" | vercel env add VIENNA_RUNTIME_URL preview
echo "https://vienna-runtime-preview.fly.dev" | vercel env add VIENNA_RUNTIME_URL development

# Verify
vercel env ls
```

**Expected output:**
```
Environment Variables for [your-account]/regulator-ai

VIENNA_RUNTIME_URL (Preview, Development)
  Value: https://vienna-runtime-preview.fly.dev
```

---

### Step 4: Trigger Deployment

**Option A: Git Push (Automatic)**

```bash
cd /home/maxlawai/regulator.ai

# Create empty commit to trigger deploy
git commit --allow-empty -m "chore: trigger deployment with VIENNA_RUNTIME_URL"

# Push to GitHub
git push origin feat/vienna-stage6-production-integration
```

**Option B: Manual Deploy via CLI**

```bash
cd /home/maxlawai/regulator.ai
vercel --prod=false
```

**Option C: Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments" tab
4. Click "..." on latest deployment
5. Click "Redeploy"

---

### Step 5: Monitor Deployment

**Check status:**

```bash
# List deployments
vercel ls

# View logs (after deployment starts)
vercel logs [deployment-url]
```

**Or via dashboard:**
- https://vercel.com/dashboard
- Click your project
- View deployment status and logs

**Wait for:** "Ready" status (3-5 minutes)

---

### Step 6: Validate Deployment

Once deployment is ready, test connectivity:

```bash
# Get your deployment URL from Vercel dashboard or CLI output
DEPLOYMENT_URL="https://regulator-ai-git-feat-vienna-stage6-*.vercel.app"

# Test health endpoint
curl "$DEPLOYMENT_URL/api/health"

# Test workspace endpoint (should return 401 without auth)
curl -i "$DEPLOYMENT_URL/api/workspace/investigations"

# Run full validation
cd /home/maxlawai/regulator.ai
bash scripts/validate-stage6.sh
```

**Expected results:**
- Health endpoint: 200 OK
- Workspace endpoint: 401 Unauthorized (auth working)
- Runtime connectivity: Successful

---

### Step 7: Run Smoke Tests

```bash
cd /home/maxlawai/regulator.ai

# Quick validation
bash scripts/validate-stage6.sh

# Full test suite (17 tests)
# See RUNBOOK_STAGE6_SMOKE_TESTS.md for complete suite
```

**Document results in:**
```bash
cp STAGE_6_FINAL_VALIDATION.template.md STAGE_6_FINAL_VALIDATION.md
# Fill in test results
git add STAGE_6_FINAL_VALIDATION.md
git commit -m "docs: Stage 6 validation complete"
```

---

## Troubleshooting

### Issue: Vercel GitHub App Not Installed

**Symptom:** Can't see repository in Vercel import list

**Fix:**
1. Go to https://github.com/apps/vercel
2. Click "Configure"
3. Select organization: `risk-ai`
4. Under "Repository access", select "Only select repositories"
5. Choose `regulator.ai`
6. Click "Save"

---

### Issue: Authentication Loop

**Symptom:** `vercel login` keeps asking for authentication

**Fix:**
```bash
# Clear credentials
rm -rf ~/.vercel

# Try login again
vercel login
```

---

### Issue: Project Already Exists

**Symptom:** "A project with that name already exists"

**Fix:**
1. Go to https://vercel.com/dashboard
2. Find existing `regulator-ai` project
3. Either:
   - Use existing project: `vercel link` and select it
   - Delete old project and create new one

---

### Issue: Deployment Fails

**Symptom:** Build errors in Vercel logs

**Common causes:**
- Missing dependencies
- Build errors in code
- Wrong build command

**Fix:**
1. Check Vercel deployment logs
2. Test build locally:
   ```bash
   cd /home/maxlawai/regulator.ai
   npm install
   npm run build
   ```
3. Fix any errors
4. Commit and push
5. Redeploy

---

## Quick Reference

**Check Vercel auth:**
```bash
vercel whoami
```

**Link project:**
```bash
cd /home/maxlawai/regulator.ai
vercel link
```

**Add environment variable:**
```bash
echo "https://vienna-runtime-preview.fly.dev" | vercel env add VIENNA_RUNTIME_URL preview
```

**Deploy:**
```bash
vercel --prod=false
# or
git push origin feat/vienna-stage6-production-integration
```

**Validate:**
```bash
bash scripts/validate-stage6.sh
```

---

## Automated Setup Script

If all authentication is working, you can use:

```bash
cd /home/maxlawai/regulator.ai
bash scripts/complete-stage6-setup.sh
```

This script will:
1. Check authentication
2. Link project
3. Configure environment variables
4. Trigger deployment
5. Provide validation instructions

---

## Timeline

- **Step 1 (Auth):** 2 minutes
- **Step 2 (Link):** 3 minutes
- **Step 3 (Env vars):** 2 minutes
- **Step 4 (Deploy):** 1 minute active + 3-5 minutes build
- **Step 5 (Monitor):** 3-5 minutes waiting
- **Step 6 (Validate):** 5 minutes
- **Step 7 (Smoke tests):** 10 minutes

**Total:** ~15 minutes active work + 5-10 minutes waiting

---

## Success Criteria

Stage 6 is complete when:

- ✅ Vercel authenticated
- ✅ Project linked
- ✅ Environment variable configured
- ✅ Deployment successful
- ✅ Health endpoint returns 200
- ✅ Shell → Runtime connection working
- ✅ Auth enforced (401 without token)
- ✅ All smoke tests passing

---

## Current Blockers

**Blocker #1:** Vercel authentication required

**Action:** Run `vercel login` and complete browser authentication

**After authentication:** Continue to Step 2 (Link project)

---

**Need Help?**

- Vercel docs: https://vercel.com/docs
- Vercel CLI reference: https://vercel.com/docs/cli
- Stage 6 full guide: `STAGE_6_COMPLETION_STEPS.md`
- Smoke tests: `RUNBOOK_STAGE6_SMOKE_TESTS.md`

---

**Last Updated:** 2026-03-21 13:18 EDT  
**Status:** Awaiting Vercel authentication
