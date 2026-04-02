#!/usr/bin/env node
/**
 * Load Test against Vercel Deployment — Gap #7 Fix
 * 
 * Tests response times and throughput on the live Vercel deployment.
 * Measures p50/p95/p99 latencies and error rates.
 * 
 * Usage:
 *   VIENNA_API_KEY=vos_xxx node scripts/load-test-vercel.js
 *   VIENNA_API_KEY=vos_xxx node scripts/load-test-vercel.js --concurrency 20 --requests 200
 */

const BASE_URL = process.env.VIENNA_BASE_URL || 'https://console.regulator.ai';
const API_KEY = process.env.VIENNA_API_KEY;

if (!API_KEY) {
  console.error('❌ VIENNA_API_KEY required');
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const CONCURRENCY = parseInt(args[args.indexOf('--concurrency') + 1]) || 10;
const TOTAL_REQUESTS = parseInt(args[args.indexOf('--requests') + 1]) || 100;

async function timedFetch(method, path, body = null) {
  const start = Date.now();
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    return { status: res.status, latencyMs: Date.now() - start, ok: res.ok, error: null };
  } catch (err) {
    return { status: 0, latencyMs: Date.now() - start, ok: false, error: err.message };
  }
}

function percentile(sorted, p) {
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

async function runLoadTest() {
  console.log(`\n⚡ Vienna OS Load Test`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Total requests: ${TOTAL_REQUESTS}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  const endpoints = [
    { name: 'GET /health', method: 'GET', path: '/api/v1/health', weight: 3 },
    { name: 'GET /agents', method: 'GET', path: '/api/v1/agents', weight: 2 },
    { name: 'GET /policies', method: 'GET', path: '/api/v1/policies', weight: 2 },
    { name: 'GET /executions', method: 'GET', path: '/api/v1/executions', weight: 2 },
    { name: 'POST /submit (sim)', method: 'POST', path: '/api/v1/execution/submit', weight: 1,
      body: { action: 'load_test', agent_id: 'load-tester', tenant_id: 'test', parameters: {}, simulation: true }
    },
  ];

  // Build request queue weighted by endpoint weight
  const queue = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    // Weighted random selection
    const totalWeight = endpoints.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    for (const ep of endpoints) {
      r -= ep.weight;
      if (r <= 0) { queue.push(ep); break; }
    }
  }

  const results = [];
  const startTime = Date.now();
  let completed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(ep => timedFetch(ep.method, ep.path, ep.body).then(r => ({ ...r, endpoint: ep.name })))
    );
    results.push(...batchResults);
    completed += batchResults.length;

    // Progress
    if (completed % 20 === 0 || completed === TOTAL_REQUESTS) {
      process.stdout.write(`\r  Progress: ${completed}/${TOTAL_REQUESTS} (${Math.round(completed/TOTAL_REQUESTS*100)}%)`);
    }
  }

  const totalTimeMs = Date.now() - startTime;
  console.log('\n');

  // Analyze results
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const errors = results.filter(r => !r.ok);
  const byEndpoint = {};

  for (const r of results) {
    if (!byEndpoint[r.endpoint]) byEndpoint[r.endpoint] = { latencies: [], errors: 0, total: 0 };
    byEndpoint[r.endpoint].latencies.push(r.latencyMs);
    byEndpoint[r.endpoint].total++;
    if (!r.ok) byEndpoint[r.endpoint].errors++;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  OVERALL RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total requests:    ${results.length}`);
  console.log(`  Total time:        ${(totalTimeMs / 1000).toFixed(1)}s`);
  console.log(`  Throughput:        ${(results.length / (totalTimeMs / 1000)).toFixed(1)} req/s`);
  console.log(`  Errors:            ${errors.length} (${(errors.length/results.length*100).toFixed(1)}%)`);
  console.log(`  p50 latency:       ${percentile(latencies, 50)}ms`);
  console.log(`  p95 latency:       ${percentile(latencies, 95)}ms`);
  console.log(`  p99 latency:       ${percentile(latencies, 99)}ms`);
  console.log(`  min/max:           ${latencies[0]}ms / ${latencies[latencies.length-1]}ms`);

  console.log('\n── Per-Endpoint ──');
  for (const [name, data] of Object.entries(byEndpoint)) {
    const sorted = data.latencies.sort((a, b) => a - b);
    console.log(`  ${name}`);
    console.log(`    count: ${data.total} | errors: ${data.errors} | p50: ${percentile(sorted, 50)}ms | p95: ${percentile(sorted, 95)}ms`);
  }

  console.log('\n═══════════════════════════════════════════════════');

  // SLA check
  const p99 = percentile(latencies, 99);
  const errorRate = errors.length / results.length;

  if (p99 > 2000) {
    console.log(`\n⚠️  p99 latency ${p99}ms exceeds 2000ms SLA target`);
  }
  if (errorRate > 0.01) {
    console.log(`\n⚠️  Error rate ${(errorRate*100).toFixed(1)}% exceeds 1% SLA target`);
  }
  if (p99 <= 2000 && errorRate <= 0.01) {
    console.log(`\n✅ All SLA targets met (p99 < 2000ms, error rate < 1%)`);
  }

  process.exit(errors.length > results.length * 0.05 ? 1 : 0);
}

runLoadTest().catch(err => {
  console.error('💀 Load test crashed:', err);
  process.exit(1);
});
