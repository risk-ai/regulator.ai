/**
 * Phase 6 Minimal Test Suite
 * 
 * 12 critical governance tests.
 * Target: ≥75% pass rate
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Phase 6 Minimal Suite (12 Critical Tests)', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  // Test 1: Truth Validation (Hardenberg)
  test('A1: T1 warrant requires valid truth snapshot', async () => {
    const truthId = `hb_a1_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_a1'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_a1',
      objective: 'Test A1',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/a1.txt']
    });
    
    expect(warrant.truth_snapshot_id).toBe(truthId);
    expect(warrant.risk_tier).toBe('T1');
  });
  
  // Test 2: T2 Approval Gating (Metternich)
  test('A2: T2 warrant requires approval ID', async () => {
    const truthId = `hb_a2_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_a2'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    // Should fail without approval
    await expect(
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_a2',
        objective: 'Test A2',
        riskTier: 'T2',
        allowedActions: ['restart_service:test']
      })
    ).rejects.toThrow(/T2 warrants require approvalId/);
  });
  
  // Test 3: Warrant Issuance
  test('A3: Warrant issuance generates unique ID', async () => {
    const truthId = `hb_a3_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_a3'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_a3',
      objective: 'Test A3',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/a3.txt']
    });
    
    expect(warrant.warrant_id).toMatch(/^wrt_/);
    expect(warrant.change_id).toMatch(/^chg_/);
  });
  
  // Test 4: Audit Emission
  test('A4: Warrant issuance emits audit event', async () => {
    const truthId = `hb_a4_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_a4'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const auditDir = path.join(WORKSPACE, 'warrants', 'audit');
    const auditsBefore = await fs.readdir(auditDir);
    
    await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_a4',
      objective: 'Test A4',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/a4.txt']
    });
    
    const auditsAfter = await fs.readdir(auditDir);
    
    // Should have at least one new audit file
    expect(auditsAfter.length).toBeGreaterThan(auditsBefore.length);
  });
  
  // Test 5: Trading Guard Enforcement
  test('H1: Trading guard blocks service restart during autonomous window', async () => {
    const actions = [
      { type: 'restart_service', target: 'kalshi-cron' }
    ];
    
    const result = await ViennaCore.tradingGuard.check(actions);
    
    // Should block during autonomous window
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('AUTONOMOUS_WINDOW_ACTIVE');
  });
  
  // Test 6: Trading Guard Allows Safe Actions
  test('H2: Trading guard allows non-trading actions', async () => {
    const actions = [
      { type: 'write_file', target: '/tmp/test.txt' }
    ];
    
    const result = await ViennaCore.tradingGuard.check(actions);
    
    expect(result.safe).toBe(true);
  });
  
  // Test 7: Truth Freshness T2
  test('H3: T2 warrant rejects stale truth (>10 min)', async () => {
    const truthId = `hb_h3_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const staleTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: fifteenMinutesAgo.toISOString(),
      truth_snapshot_hash: 'sha256:stale_h3'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(staleTruth, null, 2)
    );
    
    await expect(
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_h3',
        approvalId: 'met_h3',
        objective: 'Test H3',
        riskTier: 'T2',
        allowedActions: ['write_file:/tmp/h3.txt']
      })
    ).rejects.toThrow(/Truth snapshot too old/);
  });
  
  // Test 8: Truth Freshness T1
  test('H4: T1 warrant rejects stale truth (>30 min)', async () => {
    const truthId = `hb_h4_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
    
    const staleTruth = {
      truth_snapshot_id: truthId,
      last_verified_at: fortyFiveMinutesAgo.toISOString(),
      truth_snapshot_hash: 'sha256:stale_h4'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(staleTruth, null, 2)
    );
    
    await expect(
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_h4',
        objective: 'Test H4',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/h4.txt']
      })
    ).rejects.toThrow(/Truth snapshot too old/);
  });
  
  // Test 9: Warrant Verification
  test('D1: Warrant verification detects valid warrant', async () => {
    const truthId = `hb_d1_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_d1'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_d1',
      objective: 'Test D1',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/d1.txt']
    });
    
    const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
    
    expect(verification.valid).toBe(true);
    expect(verification.warrant).toBeDefined();
  });
  
  // Test 10: Warrant Expiration
  test('D2: Warrant verification detects expired warrant', async () => {
    const truthId = `hb_d2_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_d2'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_d2',
      objective: 'Test D2',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/d2.txt'],
      expiresInMinutes: -1 // Already expired
    });
    
    const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
    
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('WARRANT_EXPIRED');
  });
  
  // Test 11: Warrant Invalidation
  test('D3: Warrant invalidation prevents further use', async () => {
    const truthId = `hb_d3_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_d3'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'tal_d3',
      objective: 'Test D3',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/d3.txt']
    });
    
    await ViennaCore.warrant.invalidate(warrant.warrant_id, 'Test invalidation');
    
    const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
    
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('WARRANT_INVALIDATED');
  });
  
  // Test 12: Concurrent Warrant Safety
  test('C1: Concurrent warrant issuance produces unique IDs', async () => {
    const truthId = `hb_c1_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test_c1'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const warrants = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        ViennaCore.warrant.issue({
          truthSnapshotId: truthId,
          planId: `tal_c1_${i}`,
          objective: `Test C1 ${i}`,
          riskTier: 'T1',
          allowedActions: [`write_file:/tmp/c1_${i}.txt`]
        })
      )
    );
    
    const ids = warrants.map(w => w.warrant_id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(10);
  });
});
