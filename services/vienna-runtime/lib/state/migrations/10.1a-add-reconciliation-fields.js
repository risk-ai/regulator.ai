/**
 * Phase 10.1a Migration: Add Reconciliation State Machine Fields
 * 
 * Adds reconciliation control fields to managed_objectives table.
 * Safe for existing rows - all fields have sensible defaults.
 */

const path = require('path');
const fs = require('fs');

function getMigrationSQL() {
  return `
    -- Phase 10.1a: Add reconciliation state machine fields to managed_objectives
    
    -- Add reconciliation_status (default: idle)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'idle' 
    CHECK(reconciliation_status IN ('idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode'));
    
    -- Add reconciliation_attempt_count (default: 0)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0;
    
    -- Add reconciliation_started_at (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_started_at TEXT;
    
    -- Add reconciliation_cooldown_until (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_cooldown_until TEXT;
    
    -- Add reconciliation_last_result (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_last_result TEXT;
    
    -- Add reconciliation_last_error (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_last_error TEXT;
    
    -- Add reconciliation_last_execution_id (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_last_execution_id TEXT;
    
    -- Add reconciliation_last_verified_at (nullable)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_last_verified_at TEXT;
    
    -- Add reconciliation_generation (default: 0)
    ALTER TABLE managed_objectives 
    ADD COLUMN reconciliation_generation INTEGER NOT NULL DEFAULT 0;
    
    -- Add manual_hold (default: 0/false)
    ALTER TABLE managed_objectives 
    ADD COLUMN manual_hold INTEGER NOT NULL DEFAULT 0 
    CHECK(manual_hold IN (0, 1));
    
    -- Add index for reconciliation_status (frequently queried by gate)
    CREATE INDEX IF NOT EXISTS idx_managed_objectives_reconciliation_status 
    ON managed_objectives(reconciliation_status);
  `;
}

function getVerificationSQL() {
  return `
    SELECT 
      COUNT(*) as total_objectives,
      SUM(CASE WHEN reconciliation_status = 'idle' THEN 1 ELSE 0 END) as idle_count,
      SUM(CASE WHEN reconciliation_attempt_count = 0 THEN 1 ELSE 0 END) as zero_attempts,
      SUM(CASE WHEN reconciliation_generation = 0 THEN 1 ELSE 0 END) as zero_generation,
      SUM(CASE WHEN manual_hold = 0 THEN 1 ELSE 0 END) as not_held
    FROM managed_objectives;
  `;
}

async function runMigration(db) {
  console.log('[Migration 10.1a] Starting reconciliation fields migration...');
  
  // Check if migration already applied
  const checkQuery = `
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='managed_objectives';
  `;
  
  const tableInfo = await new Promise((resolve, reject) => {
    db.get(checkQuery, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (tableInfo && tableInfo.sql.includes('reconciliation_status')) {
    console.log('[Migration 10.1a] Fields already exist, skipping migration.');
    return { skipped: true };
  }
  
  // SQLite doesn't support multiple ADD COLUMN in one statement
  // Need to execute each ALTER TABLE separately
  const statements = [
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'idle' CHECK(reconciliation_status IN ('idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode'))",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_started_at TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_cooldown_until TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_result TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_error TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_execution_id TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_verified_at TEXT",
    "ALTER TABLE managed_objectives ADD COLUMN reconciliation_generation INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE managed_objectives ADD COLUMN manual_hold INTEGER NOT NULL DEFAULT 0 CHECK(manual_hold IN (0, 1))",
    "CREATE INDEX IF NOT EXISTS idx_managed_objectives_reconciliation_status ON managed_objectives(reconciliation_status)"
  ];
  
  for (const sql of statements) {
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  console.log('[Migration 10.1a] Fields added successfully.');
  
  // Verify migration
  const verification = await new Promise((resolve, reject) => {
    db.get(getVerificationSQL(), (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  console.log('[Migration 10.1a] Verification results:', verification);
  
  // All existing objectives should have safe defaults
  if (verification.total_objectives > 0) {
    if (verification.idle_count !== verification.total_objectives) {
      throw new Error('Migration verification failed: Not all objectives set to idle');
    }
    if (verification.zero_attempts !== verification.total_objectives) {
      throw new Error('Migration verification failed: Not all attempt counts zero');
    }
    if (verification.zero_generation !== verification.total_objectives) {
      throw new Error('Migration verification failed: Not all generations zero');
    }
    if (verification.not_held !== verification.total_objectives) {
      throw new Error('Migration verification failed: Not all manual_hold set to false');
    }
  }
  
  console.log('[Migration 10.1a] Migration completed and verified.');
  
  return {
    success: true,
    objectives_migrated: verification.total_objectives
  };
}

module.exports = {
  getMigrationSQL,
  getVerificationSQL,
  runMigration
};
