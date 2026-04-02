/**
 * AttestationEngine
 *
 * Responsibilities:
 * - Generate attestation records after execution completes
 * - Store attestations in State Graph
 * - Link attestations to execution_id
 * - Support success, failed, blocked statuses
 */
export class AttestationEngine {
    stateGraph: any;
    initialize(): Promise<void>;
    /**
     * Create attestation record
     *
     * @param {Object} params
     * @param {string} params.execution_id - Execution ID (required)
     * @param {string} params.tenant_id - Tenant ID (optional)
     * @param {string} params.status - Attestation status: success | failed | blocked
     * @param {string} params.input_hash - Input hash (optional)
     * @param {string} params.output_hash - Output hash (optional)
     * @param {Object} params.metadata - Additional metadata (optional)
     * @returns {Promise<Object>} Attestation record
     */
    createAttestation({ execution_id, tenant_id, status, input_hash, output_hash, metadata }: {
        execution_id: string;
        tenant_id: string;
        status: string;
        input_hash: string;
        output_hash: string;
        metadata: any;
    }): Promise<any>;
    /**
     * Get attestation by execution_id
     *
     * @param {string} execution_id - Execution ID
     * @returns {Promise<Object|null>} Attestation record or null
     */
    getAttestation(execution_id: string): Promise<any | null>;
    /**
     * List attestations (with optional filters)
     *
     * @param {Object} filters
     * @param {string} filters.tenant_id - Filter by tenant
     * @param {string} filters.status - Filter by status
     * @param {number} filters.limit - Result limit (default: 100)
     * @returns {Promise<Array<Object>>} Attestation records
     */
    listAttestations(filters?: {
        tenant_id: string;
        status: string;
        limit: number;
    }): Promise<Array<any>>;
    /**
     * Check if attestation exists for execution
     *
     * @param {string} execution_id - Execution ID
     * @returns {Promise<boolean>}
     */
    hasAttestation(execution_id: string): Promise<boolean>;
}
//# sourceMappingURL=attestation-engine.d.ts.map