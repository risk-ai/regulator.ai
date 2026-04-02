/**
 * Execution Routes
 * 
 * GET    /api/v1/execution/active
 * GET    /api/v1/execution/queue
 * GET    /api/v1/execution/blocked
 * GET    /api/v1/execution/metrics
 * GET    /api/v1/execution/health
 * GET    /api/v1/execution/integrity
 * POST   /api/v1/execution/pause
 * POST   /api/v1/execution/resume
 * POST   /api/v1/execution/integrity-check
 * POST   /api/v1/execution/emergency-override
 * POST   /api/v1/execution/submit
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type {
  SuccessResponse,
  ErrorResponse,
  EnvelopeExecution,
  QueueSnapshot,
  ExecutionMetrics,
  HealthSnapshot,
  IntegritySnapshot,
  PauseExecutionRequest,
  PauseExecutionResponse,
  ResumeExecutionRequest,
  ResumeExecutionResponse,
  IntegrityCheckRequest,
  IntegrityCheckResponse,
  EmergencyOverrideRequest,
  EmergencyOverrideResponse,
} from '../types/api.js';

export function createExecutionRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/execution/active
   * Get currently executing envelopes
   */
  router.get('/active', async (req: Request, res: Response) => {
    try {
      const envelopes = await vienna.getActiveEnvelopes();
      
      const response: SuccessResponse<EnvelopeExecution[]> = {
        success: true,
        data: envelopes,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACTIVE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/queue
   * Get queue state snapshot
   */
  router.get('/queue', async (req: Request, res: Response) => {
    try {
      const queue = await vienna.getQueueState();
      
      const response: SuccessResponse<QueueSnapshot> = {
        success: true,
        data: queue,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'QUEUE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/blocked
   * Get blocked envelopes
   */
  router.get('/blocked', async (req: Request, res: Response) => {
    try {
      const blocked = await vienna.getBlockedEnvelopes();
      
      const response: SuccessResponse<EnvelopeExecution[]> = {
        success: true,
        data: blocked,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BLOCKED_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/metrics
   * Get execution metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await vienna.getExecutionMetrics();
      
      const response: SuccessResponse<ExecutionMetrics> = {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'METRICS_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/health
   * Get health snapshot
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await vienna.getHealth();
      
      const response: SuccessResponse<HealthSnapshot> = {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HEALTH_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/integrity
   * Get integrity snapshot (cached)
   */
  router.get('/integrity', async (req: Request, res: Response) => {
    try {
      // Return cached integrity check result
      // For manual trigger, use POST /api/v1/execution/integrity-check
      const integrity = await vienna.checkIntegrity('system');
      
      const response: SuccessResponse<IntegritySnapshot> = {
        success: true,
        data: integrity,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRITY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/execution/pause
   * Pause execution
   */
  router.post('/pause', async (req: Request, res: Response) => {
    try {
      const request: PauseExecutionRequest = req.body;
      
      if (!request.operator || !request.reason) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required fields: operator, reason',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      const result = await vienna.pauseExecution(request);
      
      const responseData: PauseExecutionResponse = {
        success: true,
        paused_at: result.paused_at,
        queued_envelopes_paused: result.queued_envelopes_paused,
      };
      
      const response: SuccessResponse<PauseExecutionResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PAUSE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/execution/resume
   * Resume execution
   */
  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const request: ResumeExecutionRequest = req.body;
      
      if (!request.operator) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required field: operator',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      const result = await vienna.resumeExecution(request);
      
      const responseData: ResumeExecutionResponse = {
        success: true,
        resumed_at: result.resumed_at,
        envelopes_resumed: result.envelopes_resumed,
      };
      
      const response: SuccessResponse<ResumeExecutionResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RESUME_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/execution/integrity-check
   * Manually trigger integrity check
   */
  router.post('/integrity-check', async (req: Request, res: Response) => {
    try {
      const request: IntegrityCheckRequest = req.body;
      
      if (!request.operator) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required field: operator',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      const integrity = await vienna.checkIntegrity(request.operator);
      
      const responseData: IntegrityCheckResponse = {
        success: true,
        integrity,
        checked_at: new Date().toISOString(),
      };
      
      const response: SuccessResponse<IntegrityCheckResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRITY_CHECK_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/execution/emergency-override
   * Activate emergency trading guard override
   * 
   * CRITICAL: Requires Metternich approval
   * Max duration: 60 minutes
   * Trading guard bypass only
   * Full audit trail required
   */
  router.post('/emergency-override', async (req: Request, res: Response) => {
    try {
      const request: EmergencyOverrideRequest = req.body;
      
      // Validate required fields
      if (!request.operator || !request.reason || !request.metternich_approval_id) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required fields: operator, reason, metternich_approval_id',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      // Validate duration
      if (!request.duration_minutes || request.duration_minutes > 60 || request.duration_minutes < 1) {
        const err: ErrorResponse = {
          success: false,
          error: 'Duration must be between 1 and 60 minutes',
          code: 'INVALID_DURATION',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      const result = await vienna.activateEmergencyOverride(request);
      
      const responseData: EmergencyOverrideResponse = {
        success: true,
        override_id: result.override_id,
        activated_at: result.activated_at,
        expires_at: result.expires_at,
        audit_event_id: result.audit_event_id,
      };
      
      const response: SuccessResponse<EmergencyOverrideResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OVERRIDE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/execution/submit
   * Submit an intent/action for execution via the full governance pipeline.
   * 
   * FIX #1: Risk tier determined by policy engine, not string matching.
   * FIX #2: Execution mode (direct/passback) is per-tenant configurable.
   * FIX #3: Direct execution routes through QueuedExecutor pipeline.
   * FIX #5: Converges with /api/v1/intent pipeline internally.
   * 
   * Returns either direct execution result or passback warrant.
   */
  router.post('/submit', async (req: Request, res: Response) => {
    try {
      const { action, agent_id, tenant_id, parameters, source, simulation } = req.body;
      
      if (!action || !agent_id || !tenant_id) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required fields: action, agent_id, tenant_id',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }

      // ── FIX #1: Policy-based risk classification ──────────────────────
      // Route through the IntentGateway for proper policy evaluation
      // instead of naive string matching on action names.
      const intentResult = await vienna.evaluateIntentForExecution({
        action,
        agent_id,
        tenant_id,
        parameters: parameters || {},
        source: source || 'api',
        simulation: simulation || false,
      });

      if (!intentResult.accepted) {
        // Policy blocked this intent
        const response: SuccessResponse<{
          mode: 'blocked';
          reason: string;
          risk_tier: string;
          policy_details?: any;
        }> = {
          success: true,
          data: {
            mode: 'blocked',
            reason: intentResult.error || 'Blocked by policy',
            risk_tier: intentResult.risk_tier || 'unknown',
            policy_details: intentResult.policy_details,
          },
          timestamp: new Date().toISOString(),
        };
        res.status(403).json(response);
        return;
      }

      // Simulation mode — return evaluation result without execution
      if (simulation) {
        const response: SuccessResponse<{
          mode: 'simulation';
          risk_tier: string;
          execution_mode: string;
          would_require_approval: boolean;
          policy_evaluation: any;
        }> = {
          success: true,
          data: {
            mode: 'simulation',
            risk_tier: intentResult.risk_tier,
            execution_mode: intentResult.execution_mode,
            would_require_approval: intentResult.requires_approval || false,
            policy_evaluation: intentResult.policy_details,
          },
          timestamp: new Date().toISOString(),
        };
        res.json(response);
        return;
      }

      const riskTier = intentResult.risk_tier as 'T0' | 'T1' | 'T2' | 'T3';

      // ── FIX #2: Per-tenant execution mode policy ──────────────────────
      // Look up tenant-specific execution mode for this risk tier.
      // Falls back to default: T0/T1=direct, T2/T3=passback.
      const executionMode = intentResult.execution_mode; // Already resolved by evaluateIntentForExecution

      if (executionMode === 'direct') {
        // ── FIX #3: Route through QueuedExecutor pipeline ─────────────
        // This ensures direct execution gets: recursion guard, rate limiting,
        // agent budget, dead letter queue, retry policy, concurrency control.
        const envelope = {
          envelope_id: `env_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          envelope_type: action,
          warrant_id: intentResult.warrant_id,
          objective_id: intentResult.objective_id || `obj_${action}_${Date.now()}`,
          proposed_by: agent_id,
          tenant_id,
          actions: [{
            type: action,
            target: parameters?.target || tenant_id,
            parameters: parameters || {},
          }],
          execution_class: riskTier,
          causal_depth: 0,
          source: source || 'api',
          fail_fast: true,
        };

        const queueResult = await vienna.submitToExecutionPipeline(envelope);

        const response: SuccessResponse<{
          mode: 'direct';
          execution_id: string;
          envelope_id: string;
          status: string;
          risk_tier: string;
          warrant_id: string | null;
          queued: boolean;
        }> = {
          success: true,
          data: {
            mode: 'direct',
            execution_id: queueResult.execution_id || envelope.envelope_id,
            envelope_id: envelope.envelope_id,
            status: queueResult.status || 'queued',
            risk_tier: riskTier,
            warrant_id: intentResult.warrant_id || null,
            queued: queueResult.queued || false,
          },
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } else {
        // Passback mode: Issue warrant for agent to execute locally
        // Warrant already issued during intent evaluation
        const response: SuccessResponse<{
          mode: 'passback';
          warrant_id: string;
          execution_id: string;
          instruction: any;
          constraints: any;
          risk_tier: string;
          callback_url: string;
          callback_token: string | null;
        }> = {
          success: true,
          data: {
            mode: 'passback',
            warrant_id: intentResult.warrant_id,
            execution_id: intentResult.execution_id,
            instruction: intentResult.instruction,
            constraints: intentResult.constraints,
            risk_tier: riskTier,
            callback_url: `/api/v1/webhooks/execution-callback`,
            callback_token: intentResult.callback_token || null,
          },
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      }
    } catch (error) {
      console.error('[ExecutionRoute] Error submitting execution:', error);
      
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_SUBMIT_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/execution/envelopes/:id/lineage
   * Get envelope lineage chain (Phase 3E)
   */
  router.get('/envelopes/:id/lineage', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const lineage = await vienna.getEnvelopeLineage(id);
      
      const response: SuccessResponse<{ envelope_id: string; lineage: any[] }> = {
        success: true,
        data: {
          envelope_id: id,
          lineage,
        },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ExecutionRoute] Error fetching lineage:', error);
      
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENVELOPE_LINEAGE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
