#!/usr/bin/env node
/**
 * Vienna Objective Inspector
 * 
 * Detailed inspection of a single objective's state.
 * 
 * Usage:
 *   node cli/vienna-inspect-objective.js <objective_id>
 *   node cli/vienna-inspect-objective.js gateway-health
 */

const { getStateGraph } = require('../lib/state/state-graph');

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
  if (seconds === null || seconds === undefined) return 'N/A';
  if (seconds === 0) return 'READY';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Format boolean
 */
function formatBoolean(value) {
  return value ? 'YES' : 'NO';
}

/**
 * Inspect objective
 */
async function inspectObjective(objectiveId) {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objective = stateGraph.getObjective(objectiveId);

  if (!objective) {
    console.error(`\n❌ Objective not found: ${objectiveId}\n`);
    process.exit(1);
  }

  // Calculate derived fields
  const cooldownRemaining = timeRemaining(objective.cooldown_until);
  const executionActive = objective.execution_started_at && !objective.execution_completed_at;
  const executionDeadlineRemaining = timeRemaining(objective.execution_deadline_at);

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  OBJECTIVE INSPECTOR: ${objectiveId.padEnd(44)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('━━━ IDENTITY ━━━');
  console.log(`  Objective ID:        ${objective.objective_id}`);
  console.log(`  Type:                ${objective.objective_type || 'N/A'}`);
  console.log(`  Target:              ${objective.target_id || 'N/A'}`);
  console.log(`  Target Type:         ${objective.target_type || 'N/A'}`);
  console.log();

  console.log('━━━ STATUS ━━━');
  console.log(`  Status:              ${objective.status}`);
  console.log(`  Reconcile Status:    ${objective.reconciliation_status}`);
  console.log(`  Generation:          ${objective.generation}`);
  console.log();

  console.log('━━━ FAILURE TRACKING ━━━');
  console.log(`  Consecutive Failures: ${objective.consecutive_failures}`);
  console.log(`  Last Terminal Reason: ${objective.last_terminal_reason || 'N/A'}`);
  console.log(`  Cooldown Until:       ${objective.cooldown_until || 'N/A'}`);
  console.log(`  Cooldown Remaining:   ${formatDuration(cooldownRemaining)}`);
  console.log();

  console.log('━━━ EXECUTION STATE ━━━');
  console.log(`  Execution Active:     ${formatBoolean(executionActive)}`);
  console.log(`  Execution Started:    ${objective.execution_started_at || 'N/A'}`);
  console.log(`  Execution Deadline:   ${objective.execution_deadline_at || 'N/A'}`);
  console.log(`  Deadline Remaining:   ${formatDuration(executionDeadlineRemaining)}`);
  console.log(`  Execution Completed:  ${objective.execution_completed_at || 'N/A'}`);
  console.log(`  Cancel Requested:     ${formatBoolean(objective.cancel_requested)}`);
  console.log();

  console.log('━━━ EVALUATION ━━━');
  console.log(`  Last Evaluated:       ${objective.last_evaluated_at || 'N/A'}`);
  console.log(`  Evaluation Interval:  ${objective.evaluation_interval_seconds || 'N/A'}s`);
  console.log();

  console.log('━━━ TIMESTAMPS ━━━');
  console.log(`  Created:              ${objective.created_at}`);
  console.log(`  Updated:              ${objective.updated_at}`);
  console.log();

  // Recent evaluations
  const evaluations = stateGraph.listObjectiveEvaluations(objectiveId, 5);
  if (evaluations.length > 0) {
    console.log('━━━ RECENT EVALUATIONS (Last 5) ━━━');
    evaluations.forEach((eval, idx) => {
      console.log(`  ${idx + 1}. ${eval.evaluation_timestamp}`);
      console.log(`     Satisfied: ${formatBoolean(eval.objective_satisfied)}, Violation: ${formatBoolean(eval.violation_detected)}`);
      console.log(`     Action: ${eval.action_taken || 'none'}`);
      if (eval.result_summary) {
        console.log(`     Result: ${eval.result_summary}`);
      }
    });
    console.log();
  }

  // Recent history
  const history = stateGraph.listObjectiveHistory(objectiveId, 10);
  if (history.length > 0) {
    console.log('━━━ RECENT HISTORY (Last 10 transitions) ━━━');
    history.forEach((h, idx) => {
      console.log(`  ${idx + 1}. ${h.event_timestamp.substring(11, 19)} | ${h.from_status} → ${h.to_status}`);
      console.log(`     Reason: ${h.reason}`);
      if (h.metadata && Object.keys(h.metadata).length > 0) {
        console.log(`     Metadata: ${JSON.stringify(h.metadata)}`);
      }
    });
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// CLI entry point
if (require.main === module) {
  const objectiveId = process.argv[2];

  if (!objectiveId) {
    console.error('\nUsage: node cli/vienna-inspect-objective.js <objective_id>\n');
    process.exit(1);
  }

  inspectObjective(objectiveId).catch(err => {
    console.error('\n❌ Error inspecting objective:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
}

module.exports = { inspectObjective };
