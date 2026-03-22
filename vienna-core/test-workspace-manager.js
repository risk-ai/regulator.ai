/**
 * Workspace Manager Tests
 * Phase 12 Stage 1
 */

const { getStateGraph } = require('./lib/state/state-graph');
const { WorkspaceManager } = require('./lib/workspace/workspace-manager');
const { ARTIFACT_TYPES, INVESTIGATION_STATUS } = require('./lib/workspace/workspace-schema');

async function runTests() {
  console.log('=== Workspace Manager Tests ===\n');
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  const workspace = new WorkspaceManager(stateGraph);
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Create investigation
  try {
    console.log('Test 1: Create investigation');
    const investigation = workspace.createInvestigation({
      name: '2026-03-14_gateway_restart',
      description: 'Investigate repeated gateway restarts',
      created_by: 'test-operator',
    });
    
    if (!investigation.investigation_id) throw new Error('No investigation_id');
    if (investigation.status !== INVESTIGATION_STATUS.OPEN) throw new Error('Wrong status');
    if (!investigation.workspace_path) throw new Error('No workspace_path');
    
    console.log('✓ PASS');
    console.log('  Investigation ID:', investigation.investigation_id);
    console.log('  Workspace path:', investigation.workspace_path);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 2: List investigations
  try {
    console.log('\nTest 2: List investigations');
    const investigations = workspace.listInvestigations({ status: INVESTIGATION_STATUS.OPEN });
    
    if (!Array.isArray(investigations)) throw new Error('Not an array');
    if (investigations.length === 0) throw new Error('No investigations found');
    
    console.log('✓ PASS');
    console.log('  Found:', investigations.length, 'open investigations');
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 3: Store artifact
  try {
    console.log('\nTest 3: Store artifact (intent trace)');
    const artifact = workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INTENT_TRACE,
      content: JSON.stringify({ intent_id: 'test-intent-123', trace: 'example' }),
      intent_id: 'test-intent-123',
      created_by: 'test-operator',
    });
    
    if (!artifact.artifact_id) throw new Error('No artifact_id');
    if (!artifact.artifact_path) throw new Error('No artifact_path');
    if (!artifact.content_hash) throw new Error('No content_hash');
    
    console.log('✓ PASS');
    console.log('  Artifact ID:', artifact.artifact_id);
    console.log('  Path:', artifact.artifact_path);
    console.log('  Size:', artifact.size_bytes, 'bytes');
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 4: List artifacts
  try {
    console.log('\nTest 4: List artifacts');
    const artifacts = workspace.listArtifacts({ limit: 10 });
    
    if (!Array.isArray(artifacts)) throw new Error('Not an array');
    if (artifacts.length === 0) throw new Error('No artifacts found');
    
    console.log('✓ PASS');
    console.log('  Found:', artifacts.length, 'artifacts');
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 5: Get artifact content
  try {
    console.log('\nTest 5: Get artifact content');
    const artifacts = workspace.listArtifacts({ limit: 1 });
    if (artifacts.length === 0) throw new Error('No artifacts to test');
    
    const content = workspace.getArtifactContent(artifacts[0].artifact_id);
    if (!content) throw new Error('No content returned');
    if (!Buffer.isBuffer(content)) throw new Error('Content not Buffer');
    
    console.log('✓ PASS');
    console.log('  Content size:', content.length, 'bytes');
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 6: Get workspace tree
  try {
    console.log('\nTest 6: Get workspace tree');
    const tree = workspace.getWorkspaceTree();
    
    if (!tree.investigations) throw new Error('No investigations in tree');
    if (!tree.recent_artifacts) throw new Error('No recent_artifacts in tree');
    if (!tree.recent_traces) throw new Error('No recent_traces in tree');
    
    console.log('✓ PASS');
    console.log('  Investigations:', tree.investigations.length);
    console.log('  Recent artifacts:', tree.recent_artifacts.length);
    console.log('  Recent traces:', tree.recent_traces.length);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 7: Store execution artifact (stdout)
  try {
    console.log('\nTest 7: Store execution artifact (stdout)');
    const artifact = workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.EXECUTION_STDOUT,
      content: 'Test execution output\nLine 2\nLine 3',
      execution_id: 'test-exec-456',
      created_by: 'test-operator',
    });
    
    if (!artifact.artifact_id) throw new Error('No artifact_id');
    if (artifact.mime_type !== 'text/plain') throw new Error('Wrong MIME type');
    
    console.log('✓ PASS');
    console.log('  Artifact ID:', artifact.artifact_id);
    console.log('  MIME type:', artifact.mime_type);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 8: Filter artifacts by type
  try {
    console.log('\nTest 8: Filter artifacts by type');
    const traces = workspace.listArtifacts({ artifact_type: ARTIFACT_TYPES.INTENT_TRACE });
    const stdout = workspace.listArtifacts({ artifact_type: ARTIFACT_TYPES.EXECUTION_STDOUT });
    
    if (!Array.isArray(traces)) throw new Error('Traces not array');
    if (!Array.isArray(stdout)) throw new Error('Stdout not array');
    
    console.log('✓ PASS');
    console.log('  Intent traces:', traces.length);
    console.log('  Execution stdout:', stdout.length);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 9: Link artifact to investigation
  try {
    console.log('\nTest 9: Link artifact to investigation');
    const investigations = workspace.listInvestigations({ limit: 1 });
    if (investigations.length === 0) throw new Error('No investigation to link to');
    
    const artifact = workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTES,
      content: '# Investigation Notes\n\nTest notes for investigation.',
      investigation_id: investigations[0].investigation_id,
      created_by: 'test-operator',
    });
    
    if (!artifact.parent_investigation_id) throw new Error('Not linked to investigation');
    
    const linkedArtifacts = workspace.listArtifacts({
      investigation_id: investigations[0].investigation_id
    });
    
    if (linkedArtifacts.length === 0) throw new Error('No linked artifacts found');
    
    console.log('✓ PASS');
    console.log('  Linked artifacts:', linkedArtifacts.length);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  // Test 10: Get investigation with artifact count
  try {
    console.log('\nTest 10: Get investigation with artifact count');
    const investigations = workspace.listInvestigations({ limit: 1 });
    if (investigations.length === 0) throw new Error('No investigation');
    
    const tree = workspace.getWorkspaceTree();
    const inv = tree.investigations.find(i => i.investigation_id === investigations[0].investigation_id);
    
    if (!inv) throw new Error('Investigation not in tree');
    if (inv.artifact_count === undefined) throw new Error('No artifact_count');
    
    console.log('✓ PASS');
    console.log('  Investigation:', inv.name);
    console.log('  Artifact count:', inv.artifact_count);
    passedTests++;
  } catch (err) {
    console.log('✗ FAIL:', err.message);
    failedTests++;
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Passed:', passedTests);
  console.log('Failed:', failedTests);
  console.log('Total:', passedTests + failedTests);
  
  if (failedTests === 0) {
    console.log('\n✅ All tests passed');
  } else {
    console.log('\n⚠️ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
