/**
 * Phase 9.7.3 — ChatActionBridge Executor
 *
 * Thin action execution layer for governed remediation.
 *
 * DESIGN CONSTRAINTS:
 * 1. Only typed action descriptors (no generic shell commands)
 * 2. Bridge executes, does NOT decide truth (verification owns that)
 * 3. No bypass paths (must flow through plan → policy → warrant → execution)
 *
 * This is the ONLY entry point for real action execution in remediation loops.
 */
const { isValidActionDescriptor } = require('./action-types');
const { createFailureResult } = require('./action-result');
const { restartService } = require('./handlers/restart-service');
const { sleep } = require('./handlers/sleep');
const { healthCheck } = require('./handlers/health-check');
/**
 * ChatActionBridge — Executes typed actions only
 */
class ChatActionBridge {
    constructor() {
        // Handler registry (closed set, no dynamic registration)
        this.handlers = {
            'system_service_restart': restartService,
            'sleep': sleep,
            'health_check': healthCheck
        };
    }
    /**
     * Execute a typed action descriptor
     * @param {import('./action-types').ActionDescriptor} action
     * @returns {Promise<import('./action-result').ActionResult>}
     */
    async execute(action) {
        const startedAt = new Date().toISOString();
        // Validate action structure
        if (!isValidActionDescriptor(action)) {
            return createFailureResult(action?.type || 'unknown', startedAt, 'Invalid action descriptor');
        }
        // Get handler
        const handler = this.handlers[action.type];
        if (!handler) {
            return createFailureResult(action.type, startedAt, `Unsupported action type: ${action.type}`);
        }
        // Execute handler
        try {
            const result = await handler(action);
            return result;
        }
        catch (err) {
            return createFailureResult(action.type, startedAt, `Handler execution failed: ${err.message}`, { target: action.target });
        }
    }
    /**
     * Get list of supported action types (for introspection)
     * @returns {string[]}
     */
    getSupportedActions() {
        return Object.keys(this.handlers);
    }
}
// Singleton instance
const actionBridge = new ChatActionBridge();
module.exports = { ChatActionBridge, actionBridge };
//# sourceMappingURL=chat-action-bridge-executor.js.map