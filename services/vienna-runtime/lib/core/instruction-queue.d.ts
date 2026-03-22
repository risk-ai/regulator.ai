export class InstructionQueue {
    constructor(options?: {});
    queueDir: any;
    instructionsDir: string;
    resultsDir: string;
    pollInterval: any;
    resultTimeout: any;
    /**
     * Ensure queue directories exist
     */
    _ensureDirectories(): void;
    /**
     * Enqueue instruction for processing
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result envelope
     */
    enqueueInstruction(instruction: any): Promise<any>;
    /**
     * Process queued instructions (agent-side)
     *
     * @param {Function} handler - Instruction handler function
     * @param {Object} options - Processing options
     */
    processInstructions(handler: Function, options?: any): Promise<void>;
    /**
     * Clean up old instructions/results
     *
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanup(maxAge?: number): void;
}
//# sourceMappingURL=instruction-queue.d.ts.map