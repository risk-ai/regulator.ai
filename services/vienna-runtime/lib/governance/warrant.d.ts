export = Warrant;
declare class Warrant {
    constructor(adapter: any);
    adapter: any;
    /**
     * Issue new warrant
     *
     * @param {object} options - Warrant options
     * @param {string} options.truthSnapshotId - Truth snapshot ID
     * @param {string} options.planId - Plan ID
     * @param {string} options.approvalId - Approval ID (T2 only)
     * @param {string} options.objective - Human-readable objective
     * @param {string} options.riskTier - 'T0' | 'T1' | 'T2'
     * @param {Array<string>} options.allowedActions - Allowed actions
     * @param {Array<string>} options.forbiddenActions - Forbidden actions
     * @param {number} options.expiresInMinutes - Expiration (default 15)
     * @returns {Promise<object>} Issued warrant
     */
    issue(options: {
        truthSnapshotId: string;
        planId: string;
        approvalId: string;
        objective: string;
        riskTier: string;
        allowedActions: Array<string>;
        forbiddenActions: Array<string>;
        expiresInMinutes: number;
    }): Promise<object>;
    /**
     * Verify warrant validity
     *
     * @param {string} warrantId - Warrant ID
     * @returns {Promise<object>} Validation result
     */
    verify(warrantId: string): Promise<object>;
    /**
     * Invalidate warrant
     *
     * @param {string} warrantId - Warrant ID
     * @param {string} reason - Invalidation reason
     * @returns {Promise<void>}
     */
    invalidate(warrantId: string, reason: string): Promise<void>;
    /**
     * List active warrants
     *
     * @returns {Promise<Array>} Active warrants
     */
    listActive(): Promise<any[]>;
    _validateRequired(fields: any): void;
    _validateTruthFreshness(truth: any, riskTier: any): Promise<void>;
    _generateChangeId(): string;
    _hashObject(obj: any): string;
    _assessTradingSafety(allowedActions: any): {
        trading_in_scope: boolean;
        risk: string;
    };
}
//# sourceMappingURL=warrant.d.ts.map