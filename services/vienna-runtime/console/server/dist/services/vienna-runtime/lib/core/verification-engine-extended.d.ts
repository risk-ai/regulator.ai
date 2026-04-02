/**
 * Extended Verification Engine
 *
 * Wraps base VerificationEngine with retry logic and failure classification.
 */
export class ExtendedVerificationEngine extends VerificationEngine {
    constructor(stateGraph: any, chatActionBridge: any);
    /**
     * Run verification with retry logic
     *
     * @param {object} verificationTask - Verification task
     * @param {object} context - Execution context
     * @returns {Promise<ExtendedVerificationResult>}
     */
    runVerificationWithRetry(verificationTask: object, context?: object): Promise<ExtendedVerificationResult>;
    /**
     * Classify verification failure
     *
     * Analyzes failed checks and determines failure classification.
     */
    _classifyVerificationFailure(verificationTask: any, result: any): string;
    /**
     * Build human-readable failure reason
     */
    _buildFailureReason(verificationTask: any, result: any, failureClass: any): string;
    /**
     * Sleep utility
     */
    _sleep(ms: any): Promise<any>;
    /**
     * Get template binding enforcement status
     *
     * Validates that verification task matches template requirements.
     */
    validateTemplateBinding(verificationTask: any): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Enrich verification task with template defaults
     *
     * Merges template postconditions with runtime context.
     */
    enrichVerificationTask(verificationTask: any, runtimeContext?: {}): any;
}
/**
 * Extended verification result
 */
export class ExtendedVerificationResult {
    constructor(baseResult: any, metadata?: {});
    baseResult: any;
    attempts: any;
    failureClass: any;
    retryHistory: any;
    finalFailureReason: any;
    totalDuration: any;
    toJSON(): any;
}
import { FailureClass } from "./verification-templates-extended";
import { VerificationEngine } from "./verification-engine";
export { FailureClass };
//# sourceMappingURL=verification-engine-extended.d.ts.map