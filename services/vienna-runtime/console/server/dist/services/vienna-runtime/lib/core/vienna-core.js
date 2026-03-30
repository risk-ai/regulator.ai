/**
 * Vienna Core
 *
 * Main orchestration layer for Vienna OS.
 * Wires together State Graph, EndpointManager, ChatActionBridge, and OpenClawBridge.
 *
 * Design:
 * - Single initialization point
 * - Environment-aware (prod/test)
 * - Graceful fallback if State Graph unavailable
 */
const { getStateGraph } = require('../state/state-graph');
const { EndpointManager } = require('./endpoint-manager');
const { ChatActionBridge } = require('./chat-action-bridge');
const { OpenClawBridge } = require('./openclaw-bridge');
class ViennaCore {
    constructor(options = {}) {
        this.environment = options.environment || process.env.VIENNA_ENV || 'prod';
        this.stateGraph = null;
        this.endpointManager = null;
        this.chatActionBridge = null;
        this.openclawBridge = null;
        this.initialized = false;
    }
    /**
     * Initialize Vienna Core
     */
    async initialize() {
        if (this.initialized) {
            console.log('[ViennaCore] Already initialized');
            return;
        }
        console.log(`[ViennaCore] Initializing (environment: ${this.environment})...`);
        // 1. Initialize State Graph
        try {
            this.stateGraph = getStateGraph({ environment: this.environment });
            await this.stateGraph.initialize();
            console.log('[ViennaCore] State Graph initialized');
        }
        catch (error) {
            console.error('[ViennaCore] State Graph initialization failed:', error.message);
            console.warn('[ViennaCore] Continuing without State Graph (graceful degradation)');
            this.stateGraph = null;
        }
        // 2. Initialize EndpointManager
        this.endpointManager = new EndpointManager();
        if (this.stateGraph) {
            this.endpointManager.setStateGraph(this.stateGraph, true);
        }
        console.log('[ViennaCore] EndpointManager initialized');
        // 3. Register local endpoint
        await this.endpointManager.registerEndpoint({
            endpoint_id: 'local',
            endpoint_type: 'local',
            endpoint_name: 'Local Vienna Runtime',
            capabilities: ['read', 'write', 'exec'],
            metadata: {
                environment: this.environment,
                version: '1.0.0'
            }
        });
        console.log('[ViennaCore] Local endpoint registered');
        // 4. Register OpenClaw endpoint (if gateway URL configured)
        const openclawGatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://100.120.116.10:18789';
        try {
            await this.endpointManager.registerEndpoint({
                endpoint_id: 'openclaw',
                endpoint_type: 'remote',
                endpoint_name: 'OpenClaw Gateway',
                capabilities: ['query', 'execute', 'monitor'],
                metadata: {
                    gateway_url: openclawGatewayUrl,
                    version: 'unknown'
                },
                heartbeat_interval_ms: 60000 // 1 minute
            });
            console.log('[ViennaCore] OpenClaw endpoint registered');
        }
        catch (error) {
            console.warn('[ViennaCore] OpenClaw endpoint registration failed:', error.message);
            console.warn('[ViennaCore] Continuing without OpenClaw endpoint');
        }
        // 5. Initialize ChatActionBridge
        this.chatActionBridge = new ChatActionBridge();
        this.chatActionBridge.setDependencies(this.endpointManager, this.stateGraph);
        console.log('[ViennaCore] ChatActionBridge initialized');
        // 6. Initialize OpenClawBridge
        this.openclawBridge = new OpenClawBridge();
        this.openclawBridge.setDependencies(this.endpointManager, this.stateGraph);
        console.log('[ViennaCore] OpenClawBridge initialized');
        this.initialized = true;
        console.log('[ViennaCore] Initialization complete');
    }
    /**
     * Shutdown Vienna Core
     */
    shutdown() {
        console.log('[ViennaCore] Shutting down...');
        if (this.endpointManager) {
            this.endpointManager.shutdown();
        }
        if (this.stateGraph) {
            this.stateGraph.close();
        }
        this.initialized = false;
        console.log('[ViennaCore] Shutdown complete');
    }
    /**
     * Get status summary
     */
    getStatus() {
        return {
            initialized: this.initialized,
            environment: this.environment,
            state_graph_available: this.stateGraph !== null,
            endpoints: this.endpointManager ? this.endpointManager.listEndpoints() : [],
            chat_actions: this.chatActionBridge ? this.chatActionBridge.listActions() : [],
            openclaw_instructions: this.openclawBridge ? this.openclawBridge.listInstructionTypes() : []
        };
    }
    /**
     * Execute operator chat request
     *
     * @param {string} request - User chat request
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Result
     */
    async executeOperatorRequest(request, context = {}) {
        if (!this.initialized) {
            throw new Error('ViennaCore not initialized');
        }
        if (!this.chatActionBridge) {
            throw new Error('ChatActionBridge not initialized');
        }
        const result = await this.chatActionBridge.executeRequest(request, context);
        return result;
    }
    /**
     * Send direction to OpenClaw
     *
     * @param {string} instruction_type - Instruction type
     * @param {Object} args - Arguments
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async sendOpenClawDirection(instruction_type, args = {}, options = {}) {
        if (!this.initialized) {
            throw new Error('ViennaCore not initialized');
        }
        if (!this.openclawBridge) {
            throw new Error('OpenClawBridge not initialized');
        }
        const result = await this.openclawBridge.sendDirection(instruction_type, args, options);
        return result;
    }
    /**
     * Process chat message (operator interface)
     *
     * Phase 7.5c: Dispatch integrity for dashboard chat
     *
     * @param {string} message - User message
     * @param {Object} context - Context (conversationHistory, model, etc.)
     * @returns {Promise<string>} Response message
     */
    async processChatMessage(message, context = {}) {
        if (!this.initialized) {
            throw new Error('ViennaCore not initialized');
        }
        // Parse message for OpenClaw-targeted commands
        const openclawCommand = this._parseOpenClawCommand(message);
        if (openclawCommand) {
            // OpenClaw instruction path
            return await this._executeOpenClawCommand(openclawCommand);
        }
        // Local action path
        const localAction = this._parseLocalAction(message);
        if (localAction) {
            return await this._executeLocalAction(localAction);
        }
        // No structured command recognized - return guidance
        return this._formatHelpMessage();
    }
    /**
     * Parse message for OpenClaw-targeted commands
     *
     * @param {string} message - User message
     * @returns {Object|null} Command object or null
     */
    _parseOpenClawCommand(message) {
        const lower = message.toLowerCase().trim();
        // Pattern: "ask openclaw for status" / "openclaw status" / "query openclaw"
        if (lower.match(/(?:ask\s+)?openclaw\s+(?:for\s+)?status/i) ||
            lower.match(/query\s+openclaw/i) ||
            lower.match(/openclaw\s+query/i)) {
            return {
                instruction_type: 'query_status',
                args: {},
                risk_tier: 'T0'
            };
        }
        // Pattern: "inspect openclaw gateway" / "check openclaw gateway"
        if (lower.match(/(?:inspect|check)\s+openclaw\s+gateway/i) ||
            lower.match(/openclaw\s+gateway\s+(?:inspect|check)/i)) {
            return {
                instruction_type: 'inspect_gateway',
                args: {},
                risk_tier: 'T0'
            };
        }
        // Pattern: "check openclaw health" / "openclaw health"
        if (lower.match(/(?:check\s+)?openclaw\s+health/i) ||
            lower.match(/health\s+(?:check\s+)?openclaw/i)) {
            return {
                instruction_type: 'check_health',
                args: {},
                risk_tier: 'T0'
            };
        }
        // Pattern: "collect openclaw logs" / "get openclaw logs [service] [lines]"
        const logsMatch = lower.match(/(?:collect|get)\s+openclaw\s+logs(?:\s+(\w+))?(?:\s+(\d+))?/i);
        if (logsMatch) {
            return {
                instruction_type: 'collect_logs',
                args: {
                    service: logsMatch[1] || 'openclaw-gateway',
                    lines: logsMatch[2] ? parseInt(logsMatch[2]) : 100
                },
                risk_tier: 'T0'
            };
        }
        // Pattern: "restart openclaw service [service_name]" (T1 - requires warrant)
        const restartMatch = lower.match(/restart\s+openclaw\s+service\s+(\S+)/i);
        if (restartMatch) {
            return {
                instruction_type: 'restart_service',
                args: {
                    service: restartMatch[1]
                },
                risk_tier: 'T1',
                requires_warrant: true
            };
        }
        return null;
    }
    /**
     * Parse message for local actions
     *
     * @param {string} message - User message
     * @returns {Object|null} Action object or null
     */
    _parseLocalAction(message) {
        const lower = message.toLowerCase().trim();
        // Pattern: "show status" / "status"
        if (lower.match(/^(?:show\s+)?status$/i)) {
            return {
                action_type: 'show_status'
            };
        }
        // Pattern: "show services" / "list services"
        if (lower.match(/(?:show|list)\s+services/i)) {
            return {
                action_type: 'show_services'
            };
        }
        // Pattern: "show providers" / "list providers"
        if (lower.match(/(?:show|list)\s+providers/i)) {
            return {
                action_type: 'show_providers'
            };
        }
        // Pattern: "show incidents" / "list incidents"
        if (lower.match(/(?:show|list)\s+incidents/i)) {
            return {
                action_type: 'show_incidents'
            };
        }
        // Pattern: "show endpoints" / "list endpoints"
        if (lower.match(/(?:show|list)\s+endpoints/i)) {
            return {
                action_type: 'show_endpoints'
            };
        }
        return null;
    }
    /**
     * Execute OpenClaw command
     *
     * @param {Object} command - Command object
     * @returns {Promise<string>} Formatted response
     */
    async _executeOpenClawCommand(command) {
        const { instruction_type, args, risk_tier, requires_warrant } = command;
        // T1 commands require warrant
        if (requires_warrant) {
            return `❌ **T1 instruction requires warrant**\n\n` +
                `Instruction: \`${instruction_type}\`\n` +
                `Risk tier: ${risk_tier}\n\n` +
                `To execute this command:\n` +
                `1. Issue warrant via governance system\n` +
                `2. Include warrant_id in request\n\n` +
                `**No instruction was sent.**`;
        }
        try {
            console.log(`[ViennaCore] Dispatching OpenClaw instruction: ${instruction_type}`);
            const result = await this.sendOpenClawDirection(instruction_type, args);
            console.log(`[ViennaCore] Instruction result: ${result.status}`);
            if (result.status === 'success') {
                return this._formatOpenClawSuccess(instruction_type, result);
            }
            else {
                return this._formatOpenClawFailure(instruction_type, result);
            }
        }
        catch (error) {
            console.error(`[ViennaCore] Instruction dispatch failed:`, error);
            return `❌ **Dispatch failed before queue write**\n\n` +
                `Instruction: \`${instruction_type}\`\n` +
                `Reason: ${error.message}\n\n` +
                `**No instruction was sent.**`;
        }
    }
    /**
     * Execute local action
     *
     * @param {Object} action - Action object
     * @returns {Promise<string>} Formatted response
     */
    async _executeLocalAction(action) {
        const { action_type } = action;
        try {
            console.log(`[ViennaCore] Executing local action: ${action_type}`);
            const result = await this.executeOperatorRequest(action_type, {});
            console.log(`[ViennaCore] Action result: ${result.status}`);
            if (result.status === 'success') {
                return this._formatLocalSuccess(action_type, result);
            }
            else {
                return this._formatLocalFailure(action_type, result);
            }
        }
        catch (error) {
            console.error(`[ViennaCore] Action execution failed:`, error);
            return `❌ **Action execution failed**\n\n` +
                `Action: \`${action_type}\`\n` +
                `Reason: ${error.message}`;
        }
    }
    /**
     * Format OpenClaw success response
     */
    _formatOpenClawSuccess(instruction_type, result) {
        const { instruction_id, result: data, duration_ms } = result;
        let message = `✅ **Instruction dispatched**\n\n` +
            `Instruction ID: \`${instruction_id}\`\n` +
            `Type: \`${instruction_type}\`\n` +
            `Duration: ${duration_ms}ms\n\n`;
        // Format result based on instruction type
        if (instruction_type === 'query_status') {
            message += `**OpenClaw Status:**\n` +
                `- Status: ${data.status}\n` +
                `- Gateway: ${data.gateway_reachable ? '✓ reachable' : '✗ unreachable'}\n` +
                `- Timestamp: ${data.timestamp}`;
        }
        else if (instruction_type === 'inspect_gateway') {
            message += `**Gateway Inspection:**\n` +
                `- Port: ${data.port}\n` +
                `- Listening: ${data.listening ? '✓ yes' : '✗ no'}\n` +
                `- Details: \`${data.details}\``;
        }
        else if (instruction_type === 'check_health') {
            message += `**Health Check:**\n` +
                `- Gateway: ${data.gateway_status}\n` +
                `- Healthy: ${data.healthy ? '✓ yes' : '✗ no'}\n` +
                `- Timestamp: ${data.timestamp}`;
        }
        else if (instruction_type === 'collect_logs') {
            const logLines = data.logs ? data.logs.split('\n').length : 0;
            message += `**Logs Collected:**\n` +
                `- Service: ${data.service}\n` +
                `- Lines: ${logLines}\n\n` +
                `\`\`\`\n${data.logs ? data.logs.substring(0, 1000) : 'No logs available'}\n\`\`\``;
        }
        else {
            message += `**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        }
        return message;
    }
    /**
     * Format OpenClaw failure response
     */
    _formatOpenClawFailure(instruction_type, result) {
        const { instruction_id, error } = result;
        return `❌ **Instruction failed**\n\n` +
            `Instruction ID: \`${instruction_id}\`\n` +
            `Type: \`${instruction_type}\`\n` +
            `Error: ${error}\n\n` +
            `**The instruction was sent but execution failed.**`;
    }
    /**
     * Format local action success response
     */
    _formatLocalSuccess(action_type, result) {
        const { data } = result;
        let message = `✅ **Action executed**\n\n` +
            `Action: \`${action_type}\`\n\n`;
        if (Array.isArray(data)) {
            message += `**Results:** ${data.length} items\n\n`;
            data.forEach((item, idx) => {
                message += `${idx + 1}. ${JSON.stringify(item)}\n`;
            });
        }
        else {
            message += `**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        }
        return message;
    }
    /**
     * Format local action failure response
     */
    _formatLocalFailure(action_type, result) {
        const { error } = result;
        return `❌ **Action failed**\n\n` +
            `Action: \`${action_type}\`\n` +
            `Error: ${error}`;
    }
    /**
     * Format help message
     */
    _formatHelpMessage() {
        return `**Vienna Operator Chat**\n\n` +
            `**OpenClaw commands:**\n` +
            `- \`ask openclaw for status\` — Query OpenClaw status\n` +
            `- \`inspect openclaw gateway\` — Inspect gateway port/process\n` +
            `- \`check openclaw health\` — Check OpenClaw health\n` +
            `- \`collect openclaw logs [service] [lines]\` — Collect service logs\n\n` +
            `**Local actions:**\n` +
            `- \`show status\` — Vienna runtime status\n` +
            `- \`show services\` — List services\n` +
            `- \`show providers\` — List LLM providers\n` +
            `- \`show incidents\` — List incidents\n` +
            `- \`show endpoints\` — List endpoints\n\n` +
            `**Type a command to execute, or ask for help.**`;
    }
}
// Singleton instance
let instance = null;
function getViennaCore(options = {}) {
    if (!instance) {
        instance = new ViennaCore(options);
    }
    return instance;
}
/**
 * Reset singleton for testing
 */
function _resetVienniaCoreForTesting() {
    if (instance) {
        instance.shutdown();
        instance = null;
    }
}
module.exports = {
    ViennaCore,
    getViennaCore,
    _resetVienniaCoreForTesting // For tests only
};
//# sourceMappingURL=vienna-core.js.map