/**
 * Structured Logging Middleware
 *
 * Logs all requests with timing, errors, and context
 */
import { Request, Response, NextFunction } from 'express';
export declare function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Error Logging Middleware
 */
export declare function errorLoggingMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void;
/**
 * Performance Monitoring
 */
export declare class PerformanceMonitor {
    private static metrics;
    static track(operation: string, duration: number): void;
    static getStats(operation: string): {
        avg: number;
        p95: number;
        p99: number;
    } | null;
    static getAllStats(): Record<string, any>;
    static reset(): void;
}
/**
 * Query Performance Wrapper
 */
export declare function monitoredQuery<T>(operation: string, queryFn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=logging.d.ts.map