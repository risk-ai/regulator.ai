/**
 * System Health Dashboard Route
 * 
 * Comprehensive health check for monitoring/alerting
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function createSystemHealthRouter() {
  const router = Router();

  router.get('/api/v1/system/health/detailed', async (req: Request, res: Response) => {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        overall_status: 'healthy',
        checks: {} as Record<string, any>,
      };

      // Database check
      try {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const start = Date.now();
        await pool.query("SET search_path TO regulator, public");
        await pool.query('SELECT 1');
        await pool.end();
        health.checks.database = {
          status: 'healthy',
          latency_ms: Date.now() - start,
        };
      } catch (error) {
        health.overall_status = 'degraded';
        health.checks.database = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown',
        };
      }

      // Disk space check
      try {
        const { stdout } = await execAsync("df -h ~/.openclaw | tail -1 | awk '{print $5}' | sed 's/%//'");
        const usage = parseInt(stdout.trim());
        health.checks.disk = {
          status: usage > 90 ? 'critical' : usage > 75 ? 'warning' : 'healthy',
          usage_percent: usage,
        };
        if (usage > 75) health.overall_status = 'degraded';
      } catch (error) {
        health.checks.disk = {
          status: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown',
        };
      }

      // Memory check
      try {
        const usage = process.memoryUsage();
        health.checks.memory = {
          status: 'healthy',
          rss_mb: Math.round(usage.rss / 1024 / 1024),
          heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
        };
      } catch (error) {
        health.checks.memory = {
          status: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown',
        };
      }

      // Uptime check
      health.checks.uptime = {
        status: 'healthy',
        seconds: Math.floor(process.uptime()),
        started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      };


      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
