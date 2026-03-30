/**
 * Health Check & Metrics Endpoint
 * 
 * Provides system health status and performance metrics
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/postgres.js';
import { PerformanceMonitor } from '../middleware/logging.js';

export function createHealthRouter(): Router {
  const router = Router();

  /**
   * Basic health check
   * GET /health
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Check database connectivity
      const dbStart = Date.now();
      await query('SELECT 1');
      const dbLatency = Date.now() - dbStart;

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: {
            status: 'healthy',
            latency_ms: dbLatency
          },
          memory: {
            status: 'healthy',
            usage: process.memoryUsage(),
            rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          },
          cpu: {
            status: 'healthy',
            usage: process.cpuUsage()
          }
        }
      };

      // Check if any service is unhealthy
      if (dbLatency > 100) {
        health.checks.database.status = 'degraded';
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      console.error('[HealthCheck] Error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Detailed metrics
   * GET /health/metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime_seconds: process.uptime(),
        memory: {
          rss_bytes: process.memoryUsage().rss,
          heap_used_bytes: process.memoryUsage().heapUsed,
          heap_total_bytes: process.memoryUsage().heapTotal,
          external_bytes: process.memoryUsage().external
        },
        cpu: process.cpuUsage(),
        performance: PerformanceMonitor.getAllStats(),
        database: {
          pool: {
            // PostgreSQL pool stats would go here
            // totalCount: pool.totalCount,
            // idleCount: pool.idleCount,
            // waitingCount: pool.waitingCount
          }
        }
      };

      res.json(metrics);
    } catch (error) {
      console.error('[Metrics] Error:', error);
      res.status(500).json({
        error: 'Failed to retrieve metrics'
      });
    }
  });

  /**
   * Readiness probe (for Kubernetes/Docker)
   * GET /health/ready
   */
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check if all critical dependencies are ready
      await query('SELECT 1');
      
      res.json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Liveness probe (for Kubernetes/Docker)
   * GET /health/live
   */
  router.get('/live', (req: Request, res: Response) => {
    // Simple check - is the process alive?
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  return router;
}
