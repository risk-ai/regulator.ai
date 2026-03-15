/**
 * Vienna Runtime Postgres Client (Stage 6 Production Backend)
 * 
 * Postgres adapter for staging/production deployments.
 * Uses environment variable to select between SQLite (dev) and Postgres (prod).
 * 
 * Database backend selection:
 * - DATABASE_URL not set → SQLite (local dev)
 * - DATABASE_URL set → Postgres (staging/production)
 */

import { Pool, PoolClient } from 'pg';
import { MIGRATIONS } from './schema';

let pool: Pool | null = null;

/**
 * Initialize Postgres connection pool
 */
export function initializePostgres(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable required for Postgres backend');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    // Recommended Neon settings
    max: 20, // Maximum pool connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[Vienna DB] Unexpected Postgres pool error', err);
  });

  console.log('[Vienna DB] Initialized Postgres connection pool');

  return pool;
}

/**
 * Get existing Postgres pool
 */
export function getPostgresPool(): Pool {
  if (!pool) {
    throw new Error('Postgres pool not initialized. Call initializePostgres() first.');
  }
  return pool;
}

/**
 * Get a client from the pool (for transactions)
 */
export async function getPostgresClient(): Promise<PoolClient> {
  const pgPool = getPostgresPool();
  return await pgPool.connect();
}

/**
 * Run database migrations (Postgres)
 */
export async function runPostgresMigrations(): Promise<void> {
  const pgPool = getPostgresPool();
  const client = await pgPool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const result = await client.query<{ version: number }>(
      'SELECT version FROM migrations ORDER BY version'
    );
    const appliedVersions = new Set(result.rows.map((row) => row.version));

    // Apply pending migrations
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[Vienna DB] Applying Postgres migration ${migration.version}: ${migration.name}`);
        
        // Convert SQLite schema to Postgres (schema.ts should already be Postgres-compatible)
        const postgresSql = migration.sql
          .replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, 'TIMESTAMPTZ DEFAULT NOW()')
          .replace(/TEXT NOT NULL DEFAULT \(datetime\('now'\)\)/g, 'TIMESTAMPTZ NOT NULL DEFAULT NOW()');
        
        await client.query(postgresSql);
        await client.query(
          'INSERT INTO migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
      }
    }

    console.log('[Vienna DB] Postgres migrations complete');
  } finally {
    client.release();
  }
}

/**
 * Close Postgres pool
 */
export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Vienna DB] Postgres connection pool closed');
  }
}

/**
 * Check if Postgres is initialized
 */
export function isPostgresInitialized(): boolean {
  return pool !== null;
}

/**
 * Health check query
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const pgPool = getPostgresPool();
    const result = await pgPool.query('SELECT NOW() as time');
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Vienna DB] Postgres health check failed', error);
    return false;
  }
}
