/**
 * Vienna Provenance Tracking
 *
 * Track inputs, decisions, and data lineage for full execution provenance.
 */
/**
 * Provenance Record
 */
export class ProvenanceRecord {
    constructor(data: any);
    provenance_id: any;
    entity_id: any;
    entity_type: any;
    tenant_id: any;
    inputs: any;
    decisions: any;
    policies_applied: any;
    actors: any;
    execution_nodes: any;
    created_at: any;
    parent_provenance: any;
    child_provenances: any;
    /**
     * Add input reference
     */
    addInput(input: any): void;
    /**
     * Add decision reference
     */
    addDecision(decision: any): void;
    /**
     * Add policy reference
     */
    addPolicy(policy: any): void;
    /**
     * Add actor reference
     */
    addActor(actor: any): void;
    /**
     * Add execution node reference
     */
    addExecutionNode(node: any): void;
    /**
     * Link parent provenance
     */
    setParent(parentProvenanceId: any): void;
    /**
     * Add child provenance
     */
    addChild(childProvenanceId: any): void;
    /**
     * Generate ID
     */
    _generateId(): string;
    toJSON(): {
        provenance_id: any;
        entity_id: any;
        entity_type: any;
        tenant_id: any;
        inputs: any;
        decisions: any;
        policies_applied: any;
        actors: any;
        execution_nodes: any;
        created_at: any;
        parent_provenance: any;
        child_provenances: any;
    };
}
/**
 * Provenance Graph
 */
export class ProvenanceGraph {
    records: Map<any, any>;
    /**
     * Create provenance record
     */
    createRecord(data: any): ProvenanceRecord;
    /**
     * Get provenance record
     */
    getRecord(provenanceId: any): any;
    /**
     * Get provenance for entity
     */
    getProvenanceForEntity(entityId: any, entityType: any): any;
    /**
     * Get full lineage (ancestors + descendants)
     */
    getLineage(provenanceId: any): {
        current: any;
        ancestors: any[];
        descendants: any;
    };
    /**
     * Get ancestors (parent chain)
     */
    _getAncestors(provenanceId: any): any[];
    /**
     * Get descendants (children recursively)
     */
    _getDescendants(provenanceId: any): any;
    /**
     * Verify provenance continuity
     */
    verifyProvenance(provenanceId: any): {
        valid: boolean;
        reason: string;
        issues?: undefined;
    } | {
        valid: boolean;
        issues: string[];
        reason?: undefined;
    };
    /**
     * Export provenance chain
     */
    exportChain(provenanceId: any, format?: string): string | {
        provenance_id: any;
        current: any;
        ancestors: any[];
        descendants: any;
        exported_at: string;
    };
}
/**
 * Provenance Tracker
 */
export class ProvenanceTracker {
    graph: ProvenanceGraph;
    /**
     * Track intent provenance
     */
    trackIntent(intent: any, context: any): ProvenanceRecord;
    /**
     * Track plan provenance
     */
    trackPlan(plan: any, intent: any, context: any): ProvenanceRecord;
    /**
     * Track approval provenance
     */
    trackApproval(approval: any, plan: any, context: any): ProvenanceRecord;
    /**
     * Track execution provenance
     */
    trackExecution(execution: any, plan: any, context: any): ProvenanceRecord;
    /**
     * Track verification provenance
     */
    trackVerification(verification: any, execution: any, context: any): ProvenanceRecord;
    /**
     * Get provenance ID for entity
     */
    _getProvenanceId(entityId: any, entityType: any): any;
    /**
     * Hash value for provenance
     */
    _hash(value: any): string;
    /**
     * Get full lineage for entity
     */
    getLineage(entityId: any, entityType: any): {
        current: any;
        ancestors: any[];
        descendants: any;
    };
    /**
     * Export provenance chain
     */
    exportChain(entityId: any, entityType: any, format?: string): string | {
        provenance_id: any;
        current: any;
        ancestors: any[];
        descendants: any;
        exported_at: string;
    };
}
export function getProvenanceTracker(): any;
//# sourceMappingURL=provenance.d.ts.map