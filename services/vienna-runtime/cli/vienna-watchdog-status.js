#!/usr/bin/env node
/**
 * Vienna Watchdog Status
 * 
 * Display execution watchdog status and metrics.
 * 
 * Usage:
 *   node cli/vienna-watchdog-status.js
 */

const { getStateGraph } = require('../lib/state/state-graph');
const { getWatchdogStatus } = require('../lib/core/execution-watchdog');

/**
 * Calculate average duration from array of durations in ms
 */
function averageDuration(durations) {
  if (durations.length === 0) return 0;
  const sum = durations.reduce((a, b) => a + b, 0);
  return Math.round(sum / durations.length / 1000); // Convert to seconds
}

/**
 * Get watchdog status
 */
async function getWatchdogStatusReport() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Get watchdog runtime status
  const watchdogStatus = getWatchdogStatus();

  // Query objectives for metrics
  const objectives = stateGraph.listObjectives();
  const activeAttempts = objectives.filter(obj => 
    obj.reconciliation_status === 'reconciling' && 
    obj.execution_started_at && 
    !obj.execution_completed_at
  );

  // Count expired deadlines (execution_deadline_at < now but still in reconciling)
  const now = new Date();
  const expiredDeadlines = activeAttempts.filter(obj => 
    obj.execution_deadline_at && new Date(obj.execution_deadline_at) < now
  ).length;

  // Query objective history for timeout events in last hour
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  let timeoutsLastHour = 0;
  let executionDurations = [];

  for (const obj of objectives) {
    const history = stateGraph.listObjectiveHistory(obj.objective_id, 100);
    
    // Count timeout events in last hour
    const recentTimeouts = history.filter(h => 
      h.reason === 'objective.execution.timed_out' && 
      h.event_timestamp > oneHourAgo
    );
    timeoutsLastHour += recentTimeouts.length;

    // Calculate execution durations from completed reconciliations
    const evaluations = stateGraph.listObjectiveEvaluations(obj.objective_id, 20);
    evaluations.forEach(eval => {
      if (eval.triggered_execution_id) {
        // Try to find duration from execution records
        // For now, use a placeholder approach based on evaluation intervals
        // Future: query execution_ledger for precise durations
      }
    });
  }

  // Placeholder average execution duration (will be more accurate with ledger integration)
  const avgExecutionDuration = executionDurations.length > 0 
    ? averageDuration(executionDurations) 
    : null;

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                      WATCHDOG STATUS                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('━━━ WATCHDOG RUNTIME ━━━');
  console.log(`  Running:              ${watchdogStatus.running ? 'YES' : 'NO'}`);
  console.log(`  Interval:             ${watchdogStatus.interval_ms ? watchdogStatus.interval_ms + 'ms' : 'N/A'}`);
  console.log();

  console.log('━━━ ACTIVE ATTEMPTS ━━━');
  console.log(`  Active Attempts:      ${activeAttempts.length}`);
  console.log(`  Expired Deadlines:    ${expiredDeadlines}`);
  console.log();

  console.log('━━━ TIMEOUT METRICS (Last Hour) ━━━');
  console.log(`  Timeouts:             ${timeoutsLastHour}`);
  console.log(`  Timeout Rate:         ${(timeoutsLastHour / Math.max(1, objectives.length)).toFixed(2)} per objective`);
  console.log();

  console.log('━━━ EXECUTION METRICS ━━━');
  if (avgExecutionDuration !== null) {
    console.log(`  Avg Duration:         ${avgExecutionDuration}s`);
  } else {
    console.log(`  Avg Duration:         N/A (no completed executions)`);
  }
  console.log();

  // Active attempts detail
  if (activeAttempts.length > 0) {
    console.log('━━━ ACTIVE ATTEMPTS DETAIL ━━━');
    activeAttempts.forEach((obj, idx) => {
      const deadline = new Date(obj.execution_deadline_at);
      const remaining = Math.floor((deadline - now) / 1000);
      const status = remaining < 0 ? `⚠️  EXPIRED (${Math.abs(remaining)}s ago)` : `${remaining}s remaining`;
      
      console.log(`  ${idx + 1}. ${obj.objective_id}`);
      console.log(`     Generation: ${obj.generation}, Deadline: ${status}`);
    });
    console.log();
  }

  // Health check
  console.log('━━━ HEALTH CHECK ━━━');
  if (expiredDeadlines > 0) {
    console.log(`  🚨 WARNING: ${expiredDeadlines} execution(s) past deadline`);
  } else if (activeAttempts.length > 0) {
    console.log(`  ✅ All active executions within deadline`);
  } else {
    console.log(`  ✅ No active executions`);
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// CLI entry point
if (require.main === module) {
  getWatchdogStatusReport().catch(err => {
    console.error('\n❌ Error getting watchdog status:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
}

module.exports = { getWatchdogStatusReport };
