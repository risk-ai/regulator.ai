# Feedback Widget Setup Guide
**Date:** 2026-04-01  
**Feature:** Bug Report / Feedback Widget

---

## Overview

Integrated feedback widget added to Vienna OS console for community bug reports and feedback.

**Features:**
- ✅ Floating button (bottom-right of console)
- ✅ Screenshot capture with preview
- ✅ Auto-includes user context (email, tenant, page, timestamp)
- ✅ Sends to Discord webhook for team notification
- ✅ Anonymous feedback supported (if not logged in)
- ✅ GitHub Issues link in marketing footer

---

## User Experience

### Console Widget

**Location:** Bottom-right corner (floating button)

**Flow:**
1. User clicks purple "Report Bug" button
2. Modal opens with:
   - Message textarea (required)
   - "Add Screenshot" button (optional)
   - Auto-captured metadata (page, time)
3. User submits feedback
4. Success message shown
5. Modal auto-closes after 2 seconds

**Screenshot Feature:**
- Captures full page screenshot using `html2canvas`
- Shows preview in modal
- Can be removed before submission
- Metadata included in Discord notification

---

## Marketing Site Link

**Location:** Footer → Connect column

**Link:** "Report Bug" → https://github.com/risk-ai/regulator.ai/issues/new

**Purpose:** Directs non-console users to GitHub issues

---

## Backend Setup

### API Endpoints

**Console Server:**
```
POST /api/v1/feedback
```

**Vercel Proxy:**
```
POST /api/v1/feedback
```

Both endpoints support the same payload:
```json
{
  "message": "Bug description here...",
  "page": "#/fleet",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "screenshot": "data:image/png;base64,..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": { "received": true },
  "timestamp": "2026-04-01T10:30:01.000Z"
}
```

---

## Discord Integration Setup

### Step 1: Create Discord Webhook

1. Open Discord and navigate to your server
2. Go to the channel where you want feedback (e.g., `#bug-reports` or `#user-feedback`)
3. Click the gear icon (⚙️) next to the channel name → "Edit Channel"
4. In left sidebar, click "Integrations"
5. Click "Create Webhook" or "View Webhooks" → "New Webhook"
6. Name: "Vienna Feedback Bot"
7. (Optional) Upload avatar: https://regulator.ai/logo-icon.png
8. Click "Copy Webhook URL"
9. URL looks like:
    ```
    https://discord.com/api/webhooks/1234567890123456789/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    ```
10. Click "Save Changes"

### Step 2: Add Environment Variable

**Vercel (Console Proxy):**
```bash
vercel env add FEEDBACK_DISCORD_WEBHOOK production
# Paste webhook URL when prompted
```

**Local Development:**
```bash
# Add to apps/console/server/.env.local
FEEDBACK_DISCORD_WEBHOOK=https://discord.com/api/webhooks/1234567890123456789/XXXX
```

**Production Server (if self-hosting):**
```bash
export FEEDBACK_DISCORD_WEBHOOK=https://discord.com/api/webhooks/1234567890123456789/XXXX
```

### Step 3: Deploy

**Vercel (Auto-deployed):**
- Push triggers auto-deploy
- Vercel picks up new env var

**Manual Deploy:**
```bash
cd apps/console-proxy
vercel --prod
```

---

## Discord Message Format

When feedback is submitted, Discord receives an embed:

```
Vienna Feedback Bot  BOT  10:30 AM
New feedback from user@example.com

🐛 New Bug Report / Feedback

👤 User                  📍 Page
user@example.com        `#/fleet`

🕐 Time                  🏢 Tenant
4/1/2026, 10:30:00 AM   `abc123-d`

💬 Message
The agent list is showing duplicate entries after refresh.

📸 Screenshot
Screenshot captured (check server logs or configure S3 upload)

User Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
```

**Embed Color:** Discord Blurple (#5865F2)

---

## Testing

### Local Testing (Console)

1. Start console dev server:
   ```bash
   cd apps/console/client
   npm run dev
   ```

2. Login to console (http://localhost:5173)

3. Click purple "Report Bug" button (bottom-right)

4. Enter test message: "Test feedback from local dev"

5. (Optional) Click "Add Screenshot" to test capture

6. Click "Submit"

7. Check:
   - Success message shows
   - Modal closes after 2 seconds
   - If `FEEDBACK_DISCORD_WEBHOOK` set: Check Discord channel
   - If not set: Check console logs

### Production Testing

1. Visit https://console.regulator.ai

2. Login with test account

3. Click "Report Bug" button

4. Submit test feedback

5. Verify:
   - Discord notification received
   - User email included (from JWT)
   - Tenant ID included
   - Page hash correct

---

## Fallback Behavior

**If `FEEDBACK_DISCORD_WEBHOOK` not set:**

- Feedback still accepted (200 OK response)
- Logged to server console:
  ```json
  [Feedback] {
    "message": "Bug description",
    "page": "#/fleet",
    "user": { "userId": "...", "email": "user@example.com", "tenantId": "..." },
    "timestamp": "2026-04-01T10:30:00.000Z",
    "hasScreenshot": true
  }
  ```
- User sees success message
- No Discord notification sent

**Purpose:** Graceful degradation for development/testing

---

## Future Enhancements (TODO)

### Phase 2: Screenshot Upload

**Current:** Screenshots logged server-side but not sent to Slack  
**TODO:** Upload to S3 and include link in Slack message

**Implementation:**
```javascript
// In feedback.js
if (screenshot) {
  const s3Url = await uploadToS3(screenshot, `feedback/${Date.now()}.png`);
  blocks.push({
    type: 'image',
    image_url: s3Url,
    alt_text: 'User screenshot'
  });
}
```

**Requires:**
- S3 bucket (e.g., `vienna-feedback`)
- AWS credentials in environment
- `@aws-sdk/client-s3` package

### Phase 3: GitHub Issue Creation

**Option:** Auto-create GitHub issue from feedback

**Implementation:**
```javascript
// Using GitHub API
await fetch('https://api.github.com/repos/risk-ai/regulator.ai/issues', {
  method: 'POST',
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: `[User Feedback] ${feedback.message.substring(0, 50)}...`,
    body: `**From:** ${feedback.user?.email || 'Anonymous'}\n**Page:** ${feedback.page}\n\n${feedback.message}`,
    labels: ['user-feedback', 'bug']
  })
});
```

### Phase 4: Email Notifications

**Option:** Send email to support@regulator.ai

**Requires:**
- Resend API key (already have: `RESEND_API_KEY`)
- Email template

---

## Monitoring

### Success Metrics

Track in analytics:
- Feedback submission rate (per day/week)
- Pages with most feedback
- Screenshot usage rate
- Response time (how fast team addresses feedback)

### Alerts

Set up Slack alert if:
- Feedback mentions "crash", "error", "broken"
- Same user submits >3 feedbacks in 1 hour (spam detection)
- Screenshot size >2MB (performance issue)

---

## Privacy & Data Retention

**User Data Collected:**
- Email (if authenticated)
- Tenant ID (if authenticated)
- Page URL (console hash)
- User Agent (browser info)
- Screenshot (optional, user-initiated)

**Not Collected:**
- Passwords
- Session tokens
- API keys
- Full page HTML

**Retention:**
- Slack messages: Per workspace retention policy
- Server logs: 30 days (Vercel default)
- Screenshots: Not stored (logged only, TODO: S3 upload)

**GDPR Compliance:**
- User controls screenshot submission
- Email included only if authenticated
- No tracking cookies added
- Data used only for product improvement

---

## Troubleshooting

### Widget Not Appearing

**Symptom:** No purple button in console

**Checks:**
1. Verify FeedbackWidget imported in App.tsx:
   ```bash
   grep -n "FeedbackWidget" apps/console/client/src/App.tsx
   ```
2. Check browser console for errors
3. Verify build included widget:
   ```bash
   ls apps/console/client/dist/assets/ | grep -i feedback
   ```

### Screenshot Capture Fails

**Symptom:** "Add Screenshot" shows error

**Causes:**
- `html2canvas` failed to load
- Browser blocked canvas rendering
- Page too large (OOM)

**Fix:**
1. Check network tab for html2canvas load
2. Try smaller page (navigate to simpler view)
3. Check browser console for canvas errors

### Slack Webhook Not Working

**Symptom:** Feedback submitted but no Slack message

**Checks:**
1. Verify webhook URL set:
   ```bash
   vercel env ls | grep FEEDBACK
   ```
2. Test webhook directly:
   ```bash
   curl -X POST $FEEDBACK_DISCORD_WEBHOOK \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test from curl"}'
   ```
3. Check Vercel function logs:
   ```bash
   vercel logs --follow
   ```

### Feedback Endpoint Returns 401

**Symptom:** "Authentication required" error

**Cause:** User not logged in AND `optional: true` not working

**Fix:**
1. Verify auth.js has `requireAuth` function with optional support
2. Check feedback.js calls `requireAuth(req, res, { optional: true })`

---

## Code References

**Widget Component:**
```
apps/console/client/src/components/feedback/FeedbackWidget.tsx
```

**API Routes:**
```
apps/console-proxy/api/v1/feedback.js (Vercel serverless)
apps/console/server/src/routes/feedback.ts (Express server)
```

**Auth Utilities:**
```
apps/console-proxy/lib/auth.js (requireAuth function)
```

**Marketing Footer:**
```
apps/marketing/src/app/page.tsx (line ~1459)
```

---

## Deployment Status

**Commit:** `5dec712` (2026-04-01)

**Deployed:**
- ✅ Console widget (Vercel auto-deploy)
- ✅ API endpoint (console-proxy)
- ✅ Marketing footer link (Vercel auto-deploy)

**Pending:**
- ⏳ Slack webhook configuration (needs `FEEDBACK_DISCORD_WEBHOOK` env var)

**Next Steps:**
1. Max: Create Slack webhook (instructions above)
2. Max: Add env var to Vercel
3. Test feedback submission
4. Announce to community (Discord, Twitter)

---

**Setup completed:** 2026-04-01 10:24 EDT  
**Documentation by:** Vienna (Technical Lead)
