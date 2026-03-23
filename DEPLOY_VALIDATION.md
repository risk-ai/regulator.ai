# Deploy Validation Endpoint

**Status:** Code committed, ready to deploy  
**Current deployment:** Running old version (no validation endpoint)  
**Action required:** Deploy from apps/console/server directory

---

## Quick Deploy

Run from your **native terminal** (where Fly CLI is installed):

```bash
cd ~/apps/console/server
fly deploy -a vienna-os
```

**Expected output:**
```
==> Building image
...
--> Pushing image done
==> Verifying app config
--> Verified app config
==> Deploying
...
✓ Machine 90800d0eb77278 [app] update succeeded
```

---

## Verify Deployment

### 1. Check health
```bash
curl https://vienna-os.fly.dev/health | jq .
```

### 2. Test validation endpoint
```bash
curl -X POST https://vienna-os.fly.dev/api/v1/validation/log \
  -H "Content-Type: application/json" \
  -d '{
    "case": "test",
    "result": "pass",
    "details": {"test": true},
    "ui_observation": "Testing endpoint"
  }' | jq .
```

**Expected response:**
```json
{
  "success": true,
  "validation_id": "val_1711234567890_test",
  "timestamp": "2026-03-23T23:50:00.000Z"
}
```

### 3. Retrieve results
```bash
curl https://vienna-os.fly.dev/api/v1/validation/results | jq .
```

**Expected response:**
```json
{
  "success": true,
  "results": [
    {
      "validation_id": "val_1711234567890_test",
      "case": "test",
      "result": "pass",
      ...
    }
  ],
  "count": 1
}
```

---

## If Deployment Fails

### Build locally first
```bash
cd ~/apps/console/server
npm run build
```

### Check for errors
```bash
# Should complete without errors
# Creates dist/ directory
```

### Then deploy
```bash
fly deploy -a vienna-os
```

---

## After Successful Deployment

Continue with browser validation:

1. Open `https://console.regulator.ai`
2. Login with `P@rrish1922`
3. Follow `BROWSER_VALIDATION_GUIDE.md`
4. Run all 5 test cases
5. Log results via validation endpoint

---

## Current Status

✅ Password set via Fly secrets  
✅ Authentication working  
✅ Validation code committed  
⏳ **Deployment pending** (run `fly deploy` from apps/console/server)  
⏳ Browser validation pending  

---

**Next command to run:**
```bash
cd ~/apps/console/server && fly deploy -a vienna-os
```
