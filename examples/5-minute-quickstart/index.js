#!/usr/bin/env node
/**
 * Vienna OS — 5-Minute Quickstart
 * 
 * This script demonstrates the complete governance lifecycle in under 5 minutes.
 * No server needed — uses the regulator.ai/try sandbox API.
 * 
 * Usage:
 *   npx @vienna-os/quickstart
 *   # or
 *   node index.js
 */

const SANDBOX_URL = 'https://regulator.ai/api/try';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Vienna OS — 5-Minute Quickstart              ║
║         Governed AI Execution in Under 5 Minutes          ║
╚══════════════════════════════════════════════════════════╝
`);

  // Scenario 1: Auto-approved read (T0)
  console.log('━━━ Scenario 1: Auto-Approved Read (T0) ━━━\n');
  console.log('  An analytics agent queries revenue metrics.');
  console.log('  T0 = informational, auto-approved, no human needed.\n');
  
  const read = await simulate('auto_approved_read');
  printResult(read);

  // Scenario 2: Production deploy (T1)
  console.log('\n━━━ Scenario 2: Production Deploy (T1) ━━━\n');
  console.log('  A DevOps agent deploys to production.');
  console.log('  T1 = low risk, policy auto-approves, warrant issued.\n');
  
  const deploy = await simulate('production_deploy');
  printResult(deploy);

  // Scenario 3: Wire transfer (T2)
  console.log('\n━━━ Scenario 3: Wire Transfer $75K (T2) ━━━\n');
  console.log('  A finance agent requests a $75,000 wire transfer.');
  console.log('  T2 = medium risk, requires human approval.\n');
  
  const wire = await simulate('wire_transfer');
  printResult(wire);

  // Scenario 4: Denied - scope creep
  console.log('\n━━━ Scenario 4: Denied — Scope Creep ━━━\n');
  console.log('  An analytics bot tries to export user data.');
  console.log('  DENIED — agent scope is read-only, not admin:export.\n');
  
  const denied = await simulate('denied_scope_creep');
  printResult(denied);

  // Summary
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                    What You Just Saw                      ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  T0 (Auto)     → Agent read data, instant approval        ║
║  T1 (Policy)   → Agent deployed code, policy approved     ║
║  T2 (Human)    → Agent sent $75K, 2 humans approved       ║
║  DENIED        → Agent tried scope creep, blocked          ║
║                                                           ║
║  Every action: policy check → warrant → verify → audit    ║
║  Every warrant: HMAC-SHA256 signed, time-limited, scoped  ║
║                                                           ║
╠══════════════════════════════════════════════════════════╣
║  Next steps:                                              ║
║  • npm install @vienna-os/sdk                             ║
║  • Try it live: https://regulator.ai/try                  ║
║  • Docs: https://regulator.ai/docs                        ║
║  • GitHub: https://github.com/risk-ai/regulator.ai        ║
╚══════════════════════════════════════════════════════════╝
`);
}

async function simulate(scenario) {
  try {
    const res = await fetch(SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    return await res.json();
  } catch (e) {
    return { error: e.message, pipeline: [] };
  }
}

function printResult(result) {
  if (result.error) {
    console.log(`  ❌ Error: ${result.error}`);
    return;
  }

  const { outcome, tier, pipeline, warrant, total_duration_ms } = result;
  
  // Print pipeline steps
  for (const step of pipeline || []) {
    const icon = step.status === 'success' ? '✅' : step.status === 'denied' ? '🚫' : '⏭️';
    const time = step.duration_ms > 0 ? ` (${step.duration_ms}ms)` : '';
    console.log(`  ${icon} ${step.label}${time}`);
    console.log(`     ${step.detail}`);
  }

  console.log('');
  
  // Print verdict
  if (outcome === 'approved' || outcome === 'auto-approved') {
    console.log(`  ✅ RESULT: ${outcome.toUpperCase()} (${tier}) — ${total_duration_ms}ms total`);
    if (warrant) {
      console.log(`  🔑 Warrant: ${warrant.warrant_id.slice(0, 12)}… | TTL: ${warrant.ttl_seconds}s | Sig: ${warrant.signature_hash.slice(0, 12)}…`);
    }
  } else {
    console.log(`  🚫 RESULT: DENIED — Agent trust score reduced, security team notified`);
  }
}

main().catch(console.error);
