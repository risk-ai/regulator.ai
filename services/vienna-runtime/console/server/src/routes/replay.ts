/**
 * Replay Routes
 * 
 * GET /api/v1/replay
 * GET /api/v1/replay/:envelopeId
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type {
  SuccessResponse,
  ErrorResponse,
  ReplayResponse,
  ReplayEvent,
  ReplayQueryParams,
} from '../types/api.js';

export function createReplayRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/replay
   * Query replay log with filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: ReplayQueryParams = {
        objective_id: req.query.objective_id as string | undefined,
        envelope_id: req.query.envelope_id as string | undefined,
        event_type: req.query.event_type as any,
        start: req.query.start as string | undefined,
        end: req.query.end as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      
      const result = await vienna.queryReplay(params);
      
      const responseData: ReplayResponse = {
        events: result.events,
        total: result.total,
        has_more: result.has_more,
      };
      
      const response: SuccessResponse<ReplayResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REPLAY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/replay/:envelopeId
   * Get all replay events for specific envelope
   */
  router.get('/:envelopeId', async (req: Request, res: Response) => {
    try {
      const events = await vienna.getEnvelopeReplay(req.params.envelopeId);
      
      const response: SuccessResponse<ReplayEvent[]> = {
        success: true,
        data: events,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENVELOPE_REPLAY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
