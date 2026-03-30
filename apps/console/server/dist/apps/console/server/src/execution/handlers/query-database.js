/**
 * Query Database Handler
 *
 * Execute read-only SQL queries (SELECT only)
 */
import { query } from '../../db/postgres.js';
export const queryDatabaseHandler = {
    name: 'query-database',
    description: 'Execute read-only SQL queries',
    async execute(context) {
        try {
            const startTime = Date.now();
            const { sql, params = [] } = context.payload;
            if (!sql) {
                return {
                    success: false,
                    error: 'SQL query required',
                };
            }
            // Security: Only allow SELECT queries
            const trimmedSql = sql.trim().toUpperCase();
            if (!trimmedSql.startsWith('SELECT')) {
                return {
                    success: false,
                    error: 'Only SELECT queries are allowed',
                };
            }
            // Block dangerous keywords
            const dangerousKeywords = [
                'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
                'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE',
            ];
            for (const keyword of dangerousKeywords) {
                if (trimmedSql.includes(keyword)) {
                    return {
                        success: false,
                        error: `Keyword "${keyword}" not allowed in read-only queries`,
                    };
                }
            }
            // Execute query with timeout
            let rows = [];
            try {
                rows = await query(sql, params);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Query failed: ${error.message}`,
                };
            }
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    rows,
                    rowCount: rows.length,
                    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
                    executionTimeMs: executionTime,
                    timestamp: new Date().toISOString(),
                },
                executionTimeMs: executionTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Query execution failed',
            };
        }
    },
    validate(payload) {
        if (!payload.sql || typeof payload.sql !== 'string') {
            return false;
        }
        if (payload.params && !Array.isArray(payload.params)) {
            return false;
        }
        return true;
    },
};
export default queryDatabaseHandler;
//# sourceMappingURL=query-database.js.map