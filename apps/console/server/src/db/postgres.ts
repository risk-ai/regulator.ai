/**
 * Postgres Connection Adapter
 * 
 * Uses native `pg` Pool everywhere (local + Vercel).
 * @vercel/postgres `sql` object is NOT used — its connection pooling
 * means SET search_path doesn't stick between .query() calls.
 * 
 * Instead we use pg.Pool with `on('connect')` to set search_path once
 * per connection, which works reliably with both Neon and local Postgres.
 */

import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;

let pool: PoolType | null = null;

/**
 * Resolve connection string from environment.
 * Vercel Postgres integration sets POSTGRES_URL; local dev uses DATABASE_URL.
 */
function getConnectionString(): string | undefined {
  return process.env.POSTGRES_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL_NON_POOLING;
}

/**
 * Get connection pool (lazy initialization)
 */
function getPool(): PoolType {
  if (!pool) {
    const connString = getConnectionString();
    if (connString) {
      pool = new Pool({
        connectionString: connString,
        max: process.env.VERCEL === '1' ? 5 : 50, // Lower for serverless cold starts
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        // Neon requires SSL
        ssl: connString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      // Fallback to default local connection
      pool = new Pool({
        host: '/var/run/postgresql',
        database: 'vienna_dev',
        port: 5432,
      });
    }

    // Set search_path on EVERY new connection — this is the reliable way
    pool.on('connect', (client: any) => {
      client.query("SET search_path TO regulator, public");
    });
  }
  return pool;
}

/**
 * Execute SQL query with parameters
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
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
  await getPool().query(sqlText);
}

/**
 * Transaction helper — uses a dedicated client for atomicity
 */
export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
