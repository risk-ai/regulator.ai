/**
 * Structured Logging Middleware
 * 
 * Logs all requests with timing, errors, and context
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './jwtAuth.js';

interface LogContext {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  query?: any;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const authReq = req as AuthenticatedRequest;

  // Log request start
  const context: LogContext = {
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
  res.send = function (data: any): Response {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    context.statusCode = res.statusCode;
    context.duration = duration;

    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(context));
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(context));
    } else if (duration > 1000) {
      console.warn('[SLOW]', JSON.stringify(context));
    } else {
      console.log('[INFO]', JSON.stringify(context));
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error Logging Middleware
 */
export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthenticatedRequest;
  
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
  private static metrics: Map<string, number[]> = new Map();

  static track(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log slow operations
    if (duration > 100) {
      console.warn(`[SLOW_OPERATION] ${operation}: ${duration}ms`);
    }
  }

  static getStats(operation: string): { avg: number; p95: number; p99: number } | null {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, p95, p99 };
  }

  static getAllStats() {
    const stats: Record<string, any> = {};
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
export async function monitoredQuery<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    PerformanceMonitor.track(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[QUERY_ERROR] ${operation} failed after ${duration}ms:`, error);
    throw error;
  }
}
