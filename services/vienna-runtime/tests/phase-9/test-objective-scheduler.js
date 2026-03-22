/**
 * Phase 9.6 — Objective Evaluation Loop Tests
 * 
 * Test coverage:
 * - Category A: Interval parsing (3 tests)
 * - Category B: Due check logic (5 tests)
 * - Category C: Skip logic (5 tests)
 * - Category D: Batch evaluation (4 tests)
 * - Category E: Cadence events (4 tests)
 * - Category F: Integration tests (3 tests)
 * 
 * Total: 24 tests
 */

const assert = require('assert');
const { getStateGraph } = require('../../lib/state/state-graph');
const {
  parseInterval,
  isObjectiveDue,
  shouldSkipObjective,
  getObjectivesDue,
  calculateNextDueTime
} = require('../../lib/core/objective-scheduler');
const {
  runEvaluationCycle,
  evaluateSingleObjective
} = require('../../lib/core/objective-coordinator');
const { createObjective } = require('../../lib/core/objective-schema');

// Test environment setup
process.env.VIENNA_ENV = 'test';

async function cleanup() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  // Clean up test objectives
  const db = stateGraph.db;
  db.prepare('DELETE FROM managed_objectives').run();
  db.prepare('DELETE FROM managed_objective_evaluations').run();
  db.prepare('DELETE FROM managed_objective_history').run();
  db.prepare('DELETE FROM execution_ledger_events').run();
  db.prepare('DELETE FROM execution_ledger_summary').run();
  db.prepare('DELETE FROM services').run();
}

// ============================================================================
// Category A: Interval Parsing (3 tests)
// ============================================================================

async function testIntervalParsingSeconds() {
  const result = parseInterval('30s');
  assert.strictEqual(result, 30 * 1000, 'Should parse seconds correctly');
  console.log('✓ Interval parsing: seconds');
}

async function testIntervalParsingMinutes() {
  const result = parseInterval('5m');
  assert.strictEqual(result, 5 * 60 * 1000, 'Should parse minutes correctly');
  console.log('✓ Interval parsing: minutes');
}

async function testIntervalParsingHours() {
  const result = parseInterval('2h');
  assert.strictEqual(result, 2 * 60 * 60 * 1000, 'Should parse hours correctly');
  console.log('✓ Interval parsing: hours');
}

// ============================================================================
// Category B: Due Check Logic (5 tests)
// ============================================================================

async function testObjectiveDueNeverEvaluated() {
  const objective = {
    objective_id: 'obj-test-1',
    evaluation_interval: '5m',
    last_evaluated_at: null
  };

  const result = isObjectiveDue(objective);
  assert.strictEqual(result, true, 'Should be due if never evaluated');
  console.log('✓ Due check: never evaluated');
}

async function testObjectiveDueIntervalPassed() {
  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();

  const objective = {
    objective_id: 'obj-test-2',
    evaluation_interval: '5m',
    last_evaluated_at: tenMinutesAgo
  };

  const result = isObjectiveDue(objective, now);
  assert.strictEqual(result, true, 'Should be due if interval passed');
  console.log('✓ Due check: interval passed');
}

async function testObjectiveNotDueIntervalNotPassed() {
  const now = Date.now();
  const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();

  const objective = {
    objective_id: 'obj-test-3',
    evaluation_interval: '5m',
    last_evaluated_at: twoMinutesAgo
  };

  const result = isObjectiveDue(objective, now);
  assert.strictEqual(result, false, 'Should not be due if interval not passed');
  console.log('✓ Due check: interval not passed');
}

async function testObjectiveNotDueNoInterval() {
  const objective = {
    objective_id: 'obj-test-4',
    evaluation_interval: null,
    last_evaluated_at: null
  };

  const result = isObjectiveDue(objective);
  assert.strictEqual(result, false, 'Should not be due if no interval');
  console.log('✓ Due check: no interval');
}

async function testCalculateNextDueTime() {
  const now = Date.now();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();

  const objective = {
    objective_id: 'obj-test-5',
    evaluation_interval: '10m',
    last_evaluated_at: fiveMinutesAgo
  };

  const nextDue = calculateNextDueTime(objective, now);
  const nextDueMs = new Date(nextDue).getTime();
  const expectedMs = new Date(fiveMinutesAgo).getTime() + 10 * 60 * 1000;

  assert.strictEqual(nextDueMs, expectedMs, 'Should calculate correct next due time');
  console.log('✓ Due check: calculate next due time');
}

// ============================================================================
// Category C: Skip Logic (5 tests)
// ============================================================================

async function testSkipDisabledObjective() {
  const objective = {
    objective_id: 'obj-test-6',
    status: 'suspended'
  };

  const result = shouldSkipObjective(objective);
  assert.strictEqual(result.skip, true, 'Should skip disabled');
  assert.strictEqual(result.reason, 'suspended', 'Should provide reason');
  console.log('✓ Skip logic: disabled');
}

async function testSkipArchivedObjective() {
  const objective = {
    objective_id: 'obj-test-7',
    status: 'archived'
  };

  const result = shouldSkipObjective(objective);
  assert.strictEqual(result.skip, true, 'Should skip archived');
  assert.strictEqual(result.reason, 'archived', 'Should provide reason');
  console.log('✓ Skip logic: archived');
}

async function testSkipSuspendedObjective() {
  const objective = {
    objective_id: 'obj-test-8',
    status: 'suspended'
  };

  const result = shouldSkipObjective(objective);
  assert.strictEqual(result.skip, true, 'Should skip suspended');
  assert.strictEqual(result.reason, 'suspended', 'Should provide reason');
  console.log('✓ Skip logic: suspended');
}

async function testSkipRemediatingObjective() {
  const remediatingStates = [
    'remediation_triggered',
    'remediation_running',
    'verification'
  ];

  for (const status of remediatingStates) {
    const objective = {
      objective_id: 'obj-test-9',
      status
    };

    const result = shouldSkipObjective(objective);
    assert.strictEqual(result.skip, true, `Should skip ${status}`);
    assert.strictEqual(result.reason, 'active_remediation', 'Should provide reason');
  }

  console.log('✓ Skip logic: active remediation');
}

async function testNoSkipHealthyObjective() {
  const objective = {
    objective_id: 'obj-test-10',
    status: 'healthy'
  };

  const result = shouldSkipObjective(objective);
  assert.strictEqual(result.skip, false, 'Should not skip healthy');
  assert.strictEqual(result.reason, null, 'Should not provide reason');
  console.log('✓ Skip logic: healthy objective allowed');
}

// ============================================================================
// Category D: Batch Evaluation (4 tests)
// ============================================================================

async function testGetObjectivesDueEmpty() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const result = await getObjectivesDue();
  assert.strictEqual(result.length, 0, 'Should return empty array when no objectives');
  console.log('✓ Batch evaluation: empty result');
}

async function testGetObjectivesDueSingleObjective() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create objective
  const objective = createObjective({
    objective_id: 'obj-batch-1',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    remediation_plan: 'plan-test-1',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const result = await getObjectivesDue();
  assert.strictEqual(result.length, 1, 'Should return one objective');
  assert.strictEqual(result[0].objective_id, 'obj-batch-1', 'Should return correct objective');
  console.log('✓ Batch evaluation: single objective');
}

async function testGetObjectivesDueFiltersDisabled() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create enabled objective
  const obj1 = createObjective({
    objective_id: 'obj-batch-2',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });
  stateGraph.createObjective(obj1);

  // Create disabled objective
  const obj2 = createObjective({
    objective_id: 'obj-batch-3',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service-2',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });
  stateGraph.createObjective(obj2);
  await stateGraph.updateObjectiveStatus('obj-batch-3', 'suspended', 'test', {});

  const result = await getObjectivesDue();
  assert.strictEqual(result.length, 1, 'Should filter out disabled');
  assert.strictEqual(result[0].objective_id, 'obj-batch-2', 'Should return only enabled');
  console.log('✓ Batch evaluation: filters disabled');
}

async function testGetObjectivesDueRespectsInterval() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const now = Date.now();
  const recentEvaluation = new Date(now - 2 * 60 * 1000).toISOString(); // 2 minutes ago

  // Create objective with recent evaluation
  const objective = createObjective({
    objective_id: 'obj-batch-4',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  // Manually update last_evaluated_at
  const db = stateGraph.db;
  db.prepare('UPDATE managed_objectives SET last_evaluated_at = ? WHERE objective_id = ?')
    .run(recentEvaluation, 'obj-batch-4');

  const result = await getObjectivesDue({ currentTime: now });
  assert.strictEqual(result.length, 0, 'Should respect interval and not return recently evaluated objective');
  console.log('✓ Batch evaluation: respects interval');
}

// ============================================================================
// Category E: Cadence Events (4 tests)
// ============================================================================

async function testEmitCadenceEventDue() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objective = createObjective({
    objective_id: 'obj-cadence-1',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const { emitCadenceEvent } = require('../../lib/core/objective-coordinator');
  await emitCadenceEvent('objective_evaluation_due', objective, {
    last_evaluated_at: null,
    evaluation_interval: '5m'
  });

  // Check ledger event was created
  const db = stateGraph.db;
  const events = db.prepare('SELECT * FROM execution_ledger_events WHERE event_type = ?')
    .all('objective_evaluation_due');

  assert.strictEqual(events.length, 1, 'Should create cadence event');
  assert.strictEqual(events[0].execution_id, 'obj-cadence-1', 'Should use objective_id as execution_id');
  console.log('✓ Cadence events: due event');
}

async function testEmitCadenceEventStarted() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objective = createObjective({
    objective_id: 'obj-cadence-2',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const { emitCadenceEvent } = require('../../lib/core/objective-coordinator');
  await emitCadenceEvent('objective_evaluation_started', objective);

  const db = stateGraph.db;
  const events = db.prepare('SELECT * FROM execution_ledger_events WHERE event_type = ?')
    .all('objective_evaluation_started');

  assert.strictEqual(events.length, 1, 'Should create started event');
  console.log('✓ Cadence events: started event');
}

async function testEmitCadenceEventSkipped() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objective = createObjective({
    objective_id: 'obj-cadence-3',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const { emitCadenceEvent } = require('../../lib/core/objective-coordinator');
  await emitCadenceEvent('objective_evaluation_skipped', objective, { reason: 'disabled' });

  const db = stateGraph.db;
  const events = db.prepare('SELECT * FROM execution_ledger_events WHERE event_type = ?')
    .all('objective_evaluation_skipped');

  assert.strictEqual(events.length, 1, 'Should create skipped event');
  const metadata = JSON.parse(events[0].payload_json);
  assert.strictEqual(metadata.reason, 'disabled', 'Should include skip reason');
  console.log('✓ Cadence events: skipped event');
}

async function testEmitCadenceEventCompleted() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objective = createObjective({
    objective_id: 'obj-cadence-4',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const { emitCadenceEvent } = require('../../lib/core/objective-coordinator');
  await emitCadenceEvent('objective_evaluation_completed', objective, {
    action: 'remain_healthy',
    satisfied: true
  });

  const db = stateGraph.db;
  const events = db.prepare('SELECT * FROM execution_ledger_events WHERE event_type = ?')
    .all('objective_evaluation_completed');

  assert.strictEqual(events.length, 1, 'Should create completed event');
  const metadata = JSON.parse(events[0].payload_json);
  assert.strictEqual(metadata.action, 'remain_healthy', 'Should include action');
  assert.strictEqual(metadata.satisfied, true, 'Should include satisfaction status');
  console.log('✓ Cadence events: completed event');
}

// ============================================================================
// Category F: Integration Tests (3 tests)
// ============================================================================

async function testRunEvaluationCycleEmpty() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const result = await runEvaluationCycle();
  assert.strictEqual(result.status, 'completed', 'Should complete successfully');
  assert.strictEqual(result.objectives_evaluated, 0, 'Should evaluate 0 objectives');
  assert.strictEqual(result.results.length, 0, 'Should return empty results');
  console.log('✓ Integration: empty evaluation cycle');
}

async function testRunEvaluationCycleSingleObjective() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create service in State Graph
  stateGraph.createService({
    service_id: 'test-service-integration',
    service_name: 'Test Service Integration',
    service_type: 'daemon',
    status: 'running',
    health: 'healthy'
  });

  // Create objective
  const objective = createObjective({
    objective_id: 'obj-integration-1',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service-integration',
    desired_state: { service_active: true, service_healthy: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });

  stateGraph.createObjective(objective);

  const result = await runEvaluationCycle();
  assert.strictEqual(result.status, 'completed', 'Should complete successfully');
  assert.strictEqual(result.objectives_evaluated, 1, 'Should evaluate 1 objective');
  assert.strictEqual(result.results.length, 1, 'Should return 1 result');
  assert.strictEqual(result.results[0].objective_id, 'obj-integration-1', 'Should evaluate correct objective');
  console.log('✓ Integration: single objective evaluation cycle');
}

async function testRunEvaluationCycleSkipsDisabled() {
  await cleanup();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create enabled objective
  const obj1 = createObjective({
    objective_id: 'obj-integration-2',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });
  stateGraph.createObjective(obj1);

  // Create disabled objective
  const obj2 = createObjective({
    objective_id: 'obj-integration-3',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service-2',
    desired_state: { service_active: true }, remediation_plan: 'plan-test',
    evaluation_interval: '5m',
    verification_strength: 'service_health'
  });
  stateGraph.createObjective(obj2);
  await stateGraph.updateObjectiveStatus('obj-integration-3', 'suspended', 'test', {});

  const result = await runEvaluationCycle();
  assert.strictEqual(result.objectives_evaluated, 1, 'Should evaluate only enabled objective');
  console.log('✓ Integration: skips disabled objectives in cycle');
}

// ============================================================================
// Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n=== Phase 9.6 — Objective Evaluation Loop Tests ===\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    // Category A: Interval Parsing
    testIntervalParsingSeconds,
    testIntervalParsingMinutes,
    testIntervalParsingHours,

    // Category B: Due Check Logic
    testObjectiveDueNeverEvaluated,
    testObjectiveDueIntervalPassed,
    testObjectiveNotDueIntervalNotPassed,
    testObjectiveNotDueNoInterval,
    testCalculateNextDueTime,

    // Category C: Skip Logic
    testSkipDisabledObjective,
    testSkipArchivedObjective,
    testSkipSuspendedObjective,
    testSkipRemediatingObjective,
    testNoSkipHealthyObjective,

    // Category D: Batch Evaluation
    testGetObjectivesDueEmpty,
    testGetObjectivesDueSingleObjective,
    testGetObjectivesDueFiltersDisabled,
    testGetObjectivesDueRespectsInterval,

    // Category E: Cadence Events
    testEmitCadenceEventDue,
    testEmitCadenceEventStarted,
    testEmitCadenceEventSkipped,
    testEmitCadenceEventCompleted,

    // Category F: Integration Tests
    testRunEvaluationCycleEmpty,
    testRunEvaluationCycleSingleObjective,
    testRunEvaluationCycleSkipsDisabled
  ];

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`✗ ${test.name} failed:`, error.message);
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
