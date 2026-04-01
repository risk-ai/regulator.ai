# Discord Server Setup Guide
**For:** Vienna OS Community Discord  
**Date:** 2026-04-01

---

## 1. Channel Structure (Recommended)

### 📁 WELCOME Category
```
#welcome (read-only, bot posts welcome messages here)
#rules (read-only, server rules)
#announcements (read-only, important updates)
```

### 📁 COMMUNITY Category
```
#general (main chat - this is where bot welcome messages go by default)
#introductions (new members introduce themselves)
#off-topic (casual conversation)
```

### 📁 SUPPORT Category
```
#help (questions & troubleshooting)
#bug-reports (feedback widget posts here via webhook)
#feature-requests (community suggestions)
```

### 📁 DEVELOPMENT Category
```
#dev-chat (developers & contributors)
#github (GitHub webhook notifications - optional)
#releases (release notes & changelog)
```

### 📁 RESOURCES Category
```
#documentation (pinned links & guides)
#tutorials (community tutorials)
```

---

## 2. Role Setup

### Create These Roles (Server Settings → Roles)

**🔴 Admin**
- Permissions: Administrator
- Color: Red (#EF4444)
- Hoist: Yes (show separately)

**🟡 Moderator**
- Permissions: Manage Messages, Kick Members, Ban Members, Manage Threads
- Color: Amber (#F59E0B)
- Hoist: Yes

**🟣 Team**
- Permissions: Manage Channels, Manage Webhooks
- Color: Purple (#A855F7)
- Hoist: Yes
- Assign to: Vienna OS core team

**🔵 Developer**
- Permissions: Send Messages, Attach Files, Embed Links
- Color: Blue (#3B82F6)
- Hoist: Yes
- Assign to: Active contributors

**🟢 Community** (Auto-assigned to new members)
- Permissions: Send Messages, Add Reactions, Use External Emojis
- Color: Green (#10B981)
- Hoist: No (don't show separately)

---

## 3. Bot Configuration

### Auto-Role Setup
Bot automatically assigns "Community" role to new members.

**If role name is different:**
1. Edit `apps/discord-bot/index.js`
2. Line ~25: `const COMMUNITY_ROLE_NAME = 'YourRoleName';`
3. Restart bot

### Welcome Channel Setup
Bot posts welcome messages in `#general` by default.

**To use different channel:**
1. Edit `apps/discord-bot/index.js`
2. Line ~24: `const WELCOME_CHANNEL_NAME = 'welcome';`
3. Restart bot

---

## 4. Webhook Setup (Bug Reports)

### Create Webhook for #bug-reports
1. Go to `#bug-reports` channel
2. Click gear icon (⚙️) → Integrations
3. Webhooks → View Webhooks
4. Find "Vienna Feedback Bot" (already created)
5. Verify it's pointing to `#bug-reports`

**Webhook URL (already configured):**
```
https://discord.com/api/webhooks/1488911271066865694/WTHzvx1sbOsOJvaKW8T4ZkOjvQFmuI0Cbi_vZp-ZJJQ41xuEm-LVo_B5R6rm2anWAGcE
```

---

## 5. Channel Permissions

### #welcome (Read-Only for Everyone)
```
@everyone:
  ❌ Send Messages
  ✅ Read Messages
  ✅ Read Message History

Vienna Bot:
  ✅ Send Messages
  ✅ Embed Links
```

### #announcements (Read-Only for Everyone)
```
@everyone:
  ❌ Send Messages
  ✅ Read Messages

@Team / @Admin:
  ✅ Send Messages
```

### #bug-reports (Read + React Only)
```
@everyone:
  ❌ Send Messages (webhook only)
  ✅ Read Messages
  ✅ Add Reactions

Vienna Feedback Bot (webhook):
  ✅ Send Messages
  ✅ Embed Links
```

### All Other Channels (Normal Chat)
```
@Community:
  ✅ Send Messages
  ✅ Embed Links
  ✅ Attach Files
  ✅ Add Reactions
```

---

## 6. Server Settings

### General
- **Verification Level:** Low (email verification)
- **Explicit Content Filter:** Scan messages from members without roles
- **2FA Requirement:** Not required (but recommended for mods)

### Moderation
- **Auto-Mod:** Enable spam detection
- **Default Notification:** Only @mentions

### Community
- **Enable Community:** Yes
- **Rules Channel:** #rules
- **Community Updates Channel:** #announcements

### Welcome Screen (Optional)
1. Server Settings → Community → Welcome Screen
2. Add recommended channels:
   - #welcome
   - #rules
   - #general
   - #help
3. Save

---

## 7. Server Rules (Suggested for #rules)

```
**Vienna OS Community Rules**

1️⃣ **Be Respectful**
Treat everyone with respect. No harassment, hate speech, or personal attacks.

2️⃣ **Stay On Topic**
Keep discussions relevant to Vienna OS, AI governance, or related tech topics.

3️⃣ **No Spam**
Don't spam messages, links, or ads. Self-promotion is allowed in moderation.

4️⃣ **Use Appropriate Channels**
Post in the right channel:
• Questions → #help
• Bugs → #bug-reports (or use console feedback widget)
• Ideas → #feature-requests
• Code → #dev-chat

5️⃣ **Search Before Asking**
Check #documentation and https://regulator.ai/docs before asking questions.

6️⃣ **Be Patient**
Community members help in their free time. Be patient and appreciative.

7️⃣ **No Illegal Content**
Don't share pirated content, malware, or anything illegal.

8️⃣ **Follow Discord ToS**
All Discord Terms of Service apply: https://discord.com/terms

**Enforcement:**
Violations may result in warnings, temporary mutes, or bans at moderator discretion.

**Questions?**
DM @Moderators or @Admin
```

---

## 8. Pinned Messages (Suggested)

### #general
```
**Welcome to Vienna OS!** 👋

New here? Start with:
• Use !help to see bot commands
• Read #rules
• Check out https://regulator.ai/docs
• Ask questions in #help

**Quick Links:**
🚀 Get Started: https://console.regulator.ai
📚 Docs: https://regulator.ai/docs
🐛 Report Bugs: Click purple button in console
⭐ GitHub: https://github.com/risk-ai/regulator.ai
```

### #help
```
**Need Help?**

Before asking:
1. Check https://regulator.ai/docs
2. Search Discord history (Ctrl+F)
3. Try !faq for common questions

When asking:
• Describe your issue clearly
• Share error messages (use code blocks: \`\`\`text\n...\n\`\`\`)
• Mention what you've already tried

**Useful Commands:**
• !docs - Documentation
• !start - Quick start guide
• !status - Check if services are up
```

### #bug-reports
```
**Bug Reports**

Reports from the console feedback widget appear here automatically.

You can also report bugs:
• Console: Click purple button (bottom-right)
• GitHub: https://github.com/risk-ai/regulator.ai/issues/new
• Use !bug command

**Team:** We review all reports and create GitHub issues for confirmed bugs.
```

---

## 9. Bot Commands Reference

Users can use these commands anywhere in the server:

```
!help      - Show all commands
!docs      - Documentation links
!status    - Check Vienna OS status
!start     - Quick start guide
!github    - GitHub repository
!console   - Link to Vienna Console
!bug       - Report a bug
!faq       - Frequently asked questions
```

---

## 10. GitHub Integration (Optional)

### Connect GitHub to #github channel

1. Go to `#github` channel
2. Click gear icon → Integrations → GitHub
3. Connect your GitHub account
4. Select repository: `risk-ai/regulator.ai`
5. Events to notify:
   - ✅ Issues (opened, closed)
   - ✅ Pull Requests (opened, merged)
   - ✅ Releases
   - ❌ Commits (too noisy)
   - ✅ Stars

This gives community visibility into development activity.

---

## 11. Server Icon & Banner

**Icon:** Use Vienna OS logo (1024x1024px)  
**Banner:** Create custom banner with "Vienna OS Community" text

**Assets:**
- Logo: https://regulator.ai/logo-icon.png
- Marketing assets: ~/regulator.ai/apps/marketing/public/

---

## 12. Maintenance Tasks

**Weekly:**
- Review #bug-reports for new issues
- Pin important announcements
- Check for spam/inactive channels

**Monthly:**
- Review and update #rules if needed
- Clean up old pins (max 50 per channel)
- Audit member roles (remove inactive mods)

---

## Done! ✅

Your Vienna OS Discord is now fully set up with:
- ✅ Bot running (welcome messages, commands)
- ✅ Channels organized
- ✅ Roles configured
- ✅ Bug report webhook connected
- ✅ Moderation enabled

**Next Steps:**
1. Announce Discord launch (Twitter, GitHub, marketing site)
2. Invite initial members
3. Monitor for first few days
4. Iterate on rules/channels based on usage

---

**Setup by:** Vienna  
**Date:** 2026-04-01  
**Bot Status:** ✅ Running
