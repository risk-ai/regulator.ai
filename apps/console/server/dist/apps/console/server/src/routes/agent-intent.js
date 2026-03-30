/**
 * Agent Intent API Routes
 *
 * Endpoint: POST /api/v1/agent/intent
 *
 * Allows OpenClaw agents to submit governed requests through Vienna.
 */
import { Router } from 'express';
/**
 * Create agent intent router
 */
export function createAgentIntentRouter(agentIntentBridge // AgentIntentBridge instance
) {
    const router = Router();
    /**
     * POST /api/v1/agent/intent
     *
     * Submit agent intent to Vienna
     */
    router.post('/intent', async (req, res) => {
        try {
            const agentRequest = req.body;
            // Simple auth for v1: require tenant in session or header
            // In production, use API key or signed token
            const authContext = {
                tenant: req.session?.tenant || req.headers['x-tenant-id'] || 'system',
                agent_id: req.session?.agent_id || agentRequest.source?.agent_id
            };
            // Process through agent intent bridge
            const result = await agentIntentBridge.processAgentRequest(agentRequest, authContext);
            // Return result
            // Note: Always 200 OK unless infrastructure error
            // Blocked/failed execution returns success=false in body
            res.json(result);
        }
        catch (error) {
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
    router.get('/actions', (req, res) => {
        try {
            const allowedActions = agentIntentBridge.listAllowedActions();
            res.json({
                success: true,
                actions: allowedActions
            });
        }
        catch (error) {
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
//# sourceMappingURL=agent-intent.js.map