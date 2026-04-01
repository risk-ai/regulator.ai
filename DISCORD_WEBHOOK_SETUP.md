# Discord Webhook Setup - Quick Guide
**Date:** 2026-04-01  
**For:** Max (immediate action)

---

## Setup Steps (5 minutes)

### 1. Create Discord Webhook

1. Open Discord → your server
2. Go to `#bug-reports` channel (or create new channel)
3. Click gear icon (⚙️) next to channel name
4. Click "Integrations" → "Create Webhook"
5. Name: **Vienna Feedback Bot**
6. (Optional) Avatar: https://regulator.ai/logo-icon.png
7. Click **"Copy Webhook URL"**

**Webhook URL looks like:**
```
https://discord.com/api/webhooks/1234567890123456789/XXXXXXXXXXXXXXXXXXXX
```

---

### 2. Add to Vercel

```bash
vercel env add FEEDBACK_DISCORD_WEBHOOK production
```

When prompted, paste the webhook URL from step 1.

---

### 3. Redeploy (Automatic)

Vercel will auto-redeploy when you push next commit, or run:
```bash
vercel --prod
```

---

## Test It

1. Visit https://console.regulator.ai
2. Login
3. Click purple button (bottom-right)
4. Type: "Test feedback from setup"
5. Click "Submit"
6. Check Discord channel → should see embed message

---

## Example Discord Message

```
Vienna Feedback Bot  BOT  10:30 AM
New feedback from max@law.ai

🐛 New Bug Report / Feedback

👤 User                  📍 Page
max@law.ai              `#/fleet`

🕐 Time                  🏢 Tenant
4/1/2026, 10:30:00 AM   `abc123-d`

💬 Message
Test feedback from setup
```

---

## Troubleshooting

**No message in Discord?**
1. Check webhook URL is correct:
   ```bash
   vercel env ls | grep FEEDBACK
   ```
2. Test webhook directly:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content":"Test from curl"}'
   ```
3. Check Vercel logs:
   ```bash
   vercel logs --follow
   ```

**Still not working?**
- Verify Discord webhook wasn't deleted
- Check channel permissions (webhook needs "Send Messages" permission)
- Verify env var deployed to production (not just preview)

---

## Done ✅

Once webhook is set up:
- Users can submit feedback from console
- You'll get Discord notifications
- Can respond directly in Discord thread
- Can create GitHub issues from Discord messages

**Next:** Announce to community that feedback widget is live!

---

**Setup by:** Vienna  
**Commit:** `14f9d30`  
**Status:** Ready for testing
