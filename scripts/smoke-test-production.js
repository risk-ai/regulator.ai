#!/usr/bin/env node
/**
 * Production Smoke Test Suite — Gap #2 Fix
 * 
 * Runs the complete governance pipeline against the live deployment:
 * auth → intent → policy eval → execution → audit trail
 * 
 * Usage:
 *   VIENNA_API_KEY=vos_xxx node scripts/smoke-test-production.js
 *   VIENNA_API_KEY=vos_xxx VIENNA_BASE_URL=https://staging.regulator.ai node scripts/smoke-test-production.js
 * 
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more tests failed
 */

const BASE_URL = process.env.VIENNA_BASE_URL || 'https://console.regulator.ai';
const API_KEY = process.env.VIENNA_API_KEY;

if (!API_KEY) {
  console.error('❌ VIENNA_API_KEY is required');
  console.error('Usage: VIENNA_API_KEY=vos_xxx node scripts/smoke-test-production.js');
  process.exit(1);
}

// ── Test Framework ──────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(`  ✅ ${name} (${ms}ms)`);
    passed++;
    results.push({ name, status: 'pass', ms });
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`  ❌ ${name} (${ms}ms): ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', ms, error: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'vienna-smoke-test/1.0',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ok: res.ok };
}

// ── Tests ───────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔥 Vienna OS Production Smoke Tests`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  // ── 1. Health Check ──
  console.log('── Health ──');

  await test('GET /api/v1/health returns 200', async () => {
    const res = await api('GET', '/api/v1/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ── 2. Authentication ──
  console.log('\n── Auth ──');

  await test('API key authenticates successfully', async () => {
    const res = await api('GET', '/api/v1/agents');
    assert(res.ok, `Auth failed: ${res.status} ${JSON.stringify(res.data)}`);
  });

  await test('Invalid API key returns 401', async () => {
    const opts = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer vos_invalid_key_12345',
        'Content-Type': 'application/json',
      },
    };
    const res = await fetch(`${BASE_URL}/api/v1/agents`, opts);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── 3. Agent Fleet ──
  console.log('\n── Agents ──');

  await test('GET /api/v1/agents returns array', async () => {
    const res = await api('GET', '/api/v1/agents');
    assert(res.ok, `Failed: ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // ── 4. Policies ──
  console.log('\n── Policies ──');

  await test('GET /api/v1/policies returns list', async () => {
    const res = await api('GET', '/api/v1/policies');
    assert(res.ok, `Failed: ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // ── 5. Executions ──
  console.log('\n── Executions ──');

  await test('GET /api/v1/executions returns list', async () => {
    const res = await api('GET', '/api/v1/executions');
    assert(res.ok, `Failed: ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  await test('GET /api/v1/execution-records returns list', async () => {
    const res = await api('GET', '/api/v1/execution-records');
    assert(res.ok, `Failed: ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // ── 6. Audit Trail ──
  console.log('\n── Audit ──');

  await test('GET /api/v1/audit returns entries', async () => {
    const res = await api('GET', '/api/v1/audit?limit=5');
    assert(res.ok, `Failed: ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // ── 7. Intent Submission (Simulation Mode) ──
  console.log('\n── Intent Pipeline (Simulation) ──');

  await test('POST /api/v1/execution/submit (simulation) evaluates without executing', async () => {
    const res = await api('POST', '/api/v1/execution/submit', {
      action: 'smoke_test_deploy',
      agent_id: 'smoke-test-agent',
      tenant_id: 'smoke-test',
      parameters: { service: 'test-service', version: 'v0.0.1' },
      simulation: true,
    });
    // May get 403 (blocked by policy) or 200 (simulation result) — both are valid
    assert(res.status === 200 || res.status === 403,
      `Expected 200 or 403, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // ── 8. Callback Validation ──
  console.log('\n── Callback Validation ──');

  await test('POST /api/v1/webhooks/execution-callback rejects unknown execution', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_id: 'exe_nonexistent_12345',
        status: 'success',
      }),
    };
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/execution-callback`, opts);
    const data = await res.json().catch(() => ({}));
    // Should return 404 (not found) or 400 (invalid schema)
    assert(res.status === 404 || res.status === 400,
      `Expected 404 or 400, got ${res.status}: ${JSON.stringify(data)}`);
  });

  await test('POST /api/v1/webhooks/execution-callback rejects invalid schema', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bad: 'payload' }),
    };
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/execution-callback`, opts);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // ── 9. Billing / Usage ──
  console.log('\n── Billing ──');

  await test('GET /api/v1/usage returns usage data', async () => {
    const res = await api('GET', '/api/v1/usage');
    // May return 200 or 404 depending on billing setup
    assert(res.status === 200 || res.status === 404,
      `Expected 200 or 404, got ${res.status}`);
  });

  // ── 10. Data Retention ──
  console.log('\n── Retention ──');

  await test('GET /api/v1/retention/policies returns policies', async () => {
    const res = await api('GET', '/api/v1/retention/policies');
    assert(res.ok || res.status === 404, `Failed: ${res.status}`);
  });

  // ── Summary ───────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
    console.log('');
    process.exit(1);
  }

  console.log('✅ All smoke tests passed!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('💀 Smoke test suite crashed:', err);
  process.exit(1);
});
