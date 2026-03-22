/**
 * Startup Validator
 * Phase 6A: System Hardening
 *
 * Ensures Vienna refuses to start in a broken state.
 *
 * Validates:
 * - Executor initialized
 * - Execution queue available
 * - Dead-letter queue available
 * - Event emitter initialized
 * - Provider registry loaded
 * - Runtime services wired
 *
 * If any critical component fails:
 * - systemState = failed
 * - startup aborted
 * - clear error surfaced
 */
export class StartupValidator {
    validationResults: any[];
    criticalFailures: any[];
    /**
     * Validate a Vienna Core instance
     *
     * @param {object} viennaCore - Vienna Core instance
     * @returns {object} Validation result
     */
    validate(viennaCore: object): object;
    /**
     * Check if Vienna Core is initialized
     */
    _checkInitialized(viennaCore: any, result: any): void;
    /**
     * Check executor availability
     */
    _checkExecutor(viennaCore: any, result: any): void;
    /**
     * Check queued executor availability
     */
    _checkQueuedExecutor(viennaCore: any, result: any): void;
    /**
     * Check execution queue availability
     */
    _checkExecutionQueue(viennaCore: any, result: any): void;
    /**
     * Check dead-letter queue availability
     */
    _checkDeadLetterQueue(viennaCore: any, result: any): void;
    /**
     * Check event emitter availability
     */
    _checkEventEmitter(viennaCore: any, result: any): void;
    /**
     * Check provider health manager (Phase 6B)
     */
    _checkProviderHealthManager(viennaCore: any, result: any): void;
    /**
     * Check crash recovery manager (Phase 6C)
     */
    _checkCrashRecoveryManager(viennaCore: any, result: any): void;
    /**
     * Check structured logger (Phase 6D)
     */
    _checkStructuredLogger(viennaCore: any, result: any): void;
    /**
     * Check runtime integrity guard (Phase 6E)
     */
    _checkRuntimeIntegrityGuard(viennaCore: any, result: any): void;
    /**
     * Check governance modules
     */
    _checkGovernanceModules(viennaCore: any, result: any): void;
    /**
     * Check adapter registration
     */
    _checkAdapters(viennaCore: any, result: any): void;
    /**
     * Format validation result as human-readable report
     */
    formatReport(result: any): string;
}
//# sourceMappingURL=startup-validator.d.ts.map