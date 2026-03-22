#!/usr/bin/env node
/**
 * Vienna Timeout Metrics
 * 
 * Display timeout and failure metrics for Phase 10.3 observation.
 * 
 * Usage:
 *   node cli/vienna-timeout-metrics.js [--hours=24]
 */

const { getStateGraph } = require('../lib/state/state-graph');

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { hours: 24 };

  args.forEach(arg => {
    if (arg.startsWith('--hours=')) {
      options.hours = parseInt(arg.split('=')[1], 10);
    }
  });

  return options;
}

/**
 * Get timeout metrics
 */
async function getTimeoutMetrics(options = {}) {
  const hours = options.hours || 24;
  const hoursAgo = new Date(Date.now() - hours * 3600000).toISOString();

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const objectives = stateGraph.listObjectives();

  let timeouts = [];
  let cooldownEntries = [];
  let degradedTransitions = [];
  let executionDurations = [];
  let maxDuration = 0;

  // Collect events from objective history
  for (const obj of objectives) {
    const history = stateGraph.listObjectiveHistory(obj.objective_id, 1000);

    // Filter events in time window
    const recentHistory = history.filter(h => h.event_timestamp > hoursAgo);

    // Count event types
    timeouts = timeouts.concat(
      recentHistory.filter(h => h.reason === 'objective.execution.timed_out')
    );

    cooldownEntries = cooldownEntries.concat(
      recentHistory.filter(h => h.reason === 'objective.reconciliation.cooldown_entered')
    );

    degradedTransitions = degradedTransitions.concat(
      recentHistory.filter(h => h.reason === 'objective.reconciliation.degraded')
    );

    // Calculate execution durations from started → completed/failed/timed_out pairs
    const started = recentHistory.filter(h => h.reason === 'objective.reconciliation.started');
    const terminal = recentHistory.filter(h => 
      h.reason === 'objective.reconciliation.recovered' ||
      h.reason === 'objective.execution.timed_out' ||
      h.reason === 'objective.execution.failed'
    );

    // Match pairs by generation
    started.forEach(s => {
      const gen = s.metadata?.generation;
      if (!gen) return;

      const matchingTerminal = terminal.find(t => t.metadata?.generation === gen);
      if (matchingTerminal) {
        const durationMs = new Date(matchingTerminal.event_timestamp) - new Date(s.event_timestamp);
        if (durationMs > 0) {
          executionDurations.push(durationMs);
          maxDuration = Math.max(maxDuration, durationMs);
        }
      }
    });
  }

  // Calculate rates
  const timeoutsPerHour = timeouts.length / hours;
  const cooldownsPerHour = cooldownEntries.length / hours;
  const degradedPerHour = degradedTransitions.length / hours;

  // Calculate average duration
  const avgDuration = executionDurations.length > 0
    ? Math.round(executionDurations.reduce((a, b) => a + b, 0) / executionDurations.length / 1000)
    : 0;

  const maxDurationSec = Math.round(maxDuration / 1000);

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║               TIMEOUT METRICS (Last ${hours.toString().padStart(2)} Hours)                    ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('━━━ EVENT COUNTS ━━━');
  console.log(`  Timeouts:             ${timeouts.length}`);
  console.log(`  Cooldown Entries:     ${cooldownEntries.length}`);
  console.log(`  Degraded Transitions: ${degradedTransitions.length}`);
  console.log();

  console.log('━━━ HOURLY RATES ━━━');
  console.log(`  Timeouts/hour:        ${timeoutsPerHour.toFixed(2)}`);
  console.log(`  Cooldowns/hour:       ${cooldownsPerHour.toFixed(2)}`);
  console.log(`  Degraded/hour:        ${degradedPerHour.toFixed(2)}`);
  console.log();

  console.log('━━━ EXECUTION DURATIONS ━━━');
  console.log(`  Completed Executions: ${executionDurations.length}`);
  console.log(`  Average Duration:     ${avgDuration}s`);
  console.log(`  Max Duration:         ${maxDurationSec}s`);
  console.log();

  // Timeout breakdown by objective
  if (timeouts.length > 0) {
    console.log('━━━ TIMEOUT BREAKDOWN BY OBJECTIVE ━━━');
    const timeoutsByObjective = {};
    timeouts.forEach(t => {
      timeoutsByObjective[t.objective_id] = (timeoutsByObjective[t.objective_id] || 0) + 1;
    });

    Object.entries(timeoutsByObjective)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .forEach(([objectiveId, count]) => {
        console.log(`  ${objectiveId.padEnd(30)} ${count} timeout(s)`);
      });
    console.log();
  }

  // Health assessment
  console.log('━━━ HEALTH ASSESSMENT ━━━');
  if (timeoutsPerHour > objectives.length * 0.1) {
    console.log(`  🚨 CRITICAL: Timeout storm detected (${timeoutsPerHour.toFixed(2)}/hr exceeds 10% threshold)`);
  } else if (timeoutsPerHour > 0) {
    console.log(`  ⚠️  WARNING: Timeouts occurring but below storm threshold`);
  } else {
    console.log(`  ✅ HEALTHY: No timeouts in last ${hours} hours`);
  }

  if (degradedTransitions.length > 0) {
    console.log(`  ⚠️  ${degradedTransitions.length} objective(s) transitioned to degraded state`);
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Return metrics for programmatic use
  return {
    timeWindow: { hours, since: hoursAgo },
    counts: {
      timeouts: timeouts.length,
      cooldownEntries: cooldownEntries.length,
      degradedTransitions: degradedTransitions.length,
      completedExecutions: executionDurations.length
    },
    rates: {
      timeoutsPerHour,
      cooldownsPerHour,
      degradedPerHour
    },
    durations: {
      avgDurationSec: avgDuration,
      maxDurationSec: maxDurationSec
    }
  };
}

// CLI entry point
if (require.main === module) {
  const options = parseArgs();

  getTimeoutMetrics(options).catch(err => {
    console.error('\n❌ Error calculating timeout metrics:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
}

module.exports = { getTimeoutMetrics };
