# Neon Database Quota Exceeded — Fix Instructions

**Error:** "Your account or project has exceeded the compute time quota. Upgrade your plan to increase limits."

**Database:** `ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech`  
**Issue:** Neon Free Tier compute time limit reached  
**Impact:** Users cannot sign in (database queries fail)

---

## 🚨 Immediate Fix (Max — 2 minutes)

### Step 1: Upgrade Neon Plan

1. Go to: https://console.neon.tech/
2. Select project: `ep-purple-smoke-adpumuth`
3. Click **"Billing"** → **"Upgrade Plan"**
4. Choose: **Launch** ($19/month) or **Scale** ($69/month)
   - **Launch:** 300 compute hours/month (sufficient for launch)
   - **Scale:** Unlimited compute (better for growth)

**Recommended:** Launch plan for now, upgrade to Scale if traffic grows.

### Step 2: Verify Fix

```bash
# Test database connection
curl http://localhost:3100/health | jq '.data.database'

# Expected: "status": "connected"
```

---

## 📊 Why This Happened

**Neon Free Tier Limits:**
- 300 compute hours/month (free)
- Reached limit due to:
  1. Stress testing (119,452 requests in 5 min)
  2. Multiple DB connections (140 → 20 after consolidation)
  3. Launch preparation queries

**Vienna's database consolidation helped** (85% fewer connections), but free tier is too small for production.

---

## 💡 Alternative (If Not Upgrading Now)

### Temporary Workaround: Wait for Reset

Neon free tier resets monthly. If you want to wait:

1. **Check reset date:**
   - Go to https://console.neon.tech/ → Billing
   - See "Next reset" date

2. **Disable signups temporarily:**
   ```bash
   # Edit apps/marketing/src/app/page.tsx
   # Change all /signup links to /contact
   ```

3. **Add banner:**
   ```html
   "Signups temporarily paused for maintenance. Contact us for early access."
   ```

**Downside:** Loses HN/PH launch momentum

---

## 🎯 Recommended: Upgrade to Launch ($19/mo)

**Benefits:**
- 300 compute hours/month (100x free tier)
- Autoscaling compute
- Better for production traffic
- Supports HN/PH launch spike

**Cost:** $19/month (cheaper than losing launch momentum)

---

## 📝 Post-Upgrade Checklist

1. ✅ Verify database connectivity
2. ✅ Test user login/signup
3. ✅ Monitor compute usage in Neon dashboard
4. ✅ Set up billing alerts (80% usage warning)

---

**Action required:** Max upgrades Neon plan  
**ETA:** 2 minutes  
**Cost:** $19/month (Launch) or $69/month (Scale)  
**Blocker:** Vienna cannot upgrade (needs billing access)  

---

**Status:** ⏳ Waiting for Neon upgrade by Max
