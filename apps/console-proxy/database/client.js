/**
 * Database Client
 * Shared PostgreSQL connection pool
 * 
 * IMPORTANT: All queries go through the query() function which explicitly
 * sets search_path before each query to avoid Vercel cold-start race conditions.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false },
});

/**
 * Execute a parameterized query with guaranteed search_path.
 * 
 * Uses pool.connect() + explicit SET search_path instead of pool.query()
 * to eliminate the cold-start race condition where pool.on('connect') 
 * hasn't completed before the first query runs.
 */
async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO regulator, public');
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn('[DB] Slow query:', { text, duration });
    }
    
    return res;
  } catch (error) {
    console.error('[DB] Query failed:', { text, error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for transactions.
 * Caller MUST set search_path and release the client.
 */
async function getClient() {
  const client = await pool.connect();
  await client.query('SET search_path TO regulator, public');
  return client;
}

module.exports = {
  query,
  getClient,
  pool,
};
