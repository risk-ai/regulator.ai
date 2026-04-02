/**
 * Managed Execution Routes — Phase 4A
 * 
 * POST /api/v1/executions/run — Execute steps with automatic adapter resolution
 * 
 * Integrates adapter-resolver for step-level execution with credential injection.
 * 
 * Owner: Vienna (Phase 4A implementation)
 */

import { Router, Request, Response } from 'express';
import { executeSteps, type ExecutionStep } from '../execution/adapter-resolver.js';
import { redactSecrets } from '../services/secretRedaction.js';

export function createManagedExecutionRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/executions/run
   * 
   * Execute a sequence of steps with automatic adapter resolution.
   * Each step can reference an adapter_config_id for external HTTP execution,
   * or use passthrough for internal/native actions.
   * 
   * Request body:
   * {
   *   tenant_id: string,
   *   execution_id?: string,  // optional, for tracking
   *   steps: ExecutionStep[]
   * }
   * 
   * Response:
   * {
   *   success: boolean,
   *   execution_id: string,
   *   results: StepResult[],  // all redacted
   *   summary: {
   *     total_steps: number,
   *     completed: number,
   *     failed: number,
   *     total_latency_ms: number
   *   }
   * }
   */
  router.post('/run', async (req: Request, res: Response) => {
    try {
      const { tenant_id, execution_id, steps } = req.body;

      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'tenant_id is required',
          code: 'MISSING_TENANT_ID',
        });
      }

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'steps array is required and must not be empty',
          code: 'INVALID_STEPS',
        });
      }

      const execId = execution_id || `exe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      console.log(`[ManagedExecution] Starting execution ${execId} with ${steps.length} steps`);

      // Execute steps via adapter resolver
      const results = await executeSteps(tenant_id, steps);

      // Redact all results before returning
      const redactedResults = results.map(result => redactSecrets(result, {}));

      // Calculate summary
      const completed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalLatency = results.reduce((sum, r) => sum + r.latency_ms, 0);

      const response = {
        success: failed === 0,
        execution_id: execId,
        results: redactedResults,
        summary: {
          total_steps: steps.length,
          completed,
          failed,
          total_latency_ms: totalLatency,
        },
      };

      console.log(`[ManagedExecution] Execution ${execId} complete: ${completed}/${steps.length} steps succeeded`);

      res.json(response);
    } catch (error: any) {
      console.error('[ManagedExecution] Execution failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Execution failed',
        code: 'EXECUTION_ERROR',
      });
    }
  });

  return router;
}
