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
class LineageValidator {
    constructor() {
        // Map: envelope_id → envelope
        this.envelopes = new Map();
    }
    /**
     * Register envelope for lineage tracking
     *
     * @param {object} envelope - Envelope to register
     * @returns {void}
     */
    registerEnvelope(envelope) {
        if (!envelope.envelope_id) {
            throw new Error('Envelope must have envelope_id');
        }
        this.envelopes.set(envelope.envelope_id, {
            envelope_id: envelope.envelope_id,
            parent_envelope_id: envelope.parent_envelope_id || null,
            objective_id: envelope.objective_id || null,
            fanout_index: envelope.fanout_index,
            action_type: envelope.action_type,
        });
    }
    /**
     * Validate lineage integrity
     *
     * @returns {object} Validation report
     */
    validate() {
        const report = {
            total_envelopes: this.envelopes.size,
            valid: true,
            issues: [],
            orphaned: [],
            cycles: [],
            invalid_fanout_indices: [],
        };
        // Check each envelope
        for (const [envId, envelope] of this.envelopes.entries()) {
            // Check 1: Orphaned (parent doesn't exist)
            if (envelope.parent_envelope_id && !this.envelopes.has(envelope.parent_envelope_id)) {
                report.orphaned.push({
                    envelope_id: envId,
                    parent_envelope_id: envelope.parent_envelope_id,
                    issue: 'Parent envelope does not exist',
                });
                report.valid = false;
            }
            // Check 2: Cycle detection
            if (this.hasCycle(envId)) {
                report.cycles.push({
                    envelope_id: envId,
                    issue: 'Envelope is part of a lineage cycle',
                });
                report.valid = false;
            }
            // Check 3: Fanout index integrity
            if (envelope.fanout_index !== undefined) {
                if (typeof envelope.fanout_index !== 'number' || envelope.fanout_index < 0) {
                    report.invalid_fanout_indices.push({
                        envelope_id: envId,
                        fanout_index: envelope.fanout_index,
                        issue: 'Invalid fanout index (must be non-negative number)',
                    });
                    report.valid = false;
                }
            }
        }
        // Summary issue count
        report.issues = [
            ...report.orphaned,
            ...report.cycles,
            ...report.invalid_fanout_indices,
        ];
        return report;
    }
    /**
     * Check if envelope is part of a cycle
     *
     * @param {string} envelopeId - Envelope to check
     * @returns {boolean} True if cycle detected
     */
    hasCycle(envelopeId) {
        const visited = new Set();
        let current = envelopeId;
        while (current) {
            if (visited.has(current)) {
                return true; // Cycle detected
            }
            visited.add(current);
            const envelope = this.envelopes.get(current);
            if (!envelope || !envelope.parent_envelope_id) {
                break; // Reached root or orphan
            }
            current = envelope.parent_envelope_id;
        }
        return false;
    }
    /**
     * Get lineage chain for envelope
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {array} Lineage chain (from root to target)
     */
    getLineage(envelopeId) {
        const chain = [];
        let current = envelopeId;
        const visited = new Set();
        while (current) {
            if (visited.has(current)) {
                // Cycle detected, break
                chain.push({
                    envelope_id: current,
                    cycle: true,
                });
                break;
            }
            visited.add(current);
            const envelope = this.envelopes.get(current);
            if (!envelope) {
                // Orphaned or not registered
                chain.push({
                    envelope_id: current,
                    missing: true,
                });
                break;
            }
            chain.push({
                envelope_id: current,
                parent_envelope_id: envelope.parent_envelope_id,
                objective_id: envelope.objective_id,
                fanout_index: envelope.fanout_index,
            });
            current = envelope.parent_envelope_id;
        }
        // Reverse to get root → target order
        return chain.reverse();
    }
    /**
     * Get children of envelope
     *
     * @param {string} envelopeId - Parent envelope ID
     * @returns {array} Child envelopes
     */
    getChildren(envelopeId) {
        const children = [];
        for (const [childId, envelope] of this.envelopes.entries()) {
            if (envelope.parent_envelope_id === envelopeId) {
                children.push({
                    envelope_id: childId,
                    fanout_index: envelope.fanout_index,
                    objective_id: envelope.objective_id,
                });
            }
        }
        // Sort by fanout_index if present
        children.sort((a, b) => {
            if (a.fanout_index === undefined || b.fanout_index === undefined) {
                return 0;
            }
            return a.fanout_index - b.fanout_index;
        });
        return children;
    }
    /**
     * Validate fanout sub-envelopes for parent
     *
     * @param {string} parentEnvelopeId - Parent envelope ID
     * @returns {object} Fanout validation report
     */
    validateFanout(parentEnvelopeId) {
        const children = this.getChildren(parentEnvelopeId);
        const report = {
            parent_envelope_id: parentEnvelopeId,
            child_count: children.length,
            valid: true,
            issues: [],
        };
        if (children.length === 0) {
            return report; // No children, nothing to validate
        }
        // Check fanout index sequence
        const indices = children
            .map(c => c.fanout_index)
            .filter(idx => idx !== undefined);
        if (indices.length !== children.length) {
            report.issues.push({
                issue: 'Not all children have fanout_index',
                children_without_index: children.filter(c => c.fanout_index === undefined).length,
            });
            report.valid = false;
        }
        // Check for duplicate indices
        const uniqueIndices = new Set(indices);
        if (uniqueIndices.size !== indices.length) {
            report.issues.push({
                issue: 'Duplicate fanout indices detected',
                total_indices: indices.length,
                unique_indices: uniqueIndices.size,
            });
            report.valid = false;
        }
        // Check for gaps in sequence (if indices should be sequential)
        if (indices.length > 0) {
            const sortedIndices = [...indices].sort((a, b) => a - b);
            const expectedMax = sortedIndices.length - 1;
            const actualMax = sortedIndices[sortedIndices.length - 1];
            if (actualMax > expectedMax) {
                report.issues.push({
                    issue: 'Gaps in fanout index sequence',
                    expected_max: expectedMax,
                    actual_max: actualMax,
                });
                report.valid = false;
            }
        }
        return report;
    }
    /**
     * Clear all registered envelopes
     *
     * @returns {void}
     */
    clear() {
        this.envelopes.clear();
    }
}
module.exports = { LineageValidator };
//# sourceMappingURL=lineage-validator.js.map