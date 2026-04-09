#!/usr/bin/env node
/**
 * Migration Runner — Vienna Console
 * Applies SQL migrations from src/db/migrations/ to production database
 */

const fs = require('fs');
const path = require('path');
const { raw } = require('./dist/apps/console/server/src/db/postgres.js');

const MIGRATIONS_DIR = path.join(__dirname, 'src/db/migrations');

async function runMigrations() {
  console.log('🔄 Running migrations from:', MIGRATIONS_DIR);
  
  // Get all .sql files, sorted by name
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${files.length} migration files\n`);
  
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`▶️  Applying: ${file}`);
    try {
      await raw(sql);
      console.log(`✅ Success: ${file}\n`);
    } catch (error) {
      console.error(`❌ Error in ${file}:`, error.message);
      console.error('Stopping migration run.\n');
      process.exit(1);
    }
  }
  
  console.log('🎉 All migrations applied successfully!');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
