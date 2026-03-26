/**
 * Agent Fleet Dashboard Route
 * 
 * Monitor all agents under governance
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createFleetRouter(viennaRuntime: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * Get fleet overview
   * GET /api/v1/fleet
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      // TODO: Get tenant_id from authenticated session
      const tenant_id = 'default';
      
      const stateGraph = viennaRuntime.getStateGraph();
      const stats = stateGraph.getAgentStats(tenant_id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[FleetRouter] Fleet overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get fleet overview',
        code: 'FLEET_ERROR'
      });
    }
  });

  /**
   * List agents
   * GET /api/v1/fleet/agents
   */
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const tenant_id = 'default';
      const { status, limit } = req.query;
      
      const stateGraph = viennaRuntime.getStateGraph();
      const agents = stateGraph.listAgents(tenant_id, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error('[FleetRouter] List agents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list agents',
        code: 'LIST_ERROR'
      });
    }
  });

  /**
   * Get agent details
   * GET /api/v1/fleet/agents/:agent_id
   */
  router.get('/agents/:agent_id', async (req: Request, res: Response) => {
    try {
      const { agent_id } = req.params;
      
      const stateGraph = viennaRuntime.getStateGraph();
      const agent = stateGraph.getAgent(agent_id);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          code: 'NOT_FOUND'
        });
      }
      
      // Get recent activity
      const activity = stateGraph.getAgentActivity(agent_id, 24);
      
      res.json({
        success: true,
        data: {
          agent,
          recent_activity: activity
        }
      });
    } catch (error) {
      console.error('[FleetRouter] Get agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent details',
        code: 'GET_ERROR'
      });
    }
  });

  /**
   * Get agent activity timeline
   * GET /api/v1/fleet/agents/:agent_id/activity
   */
  router.get('/agents/:agent_id/activity', async (req: Request, res: Response) => {
    try {
      const { agent_id } = req.params;
      const { hours } = req.query;
      
      const stateGraph = viennaRuntime.getStateGraph();
      const activity = stateGraph.getAgentActivity(
        agent_id,
        hours ? parseInt(hours as string) : 24
      );
      
      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('[FleetRouter] Get activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent activity',
        code: 'ACTIVITY_ERROR'
      });
    }
  });

  /**
   * Update agent status
   * PATCH /api/v1/fleet/agents/:agent_id
   */
  router.patch('/agents/:agent_id', async (req: Request, res: Response) => {
    try {
      const { agent_id } = req.params;
      const { status } = req.body;
      
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be: active, inactive, or suspended',
          code: 'INVALID_STATUS'
        });
      }
      
      const stateGraph = viennaRuntime.getStateGraph();
      const agent = stateGraph.getAgent(agent_id);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          code: 'NOT_FOUND'
        });
      }
      
      stateGraph.upsertAgent({
        agent_id,
        tenant_id: agent.tenant_id,
        status
      });
      
      res.json({
        success: true,
        data: {
          agent_id,
          status,
          message: `Agent status updated to ${status}`
        }
      });
    } catch (error) {
      console.error('[FleetRouter] Update agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agent',
        code: 'UPDATE_ERROR'
      });
    }
  });

  return router;
}
