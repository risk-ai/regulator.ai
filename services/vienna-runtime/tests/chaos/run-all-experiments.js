#!/usr/bin/env node
/**
 * Run All Chaos Experiments
 * 
 * Execute all chaos experiments sequentially and report results.
 */

const { simulateHungExecution } = require('./experiment-1-hung-execution');
const { simulateDelayedCompletion } = require('./experiment-2-delayed-completion');
const { simulateRepeatedFailures } = require('./experiment-3-repeated-failures');
const { simulateStartupSweep } = require('./experiment-4-startup-sweep');

async function runAllExperiments() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                    CHAOS TESTING SUITE                             ║');
  console.log('║             Phase 10.3 Execution Timeout Validation                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  const results = {
    total: 4,
    passed: 0,
    failed: 0,
    experiments: []
  };

  const experiments = [
    { name: 'Hung Execution', fn: simulateHungExecution },
    { name: 'Delayed Completion', fn: simulateDelayedCompletion },
    { name: 'Repeated Failures', fn: simulateRepeatedFailures },
    { name: 'Startup Sweep', fn: simulateStartupSweep }
  ];

  for (const experiment of experiments) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Running: ${experiment.name}`);
      console.log('='.repeat(70));
      
      await experiment.fn();
      
      results.passed++;
      results.experiments.push({ name: experiment.name, result: 'PASSED' });
      
    } catch (err) {
      results.failed++;
      results.experiments.push({ 
        name: experiment.name, 
        result: 'FAILED', 
        error: err.message 
      });
      
      console.error(`\n❌ ${experiment.name} FAILED:`, err.message);
    }
  }

  // Final report
  console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                    CHAOS TESTING REPORT                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('━━━ RESULTS ━━━\n');
  results.experiments.forEach((exp, idx) => {
    const symbol = exp.result === 'PASSED' ? '✅' : '❌';
    console.log(`${idx + 1}. ${symbol} ${exp.name} - ${exp.result}`);
    if (exp.error) {
      console.log(`   Error: ${exp.error}`);
    }
  });

  console.log('\n━━━ SUMMARY ━━━\n');
  console.log(`Total Experiments: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  console.log('\n━━━ OBSERVATION WINDOW VALIDATION ━━━\n');
  
  if (results.passed === results.total) {
    console.log('✅ ALL EXPERIMENTS PASSED');
    console.log('Phase 10.3 execution timeout behavior validated under controlled failure conditions.');
    console.log('\nValidated behaviors:');
    console.log('  • Watchdog detects and terminates hung executions');
    console.log('  • Stale completions rejected (no state mutation)');
    console.log('  • Circuit breaker escalates repeated failures to degraded');
    console.log('  • Startup sweep cleans expired leases');
    console.log('\nPhase 10.3 ready for production observation window.\n');
  } else {
    console.log('❌ SOME EXPERIMENTS FAILED');
    console.log('Phase 10.3 behavior does not match expected invariants.');
    console.log('Review failed experiments before proceeding with observation window.\n');
    process.exit(1);
  }
}

// Run all experiments
if (require.main === module) {
  runAllExperiments().catch(err => {
    console.error('\n❌ Chaos testing suite error:', err);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { runAllExperiments };
