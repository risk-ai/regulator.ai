export class OpenClawBridge {
    endpointManager: any;
    stateGraph: any;
    instructionTypes: Map<any, any>;
    /**
     * Set dependencies
     */
    setDependencies(endpointManager: any, stateGraph: any): void;
    /**
     * Register instruction type
     */
    registerInstructionType(instructionType: any): void;
    /**
     * Register default instruction types
     */
    _registerDefaultInstructionTypes(): void;
    /**
     * Create instruction envelope
     *
     * @param {Object} params - Instruction parameters
     * @returns {Object} Instruction envelope
     */
    createInstruction(params: any, ...args: any[]): any;
    /**
     * Dispatch instruction to OpenClaw
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result
     */
    dispatchInstruction(instruction: any): Promise<any>;
    /**
     * Send structured direction to OpenClaw
     *
     * @param {string} instruction_type - Instruction type
     * @param {Object} args - Arguments
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    sendDirection(instruction_type: string, args?: any, options?: any): Promise<any>;
    /**
     * Query OpenClaw status
     */
    queryStatus(): Promise<any>;
    /**
     * Inspect OpenClaw gateway
     */
    inspectGateway(): Promise<any>;
    /**
     * Check OpenClaw health
     */
    checkHealth(): Promise<any>;
    /**
     * Collect OpenClaw logs
     */
    collectLogs(service: any, lines?: number): Promise<any>;
    /**
     * Run OpenClaw workflow (T1)
     */
    runWorkflow(workflow: any, args?: {}, warrant_id?: any): Promise<any>;
    /**
     * Restart OpenClaw service (T1)
     */
    restartService(service: any, warrant_id?: any): Promise<any>;
    /**
     * List registered instruction types
     */
    listInstructionTypes(): {
        instruction_type: any;
        instruction_name: any;
        risk_tier: any;
    }[];
}
//# sourceMappingURL=openclaw-bridge.d.ts.map