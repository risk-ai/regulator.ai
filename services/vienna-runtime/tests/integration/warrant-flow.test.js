/**
 * Integration test for warrant flow with OpenClaw adapter
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const TEST_WORKSPACE = path.join(__dirname, '..', '..', 'test-workspace');

describe('Warrant Flow Integration', () => {
  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    await fs.mkdir(path.join(TEST_WORKSPACE, 'warrants', 'active'), { recursive: true });
    await fs.mkdir(path.join(TEST_WORKSPACE, 'warrants', 'audit'), { recursive: true });
    await fs.mkdir(path.join(TEST_WORKSPACE, 'truth_snapshots'), { recursive: true });
    
    // Create mock truth snapshot
    const truthSnapshot = {
      truth_snapshot_id: 'hb_test_001',
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:test',
      sources: []
    };
    
    await fs.writeFile(
      path.join(TEST_WORKSPACE, 'truth_snapshots', 'hb_test_001.json'),
      JSON.stringify(truthSnapshot, null, 2)
    );
    
    // Create mock runtime state
    const runtimeState = `# Vienna Runtime State

**Last Updated:** ${new Date().toISOString()}

## Current Operating Mode

**NBA Kalshi Trading:**
- **v1_baseline live trading:** ON (autonomous)
- **Autonomous window start:** 2026-03-10
- **Autonomous window duration:** 7 days
`;
    
    await fs.writeFile(
      path.join(TEST_WORKSPACE, 'VIENNA_RUNTIME_STATE.md'),
      runtimeState
    );
    
    // Initialize Vienna Core
    ViennaCore.init({
      adapter: 'openclaw',
      workspace: TEST_WORKSPACE
    });
  });
  
  afterAll(async () => {
    // Cleanup test workspace
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
  });
  
  test('complete warrant lifecycle', async () => {
    // Issue warrant
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: 'hb_test_001',
      planId: 'tal_test_001',
      objective: 'Integration test warrant',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/test.txt'],
      expiresInMinutes: 15
    });
    
    expect(warrant.warrant_id).toMatch(/^wrt_/);
    expect(warrant.status).toBe('issued');
    
    // Verify warrant file was created
    const warrantPath = path.join(TEST_WORKSPACE, 'warrants', 'active', `${warrant.change_id}.json`);
    const exists = await fs.access(warrantPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
    
    // Verify warrant
    const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
    expect(verification.valid).toBe(true);
    
    // List active warrants
    const active = await ViennaCore.warrant.listActive();
    expect(active.length).toBeGreaterThan(0);
    expect(active.some(w => w.warrant_id === warrant.warrant_id)).toBe(true);
    
    // Invalidate warrant
    await ViennaCore.warrant.invalidate(warrant.warrant_id, 'Test invalidation');
    
    // Verify invalidation
    const recheck = await ViennaCore.warrant.verify(warrant.warrant_id);
    expect(recheck.valid).toBe(false);
    expect(recheck.reason).toBe('WARRANT_INVALIDATED');
  });
  
  test('trading guard blocks during autonomous window', async () => {
    const actions = [
      { type: 'restart_service', target: 'kalshi-cron' }
    ];
    
    const result = await ViennaCore.tradingGuard.check(actions);
    
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('AUTONOMOUS_WINDOW_ACTIVE');
  });
  
  test('trading guard allows non-trading actions', async () => {
    const actions = [
      { type: 'write_file', target: '/tmp/test.txt' }
    ];
    
    const result = await ViennaCore.tradingGuard.check(actions);
    
    expect(result.safe).toBe(true);
  });
});
