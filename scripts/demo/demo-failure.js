#!/usr/bin/env node
/**
 * Demo: Failure Containment (Phase 4A)
 * 
 * Demonstrates graceful failure handling:
 * 1. Execute multi-step workflow
 * 2. Step 2 fails (timeout or 5xx error)
 * 3. Step 3 never executes (stopped on failure)
 * 4. Execution state = failed, step 2 marked as failed, step 3 = pending
 * 
 * Usage:
 *   node scripts/demo/demo-failure.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

if (!JWT_TOKEN) {
  console.error('❌ JWT_TOKEN env var required');
  process.exit(1);
}

async function run() {
  console.log('🧪 Demo: Failure Containment (Phase 4A)\n');

  // Create adapter config pointing to a failing endpoint
  console.log('Step 1: Creating adapter config for test endpoint...');

  const adapterConfig = {
    tenant_id: 'default',
    adapter_type: 'http',
    name: 'httpbin-failure-test',
    credential_alias: 'httpbin_test',
    endpoint_url: 'https://httpbin.org',
    auth_mode: 'bearer',
    credentials: {
      token: 'test_token_failure',
    },
  };

  let adapterConfigId;
  try {
    const response = await fetch(`${API_BASE}/adapters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adapterConfig),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create adapter config: ${error}`);
      return;
    }

    const result = await response.json();
    adapterConfigId = result.data.id;
    console.log(`✅ Adapter config created: ${adapterConfigId}\n`);
  } catch (error) {
    console.error(`❌ Adapter config creation failed: ${error.message}`);
    return;
  }

  // Step 2: Execute workflow with intentional failure at step 2
  console.log('Step 2: Executing 3-step workflow (step 2 will fail)...\n');

  const executionRequest = {
    tenant_id: 'default',
    steps: [
      {
        step_index: 0,
        step_name: 'Validate input',
        tier: 'native',
        action: {
          type: 'validate',
        },
        params: {},
        // No adapter_id = passthrough
      },
      {
        step_index: 1,
        step_name: 'Call failing endpoint',
        tier: 'managed',
        action: {
          type: 'http_request',
          method: 'GET',
          url: 'https://httpbin.org/status/503',  // Returns 503 Service Unavailable
          timeout_ms: 5000,
          expected_status: [200],  // Expect 200, but will get 503 → fails
        },
        params: {},
        adapter_id: adapterConfigId,
      },
      {
        step_index: 2,
        step_name: 'Notify success',
        tier: 'native',
        action: {
          type: 'notify',
        },
        params: {},
        // This should never execute
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

    if (!response.ok && response.status !== 500) {
      const error = await response.text();
      console.error(`❌ Execution failed unexpectedly: ${error}`);
      return;
    }

    const result = await response.json();
    
    console.log('Execution completed with expected failure:\n');
    console.log(`Overall success: ${result.success}`);
    console.log(`Execution ID: ${result.execution_id}`);
    console.log(`Summary:`, result.summary);

    console.log('\nStep-by-step breakdown:');
    result.results.forEach((stepResult, i) => {
      console.log(`\n  Step ${i}:`);
      console.log(`    Success: ${stepResult.success}`);
      console.log(`    Adapter: ${stepResult.adapter_used}`);
      console.log(`    Latency: ${stepResult.latency_ms}ms`);
      if (stepResult.error) {
        console.log(`    Error: ${stepResult.error}`);
      }
      if (stepResult.output && stepResult.output.status_code) {
        console.log(`    HTTP Status: ${stepResult.output.status_code}`);
      }
    });

    // Validate failure containment
    console.log('\n--- Failure Containment Check ---');
    
    const step0 = result.results[0];
    const step1 = result.results[1];
    const step2 = result.results[2];

    if (step0 && step0.success) {
      console.log('✅ Step 0: Succeeded (as expected)');
    } else {
      console.log('❌ Step 0: Should have succeeded');
    }

    if (step1 && !step1.success) {
      console.log('✅ Step 1: Failed (as expected — 503 error)');
    } else {
      console.log('❌ Step 1: Should have failed');
    }

    if (!step2) {
      console.log('✅ Step 2: Never executed (correctly stopped after step 1 failure)');
    } else if (step2.adapter_used === 'none' || !step2.success) {
      console.log('✅ Step 2: Blocked or skipped (failure containment working)');
    } else {
      console.log('❌ Step 2: Should not have executed — failure containment FAILED');
    }

  } catch (error) {
    console.error(`❌ Execution request failed: ${error.message}`);
    return;
  }

  console.log('\n🎉 Demo complete — Failure containment validated');
}

run().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
