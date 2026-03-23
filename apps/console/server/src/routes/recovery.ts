/**
 * Recovery Routes (Phase 6.5)
 * 
 * Operator recovery copilot interface.
 * Provides diagnostic intelligence and recovery proposals.
 * 
 * Design constraints:
 * - AI explains, runtime executes, operator approves
 * - No autonomous recovery execution
 * - Recovery copilot = diagnostic intelligence + proposals
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createRecoveryRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();
  
  /**
   * POST /api/v1/recovery/intent
   * Process recovery intent (diagnose, show failures, etc.)
   * 
   * Request body:
   * {
   *   "message": "diagnose system" | "show failures" | "test provider anthropic" | etc.
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "intent": "diagnose_system",
   *     "response": "**System Diagnosis**\n..."
   *   }
   * }
   */
  router.post('/intent', async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      // Validate required fields
      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid field: message (must be string)',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Process recovery intent
      const response = await vienna.processRecoveryIntent(message);
      
      res.json({
        success: true,
        data: {
          message,
          response,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RecoveryRoute] Error processing intent:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RECOVERY_INTENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/recovery/mode
   * Get current runtime mode state
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "mode": "degraded",
   *     "reasons": ["Provider anthropic unavailable"],
   *     "enteredAt": "2026-03-12T...",
   *     "previousMode": "normal",
   *     "fallbackProvidersActive": ["local"],
   *     "availableCapabilities": ["diagnostics", "summarization", ...]
   *   }
   * }
   */
  router.get('/mode', async (req: Request, res: Response) => {
    try {
      const runtimeMode = await vienna.getRuntimeMode();
      
      res.json({
        success: true,
        data: runtimeMode,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RecoveryRoute] Error fetching runtime mode:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RUNTIME_MODE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/recovery/mode/force
   * Force runtime mode transition (operator override)
   * 
   * Request body:
   * {
   *   "mode": "local-only" | "degraded" | "normal" | "operator-only",
   *   "reason": "Operator testing local-only mode"
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "from": "degraded",
   *     "to": "local-only",
   *     "timestamp": "2026-03-12T...",
   *     "reason": "Operator testing local-only mode",
   *     "automatic": false
   *   }
   * }
   */
  router.post('/mode/force', async (req: Request, res: Response) => {
    try {
      const { mode, reason } = req.body;
      
      // Validate required fields
      if (!mode || typeof mode !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid field: mode (must be string)',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      if (!reason || typeof reason !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid field: reason (must be string)',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Validate mode value
      const validModes = ['normal', 'degraded', 'local-only', 'operator-only'];
      if (!validModes.includes(mode)) {
        res.status(400).json({
          success: false,
          error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
          code: 'INVALID_MODE',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Force mode transition
      const transition = await vienna.forceRuntimeMode(mode, reason);
      
      res.json({
        success: true,
        data: transition,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RecoveryRoute] Error forcing runtime mode:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FORCE_MODE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/recovery/health
   * Get provider health status
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "anthropic": {
   *       "provider": "anthropic",
   *       "status": "unavailable",
   *       "lastCheckedAt": "2026-03-12T...",
   *       "consecutiveFailures": 3,
   *       "cooldownUntil": "2026-03-12T...",
   *       ...
   *     },
   *     "local": { ... }
   *   }
   * }
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const providerHealth = await vienna.getProviderHealth();
      
      res.json({
        success: true,
        data: providerHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RecoveryRoute] Error fetching provider health:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROVIDER_HEALTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
