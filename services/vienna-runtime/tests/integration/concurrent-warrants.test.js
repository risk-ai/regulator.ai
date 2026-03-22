/**
 * Concurrent Warrant Test
 * 
 * Verifies Vienna Core handles concurrent warrant operations safely.
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Concurrent Warrant Operations', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  test('concurrent warrant issuance produces unique IDs', async () => {
    // Create truth snapshot
    const truthId = `hb_concurrent_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    const truthSnapshot = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:concurrent_test'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truthSnapshot, null, 2)
    );
    
    // Issue 10 warrants concurrently
    const issuePromises = Array.from({ length: 10 }, (_, i) =>
      ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: `concurrent_plan_${i}`,
        objective: `Concurrent test ${i}`,
        riskTier: 'T1',
        allowedActions: [`write_file:/tmp/concurrent_${i}.txt`]
      })
    );
    
    const warrants = await Promise.all(issuePromises);
    
    // Verify all IDs unique
    const ids = warrants.map(w => w.warrant_id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(10);
    expect(warrants.length).toBe(10);
    
    // Verify all warrants valid
    const verifications = await Promise.all(
      ids.map(id => ViennaCore.warrant.verify(id))
    );
    
    expect(verifications.every(v => v.valid)).toBe(true);
  });
  
  test('listActive handles concurrent reads', async () => {
    // Multiple concurrent list operations
    const listPromises = Array.from({ length: 5 }, () =>
      ViennaCore.warrant.listActive()
    );
    
    const results = await Promise.all(listPromises);
    
    // All should return consistent results
    const firstLength = results[0].length;
    expect(results.every(r => r.length === firstLength)).toBe(true);
  });
});
