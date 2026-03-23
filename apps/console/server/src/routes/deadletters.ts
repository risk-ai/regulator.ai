/**
 * Dead Letters Routes
 * 
 * Failed envelope visibility and retry paths.
 */

import { Router, Request, Response } from 'express';
import type { ObjectivesService } from '../services/objectivesService.js';

export function createDeadLettersRouter(objectivesService: ObjectivesService): Router {
  const router = Router();
  
  /**
   * GET /api/v1/deadletters
   * Get list of dead letters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const objectiveId = req.query.objectiveId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const deadLetters = await objectivesService.getDeadLetters({
        objectiveId,
        limit,
      });
      
      res.json({
        success: true,
        data: {
          deadLetters,
          total: deadLetters.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DeadLettersRoute] Error fetching dead letters:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DEADLETTERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/deadletters/:id/requeue
   * Retry dead letter
   */
  router.post('/:id/requeue', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { operator, reason } = req.body;
      
      if (!operator) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: operator',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const result = await objectivesService.retryDeadLetter(
        id,
        operator,
        reason || 'Operator requested retry'
      );
      
      res.json({
        success: result.status === 'completed',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DeadLettersRoute] Error retrying dead letter:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REQUEUE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
