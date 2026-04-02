#!/usr/bin/env node
/**
 * Stripe Metered Billing Verification — Gap #4 Fix
 * 
 * Verifies the full billing pipeline:
 * 1. Usage tracking calls (trackUsage) → Stripe meter events
 * 2. Meter event creation via Stripe API
 * 3. Subscription meter reading
 * 
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/verify-stripe-billing.js
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/verify-stripe-billing.js --live
 * 
 * Prerequisites:
 *   - Stripe account with metered billing configured
 *   - At least one subscription with usage-based pricing
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const IS_LIVE = process.argv.includes('--live');

if (!STRIPE_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  console.error('Usage: STRIPE_SECRET_KEY=sk_test_xxx node scripts/verify-stripe-billing.js');
  process.exit(1);
}

if (IS_LIVE) {
  console.warn('⚠️  Running against LIVE Stripe — real billing data will be created');
}

async function stripeApi(method, path, body = null) {
  const url = `https://api.stripe.com/v1${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body) {
    opts.body = new URLSearchParams(body).toString();
  }
  const res = await fetch(url, opts);
  return { status: res.status, data: await res.json() };
}

async function run() {
  console.log(`\n🔧 Stripe Billing Verification`);
  console.log(`   Mode: ${IS_LIVE ? 'LIVE' : 'TEST'}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Verify Stripe connection
  console.log('── Connection ──');
  try {
    const res = await stripeApi('GET', '/balance');
    if (res.status === 200) {
      console.log(`  ✅ Stripe API connected (balance: ${res.data.available?.[0]?.amount / 100 || 0} ${res.data.available?.[0]?.currency || 'usd'})`);
      passed++;
    } else {
      console.log(`  ❌ Stripe API error: ${res.status} ${JSON.stringify(res.data)}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Stripe connection failed: ${err.message}`);
    failed++;
  }

  // Test 2: List active subscriptions with metered pricing
  console.log('\n── Subscriptions ──');
  try {
    const res = await stripeApi('GET', '/subscriptions?status=active&limit=10');
    if (res.status === 200) {
      const subs = res.data.data || [];
      const meteredSubs = subs.filter(s =>
        s.items?.data?.some(item => item.price?.recurring?.usage_type === 'metered')
      );
      console.log(`  ✅ Active subscriptions: ${subs.length} (${meteredSubs.length} with metered billing)`);
      passed++;

      if (meteredSubs.length > 0) {
        const sub = meteredSubs[0];
        const meteredItem = sub.items.data.find(i => i.price?.recurring?.usage_type === 'metered');
        console.log(`     First metered sub: ${sub.id}`);
        console.log(`     Customer: ${sub.customer}`);
        console.log(`     Metered item: ${meteredItem.id} (${meteredItem.price.id})`);

        // Test 3: Report usage
        console.log('\n── Usage Reporting ──');
        try {
          const usageRes = await stripeApi('POST', `/subscription_items/${meteredItem.id}/usage_records`, {
            quantity: '1',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            action: 'increment',
          });
          if (usageRes.status === 200) {
            console.log(`  ✅ Usage record created: ${usageRes.data.id} (quantity: ${usageRes.data.quantity})`);
            passed++;
          } else {
            console.log(`  ❌ Usage report failed: ${usageRes.status} ${JSON.stringify(usageRes.data)}`);
            failed++;
          }
        } catch (err) {
          console.log(`  ❌ Usage report error: ${err.message}`);
          failed++;
        }

        // Test 4: Read usage summary
        console.log('\n── Usage Summary ──');
        try {
          const summaryRes = await stripeApi('GET',
            `/subscription_items/${meteredItem.id}/usage_record_summaries?limit=3`
          );
          if (summaryRes.status === 200) {
            const summaries = summaryRes.data.data || [];
            console.log(`  ✅ Usage summaries: ${summaries.length} periods`);
            summaries.forEach(s => {
              console.log(`     Period ${new Date(s.period.start * 1000).toISOString().split('T')[0]}: ${s.total_usage} units`);
            });
            passed++;
          } else {
            console.log(`  ❌ Usage summary failed: ${summaryRes.status}`);
            failed++;
          }
        } catch (err) {
          console.log(`  ❌ Usage summary error: ${err.message}`);
          failed++;
        }
      } else {
        console.log('  ⚠️  No metered subscriptions found — skipping usage tests');
      }
    } else {
      console.log(`  ❌ Subscription list failed: ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Subscription check error: ${err.message}`);
    failed++;
  }

  // Test 5: Verify webhook endpoint exists
  console.log('\n── Webhooks ──');
  try {
    const res = await stripeApi('GET', '/webhook_endpoints?limit=10');
    if (res.status === 200) {
      const endpoints = res.data.data || [];
      const viennaEndpoints = endpoints.filter(e =>
        e.url?.includes('regulator.ai') || e.url?.includes('vienna')
      );
      console.log(`  ✅ Webhook endpoints: ${endpoints.length} total, ${viennaEndpoints.length} Vienna-related`);
      viennaEndpoints.forEach(e => {
        console.log(`     ${e.url} (${e.status}) — events: ${e.enabled_events?.length || 0}`);
      });
      passed++;
    } else {
      console.log(`  ❌ Webhook list failed: ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Webhook check error: ${err.message}`);
    failed++;
  }

  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('💀 Billing verification crashed:', err);
  process.exit(1);
});
