/**
 * Phase 12.4 — Objective Investigation Workspace Tests
 * 
 * Validates investigation workflows:
 * - Open investigation
 * - Link objective/traces/artifacts
 * - Write notes
 * - Update status
 * - Generate reports
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { WorkspaceManager } = require('./lib/workspace/workspace-manager');
const { InvestigationManager } = require('./lib/workspace/investigation-manager');
const { INVESTIGATION_STATUS } = require('./lib/workspace/workspace-schema');

async function main() {
  console.log('Phase 12.4 Objective Investigation Workspace Tests\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const workspace = new WorkspaceManager(stateGraph);
  const investigations = new InvestigationManager(stateGraph, workspace);

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

  console.log('Category A: Open Investigation\n');

  // Test A1: Open basic investigation
  const investigation1 = investigations.openInvestigation({
    name: 'Gateway Health Investigation',
    description: 'Investigating repeated gateway restart failures',
    created_by: 'operator',
  });

  assert(
    investigation1.investigation_id &&
    investigation1.status === INVESTIGATION_STATUS.OPEN,
    'A1: Open investigation with basic params'
  );

  // Test A2: Investigation creates workspace artifact
  const workspaceArtifacts = workspace.listArtifacts({ 
    investigation_id: investigation1.investigation_id,
    artifact_type: 'investigation_workspace'
  });

  assert(
    workspaceArtifacts.length === 1,
    'A2: Opening investigation creates workspace artifact'
  );

  // Test A3: Open investigation with objective
  const objectiveId = 'obj-test-001';
  stateGraph.createObjective({
    objective_id: objectiveId,
    name: 'Maintain gateway health',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    desired_state: { status: 'healthy' },
    verification_strength: 'service_health',
    evaluation_interval: '300s',
    remediation_plan: 'restart_service',
    status: 'declared',
    created_by: 'system',
  });

  const investigation2 = investigations.openInvestigation({
    name: 'Objective Failure Analysis',
    description: 'Analyzing objective reconciliation failures',
    objective_id: objectiveId,
    created_by: 'operator',
  });

  assert(
    investigation2.objective_id === objectiveId,
    'A3: Open investigation with objective link'
  );

  console.log('\nCategory B: Link Objective\n');

  // Test B1: Link objective to existing investigation
  const linkedInvestigation = investigations.linkObjective(
    investigation1.investigation_id,
    objectiveId,
    'operator'
  );

  assert(
    linkedInvestigation.objective_id === objectiveId,
    'B1: Link objective to investigation'
  );

  // Test B2: Linking creates audit note
  const linkNotes = workspace.listArtifacts({
    investigation_id: investigation1.investigation_id,
    artifact_type: 'investigation_note'
  });

  assert(
    linkNotes.length >= 1,
    'B2: Linking objective creates audit note'
  );

  console.log('\nCategory C: Link Trace\n');

  // Create test intent trace
  const intentId = 'intent-inv-test-001';
  stateGraph.createIntentTrace(
    intentId,
    'restore_objective',
    { type: 'operator', id: 'max' },
    new Date().toISOString()
  );

  // Create trace artifacts
  workspace.storeArtifact({
    artifact_type: 'intent_trace',
    content: JSON.stringify({ intent_id: intentId }),
    intent_id: intentId,
    created_by: 'system',
  });

  workspace.storeArtifact({
    artifact_type: 'execution_output',
    content: 'Gateway restart output',
    intent_id: intentId,
    created_by: 'system',
  });

  // Test C1: Link trace to investigation
  const traceLink = investigations.linkTrace(
    investigation1.investigation_id,
    intentId,
    'operator'
  );

  assert(
    traceLink.artifacts_linked === 2,
    'C1: Link trace artifacts to investigation'
  );

  // Test C2: Trace artifacts now linked
  const linkedArtifacts = workspace.listArtifacts({
    investigation_id: investigation1.investigation_id,
    intent_id: intentId
  });

  assert(
    linkedArtifacts.length >= 2,
    'C2: Trace artifacts linked to investigation'
  );

  console.log('\nCategory D: Investigation Notes\n');

  // Test D1: Add investigation note
  const note1 = investigations.addNote(
    investigation1.investigation_id,
    '## Initial Findings\n\nGateway appears to be failing health checks after 30s',
    'operator'
  );

  assert(
    note1.artifact_type === 'investigation_note',
    'D1: Add investigation note'
  );

  // Test D2: Add multiple notes
  investigations.addNote(
    investigation1.investigation_id,
    'Root cause identified: DNS resolution timeout',
    'operator'
  );

  investigations.addNote(
    investigation1.investigation_id,
    'Fix applied: increased timeout from 10s to 30s',
    'operator'
  );

  const allNotes = workspace.listArtifacts({
    investigation_id: investigation1.investigation_id,
    artifact_type: 'investigation_note'
  });

  assert(
    allNotes.length >= 4, // link note + 3 investigation notes
    'D2: Multiple notes can be added'
  );

  console.log('\nCategory E: Status Updates\n');

  // Test E1: Update to investigating
  const investigating = investigations.updateStatus(
    investigation1.investigation_id,
    INVESTIGATION_STATUS.INVESTIGATING,
    'operator'
  );

  assert(
    investigating.status === INVESTIGATION_STATUS.INVESTIGATING,
    'E1: Update status to investigating'
  );

  // Test E2: Update to resolved with note
  const resolved = investigations.updateStatus(
    investigation1.investigation_id,
    INVESTIGATION_STATUS.RESOLVED,
    'operator',
    '## Resolution\n\nIncreased DNS timeout resolved health check failures. No recurrence in 24 hours.'
  );

  assert(
    resolved.status === INVESTIGATION_STATUS.RESOLVED &&
    resolved.resolved_at !== null,
    'E2: Update status to resolved sets resolved_at'
  );

  // Test E3: Resolution creates report artifact
  const reports = workspace.listArtifacts({
    investigation_id: investigation1.investigation_id,
    artifact_type: 'investigation_report'
  });

  assert(
    reports.length >= 1,
    'E3: Resolution with note creates report artifact'
  );

  console.log('\nCategory F: Generate Report\n');

  // Test F1: Generate investigation report
  const report = investigations.generateReport(investigation1.investigation_id);

  assert(
    report.investigation_id === investigation1.investigation_id &&
    report.summary.total_artifacts > 0,
    'F1: Generate investigation report'
  );

  // Test F2: Report includes notes
  assert(
    report.notes.length >= 4,
    'F2: Report includes investigation notes'
  );

  // Test F3: Report includes objective info
  assert(
    report.objective && report.objective.objective_id === objectiveId,
    'F3: Report includes linked objective'
  );

  // Test F4: Report includes summary
  assert(
    report.summary.notes_count > 0 &&
    report.summary.traces_count > 0,
    'F4: Report includes artifact summary'
  );

  // Test F5: Export report to artifact
  const reportArtifact = investigations.exportReport(
    investigation1.investigation_id,
    'operator'
  );

  assert(
    reportArtifact.artifact_type === 'investigation_report' &&
    reportArtifact.mime_type === 'application/json',
    'F5: Export report to workspace artifact'
  );

  console.log('\nCategory G: List and Summary\n');

  // Test G1: List investigations
  const allInvestigations = investigations.listInvestigations();
  
  assert(
    allInvestigations.length >= 2,
    'G1: List all investigations'
  );

  // Test G2: Filter by status
  const resolvedInvestigations = investigations.listInvestigations({ 
    status: INVESTIGATION_STATUS.RESOLVED 
  });

  assert(
    resolvedInvestigations.length >= 1 &&
    resolvedInvestigations[0].status === INVESTIGATION_STATUS.RESOLVED,
    'G2: Filter investigations by status'
  );

  // Test G3: Filter by objective
  const objectiveInvestigations = investigations.listInvestigations({ 
    objective_id: objectiveId 
  });

  assert(
    objectiveInvestigations.length === 2, // investigation1 + investigation2
    'G3: Filter investigations by objective'
  );

  // Test G4: Get investigation summary
  const summary = investigations.getInvestigationSummary(investigation1.investigation_id);

  assert(
    summary.artifacts.total > 0 &&
    summary.artifacts.by_type['investigation_note'] >= 4,
    'G4: Get investigation summary with artifact breakdown'
  );

  console.log('\n=== Phase 12.4 Test Summary ===\n');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n✓ Phase 12.4 Objective Investigation Workspace: ALL TESTS PASSED');
  } else {
    console.log(`\n✗ Phase 12.4 Objective Investigation Workspace: ${failCount} test(s) failed`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
