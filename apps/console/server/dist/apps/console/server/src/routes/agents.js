/**
 * Agents Routes
 *
 * GET    /api/v1/agents
 * POST   /api/v1/agents/:id/reason
 */
import { Router } from 'express';
// Rate limiting for reasoning requests
const reasoningRateLimits = new Map();
const REASONING_RATE_LIMIT = 5; // requests per minute
const REASONING_WINDOW_MS = 60000; // 1 minute
function checkReasoningRateLimit(operator) {
    const now = Date.now();
    const requests = reasoningRateLimits.get(operator) || [];
    // Filter out requests older than window
    const recentRequests = requests.filter(time => now - time < REASONING_WINDOW_MS);
    if (recentRequests.length >= REASONING_RATE_LIMIT) {
        return false;
    }
    recentRequests.push(now);
    reasoningRateLimits.set(operator, recentRequests);
    return true;
}
export function createAgentsRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/agents
     * List all agents in registry
     */
    router.get('/', async (req, res) => {
        try {
            const agents = await vienna.getAgents();
            const response = {
                success: true,
                data: agents,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'AGENTS_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * POST /api/v1/agents/:id/reason
     * Request agent reasoning (via Vienna coordination)
     *
     * Rate limited: 5 requests per minute per operator
     */
    router.post('/:id/reason', async (req, res) => {
        try {
            const request = req.body;
            if (!request.operator || !request.prompt) {
                const err = {
                    success: false,
                    error: 'Missing required fields: operator, prompt',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(err);
                return;
            }
            // Check rate limit
            if (!checkReasoningRateLimit(request.operator)) {
                const err = {
                    success: false,
                    error: 'Rate limit exceeded: 5 reasoning requests per minute',
                    code: 'RATE_LIMITED',
                    timestamp: new Date().toISOString(),
                };
                res.status(429).json(err);
                return;
            }
            const result = await vienna.requestAgentReasoning(req.params.id, request);
            const responseData = {
                success: true,
                session_id: result.session_id,
                response: result.response,
            };
            const response = {
                success: true,
                data: responseData,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'REASON_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=agents.js.map