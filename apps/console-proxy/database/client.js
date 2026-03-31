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
});

// Set search path to regulator schema on every new connection
pool.on('connect', (client) => {
  client.query('SET search_path TO regulator, public');
});

// Set search_path to prioritize 'regulator' schema, fallback to 'public'
pool.on('connect', (client) => {
  client.query('SET search_path TO regulator, public', (err) => {
    if (err) {
      console.error('[DB] Failed to set search_path:', err);
    }
  });
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
