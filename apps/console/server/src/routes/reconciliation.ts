/**
 * Reconciliation Routes
 * 
 * Phase 10.5: Read-only endpoints for reconciliation visibility
 * Exposes execution leases, timeline, breakers, and metrics
 */

import { Router, Request, Response } from 'express';
import { ReconciliationService } from '../services/reconciliationService.js';

export function createReconciliationRouter(): Router {
  const router = Router();
  const reconciliationService = new ReconciliationService();

  /**
   * GET /api/v1/reconciliation/leases
   * Get active execution leases
   */
  router.get('/leases', async (req: Request, res: Response) => {
    try {
      const leases = await reconciliationService.getExecutionLeases();

      res.json({
        success: true,
        data: {
          active_leases: leases,
          total: leases.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error fetching leases:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LEASES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/reconciliation/timeline
   * Get reconciliation timeline events
   */
  router.get('/timeline', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      if (limit < 1 || limit > 500) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 500',
          code: 'INVALID_LIMIT',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { events, total } = await reconciliationService.getTimeline(limit);

      res.json({
        success: true,
        data: {
          events,
          total,
          limit,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error fetching timeline:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TIMELINE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/reconciliation/breakers
   * Get circuit breaker status
   */
  router.get('/breakers', async (req: Request, res: Response) => {
    try {
      const breakers = await reconciliationService.getCircuitBreakers();

      res.json({
        success: true,
        data: {
          breakers,
          total: breakers.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error fetching breakers:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BREAKERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/reconciliation/metrics
   * Get reconciliation metrics (hourly aggregates)
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await reconciliationService.getMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error fetching metrics:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'METRICS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/reconciliation/safe-mode
   * Get current safe mode status
   */
  router.get('/safe-mode', async (req: Request, res: Response) => {
    try {
      const status = await reconciliationService.getSafeModeStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error fetching safe mode status:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAFE_MODE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/reconciliation/safe-mode
   * Enable safe mode
   * 
   * PHASE 11 MIGRATION: Legacy endpoint (use /api/v1/intent instead)
   */
  router.post('/safe-mode', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Reason required',
          code: 'INVALID_REASON',
          timestamp: new Date().toISOString(),
        });
      }

      // HYBRID ENFORCEMENT (Phase 11): Log bypass warning
      console.warn('[DIRECT_ACTION_BYPASS] action=enableSafeMode source=POST:/safe-mode migration_required=true');
      console.warn('[DIRECT_ACTION_BYPASS] Use POST /api/v1/intent with intent_type=set_safe_mode instead');

      await reconciliationService.enableSafeMode(reason, 'operator');
      const status = await reconciliationService.getSafeModeStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error enabling safe mode:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAFE_MODE_ENABLE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * DELETE /api/v1/reconciliation/safe-mode
   * Disable safe mode
   * 
   * PHASE 11 MIGRATION: Legacy endpoint (use /api/v1/intent instead)
   */
  router.delete('/safe-mode', async (req: Request, res: Response) => {
    try {
      // HYBRID ENFORCEMENT (Phase 11): Log bypass warning
      console.warn('[DIRECT_ACTION_BYPASS] action=disableSafeMode source=DELETE:/safe-mode migration_required=true');
      console.warn('[DIRECT_ACTION_BYPASS] Use POST /api/v1/intent with intent_type=set_safe_mode instead');

      await reconciliationService.disableSafeMode('operator');
      const status = await reconciliationService.getSafeModeStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReconciliationRoute] Error disabling safe mode:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAFE_MODE_DISABLE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
