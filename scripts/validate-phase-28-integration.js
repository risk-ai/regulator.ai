#!/usr/bin/env node
/**
 * Phase 28 Integration Proof — Health Check Validation
 * 
 * Validates governed health check integration through /api/v1/intent
 * 
 * Three scenarios:
 * 1. Executed — Real external health check
 * 2. Simulated — No external call
 * 3. Blocked — Quota/budget enforcement
 */

const https = require('https');

const CONSOLE_URL = process.env.CONSOLE_URL || 'https://console.regulator.ai';
const SESSION_COOKIE = process.env.SESSION_COOKIE || null;

if (!SESSION_COOKIE) {
  console.error('❌ SESSION_COOKIE environment variable required');
  console.error('   Get it from browser after logging in');
  process.exit(1);
}

/**
 * Submit intent to console
 */
async function submitIntent(intent) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/v1/intent', CONSOLE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data });
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(intent));
    req.end();
  });
}

/**
 * Validate response structure
 */
function validateResponse(response, expectedStatus) {
  const { data } = response;

  // Check top-level fields
  const requiredFields = ['tenant', 'status', 'explanation', 'simulation', 'cost', 'attestation', 'error', 'result'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Check status matches expected
  if (data.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${data.status}`);
  }

  return true;
}

/**
 * Test Scenario A: Executed health check
 */
async function testExecuted() {
  console.log('\n🔍 Scenario A: Executed Health Check');
  console.log('=====================================');

  const intent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant-phase28',
      target: 'vienna_backend',
      simulation: false
    }
  };

  console.log('Submitting intent:', JSON.stringify(intent, null, 2));

  try {
    const response = await submitIntent(intent);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Validate response
    validateResponse(response, 'executed');

    // Check execution happened
    if (!response.data.result) {
      throw new Error('Missing result field');
    }

    if (!response.data.result.ok) {
      throw new Error('Health check returned unhealthy status');
    }

    if (response.data.result.simulated) {
      throw new Error('Execution was simulated (should be real)');
    }

    // Check attestation created
    if (!response.data.attestation || !response.data.attestation.attestation_id) {
      throw new Error('Missing attestation');
    }

    if (response.data.attestation.status !== 'executed') {
      throw new Error(`Expected attestation status 'executed', got '${response.data.attestation.status}'`);
    }

    // Check cost recorded
    if (response.data.cost === null) {
      throw new Error('Expected cost to be recorded for executed health check');
    }

    console.log('✅ Executed scenario PASSED');
    console.log(`   - External call performed: YES`);
    console.log(`   - Health status: ${response.data.result.ok ? 'healthy' : 'unhealthy'}`);
    console.log(`   - Status code: ${response.data.result.status_code}`);
    console.log(`   - Cost recorded: $${response.data.cost}`);
    console.log(`   - Attestation: ${response.data.attestation.attestation_id}`);

    return { pass: true, response: response.data };

  } catch (error) {
    console.log('❌ Executed scenario FAILED');
    console.log(`   Error: ${error.message}`);
    return { pass: false, error: error.message };
  }
}

/**
 * Test Scenario B: Simulated health check
 */
async function testSimulated() {
  console.log('\n🔍 Scenario B: Simulated Health Check');
  console.log('======================================');

  const intent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant-phase28',
      target: 'vienna_backend',
      simulation: true
    }
  };

  console.log('Submitting intent:', JSON.stringify(intent, null, 2));

  try {
    const response = await submitIntent(intent);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Validate response
    validateResponse(response, 'simulated');

    // Check NO execution happened
    if (!response.data.result) {
      throw new Error('Missing result field');
    }

    if (!response.data.result.simulated) {
      throw new Error('Result should be marked as simulated');
    }

    // Check attestation status
    if (!response.data.attestation || !response.data.attestation.attestation_id) {
      throw new Error('Missing attestation');
    }

    if (response.data.attestation.status !== 'simulated') {
      throw new Error(`Expected attestation status 'simulated', got '${response.data.attestation.status}'`);
    }

    // Check NO cost recorded
    if (response.data.cost !== null) {
      throw new Error('Expected no cost for simulated health check');
    }

    console.log('✅ Simulated scenario PASSED');
    console.log(`   - External call performed: NO`);
    console.log(`   - Simulated result: ${JSON.stringify(response.data.result)}`);
    console.log(`   - Cost recorded: None (correct)`);
    console.log(`   - Attestation: ${response.data.attestation.attestation_id} (simulated)`);

    return { pass: true, response: response.data };

  } catch (error) {
    console.log('❌ Simulated scenario FAILED');
    console.log(`   Error: ${error.message}`);
    return { pass: false, error: error.message };
  }
}

/**
 * Test Scenario C: Blocked health check
 */
async function testBlocked() {
  console.log('\n🔍 Scenario C: Blocked Health Check');
  console.log('====================================');

  // First, exhaust quota for this tenant
  const exhaustIntent = {
    intent_type: 'test_execution',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant-blocked-phase28',
      mode: 'success'
    }
  };

  console.log('Exhausting quota...');
  
  // Submit multiple times to exhaust quota (assuming quota is small)
  for (let i = 0; i < 5; i++) {
    try {
      await submitIntent(exhaustIntent);
    } catch (error) {
      // Ignore errors, we're just trying to exhaust quota
    }
  }

  // Now try health check
  const intent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: 'test-tenant-blocked-phase28',
      target: 'vienna_backend',
      simulation: false
    }
  };

  console.log('Submitting health check (should be blocked):', JSON.stringify(intent, null, 2));

  try {
    const response = await submitIntent(intent);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Validate response
    const isBlocked = response.data.status === 'blocked_quota' || response.data.status === 'blocked_budget';
    
    if (!isBlocked) {
      throw new Error(`Expected blocked status, got ${response.data.status}`);
    }

    // Check NO execution happened
    if (response.data.result !== null) {
      throw new Error('Result should be null for blocked execution');
    }

    // Check NO cost recorded
    if (response.data.cost !== null) {
      throw new Error('Expected no cost for blocked execution');
    }

    // Check NO attestation for blocked
    if (response.data.attestation !== null) {
      throw new Error('Expected no attestation for blocked execution');
    }

    console.log('✅ Blocked scenario PASSED');
    console.log(`   - External call performed: NO`);
    console.log(`   - Blocked by: ${response.data.status}`);
    console.log(`   - Explanation: ${response.data.explanation}`);
    console.log(`   - Cost recorded: None (correct)`);
    console.log(`   - Attestation: None (correct)`);

    return { pass: true, response: response.data };

  } catch (error) {
    console.log('❌ Blocked scenario FAILED');
    console.log(`   Error: ${error.message}`);
    return { pass: false, error: error.message };
  }
}

/**
 * Main validation flow
 */
async function main() {
  console.log('========================================');
  console.log('Phase 28 Integration Proof Validation');
  console.log('Health Check Integration');
  console.log('========================================');
  console.log(`Console URL: ${CONSOLE_URL}`);
  console.log(`Endpoint: POST /api/v1/intent`);

  const results = {
    executed: await testExecuted(),
    simulated: await testSimulated(),
    blocked: await testBlocked()
  };

  console.log('\n========================================');
  console.log('VALIDATION SUMMARY');
  console.log('========================================');

  const passed = Object.values(results).filter(r => r.pass).length;
  const total = Object.keys(results).length;

  console.log(`\nScenario A (Executed): ${results.executed.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Scenario B (Simulated): ${results.simulated.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Scenario C (Blocked): ${results.blocked.pass ? '✅ PASS' : '❌ FAIL'}`);

  console.log(`\nTotal: ${passed}/${total} scenarios passed`);

  if (passed === total) {
    console.log('\n🎉 Phase 28 Integration Proof: VALIDATED');
    console.log('   Real external integration operational through governed path');
    process.exit(0);
  } else {
    console.log('\n❌ Phase 28 Integration Proof: INCOMPLETE');
    console.log('   Fix failing scenarios and re-run');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
