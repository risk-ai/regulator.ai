export class ChatActionBridge {
    actions: Map<any, any>;
    endpointManager: any;
    stateGraph: any;
    policyEngine: any;
    intentClassifier: IntentClassifier;
    verificationEngine: VerificationEngine;
    /**
     * Set dependencies
     */
    setDependencies(endpointManager: any, stateGraph: any): void;
    /**
     * Set policy engine (Phase 8.4)
     */
    setPolicyEngine(policyEngine: any): void;
    /**
     * Register a chat action
     *
     * @param {Object} action - Action definition
     */
    registerAction(action: any): void;
    /**
     * Register default local actions
     */
    _registerDefaultActions(): void;
    /**
     * Parse chat request into action
     *
     * @param {string} request - User chat request
     * @returns {Object|null} Parsed action or null
     */
    parseRequest(request: string): any | null;
    /**
     * Emit execution ledger event
     * Helper method for Phase 8.3 execution ledger integration
     *
     * @param {string} executionId - Execution ID
     * @param {string} eventType - Event type
     * @param {string} stage - Lifecycle stage
     * @param {Object} payload - Event payload
     * @param {Object} context - Execution context
     */
    _emitLedgerEvent(executionId: string, eventType: string, stage: string, payload?: any, context?: any): void;
    /**
     * Interpret natural language and execute
     * Phase 7.6: Intent Interpretation Layer
     * Phase 8.3: Execution Ledger Integration
     *
     * @param {string} request - User chat request
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Result with interpretation metadata
     */
    interpretAndExecute(request: string, context?: any): Promise<any>;
    /**
     * Execute normalized action from intent classifier
     */
    _executeNormalizedAction(normalizedAction: any, context: any, ...args: any[]): Promise<{
        success: boolean;
        error: string;
        recognized: boolean;
        action_id?: undefined;
        action_name?: undefined;
        risk_tier?: undefined;
        target_endpoint?: undefined;
        result?: undefined;
    } | {
        success: boolean;
        action_id: any;
        action_name: any;
        risk_tier: any;
        target_endpoint: any;
        result: any;
        error?: undefined;
        recognized?: undefined;
    } | {
        success: boolean;
        action_id: any;
        action_name: any;
        error: any;
        recognized?: undefined;
        risk_tier?: undefined;
        target_endpoint?: undefined;
        result?: undefined;
    }>;
    /**
     * Execute parsed action (backward compatibility)
     */
    _executeParsedAction(parsedAction: any, context: any): Promise<{
        success: boolean;
        error: string;
        recognized: boolean;
        action_id?: undefined;
        action_name?: undefined;
        risk_tier?: undefined;
        target_endpoint?: undefined;
        result?: undefined;
    } | {
        success: boolean;
        action_id: any;
        action_name: any;
        risk_tier: any;
        target_endpoint: any;
        result: any;
        error?: undefined;
        recognized?: undefined;
    } | {
        success: boolean;
        action_id: any;
        action_name: any;
        error: any;
        recognized?: undefined;
        risk_tier?: undefined;
        target_endpoint?: undefined;
        result?: undefined;
    }>;
    /**
     * Build VerificationTask from plan.verification_spec
     *
     * @param {Object} plan - Plan object with verification_spec
     * @param {Object} executionResult - Result from execution
     * @param {Object} context - Execution context
     * @returns {Object} VerificationTask
     */
    _buildVerificationTask(plan: any, executionResult: any, context: any): any;
    /**
     * Generate operator-visible workflow summary
     *
     * @param {string} objective - Plan objective
     * @param {string} executionStatus - Execution status (success/failed)
     * @param {string} verificationStatus - Verification status (success/failed/etc)
     * @param {boolean} objectiveAchieved - Whether objective was achieved
     * @returns {string} Human-readable summary
     */
    _generateWorkflowSummary(objective: string, executionStatus: string, verificationStatus: string, objectiveAchieved: boolean): string;
    /**
     * Execute chat action (legacy method, calls interpretAndExecute)
     *
     * @param {string} request - User chat request
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Result
     */
    executeRequest(request: string, context?: any): Promise<any>;
    /**
     * List all registered actions
     *
     * @returns {Array} All actions
     */
    listActions(): any[];
    /**
     * Execute a plan directly (Phase 9.5 — Remediation Trigger Integration)
     *
     * Used by objective remediation to execute pre-created plans through the
     * governed pipeline (Policy → Warrant → Execution → Verification).
     *
     * @param {string} planId - Plan ID to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result with verification
     */
    executePlan(planId: string, context?: any): Promise<any>;
    /**
     * Execute remediation plan (Phase 9.7.3)
     *
     * Uses RemediationExecutor for governed action execution.
     *
     * @param {string} planId - Plan ID
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    executeRemediationPlan(planId: string, context?: any): Promise<any>;
}
import { IntentClassifier } from "./intent-classifier.js";
import { VerificationEngine } from "./verification-engine.js";
//# sourceMappingURL=chat-action-bridge.d.ts.map