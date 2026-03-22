#!/usr/bin/env node
/**
 * Query State Graph CLI
 * 
 * Environment: Respects VIENNA_ENV (default: prod)
 * 
 * Usage:
 *   node query-state-graph.js services
 *   node query-state-graph.js services --status=degraded
 *   node query-state-graph.js providers
 *   node query-state-graph.js incidents --status=open
 *   node query-state-graph.js objectives --status=active
 *   node query-state-graph.js context
 *   node query-state-graph.js transitions --entity-id=service-id
 * 
 *   VIENNA_ENV=test node query-state-graph.js services
 */

const { getStateGraph } = require('../lib/state/state-graph');

async function query() {
  const env = process.env.VIENNA_ENV || 'prod';
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: query-state-graph.js <entity-type> [filters]');
    console.log('\nEntity types: services, providers, incidents, objectives, context, transitions');
    console.log('\nExamples:');
    console.log('  query-state-graph.js services --status=running');
    console.log('  query-state-graph.js incidents --status=open --severity=critical');
    console.log('  query-state-graph.js transitions --entity-id=kalshi-cron');
    process.exit(1);
  }

  const entityType = args[0];
  const filters = {};

  // Parse filters from command line args
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      filters[key.replace('-', '_')] = value;
    }
  }

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  let results;

  switch (entityType) {
    case 'services':
      results = stateGraph.listServices(filters);
      break;

    case 'providers':
      results = stateGraph.listProviders(filters);
      break;

    case 'incidents':
      results = stateGraph.listIncidents(filters);
      break;

    case 'objectives':
      results = stateGraph.listObjectives(filters);
      break;

    case 'context':
      results = stateGraph.listRuntimeContext(filters);
      break;

    case 'transitions':
      results = stateGraph.listTransitions(filters);
      break;

    default:
      console.error(`Unknown entity type: ${entityType}`);
      process.exit(1);
  }

  stateGraph.close();

  if (results.length === 0) {
    console.error(`[${env}] No results found.`);
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

query().catch(err => {
  console.error('Query failed:', err.message);
  process.exit(1);
});
