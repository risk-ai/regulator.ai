/**
 * Chaos Experiment 2: Delayed Completion
 * 
 * Simulate a handler that completes AFTER timeout to test stale-result protection.
 * 
 * Expected Results:
 * - Timeout recorded before late completion
 * - Late completion attempt ignored
 * - No state mutation from stale completion
 * - Objective remains in cooldown (or state at timeout)
 * - Late completion does not overwrite timeout outcome
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { requestReconciliation, finalizeReconciliation } = require('../../lib/core/reconciliation-gate');
const { startReconciliation } = require('../../lib/core/remediation-trigger-integrated');
const { watchdogTick } = require('../../lib/core/execution-watchdog');

/**
 * Simulate delayed completion (completes after timeout)
 */
async function simulateDelayedCompletion() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       CHAOS EXPERIMENT 2: Delayed Completion                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create test objective
  const objectiveId = 'chaos-delayed-completion';

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

  // Step 1: Request and start reconciliation
  const admission = requestReconciliation(objectiveId);
  console.log('\n━━━ Step 1: Request Reconciliation ━━━');
  console.log(`Admitted: ${admission.admitted}, Generation: ${admission.generation}`);

  const startResult = await startReconciliation({
    objectiveId,
    generation: admission.generation,
    planId: 'test-plan-delayed',
    timeoutSeconds: 3 // Very short timeout
  });

  console.log('\n━━━ Step 2: Start Reconciliation ━━━');
  console.log(`Execution Deadline: ${startResult.execution_deadline_at}`);

  const preTimeoutObjective = stateGraph.getObjective(objectiveId);
  const executionGeneration = preTimeoutObjective.generation;
  console.log(`Generation: ${executionGeneration}`);

  // Step 3: Wait for timeout
  console.log('\n━━━ Step 3: Wait for Timeout (3s) ━━━');
  console.log('Waiting for deadline to expire...');
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Step 4: Trigger watchdog (apply timeout)
  console.log('\n━━━ Step 4: Watchdog Applies Timeout ━━━');
  const tickResult = await watchdogTick();
  console.log(`Timeouts applied: ${tickResult.timeouts_applied}`);

  const postTimeoutObjective = stateGraph.getObjective(objectiveId);
  console.log(`Reconciliation Status: ${postTimeoutObjective.reconciliation_status}`);
  console.log(`Consecutive Failures: ${postTimeoutObjective.consecutive_failures}`);
  console.log(`Generation: ${postTimeoutObjective.generation}`);

  // Step 5: Attempt late completion (stale result)
  console.log('\n━━━ Step 5: Attempt Late Completion (Stale Result) ━━━');
  console.log('Simulating handler that completed after timeout...');

  // Try to finalize with original generation (now stale)
  const finalizeResult = await finalizeReconciliation({
    objectiveId,
    generation: executionGeneration, // Stale generation
    outcome: 'recovered',
    verificationSuccess: true,
    verificationTimestamp: new Date().toISOString()
  });

  console.log(`Finalize accepted: ${finalizeResult.accepted}`);
  console.log(`Finalize reason: ${finalizeResult.reason || 'N/A'}`);

  // Step 6: Verify state unchanged by stale completion
  console.log('\n━━━ Step 6: Verify State Unchanged ━━━');
  const postStaleObjective = stateGraph.getObjective(objectiveId);

  console.log(`Reconciliation Status: ${postStaleObjective.reconciliation_status}`);
  console.log(`Consecutive Failures: ${postStaleObjective.consecutive_failures}`);
  console.log(`Last Terminal Reason: ${postStaleObjective.last_terminal_reason}`);
  console.log(`Generation: ${postStaleObjective.generation}`);

  // Step 7: Check ledger (should show timeout, not recovery)
  console.log('\n━━━ Step 7: Check Ledger Events ━━━');
  const history = stateGraph.listObjectiveHistory(objectiveId, 20);
  const timeoutEvent = history.find(h => h.reason === 'objective.execution.timed_out');
  const recoveredEvent = history.find(h => h.reason === 'objective.reconciliation.recovered' && h.event_timestamp > timeoutEvent?.event_timestamp);

  console.log(`Timeout event found: ${!!timeoutEvent}`);
  console.log(`Recovery event (post-timeout) found: ${!!recoveredEvent}`);

  // Validation
  console.log('\n━━━ VALIDATION ━━━');
  const validations = {
    'Timeout applied before late completion': !!timeoutEvent,
    'Late completion rejected': !finalizeResult.accepted || finalizeResult.reason === 'stale_generation',
    'State unchanged by stale completion': postStaleObjective.reconciliation_status === 'cooldown',
    'No recovery event post-timeout': !recoveredEvent,
    'Consecutive failures still incremented': postStaleObjective.consecutive_failures === 1,
    'Last terminal reason is timeout': postStaleObjective.last_terminal_reason === 'timeout',
    'Generation unchanged by stale completion': postStaleObjective.generation === executionGeneration
  };

  let allPassed = true;
  Object.entries(validations).forEach(([check, passed]) => {
    const symbol = passed ? '✅' : '❌';
    console.log(`${symbol} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('\n━━━ RESULT ━━━');
  if (allPassed) {
    console.log('✅ EXPERIMENT PASSED: Stale completion correctly rejected\n');
  } else {
    console.log('❌ EXPERIMENT FAILED: Stale completion mutated state\n');
    process.exit(1);
  }

  // Cleanup
  stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
  stateGraph.db.prepare('DELETE FROM managed_objective_history WHERE objective_id = ?').run(objectiveId);
}

// Run experiment
if (require.main === module) {
  simulateDelayedCompletion().catch(err => {
    console.error('\n❌ Experiment error:', err);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { simulateDelayedCompletion };
