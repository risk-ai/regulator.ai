/**
 * Managed Execution Routes — Phase 5
 * 
 * POST /api/v1/executions/run — Execute steps with full lifecycle persistence
 * GET  /api/v1/executions      — List recent executions
 * GET  /api/v1/executions/:id  — Get execution detail with timeline
 * 
 * Phase 5 upgrade: Full persistence to execution_log, execution_steps,
 * execution_ledger_events. Connects to intent pipeline via warrant_id.
 */

import { Router, Request, Response } from 'express';
import { resolveAndExecuteStep, type ExecutionStep } from '../execution/adapter-resolver.js';
import { redactSecrets, type ResolvedSecretMap } from '../services/secretRedaction.js';
import {
  createExecution,
  transitionState,
  persistStep,
  updateExecutionSteps,
  logExecutionAudit,
} from '../services/executionPersistence.js';
import { query, queryOne } from '../db/postgres.js';

export function createManagedExecutionRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/executions/run
   * 
   * Execute steps with full lifecycle tracking.
   */
  router.post('/run', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const tenantId = (req as any).user?.tenantId || req.body.tenant_id || 'default';
      const { execution_id, warrant_id, proposal_id, risk_tier, objective, steps, simulation } = req.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'steps array is required and must not be empty',
          code: 'INVALID_STEPS',
        });
      }

      const execId = execution_id || `exe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

      console.log(`[ManagedExecution] Starting ${execId} — ${steps.length} steps, tenant=${tenantId}`);

      // 0. Validate warrant if provided (reject expired/revoked/invalid warrants)
      if (warrant_id) {
        try {
          const viennaCore = (req as any).app?.locals?.viennaCore;
          if (viennaCore?.warrant) {
            const verification = await viennaCore.warrant.verify(warrant_id);
            if (!verification.valid) {
              return res.status(403).json({
                success: false,
                error: `Warrant invalid: ${verification.reason}`,
                code: 'WARRANT_INVALID',
                warrant_id,
              });
            }
          }
        } catch (verifyErr) {
          console.warn(`[ManagedExecution] Warrant verification failed for ${warrant_id}:`, verifyErr);
          // Don't block execution if warrant system is unavailable — log and continue
        }
      }

      // 1. Create execution record (state: planned)
      await createExecution({
        execution_id: execId,
        tenant_id: tenantId,
        warrant_id: warrant_id || null,
        proposal_id: proposal_id || null,
        execution_mode: 'managed',
        state: 'planned',
        risk_tier: risk_tier || 'T0',
        objective: objective || `Execute ${steps.length} step(s)`,
        steps: steps.map((s: any, i: number) => ({
          ...s,
          step_index: s.step_index ?? i,
          status: 'pending',
        })),
        timeline: [{
          state: 'planned',
          detail: `Execution created with ${steps.length} step(s)`,
          timestamp: new Date().toISOString(),
        }],
        result: null,
      });

      // 2. Transition to approved (auto-approve for managed)
      await transitionState(execId, tenantId, 'approved', 'Auto-approved for managed execution', {
        actor: 'system',
      });

      // 3. Transition to executing
      await transitionState(execId, tenantId, 'executing', 'Execution started');

      // 4. Execute each step
      const stepResults: any[] = [];
      let allSucceeded = true;

      for (let i = 0; i < steps.length; i++) {
        const step = { ...steps[i], step_index: steps[i].step_index ?? i };
        const stepStartTime = new Date().toISOString();

        // Persist step as executing
        await persistStep({
          execution_id: execId,
          step_index: step.step_index,
          step_name: step.step_name || `Step ${i}`,
          tier: step.tier || 'native',
          action: step.action || {},
          params: step.params || {},
          adapter_id: step.adapter_id || null,
          status: 'executing',
          started_at: stepStartTime,
          completed_at: null,
          latency_ms: 0,
          result: null,
          error: null,
        });

        // Execute step
        const result = await resolveAndExecuteStep(tenantId, step);
        const completedAt = new Date().toISOString();

        // Persist step result (redacted)
        await persistStep({
          execution_id: execId,
          step_index: step.step_index,
          step_name: step.step_name || `Step ${i}`,
          tier: step.tier || 'native',
          action: step.action || {},
          params: step.params || {},
          adapter_id: step.adapter_id || null,
          status: result.success ? 'complete' : 'failed',
          started_at: stepStartTime,
          completed_at: completedAt,
          latency_ms: result.latency_ms,
          result: result.output,
          error: result.error || null,
        });

        stepResults.push({
          step_index: step.step_index,
          step_name: step.step_name || `Step ${i}`,
          success: result.success,
          latency_ms: result.latency_ms,
          adapter_used: result.adapter_used,
          status_code: result.output?.status_code,
          error: result.error,
        });

        if (!result.success) {
          allSucceeded = false;
          break; // Stop on failure
        }
      }

      // 5. Update steps array on execution_log
      const completedSteps = steps.map((s: any, i: number) => ({
        ...s,
        step_index: s.step_index ?? i,
        status: stepResults[i]?.success ? 'complete' : (i < stepResults.length ? 'failed' : 'skipped'),
        latency_ms: stepResults[i]?.latency_ms || 0,
        result: stepResults[i] ? redactSecrets({
          success: stepResults[i].success,
          adapter_used: stepResults[i].adapter_used,
          status_code: stepResults[i].status_code,
        }) : null,
      }));
      await updateExecutionSteps(execId, tenantId, completedSteps);

      // 6. Transition to verifying then terminal state
      if (allSucceeded) {
        await transitionState(execId, tenantId, 'verifying', 'All steps complete, verifying');
        await transitionState(execId, tenantId, 'complete', 'Execution verified complete', {
          result: {
            state: 'complete',
            execution_id: execId,
            results: stepResults,
            total_latency_ms: Date.now() - startTime,
          },
        });
      } else {
        const failedStep = stepResults.find(r => !r.success);
        await transitionState(execId, tenantId, 'failed', `Step ${failedStep?.step_index} failed: ${failedStep?.error || 'unknown'}`, {
          error: failedStep?.error,
          result: {
            state: 'failed',
            execution_id: execId,
            results: stepResults,
            failed_step: failedStep?.step_index,
            total_latency_ms: Date.now() - startTime,
          },
        });
      }

      // 7. Audit log
      await logExecutionAudit(
        execId, tenantId,
        allSucceeded ? 'execution.complete' : 'execution.failed',
        'managed-execution',
        { steps_total: steps.length, steps_completed: stepResults.filter(r => r.success).length },
        warrant_id,
        risk_tier,
      );

      // 8. Response
      const totalLatency = Date.now() - startTime;
      console.log(`[ManagedExecution] ${execId} ${allSucceeded ? 'complete' : 'failed'} in ${totalLatency}ms`);

      res.json({
        success: allSucceeded,
        execution_id: execId,
        state: allSucceeded ? 'complete' : 'failed',
        results: stepResults.map(r => redactSecrets(r)),
        summary: {
          total_steps: steps.length,
          completed: stepResults.filter(r => r.success).length,
          failed: stepResults.filter(r => !r.success).length,
          skipped: steps.length - stepResults.length,
          total_latency_ms: totalLatency,
        },
        timeline_url: `/api/v1/executions/${execId}`,
      });
    } catch (error: any) {
      console.error('[ManagedExecution] Execution failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Execution failed',
        code: 'EXECUTION_ERROR',
      });
    }
  });

  /**
   * GET /api/v1/executions
   * List recent executions.
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { state, risk_tier, limit = '50' } = req.query;
      const limitNum = Math.min(parseInt(limit as string, 10), 200);

      let sql = `SELECT execution_id, tenant_id, warrant_id, execution_mode, state, risk_tier, objective, 
                        created_at, updated_at, completed_at,
                        jsonb_array_length(COALESCE(steps, '[]'::jsonb)) as step_count
                 FROM regulator.execution_log WHERE tenant_id = $1`;
      const params: any[] = [tenantId];

      if (state) {
        params.push(state);
        sql += ` AND state = $${params.length}`;
      }
      if (risk_tier) {
        params.push(risk_tier);
        sql += ` AND risk_tier = $${params.length}`;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limitNum);

      const executions = await query(sql, params);

      res.json({
        success: true,
        data: executions,
        count: executions.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/executions/:id
   * Get full execution detail with timeline and steps.
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { id } = req.params;

      const execution = await queryOne(
        `SELECT * FROM regulator.execution_log WHERE execution_id = $1 AND tenant_id = $2`,
        [id, tenantId],
      );

      if (!execution) {
        return res.status(404).json({ success: false, error: 'Execution not found' });
      }

      // Get steps
      const steps = await query(
        `SELECT * FROM regulator.execution_steps WHERE execution_id = $1 ORDER BY step_index`,
        [id],
      );

      // Get ledger events
      const events = await query(
        `SELECT * FROM regulator.execution_ledger_events WHERE execution_id = $1 ORDER BY sequence_num`,
        [id],
      );

      res.json({
        success: true,
        data: {
          ...execution,
          detailed_steps: steps,
          ledger_events: events,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
