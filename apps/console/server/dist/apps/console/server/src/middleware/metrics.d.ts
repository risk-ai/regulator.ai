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
import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
export declare function metricsMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function metricsEndpoint(): (req: Request, res: Response) => Promise<void>;
export declare const metrics: {
    httpRequestDuration: promClient.Histogram<"route" | "method" | "status_code">;
    httpRequestTotal: promClient.Counter<"route" | "method" | "status_code">;
    activeConnections: promClient.Gauge<string>;
    errorTotal: promClient.Counter<"type" | "route">;
};
//# sourceMappingURL=metrics.d.ts.map