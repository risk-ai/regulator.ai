#!/usr/bin/env node
// Run console migrations 001-008 against the regulator schema in Neon
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://neondb_owner:npg_qBE7o0YlGQyX@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const MIGRATIONS_DIR = path.join(__dirname, 'apps/console/server/src/db/migrations');

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  
  // Set search path to regulator schema
  await client.query('SET search_path TO regulator, public');
  console.log('✅ search_path set to regulator');
  
  // Create migration tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  // Get already-applied migrations
  const applied = await client.query('SELECT name FROM _migrations ORDER BY name');
  const appliedSet = new Set(applied.rows.map(r => r.name));
  
  // Get migration files in order
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  ${file} (already applied)`);
      continue;
    }
    
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`🔄 Running ${file}...`);
    
    try {
      await client.query('BEGIN');
      // Remove CONCURRENTLY from CREATE INDEX since we're in a transaction
      const safeSql = sql.replace(/CREATE INDEX CONCURRENTLY/g, 'CREATE INDEX');
      await client.query(safeSql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ ${file} applied`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ ${file} FAILED: ${err.message}`);
      // Log the error but continue to next migration
      // Some indexes may reference tables that don't exist yet
      if (file === '008_performance_indexes.sql') {
        console.log('   (Index migration failures are non-critical, tables may not exist yet)');
      }
    }
  }
  
  console.log(`\n🏁 Done: ${count} migrations applied`);
  
  // Show final table list
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'regulator' ORDER BY table_name"
  );
  console.log('\n📋 Tables in regulator schema:');
  tables.rows.forEach(r => console.log('  - ' + r.table_name));
  
  await client.end();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
