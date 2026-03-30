/**
 * Prometheus Metrics Middleware
 *
 * Tracks:
 * - HTTP request duration
 * - Request count by endpoint
 * - Error rates
 * - Active connections
 * - Memory usage
 */
import promClient from 'prom-client';
// Enable default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ prefix: 'vienna_' });
// Custom metrics
const httpRequestDuration = new promClient.Histogram({
    name: 'vienna_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});
const httpRequestTotal = new promClient.Counter({
    name: 'vienna_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
const activeConnections = new promClient.Gauge({
    name: 'vienna_active_connections',
    help: 'Number of active HTTP connections',
});
const errorTotal = new promClient.Counter({
    name: 'vienna_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'route'],
});
export function metricsMiddleware() {
    return (req, res, next) => {
        const start = Date.now();
        activeConnections.inc();
        // Capture route pattern (remove IDs for cleaner metrics)
        const route = req.route?.path || req.path.replace(/\/[0-9a-f-]{36}/gi, '/:id');
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const labels = {
                method: req.method,
                route,
                status_code: res.statusCode.toString(),
            };
            httpRequestDuration.observe(labels, duration);
            httpRequestTotal.inc(labels);
            activeConnections.dec();
            // Track errors
            if (res.statusCode >= 400) {
                errorTotal.inc({
                    type: res.statusCode >= 500 ? 'server_error' : 'client_error',
                    route,
                });
            }
        });
        next();
    };
}
export function metricsEndpoint() {
    return async (req, res) => {
        res.set('Content-Type', promClient.register.contentType);
        const metrics = await promClient.register.metrics();
        res.send(metrics);
    };
}
export const metrics = {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    errorTotal,
};
//# sourceMappingURL=metrics.js.map