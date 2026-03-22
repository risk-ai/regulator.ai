/**
 * Stale Truth Edge Test
 * 
 * Validates truth freshness enforcement.
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Truth Freshness Enforcement', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  test('rejects warrant with stale T2 truth snapshot', async () => {
    // Create truth snapshot with old verification time
    const truthId = `hb_stale_t2_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    // T2 requires truth < 10 minutes old
    // Set last_verified_at to 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const staleTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: fifteenMinutesAgo.toISOString(),
      truth_snapshot_hash: 'sha256:stale'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(staleTruth, null, 2)
    );
    
    // Attempt to issue T2 warrant with stale truth
    await expect(
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'test_plan',
        approvalId: 'test_approval',
        objective: 'Test stale truth rejection',
        riskTier: 'T2',
        allowedActions: ['write_file:/tmp/test.txt']
      })
    ).rejects.toThrow(/Truth snapshot too old/);
  });
  
  test('rejects warrant with stale T1 truth snapshot', async () => {
    // T1 requires truth < 30 minutes old
    // Set to 45 minutes ago
    const truthId = `hb_stale_t1_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
    
    const staleTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: fortyFiveMinutesAgo.toISOString(),
      truth_snapshot_hash: 'sha256:stale_t1'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(staleTruth, null, 2)
    );
    
    // Attempt to issue T1 warrant
    await expect(
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'test_plan',
        objective: 'Test T1 stale truth',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/test.txt']
      })
    ).rejects.toThrow(/Truth snapshot too old/);
  });
  
  test('accepts warrant with fresh truth snapshot', async () => {
    // Create fresh truth
    const truthId = `hb_fresh_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const freshTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(), // Now
      truth_snapshot_hash: 'sha256:fresh'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(freshTruth, null, 2)
    );
    
    // Should succeed
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_plan',
      approvalId: 'test_approval',
      objective: 'Test fresh truth acceptance',
      riskTier: 'T2',
      allowedActions: ['write_file:/tmp/test.txt']
    });
    
    expect(warrant.warrant_id).toMatch(/^wrt_/);
  });
  
  test('T0 warrants accept any truth age', async () => {
    // Create very old truth
    const truthId = `hb_ancient_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    const ancientTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: oneYearAgo.toISOString(),
      truth_snapshot_hash: 'sha256:ancient'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(ancientTruth, null, 2)
    );
    
    // T0 should accept any age
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_plan',
      objective: 'Test T0 ancient truth',
      riskTier: 'T0',
      allowedActions: ['read_file:/tmp/test.txt']
    });
    
    expect(warrant.warrant_id).toMatch(/^wrt_/);
  });
});
