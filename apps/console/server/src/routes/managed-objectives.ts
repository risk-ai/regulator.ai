/**
 * Managed Objectives Routes
 * 
 * Phase 10: Operator visibility into autonomous objective management
 * Read-only endpoints backed by State Graph
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createManagedObjectivesRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();
  
  /**
   * GET /api/v1/managed-objectives
   * List all managed objectives with filtering
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        status,
        target_type,
        objective_type,
        enabled,
        page = '1',
        pageSize = '50',
      } = req.query;
      
      // Parse pagination
      const pageNum = parseInt(page as string, 10);
      const limit = Math.min(parseInt(pageSize as string, 10), 200); // Max 200
      const offset = (pageNum - 1) * limit;
      
      // Get State Graph
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      
      // Build query
      let query = 'SELECT * FROM managed_objectives WHERE 1=1';
      const params: any[] = [];
      
      if (status && status !== 'all') {
        query += ' AND state = ?';
        params.push(status);
      }
      
      if (target_type) {
        query += ' AND target_type = ?';
        params.push(target_type);
      }
      
      if (objective_type) {
        query += ' AND objective_type = ?';
        params.push(objective_type);
      }
      
      if (enabled === 'true') {
        query += ' AND enabled = 1';
      } else if (enabled === 'false') {
        query += ' AND enabled = 0';
      }
      
      // Order by priority and created_at
      query += ' ORDER BY CASE priority WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 ELSE 5 END, created_at DESC';
      
      // Pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const objectives = await stateGraph.query(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM managed_objectives WHERE 1=1';
      const countParams: any[] = [];
      
      if (status && status !== 'all') {
        countQuery += ' AND state = ?';
        countParams.push(status);
      }
      
      if (target_type) {
        countQuery += ' AND target_type = ?';
        countParams.push(target_type);
      }
      
      if (objective_type) {
        countQuery += ' AND objective_type = ?';
        countParams.push(objective_type);
      }
      
      if (enabled === 'true') {
        countQuery += ' AND enabled = 1';
      } else if (enabled === 'false') {
        countQuery += ' AND enabled = 0';
      }
      
      const countResult = await stateGraph.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;
      
      res.json({
        success: true,
        data: {
          objectives: objectives.map((obj: any) => ({
            ...obj,
            enabled: Boolean(obj.enabled),
            satisfied: Boolean(obj.satisfied),
            desired_state: obj.desired_state ? JSON.parse(obj.desired_state) : null,
            state_metadata: obj.state_metadata ? JSON.parse(obj.state_metadata) : null,
          })),
          page: pageNum,
          pageSize: limit,
          total,
          hasMore: offset + objectives.length < total,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ManagedObjectivesRoute] Error fetching objectives:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OBJECTIVES_QUERY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/managed-objectives/:id
   * Get single objective detail with latest evaluation
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get State Graph
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      
      // Get objective
      const objectives = await stateGraph.query(
        'SELECT * FROM managed_objectives WHERE objective_id = ?',
        [id]
      );
      
      if (objectives.length === 0) {
        res.status(404).json({
          success: false,
          error: `Objective not found: ${id}`,
          code: 'OBJECTIVE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const objective = objectives[0];
      
      // Get latest evaluation
      const evaluations = await stateGraph.query(
        'SELECT * FROM managed_objective_evaluations WHERE objective_id = ? ORDER BY started_at DESC LIMIT 1',
        [id]
      );
      
      const latestEvaluation = evaluations.length > 0 ? {
        ...evaluations[0],
        satisfied: Boolean(evaluations[0].satisfied),
        observed_state: evaluations[0].observed_state ? JSON.parse(evaluations[0].observed_state) : null,
        comparison: evaluations[0].comparison ? JSON.parse(evaluations[0].comparison) : null,
      } : null;
      
      res.json({
        success: true,
        data: {
          objective: {
            ...objective,
            enabled: Boolean(objective.enabled),
            satisfied: Boolean(objective.satisfied),
            desired_state: objective.desired_state ? JSON.parse(objective.desired_state) : null,
            state_metadata: objective.state_metadata ? JSON.parse(objective.state_metadata) : null,
          },
          latest_evaluation: latestEvaluation,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ManagedObjectivesRoute] Error fetching objective:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OBJECTIVE_QUERY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/managed-objectives/:id/evaluations
   * Get evaluation timeline for objective
   */
  router.get('/:id/evaluations', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        since,
        limit = '100',
        status: statusFilter,
      } = req.query;
      
      const limitNum = Math.min(parseInt(limit as string, 10), 500); // Max 500
      
      // Get State Graph
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      
      // Build query
      let query = 'SELECT * FROM managed_objective_evaluations WHERE objective_id = ?';
      const params: any[] = [id];
      
      if (since) {
        query += ' AND started_at > ?';
        params.push(since);
      }
      
      if (statusFilter) {
        query += ' AND status = ?';
        params.push(statusFilter);
      }
      
      query += ' ORDER BY started_at DESC LIMIT ?';
      params.push(limitNum);
      
      const evaluations = await stateGraph.query(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM managed_objective_evaluations WHERE objective_id = ?';
      const countParams: any[] = [id];
      
      if (since) {
        countQuery += ' AND started_at > ?';
        countParams.push(since);
      }
      
      if (statusFilter) {
        countQuery += ' AND status = ?';
        countParams.push(statusFilter);
      }
      
      const countResult = await stateGraph.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;
      
      res.json({
        success: true,
        data: {
          objective_id: id,
          evaluations: evaluations.map((evaluation: any) => ({
            ...evaluation,
            satisfied: Boolean(evaluation.satisfied),
            observed_state: evaluation.observed_state ? JSON.parse(evaluation.observed_state) : null,
            comparison: evaluation.comparison ? JSON.parse(evaluation.comparison) : null,
          })),
          total,
          hasMore: evaluations.length < total,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ManagedObjectivesRoute] Error fetching evaluations:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EVALUATIONS_QUERY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
