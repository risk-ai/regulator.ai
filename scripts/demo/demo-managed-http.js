#!/usr/bin/env node
/**
 * Demo: Managed HTTP Execution (Phase 4A)
 * 
 * Demonstrates external HTTP execution with credential injection.
 * 
 * Prerequisites:
 * 1. VIENNA_CREDENTIAL_KEY env var set (32-byte key for AES-256-GCM)
 * 2. Adapter config created with encrypted credentials
 * 3. Test HTTP endpoint available (httpbin.org used for demo)
 * 
 * Usage:
 *   node scripts/demo/demo-managed-http.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

if (!JWT_TOKEN) {
  console.error('❌ JWT_TOKEN env var required');
  console.error('   Get token via: curl -X POST http://localhost:3000/api/v1/auth/login -d \'{"email":"...","password":"..."}\'');
  process.exit(1);
}

async function run() {
  console.log('🧪 Demo: Managed HTTP Execution (Phase 4A)\n');

  // Step 1: Create adapter config with credentials
  console.log('Step 1: Creating adapter config with test credentials...');
  
  const adapterConfig = {
    tenant_id: 'default',
    adapter_type: 'http',
    name: 'httpbin-test',
    credential_alias: 'httpbin_api_key',
    endpoint_url: 'https://httpbin.org',
    auth_mode: 'bearer',
    credentials: {
      token: 'test_token_12345', // Demo token (will be encrypted)
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

  // Step 2: Execute steps with adapter
  console.log('Step 2: Executing HTTP request with credential injection...');

  const executionRequest = {
    tenant_id: 'default',
    steps: [
      {
        step_index: 0,
        step_name: 'Test HTTP GET with auth',
        tier: 'managed',
        action: {
          type: 'http_request',
          method: 'GET',
          url: 'https://httpbin.org/bearer',  // This endpoint echoes the Authorization header
          timeout_ms: 5000,
          expected_status: [200],
        },
        params: {},
        adapter_id: adapterConfigId,
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
      console.error(`❌ Execution failed: ${error}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Execution completed successfully\n');
    console.log('Execution ID:', result.execution_id);
    console.log('Summary:', result.summary);
    console.log('\nStep Results:');
    result.results.forEach((stepResult, i) => {
      console.log(`\n  Step ${i}:`);
      console.log(`    Success: ${stepResult.success}`);
      console.log(`    Latency: ${stepResult.latency_ms}ms`);
      console.log(`    Adapter: ${stepResult.adapter_used}`);
      if (stepResult.output) {
        console.log(`    Status: ${stepResult.output.status_code}`);
        console.log(`    Body: ${JSON.stringify(stepResult.output.body, null, 2).substring(0, 200)}...`);
      }
    });

    // Verify no credentials leaked
    const resultString = JSON.stringify(result);
    if (resultString.includes('test_token_12345')) {
      console.error('\n❌ SECURITY FAILURE: Credential leaked in response!');
    } else {
      console.log('\n✅ Security check passed: No credentials in response');
    }
  } catch (error) {
    console.error(`❌ Execution request failed: ${error.message}`);
    return;
  }

  console.log('\n🎉 Demo complete');
}

run().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
