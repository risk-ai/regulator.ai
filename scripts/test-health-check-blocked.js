#!/usr/bin/env node
/**
 * Phase 28 Blocked Integration Closure Test
 * 
 * Validates that health check integration respects quota blocking
 * and does NOT perform external call when blocked.
 */

const path = require('path');

// Set test environment
process.env.VIENNA_ENV = 'test';
process.env.NODE_ENV = 'test';

const viennaLibPath = path.join(__dirname, '../services/vienna-lib');
const { getStateGraph } = require(path.join(viennaLibPath, 'state/state-graph'));
const { IntentGateway } = require(path.join(viennaLibPath, 'core/intent-gateway'));

async function testBlockedHealthCheck() {
  console.log('\n========================================');
  console.log('Phase 28 Blocked Integration Closure Test');
  console.log('==========================================\n');

  // Initialize state graph
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create intent gateway
  const gateway = new IntentGateway(stateGraph);

  // Use a tenant with exhausted quota
  const blockedTenant = 'test-tenant-blocked-phase28';

  console.log('Step 1: Create tenant with exhausted quota');
  console.log('-------------------------------------------');

  // Create tenant with quota_used >= quota_limit
  try {
    stateGraph.createTenant(
      blockedTenant,
      'Test Tenant (Blocked)',
      {
        quota_limit: 10,
        quota_used: 10,  // Already at limit
        budget_limit: 1000,
        budget_used: 0
      }
    );
    console.log(`  Created tenant: ${blockedTenant}`);
    console.log(`  Quota: 10/10 (exhausted)`);
  } catch (error) {
    // Tenant might already exist, try to update
    if (error.message.includes('UNIQUE constraint')) {
      console.log(`  Tenant already exists, skipping creation`);
    } else {
      throw error;
    }
  }

  console.log('\nStep 2: Submit health check (should be blocked)');
  console.log('------------------------------------------------');

  const blockedIntent = {
    intent_type: 'check_system_health',
    source: { type: 'operator', id: 'test-operator' },
    payload: {
      tenant: blockedTenant,
      target: 'vienna_backend',
      simulation: false  // Request real execution
    }
  };

  console.log('Submitting health check intent...');

  let result;
  try {
    result = await gateway.submitIntent(blockedIntent);
  } catch (error) {
    console.log('❌ FAILED: Exception thrown');
    console.log(`   Exception: ${error.message}`);
    process.exit(1);
  }

  console.log('\nStep 3: Validate blocked behavior');
  console.log('----------------------------------');

  console.log('Result:', JSON.stringify(result, null, 2));

  // Validation checks
  const checks = {
    accepted: false,
    error: null,
    no_result: false,
    no_cost: false,
    no_attestation: false,
    quota_explanation: false
  };

  // Check 1: Intent should be denied
  if (!result.accepted) {
    console.log('✅ Check 1: Intent denied (accepted: false)');
    checks.accepted = true;
  } else {
    console.log('❌ Check 1: Intent ACCEPTED (should be denied)');
  }

  // Check 2: Error should indicate quota/budget block
  if (result.error === 'quota_exceeded' || result.error === 'budget_exceeded') {
    console.log(`✅ Check 2: Error indicates blocking (${result.error})`);
    checks.error = true;
  } else {
    console.log(`❌ Check 2: Error does not indicate blocking (${result.error})`);
  }

  // Check 3: No result should be returned (no execution)
  if (!result.metadata || !result.metadata.result) {
    console.log('✅ Check 3: No health result returned (no execution)');
    checks.no_result = true;
  } else {
    console.log('❌ Check 3: Health result present (execution may have occurred)');
    console.log(`   Result: ${JSON.stringify(result.metadata.result)}`);
  }

  // Check 4: No cost should be recorded
  if (!result.cost && (!result.metadata || !result.metadata.cost)) {
    console.log('✅ Check 4: No cost recorded');
    checks.no_cost = true;
  } else {
    console.log('❌ Check 4: Cost recorded (should be none for blocked execution)');
    console.log(`   Cost: ${result.cost || result.metadata?.cost}`);
  }

  // Check 5: No attestation should be created for blocked intent
  if (!result.attestation && (!result.metadata || !result.metadata.attestation)) {
    console.log('✅ Check 5: No attestation created (correct for blocked)');
    checks.no_attestation = true;
  } else {
    console.log('❌ Check 5: Attestation created (should be none for blocked)');
  }

  // Check 6: Explanation should mention quota/budget
  const explanation = result.explanation || result.message || '';
  if (explanation.toLowerCase().includes('quota') || explanation.toLowerCase().includes('budget')) {
    console.log('✅ Check 6: Explanation mentions quota/budget');
    checks.quota_explanation = true;
  } else {
    console.log('❌ Check 6: Explanation does not mention quota/budget');
    console.log(`   Explanation: ${explanation}`);
  }

  console.log('\n========================================');
  console.log('Validation Summary');
  console.log('========================================\n');

  const passed = Object.values(checks).filter(v => v).length;
  const total = Object.keys(checks).length;

  console.log(`Checks passed: ${passed}/${total}`);
  console.log('');

  for (const [check, pass] of Object.entries(checks)) {
    console.log(`  ${pass ? '✅' : '❌'} ${check}`);
  }

  console.log('\n========================================');

  if (passed === total) {
    console.log('\n🎉 Phase 28 Blocked Integration Closure Test: PASSED');
    console.log('');
    console.log('Evidence:');
    console.log('  - Intent denied: YES');
    console.log('  - Error indicates blocking: YES');
    console.log('  - No health result: YES (no external call)');
    console.log('  - No cost recorded: YES');
    console.log('  - No attestation: YES');
    console.log('  - Quota explanation: YES');
    console.log('');
    console.log('Conclusion:');
    console.log('  Health check integration respects quota enforcement.');
    console.log('  No external call performed when blocked.');
    console.log('  Phase 28 blocked-path confirmation: COMPLETE');
    process.exit(0);
  } else {
    console.log('\n❌ Phase 28 Blocked Integration Closure Test: FAILED');
    console.log('');
    console.log(`Failed checks: ${total - passed}/${total}`);
    console.log('');
    console.log('Blocked integration behavior not fully validated.');
    process.exit(1);
  }
}

testBlockedHealthCheck().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
