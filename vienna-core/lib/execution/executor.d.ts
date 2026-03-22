export class Executor {
    constructor(viennaCore: any);
    viennaCore: any;
    adapters: Map<any, any>;
    /**
     * Register adapter for action type
     */
    registerAdapter(actionType: any, adapter: any): void;
    /**
     * Execute envelope with warrant authorization
     *
     * @param {object} envelope - Validated envelope
     * @returns {Promise<object>} Execution result
     */
    execute(envelope: object): Promise<object>;
    /**
     * Validate envelope structure
     */
    _validateEnvelope(envelope: any): void;
    /**
     * Verify warrant is valid
     */
    _verifyWarrant(warrantId: any): Promise<any>;
    /**
     * Run preflight checks
     */
    _runPreflightChecks(envelope: any, warrant: any): Promise<void>;
    /**
     * Execute single action via adapter
     */
    _executeAction(action: any, warrant: any, envelope: any): Promise<{
        success: boolean;
        error: string;
        action_type?: undefined;
        target?: undefined;
        result?: undefined;
    } | {
        success: boolean;
        action_type: any;
        target: any;
        result: any;
        error?: undefined;
    } | {
        success: boolean;
        action_type: any;
        target: any;
        error: any;
        result?: undefined;
    }>;
    /**
     * Check if action is trading-critical
     */
    _isTradingCritical(action: any): boolean;
    /**
     * Emit audit event
     */
    _emitAudit(event: any): Promise<void>;
    /**
     * Generate execution ID
     */
    _generateExecutionId(): string;
}
/**
 * Execution Error
 */
export class ExecutionError extends Error {
    constructor(code: any, message: any);
    code: any;
}
//# sourceMappingURL=executor.d.ts.map