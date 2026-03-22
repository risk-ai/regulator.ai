/**
 * Execution Lease Monitor
 * 
 * Display active execution attempts with deadline tracking.
 */

const { getStateGraph } = require('../../lib/state/state-graph');

/**
 * Calculate time remaining in seconds
 */
function timeRemaining(timestamp) {
  if (!timestamp) return null;
  const remaining = Math.floor((new Date(timestamp) - new Date()) / 1000);
  return remaining;
}

/**
 * Format seconds with color coding
 */
function formatSeconds(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 0) return `EXPIRED (${Math.abs(seconds)}s ago)`;
  if (seconds < 10) return `⚠️  ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Render execution lease monitor table
 */
async function renderExecutionLeaseMonitor() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Query objectives with active reconciliation
  const objectives = stateGraph.listObjectives({ reconciliation_status: 'reconciling' });

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       EXECUTION LEASE MONITOR                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  if (objectives.length === 0) {
    console.log('No active execution attempts.\n');
    return;
  }

  // Enrich with time remaining
  const activeAttempts = objectives
    .filter(obj => obj.execution_started_at && obj.execution_deadline_at)
    .map(obj => ({
      objective_id: obj.objective_id,
      attempt_id: `${obj.objective_id}-gen${obj.generation}`,
      generation: obj.generation,
      started_at: obj.execution_started_at,
      deadline_at: obj.execution_deadline_at,
      seconds_remaining: timeRemaining(obj.execution_deadline_at),
      cancel_requested: obj.cancel_requested || false
    }));

  if (activeAttempts.length === 0) {
    console.log('No execution leases with active deadlines.\n');
    return;
  }

  // Table header
  console.log('┌─────────────────────┬──────────────────────────┬─────┬──────────┬──────────┬──────────────┬────────┐');
  console.log('│ OBJECTIVE           │ ATTEMPT_ID               │ GEN │ STARTED  │ DEADLINE │ REMAINING    │ CANCEL │');
  console.log('├─────────────────────┼──────────────────────────┼─────┼──────────┼──────────┼──────────────┼────────┤');

  // Table rows
  activeAttempts.forEach(attempt => {
    const objective_id = attempt.objective_id.padEnd(19).substring(0, 19);
    const attempt_id = attempt.attempt_id.padEnd(24).substring(0, 24);
    const generation = attempt.generation.toString().padStart(3);
    const started = new Date(attempt.started_at).toISOString().substring(11, 19); // HH:MM:SS
    const deadline = new Date(attempt.deadline_at).toISOString().substring(11, 19);
    const remaining = formatSeconds(attempt.seconds_remaining).padEnd(12).substring(0, 12);
    const cancel = attempt.cancel_requested ? 'YES' : 'NO';
    
    console.log(`│ ${objective_id} │ ${attempt_id} │ ${generation} │ ${started} │ ${deadline} │ ${remaining} │ ${cancel.padEnd(6)} │`);
  });

  console.log('└─────────────────────┴──────────────────────────┴─────┴──────────┴──────────┴──────────────┴────────┘\n');

  // Warnings
  const expired = activeAttempts.filter(a => a.seconds_remaining < 0);
  const critical = activeAttempts.filter(a => a.seconds_remaining >= 0 && a.seconds_remaining < 10);

  if (expired.length > 0) {
    console.log(`🚨 CRITICAL: ${expired.length} execution(s) past deadline`);
  }
  if (critical.length > 0) {
    console.log(`⚠️  WARNING: ${critical.length} execution(s) expiring within 10s`);
  }
  console.log();
}

module.exports = { renderExecutionLeaseMonitor };

// CLI entry point
if (require.main === module) {
  renderExecutionLeaseMonitor().catch(err => {
    console.error('Error rendering execution lease monitor:', err);
    process.exit(1);
  });
}
