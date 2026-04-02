export class ViennaCore {
    constructor(options?: {});
    environment: any;
    stateGraph: any;
    endpointManager: EndpointManager;
    chatActionBridge: ChatActionBridge;
    openclawBridge: OpenClawBridge;
    initialized: boolean;
    /**
     * Initialize Vienna Core
     */
    initialize(): Promise<void>;
    /**
     * Shutdown Vienna Core
     */
    shutdown(): void;
    /**
     * Get status summary
     */
    getStatus(): {
        initialized: boolean;
        environment: any;
        state_graph_available: boolean;
        endpoints: any[];
        chat_actions: any[];
        openclaw_instructions: {
            instruction_type: any;
            instruction_name: any;
            risk_tier: any;
        }[];
    };
    /**
     * Execute operator chat request
     *
     * @param {string} request - User chat request
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Result
     */
    executeOperatorRequest(request: string, context?: any): Promise<any>;
    /**
     * Send direction to OpenClaw
     *
     * @param {string} instruction_type - Instruction type
     * @param {Object} args - Arguments
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    sendOpenClawDirection(instruction_type: string, args?: any, options?: any): Promise<any>;
    /**
     * Process chat message (operator interface)
     *
     * Phase 7.5c: Dispatch integrity for dashboard chat
     *
     * @param {string} message - User message
     * @param {Object} context - Context (conversationHistory, model, etc.)
     * @returns {Promise<string>} Response message
     */
    processChatMessage(message: string, context?: any): Promise<string>;
    /**
     * Parse message for OpenClaw-targeted commands
     *
     * @param {string} message - User message
     * @returns {Object|null} Command object or null
     */
    _parseOpenClawCommand(message: string): any | null;
    /**
     * Parse message for local actions
     *
     * @param {string} message - User message
     * @returns {Object|null} Action object or null
     */
    _parseLocalAction(message: string): any | null;
    /**
     * Execute OpenClaw command
     *
     * @param {Object} command - Command object
     * @returns {Promise<string>} Formatted response
     */
    _executeOpenClawCommand(command: any): Promise<string>;
    /**
     * Execute local action
     *
     * @param {Object} action - Action object
     * @returns {Promise<string>} Formatted response
     */
    _executeLocalAction(action: any): Promise<string>;
    /**
     * Format OpenClaw success response
     */
    _formatOpenClawSuccess(instruction_type: any, result: any): string;
    /**
     * Format OpenClaw failure response
     */
    _formatOpenClawFailure(instruction_type: any, result: any): string;
    /**
     * Format local action success response
     */
    _formatLocalSuccess(action_type: any, result: any): string;
    /**
     * Format local action failure response
     */
    _formatLocalFailure(action_type: any, result: any): string;
    /**
     * Format help message
     */
    _formatHelpMessage(): string;
}
export function getViennaCore(options?: {}): any;
/**
 * Reset singleton for testing
 */
export function _resetVienniaCoreForTesting(): void;
import { EndpointManager } from "./endpoint-manager";
import { ChatActionBridge } from "./chat-action-bridge";
import { OpenClawBridge } from "./openclaw-bridge";
//# sourceMappingURL=vienna-core.d.ts.map