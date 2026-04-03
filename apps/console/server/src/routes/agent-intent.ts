/**
 * Agent Intent API Routes
 * 
 * Endpoint: POST /api/v1/agent/intent
 * 
 * Allows OpenClaw agents to submit governed requests through Vienna.
 */

import { Router, Request, Response } from 'express';

interface AgentIntentRequest {
  action: string;
  payload?: Record<string, any>;
  simulation?: boolean;
  source: {
    platform: string;
    agent_id?: string;
    user_id?: string;
    conversation_id?: string;
    message_id?: string;
  };
}

interface AuthContext {
  tenant: string;
  agent_id?: string;
}

/**
 * Create agent intent router
 */
export function createAgentIntentRouter(
  agentIntentBridge: any // AgentIntentBridge instance
): Router {
  const router = Router();

  /**
   * POST /api/v1/agent/intent
   * 
   * Submit agent intent to Vienna
   */
  router.post('/intent', async (req: Request, res: Response) => {
    try {
      const agentRequest: AgentIntentRequest = req.body;

      // Simple auth for v1: require tenant in session or header
      // In production, use API key or signed token
      const authContext: AuthContext = {
        tenant: (req as any).session?.tenant || req.headers['x-tenant-id'] as string || 'system',
        agent_id: (req as any).session?.agent_id || agentRequest.source?.agent_id
      };

      // Process through agent intent bridge
      const result = await agentIntentBridge.processAgentRequest(agentRequest, authContext);

      // Return result
      // Note: Always 200 OK unless infrastructure error
      // Blocked/failed execution returns success=false in body
      res.json(result);

    } catch (error: any) {
      console.error('Agent intent error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  /**
   * GET /api/v1/agent/actions
   * 
   * List allowed agent actions
   */
  router.get('/actions', (req: Request, res: Response) => {
    try {
      const allowedActions = agentIntentBridge.listAllowedActions();
      res.json({
        success: true,
        actions: allowedActions
      });
    } catch (error: any) {
      console.error('List actions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  return router;
}
