/**
 * Vienna Runtime Database Client (Stage 6 - Multi-Backend)
 *
 * Automatic backend selection:
 * - DATABASE_URL not set → SQLite (local development)
 * - DATABASE_URL set → Postgres (staging/production)
 *
 * This file provides a unified interface for both backends.
 * Repository implementations remain backend-agnostic.
 */
import Database from 'better-sqlite3';
/**
 * Determine which backend to use based on environment
 */
export declare function getDatabaseBackend(): 'sqlite' | 'postgres';
/**
 * Initialize database connection and run migrations
 *
 * Automatically selects backend based on DATABASE_URL presence.
 */
export declare function initializeDatabase(): Promise<void>;
/**
 * Get existing database connection
 */
export declare function getDatabase(): Database.Database;
/**
 * Close database connection
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Check if database is initialized
 */
export declare function isDatabaseInitialized(): boolean;
/**
 * Health check for current database backend
 */
export declare function checkDatabaseHealth(): Promise<boolean>;
/**
 * Get database backend info for observability
 */
export declare function getDatabaseInfo(): {
    backend: 'sqlite' | 'postgres';
    path?: string;
    configured: boolean;
};
//# sourceMappingURL=client.d.ts.map