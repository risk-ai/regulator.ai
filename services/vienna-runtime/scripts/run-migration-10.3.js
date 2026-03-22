#!/usr/bin/env node
/**
 * Run Phase 10.3 Migration
 */

// Use environment variable or default to test
if (!process.env.VIENNA_ENV) {
  process.env.VIENNA_ENV = 'test';
}

const { getStateGraph } = require('../lib/state/state-graph');
const migration = require('../lib/state/migrations/10.3-add-execution-timeout-fields');

async function main() {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  console.log('[Migration] Running Phase 10.3 migration on test database...');
  await migration.up(stateGraph.db);
  console.log('[Migration] ✓ Complete');
  
  // Verify columns exist
  const stmt = stateGraph.db.prepare("PRAGMA table_info(managed_objectives)");
  const columns = stmt.all();
  const columnNames = columns.map(c => c.name);
  
  const expectedColumns = [
    'active_attempt_id',
    'execution_started_at',
    'execution_deadline_at',
    'cancel_requested_at',
    'execution_terminated_at',
    'last_terminal_reason',
    'last_timeout_at',
    'termination_result'
  ];
  
  console.log('[Migration] Verifying columns...');
  for (const col of expectedColumns) {
    if (columnNames.includes(col)) {
      console.log(`  ✓ ${col}`);
    } else {
      console.error(`  ✗ ${col} - MISSING`);
    }
  }
}

main().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
