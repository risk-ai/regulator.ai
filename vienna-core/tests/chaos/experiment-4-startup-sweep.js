/**
 * Chaos Experiment 4: Startup Sweep
 * 
 * Simulate persisted expired attempt that survives restart.
 * Test that startup sweep detects and cleans expired leases.
 * 
 * Expected Results:
 * - Startup sweep detects expired lease
 * - Timeout applied to expired attempt
 * - Objective transitioned appropriately (cooldown or degraded)
 * - No lingering execution state after sweep
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { startReconciliation } = require('../../lib/core/remediation-trigger-integrated');
const { startupSweep } = require('../../lib/core/execution-watchdog');

/**
 * Simulate startup sweep of expired attempt
 */
async function simulateStartupSweep() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       CHAOS EXPERIMENT 4: Startup Sweep                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Create test objective
  const objectiveId = 'chaos-startup-sweep';

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

  // Step 1: Start reconciliation with deadline in the past
  console.log('\n━━━ Step 1: Create Expired Execution Lease ━━━');
  console.log('Creating execution with deadline in the past to simulate restart scenario...');

  // Manually set execution state with expired deadline
  const pastDeadline = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago
  const pastStart = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago

  stateGraph.updateObjectiveStatus(objectiveId, 'reconciling', 'manual_expired_setup', {
    generation: 2,
    execution_started_at: pastStart,
    execution_deadline_at: pastDeadline,
    execution_attempt_id: 'chaos-startup-sweep-gen2',
    test_scenario: 'startup_sweep'
  });

  const preSweepObjective = stateGraph.getObjective(objectiveId);
  console.log(`Reconciliation Status: ${preSweepObjective.reconciliation_status}`);
  console.log(`Execution Started At: ${preSweepObjective.execution_started_at}`);
  console.log(`Execution Deadline At: ${preSweepObjective.execution_deadline_at}`);
  console.log(`Deadline expired: ${new Date(preSweepObjective.execution_deadline_at) < new Date() ? 'YES' : 'NO'}`);

  // Step 2: Run startup sweep
  console.log('\n━━━ Step 2: Run Startup Sweep ━━━');
  console.log('Simulating system startup with expired lease detection...');

  const sweepResult = await startupSweep();
  console.log(`Expired leases found: ${sweepResult.expired_found}`);
  console.log(`Timeouts applied: ${sweepResult.timeouts_applied}`);

  // Step 3: Verify expired lease cleaned
  console.log('\n━━━ Step 3: Verify Cleanup ━━━');
  const postSweepObjective = stateGraph.getObjective(objectiveId);

  console.log(`Reconciliation Status: ${postSweepObjective.reconciliation_status}`);
  console.log(`Consecutive Failures: ${postSweepObjective.consecutive_failures}`);
  console.log(`Execution Started At: ${postSweepObjective.execution_started_at || 'CLEARED'}`);
  console.log(`Execution Deadline At: ${postSweepObjective.execution_deadline_at || 'CLEARED'}`);
  console.log(`Last Terminal Reason: ${postSweepObjective.last_terminal_reason}`);

  // Step 4: Check ledger events
  console.log('\n━━━ Step 4: Check Ledger Events ━━━');
  const history = stateGraph.listObjectiveHistory(objectiveId, 20);
  const timeoutEvent = history.find(h => h.reason === 'objective.execution.timed_out');
  const cooldownEvent = history.find(h => h.reason === 'objective.reconciliation.cooldown_entered');

  console.log(`Timeout event found: ${!!timeoutEvent}`);
  console.log(`Cooldown event found: ${!!cooldownEvent}`);

  if (timeoutEvent) {
    console.log(`  Timeout metadata: ${JSON.stringify(timeoutEvent.metadata)}`);
  }

  // Validation
  console.log('\n━━━ VALIDATION ━━━');
  const validations = {
    'Startup sweep detected expired lease': sweepResult.expired_found > 0,
    'Startup sweep applied timeout': sweepResult.timeouts_applied > 0,
    'Objective transitioned from reconciling': postSweepObjective.reconciliation_status !== 'reconciling',
    'Objective in cooldown or degraded': ['cooldown', 'degraded'].includes(postSweepObjective.reconciliation_status),
    'Execution state cleared': !postSweepObjective.execution_started_at && !postSweepObjective.execution_deadline_at,
    'Consecutive failures incremented': postSweepObjective.consecutive_failures === 1,
    'Last terminal reason is timeout': postSweepObjective.last_terminal_reason === 'timeout',
    'Timeout event recorded': !!timeoutEvent,
    'Cooldown event recorded (if not degraded)': !!cooldownEvent || postSweepObjective.reconciliation_status === 'degraded'
  };

  let allPassed = true;
  Object.entries(validations).forEach(([check, passed]) => {
    const symbol = passed ? '✅' : '❌';
    console.log(`${symbol} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('\n━━━ RESULT ━━━');
  if (allPassed) {
    console.log('✅ EXPERIMENT PASSED: Startup sweep correctly cleaned expired lease\n');
  } else {
    console.log('❌ EXPERIMENT FAILED: Startup sweep did not clean expired lease\n');
    process.exit(1);
  }

  // Cleanup
  stateGraph.db.prepare('DELETE FROM managed_objectives WHERE objective_id = ?').run(objectiveId);
  stateGraph.db.prepare('DELETE FROM managed_objective_history WHERE objective_id = ?').run(objectiveId);
}

// Run experiment
if (require.main === module) {
  simulateStartupSweep().catch(err => {
    console.error('\n❌ Experiment error:', err);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { simulateStartupSweep };
