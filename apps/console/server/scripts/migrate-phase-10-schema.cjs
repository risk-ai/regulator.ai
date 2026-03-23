/**
 * Phase 10 Schema Migration
 * 
 * Adds columns required by Phase 10.1 reconciliation service
 */

const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const environment = process.env.VIENNA_ENV || 'prod';
const dbPath = path.join(
  os.homedir(),
  '.openclaw/runtime',
  environment,
  'state/state-graph.db'
);

console.log(`[Migration] Environment: ${environment}`);
console.log(`[Migration] Database: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Start transaction
  db.prepare('BEGIN').run();
  
  // Check if managed_objective_history exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='managed_objective_history'
  `).get();
  
  if (!tableExists) {
    console.log('[Migration] managed_objective_history table does not exist, skipping');
    db.prepare('COMMIT').run();
    process.exit(0);
  }
  
  // Get current columns
  const currentColumns = db.prepare('PRAGMA table_info(managed_objective_history)').all();
  const columnNames = currentColumns.map(c => c.name);
  
  console.log('[Migration] Current columns:', columnNames.join(', '));
  
  // Add generation column if missing
  if (!columnNames.includes('generation')) {
    console.log('[Migration] Adding generation column...');
    db.prepare(`
      ALTER TABLE managed_objective_history 
      ADD COLUMN generation INTEGER
    `).run();
    
    // Update existing rows with generation from managed_objectives
    db.prepare(`
      UPDATE managed_objective_history
      SET generation = (
        SELECT reconciliation_generation
        FROM managed_objectives
        WHERE managed_objectives.objective_id = managed_objective_history.objective_id
      )
    `).run();
    
    console.log('[Migration] ✓ Added generation column');
  } else {
    console.log('[Migration] generation column already exists');
  }
  
  // Add transition_type column if missing
  if (!columnNames.includes('transition_type')) {
    console.log('[Migration] Adding transition_type column...');
    db.prepare(`
      ALTER TABLE managed_objective_history 
      ADD COLUMN transition_type TEXT
    `).run();
    
    // Map old reason values to transition types
    db.prepare(`
      UPDATE managed_objective_history
      SET transition_type = CASE
        WHEN reason LIKE '%remediation started%' THEN 'remediation_started'
        WHEN reason LIKE '%remediation completed%' THEN 'remediation_completed'
        WHEN reason LIKE '%remediation failed%' THEN 'remediation_failed'
        WHEN reason LIKE '%timeout%' THEN 'execution_timed_out'
        WHEN reason LIKE '%evaluation%' THEN 'objective.reconciliation.requested'
        WHEN reason LIKE '%cooldown%' THEN 'objective.reconciliation.cooldown_entered'
        WHEN reason LIKE '%degraded%' THEN 'objective.reconciliation.degraded'
        WHEN reason LIKE '%recovered%' THEN 'objective.reconciliation.recovered'
        WHEN to_status = 'healthy' AND from_status != 'healthy' THEN 'objective.reconciliation.recovered'
        WHEN to_status = 'violation_detected' THEN 'objective.reconciliation.requested'
        WHEN to_status = 'remediation_triggered' THEN 'objective.reconciliation.requested'
        WHEN to_status = 'remediation_running' THEN 'remediation_started'
        WHEN to_status = 'verification' THEN 'remediation_completed'
        WHEN to_status = 'restored' THEN 'objective.reconciliation.recovered'
        WHEN to_status = 'failed' THEN 'remediation_failed'
        ELSE 'state_transition'
      END
    `).run();
    
    console.log('[Migration] ✓ Added transition_type column');
  } else {
    console.log('[Migration] transition_type column already exists');
  }
  
  // Add from_state and to_state if missing (for compatibility)
  if (!columnNames.includes('from_state')) {
    console.log('[Migration] Adding from_state column...');
    db.prepare(`
      ALTER TABLE managed_objective_history 
      ADD COLUMN from_state TEXT
    `).run();
    
    // Populate from existing from_status
    db.prepare(`
      UPDATE managed_objective_history
      SET from_state = from_status
    `).run();
    
    console.log('[Migration] ✓ Added from_state column');
  } else {
    console.log('[Migration] from_state column already exists');
  }
  
  if (!columnNames.includes('to_state')) {
    console.log('[Migration] Adding to_state column...');
    db.prepare(`
      ALTER TABLE managed_objective_history 
      ADD COLUMN to_state TEXT
    `).run();
    
    // Populate from existing to_status
    db.prepare(`
      UPDATE managed_objective_history
      SET to_state = to_status
    `).run();
    
    console.log('[Migration] ✓ Added to_state column');
  } else {
    console.log('[Migration] to_state column already exists');
  }
  
  // Rename metadata_json to metadata if needed (for compatibility)
  if (columnNames.includes('metadata_json') && !columnNames.includes('metadata')) {
    console.log('[Migration] Adding metadata column...');
    db.prepare(`
      ALTER TABLE managed_objective_history 
      ADD COLUMN metadata TEXT
    `).run();
    
    db.prepare(`
      UPDATE managed_objective_history
      SET metadata = metadata_json
    `).run();
    
    console.log('[Migration] ✓ Added metadata column');
  } else if (columnNames.includes('metadata')) {
    console.log('[Migration] metadata column already exists');
  }
  
  // Check managed_objectives for enabled column
  const objColumns = db.prepare('PRAGMA table_info(managed_objectives)').all();
  const objColumnNames = objColumns.map(c => c.name);
  
  if (!objColumnNames.includes('enabled')) {
    console.log('[Migration] Adding enabled column to managed_objectives...');
    db.prepare(`
      ALTER TABLE managed_objectives
      ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1))
    `).run();
    console.log('[Migration] ✓ Added enabled column');
  } else {
    console.log('[Migration] enabled column already exists in managed_objectives');
  }
  
  // Commit transaction
  db.prepare('COMMIT').run();
  
  console.log('[Migration] ✓ Migration completed successfully');
  
  // Verify
  const finalColumns = db.prepare('PRAGMA table_info(managed_objective_history)').all();
  console.log('[Migration] Final columns:', finalColumns.map(c => c.name).join(', '));
  
} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('[Migration] Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
