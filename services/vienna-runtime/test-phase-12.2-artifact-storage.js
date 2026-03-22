/**
 * Phase 12.2 — Artifact Storage Model Tests
 * 
 * Validates first-class artifact objects with:
 * - Enhanced search capabilities
 * - Cross-linking between artifacts
 * - Metadata search
 * - Investigation workflow integration
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { WorkspaceManager } = require('./lib/workspace/workspace-manager');
const { ARTIFACT_TYPES, INVESTIGATION_STATUS } = require('./lib/workspace/workspace-schema');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Phase 12.2 Artifact Storage Model Tests\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const workspace = new WorkspaceManager(stateGraph);

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ ${testName}`);
      passCount++;
    } else {
      console.log(`✗ ${testName}`);
      failCount++;
    }
  }

  console.log('Category A: Enhanced Artifact Schema\n');

  // Test A1: Create trace artifact with explicit linking
  const investigation1 = workspace.createInvestigation({
    name: 'Gateway Recovery Investigation',
    description: 'Investigation into gateway restart failure',
    created_by: 'operator',
  });

  const intentId = 'intent-test-001';
  const executionId = 'exec-test-001';

  const traceArtifact = workspace.storeArtifact({
    artifact_type: ARTIFACT_TYPES.TRACE,
    content: JSON.stringify({ intent_id: intentId, status: 'completed' }),
    investigation_id: investigation1.investigation_id,
    intent_id: intentId,
    execution_id: executionId,
    created_by: 'operator',
    mime_type: 'application/json',
  });

  assert(
    traceArtifact.intent_id === intentId &&
    traceArtifact.execution_id === executionId &&
    traceArtifact.parent_investigation_id === investigation1.investigation_id,
    'A1: Trace artifact created with explicit context linking'
  );

  // Test A2: Create execution output artifact
  const executionOutput = workspace.storeArtifact({
    artifact_type: ARTIFACT_TYPES.EXECUTION_OUTPUT,
    content: 'Gateway restarted successfully',
    execution_id: executionId,
    created_by: 'system',
  });

  assert(
    executionOutput.artifact_type === ARTIFACT_TYPES.EXECUTION_OUTPUT &&
    executionOutput.execution_id === executionId,
    'A2: Execution output artifact created'
  );

  // Test A3: Create verification report artifact
  const verificationReport = workspace.storeArtifact({
    artifact_type: ARTIFACT_TYPES.VERIFICATION_REPORT,
    content: JSON.stringify({ checks_passed: 3, checks_failed: 0 }),
    execution_id: executionId,
    created_by: 'system',
  });

  assert(
    verificationReport.artifact_type === ARTIFACT_TYPES.VERIFICATION_REPORT,
    'A3: Verification report artifact created'
  );

  // Test A4: Create operator annotation
  const annotation = workspace.storeArtifact({
    artifact_type: ARTIFACT_TYPES.OPERATOR_ANNOTATION,
    content: 'Restart resolved the health check failure',
    investigation_id: investigation1.investigation_id,
    created_by: 'operator',
  });

  assert(
    annotation.artifact_type === ARTIFACT_TYPES.OPERATOR_ANNOTATION,
    'A4: Operator annotation created'
  );

  console.log('\nCategory B: Enhanced Search Capabilities\n');

  // Test B1: Search by artifact type
  const traceArtifacts = workspace.listArtifacts({ artifact_type: ARTIFACT_TYPES.TRACE });
  assert(
    traceArtifacts.length >= 1 && traceArtifacts[0].artifact_type === ARTIFACT_TYPES.TRACE,
    'B1: Search artifacts by type'
  );

  // Test B2: Search by execution ID
  const executionArtifacts = workspace.listArtifacts({ execution_id: executionId });
  assert(
    executionArtifacts.length === 3, // trace + output + verification
    'B2: Search artifacts by execution_id'
  );

  // Test B3: Search by intent ID
  const intentArtifacts = workspace.listArtifacts({ intent_id: intentId });
  assert(
    intentArtifacts.length === 1 && intentArtifacts[0].intent_id === intentId,
    'B3: Search artifacts by intent_id'
  );

  // Test B4: Search by investigation ID
  const investigationArtifacts = workspace.listArtifacts({ investigation_id: investigation1.investigation_id });
  assert(
    investigationArtifacts.length === 2, // trace + annotation
    'B4: Search artifacts by investigation_id'
  );

  // Test B5: Search by creator
  const operatorArtifacts = workspace.listArtifacts({ created_by: 'operator' });
  assert(
    operatorArtifacts.length === 2, // trace + annotation
    'B5: Search artifacts by created_by'
  );

  // Test B6: Search with date range
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const recentArtifacts = workspace.listArtifacts({ date_after: oneHourAgo });
  assert(
    recentArtifacts.length >= 4,
    'B6: Search artifacts by date range'
  );

  console.log('\nCategory C: Cross-Linking\n');

  // Test C1: Link existing artifact to new context
  const linkedArtifact = workspace.linkArtifact(executionOutput.artifact_id, {
    investigation_id: investigation1.investigation_id,
  });

  assert(
    linkedArtifact.parent_investigation_id === investigation1.investigation_id,
    'C1: Link existing artifact to investigation'
  );

  // Test C2: Get cross-linked artifacts
  const crossLinked = workspace.getCrossLinkedArtifacts(traceArtifact.artifact_id);
  
  assert(
    crossLinked.by_execution.length >= 2 && // output + verification
    crossLinked.by_investigation.length >= 1, // annotation (now + output)
    'C2: Get cross-linked artifacts by context'
  );

  // Test C3: Multiple context links
  const multiLinkedArtifact = workspace.storeArtifact({
    artifact_type: ARTIFACT_TYPES.STATE_SNAPSHOT,
    content: JSON.stringify({ services: ['openclaw-gateway'] }),
    investigation_id: investigation1.investigation_id,
    intent_id: intentId,
    execution_id: executionId,
    objective_id: 'obj-001',
    created_by: 'system',
  });

  const multiCrossLinked = workspace.getCrossLinkedArtifacts(multiLinkedArtifact.artifact_id);
  
  assert(
    multiCrossLinked.by_intent.length >= 1 &&
    multiCrossLinked.by_execution.length >= 3 &&
    multiCrossLinked.by_investigation.length >= 2,
    'C3: Cross-link across multiple contexts'
  );

  console.log('\nCategory D: Investigation Workflow\n');

  // Test D1: Update investigation status
  const updatedInvestigation = workspace.updateInvestigationStatus(
    investigation1.investigation_id,
    INVESTIGATION_STATUS.INVESTIGATING,
    'operator'
  );

  assert(
    updatedInvestigation.status === INVESTIGATION_STATUS.INVESTIGATING,
    'D1: Update investigation status'
  );

  // Test D2: Status change creates audit artifact
  const auditArtifacts = workspace.listArtifacts({
    investigation_id: investigation1.investigation_id,
    artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTE,
  });

  assert(
    auditArtifacts.length >= 1,
    'D2: Status change creates audit trail artifact'
  );

  // Test D3: Resolve investigation
  const resolvedInvestigation = workspace.updateInvestigationStatus(
    investigation1.investigation_id,
    INVESTIGATION_STATUS.RESOLVED,
    'operator'
  );

  assert(
    resolvedInvestigation.status === INVESTIGATION_STATUS.RESOLVED &&
    resolvedInvestigation.resolved_at !== null,
    'D3: Resolve investigation sets resolved_at'
  );

  // Test D4: Search resolved investigations
  const resolvedInvestigations = workspace.listInvestigations({ status: INVESTIGATION_STATUS.RESOLVED });
  
  assert(
    resolvedInvestigations.length >= 1 &&
    resolvedInvestigations[0].status === INVESTIGATION_STATUS.RESOLVED,
    'D4: Search investigations by status'
  );

  console.log('\nCategory E: Immutability Guarantees\n');

  // Test E1: Artifact content hash computed
  const artifact = workspace.getArtifact(traceArtifact.artifact_id);
  assert(
    artifact.content_hash && artifact.content_hash.length === 64, // SHA-256
    'E1: Artifact content hash computed'
  );

  // Test E2: Artifact content matches hash
  const content = workspace.getArtifactContent(traceArtifact.artifact_id);
  const crypto = require('crypto');
  const computedHash = crypto.createHash('sha256').update(content).digest('hex');
  
  assert(
    computedHash === artifact.content_hash,
    'E2: Artifact content integrity verified via hash'
  );

  // Test E3: Artifact path is immutable (stored in DB)
  const retrievedArtifact = workspace.getArtifact(traceArtifact.artifact_id);
  assert(
    retrievedArtifact.artifact_path === traceArtifact.artifact_path,
    'E3: Artifact path immutable in database'
  );

  console.log('\n=== Phase 12.2 Test Summary ===\n');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n✓ Phase 12.2 Artifact Storage Model: ALL TESTS PASSED');
  } else {
    console.log(`\n✗ Phase 12.2 Artifact Storage Model: ${failCount} test(s) failed`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
