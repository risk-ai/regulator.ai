/**
 * Circuit Breaker View
 * 
 * Display breaker state for objectives (failure tracking, cooldown, degradation).
 */

const { getStateGraph } = require('../../lib/state/state-graph');
const { getFailurePolicy } = require('../../lib/core/failure-policy-schema');

/**
 * Calculate time remaining in seconds
 */
function timeRemaining(timestamp) {
  if (!timestamp) return null;
  const remaining = Math.floor((new Date(timestamp) - new Date()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * Format duration
 */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds === 0) return 'READY';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
}

/**
 * Render circuit breaker view table
 */
async function renderCircuitBreakerView() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objectives = stateGraph.listObjectives();
  const policy = getFailurePolicy();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          CIRCUIT BREAKER VIEW                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  if (objectives.length === 0) {
    console.log('No objectives registered.\n');
    return;
  }

  // Filter to objectives with failure tracking or in cooldown/degraded
  const breakerObjectives = objectives
    .filter(obj => 
      obj.consecutive_failures > 0 || 
      obj.reconciliation_status === 'cooldown' || 
      obj.reconciliation_status === 'degraded'
    )
    .map(obj => ({
      objective_id: obj.objective_id,
      consecutive_failures: obj.consecutive_failures,
      attempts_remaining: Math.max(0, policy.max_consecutive_failures - obj.consecutive_failures),
      cooldown_remaining: timeRemaining(obj.cooldown_until),
      degraded_state: obj.reconciliation_status === 'degraded',
      last_failure_reason: obj.last_terminal_reason || '-'
    }));

  if (breakerObjectives.length === 0) {
    console.log('No objectives in failure state (all healthy or monitoring).\n');
    return;
  }

  // Table header
  console.log('┌─────────────────────┬──────────┬───────────┬──────────┬──────────┬─────────────────────┐');
  console.log('│ OBJECTIVE           │ FAILURES │ REMAINING │ COOLDOWN │ DEGRADED │ LAST_FAILURE        │');
  console.log('├─────────────────────┼──────────┼───────────┼──────────┼──────────┼─────────────────────┤');

  // Table rows
  breakerObjectives.forEach(obj => {
    const objective_id = obj.objective_id.padEnd(19).substring(0, 19);
    const failures = obj.consecutive_failures.toString().padStart(8);
    const remaining = obj.attempts_remaining.toString().padStart(9);
    const cooldown = formatDuration(obj.cooldown_remaining).padEnd(8).substring(0, 8);
    const degraded = obj.degraded_state ? 'YES' : 'NO';
    const reason = obj.last_failure_reason.padEnd(19).substring(0, 19);
    
    console.log(`│ ${objective_id} │ ${failures} │ ${remaining} │ ${cooldown} │ ${degraded.padEnd(8)} │ ${reason} │`);
  });

  console.log('└─────────────────────┴──────────┴───────────┴──────────┴──────────┴─────────────────────┘\n');

  // Summary statistics
  const degraded = breakerObjectives.filter(o => o.degraded_state).length;
  const inCooldown = breakerObjectives.filter(o => o.cooldown_remaining > 0).length;
  const critical = breakerObjectives.filter(o => o.attempts_remaining === 0 && !o.degraded_state).length;

  console.log(`Policy: max_consecutive_failures = ${policy.max_consecutive_failures}, cooldown_base_duration = ${policy.cooldown_base_duration_seconds}s\n`);
  
  if (degraded > 0) {
    console.log(`🚨 DEGRADED: ${degraded} objective(s) require manual intervention`);
  }
  if (critical > 0) {
    console.log(`⚠️  CRITICAL: ${critical} objective(s) at failure threshold`);
  }
  if (inCooldown > 0) {
    console.log(`🔒 COOLDOWN: ${inCooldown} objective(s) in cooldown period`);
  }
  console.log();
}

module.exports = { renderCircuitBreakerView };

// CLI entry point
if (require.main === module) {
  renderCircuitBreakerView().catch(err => {
    console.error('Error rendering circuit breaker view:', err);
    process.exit(1);
  });
}
