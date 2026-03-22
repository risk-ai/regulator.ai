export class VerificationEngine {
    checkHandlers: Map<any, any>;
    /**
     * Register default check handlers
     */
    _registerDefaultHandlers(): void;
    /**
     * Register a custom check handler
     */
    registerCheckHandler(checkType: any, handler: any): void;
    /**
     * Run verification task
     *
     * @param {Object} verificationTask - VerificationTask object
     * @returns {Promise<Object>} VerificationResult
     */
    runVerification(verificationTask: any): Promise<any>;
    /**
     * Run all postcondition checks
     */
    _runChecks(postconditions: any): Promise<any[]>;
    /**
     * Verify stability over time window
     */
    _verifyStability(postconditions: any, windowMs: any): Promise<{
        window_ms: any;
        status: string;
        detail: string;
        checks: {
            timestamp: number;
            all_passed: boolean;
        }[];
    }>;
    /**
     * Determine achieved verification strength
     */
    _determineAchievedStrength(checkResults: any, stabilityResult: any, targetStrength: any): string;
    /**
     * Generate human-readable summary
     */
    _generateSummary(objective: any, status: any, checkResults: any, stabilityResult: any): string;
    /**
     * Timeout helper
     */
    _timeout(ms: any): Promise<any>;
    /**
     * Sleep helper
     */
    _sleep(ms: any): Promise<any>;
}
//# sourceMappingURL=verification-engine.d.ts.map