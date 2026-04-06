/**
 * Approval Routes (Phase 17 Stage 4)
 * 
 * Operator approval workflow API.
 * Thin surface over backend approval state machine.
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import { metrics } from '../services/metricsService.js';

export function createApprovalsRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();
  
  /**
   * GET /api/v1/approvals
   * List approvals with optional filters
   * 
   * Query params:
   * - status: pending | approved | denied | expired
   * - tier: T1 | T2
   * - target_id: filter by target
   * - limit: max results (default 100)
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      await stateGraph.initialize();
      
      const filters: any = {};
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      if (req.query.tier) {
        filters.tier = req.query.tier;
      }
      
      if (req.query.target_id) {
        filters.target_id = req.query.target_id;
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      filters.limit = limit;
      
      const approvals = await stateGraph.listApprovals(filters);
      
      // Enrich with expiry status and convert ISO strings to timestamps
      const now = Date.now();
      const enriched = approvals.map((approval: any) => {
        const requestedAt = approval.requested_at ? new Date(approval.requested_at).getTime() : null;
        const expiresAt = approval.expires_at ? new Date(approval.expires_at).getTime() : null;
        const reviewedAt = approval.reviewed_at ? new Date(approval.reviewed_at).getTime() : null;
        
        // Parse target_entities (stored as JSON string)
        let targetEntities = [];
        try {
          targetEntities = typeof approval.target_entities === 'string' 
            ? JSON.parse(approval.target_entities)
            : approval.target_entities || [];
        } catch (e) {
          console.error('Failed to parse target_entities:', approval.target_entities);
        }
        
        return {
          approval_id: approval.approval_id,
          plan_id: approval.plan_id,
          execution_id: approval.execution_id,
          step_id: approval.step_id,
          tier: approval.required_tier, // Map required_tier → tier
          target_id: targetEntities[0] || 'unknown', // Extract first target
          action_type: approval.action_type || approval.action_summary?.split(' ')[0]?.toLowerCase() || 'unknown', // Extract from approval or summary
          action_summary: approval.action_summary,
          risk_summary: approval.risk_summary,
          status: approval.status,
          requested_by: approval.requested_by,
          requested_at: requestedAt,
          reviewed_by: approval.reviewed_by,
          reviewed_at: reviewedAt,
          decision_reason: approval.decision_reason,
          expires_at: expiresAt,
          is_expired: expiresAt && now > expiresAt,
          time_until_expiry_ms: expiresAt ? Math.max(0, expiresAt - now) : null,
          metadata: {
            target_entities: targetEntities,
            estimated_duration_ms: approval.estimated_duration_ms,
            rollback_available: approval.rollback_available,
          },
        };
      });
      
      res.json({
        success: true,
        data: enriched,
        count: enriched.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ApprovalsRoute] List error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'APPROVAL_LIST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/approvals/:approval_id
   * Get approval detail with context
   */
  router.get('/:approval_id', async (req: Request, res: Response) => {
    try {
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      await stateGraph.initialize();
      
      const { approval_id } = req.params;
      
      const approval = await stateGraph.getApproval(approval_id);
      
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Approval not found',
          code: 'APPROVAL_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Enrich with related context
      let plan = null;
      let execution = null;
      
      if (approval.plan_id) {
        plan = await stateGraph.getPlan(approval.plan_id);
      }
      
      if (approval.execution_id) {
        // Get execution summary from ledger
        const summary = await stateGraph.getExecutionLedgerSummary(approval.execution_id);
        if (summary) {
          execution = summary;
        }
      }
      
      // Convert ISO strings to timestamps and enrich with expiry status
      const now = Date.now();
      const requestedAt = approval.requested_at ? new Date(approval.requested_at).getTime() : null;
      const expiresAt = approval.expires_at ? new Date(approval.expires_at).getTime() : null;
      const reviewedAt = approval.reviewed_at ? new Date(approval.reviewed_at).getTime() : null;
      const is_expired = expiresAt && now > expiresAt;
      const time_until_expiry_ms = expiresAt ? Math.max(0, expiresAt - now) : null;
      
      // Parse target_entities
      let targetEntities = [];
      try {
        targetEntities = typeof approval.target_entities === 'string' 
          ? JSON.parse(approval.target_entities)
          : approval.target_entities || [];
      } catch (e) {
        console.error('Failed to parse target_entities:', approval.target_entities);
      }
      
      res.json({
        success: true,
        data: {
          approval: {
            approval_id: approval.approval_id,
            plan_id: approval.plan_id,
            execution_id: approval.execution_id,
            step_id: approval.step_id,
            tier: approval.required_tier,
            target_id: targetEntities[0] || 'unknown',
            action_type: 'restart_service',
            action_summary: approval.action_summary,
            risk_summary: approval.risk_summary,
            status: approval.status,
            requested_by: approval.requested_by,
            requested_at: requestedAt,
            reviewed_by: approval.reviewed_by,
            reviewed_at: reviewedAt,
            decision_reason: approval.decision_reason,
            expires_at: expiresAt,
            is_expired,
            time_until_expiry_ms,
            metadata: {
              target_entities: targetEntities,
              estimated_duration_ms: approval.estimated_duration_ms,
              rollback_available: approval.rollback_available,
            },
          },
          plan,
          execution,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ApprovalsRoute] Get detail error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'APPROVAL_DETAIL_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/approvals/:approval_id/approve
   * Approve pending approval
   * 
   * Body:
   * - reviewed_by: operator identity (required)
   * - decision_reason: optional explanation
   */
  router.post('/:approval_id/approve', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const ApprovalManagerModule = await import('../../../../../services/vienna-lib/core/approval-manager.js');
      const ApprovalManager = ApprovalManagerModule.default || ApprovalManagerModule.ApprovalManager || ApprovalManagerModule;
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      await stateGraph.initialize();
      
      const { approval_id } = req.params;
      const { reviewed_by, decision_reason } = req.body;
      
      if (!reviewed_by) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: reviewed_by',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const manager = new ApprovalManager(stateGraph);
      
      // Approve (state machine enforces transitions)
      const approval = await manager.approve(
        approval_id,
        reviewed_by,
        decision_reason || null
      );

      // Record metrics
      const approvalLatency = (Date.now() - startTime) / 1000;
      const riskTier = approval.required_tier || 'T0';
      
      metrics.recordApprovalDecision('approved', riskTier, reviewed_by);
      metrics.observeApprovalLatency(approvalLatency);

      // Issue warrant for the approved action
      let warrant = null;
      try {
        const viennaCore = (req as any).app?.locals?.viennaCore;
        if (viennaCore?.warrant) {
          warrant = await viennaCore.warrant.issue({
            truthSnapshotId: `truth_${approval.execution_id || approval_id}`,
            planId: approval.plan_id || approval.execution_id || approval_id,
            approvalId: approval_id,
            objective: approval.action_summary || `Approved by ${reviewed_by}`,
            riskTier: approval.required_tier || 'T2',
            allowedActions: ['*'], // Approved actions from the plan
            forbiddenActions: [],
            expiresInMinutes: approval.required_tier === 'T3' ? 5 : 15,
            justification: decision_reason || undefined,
            rollbackPlan: approval.required_tier === 'T3' ? 'Manual rollback required' : undefined,
            issuer: reviewed_by,
          });
          console.log(`[Approvals] Warrant ${warrant.warrant_id} issued for approval ${approval_id}`);
        }
      } catch (warrantErr: any) {
        console.warn(`[Approvals] Warrant issuance failed for approval ${approval_id}:`, warrantErr.message);
      }
      
      res.json({
        success: true,
        data: {
          ...approval,
          warrant_id: warrant?.warrant_id || null,
          warrant: warrant ? {
            warrant_id: warrant.warrant_id,
            expires_at: warrant.expires_at,
            risk_tier: warrant.risk_tier,
          } : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ApprovalsRoute] Approve error:', error);
      
      // Map known errors to appropriate status codes
      const message = error instanceof Error ? error.message : 'Unknown error';
      let statusCode = 500;
      let errorCode = 'APPROVAL_ERROR';
      
      if (message === 'APPROVAL_NOT_FOUND') {
        statusCode = 404;
        errorCode = 'APPROVAL_NOT_FOUND';
      } else if (message.startsWith('INVALID_TRANSITION')) {
        statusCode = 400;
        errorCode = 'INVALID_TRANSITION';
      } else if (message.startsWith('APPROVAL_EXPIRED')) {
        statusCode = 400;
        errorCode = 'APPROVAL_EXPIRED';
      }
      
      res.status(statusCode).json({
        success: false,
        error: message,
        code: errorCode,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/approvals/:approval_id/deny
   * Deny pending approval
   * 
   * Body:
   * - reviewed_by: operator identity (required)
   * - decision_reason: denial reason (required)
   */
  router.post('/:approval_id/deny', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const ApprovalManagerModule = await import('../../../../../services/vienna-lib/core/approval-manager.js');
      const ApprovalManager = ApprovalManagerModule.default || ApprovalManagerModule.ApprovalManager || ApprovalManagerModule;
      const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
      const stateGraph = getStateGraph();
      await stateGraph.initialize();
      
      const { approval_id } = req.params;
      const { reviewed_by, decision_reason } = req.body;
      
      if (!reviewed_by) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: reviewed_by',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      if (!decision_reason) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: decision_reason (required for deny)',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const manager = new ApprovalManager(stateGraph);
      
      // Deny (state machine enforces transitions)
      const approval = await manager.deny(
        approval_id,
        reviewed_by,
        decision_reason
      );

      // Record metrics
      const approvalLatency = (Date.now() - startTime) / 1000;
      const riskTier = approval.required_tier || 'T0';
      
      metrics.recordApprovalDecision('denied', riskTier, reviewed_by);
      metrics.observeApprovalLatency(approvalLatency);
      
      res.json({
        success: true,
        data: approval,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ApprovalsRoute] Deny error:', error);
      
      // Map known errors to appropriate status codes
      const message = error instanceof Error ? error.message : 'Unknown error';
      let statusCode = 500;
      let errorCode = 'DENIAL_ERROR';
      
      if (message === 'APPROVAL_NOT_FOUND') {
        statusCode = 404;
        errorCode = 'APPROVAL_NOT_FOUND';
      } else if (message.startsWith('INVALID_TRANSITION')) {
        statusCode = 400;
        errorCode = 'INVALID_TRANSITION';
      } else if (message.startsWith('APPROVAL_EXPIRED')) {
        statusCode = 400;
        errorCode = 'APPROVAL_EXPIRED';
      }
      
      res.status(statusCode).json({
        success: false,
        error: message,
        code: errorCode,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
