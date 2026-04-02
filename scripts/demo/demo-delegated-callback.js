#!/usr/bin/env node
/**
 * Demo: Delegated Execution with Callback (Phase 4A)
 * 
 * Demonstrates delegated execution pattern:
 * 1. Create execution in "awaiting_callback" state
 * 2. External agent performs work
 * 3. Agent sends callback with result
 * 4. Execution transitions to complete
 * 
 * Usage:
 *   node scripts/demo/demo-delegated-callback.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

if (!JWT_TOKEN) {
  console.error('❌ JWT_TOKEN env var required');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🧪 Demo: Delegated Execution with Callback (Phase 4A)\n');

  // Step 1: Create delegated execution
  console.log('Step 1: Creating delegated execution (awaiting callback)...');

  const executionId = `exe_demo_${Date.now()}`;

  const executionRequest = {
    tenant_id: 'default',
    execution_id: executionId,
    steps: [
      {
        step_index: 0,
        step_name: 'Process payment via external agent',
        tier: 'delegated',
        action: {
          type: 'wire_transfer',
          target: 'external_banking_agent',
        },
        params: {
          amount: 75000,
          currency: 'USD',
          recipient: 'ACME Corp',
          account: '****1234',
        },
        // No adapter_id for delegated (agent handles it)
      },
    ],
  };

  try {
    const response = await fetch(`${API_BASE}/executions/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(executionRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Execution creation failed: ${error}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ Execution created: ${executionId}`);
    console.log(`   Status: ${result.results[0].success ? 'initiated' : 'failed'}\n`);
  } catch (error) {
    console.error(`❌ Execution failed: ${error.message}`);
    return;
  }

  // Step 2: Simulate external agent completing work
  console.log('Step 2: Simulating external agent completing work...');
  await sleep(2000);  // Simulate processing time

  // Step 3: Agent sends callback
  console.log('Step 3: Sending callback with result...\n');

  const callbackPayload = {
    execution_id: executionId,
    status: 'success',
    result: {
      transaction_id: `WIRE-2026-${Math.floor(Math.random() * 10000)}`,
      confirmation: `CONF-${Math.floor(Math.random() * 100000)}`,
      amount: 75000,
      currency: 'USD',
      recipient: 'ACME Corp',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE}/webhooks/execution-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Callback rejected: ${error}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Callback accepted');
    console.log(`   Previous state: ${result.previous_state}`);
    console.log(`   New state: ${result.new_state}`);
    console.log(`   Execution ID: ${result.execution_id}\n`);
  } catch (error) {
    console.error(`❌ Callback failed: ${error.message}`);
    return;
  }

  // Step 4: Test replay rejection
  console.log('Step 4: Testing replay rejection (send duplicate callback)...');

  try {
    const response = await fetch(`${API_BASE}/webhooks/execution-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackPayload),
    });

    if (response.status === 409) {
      console.log('✅ Replay correctly rejected (409 Conflict)\n');
    } else if (response.status === 200) {
      const result = await response.json();
      if (result.accepted === false || result.message?.includes('already')) {
        console.log('✅ Duplicate callback handled correctly\n');
      } else {
        console.error('❌ Replay NOT rejected — security issue!\n');
      }
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error) {
    console.error(`❌ Replay test failed: ${error.message}`);
  }

  console.log('🎉 Demo complete');
}

run().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
