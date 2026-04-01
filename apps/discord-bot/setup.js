/**
 * Vienna OS Discord Server Setup Script
 * 
 * Automatically configures channels, roles, and permissions.
 * Run once after creating channels/categories manually.
 */

import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// ============================================================================
// Configuration
// ============================================================================

const ROLES = [
  { name: 'Admin', color: '#EF4444', permissions: ['Administrator'], hoist: true },
  { name: 'Moderator', color: '#F59E0B', permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ManageThreads'], hoist: true },
  { name: 'Team', color: '#A855F7', permissions: ['ManageChannels', 'ManageWebhooks'], hoist: true },
  { name: 'Developer', color: '#3B82F6', permissions: [], hoist: true },
  { name: 'Community', color: '#10B981', permissions: [], hoist: false },
];

const READ_ONLY_CHANNELS = ['welcome', 'rules', 'announcements', 'bug-reports'];

const CHANNEL_TOPICS = {
  'welcome': '👋 Welcome to Vienna OS! New members are greeted here.',
  'rules': '📜 Server rules and guidelines. Please read before participating.',
  'announcements': '📢 Important updates and announcements from the Vienna OS team.',
  'general': '💬 Main chat for Vienna OS discussions. Use !help to see bot commands.',
  'introductions': '👤 Introduce yourself to the community!',
  'off-topic': '🎮 Casual conversation and off-topic discussions.',
  'help': '❓ Ask questions and get help with Vienna OS. Check !docs first!',
  'bug-reports': '🐛 Automated bug reports from the console feedback widget.',
  'feature-requests': '💡 Suggest new features and improvements.',
  'dev-chat': '💻 Discussions for contributors and developers.',
  'github': '⭐ GitHub activity and updates (webhook integration).',
  'releases': '🚀 Release notes and version announcements.',
  'documentation': '📚 Links to documentation, guides, and resources.',
  'tutorials': '🎓 Community tutorials and how-to guides.',
};

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
      '• Mention what you\'ve already tried\n\n' +
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
      'Don\'t spam messages, links, or ads. Self-promotion is allowed in moderation.\n\n' +
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
      'Don\'t share pirated content, malware, or anything illegal.\n\n' +
      '**8️⃣ Follow Discord ToS**\n' +
      'All Discord Terms of Service apply: https://discord.com/terms\n\n' +
      '**Enforcement:** Violations may result in warnings, temporary mutes, or bans at moderator discretion.',
  },
};

// ============================================================================
// Setup Functions
// ============================================================================

async function createRoles(guild) {
  console.log('\n📋 Creating roles...');
  
  for (const roleConfig of ROLES) {
    const existing = guild.roles.cache.find(r => r.name === roleConfig.name);
    if (existing) {
      console.log(`  ✓ Role "${roleConfig.name}" already exists`);
      continue;
    }

    const permissionBits = roleConfig.permissions.map(p => PermissionFlagsBits[p] || 0);
    const permissions = permissionBits.reduce((a, b) => a | b, 0n);

    await guild.roles.create({
      name: roleConfig.name,
      color: roleConfig.color,
      permissions: permissions,
      hoist: roleConfig.hoist,
      mentionable: true,
    });

    console.log(`  ✓ Created role "${roleConfig.name}" (${roleConfig.color})`);
  }
}

async function configureChannelPermissions(guild) {
  console.log('\n🔒 Configuring channel permissions...');
  
  const everyoneRole = guild.roles.everyone;
  
  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildText) continue;

    const channelName = channel.name;
    
    // Set read-only for specific channels
    if (READ_ONLY_CHANNELS.includes(channelName)) {
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        SendMessagesInThreads: false,
      });
      console.log(`  ✓ Set ${channelName} to read-only`);
    }
  }
}

async function setChannelTopics(guild) {
  console.log('\n📝 Setting channel topics...');
  
  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildText) continue;

    const topic = CHANNEL_TOPICS[channel.name];
    if (topic && channel.topic !== topic) {
      await channel.setTopic(topic);
      console.log(`  ✓ Set topic for #${channel.name}`);
    }
  }
}

async function pinMessages(guild) {
  console.log('\n📌 Pinning important messages...');
  
  for (const [channelName, message] of Object.entries(PINNED_MESSAGES)) {
    const channel = guild.channels.cache.find(ch => ch.name === channelName);
    if (!channel) {
      console.log(`  ⚠ Channel #${channelName} not found, skipping pin`);
      continue;
    }

    // Check if message already pinned
    const pinnedMessages = await channel.messages.fetchPinned();
    const alreadyPinned = pinnedMessages.some(m => m.content.includes(message.title));
    
    if (alreadyPinned) {
      console.log(`  ✓ Message already pinned in #${channelName}`);
      continue;
    }

    // Send and pin message
    const sent = await channel.send(`**${message.title}**\n\n${message.content}`);
    await sent.pin();
    console.log(`  ✓ Pinned message in #${channelName}`);
  }
}

async function setupServerSettings(guild) {
  console.log('\n⚙️ Configuring server settings...');
  
  // Set verification level
  if (guild.verificationLevel !== 'LOW') {
    await guild.setVerificationLevel('LOW');
    console.log('  ✓ Set verification level to LOW');
  }

  // Set explicit content filter
  if (guild.explicitContentFilter !== 'MEMBERS_WITHOUT_ROLES') {
    await guild.setExplicitContentFilter('MEMBERS_WITHOUT_ROLES');
    console.log('  ✓ Set explicit content filter');
  }
}

// ============================================================================
// Main Setup
// ============================================================================

client.once('ready', async () => {
  console.log(`\n✅ Connected as ${client.user.tag}\n`);
  console.log('🚀 Starting Vienna OS Discord setup...\n');

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('❌ No guild found. Is the bot in a server?');
    process.exit(1);
  }

  console.log(`📍 Server: ${guild.name} (${guild.memberCount} members)`);

  try {
    await createRoles(guild);
    await configureChannelPermissions(guild);
    await setChannelTopics(guild);
    await setupServerSettings(guild);
    await pinMessages(guild);

    console.log('\n✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Manually assign Admin/Moderator roles to team members');
    console.log('2. Reorder roles (drag in Server Settings → Roles)');
    console.log('3. Test by joining with a test account');
    console.log('4. Verify welcome message appears in #general');
    console.log('5. Try bot commands: !help, !docs, !status\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  } finally {
    console.log('Disconnecting...');
    process.exit(0);
  }
});

// ============================================================================
// Start
// ============================================================================

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not set in environment variables');
  process.exit(1);
}

client.login(DISCORD_BOT_TOKEN);
