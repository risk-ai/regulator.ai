#!/usr/bin/env node
/**
 * Vienna OS Quickstart
 * 
 * Demonstrates the core governance loop:
 * 1. Connect to Vienna OS
 * 2. Register an agent
 * 3. Submit a T0 intent (auto-approved)
 * 4. Submit a T1 intent (requires human approval)
 * 5. Check the audit trail
 * 
 * Usage:
 *   VIENNA_API_KEY=vos_xxx VIENNA_URL=https://console.regulator.ai node index.js
 *   
 *   Or for local development:
 *   VIENNA_API_KEY=vos_xxx VIENNA_URL=http://localhost:3001 node index.js
 */

const apiKey = process.env.VIENNA_API_KEY;
const baseUrl = (process.env.VIENNA_URL || 'https://console.regulator.ai').replace(/\/$/, '');

if (!apiKey) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  Vienna OS Quickstart                                        ║
║                                                              ║
║  Missing VIENNA_API_KEY environment variable.                ║
║                                                              ║
║  1. Sign up at https://console.regulator.ai/signup           ║
║  2. Go to Settings → API Keys                                ║
║  3. Copy your API key                                        ║
║  4. Run: VIENNA_API_KEY=vos_xxx node index.js                ║
╚══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

/** Helper to call the Vienna API */
async function api(method, path, body) {
  const url = `${baseUrl}/api/v1${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json.data || json };
}

async function main() {
  console.log('\n🛡️  Vienna OS Quickstart\n');
  console.log(`   Connecting to ${baseUrl}...\n`);

  // ─── Step 1: Check connection ───
  try {
    const { ok } = await api('GET', '/health');
    if (!ok) throw new Error('Health check failed');
    console.log('✅ Connected to Vienna OS\n');
  } catch (err) {
    console.error(`❌ Could not connect to ${baseUrl}`);
    console.error('   Make sure your VIENNA_URL is correct and the server is running.\n');
    process.exit(1);
  }

  // ─── Step 2: Register an agent ───
  console.log('📋 Step 1: Registering an agent...');
  let agentId = 'quickstart-agent';
  try {
    const { data } = await api('POST', '/agents', {
      name: 'quickstart-agent',
      description: 'Demo agent from Vienna OS quickstart',
      capabilities: ['file.read', 'file.write', 'api.call'],
    });
    agentId = data?.id || data?.agent_id || agentId;
    console.log(`   ✅ Agent registered: ${agentId}\n`);
  } catch (err) {
    console.log('   ⚠️  Agent registration skipped (may already exist)\n');
  }

  // ─── Step 3: Submit a T0 intent (auto-approved) ───
  console.log('🟢 Step 2: Submitting a T0 intent (low risk — auto-approved)...');
  try {
    const { data } = await api('POST', '/intents', {
      agent_id: agentId,
      action: 'file.read',
      resource: '/var/log/app.log',
      context: {
        purpose: 'Check application health',
        risk_tier: 'T0',
      },
    });
    console.log(`   Status: ${data?.status || 'submitted'}`);
    if (data?.warrant_id) console.log(`   Warrant: ${data.warrant_id}`);
    console.log('   ✅ T0 actions auto-approve — no human in the loop needed\n');
  } catch (err) {
    console.log(`   ⚠️  Intent submission: ${err.message}\n`);
  }

  // ─── Step 4: Submit a T1 intent (requires approval) ───
  console.log('🟡 Step 3: Submitting a T1 intent (medium risk — requires approval)...');
  try {
    const { data } = await api('POST', '/intents', {
      agent_id: agentId,
      action: 'api.call',
      resource: 'https://api.stripe.com/v1/charges',
      context: {
        purpose: 'Process customer refund',
        risk_tier: 'T1',
        amount: 49.99,
        currency: 'USD',
      },
    });
    console.log(`   Status: ${data?.status || 'pending_approval'}`);
    if (data?.approval_id) {
      console.log(`   Approval ID: ${data.approval_id}`);
      console.log('   → This action requires human approval before it can execute');
      console.log('   → In production, approvers get notified via Slack/email');
    }
    console.log('   ✅ T1 actions queue for human review\n');
  } catch (err) {
    console.log(`   ⚠️  Intent submission: ${err.message}\n`);
  }

  // ─── Step 5: Check the audit trail ───
  console.log('📊 Step 4: Checking the audit trail...');
  try {
    const { data } = await api('GET', '/audit?limit=5');
    const events = Array.isArray(data) ? data : (data?.events || data?.items || []);
    if (events.length > 0) {
      console.log(`   Found ${events.length} audit events:`);
      for (const event of events.slice(0, 3)) {
        console.log(`   • ${event.event || event.type} — ${event.actor || 'system'}`);
      }
    } else {
      console.log('   Audit trail ready (events appear after intents are processed)');
    }
    console.log('   ✅ Every action is logged with full context\n');
  } catch (err) {
    console.log(`   ⚠️  Audit trail: ${err.message}\n`);
  }

  // ─── Summary ───
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  🎉 Quickstart complete!');
  console.log('');
  console.log('  What you just did:');
  console.log('  1. Connected to Vienna OS governance layer');
  console.log('  2. Registered an AI agent');
  console.log('  3. Submitted a T0 intent (auto-approved)');
  console.log('  4. Submitted a T1 intent (requires human approval)');
  console.log('  5. Checked the immutable audit trail');
  console.log('');
  console.log('  Next steps:');
  console.log('  • Create policies:    https://console.regulator.ai/policies');
  console.log('  • Review approvals:   https://console.regulator.ai/approvals');
  console.log('  • View audit trail:   https://console.regulator.ai/compliance');
  console.log('  • Read the docs:      https://regulator.ai/docs');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
