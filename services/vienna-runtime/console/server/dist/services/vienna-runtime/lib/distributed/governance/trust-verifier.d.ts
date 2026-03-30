export = TrustVerifier;
declare class TrustVerifier {
    constructor(stateGraph: any, nodeRegistry: any);
    stateGraph: any;
    nodeRegistry: any;
    /**
     * Verify node identity
     */
    verifyNodeIdentity(nodeId: any, credentials: any): Promise<{
        verified: boolean;
        node_id: any;
        environment: any;
    }>;
    /**
     * Verify execution result
     */
    verifyExecutionResult(executionId: any, nodeId: any, result: any): Promise<{
        verified: boolean;
        execution_id: any;
        node_id: any;
    }>;
    /**
     * Verify state transition attestation
     */
    verifyStateAttestation(attestation: any): Promise<{
        verified: boolean;
        attestation_id: any;
    }>;
    /**
     * Generate execution signature
     */
    generateExecutionSignature(executionId: any, result: any, nodeId: any): string;
    _verifySignature(result: any, nodeId: any): boolean;
    _validateResultSchema(result: any): boolean;
    _verifyExecutionAuthorization(executionId: any, nodeId: any): Promise<boolean>;
}
//# sourceMappingURL=trust-verifier.d.ts.map