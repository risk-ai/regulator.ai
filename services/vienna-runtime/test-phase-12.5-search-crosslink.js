/**
 * Phase 12.5 — Search and Cross-Linking Tests
 * 
 * Validates search across all investigation entities and cross-linking discovery.
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('./lib/state/state-graph');
const { WorkspaceManager } = require('./lib/workspace/workspace-manager');
const { InvestigationManager } = require('./lib/workspace/investigation-manager');
const { WorkspaceSearch } = require('./lib/workspace/workspace-search');
const { IntentTracer } = require('./lib/core/intent-tracing');

async function main() {
  console.log('Phase 12.5 Search and Cross-Linking Tests\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const workspace = new WorkspaceManager(stateGraph);
  const investigations = new InvestigationManager(stateGraph, workspace);
  const search = new WorkspaceSearch(stateGraph, workspace);
  const tracer = new IntentTracer(stateGraph);

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

  console.log('Setup: Create test entities\n');

  // Create objective
  const objId = 'obj-search-test-001';
  stateGraph.createObjective({
    objective_id: objId,
    name: 'Maintain API availability',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'api-gateway',
    desired_state: { status: 'healthy' },
    verification_strength: 'service_health',
    evaluation_interval: '300s',
    remediation_plan: 'restart_service',
    status: 'declared',
    created_by: 'system',
  });

  // Create investigations
  const inv1 = investigations.openInvestigation({
    name: 'API Gateway Failure Analysis',
    description: 'Investigating repeated timeout failures',
    objective_id: objId,
    created_by: 'operator',
  });

  const inv2 = investigations.openInvestigation({
    name: 'DNS Resolution Issues',
    description: 'Investigating DNS timeouts',
    objective_id: objId,
    created_by: 'operator',
  });

  // Create intent traces
  const intent1 = 'intent-search-test-001';
  stateGraph.createIntentTrace(intent1, 'restore_objective', { type: 'operator', id: 'max' });
  await tracer.recordEvent(intent1, 'intent.accepted', {});

  const intent2 = 'intent-search-test-002';
  stateGraph.createIntentTrace(intent2, 'investigate_objective', { type: 'agent', id: 'cast' });
  await tracer.recordEvent(intent2, 'intent.denied', { reason: 'Safe mode active' });

  // Create artifacts
  workspace.storeArtifact({
    artifact_type: 'intent_trace',
    content: JSON.stringify({ intent_id: intent1 }),
    intent_id: intent1,
    investigation_id: inv1.investigation_id,
    objective_id: objId,
    created_by: 'system',
  });

  workspace.storeArtifact({
    artifact_type: 'investigation_note',
    content: 'Initial findings: API timeouts correlate with high CPU',
    investigation_id: inv1.investigation_id,
    objective_id: objId,
    created_by: 'operator',
  });

  workspace.storeArtifact({
    artifact_type: 'intent_trace',
    content: JSON.stringify({ intent_id: intent2 }),
    intent_id: intent2,
    investigation_id: inv2.investigation_id,
    objective_id: objId,
    created_by: 'system',
  });

  console.log('Category A: Search Investigations\n');

  // Test A1: Search all investigations
  const allInv = search.searchInvestigations({});
  assert(allInv.length >= 2, 'A1: Search all investigations');

  // Test A2: Filter by objective
  const objInv = search.searchInvestigations({ objective_id: objId });
  assert(
    objInv.length === 2 && objInv.every(i => i.objective_id === objId),
    'A2: Filter investigations by objective'
  );

  // Test A3: Text search in name
  const textSearch = search.searchInvestigations({ query: 'API' });
  assert(
    textSearch.length >= 1 && textSearch[0].name.includes('API'),
    'A3: Text search in investigation name'
  );

  // Test A4: Filter by creator
  const creatorInv = search.searchInvestigations({ created_by: 'operator' });
  assert(
    creatorInv.length >= 2,
    'A4: Filter investigations by creator'
  );

  console.log('\nCategory B: Search Artifacts\n');

  // Test B1: Search by artifact type
  const traceArts = search.searchArtifacts({ artifact_type: 'intent_trace' });
  assert(
    traceArts.length >= 2,
    'B1: Search artifacts by type'
  );

  // Test B2: Filter by investigation
  const invArts = search.searchArtifacts({ investigation_id: inv1.investigation_id });
  assert(
    invArts.length >= 2,
    'B2: Search artifacts by investigation'
  );

  // Test B3: Filter by objective
  const objArts = search.searchArtifacts({ objective_id: objId });
  assert(
    objArts.length >= 3,
    'B3: Search artifacts by objective'
  );

  // Test B4: Filter by intent
  const intentArts = search.searchArtifacts({ intent_id: intent1 });
  assert(
    intentArts.length >= 1,
    'B4: Search artifacts by intent'
  );

  console.log('\nCategory C: Search Traces\n');

  // Test C1: Search all traces
  const allTraces = search.searchTraces({});
  assert(
    allTraces.length >= 2,
    'C1: Search all intent traces'
  );

  // Test C2: Filter by intent type
  const restoreTraces = search.searchTraces({ intent_type: 'restore_objective' });
  assert(
    restoreTraces.length >= 1,
    'C2: Filter traces by intent type'
  );

  // Test C3: Filter by source type
  const opTraces = search.searchTraces({ source_type: 'operator' });
  assert(
    opTraces.length >= 1 && opTraces[0].source.includes('max'),
    'C3: Filter traces by source type'
  );

  console.log('\nCategory D: Search Objectives\n');

  // Test D1: Search objectives
  const objs = search.searchObjectives({});
  assert(
    objs.length >= 1 && objs[0].objective_id === objId,
    'D1: Search objectives'
  );

  // Test D2: Filter by target
  const apiObjs = search.searchObjectives({ target_id: 'api-gateway' });
  assert(
    apiObjs.length >= 1 && apiObjs[0].target_id === 'api-gateway',
    'D2: Filter objectives by target'
  );

  console.log('\nCategory E: Investigation Graph\n');

  // Test E1: Get investigation graph
  const graph = search.getInvestigationGraph(inv1.investigation_id);
  assert(
    graph.investigation.investigation_id === inv1.investigation_id &&
    graph.artifacts.length > 0,
    'E1: Get investigation graph'
  );

  // Test E2: Graph includes connected objectives
  assert(
    graph.connected_objectives.length > 0,
    'E2: Investigation graph includes connected objectives'
  );

  // Test E3: Graph includes relationships
  assert(
    graph.relationships.length > 0,
    'E3: Investigation graph includes relationships'
  );

  console.log('\nCategory F: Related Entity Discovery\n');

  // Test F1: Get objective investigations
  const objInvs = search.getObjectiveInvestigations(objId);
  assert(
    objInvs.length === 2,
    'F1: Get investigations for objective'
  );

  // Test F2: Get intent investigations
  const intentInvs = search.getIntentInvestigations(intent1);
  assert(
    intentInvs.length >= 1 && intentInvs[0].investigation_id === inv1.investigation_id,
    'F2: Get investigations for intent'
  );

  // Test F3: Find related entities (objective)
  const objRelated = search.findRelated(objId, 'objective', 2);
  assert(
    objRelated.directly_related.length > 0,
    'F3: Find entities related to objective'
  );

  // Test F4: Find related entities (investigation)
  const invRelated = search.findRelated(inv1.investigation_id, 'investigation', 2);
  assert(
    invRelated.directly_related.length > 0,
    'F4: Find entities related to investigation'
  );

  console.log('\nCategory G: Activity Timeline\n');

  // Test G1: Get activity timeline
  const timeline = search.getActivityTimeline({});
  assert(
    timeline.length > 0 && timeline.every(a => a.timestamp),
    'G1: Get activity timeline'
  );

  // Test G2: Timeline chronologically sorted
  const times = timeline.map(a => new Date(a.timestamp).getTime());
  const sorted = times.every((t, i) => i === 0 || t >= times[i - 1]);
  assert(
    sorted,
    'G2: Timeline chronologically sorted'
  );

  // Test G3: Timeline includes investigations
  const invTimeline = timeline.filter(a => a.type === 'investigation');
  assert(
    invTimeline.length >= 2,
    'G3: Timeline includes investigations'
  );

  // Test G4: Filter timeline by objective
  const objTimeline = search.getActivityTimeline({ objective_id: objId });
  assert(
    objTimeline.length > 0 && objTimeline.every(a => a.entity_id || a.artifact_id),
    'G4: Filter timeline by objective'
  );

  console.log('\n=== Phase 12.5 Test Summary ===\n');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n✓ Phase 12.5 Search and Cross-Linking: ALL TESTS PASSED');
  } else {
    console.log(`\n✗ Phase 12.5 Search and Cross-Linking: ${failCount} test(s) failed`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
