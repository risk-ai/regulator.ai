/**
 * Postgres Connection Adapter
 *
 * Hybrid adapter: Uses native `pg` for local development, @vercel/postgres for Vercel.
 * Detects environment based on POSTGRES_URL format.
 */
/**
 * Execute SQL query with parameters
 */
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
/**
 * Execute SQL query and return first row
 */
export declare function queryOne<T = any>(text: string, params?: any[]): Promise<T | null>;
/**
 * Execute SQL statement (INSERT, UPDATE, DELETE)
 */
export declare function execute(text: string, params?: any[]): Promise<void>;
/**
 * Execute raw SQL (for schema initialization)
 */
export declare function raw(sqlText: string): Promise<void>;
/**
 * Transaction helper
 */
export declare function transaction<T>(callback: () => Promise<T>): Promise<T>;
//# sourceMappingURL=postgres.d.ts.map