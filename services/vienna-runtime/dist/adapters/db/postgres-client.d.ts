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
/**
 * Initialize Postgres connection pool
 */
export declare function initializePostgres(): Pool;
/**
 * Get existing Postgres pool
 */
export declare function getPostgresPool(): Pool;
/**
 * Get a client from the pool (for transactions)
 */
export declare function getPostgresClient(): Promise<PoolClient>;
/**
 * Run database migrations (Postgres)
 */
export declare function runPostgresMigrations(): Promise<void>;
/**
 * Close Postgres pool
 */
export declare function closePostgres(): Promise<void>;
/**
 * Check if Postgres is initialized
 */
export declare function isPostgresInitialized(): boolean;
/**
 * Health check query
 */
export declare function checkPostgresHealth(): Promise<boolean>;
//# sourceMappingURL=postgres-client.d.ts.map