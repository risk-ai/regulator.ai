#!/usr/bin/env node
/**
 * API Key Creation Script
 * Creates API keys for Vienna OS authentication
 */

const crypto = require('crypto');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate required options
  if (!options.tenant) {
    console.error('Error: --tenant is required');
    showHelp();
    process.exit(1);
  }

  if (!options.name) {
    console.error('Error: --name is required');
    showHelp();
    process.exit(1);
  }

  try {
    // Import State Graph
    const stateGraphPath = path.join(__dirname, '../services/vienna-lib/state/state-graph.js');
    const { getStateGraph } = await import(stateGraphPath);
    
    const sg = getStateGraph();
    await sg.initialize();

    // Generate API key
    const keyId = `vk_${crypto.randomBytes(16).toString('hex')}`;
    const secret = `vks_${crypto.randomBytes(32).toString('hex')}`;
    const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');

    // Calculate expiration
    const expiresAt = options.expires
      ? new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days default

    // Insert into database
    const result = sg.db.prepare(`
      INSERT INTO api_keys (
        key_id,
        tenant_id,
        key_name,
        hashed_secret,
        permissions,
        created_at,
        expires_at,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      keyId,
      options.tenant,
      options.name,
      hashedSecret,
      JSON.stringify(options.permissions),
      new Date().toISOString(),
      expiresAt
    );

    // Output results
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        key_id: keyId,
        secret: secret,
        tenant_id: options.tenant,
        name: options.name,
        expires_at: expiresAt,
        permissions: options.permissions
      }, null, 2));
    } else {
      console.log('✅ API Key Created Successfully');
      console.log('');
      console.log('Key ID:', keyId);
      console.log('Secret:', secret);
      console.log('Tenant:', options.tenant);
      console.log('Name:', options.name);
      console.log('Expires:', expiresAt);
      console.log('Permissions:', options.permissions.join(', '));
      console.log('');
      console.log('⚠️  IMPORTANT: Save the secret now! It cannot be retrieved later.');
      console.log('');
      console.log('Usage:');
      console.log(`  export VIENNA_API_KEY="${secret}"`);
      console.log('  curl -H "Authorization: Bearer $VIENNA_API_KEY" https://api.vienna.ai/intent');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating API key:', error.message);
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {
    tenant: null,
    name: null,
    expires: 90, // days
    permissions: ['intent.submit', 'execution.read'],
    json: false,
    help: false,
    debug: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--tenant':
        options.tenant = next;
        i++;
        break;
      case '--name':
        options.name = next;
        i++;
        break;
      case '--expires':
        options.expires = parseInt(next, 10);
        i++;
        break;
      case '--permissions':
        options.permissions = next.split(',');
        i++;
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: node scripts/create-api-key.js [options]

Create API keys for Vienna OS authentication.

Options:
  --tenant <id>         Tenant ID (required)
  --name <name>         Key name/description (required)
  --expires <days>      Expiration in days (default: 90)
  --permissions <list>  Comma-separated permissions (default: intent.submit,execution.read)
  --json                Output as JSON
  --debug               Show debug information
  -h, --help            Show this help message

Examples:
  # Create basic API key
  node scripts/create-api-key.js --tenant prod --name "Production API Key"

  # Create key with custom expiration
  node scripts/create-api-key.js --tenant test --name "Load Test Key" --expires 7

  # Create key with specific permissions
  node scripts/create-api-key.js --tenant dev --name "Dev Key" \\
    --permissions intent.submit,execution.read,policy.write

  # Output as JSON (for automation)
  node scripts/create-api-key.js --tenant ci --name "CI Key" --json

Available Permissions:
  - intent.submit        Submit intents for execution
  - intent.read          Read intent history
  - execution.read       Read execution history
  - execution.write      Modify execution state
  - policy.read          Read policies
  - policy.write         Create/modify policies
  - approval.read        Read approvals
  - approval.approve     Approve pending actions
  - admin.*              Full administrative access

For more information, see: LOAD_TESTING.md
  `);
}

main();
