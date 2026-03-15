/**
 * Vienna Runtime Database Client
 * 
 * SQLite client for local development.
 * Production will use Postgres via Neon, but interface remains compatible.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from './schema';

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'vienna.db');

let db: Database.Database | null = null;

/**
 * Initialize database connection and run migrations
 */
export function initializeDatabase(): Database.Database {
  if (db) return db;

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
  
  return db;
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
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Vienna DB] Database connection closed');
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}
