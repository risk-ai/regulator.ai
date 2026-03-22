/**
 * Enforcement Path Test
 * 
 * Validates that enforced mutation path works end-to-end.
 */

const ViennaCore = require('../../index');
const EnvelopeSystem = require('../../lib/governance/envelope');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Enforcement Path', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  test('write-file-envelope.js executes via executor', async () => {
    // Create truth + warrant
    const truthId = `hb_enforcement_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:enforcement_test'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    const testFile = path.join(WORKSPACE, `enforcement-test-${Date.now()}.txt`);
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_enforcement',
      objective: 'Test enforcement path',
      riskTier: 'T1',
      allowedActions: [`write_file:${testFile}`]
    });
    
    // Execute via CLI script
    const scriptPath = path.join(WORKSPACE, 'scripts', 'write-file-envelope.js');
    const output = execSync(
      `node ${scriptPath} --warrant ${warrant.warrant_id} --target ${testFile} --content "Enforcement test"`,
      { encoding: 'utf8' }
    );
    
    const result = JSON.parse(output);
    
    expect(result.status).toBe('success');
    expect(result.via).toBe('vienna-core-executor');
    
    // Verify file was written
    const content = await fs.readFile(testFile, 'utf8');
    expect(content).toBe('Enforcement test');
    
    // Cleanup
    await fs.unlink(testFile);
  });
  
  test('trading guard blocks trading-critical action', async () => {
    const truthId = `hb_trading_block_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:trading_block'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    // Issue warrant for trading-critical action
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_trading_block',
      approvalId: 'test_approval',
      objective: 'Test trading guard in executor',
      riskTier: 'T2',
      allowedActions: ['restart_service:kalshi-cron']
    });
    
    // Create envelope for restart
    const envelope = EnvelopeSystem.create({
      warrant_id: warrant.warrant_id,
      objective: 'Attempt trading-critical restart',
      actions: [
        {
          type: 'restart_service',
          target: 'kalshi-cron'
        }
      ]
    });
    
    // Should be blocked by trading guard
    await expect(ViennaCore.executor.execute(envelope))
      .rejects.toThrow(/autonomous window/i);
  });
});
