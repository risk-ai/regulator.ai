/**
 * Vienna Core Runtime Initialization
 *
 * Replaces runtime-stub.js with real governed execution pipeline.
 *
 * Architecture:
 * - Intent Gateway (receives requests from console)
 * - Plan Generator (creates execution plans)
 * - Executor (runs governed actions)
 * - State Graph (persistent memory)
 * - Verification Engine (validates outcomes)
 * - Attestation Engine (creates execution records)
 */
/**
 * Initialize Vienna Core with real governance pipeline
 */
export declare function initializeViennaCore(config?: {
    workspace?: string;
    stateGraphPath?: string;
    env?: 'prod' | 'test';
}): Promise<any>;
/**
 * Get current Vienna Core instance
 */
export declare function getViennaCore(): any;
/**
 * Reset Vienna Core (for testing)
 */
export declare function resetViennaCore(): void;
//# sourceMappingURL=viennaCore.d.ts.map