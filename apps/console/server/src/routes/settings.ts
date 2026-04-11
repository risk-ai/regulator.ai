/**
 * Settings Routes — Vienna OS
 * 
 * GET    /api/v1/settings/execution-modes
 * PUT    /api/v1/settings/execution-modes
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres.js';
import { jwtAuthMiddleware, AuthenticatedRequest } from '../middleware/jwtAuth.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

interface ExecutionModesConfig {
  T0: 'direct' | 'passback';
  T1: 'direct' | 'passback';
  T2: 'direct' | 'passback';
  T3: 'direct' | 'passback';
  default: 'direct' | 'passback';
}

const DEFAULT_EXECUTION_MODES: ExecutionModesConfig = {
  T0: 'direct',
  T1: 'direct',
  T2: 'passback',
  T3: 'passback',
  default: 'direct',
};

export function createSettingsRouter(): Router {
  const router = Router();

  // Apply JWT authentication to all settings routes
  router.use(jwtAuthMiddleware);

  /**
   * GET /api/v1/settings/execution-modes
   * Get current tenant's execution mode configuration
   */
  router.get('/execution-modes', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.tenantId) {
        const err: ErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        return res.status(401).json(err);
      }

      // Get tenant settings from database
      const tenant = await queryOne<{ settings: any }>(
        'SELECT settings FROM regulator.tenants WHERE id = $1',
        [req.user.tenantId]
      );

      // Extract execution_modes from settings JSONB, merge with defaults
      const currentSettings = tenant?.settings || {};
      const executionModes = currentSettings.execution_modes || {};
      
      const config: ExecutionModesConfig = {
        ...DEFAULT_EXECUTION_MODES,
        ...executionModes,
      };

      const response: SuccessResponse<ExecutionModesConfig> = {
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('[Settings] Error fetching execution modes:', error);
      
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_MODES_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * PUT /api/v1/settings/execution-modes
   * Update tenant's execution mode configuration
   */
  router.put('/execution-modes', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.tenantId) {
        const err: ErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        return res.status(401).json(err);
      }

      const updates = req.body;

      // Validate request body
      if (!updates || typeof updates !== 'object') {
        const err: ErrorResponse = {
          success: false,
          error: 'Invalid request body',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(err);
      }

      // Validate that all provided values are either 'direct' or 'passback'
      const validModes = ['direct', 'passback'];
      const validTiers = ['T0', 'T1', 'T2', 'T3', 'default'];
      
      for (const [tier, mode] of Object.entries(updates)) {
        if (!validTiers.includes(tier)) {
          const err: ErrorResponse = {
            success: false,
            error: `Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`,
            code: 'INVALID_TIER',
            timestamp: new Date().toISOString(),
          };
          return res.status(400).json(err);
        }

        if (!validModes.includes(mode as string)) {
          const err: ErrorResponse = {
            success: false,
            error: `Invalid mode for ${tier}: ${mode}. Must be 'direct' or 'passback'`,
            code: 'INVALID_MODE',
            timestamp: new Date().toISOString(),
          };
          return res.status(400).json(err);
        }
      }

      // Update tenant settings using JSONB operations
      await query(
        `UPDATE regulator.tenants 
         SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('execution_modes', 
           COALESCE(settings->'execution_modes', '{}'::jsonb) || $2::jsonb
         )
         WHERE id = $1`,
        [req.user.tenantId, JSON.stringify(updates)]
      );

      // Return updated configuration
      const tenant = await queryOne<{ settings: any }>(
        'SELECT settings FROM regulator.tenants WHERE id = $1',
        [req.user.tenantId]
      );

      const currentSettings = tenant?.settings || {};
      const executionModes = currentSettings.execution_modes || {};
      
      const config: ExecutionModesConfig = {
        ...DEFAULT_EXECUTION_MODES,
        ...executionModes,
      };

      const response: SuccessResponse<ExecutionModesConfig> = {
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('[Settings] Error updating execution modes:', error);
      
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_MODES_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}