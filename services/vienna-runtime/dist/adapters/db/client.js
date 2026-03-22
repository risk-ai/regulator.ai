"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseBackend = getDatabaseBackend;
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.isDatabaseInitialized = isDatabaseInitialized;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.getDatabaseInfo = getDatabaseInfo;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const schema_1 = require("./schema");
const postgres_client_1 = require("./postgres-client");
const DATA_DIR = path_1.default.join(__dirname, '../../../data');
const DB_PATH = path_1.default.join(DATA_DIR, 'vienna.db');
let db = null;
/**
 * Determine which backend to use based on environment
 */
function getDatabaseBackend() {
    return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}
/**
 * Initialize database connection and run migrations
 *
 * Automatically selects backend based on DATABASE_URL presence.
 */
async function initializeDatabase() {
    const backend = getDatabaseBackend();
    if (backend === 'postgres') {
        console.log('[Vienna DB] Detected DATABASE_URL, using Postgres backend');
        (0, postgres_client_1.initializePostgres)();
        await (0, postgres_client_1.runPostgresMigrations)();
        console.log('[Vienna DB] Postgres initialization complete');
    }
    else {
        console.log('[Vienna DB] No DATABASE_URL, using SQLite backend');
        if (db)
            return;
        // Ensure data directory exists
        if (!fs_1.default.existsSync(DATA_DIR)) {
            fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
        }
        // Create or open database
        db = new better_sqlite3_1.default(DB_PATH);
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
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}
/**
 * Run database migrations
 */
function runMigrations(database) {
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
        .all();
    const appliedVersions = new Set(appliedMigrations.map((m) => m.version));
    // Apply pending migrations
    for (const migration of schema_1.MIGRATIONS) {
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
async function closeDatabase() {
    const backend = getDatabaseBackend();
    if (backend === 'postgres') {
        await (0, postgres_client_1.closePostgres)();
    }
    else {
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
function isDatabaseInitialized() {
    const backend = getDatabaseBackend();
    return backend === 'postgres' ? (0, postgres_client_1.getPostgresPool)() !== null : db !== null;
}
/**
 * Health check for current database backend
 */
async function checkDatabaseHealth() {
    const backend = getDatabaseBackend();
    if (backend === 'postgres') {
        return await (0, postgres_client_1.checkPostgresHealth)();
    }
    else {
        try {
            if (!db)
                return false;
            const result = db.prepare('SELECT 1 as ok').get();
            return result?.ok === 1;
        }
        catch (error) {
            console.error('[Vienna DB] SQLite health check failed', error);
            return false;
        }
    }
}
/**
 * Get database backend info for observability
 */
function getDatabaseInfo() {
    const backend = getDatabaseBackend();
    if (backend === 'postgres') {
        return {
            backend: 'postgres',
            configured: Boolean(process.env.DATABASE_URL),
        };
    }
    else {
        return {
            backend: 'sqlite',
            path: DB_PATH,
            configured: true,
        };
    }
}
//# sourceMappingURL=client.js.map