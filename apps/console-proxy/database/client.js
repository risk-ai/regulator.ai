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
  // NOTE: Do NOT use `options: '-c search_path=...'` here.
  // Neon's pooled connection endpoint (PgBouncer) rejects startup parameters.
  // Instead, we SET search_path after each connection via pool.on('connect').
});

// Set search_path on every new connection from the pool.
// This fires before any application query on that connection.
pool.on('connect', (client) => {
  return client.query('SET search_path TO regulator, public');
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
