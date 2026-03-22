# Browser Debug Steps

**Issue:** Files page appears empty in Firefox  
**Date:** 2026-03-11 20:48 EDT  

---

## Quick Diagnosis

Open Firefox DevTools (F12) and check:

### 1. Console Tab
Look for errors. Copy anything in red.

Expected possibilities:
- Authentication errors
- CORS errors
- Network request failures
- JavaScript errors

### 2. Network Tab
1. Refresh page (Ctrl+R)
2. Look for these requests:

**`/api/v1/auth/session`**
- Status: Should be 200
- Response: `{"success":true,"data":{"authenticated":true/false}}`
- If `authenticated:false` → You need to login first

**`/api/v1/files/list?path=/`**
- Status: Should be 200 if authenticated
- Status: 401 if not authenticated
- Response headers: Check for `Access-Control-Allow-Credentials: true`
- Request headers: Check for `Cookie: vienna.sid=...`

### 3. Application Tab → Cookies
Check if `vienna.sid` cookie exists for `100.120.116.10`

---

## Expected Flow

### First Visit (Not Logged In)
1. Open `http://100.120.116.10:5174`
2. See **Login Screen** with password field
3. Enter password: `P@rrish1922`
4. Click "Sign In"
5. Redirected to dashboard or files workspace
6. Cookie set: `vienna.sid=...`

### After Login
1. Navigate to Files page (or `http://100.120.116.10:5174/#files`)
2. File tree loads with workspace contents
3. Can browse directories, click files

---

## Quick Test Commands

**From your terminal (to verify backend):**

```bash
# Check backend health
curl http://localhost:3100/health

# Test login
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"P@rrish1922"}' \
  -c /tmp/cookie.txt -v

# Test files list (with cookie)
curl http://localhost:3100/api/v1/files/list?path=/ \
  -b /tmp/cookie.txt
```

---

## What to Report

**From Firefox:**

1. **What do you see right now?**
   - [ ] Login screen
   - [ ] Empty files page
   - [ ] Dashboard
   - [ ] Error message
   - [ ] Other: ___________

2. **If login screen:** Enter password `P@rrish1922` and tell me what happens

3. **If empty files page:** Open DevTools → Console → copy/paste any errors here

4. **Network tab:** 
   - Right-click on `/api/v1/files/list` request
   - Copy → Copy as cURL
   - Paste here

---

## Possible Issues & Fixes

### Issue 1: Not Logged In
**Symptom:** Empty page, no login prompt  
**Fix:** Navigate to `http://100.120.116.10:5174/` (root) first, then login

### Issue 2: CORS/Credentials Not Working
**Symptom:** 401 errors in network tab despite login  
**Fix:** Check if cookie is being sent with requests

### Issue 3: Wrong Port
**Symptom:** Can't reach page at all  
**Fix:** Verify both services running:
```bash
lsof -i :3100  # Backend
lsof -i :5174  # Frontend
```

### Issue 4: Vite Not Serving Updated Code
**Symptom:** Old code running  
**Fix:** Hard refresh: Ctrl+Shift+R

---

## Emergency Login Reset

If authentication is stuck:

```bash
# Kill server
pkill -f "tsx watch src/server.ts"

# Clear session data
rm /home/maxlawai/.openclaw/workspace/vienna-core/console/server/data/sessions.db 2>/dev/null

# Restart server
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server
npm run dev > /tmp/vienna-server.log 2>&1 &

# Restart frontend
pkill -f "vite"
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/client
npm run dev > /tmp/vite-dev.log 2>&1 &
```

Then:
1. Close all Firefox tabs
2. Open new tab to `http://100.120.116.10:5174`
3. Should see fresh login screen

---

## Next Steps

Tell me:
1. What you see in the browser right now (login screen vs empty files page)
2. Any console errors (if any)
3. Whether `/api/v1/auth/session` shows `authenticated:true` or `false` in Network tab

I'll guide you from there.
