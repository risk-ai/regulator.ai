/**
 * Postgres Connection Adapter
 *
 * Hybrid adapter: Uses native `pg` for local development, @vercel/postgres for Vercel.
 * Detects environment based on POSTGRES_URL format.
 */
import pkg from 'pg';
const { Pool } = pkg;
// Detect if running on Vercel (connection string includes vercel.app or uses pooling params)
const isVercel = process.env.VERCEL === '1' ||
    (process.env.POSTGRES_URL?.includes('vercel.app') ||
        process.env.POSTGRES_URL?.includes('?pgbouncer=true'));
let pool = null;
/**
 * Get connection pool (lazy initialization)
 */
function getPool() {
    if (!pool) {
        if (isVercel) {
            // Use @vercel/postgres on Vercel
            const vercelPg = require('@vercel/postgres');
            pool = vercelPg.sql;
        }
        else {
            // Use native pg for local development
            pool = new Pool({
                connectionString: process.env.POSTGRES_URL,
                // For local postgres without password
                ...(process.env.POSTGRES_URL?.includes('localhost') ? {
                    ssl: false
                } : {})
            });
        }
    }
    return pool;
}
/**
 * Execute SQL query with parameters
 */
export async function query(text, params = []) {
    const client = getPool();
    if (isVercel) {
        // Vercel Postgres (@vercel/postgres)
        const result = await client.query(text, params);
        return result.rows;
    }
    else {
        // Native pg
        const result = await client.query(text, params);
        return result.rows;
    }
}
/**
 * Execute SQL query and return first row
 */
export async function queryOne(text, params = []) {
    const rows = await query(text, params);
    return rows[0] || null;
}
/**
 * Execute SQL statement (INSERT, UPDATE, DELETE)
 */
export async function execute(text, params = []) {
    await query(text, params);
}
/**
 * Execute raw SQL (for schema initialization)
 */
export async function raw(sqlText) {
    const client = getPool();
    if (isVercel) {
        await client.query(sqlText);
    }
    else {
        await client.query(sqlText);
    }
}
/**
 * Transaction helper
 */
export async function transaction(callback) {
    const client = getPool();
    if (isVercel) {
        // Vercel Postgres transactions
        await client.query('BEGIN');
        try {
            const result = await callback();
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }
    else {
        // Native pg transactions
        const txClient = await client.connect();
        try {
            await txClient.query('BEGIN');
            const result = await callback();
            await txClient.query('COMMIT');
            return result;
        }
        catch (error) {
            await txClient.query('ROLLBACK');
            throw error;
        }
        finally {
            txClient.release();
        }
    }
}
