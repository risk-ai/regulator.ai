/**
 * Structured Logging Middleware
 *
 * Logs all requests with timing, errors, and context
 */
export function requestLoggingMiddleware(req, res, next) {
    const startTime = Date.now();
    const authReq = req;
    // Log request start
    const context = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId: authReq.user?.userId,
        tenantId: authReq.user?.tenantId,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        query: req.query
    };
    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;
        const duration = Date.now() - startTime;
        context.statusCode = res.statusCode;
        context.duration = duration;
        // Log based on status code
        if (res.statusCode >= 500) {
            console.error('[ERROR]', JSON.stringify(context));
        }
        else if (res.statusCode >= 400) {
            console.warn('[WARN]', JSON.stringify(context));
        }
        else if (duration > 1000) {
            console.warn('[SLOW]', JSON.stringify(context));
        }
        else {
            console.log('[INFO]', JSON.stringify(context));
        }
        return originalSend.call(this, data);
    };
    next();
}
/**
 * Error Logging Middleware
 */
export function errorLoggingMiddleware(err, req, res, next) {
    const authReq = req;
    const errorContext = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId: authReq.user?.userId,
        tenantId: authReq.user?.tenantId,
        error: err.message,
        stack: err.stack,
        statusCode: res.statusCode || 500
    };
    console.error('[EXCEPTION]', JSON.stringify(errorContext));
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
}
/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
    static metrics = new Map();
    static track(operation, duration) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        this.metrics.get(operation).push(duration);
        // Log slow operations
        if (duration > 100) {
            console.warn(`[SLOW_OPERATION] ${operation}: ${duration}ms`);
        }
    }
    static getStats(operation) {
        const durations = this.metrics.get(operation);
        if (!durations || durations.length === 0)
            return null;
        const sorted = [...durations].sort((a, b) => a - b);
        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        return { avg, p95, p99 };
    }
    static getAllStats() {
        const stats = {};
        for (const [operation, _] of this.metrics) {
            stats[operation] = this.getStats(operation);
        }
        return stats;
    }
    static reset() {
        this.metrics.clear();
    }
}
/**
 * Query Performance Wrapper
 */
export async function monitoredQuery(operation, queryFn) {
    const start = Date.now();
    try {
        const result = await queryFn();
        const duration = Date.now() - start;
        PerformanceMonitor.track(operation, duration);
        return result;
    }
    catch (error) {
        const duration = Date.now() - start;
        console.error(`[QUERY_ERROR] ${operation} failed after ${duration}ms:`, error);
        throw error;
    }
}
//# sourceMappingURL=logging.js.map