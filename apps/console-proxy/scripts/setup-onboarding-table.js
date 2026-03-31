/**
 * Setup script for onboarding_status table
 * Run this to create the table if it doesn't exist
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupOnboardingTable() {
  try {
    console.log('Setting up onboarding_status table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/onboarding_status.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Onboarding table setup complete');
    
    // Test the table by checking if it exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'onboarding_status'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table exists and is ready');
    } else {
      console.log('❌ Table was not created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error setting up onboarding table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupOnboardingTable();
}

module.exports = { setupOnboardingTable };