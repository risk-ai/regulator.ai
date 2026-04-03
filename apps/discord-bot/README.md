# Vienna OS Discord Bot

Community management bot for Vienna OS Discord server.

## Features

- **Welcome Messages**: Greets new members with embedded message + auto-role
- **Commands**: 
  - `!help` - Show available commands
  - `!docs` - Documentation links
  - `!status` - Check system status
  - `!start` - Quick start guide
  - `!github` - GitHub repository
  - `!console` - Console link
  - `!bug` - Report bugs
  - `!faq` - FAQ
- **Auto-Moderation**: Spam detection (5 messages/10 seconds)
- **Status Monitoring**: Real-time health checks

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your DISCORD_BOT_TOKEN
```

### 3. Run Bot

```bash
npm start
```

## Development

```bash
npm run dev  # Auto-restart on file changes
```

## Deployment

### Option A: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start index.js --name vienna-discord-bot
pm2 save
pm2 startup  # Enable auto-start on reboot
```

### Option B: Systemd Service

```ini
[Unit]
Description=Vienna OS Discord Bot
After=network.target

[Service]
Type=simple
User=vienna
WorkingDirectory=/opt/vienna/regulator.ai/apps/discord-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save to `/etc/systemd/system/vienna-discord-bot.service`, then:

```bash
sudo systemctl enable vienna-discord-bot
sudo systemctl start vienna-discord-bot
sudo systemctl status vienna-discord-bot
```

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "index.js"]
```

```bash
docker build -t vienna-discord-bot .
docker run -d --restart always --env-file .env vienna-discord-bot
```

## Server Setup Guide

### Recommended Channel Structure

```
📁 WELCOME
├─ #welcome (welcome messages)
├─ #rules
└─ #announcements

📁 COMMUNITY
├─ #general (main chat)
├─ #introductions
└─ #off-topic

📁 SUPPORT
├─ #help (questions & support)
├─ #bug-reports (from feedback widget)
└─ #feature-requests

📁 DEVELOPMENT
├─ #dev-chat
├─ #github (GitHub webhook notifications)
└─ #releases

📁 RESOURCES
├─ #documentation (links & guides)
└─ #tutorials
```

### Recommended Roles

```
🔴 Admin (full permissions)
🟡 Moderator (manage messages, kick/ban)
🟢 Community (default role, assigned on join)
🔵 Developer (contributors)
🟣 Team (Vienna OS team members)
```

### Bot Permissions Required

- Send Messages
- Embed Links
- Read Message History
- Manage Messages (for moderation)
- Manage Roles (for auto-role assignment)

## Customization

### Modify Welcome Message

Edit `index.js`, line ~45:

```javascript
const welcomeEmbed = new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle(`Welcome to Vienna OS! 👋`)
  .setDescription(/* Your custom message */);
```

### Add New Commands

Edit `index.js`, add to `commands` object:

```javascript
commands.mycommand = {
  description: 'My custom command',
  handler: async (message) => {
    await message.reply('Hello!');
  },
};
```

### Change Auto-Role

Edit `index.js`, line ~25:

```javascript
const COMMUNITY_ROLE_NAME = 'Community'; // Change to your role name
```

## Monitoring

View logs:

```bash
# PM2
pm2 logs vienna-discord-bot

# Systemd
journalctl -u vienna-discord-bot -f

# Docker
docker logs -f <container_id>
```

## Security

- ✅ Bot token stored in `.env` (never commit to git)
- ✅ `.env` added to `.gitignore`
- ✅ No code execution from user input
- ✅ Rate limiting for spam prevention
- ✅ Read-only by default (only writes when needed)
- ✅ Admin-only sensitive commands

## Troubleshooting

### Bot not responding

1. Check bot is online (green status in Discord)
2. Check logs for errors
3. Verify bot has correct permissions
4. Ensure intents are enabled in Discord Developer Portal

### Welcome messages not working

1. Check channel name matches `WELCOME_CHANNEL_NAME` (default: 'general')
2. Verify bot has "Send Messages" permission in that channel
3. Check logs for errors

### Commands not working

1. Ensure messages start with `!` prefix
2. Check bot has "Read Messages" permission
3. Verify Message Content Intent is enabled

## License

BSL 1.1
