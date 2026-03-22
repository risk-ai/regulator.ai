/**
 * Lineage Validator
 *
 * Phase 3E: Fanout lineage validation
 *
 * RESPONSIBILITIES:
 * - Validate parent-child envelope relationships
 * - Ensure fanout sub-envelopes reference correct parent
 * - Detect orphaned envelopes (parent doesn't exist)
 * - Detect cycles in lineage graph
 * - Verify fanout index integrity
 *
 * DESIGN:
 * - Graph-based validation (envelopes as nodes, parent refs as edges)
 * - On-demand validation (not continuous)
 * - Returns structured validation report
 */
export class LineageValidator {
    envelopes: Map<any, any>;
    /**
     * Register envelope for lineage tracking
     *
     * @param {object} envelope - Envelope to register
     * @returns {void}
     */
    registerEnvelope(envelope: object): void;
    /**
     * Validate lineage integrity
     *
     * @returns {object} Validation report
     */
    validate(): object;
    /**
     * Check if envelope is part of a cycle
     *
     * @param {string} envelopeId - Envelope to check
     * @returns {boolean} True if cycle detected
     */
    hasCycle(envelopeId: string): boolean;
    /**
     * Get lineage chain for envelope
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {array} Lineage chain (from root to target)
     */
    getLineage(envelopeId: string): any[];
    /**
     * Get children of envelope
     *
     * @param {string} envelopeId - Parent envelope ID
     * @returns {array} Child envelopes
     */
    getChildren(envelopeId: string): any[];
    /**
     * Validate fanout sub-envelopes for parent
     *
     * @param {string} parentEnvelopeId - Parent envelope ID
     * @returns {object} Fanout validation report
     */
    validateFanout(parentEnvelopeId: string): object;
    /**
     * Clear all registered envelopes
     *
     * @returns {void}
     */
    clear(): void;
}
//# sourceMappingURL=lineage-validator.d.ts.map