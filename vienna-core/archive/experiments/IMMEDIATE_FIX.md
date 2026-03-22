# Immediate Fix: Empty Files Page

**Status:** Backend shows `authenticated: false`  
**Expected:** You should see LOGIN SCREEN, not empty files page  
**Date:** 2026-03-11 20:49 EDT  

---

## What Should Happen

When you open `http://100.120.116.10:5174` in Firefox:

1. **Loading spinner** appears briefly (checking session)
2. **Login screen** appears (password prompt)
3. Enter password: `P@rrish1922`
4. Click "Sign In"
5. **Dashboard** or **Files Workspace** loads

---

## What You're Probably Seeing

One of these:

### A. Blank/white page
- **Cause:** JavaScript error preventing app from loading
- **Check:** Firefox DevTools → Console tab → any red errors?

### B. Files page layout but empty file tree
- **Cause:** Auth check bypassed somehow, API returning 401
- **Check:** Network tab → `/api/v1/files/list` → Status code?

### C. Login screen IS showing
- **Action:** Enter password `P@rrish1922` and click Sign In
- **Then:** Tell me if it works or shows error

---

## Quick Fix Attempt

Let's force a clean state:

```bash
# 1. Clear any stale session data
rm -f /home/maxlawai/.openclaw/workspace/vienna-core/console/server/data/sessions.db

# 2. Restart backend (clean state)
pkill -f "tsx watch src/server.ts"
sleep 2
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server
npm run dev > /tmp/vienna-backend-clean.log 2>&1 &

# 3. Wait for startup
sleep 5

# 4. Verify backend
curl http://localhost:3100/health
```

Then in Firefox:
1. **Close ALL tabs** for `100.120.116.10:5174`
2. **Clear site data:** F12 → Application tab → Storage → Clear site data
3. **Open new tab:** `http://100.120.116.10:5174`
4. Should see **login screen**

---

## If Login Screen Shows

Password: `P@rrish1922`

Click "Sign In"

**If successful:**
- Redirected to dashboard
- Can navigate to Files via header link or `http://100.120.116.10:5174/#files`
- File tree should populate

**If error:**
- Tell me the error message shown

---

## If STILL Empty Files Page

Then the issue is routing/auth-check bypass. Let me know and I'll:
1. Check if `App.tsx` auth gate is working
2. Verify routing logic
3. Check if browser is caching old code

---

## What I Need From You

**Right now, in Firefox at `http://100.120.116.10:5174`:**

1. **What do you see?**
   - Login screen with password field?
   - Empty page (nothing)?
   - Files page with empty tree?
   - Dashboard?
   - Error message?

2. **DevTools Console** (F12 → Console):
   - Any errors? (copy/paste them)

3. **If you see login screen:**
   - Enter password `P@rrish1922`
   - Click Sign In
   - What happens?

---

## Password

In case you need it: `P@rrish1922`

(From `.env` file: `VIENNA_OPERATOR_PASSWORD=P@rrish1922`)

---

**Tell me what you see and I'll fix it immediately.**
