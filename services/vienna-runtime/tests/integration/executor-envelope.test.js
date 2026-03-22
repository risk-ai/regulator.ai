/**
 * Integration test: Executor + Envelope
 * 
 * Tests full flow: envelope creation → execution
 */

const ViennaCore = require('../../index');
const EnvelopeSystem = require('../../lib/governance/envelope');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Executor + Envelope Integration', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  test('executes write_file envelope', async () => {
    // Create truth snapshot
    const truthId = `hb_exec_test_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:exec_test'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    // Issue warrant
    const testFile = path.join(WORKSPACE, `executor-test-${Date.now()}.txt`);
    
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_executor',
      objective: 'Test executor',
      riskTier: 'T1',
      allowedActions: [`write_file:${testFile}`]
    });
    
    // Create envelope
    const envelope = EnvelopeSystem.create({
      warrant_id: warrant.warrant_id,
      objective: 'Write test file via executor',
      actions: [
        {
          type: 'write_file',
          target: testFile,
          content: 'Executor test content'
        }
      ]
    });
    
    // Execute
    const result = await ViennaCore.executor.execute(envelope);
    
    expect(result.success).toBe(true);
    expect(result.envelope_id).toBe(envelope.envelope_id);
    
    // Verify file was written
    const fileContent = await fs.readFile(testFile, 'utf8');
    expect(fileContent).toBe('Executor test content');
    
    // Cleanup
    await fs.unlink(testFile);
  });
  
  test('blocks execution without valid warrant', async () => {
    const envelope = EnvelopeSystem.create({
      warrant_id: 'wrt_nonexistent',
      objective: 'Test invalid warrant',
      actions: [
        {
          type: 'write_file',
          target: '/tmp/should-fail.txt',
          content: 'test'
        }
      ]
    });
    
    await expect(ViennaCore.executor.execute(envelope))
      .rejects.toThrow('Warrant verification failed');
  });
  
  test('blocks execution when action not in warrant scope', async () => {
    const truthId = `hb_scope_test_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    
    const truth = {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:scope_test'
    };
    
    await fs.writeFile(
      path.join(truthDir, `${truthId}.json`),
      JSON.stringify(truth, null, 2)
    );
    
    // Issue warrant for specific file
    const warrant = await ViennaCore.warrant.issue({
      truthSnapshotId: truthId,
      planId: 'test_scope',
      objective: 'Test scope enforcement',
      riskTier: 'T1',
      allowedActions: ['write_file:/tmp/allowed.txt']
    });
    
    // Try to write to different file
    const envelope = EnvelopeSystem.create({
      warrant_id: warrant.warrant_id,
      objective: 'Attempt out-of-scope action',
      actions: [
        {
          type: 'write_file',
          target: '/tmp/not-allowed.txt',
          content: 'test'
        }
      ]
    });
    
    await expect(ViennaCore.executor.execute(envelope))
      .rejects.toThrow('not allowed by warrant');
  });
});
