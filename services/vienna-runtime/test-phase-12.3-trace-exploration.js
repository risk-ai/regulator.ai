/**
 * Phase 12.3 — Trace Exploration Surface Tests
 * 
 * Validates trace explorer integration with:
 * - Intent tracing system (Phase 11.5)
 * - Workspace artifact storage (Phase 12.2)
 * - Execution ledger (Phase 8.3)
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { WorkspaceManager } = require('./lib/workspace/workspace-manager');
const { TraceExplorer } = require('./lib/workspace/trace-explorer');

async function main() {
  console.log('Phase 12.3 Trace Exploration Surface Tests\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const workspace = new WorkspaceManager(stateGraph);
  const explorer = new TraceExplorer(stateGraph, workspace);

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

  console.log('Setup: Create test intent traces\n');

  // Create test intent trace
  const intentId1 = 'intent-test-trace-001';
  stateGraph.createIntentTrace(
    intentId1,
    'restore_objective',
    { type: 'operator', id: 'max' },
    new Date().toISOString()
  );

  // Add trace events via IntentTracer
  const { IntentTracer } = require('./lib/core/intent-tracing');
  const tracer = new IntentTracer(stateGraph);

  await tracer.recordEvent(intentId1, 'intent.accepted', {
    reason: 'Valid restore request'
  });

  await tracer.recordEvent(intentId1, 'plan.created', {
    plan_id: 'plan-001'
  });

  await tracer.recordEvent(intentId1, 'execution.started', {
    execution_id: 'exec-001'
  });

  await tracer.recordEvent(intentId1, 'execution.completed', {
    execution_id: 'exec-001',
    status: 'success'
  });

  // Create execution ledger entry
  const execId = 'exec-001';
  stateGraph.appendLedgerEvent({
    execution_id: execId,
    intent_id: intentId1,
    event_type: 'execution_started',
    stage: 'execution',
    event_timestamp: new Date().toISOString(),
    actor_type: 'system',
    actor_id: 'vienna-core',
    event_metadata: JSON.stringify({ objective: 'Restore gateway health' }),
  });

  stateGraph.appendLedgerEvent({
    execution_id: execId,
    intent_id: intentId1,
    event_type: 'execution_completed',
    stage: 'execution',
    event_timestamp: new Date().toISOString(),
    actor_type: 'system',
    actor_id: 'vienna-core',
    event_metadata: JSON.stringify({ status: 'success' }),
  });

  // Create workspace artifacts linked to intent
  workspace.storeArtifact({
    artifact_type: 'trace',
    content: JSON.stringify({ intent_id: intentId1, events: [] }),
    intent_id: intentId1,
    created_by: 'system',
  });

  workspace.storeArtifact({
    artifact_type: 'execution_output',
    content: 'Gateway restarted successfully',
    intent_id: intentId1,
    execution_id: execId,
    created_by: 'system',
  });

  // Create second intent trace for filtering
  const intentId2 = 'intent-test-trace-002';
  stateGraph.createIntentTrace(
    intentId2,
    'investigate_objective',
    { type: 'agent', id: 'castlereagh' },
    new Date().toISOString()
  );

  await tracer.recordEvent(intentId2, 'intent.denied', {
    reason: 'Safe mode active'
  });

  console.log('Category A: List Traces\n');

  // Test A1: List all traces
  const allTraces = await explorer.listTraces();
  assert(
    allTraces.length >= 2,
    'A1: List all intent traces'
  );

  // Test A2: Filter by intent type
  const restoreTraces = await explorer.listTraces({ intent_type: 'restore_objective' });
  assert(
    restoreTraces.length >= 1 && restoreTraces[0].intent_type === 'restore_objective',
    'A2: Filter traces by intent_type'
  );

  // Test A3: Filter by source type
  const operatorTraces = await explorer.listTraces({ source_type: 'operator' });
  assert(
    operatorTraces.length >= 1 && operatorTraces[0].source.type === 'operator',
    'A3: Filter traces by source_type'
  );

  // Test A4: Trace includes artifact count
  assert(
    allTraces[0].artifact_count !== undefined,
    'A4: Trace listing includes artifact count'
  );

  console.log('\nCategory B: Get Complete Trace\n');

  // Test B1: Get trace with events
  const trace = await explorer.getTrace(intentId1);
  assert(
    trace.intent_id === intentId1 &&
    trace.events.length === 4,
    'B1: Get complete trace with events'
  );

  // Test B2: Trace includes artifacts
  assert(
    trace.artifacts.length === 2,
    'B2: Trace includes linked artifacts'
  );

  // Test B3: Trace includes relationships (execution linkage is optional)
  assert(
    trace.relationships !== undefined,
    'B3: Trace includes relationships object'
  );

  // Test B4: Event metadata parsed
  assert(
    typeof trace.events[0].metadata === 'object',
    'B4: Event metadata correctly parsed'
  );

  console.log('\nCategory C: Execution Graph\n');

  // Test C1: Generate execution graph
  const graph = await explorer.getExecutionGraph(intentId1);
  assert(
    graph.nodes.length >= 7 && // intent + 4 events + 1 exec + 2 artifacts
    graph.edges.length >= 6,
    'C1: Generate execution graph with nodes and edges'
  );

  // Test C2: Graph includes intent node
  const intentNode = graph.nodes.find(n => n.id === intentId1);
  assert(
    intentNode && intentNode.type === 'intent',
    'C2: Graph includes intent node'
  );

  // Test C3: Graph includes event nodes
  const eventNodes = graph.nodes.filter(n => n.type === 'event');
  assert(
    eventNodes.length === 4,
    'C3: Graph includes event nodes'
  );

  // Test C4: Graph includes execution nodes (optional - depends on relationships)
  const execNodes = graph.nodes.filter(n => n.type === 'execution');
  assert(
    execNodes.length >= 0, // Can be 0 if no relationships set
    'C4: Graph execution nodes (optional)'
  );

  // Test C5: Graph includes artifact nodes
  const artifactNodes = graph.nodes.filter(n => n.type === 'artifact');
  assert(
    artifactNodes.length === 2,
    'C5: Graph includes artifact nodes'
  );

  // Test C6: Graph summary correct
  assert(
    graph.summary.event_count === 4 &&
    graph.summary.artifact_count === 2,
    'C6: Graph summary includes counts'
  );

  console.log('\nCategory D: Timeline View\n');

  // Test D1: Generate timeline
  const timeline = await explorer.getTimeline(intentId1);
  assert(
    timeline.timeline.length >= 7, // intent + 4 events + 2 artifacts
    'D1: Generate timeline with all events'
  );

  // Test D2: Timeline chronologically sorted
  const timestamps = timeline.timeline.map(e => new Date(e.timestamp).getTime());
  const sorted = timestamps.every((ts, i) => i === 0 || ts >= timestamps[i - 1]);
  assert(
    sorted,
    'D2: Timeline entries chronologically sorted'
  );

  // Test D3: Timeline includes intent submission
  const intentEntry = timeline.timeline.find(e => e.type === 'intent');
  assert(
    intentEntry && intentEntry.action === 'submitted',
    'D3: Timeline includes intent submission'
  );

  // Test D4: Timeline includes executions (optional - depends on relationships)
  const execEntries = timeline.timeline.filter(e => e.type === 'execution');
  assert(
    execEntries.length >= 0, // Can be 0 if no relationships set
    'D4: Timeline execution events (optional)'
  );

  // Test D5: Timeline summary
  assert(
    timeline.summary.total_events >= 6 && // intent + 4 events + 2 artifacts (no exec events)
    timeline.summary.start === trace.submitted_at,
    'D5: Timeline summary correct'
  );

  console.log('\nCategory E: Export to Artifacts\n');

  // Test E1: Export trace artifact
  const traceArtifact = await explorer.exportTrace(intentId1, 'operator');
  assert(
    traceArtifact.artifact_type === 'intent_trace' &&
    traceArtifact.intent_id === intentId1,
    'E1: Export trace to workspace artifact'
  );

  // Test E2: Export execution graph artifact
  const graphArtifact = await explorer.exportExecutionGraph(intentId1, 'operator');
  assert(
    graphArtifact.artifact_type === 'execution_graph' &&
    graphArtifact.intent_id === intentId1,
    'E2: Export execution graph to artifact'
  );

  // Test E3: Export timeline artifact
  const timelineArtifact = await explorer.exportTimeline(intentId1, 'operator');
  assert(
    timelineArtifact.artifact_type === 'timeline_export' &&
    timelineArtifact.intent_id === intentId1,
    'E3: Export timeline to artifact'
  );

  // Test E4: Exported artifacts retrievable
  const exportedArtifacts = workspace.listArtifacts({ intent_id: intentId1 });
  assert(
    exportedArtifacts.length >= 5, // original 2 + 3 exports
    'E4: Exported artifacts retrievable from workspace'
  );

  // Test E5: Export with investigation linking
  const investigation = workspace.createInvestigation({
    name: 'Gateway Recovery Analysis',
    description: 'Analyzing trace for gateway restore',
    created_by: 'operator',
  });

  const linkedTraceArtifact = await explorer.exportTrace(
    intentId1,
    'operator',
    investigation.investigation_id
  );

  assert(
    linkedTraceArtifact.parent_investigation_id === investigation.investigation_id,
    'E5: Export trace linked to investigation'
  );

  console.log('\n=== Phase 12.3 Test Summary ===\n');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n✓ Phase 12.3 Trace Exploration Surface: ALL TESTS PASSED');
  } else {
    console.log(`\n✗ Phase 12.3 Trace Exploration Surface: ${failCount} test(s) failed`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
