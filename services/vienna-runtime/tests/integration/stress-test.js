/**
 * Stress Test: 50 Concurrent Warrants
 * 
 * Validates Vienna Core under load.
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');
const MONITOR_LOG = path.join(WORKSPACE, 'logs', 'phase7-monitor', 'day3.log');

async function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  await fs.appendFile(MONITOR_LOG, entry);
  console.log(message);
}

async function stressTest() {
  await log('=== Stress Test Started ===');
  
  // Initialize
  ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  
  // Create truth snapshot
  const truthId = `hb_stress_${Date.now()}`;
  const truthDir = path.join(WORKSPACE, 'truth_snapshots');
  await fs.mkdir(truthDir, { recursive: true });
  
  const truthSnapshot = {
    truth_snapshot_id: truthId,
    last_verified_at: new Date().toISOString(),
    truth_snapshot_hash: 'sha256:stress_test'
  };
  
  await fs.writeFile(
    path.join(truthDir, `${truthId}.json`),
    JSON.stringify(truthSnapshot, null, 2)
  );
  
  await log(`Truth snapshot created: ${truthId}`);
  
  // Issue 50 warrants concurrently
  const warrantCount = 50;
  const startTime = Date.now();
  
  await log(`Issuing ${warrantCount} concurrent warrants...`);
  
  const issuePromises = Array.from({ length: warrantCount }, async (_, i) => {
    const issueStart = Date.now();
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: `stress_plan_${i}`,
      objective: `Stress test warrant ${i}`,
      riskTier: 'T1',
      allowedActions: [`write_file:/tmp/stress_${i}.txt`]
    });
    
    const issueLatency = Date.now() - issueStart;
    await log(`warrant_issue_latency warrant_${i} ${issueLatency}ms`);
    
    return warrant;
  });
  
  const warrants = await Promise.all(issuePromises);
  const totalIssueTime = Date.now() - startTime;
  
  await log(`All ${warrantCount} warrants issued in ${totalIssueTime}ms`);
  await log(`Average latency: ${(totalIssueTime / warrantCount).toFixed(2)}ms`);
  
  // Verify all IDs unique
  const ids = warrants.map(w => w.warrant_id);
  const uniqueIds = new Set(ids);
  
  if (uniqueIds.size !== warrantCount) {
    await log(`ERROR: Duplicate warrant IDs detected! Unique: ${uniqueIds.size}, Expected: ${warrantCount}`);
    throw new Error('Warrant ID collision detected');
  }
  
  await log(`✓ All ${warrantCount} warrant IDs unique`);
  
  // Verify all warrants
  const verifyStart = Date.now();
  const verifications = await Promise.all(
    ids.map(async (id, i) => {
      const verifyStartSingle = Date.now();
      const result = await ViennaCore.warrant.verify(id);
      const verifyLatency = Date.now() - verifyStartSingle;
      await log(`warrant_verify_latency warrant_${i} ${verifyLatency}ms`);
      return result;
    })
  );
  const totalVerifyTime = Date.now() - verifyStart;
  
  const allValid = verifications.every(v => v.valid);
  
  if (!allValid) {
    await log('ERROR: Some warrants failed verification');
    throw new Error('Warrant verification failed');
  }
  
  await log(`✓ All ${warrantCount} warrants verified in ${totalVerifyTime}ms`);
  await log(`Average verify latency: ${(totalVerifyTime / warrantCount).toFixed(2)}ms`);
  
  // Invalidate half the warrants
  const invalidateCount = Math.floor(warrantCount / 2);
  const invalidateStart = Date.now();
  
  await log(`Invalidating ${invalidateCount} warrants...`);
  
  await Promise.all(
    ids.slice(0, invalidateCount).map(async (id, i) => {
      const invalidateStartSingle = Date.now();
      await ViennaCore.warrant.invalidate(id, 'Stress test cleanup');
      const invalidateLatency = Date.now() - invalidateStartSingle;
      await log(`warrant_invalidate_latency warrant_${i} ${invalidateLatency}ms`);
    })
  );
  
  const totalInvalidateTime = Date.now() - invalidateStart;
  
  await log(`✓ ${invalidateCount} warrants invalidated in ${totalInvalidateTime}ms`);
  await log(`Average invalidate latency: ${(totalInvalidateTime / invalidateCount).toFixed(2)}ms`);
  
  // Check audit trail completeness
  const auditDir = path.join(WORKSPACE, 'warrants', 'audit');
  const auditFiles = await fs.readdir(auditDir);
  const auditEvents = auditFiles.filter(f => f.includes('warrant_issued'));
  
  await log(`Audit trail: ${auditEvents.length} warrant_issued events (expected ≥${warrantCount})`);
  
  if (auditEvents.length < warrantCount) {
    await log(`WARNING: Audit trail incomplete. Found ${auditEvents.length}, expected ${warrantCount}`);
  } else {
    await log('✓ Audit trail complete');
  }
  
  // List active warrants
  const active = await ViennaCore.warrant.listActive();
  const expectedActive = warrantCount - invalidateCount;
  
  await log(`Active warrants: ${active.length} (expected ${expectedActive})`);
  
  if (active.length !== expectedActive) {
    await log(`WARNING: Active warrant count mismatch`);
  } else {
    await log('✓ Active warrant count correct');
  }
  
  await log('=== Stress Test Complete ===');
  await log('');
  await log('Summary:');
  await log(`  Total warrants: ${warrantCount}`);
  await log(`  Issue time: ${totalIssueTime}ms`);
  await log(`  Verify time: ${totalVerifyTime}ms`);
  await log(`  Invalidate time: ${totalInvalidateTime}ms`);
  await log(`  Unique IDs: ${uniqueIds.size}/${warrantCount}`);
  await log(`  All valid: ${allValid}`);
  await log(`  Audit events: ${auditEvents.length}`);
  await log(`  Active warrants: ${active.length}/${expectedActive}`);
  
  return {
    warrantCount,
    totalIssueTime,
    totalVerifyTime,
    totalInvalidateTime,
    uniqueIds: uniqueIds.size,
    allValid,
    auditEvents: auditEvents.length,
    activeWarrants: active.length
  };
}

// Run if called directly
if (require.main === module) {
  stressTest()
    .then(results => {
      console.log('\n✅ Stress test passed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Stress test failed:', err.message);
      process.exit(1);
    });
}

module.exports = { stressTest };
