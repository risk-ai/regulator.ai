/**
 * Audit Routes
 * 
 * GET /api/v1/audit
 * GET /api/v1/audit/:id
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type {
  SuccessResponse,
  ErrorResponse,
  AuditResponse,
  AuditRecord,
  AuditQueryParams,
} from '../types/api.js';

export function createAuditRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/audit
   * Query audit records with filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params: AuditQueryParams = {
        objective_id: req.query.objective_id as string | undefined,
        envelope_id: req.query.envelope_id as string | undefined,
        thread_id: req.query.thread_id as string | undefined,
        action: req.query.action as string | undefined,
        operator: req.query.operator as string | undefined,
        result: req.query.result as any,
        start: req.query.start as string | undefined,
        end: req.query.end as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      
      const result = await vienna.queryAudit(params);
      
      const responseData: AuditResponse = {
        records: result.records,
        total: result.total,
        has_more: result.has_more,
      };
      
      const response: SuccessResponse<AuditResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUDIT_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/audit/:id
   * Get specific audit record by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const record = await vienna.getAuditRecord(req.params.id);
      
      if (!record) {
        const err: ErrorResponse = {
          success: false,
          error: 'Audit record not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(err);
        return;
      }
      
      const response: SuccessResponse<AuditRecord> = {
        success: true,
        data: record,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUDIT_RECORD_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
