/**
 * Postgres Connection Adapter
 * 
 * Hybrid adapter: Uses native `pg` for local development, @vercel/postgres for Vercel.
 * Detects environment based on POSTGRES_URL format.
 */

import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;

// Detect if running on Vercel (connection string includes vercel.app or uses pooling params)
const isVercel = process.env.VERCEL === '1' || 
                 (process.env.POSTGRES_URL?.includes('vercel.app') || 
                  process.env.POSTGRES_URL?.includes('?pgbouncer=true'));

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
      // For local development, use Unix socket if no password provided
      const isLocal = !process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL.includes('localhost') ||
                      process.env.POSTGRES_URL.includes('///');
      
      if (isLocal) {
        // Extract database name from connection string if present
        const dbMatch = process.env.POSTGRES_URL?.match(/\/\/\/([^?]+)/);
        const database = dbMatch ? dbMatch[1] : 'vienna_dev';
        
        pool = new Pool({
          host: '/var/run/postgresql',  // Unix socket
          database,
          port: 5432
        });
      } else {
        pool = new Pool({
          connectionString: process.env.POSTGRES_URL
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
    // Vercel Postgres (@vercel/postgres)
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
