/**
 * Migration: Add Execution Timeout Fields
 * Phase 10.3 - Execution Timeouts
 * 
 * Adds 8 new fields to managed_objectives for execution lease tracking
 * and timeout enforcement.
 */

async function up(db) {
  console.log('[Migration 10.3] Adding execution timeout fields to managed_objectives...');

  // Get existing columns
  const existingCols = db.prepare('PRAGMA table_info(managed_objectives)').all();
  const existingNames = existingCols.map(c => c.name);

  const fieldsToAdd = [
    'active_attempt_id',
    'execution_started_at',
    'execution_deadline_at',
    'cancel_requested_at',
    'execution_terminated_at',
    'last_terminal_reason',
    'last_timeout_at',
    'termination_result'
  ];

  for (const field of fieldsToAdd) {
    if (!existingNames.includes(field)) {
      console.log(`[Migration 10.3] Adding column: ${field}`);
      await db.exec(`ALTER TABLE managed_objectives ADD COLUMN ${field} TEXT;`);
    } else {
      console.log(`[Migration 10.3] Column already exists: ${field}`);
    }
  }

  console.log('[Migration 10.3] ✓ Execution timeout fields added');
}

async function down(db) {
  console.log('[Migration 10.3] Removing execution timeout fields...');

  // SQLite doesn't support DROP COLUMN directly, but we can ignore for now
  // In production, would need to recreate table
  console.warn('[Migration 10.3] SQLite does not support DROP COLUMN - manual rollback required');
}

module.exports = { up, down };
