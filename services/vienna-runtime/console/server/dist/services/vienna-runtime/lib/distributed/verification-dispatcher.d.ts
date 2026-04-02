export = VerificationDispatcher;
declare class VerificationDispatcher {
    constructor(stateGraph: any, nodeRegistry: any);
    stateGraph: any;
    nodeRegistry: any;
    /**
     * Dispatch verification to node
     */
    dispatchVerification(executionId: any, verificationTask: any, options?: {}): Promise<{
        verification_id: string;
        node_id: any;
    }>;
    /**
     * Handle verification result
     */
    handleVerificationResult(verificationId: any, result: any): Promise<any>;
    /**
     * Get verification
     */
    getVerification(verificationId: any): Promise<{
        verification_id: any;
        execution_id: any;
        verification_node_id: any;
        verification_task: any;
        dispatched_at: any;
        completed_at: any;
        result: any;
        status: any;
    }>;
    /**
     * Update verification status
     */
    updateVerificationStatus(verificationId: any, status: any): Promise<void>;
    _sendVerificationRequest(node: any, verificationId: any, task: any): Promise<{
        acknowledged: boolean;
    }>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=verification-dispatcher.d.ts.map