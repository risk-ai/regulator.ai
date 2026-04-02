/**
 * Vienna Attestation System
 *
 * Signed attestations for policies, approvals, warrants, executions, and verifications.
 */
const crypto = require('crypto');
/**
 * Attestation Types
 */
const ATTESTATION_TYPES = {
    POLICY_EVALUATION: 'policy_evaluation',
    APPROVAL_DECISION: 'approval_decision',
    WARRANT_ISSUANCE: 'warrant_issuance',
    EXECUTION_RESULT: 'execution_result',
    VERIFICATION_RESULT: 'verification_result'
};
/**
 * Attestation Object
 */
class Attestation {
    constructor(data) {
        this.attestation_id = data.attestation_id || this._generateId();
        this.type = data.type;
        this.subject_id = data.subject_id; // ID of thing being attested
        this.issuer = data.issuer; // Who issued the attestation
        this.issued_at = data.issued_at || new Date().toISOString();
        this.claims = data.claims || {}; // The assertions being made
        this.evidence = data.evidence || {}; // Supporting evidence
        this.signature = data.signature || null;
        this.signature_algorithm = data.signature_algorithm || 'sha256';
        this.tenant_id = data.tenant_id;
    }
    /**
     * Sign the attestation
     */
    sign(privateKey) {
        const payload = this._getSignablePayload();
        const hash = crypto.createHash(this.signature_algorithm);
        hash.update(JSON.stringify(payload));
        // In production, use asymmetric signing with privateKey
        // For now, use hash as signature
        this.signature = hash.digest('hex');
        return this.signature;
    }
    /**
     * Verify attestation signature
     */
    verify(publicKey) {
        if (!this.signature) {
            return false;
        }
        const payload = this._getSignablePayload();
        const hash = crypto.createHash(this.signature_algorithm);
        hash.update(JSON.stringify(payload));
        const expectedSignature = hash.digest('hex');
        return this.signature === expectedSignature;
    }
    /**
     * Get signable payload (excludes signature itself)
     */
    _getSignablePayload() {
        return {
            attestation_id: this.attestation_id,
            type: this.type,
            subject_id: this.subject_id,
            issuer: this.issuer,
            issued_at: this.issued_at,
            claims: this.claims,
            evidence: this.evidence,
            tenant_id: this.tenant_id
        };
    }
    /**
     * Generate attestation ID
     */
    _generateId() {
        return `attestation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    toJSON() {
        return {
            attestation_id: this.attestation_id,
            type: this.type,
            subject_id: this.subject_id,
            issuer: this.issuer,
            issued_at: this.issued_at,
            claims: this.claims,
            evidence: this.evidence,
            signature: this.signature,
            signature_algorithm: this.signature_algorithm,
            tenant_id: this.tenant_id
        };
    }
}
/**
 * Policy Evaluation Attestation
 */
class PolicyEvaluationAttestation extends Attestation {
    constructor(data) {
        super({
            ...data,
            type: ATTESTATION_TYPES.POLICY_EVALUATION,
            claims: {
                policy_id: data.policy_id,
                policy_version: data.policy_version,
                evaluation_result: data.evaluation_result,
                constraints_evaluated: data.constraints_evaluated || [],
                decision: data.decision // 'allow' or 'deny'
            },
            evidence: {
                input_context: data.input_context || {},
                constraint_results: data.constraint_results || [],
                evaluated_at: new Date().toISOString()
            }
        });
    }
}
/**
 * Approval Decision Attestation
 */
class ApprovalDecisionAttestation extends Attestation {
    constructor(data) {
        super({
            ...data,
            type: ATTESTATION_TYPES.APPROVAL_DECISION,
            claims: {
                approval_id: data.approval_id,
                plan_id: data.plan_id,
                decision: data.decision, // 'approved' or 'denied'
                reviewer: data.reviewer,
                reviewed_at: data.reviewed_at
            },
            evidence: {
                approval_reason: data.approval_reason || null,
                denial_reason: data.denial_reason || null,
                plan_summary: data.plan_summary || {},
                risk_tier: data.risk_tier
            }
        });
    }
}
/**
 * Warrant Issuance Attestation
 */
class WarrantIssuanceAttestation extends Attestation {
    constructor(data) {
        super({
            ...data,
            type: ATTESTATION_TYPES.WARRANT_ISSUANCE,
            claims: {
                warrant_id: data.warrant_id,
                plan_id: data.plan_id,
                issued_by: data.issued_by,
                issued_at: data.issued_at,
                authority: data.authority // What authority granted the warrant
            },
            evidence: {
                plan_approved: data.plan_approved,
                approval_id: data.approval_id || null,
                policy_evaluation: data.policy_evaluation || {},
                truth_snapshot: data.truth_snapshot || {}
            }
        });
    }
}
/**
 * Execution Result Attestation
 */
class ExecutionResultAttestation extends Attestation {
    constructor(data) {
        super({
            ...data,
            type: ATTESTATION_TYPES.EXECUTION_RESULT,
            claims: {
                execution_id: data.execution_id,
                plan_id: data.plan_id,
                status: data.status,
                started_at: data.started_at,
                completed_at: data.completed_at,
                executor: data.executor
            },
            evidence: {
                steps_executed: data.steps_executed || [],
                execution_result: data.execution_result || {},
                errors: data.errors || [],
                duration_ms: data.duration_ms
            }
        });
    }
}
/**
 * Verification Result Attestation
 */
class VerificationResultAttestation extends Attestation {
    constructor(data) {
        super({
            ...data,
            type: ATTESTATION_TYPES.VERIFICATION_RESULT,
            claims: {
                verification_id: data.verification_id,
                execution_id: data.execution_id,
                objective_achieved: data.objective_achieved,
                verified_at: data.verified_at,
                verifier: data.verifier
            },
            evidence: {
                checks_performed: data.checks_performed || [],
                checks_passed: data.checks_passed || 0,
                checks_failed: data.checks_failed || 0,
                verification_details: data.verification_details || {}
            }
        });
    }
}
/**
 * Attestation Manager
 */
class AttestationManager {
    constructor() {
        this.attestations = new Map();
    }
    /**
     * Create policy evaluation attestation
     */
    attestPolicyEvaluation(policyEvaluation, issuer) {
        const attestation = new PolicyEvaluationAttestation({
            ...policyEvaluation,
            issuer
        });
        attestation.sign();
        this.attestations.set(attestation.attestation_id, attestation);
        return attestation;
    }
    /**
     * Create approval decision attestation
     */
    attestApprovalDecision(approval, issuer) {
        const attestation = new ApprovalDecisionAttestation({
            ...approval,
            issuer
        });
        attestation.sign();
        this.attestations.set(attestation.attestation_id, attestation);
        return attestation;
    }
    /**
     * Create warrant issuance attestation
     */
    attestWarrantIssuance(warrant, issuer) {
        const attestation = new WarrantIssuanceAttestation({
            ...warrant,
            issuer
        });
        attestation.sign();
        this.attestations.set(attestation.attestation_id, attestation);
        return attestation;
    }
    /**
     * Create execution result attestation
     */
    attestExecutionResult(execution, issuer) {
        const attestation = new ExecutionResultAttestation({
            ...execution,
            issuer
        });
        attestation.sign();
        this.attestations.set(attestation.attestation_id, attestation);
        return attestation;
    }
    /**
     * Create verification result attestation
     */
    attestVerificationResult(verification, issuer) {
        const attestation = new VerificationResultAttestation({
            ...verification,
            issuer
        });
        attestation.sign();
        this.attestations.set(attestation.attestation_id, attestation);
        return attestation;
    }
    /**
     * Get attestation by ID
     */
    getAttestation(attestationId) {
        return this.attestations.get(attestationId);
    }
    /**
     * Verify attestation
     */
    verifyAttestation(attestationId, publicKey) {
        const attestation = this.getAttestation(attestationId);
        if (!attestation) {
            throw new Error(`ATTESTATION_NOT_FOUND: ${attestationId}`);
        }
        return attestation.verify(publicKey);
    }
    /**
     * List attestations
     */
    listAttestations(filters = {}) {
        let attestations = Array.from(this.attestations.values());
        if (filters.type) {
            attestations = attestations.filter(a => a.type === filters.type);
        }
        if (filters.subject_id) {
            attestations = attestations.filter(a => a.subject_id === filters.subject_id);
        }
        if (filters.issuer) {
            attestations = attestations.filter(a => a.issuer === filters.issuer);
        }
        if (filters.tenant_id) {
            attestations = attestations.filter(a => a.tenant_id === filters.tenant_id);
        }
        return attestations;
    }
}
/**
 * Global attestation manager instance
 */
let globalAttestationManager = null;
function getAttestationManager() {
    if (!globalAttestationManager) {
        globalAttestationManager = new AttestationManager();
    }
    return globalAttestationManager;
}
module.exports = {
    ATTESTATION_TYPES,
    Attestation,
    PolicyEvaluationAttestation,
    ApprovalDecisionAttestation,
    WarrantIssuanceAttestation,
    ExecutionResultAttestation,
    VerificationResultAttestation,
    AttestationManager,
    getAttestationManager
};
//# sourceMappingURL=attestation.js.map