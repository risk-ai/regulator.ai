export namespace ATTESTATION_TYPES {
    let POLICY_EVALUATION: string;
    let APPROVAL_DECISION: string;
    let WARRANT_ISSUANCE: string;
    let EXECUTION_RESULT: string;
    let VERIFICATION_RESULT: string;
}
/**
 * Attestation Object
 */
export class Attestation {
    constructor(data: any);
    attestation_id: any;
    type: any;
    subject_id: any;
    issuer: any;
    issued_at: any;
    claims: any;
    evidence: any;
    signature: any;
    signature_algorithm: any;
    tenant_id: any;
    /**
     * Sign the attestation
     */
    sign(privateKey: any): any;
    /**
     * Verify attestation signature
     */
    verify(publicKey: any): boolean;
    /**
     * Get signable payload (excludes signature itself)
     */
    _getSignablePayload(): {
        attestation_id: any;
        type: any;
        subject_id: any;
        issuer: any;
        issued_at: any;
        claims: any;
        evidence: any;
        tenant_id: any;
    };
    /**
     * Generate attestation ID
     */
    _generateId(): string;
    toJSON(): {
        attestation_id: any;
        type: any;
        subject_id: any;
        issuer: any;
        issued_at: any;
        claims: any;
        evidence: any;
        signature: any;
        signature_algorithm: any;
        tenant_id: any;
    };
}
/**
 * Policy Evaluation Attestation
 */
export class PolicyEvaluationAttestation extends Attestation {
}
/**
 * Approval Decision Attestation
 */
export class ApprovalDecisionAttestation extends Attestation {
}
/**
 * Warrant Issuance Attestation
 */
export class WarrantIssuanceAttestation extends Attestation {
}
/**
 * Execution Result Attestation
 */
export class ExecutionResultAttestation extends Attestation {
}
/**
 * Verification Result Attestation
 */
export class VerificationResultAttestation extends Attestation {
}
/**
 * Attestation Manager
 */
export class AttestationManager {
    attestations: Map<any, any>;
    /**
     * Create policy evaluation attestation
     */
    attestPolicyEvaluation(policyEvaluation: any, issuer: any): PolicyEvaluationAttestation;
    /**
     * Create approval decision attestation
     */
    attestApprovalDecision(approval: any, issuer: any): ApprovalDecisionAttestation;
    /**
     * Create warrant issuance attestation
     */
    attestWarrantIssuance(warrant: any, issuer: any): WarrantIssuanceAttestation;
    /**
     * Create execution result attestation
     */
    attestExecutionResult(execution: any, issuer: any): ExecutionResultAttestation;
    /**
     * Create verification result attestation
     */
    attestVerificationResult(verification: any, issuer: any): VerificationResultAttestation;
    /**
     * Get attestation by ID
     */
    getAttestation(attestationId: any): any;
    /**
     * Verify attestation
     */
    verifyAttestation(attestationId: any, publicKey: any): any;
    /**
     * List attestations
     */
    listAttestations(filters?: {}): any[];
}
export function getAttestationManager(): any;
//# sourceMappingURL=attestation.d.ts.map