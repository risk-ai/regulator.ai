#!/usr/bin/env node

/**
 * Phase 9.7 — Evaluation Service CLI
 * 
 * Manage objective evaluation service.
 * 
 * Usage:
 *   node scripts/evaluation-service.js start [--interval 30000]
 *   node scripts/evaluation-service.js stop
 *   node scripts/evaluation-service.js pause
 *   node scripts/evaluation-service.js resume
 *   node scripts/evaluation-service.js status
 *   node scripts/evaluation-service.js metrics
 */

const { getEvaluationService } = require('../lib/core/objective-evaluation-service');
const { getStateGraph } = require('../lib/state/state-graph');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: node scripts/evaluation-service.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  start [--interval 30000]   Start evaluation service');
    console.log('  stop                        Stop evaluation service');
    console.log('  pause                       Pause evaluation cycles');
    console.log('  resume                      Resume evaluation cycles');
    console.log('  status                      Show service status');
    console.log('  metrics                     Show health metrics');
    process.exit(1);
  }

  // Initialize State Graph
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Get service instance
  const intervalMs = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30000;
  const service = getEvaluationService({ intervalMs });

  try {
    switch (command) {
      case 'start': {
        console.log(`Starting evaluation service (interval: ${service.intervalMs}ms)...`);
        await service.start();
        console.log('Service started');
        console.log('');
        console.log('Press Ctrl+C to stop');
        
        // Keep process alive
        process.on('SIGINT', async () => {
          console.log('\nStopping service...');
          await service.stop();
          console.log('Service stopped');
          process.exit(0);
        });
        
        // Keep running
        await new Promise(() => {});
        break;
      }

      case 'stop': {
        console.log('Stopping evaluation service...');
        await service.stop();
        console.log('Service stopped');
        process.exit(0);
        break;
      }

      case 'pause': {
        service.pause();
        console.log('Service paused');
        process.exit(0);
        break;
      }

      case 'resume': {
        service.resume();
        console.log('Service resumed');
        process.exit(0);
        break;
      }

      case 'status': {
        const status = service.getStatus();
        console.log('Evaluation Service Status');
        console.log('========================');
        console.log(`Enabled:           ${status.enabled}`);
        console.log(`Paused:            ${status.paused}`);
        console.log(`Running:           ${status.running}`);
        console.log(`Current Evals:     ${status.currentEvaluations}`);
        console.log(`Interval:          ${status.intervalMs}ms`);
        console.log(`Max Concurrent:    ${status.maxConcurrent}`);
        process.exit(0);
        break;
      }

      case 'metrics': {
        const status = service.getStatus();
        const metrics = status.metrics;
        console.log('Evaluation Service Metrics');
        console.log('=========================');
        console.log(`Cycles Run:        ${metrics.cyclesRun}`);
        console.log(`Objectives Eval:   ${metrics.objectivesEvaluated}`);
        console.log(`Cycles Failed:     ${metrics.cyclesFailed}`);
        console.log(`Total Duration:    ${metrics.totalDurationMs}ms`);
        console.log(`Last Cycle At:     ${metrics.lastCycleAt || 'N/A'}`);
        console.log(`Last Duration:     ${metrics.lastCycleDurationMs || 'N/A'}ms`);
        console.log(`Last Status:       ${metrics.lastCycleStatus || 'N/A'}`);
        console.log(`Last Error:        ${metrics.lastError || 'N/A'}`);
        
        if (metrics.cyclesRun > 0) {
          const avgDuration = Math.round(metrics.totalDurationMs / metrics.cyclesRun);
          console.log(`Avg Duration:      ${avgDuration}ms`);
        }
        process.exit(0);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
