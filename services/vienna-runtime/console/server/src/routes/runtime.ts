/**
 * Runtime Routes
 * 
 * Real-time execution visibility for Envelope Visualizer.
 * Shows envelope state, dependencies, warrants, verification.
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { RuntimeStatsService } from '../services/runtimeStatsService.js';
import type { TimeWindow } from '../types/runtimeStats.js';

export function createRuntimeRouter(
  vienna: ViennaRuntimeService,
  statsService?: RuntimeStatsService
): Router {
  const router = Router();
  
  /**
   * GET /api/v1/runtime/envelopes
   * List all envelopes (recent first)
   */
  router.get('/envelopes', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const status = req.query.status as string | undefined;
      const objectiveId = req.query.objective_id as string | undefined;
      
      const envelopes = await vienna.getRuntimeEnvelopes({
        limit,
        status,
        objectiveId,
      });
      
      res.json({
        success: true,
        data: envelopes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RuntimeRoute] Error fetching envelopes:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RUNTIME_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/runtime/envelopes/:id
   * Get envelope detail
   */
  router.get('/envelopes/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const envelope = await vienna.getRuntimeEnvelope(id);
      
      if (!envelope) {
        res.status(404).json({
          success: false,
          error: `Envelope not found: ${id}`,
          code: 'ENVELOPE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.json({
        success: true,
        data: envelope,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RuntimeRoute] Error fetching envelope:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RUNTIME_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/runtime/objectives/:id/execution
   * Get execution tree for objective
   */
  router.get('/objectives/:id/execution', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const execution = await vienna.getObjectiveExecution(id);
      
      if (!execution) {
        res.status(404).json({
          success: false,
          error: `Objective execution not found: ${id}`,
          code: 'OBJECTIVE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.json({
        success: true,
        data: execution,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RuntimeRoute] Error fetching objective execution:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RUNTIME_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/runtime/stats
   * Get runtime statistics (Phase 5C)
   */
  router.get('/stats', async (req: Request, res: Response) => {
    if (!statsService) {
      res.status(503).json({
        success: false,
        error: 'Runtime stats service not available',
        code: 'STATS_SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const window = (req.query.window as TimeWindow) || '5m';
      
      // Validate window
      const validWindows: TimeWindow[] = ['5m', '15m', '1h', '24h'];
      if (!validWindows.includes(window)) {
        res.status(400).json({
          success: false,
          error: `Invalid time window. Must be one of: ${validWindows.join(', ')}`,
          code: 'INVALID_WINDOW',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const stats = await statsService.getRuntimeStats(window);
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RuntimeRoute] Error fetching stats:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RUNTIME_STATS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
