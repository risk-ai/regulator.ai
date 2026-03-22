/**
 * Service Management Routes
 * 
 * System service status and control.
 * Service restarts route through Vienna Core governance.
 * 
 * AUTHORITY BOUNDARY:
 * - This route calls ViennaRuntimeService only
 * - ViennaRuntimeService creates governed recovery objectives
 * - Never call service adapters directly
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createServicesRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();
  
  /**
   * GET /api/v1/system/services
   * Get status of all services
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const services = await vienna.getServices();
      
      res.json({
        success: true,
        data: {
          services,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ServicesRoute] Error fetching services:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVICES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/system/services/:serviceName/restart
   * Restart service (creates governed objective)
   */
  router.post('/:serviceName/restart', async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const operator = req.body.operator || 'unknown';
      
      // Map service name to correct identifier
      // Dashboard may send "openclaw-gateway", but backend uses "openclaw"
      const serviceId = serviceName === 'openclaw-gateway' ? 'openclaw' : serviceName;
      
      // Call Vienna Core to create recovery objective
      const result = await vienna.restartService(serviceId, operator);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ServicesRoute] Error restarting service:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RESTART_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/system/services/:serviceName
   * Get status of specific service
   */
  router.get('/:serviceName', async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      
      const services = await vienna.getServices();
      const service = services.find(s => s.service === serviceName);
      
      if (!service) {
        res.status(404).json({
          success: false,
          error: `Service not found: ${serviceName}`,
          code: 'SERVICE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      res.json({
        success: true,
        data: service,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ServicesRoute] Error fetching service:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVICE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
