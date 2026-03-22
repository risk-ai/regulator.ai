#!/usr/bin/env node
/**
 * Test warrant issuance against real workspace
 */

const ViennaCore = require('../index');
const path = require('path');

async function main() {
  const workspace = path.join(process.env.HOME, '.openclaw', 'workspace');
  
  console.log('Initializing Vienna Core...');
  ViennaCore.init({
    adapter: 'openclaw',
    workspace
  });
  
  console.log('Creating test truth snapshot...');
  const fs = require('fs').promises;
  const truthDir = path.join(workspace, 'truth_snapshots');
  await fs.mkdir(truthDir, { recursive: true });
  
  const truthSnapshot = {
    truth_snapshot_id: 'hb_test_real',
    last_verified_at: new Date().toISOString(),
    truth_snapshot_hash: 'sha256:test_real',
    sources: ['PHASE_7.1.0_EXECUTION_LOG.md'],
    verified_by: 'vienna',
    phase: '7.1.0_day1_validation'
  };
  
  await fs.writeFile(
    path.join(truthDir, 'hb_test_real.json'),
    JSON.stringify(truthSnapshot, null, 2)
  );
  
  console.log('Issuing T1 warrant...');
  const warrant = await ViennaCore.warrant.issue({
    truthSnapshotId: 'hb_test_real',
    planId: 'phase7.1.0_validation',
    objective: 'Test warrant issuance against real workspace',
    riskTier: 'T1',
    allowedActions: ['write_file:test_validation.txt'],
    expiresInMinutes: 15
  });
  
  console.log('✓ Warrant issued:', warrant.warrant_id);
  console.log('  Change ID:', warrant.change_id);
  console.log('  Expires:', warrant.expires_at);
  console.log('  Trading safety:', JSON.stringify(warrant.trading_safety));
  
  console.log('\nVerifying warrant...');
  const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
  console.log('✓ Warrant valid:', verification.valid);
  console.log('  Remaining minutes:', verification.remaining_minutes);
  
  console.log('\nChecking trading guard...');
  const tradingCheck = await ViennaCore.tradingGuard.check([
    { type: 'write_file', target: 'test_validation.txt' }
  ]);
  console.log('✓ Non-trading action safe:', tradingCheck.safe);
  
  const tradingCriticalCheck = await ViennaCore.tradingGuard.check([
    { type: 'restart_service', target: 'kalshi-cron' }
  ]);
  console.log('✓ Trading-critical action blocked:', !tradingCriticalCheck.safe);
  console.log('  Reason:', tradingCriticalCheck.reason);
  
  console.log('\nListing active warrants...');
  const active = await ViennaCore.warrant.listActive();
  console.log('✓ Active warrants:', active.length);
  
  console.log('\nInvalidating test warrant...');
  await ViennaCore.warrant.invalidate(warrant.warrant_id, 'Test complete');
  console.log('✓ Warrant invalidated');
  
  console.log('\n✅ All validations passed!');
  console.log('\nVienna Core Phase 7.1.0 Day 1 complete.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
