#!/usr/bin/env node
/**
 * Vienna Operator Dashboard
 * 
 * Real-time monitoring interface for Vienna OS reconciliation runtime.
 * 
 * Usage:
 *   node dashboard.js [--refresh=5] [--objective=gateway-health]
 */

const { renderObjectiveMonitor } = require('./objective-monitor');
const { renderExecutionLeaseMonitor } = require('./execution-lease-monitor');
const { renderCircuitBreakerView } = require('./circuit-breaker-view');
const { renderEventTimeline } = require('./event-timeline');

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    refresh: null,
    objective: null,
    view: 'all'
  };

  args.forEach(arg => {
    if (arg.startsWith('--refresh=')) {
      options.refresh = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--objective=')) {
      options.objective = arg.split('=')[1];
    } else if (arg.startsWith('--view=')) {
      options.view = arg.split('=')[1];
    }
  });

  return options;
}

/**
 * Clear terminal screen
 */
function clearScreen() {
  process.stdout.write('\x1Bc'); // Clear screen and move cursor to top
}

/**
 * Render full dashboard
 */
async function renderDashboard(options = {}) {
  clearScreen();

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('                        VIENNA OPERATOR DASHBOARD                              ');
  console.log('                   Governed Reconciliation Runtime Monitor                     ');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`                          ${new Date().toISOString()}                          `);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    if (options.view === 'all' || options.view === 'objectives') {
      await renderObjectiveMonitor();
    }

    if (options.view === 'all' || options.view === 'leases') {
      await renderExecutionLeaseMonitor();
    }

    if (options.view === 'all' || options.view === 'breakers') {
      await renderCircuitBreakerView();
    }

    if (options.view === 'all' || options.view === 'timeline') {
      const timelineOptions = options.objective ? { objective: options.objective } : {};
      await renderEventTimeline(timelineOptions);
    }

    if (options.refresh) {
      console.log(`\n🔄 Auto-refresh enabled (every ${options.refresh}s). Press Ctrl+C to exit.\n`);
    } else {
      console.log('\n💡 Run with --refresh=5 for auto-refresh mode\n');
    }

  } catch (err) {
    console.error('\n❌ Dashboard error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  // Single render
  if (!options.refresh) {
    await renderDashboard(options);
    return;
  }

  // Auto-refresh loop
  const refreshMs = options.refresh * 1000;
  
  // Initial render
  await renderDashboard(options);

  // Set up refresh interval
  setInterval(async () => {
    await renderDashboard(options);
  }, refreshMs);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Dashboard stopped.\n');
  process.exit(0);
});

// Run dashboard
main().catch(err => {
  console.error('Fatal dashboard error:', err);
  process.exit(1);
});
