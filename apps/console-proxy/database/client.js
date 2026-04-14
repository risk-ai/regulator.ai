/**
 * Database Client
 * Shared PostgreSQL connection pool
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false },
  // Set search_path at connection time via protocol-level options.
  // This avoids race conditions on Vercel serverless cold starts where
  // pool.on('connect') SET queries can race with actual application queries.
  options: '-c search_path=regulator,public',
});

/**
 * Execute a parameterized query
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn('[DB] Slow query:', { text, duration });
    }
    
    return res;
  } catch (error) {
    console.error('[DB] Query failed:', { text, error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  pool,
};
