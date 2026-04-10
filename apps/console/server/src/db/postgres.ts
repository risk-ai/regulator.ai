/**
 * Postgres Connection Adapter
 * 
 * Hybrid adapter: Uses native `pg` for local development, @vercel/postgres for Vercel.
 * Detects environment based on DATABASE_URL format.
 */

import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;

// Detect if running on Vercel (connection string includes vercel.app or uses pooling params)
const isVercel = process.env.VERCEL === '1' || 
                 (process.env.DATABASE_URL?.includes('vercel.app') || 
                  process.env.DATABASE_URL?.includes('?pgbouncer=true'));

let pool: any = null;

/**
 * Get connection pool (lazy initialization)
 */
function getPool() {
  if (!pool) {
    if (isVercel) {
      // Use @vercel/postgres on Vercel
      const vercelPg = require('@vercel/postgres');
      pool = vercelPg.sql;
    } else {
      // Use native pg for local development
      // Always use connection string if provided
      if (process.env.DATABASE_URL) {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 50, // Increased from default 10 for better concurrency
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        pool.on('connect', (client: any) => {
          client.query("SET search_path TO regulator, public");
        });
      } else {
        // Fallback to default local connection
        pool = new Pool({
          host: '/var/run/postgresql',  // Unix socket
          database: 'vienna_dev',
          port: 5432
        });
      }
    }
  }
  return pool;
}

/**
 * Execute SQL query with parameters
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const client = getPool();
  
  if (isVercel) {
    // Vercel Postgres (@vercel/postgres) — must set search_path per query
    await client.query("SET search_path TO regulator, public");
    const result = await client.query(text, params);
    return result.rows as T[];
  } else {
    // Native pg
    const result = await client.query(text, params);
    return result.rows as T[];
  }
}

/**
 * Execute SQL query and return first row
 */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute SQL statement (INSERT, UPDATE, DELETE)
 */
export async function execute(text: string, params: any[] = []): Promise<void> {
  await query(text, params);
}

/**
 * Execute raw SQL (for schema initialization)
 */
export async function raw(sqlText: string): Promise<void> {
  const client = getPool();
  
  if (isVercel) {
    // Vercel Postgres (@vercel/postgres) — must set search_path per query
    await client.query("SET search_path TO regulator, public");
    await client.query(sqlText);
  } else {
    await client.query(sqlText);
  }
}

/**
 * Transaction helper
 */
export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  const client = getPool();
  
  if (isVercel) {
    // Vercel Postgres transactions
    await client.query("SET search_path TO regulator, public");
    await client.query('BEGIN');
    try {
      const result = await callback();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } else {
    // Native pg transactions
    const txClient = await (client as PoolType).connect();
    try {
      await txClient.query('BEGIN');
      const result = await callback();
      await txClient.query('COMMIT');
      return result;
    } catch (error) {
      await txClient.query('ROLLBACK');
      throw error;
    } finally {
      txClient.release();
    }
  }
}
