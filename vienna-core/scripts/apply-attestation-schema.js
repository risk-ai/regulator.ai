#!/usr/bin/env node
/**
 * Apply attestation schema migration
 * Adds execution_attestations table to State Graph
 */

const path = require('path');
const { getStateGraph } = require('../lib/state/state-graph');

async function applyMigration() {
  console.log('Applying attestation schema migration...');
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();
  
  // Schema is idempotent (CREATE TABLE IF NOT EXISTS)
  // Re-running schema.sql will only add new tables
  console.log('✅ Attestation schema applied');
  console.log('Table: execution_attestations');
  console.log('Columns: attestation_id, execution_id, tenant_id, status, input_hash, output_hash, attested_at, metadata, created_at');
  
  // Verify table exists
  const db = stateGraph.db;
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='execution_attestations'
  `).get();
  
  if (tableCheck) {
    console.log('✅ Verified: execution_attestations table exists');
  } else {
    console.error('❌ Error: execution_attestations table not found');
    process.exit(1);
  }
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
