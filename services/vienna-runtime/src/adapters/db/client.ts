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
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from './schema';
import { 
  initializePostgres, 
  runPostgresMigrations, 
  getPostgresPool,
  closePostgres,
  checkPostgresHealth 
} from './postgres-client';

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'vienna.db');

let db: Database.Database | null = null;

/**
 * Determine which backend to use based on environment
 */
export function getDatabaseBackend(): 'sqlite' | 'postgres' {
  return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}

/**
 * Initialize database connection and run migrations
 * 
 * Automatically selects backend based on DATABASE_URL presence.
 */
export async function initializeDatabase(): Promise<void> {
  const backend = getDatabaseBackend();
  
  if (backend === 'postgres') {
    console.log('[Vienna DB] Detected DATABASE_URL, using Postgres backend');
    initializePostgres();
    await runPostgresMigrations();
    console.log('[Vienna DB] Postgres initialization complete');
  } else {
    console.log('[Vienna DB] No DATABASE_URL, using SQLite backend');
    
    if (db) return;

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create or open database
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Run migrations
    runMigrations(db);
    
    console.log(`[Vienna DB] Initialized SQLite database at ${DB_PATH}`);
  }
}

/**
 * Get existing database connection
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Get applied migrations
  const appliedMigrations = database
    .prepare('SELECT version FROM migrations ORDER BY version')
    .all() as { version: number }[];
  
  const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[Vienna DB] Applying migration ${migration.version}: ${migration.name}`);
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO migrations (version, name) VALUES (?, ?)')
        .run(migration.version, migration.name);
    }
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  const backend = getDatabaseBackend();
  
  if (backend === 'postgres') {
    await closePostgres();
  } else {
    if (db) {
      db.close();
      db = null;
      console.log('[Vienna DB] SQLite connection closed');
    }
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  const backend = getDatabaseBackend();
  return backend === 'postgres' ? getPostgresPool() !== null : db !== null;
}

/**
 * Health check for current database backend
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  const backend = getDatabaseBackend();
  
  if (backend === 'postgres') {
    return await checkPostgresHealth();
  } else {
    try {
      if (!db) return false;
      const result = db.prepare('SELECT 1 as ok').get() as { ok: number } | undefined;
      return result?.ok === 1;
    } catch (error) {
      console.error('[Vienna DB] SQLite health check failed', error);
      return false;
    }
  }
}

/**
 * Get database backend info for observability
 */
export function getDatabaseInfo(): { backend: 'sqlite' | 'postgres'; path?: string; configured: boolean } {
  const backend = getDatabaseBackend();
  
  if (backend === 'postgres') {
    return {
      backend: 'postgres',
      configured: Boolean(process.env.DATABASE_URL),
    };
  } else {
    return {
      backend: 'sqlite',
      path: DB_PATH,
      configured: true,
    };
  }
}
