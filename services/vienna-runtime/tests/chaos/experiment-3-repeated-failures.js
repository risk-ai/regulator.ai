/**
 * Chaos Experiment 3: Repeated Failures
 * 
 * Force consecutive failures to test circuit breaker behavior.
 * 
 * Expected Results:
 * - Cooldown progression (increasing duration)
 * - Eventually transitions to degraded state
 * - Cooldown prevents immediate retry
 * - Degraded state requires manual intervention
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { getFailurePolicy } = require('../../lib/core/failure-policy-schema');
const { requestReconciliation } = require('../../lib/core/reconciliation-gate');
const { startReconciliation } = require('../../lib/core/remediation-trigger-integrated');
const { watchdogTick } = require('../../lib/core/execution-watchdog');

/**
 * Simulate repeated failures
 */
async function simulateRepeatedFailures() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       CHAOS EXPERIMENT 3: Repeated Failures                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const policy = getFailurePolicy();
  console.log(`Failure Policy: max_consecutive_failures = ${policy.max_consecutive_failures}`);
  console.log(`Cooldown base duration: ${policy.cooldown_base_duration_seconds}s\n`);

  // Create test objective
  const objectiveId = 'chaos-repeated-failures';

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

  // Track cooldown durations
  const cooldownDurations = [];

  // Simulate failures until degraded
  let attemptNum = 0;
  let currentObjective = stateGraph.getObjective(objectiveId);

  while (currentObjective.reconciliation_status !== 'degraded' && attemptNum < 10) {
    attemptNum++;
    console.log(`\n━━━ Attempt ${attemptNum} ━━━`);

    // Request reconciliation
    const admission = requestReconciliation(objectiveId);
    console.log(`Admission: ${admission.admitted ? 'ADMITTED' : 'DENIED'}`);
    
    if (!admission.admitted) {
      console.log(`Skip reason: ${admission.skip_reason}`);
      
      if (admission.skip_reason === 'cooldown_active') {
        currentObjective = stateGraph.getObjective(objectiveId);
        const cooldownRemaining = Math.floor((new Date(currentObjective.cooldown_until) - new Date()) / 1000);
        console.log(`Cooldown active, remaining: ${cooldownRemaining}s`);
        
        // Fast-forward past cooldown
        console.log('Fast-forwarding past cooldown...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Minimal wait
        
        // Manually clear cooldown for testing (simulate time passage)
        stateGraph.updateObjectiveStatus(objectiveId, 'idle', 'cooldown_expired', { attemptNum });
        continue;
      }
      
      if (admission.skip_reason === 'degraded') {
        console.log('✓ Objective reached degraded state');
        break;
      }
    }

    // Start reconciliation with short timeout
    const startResult = await startReconciliation({
      objectiveId,
      generation: admission.generation,
      planId: `test-plan-failure-${attemptNum}`,
      timeoutSeconds: 1 // Very short for fast testing
    });

    console.log(`Started at: ${startResult.execution_started_at}`);
    console.log(`Deadline at: ${startResult.execution_deadline_at}`);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Trigger watchdog
    const tickResult = await watchdogTick();
    console.log(`Timeouts applied: ${tickResult.timeouts_applied}`);

    // Check state after timeout
    currentObjective = stateGraph.getObjective(objectiveId);
    console.log(`Status after timeout: ${currentObjective.reconciliation_status}`);
    console.log(`Consecutive failures: ${currentObjective.consecutive_failures}`);

    if (currentObjective.reconciliation_status === 'cooldown') {
      const cooldownUntil = new Date(currentObjective.cooldown_until);
      const cooldownDuration = Math.floor((cooldownUntil - new Date()) / 1000);
      cooldownDurations.push(cooldownDuration);
      console.log(`Cooldown duration: ${cooldownDuration}s`);
    }
  }

  // Final state check
  console.log('\n━━━ Final State ━━━');
  const finalObjective = stateGraph.getObjective(objectiveId);
  console.log(`Reconciliation Status: ${finalObjective.reconciliation_status}`);
  console.log(`Consecutive Failures: ${finalObjective.consecutive_failures}`);
  console.log(`Total attempts: ${attemptNum}`);
  console.log(`Cooldown progression: ${cooldownDurations.join('s → ')}s`);

  // Check ledger events
  const history = stateGraph.listObjectiveHistory(objectiveId, 100);
  const timeoutEvents = history.filter(h => h.reason === 'objective.execution.timed_out');
  const cooldownEvents = history.filter(h => h.reason === 'objective.reconciliation.cooldown_entered');
  const degradedEvent = history.find(h => h.reason === 'objective.reconciliation.degraded');

  console.log(`\nTimeout events: ${timeoutEvents.length}`);
  console.log(`Cooldown events: ${cooldownEvents.length}`);
  console.log(`Degraded event: ${!!degradedEvent}`);

  // Validation
  console.log('\n━━━ VALIDATION ━━━');
  const validations = {
    'Multiple failures recorded': timeoutEvents.length >= 3,
    'Cooldown progression observed': cooldownDurations.length >= 2,
    'Cooldown durations increase': cooldownDurations.length < 2 || cooldownDurations[1] >= cooldownDurations[0],
    'Eventually transitioned to degraded': finalObjective.reconciliation_status === 'degraded',
    'Consecutive failures equals max': finalObjective.consecutive_failures === policy.max_consecutive_failures,
    'Degraded event recorded': !!degradedEvent,
    'Attempts bounded': attemptNum <= policy.max_consecutive_failures + 2 // Allow some cooldown retries
  };

  let allPassed = true;
  Object.entries(validations).forEach(([check, passed]) => {
    const symbol = passed ? '✅' : '❌';
    console.log(`${symbol} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('\n━━━ RESULT ━━━');
  if (allPassed) {
    console.log('✅ EXPERIMENT PASSED: Circuit breaker correctly escalated to degraded\n');
  } else {
    console.log('❌ EXPERIMENT FAILED: Circuit breaker did not behave as expected\n');
    process.exit(1);
  }

  // Cleanup
  stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
  stateGraph.db.prepare('DELETE FROM managed_objective_history WHERE objective_id = ?').run(objectiveId);
}

// Run experiment
if (require.main === module) {
  simulateRepeatedFailures().catch(err => {
    console.error('\n❌ Experiment error:', err);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { simulateRepeatedFailures };
