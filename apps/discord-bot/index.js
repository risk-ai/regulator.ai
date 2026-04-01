/**
 * Vienna OS Discord Bot
 * 
 * Community management bot for Vienna OS Discord server.
 * Features: Welcome messages, commands, moderation, support.
 */

import { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WELCOME_CHANNEL_NAME = 'general'; // or 'welcome'
const COMMUNITY_ROLE_NAME = 'Community';

// ============================================================================
// Bot Ready
// ============================================================================

client.once('ready', () => {
  console.log(`✅ Vienna Bot ready! Logged in as ${client.user.tag}`);
  client.user.setActivity('Vienna OS | !help', { type: 'WATCHING' });
});

// ============================================================================
// Welcome New Members
// ============================================================================

client.on('guildMemberAdd', async (member) => {
  try {
    console.log(`[Welcome] New member: ${member.user.tag}`);

    // Find welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
      (ch) => ch.name === WELCOME_CHANNEL_NAME
    );

    if (!welcomeChannel) {
      console.error('[Welcome] Welcome channel not found');
      return;
    }

    // Welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Welcome to Vienna OS! 👋`)
      .setDescription(
        `Hey ${member}, welcome to the Vienna OS community!\n\n` +
        `**Quick Links:**\n` +
        `• 📚 [Documentation](https://regulator.ai/docs)\n` +
        `• 🚀 [Get Started](https://console.regulator.ai)\n` +
        `• 🐛 [Report Bugs](https://github.com/risk-ai/regulator.ai/issues)\n` +
        `• 💬 Ask questions in <#general>\n\n` +
        `**What is Vienna OS?**\n` +
        `The governance kernel for autonomous AI. Control what agents can do with warrants, policies, and immutable audit trails.`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'Use !help to see available commands' })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [welcomeEmbed] });

    // Auto-assign Community role (optional)
    const communityRole = member.guild.roles.cache.find(
      (role) => role.name === COMMUNITY_ROLE_NAME
    );
    if (communityRole) {
      await member.roles.add(communityRole);
      console.log(`[Welcome] Assigned ${COMMUNITY_ROLE_NAME} role to ${member.user.tag}`);
    }
  } catch (error) {
    console.error('[Welcome] Error:', error);
  }
});

// ============================================================================
// Commands
// ============================================================================

const commands = {
  help: {
    description: 'Show available commands',
    handler: async (message) => {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Vienna OS Bot Commands')
        .setDescription('Here are the available commands:')
        .addFields(
          { name: '!help', value: 'Show this help message', inline: false },
          { name: '!docs', value: 'Link to Vienna OS documentation', inline: false },
          { name: '!status', value: 'Check Vienna OS system status', inline: false },
          { name: '!start', value: 'Get started with Vienna OS', inline: false },
          { name: '!github', value: 'Vienna OS GitHub repository', inline: false },
          { name: '!console', value: 'Link to Vienna Console', inline: false },
          { name: '!bug', value: 'Report a bug', inline: false },
          { name: '!faq', value: 'Frequently asked questions', inline: false }
        )
        .setFooter({ text: 'Vienna OS Community Bot' })
        .setTimestamp();

      await message.reply({ embeds: [helpEmbed] });
    },
  },

  docs: {
    description: 'Link to documentation',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Vienna OS Documentation')
        .setDescription(
          '**Official Documentation:**\n' +
          '🔗 https://regulator.ai/docs\n\n' +
          '**Key Sections:**\n' +
          '• Getting Started\n' +
          '• Integration Guide\n' +
          '• API Reference\n' +
          '• Architecture Overview'
        )
        .setFooter({ text: 'Questions? Ask in #general' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },

  status: {
    description: 'System status',
    handler: async (message) => {
      try {
        // Check if console is up
        const response = await fetch('https://console.regulator.ai/api/v1/health');
        const isUp = response.ok;

        const embed = new EmbedBuilder()
          .setColor(isUp ? 0x10B981 : 0xEF4444)
          .setTitle(`${isUp ? '✅' : '❌'} Vienna OS Status`)
          .setDescription(
            isUp
              ? '**All Systems Operational**\n\n' +
                '• Console: ✅ Online\n' +
                '• API: ✅ Healthy\n' +
                '• Database: ✅ Connected'
              : '**System Issues Detected**\n\n' +
                'Some services may be experiencing issues. Check status page for updates.'
          )
          .addFields({
            name: 'Links',
            value: '• [Console](https://console.regulator.ai)\n• [Status Page](https://regulator.ai/status)',
            inline: false,
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('⚠️ Status Check Failed')
          .setDescription('Unable to reach Vienna OS services. This may be a temporary network issue.')
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      }
    },
  },

  start: {
    description: 'Get started with Vienna OS',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🚀 Get Started with Vienna OS')
        .setDescription(
          '**Quick Start:**\n\n' +
          '**1. Create Account**\n' +
          '🔗 [console.regulator.ai](https://console.regulator.ai)\n\n' +
          '**2. Install SDK**\n' +
          '```bash\nnpm install vienna-os\n# or\npip install vienna-os\n```\n\n' +
          '**3. Submit Your First Intent**\n' +
          '```javascript\nconst vienna = new ViennaClient({ apiKey: "vos_xxx" });\n' +
          'await vienna.submitIntent({\n' +
          '  action: "deploy",\n' +
          '  target: "production"\n' +
          '});\n```\n\n' +
          '**Need Help?**\n' +
          '• [Documentation](https://regulator.ai/docs)\n' +
          '• Ask in <#general>\n' +
          '• [GitHub Examples](https://github.com/risk-ai/regulator.ai)'
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },

  github: {
    description: 'GitHub repository',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⭐ Vienna OS on GitHub')
        .setDescription(
          '**Repository:** [risk-ai/regulator.ai](https://github.com/risk-ai/regulator.ai)\n\n' +
          '**Star us on GitHub!** ⭐\n\n' +
          '**Contributing:**\n' +
          '• Report bugs: [Issues](https://github.com/risk-ai/regulator.ai/issues)\n' +
          '• Submit PRs: [Pull Requests](https://github.com/risk-ai/regulator.ai/pulls)\n' +
          '• License: BSL 1.1\n\n' +
          '**Open Source, Enterprise Ready** 🚀'
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },

  console: {
    description: 'Link to Vienna Console',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎛️ Vienna Console')
        .setDescription(
          '**Access the Console:**\n' +
          '🔗 [console.regulator.ai](https://console.regulator.ai)\n\n' +
          '**Features:**\n' +
          '• Agent fleet management\n' +
          '• Policy builder\n' +
          '• Real-time approvals\n' +
          '• Audit trail & compliance\n' +
          '• API key management\n\n' +
          '**Sign up for free** → 5 agents included'
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },

  bug: {
    description: 'Report a bug',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('🐛 Report a Bug')
        .setDescription(
          '**Option 1: In-App Feedback** (Recommended)\n' +
          'Click the purple button in the bottom-right of [console.regulator.ai](https://console.regulator.ai)\n\n' +
          '**Option 2: GitHub Issues**\n' +
          '[Create New Issue](https://github.com/risk-ai/regulator.ai/issues/new)\n\n' +
          '**Please Include:**\n' +
          '• Description of the bug\n' +
          '• Steps to reproduce\n' +
          '• Expected vs actual behavior\n' +
          '• Screenshots (if applicable)\n\n' +
          'Thank you for helping us improve Vienna OS! 🙏'
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },

  faq: {
    description: 'Frequently asked questions',
    handler: async (message) => {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('❓ Frequently Asked Questions')
        .setDescription(
          '**What is Vienna OS?**\n' +
          'The governance kernel for autonomous AI. Controls what agents can do with policies, warrants, and audit trails.\n\n' +
          '**Is it open source?**\n' +
          'Yes! BSL 1.1 license. Free for most use cases.\n\n' +
          '**How much does it cost?**\n' +
          'Free tier: 5 agents included. Paid plans start at $49/mo.\n\n' +
          '**What frameworks does it support?**\n' +
          'All major agent frameworks: LangChain, Autogen, OpenClaw, custom agents.\n\n' +
          '**How do I get started?**\n' +
          'Use `!start` to see quick start guide.\n\n' +
          '**More Questions?**\n' +
          '• [Full FAQ](https://regulator.ai/faq)\n' +
          '• Ask in <#general>'
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    },
  },
};

// ============================================================================
// Message Handler
// ============================================================================

client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Only respond to commands (starts with !)
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args[0].toLowerCase();

  const command = commands[commandName];
  if (!command) return; // Unknown command, ignore silently

  try {
    console.log(`[Command] ${message.author.tag} used !${commandName}`);
    await command.handler(message, args.slice(1));
  } catch (error) {
    console.error(`[Command] Error executing !${commandName}:`, error);
    await message.reply('❌ An error occurred while processing your command. Please try again later.');
  }
});

// ============================================================================
// Auto-Moderation
// ============================================================================

const SPAM_THRESHOLD = 5; // Max messages per user per 10 seconds
const userMessageCounts = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const now = Date.now();

  // Track message rate
  if (!userMessageCounts.has(userId)) {
    userMessageCounts.set(userId, []);
  }

  const userMessages = userMessageCounts.get(userId);
  userMessages.push(now);

  // Remove messages older than 10 seconds
  const recentMessages = userMessages.filter((timestamp) => now - timestamp < 10000);
  userMessageCounts.set(userId, recentMessages);

  // Check for spam
  if (recentMessages.length > SPAM_THRESHOLD) {
    try {
      await message.delete();
      await message.channel.send(
        `${message.author}, please slow down. You're sending messages too quickly.`
      );
      console.log(`[Moderation] Deleted spam from ${message.author.tag}`);
    } catch (error) {
      console.error('[Moderation] Error deleting spam:', error);
    }
  }
});

// ============================================================================
// Error Handling
// ============================================================================

client.on('error', (error) => {
  console.error('[Discord] Client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[Process] Unhandled rejection:', error);
});

// ============================================================================
// Start Bot
// ============================================================================

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not set in environment variables');
  process.exit(1);
}

client.login(DISCORD_BOT_TOKEN);
