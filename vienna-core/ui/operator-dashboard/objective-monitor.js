/**
 * Objective Monitor
 * 
 * Display all objectives with current status, reconciliation state, and execution details.
 */

const { getStateGraph } = require('../../lib/state/state-graph');

/**
 * Calculate time remaining in seconds
 */
function timeRemaining(timestamp) {
  if (!timestamp) return null;
  const remaining = Math.floor((new Date(timestamp) - new Date()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * Format seconds as human-readable duration
 */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Render objective monitor table
 */
async function renderObjectiveMonitor() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objectives = stateGraph.listObjectives();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            OBJECTIVE MONITOR                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  if (objectives.length === 0) {
    console.log('No objectives registered.\n');
    return;
  }

  // Calculate cooldown and execution deadline remainings
  const enrichedObjectives = objectives.map(obj => ({
    ...obj,
    cooldown_remaining: timeRemaining(obj.cooldown_until),
    execution_deadline_remaining: timeRemaining(obj.execution_deadline_at),
    last_transition: obj.updated_at || obj.created_at
  }));

  // Table header
  console.log('┌─────────────────────┬────────────┬─────────────┬─────┬──────────┬──────────┬───────────┬──────────────────────┐');
  console.log('│ OBJECTIVE           │ STATUS     │ RECONCILE   │ GEN │ FAILURES │ COOLDOWN │ EXEC_TIME │ LAST_TRANSITION      │');
  console.log('├─────────────────────┼────────────┼─────────────┼─────┼──────────┼──────────┼───────────┼──────────────────────┤');

  // Table rows
  enrichedObjectives.forEach(obj => {
    const objective_id = obj.objective_id.padEnd(19).substring(0, 19);
    const status = obj.status.padEnd(10).substring(0, 10);
    const reconcile = obj.reconciliation_status.padEnd(11).substring(0, 11);
    const generation = obj.generation.toString().padStart(3);
    const failures = obj.consecutive_failures.toString().padStart(8);
    const cooldown = formatDuration(obj.cooldown_remaining).padEnd(8).substring(0, 8);
    const exec_time = formatDuration(obj.execution_deadline_remaining).padEnd(9).substring(0, 9);
    const timestamp = new Date(obj.last_transition).toISOString().substring(11, 19); // HH:MM:SS
    
    console.log(`│ ${objective_id} │ ${status} │ ${reconcile} │ ${generation} │ ${failures} │ ${cooldown} │ ${exec_time} │ ${timestamp}         │`);
  });

  console.log('└─────────────────────┴────────────┴─────────────┴─────┴──────────┴──────────┴───────────┴──────────────────────┘\n');
}

module.exports = { renderObjectiveMonitor };

// CLI entry point
if (require.main === module) {
  renderObjectiveMonitor().catch(err => {
    console.error('Error rendering objective monitor:', err);
    process.exit(1);
  });
}
