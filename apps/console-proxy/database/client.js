/**
 * Database Client
 * Shared PostgreSQL connection pool with guaranteed search_path
 * 
 * CRITICAL: All endpoints import `pool` from here and call pool.query() directly.
 * We override pool.query() to ensure search_path is set on every call.
 * This eliminates Vercel cold-start race conditions with Neon pooled connections.
 */

const { Pool } = require('pg');

const _pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false },
});

// Wrap pool.query to always set search_path first
const originalQuery = _pool.query.bind(_pool);
_pool.query = async function(text, params) {
  const client = await _pool.connect();
  try {
    await client.query('SET search_path TO regulator, public');
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

// Also ensure getClient sets search_path
const originalConnect = _pool.connect.bind(_pool);

/**
 * Execute a parameterized query (uses the wrapped pool.query)
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await _pool.query(text, params);
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
 * Get a client from the pool for transactions.
 * search_path is set automatically.
 */
async function getClient() {
  const client = await originalConnect();
  await client.query('SET search_path TO regulator, public');
  return client;
}

module.exports = {
  query,
  getClient,
  pool: _pool,
};
