/**
 * Intent Routes
 *
 * Phase 11: Canonical action ingress for Vienna OS
 * All operator actions should route through Intent Gateway
 */
import { Router } from 'express';
export function createIntentRouter() {
    const router = Router();
    let intentGateway = null;
    // Initialize IntentGateway lazily (CommonJS interop)
    async function getIntentGateway() {
        if (!intentGateway) {
            const { getStateGraph } = await import('../../../../lib/state/state-graph.js');
            const { IntentGateway } = await import('../../../../lib/core/intent-gateway.js');
            const stateGraph = getStateGraph();
            intentGateway = new IntentGateway(stateGraph);
        }
        return intentGateway;
    }
    /**
     * POST /api/v1/intent
     * Submit intent to Vienna OS
     *
     * Body:
     * {
     *   intent_type: 'restore_objective' | 'investigate_objective' | 'set_safe_mode',
     *   payload: { ... }
     * }
     */
    router.post('/', async (req, res) => {
        try {
            const { intent_type, payload } = req.body;
            if (!intent_type || !payload) {
                return res.status(400).json({
                    success: false,
                    error: 'intent_type and payload required',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
            }
            // Extract tenant context from session
            const session = req.session;
            const tenantId = session?.operator?.tenant_id || 'system';
            const workspaceId = session?.operator?.workspace_id;
            const userId = session?.operator?.user_id;
            const operatorName = session?.operator?.name || 'console';
            // Build intent with operator source (tenant-aware)
            const intent = {
                intent_type,
                source: {
                    type: 'operator',
                    id: tenantId,
                    operator_name: operatorName,
                    workspace_id: workspaceId,
                    user_id: userId,
                },
                payload,
            };
            // Submit to Intent Gateway
            const gateway = await getIntentGateway();
            const response = await gateway.submitIntent(intent);
            // Map to API response
            if (response.accepted) {
                res.json({
                    success: true,
                    data: {
                        intent_id: response.intent_id,
                        action: response.action,
                        message: response.message,
                        metadata: response.metadata,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: response.error,
                    code: 'INTENT_REJECTED',
                    data: {
                        intent_id: response.intent_id,
                        metadata: response.metadata,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            console.error('[IntentRoute] Error processing intent:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'INTENT_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=intent.js.map