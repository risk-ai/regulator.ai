/**
 * Pin Welcome Messages
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const PINNED_MESSAGES = {
  'general': {
    title: 'Welcome to Vienna OS! 👋',
    content: 
      'New here? Start with:\n' +
      '• Use `!help` to see bot commands\n' +
      '• Read <#rules>\n' +
      '• Check out https://regulator.ai/docs\n' +
      '• Ask questions in <#help>\n\n' +
      '**Quick Links:**\n' +
      '🚀 Get Started: https://console.regulator.ai\n' +
      '📚 Docs: https://regulator.ai/docs\n' +
      '🐛 Report Bugs: Click purple button in console\n' +
      '⭐ GitHub: https://github.com/risk-ai/regulator.ai',
  },
  'help': {
    title: 'Need Help? 🤔',
    content:
      '**Before asking:**\n' +
      '1. Check https://regulator.ai/docs\n' +
      '2. Search Discord history (Ctrl+F)\n' +
      '3. Try `!faq` for common questions\n\n' +
      '**When asking:**\n' +
      '• Describe your issue clearly\n' +
      '• Share error messages (use code blocks)\n' +
      '• Mention what you have already tried\n\n' +
      '**Useful Commands:**\n' +
      '• `!docs` - Documentation\n' +
      '• `!start` - Quick start guide\n' +
      '• `!status` - Check if services are up',
  },
  'bug-reports': {
    title: 'Bug Reports 🐛',
    content:
      'Reports from the console feedback widget appear here automatically.\n\n' +
      '**You can also report bugs:**\n' +
      '• Console: Click purple button (bottom-right)\n' +
      '• GitHub: https://github.com/risk-ai/regulator.ai/issues/new\n' +
      '• Use `!bug` command\n\n' +
      '**Team:** We review all reports and create GitHub issues for confirmed bugs.',
  },
  'rules': {
    title: 'Vienna OS Community Rules',
    content:
      '**1️⃣ Be Respectful**\n' +
      'Treat everyone with respect. No harassment, hate speech, or personal attacks.\n\n' +
      '**2️⃣ Stay On Topic**\n' +
      'Keep discussions relevant to Vienna OS, AI governance, or related tech topics.\n\n' +
      '**3️⃣ No Spam**\n' +
      'Do not spam messages, links, or ads. Self-promotion is allowed in moderation.\n\n' +
      '**4️⃣ Use Appropriate Channels**\n' +
      '• Questions → <#help>\n' +
      '• Bugs → <#bug-reports>\n' +
      '• Ideas → <#feature-requests>\n' +
      '• Code → <#dev-chat>\n\n' +
      '**5️⃣ Search Before Asking**\n' +
      'Check <#documentation> and https://regulator.ai/docs before asking questions.\n\n' +
      '**6️⃣ Be Patient**\n' +
      'Community members help in their free time. Be patient and appreciative.\n\n' +
      '**7️⃣ No Illegal Content**\n' +
      'Do not share pirated content, malware, or anything illegal.\n\n' +
      '**8️⃣ Follow Discord ToS**\n' +
      'All Discord Terms of Service apply: https://discord.com/terms\n\n' +
      '**Enforcement:** Violations may result in warnings, temporary mutes, or bans at moderator discretion.',
  },
};

client.once('ready', async () => {
  console.log('📌 Pinning messages...\n');
  const guild = client.guilds.cache.first();
  
  for (const [channelName, message] of Object.entries(PINNED_MESSAGES)) {
    const channel = guild.channels.cache.find(ch => ch.name === channelName);
    if (!channel) {
      console.log(`  ⚠ Channel #${channelName} not found`);
      continue;
    }

    try {
      const pinnedMessages = await channel.messages.fetchPinned();
      const alreadyPinned = pinnedMessages.some(m => m.content.includes(message.title));
      
      if (alreadyPinned) {
        console.log(`  ✓ Message already pinned in #${channelName}`);
        continue;
      }

      const sent = await channel.send(`**${message.title}**\n\n${message.content}`);
      await sent.pin();
      console.log(`  ✓ Pinned message in #${channelName}`);
    } catch (error) {
      console.log(`  ✗ Failed to pin in #${channelName}:`, error.message);
    }
  }
  
  console.log('\n✅ Pinning complete!');
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
