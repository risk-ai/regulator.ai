/**
 * Chaos Experiment 1: Hung Execution
 * 
 * Simulate a handler that never returns to test watchdog timeout enforcement.
 * 
 * Expected Results:
 * - Watchdog detects expired deadline
 * - Execution terminated (state cleared)
 * - Timeout recorded in ledger
 * - Objective transitions to cooldown
 * - No execution state lingering
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { getFailurePolicy } = require('../../lib/core/failure-policy-schema');
const { requestReconciliation, finalizeReconciliation } = require('../../lib/core/reconciliation-gate');
const { startReconciliation } = require('../../lib/core/remediation-trigger-integrated');
const { startWatchdog, stopWatchdog, watchdogTick } = require('../../lib/core/execution-watchdog');

/**
 * Simulate hung execution (never completes)
 */
async function simulateHungExecution() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         CHAOS EXPERIMENT 1: Hung Execution                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create test objective
  const objectiveId = 'chaos-hung-execution';
  const policy = getFailurePolicy();

  // Clean slate
  try {
    const existing = stateGraph.getObjective(objectiveId);
    if (existing) {
      stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
      stateGraph.db.prepare('DELETE FROM managed_objective_history WHERE objective_id = ?').run(objectiveId);
    }
  } catch (err) {
    // Doesn't exist yet
  }

  const objective = {
    objective_id: objectiveId,
    objective_type: 'service_health',
    target_id: 'test-service',
    target_type: 'service',
    desired_state: { status: 'healthy' },
    status: 'monitoring',
    generation: 1,
    evaluation_interval_seconds: 30
  };

  stateGraph.createObjective(objective);
  console.log('✓ Test objective created:', objectiveId);

  // Step 1: Request reconciliation (should be admitted)
  const admission = requestReconciliation(objectiveId);
  console.log('\n━━━ Step 1: Request Reconciliation ━━━');
  console.log(`Admitted: ${admission.admitted}`);
  console.log(`Generation: ${admission.generation}`);
  
  if (!admission.admitted) {
    console.error('❌ FAIL: Admission denied unexpectedly');
    process.exit(1);
  }

  // Step 2: Start reconciliation (sets execution deadline)
  const startResult = await startReconciliation({
    objectiveId,
    generation: admission.generation,
    planId: 'test-plan-hung',
    timeoutSeconds: 5 // Short timeout for testing
  });

  console.log('\n━━━ Step 2: Start Reconciliation ━━━');
  console.log(`Started: ${startResult.started}`);
  console.log(`Execution Started At: ${startResult.execution_started_at}`);
  console.log(`Execution Deadline At: ${startResult.execution_deadline_at}`);

  const preHangObjective = stateGraph.getObjective(objectiveId);
  console.log(`Reconciliation Status: ${preHangObjective.reconciliation_status}`);
  console.log(`Execution Deadline: ${preHangObjective.execution_deadline_at}`);

  // Step 3: Simulate hung execution (do NOT call finalizeReconciliation)
  console.log('\n━━━ Step 3: Simulating Hung Execution ━━━');
  console.log('Execution started but will never complete...');
  console.log('Waiting for deadline to expire (5s)...');

  // Wait beyond deadline
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Step 4: Manually trigger watchdog tick (simulates background service)
  console.log('\n━━━ Step 4: Watchdog Tick (Manual Trigger) ━━━');
  const tickResult = await watchdogTick();
  console.log(`Timeouts detected: ${tickResult.timeouts_detected}`);
  console.log(`Timeouts applied: ${tickResult.timeouts_applied}`);

  // Step 5: Verify timeout applied
  console.log('\n━━━ Step 5: Verify Timeout Applied ━━━');
  const postTimeoutObjective = stateGraph.getObjective(objectiveId);
  
  console.log(`Reconciliation Status: ${postTimeoutObjective.reconciliation_status}`);
  console.log(`Consecutive Failures: ${postTimeoutObjective.consecutive_failures}`);
  console.log(`Execution Started At: ${postTimeoutObjective.execution_started_at || 'CLEARED'}`);
  console.log(`Execution Deadline At: ${postTimeoutObjective.execution_deadline_at || 'CLEARED'}`);
  console.log(`Last Terminal Reason: ${postTimeoutObjective.last_terminal_reason}`);

  // Step 6: Check ledger events
  console.log('\n━━━ Step 6: Check Ledger Events ━━━');
  const history = stateGraph.listObjectiveHistory(objectiveId, 20);
  const timeoutEvent = history.find(h => h.reason === 'objective.execution.timed_out');
  const cooldownEvent = history.find(h => h.reason === 'objective.reconciliation.cooldown_entered');

  console.log(`Timeout event found: ${!!timeoutEvent}`);
  console.log(`Cooldown event found: ${!!cooldownEvent}`);

  if (timeoutEvent) {
    console.log(`  Timeout event timestamp: ${timeoutEvent.event_timestamp}`);
    console.log(`  Timeout event metadata: ${JSON.stringify(timeoutEvent.metadata)}`);
  }

  // Validation
  console.log('\n━━━ VALIDATION ━━━');
  const validations = {
    'Watchdog detected timeout': tickResult.timeouts_detected > 0,
    'Watchdog applied timeout': tickResult.timeouts_applied > 0,
    'Objective entered cooldown': postTimeoutObjective.reconciliation_status === 'cooldown',
    'Consecutive failures incremented': postTimeoutObjective.consecutive_failures === 1,
    'Execution state cleared': !postTimeoutObjective.execution_started_at && !postTimeoutObjective.execution_deadline_at,
    'Last terminal reason is timeout': postTimeoutObjective.last_terminal_reason === 'timeout',
    'Timeout event recorded': !!timeoutEvent,
    'Cooldown event recorded': !!cooldownEvent
  };

  let allPassed = true;
  Object.entries(validations).forEach(([check, passed]) => {
    const symbol = passed ? '✅' : '❌';
    console.log(`${symbol} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('\n━━━ RESULT ━━━');
  if (allPassed) {
    console.log('✅ EXPERIMENT PASSED: Watchdog correctly handled hung execution\n');
  } else {
    console.log('❌ EXPERIMENT FAILED: Some validations did not pass\n');
    process.exit(1);
  }

  // Cleanup
  stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
  stateGraph.db.prepare('DELETE FROM managed_objective_history WHERE objective_id = ?').run(objectiveId);
}

// Run experiment
if (require.main === module) {
  simulateHungExecution().catch(err => {
    console.error('\n❌ Experiment error:', err);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { simulateHungExecution };
