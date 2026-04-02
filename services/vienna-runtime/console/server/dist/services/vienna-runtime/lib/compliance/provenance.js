/**
 * Vienna Provenance Tracking
 *
 * Track inputs, decisions, and data lineage for full execution provenance.
 */
/**
 * Provenance Record
 */
class ProvenanceRecord {
    constructor(data) {
        this.provenance_id = data.provenance_id || this._generateId();
        this.entity_id = data.entity_id; // What entity this provenance is for
        this.entity_type = data.entity_type; // 'plan', 'execution', 'verification', etc.
        this.tenant_id = data.tenant_id;
        // Inputs that influenced this entity
        this.inputs = data.inputs || [];
        // Decisions made
        this.decisions = data.decisions || [];
        // Policy versions applied
        this.policies_applied = data.policies_applied || [];
        // Actors involved
        this.actors = data.actors || [];
        // Execution nodes
        this.execution_nodes = data.execution_nodes || [];
        // Timestamps
        this.created_at = data.created_at || new Date().toISOString();
        // Chain references (for lineage)
        this.parent_provenance = data.parent_provenance || null;
        this.child_provenances = data.child_provenances || [];
    }
    /**
     * Add input reference
     */
    addInput(input) {
        this.inputs.push({
            input_id: input.input_id || this._generateId(),
            input_type: input.input_type,
            source: input.source,
            value_hash: input.value_hash || null,
            timestamp: input.timestamp || new Date().toISOString()
        });
    }
    /**
     * Add decision reference
     */
    addDecision(decision) {
        this.decisions.push({
            decision_id: decision.decision_id || this._generateId(),
            decision_type: decision.decision_type,
            made_by: decision.made_by,
            decision: decision.decision,
            reason: decision.reason || null,
            timestamp: decision.timestamp || new Date().toISOString()
        });
    }
    /**
     * Add policy reference
     */
    addPolicy(policy) {
        this.policies_applied.push({
            policy_id: policy.policy_id,
            policy_version: policy.policy_version,
            applied_at: policy.applied_at || new Date().toISOString(),
            result: policy.result
        });
    }
    /**
     * Add actor reference
     */
    addActor(actor) {
        if (!this.actors.find(a => a.actor_id === actor.actor_id)) {
            this.actors.push({
                actor_id: actor.actor_id,
                actor_type: actor.actor_type, // 'human', 'service', 'system'
                role: actor.role,
                action: actor.action,
                timestamp: actor.timestamp || new Date().toISOString()
            });
        }
    }
    /**
     * Add execution node reference
     */
    addExecutionNode(node) {
        this.execution_nodes.push({
            node_id: node.node_id,
            node_type: node.node_type,
            executed_at: node.executed_at || new Date().toISOString()
        });
    }
    /**
     * Link parent provenance
     */
    setParent(parentProvenanceId) {
        this.parent_provenance = parentProvenanceId;
    }
    /**
     * Add child provenance
     */
    addChild(childProvenanceId) {
        if (!this.child_provenances.includes(childProvenanceId)) {
            this.child_provenances.push(childProvenanceId);
        }
    }
    /**
     * Generate ID
     */
    _generateId() {
        return `prov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    toJSON() {
        return {
            provenance_id: this.provenance_id,
            entity_id: this.entity_id,
            entity_type: this.entity_type,
            tenant_id: this.tenant_id,
            inputs: this.inputs,
            decisions: this.decisions,
            policies_applied: this.policies_applied,
            actors: this.actors,
            execution_nodes: this.execution_nodes,
            created_at: this.created_at,
            parent_provenance: this.parent_provenance,
            child_provenances: this.child_provenances
        };
    }
}
/**
 * Provenance Graph
 */
class ProvenanceGraph {
    constructor() {
        this.records = new Map();
    }
    /**
     * Create provenance record
     */
    createRecord(data) {
        const record = new ProvenanceRecord(data);
        this.records.set(record.provenance_id, record);
        // Link to parent if specified
        if (data.parent_provenance) {
            const parent = this.records.get(data.parent_provenance);
            if (parent) {
                parent.addChild(record.provenance_id);
            }
        }
        return record;
    }
    /**
     * Get provenance record
     */
    getRecord(provenanceId) {
        return this.records.get(provenanceId);
    }
    /**
     * Get provenance for entity
     */
    getProvenanceForEntity(entityId, entityType) {
        for (const record of this.records.values()) {
            if (record.entity_id === entityId && record.entity_type === entityType) {
                return record;
            }
        }
        return null;
    }
    /**
     * Get full lineage (ancestors + descendants)
     */
    getLineage(provenanceId) {
        const record = this.getRecord(provenanceId);
        if (!record) {
            return null;
        }
        const lineage = {
            current: record,
            ancestors: this._getAncestors(provenanceId),
            descendants: this._getDescendants(provenanceId)
        };
        return lineage;
    }
    /**
     * Get ancestors (parent chain)
     */
    _getAncestors(provenanceId) {
        const ancestors = [];
        let current = this.getRecord(provenanceId);
        while (current && current.parent_provenance) {
            const parent = this.getRecord(current.parent_provenance);
            if (parent) {
                ancestors.push(parent);
                current = parent;
            }
            else {
                break;
            }
        }
        return ancestors;
    }
    /**
     * Get descendants (children recursively)
     */
    _getDescendants(provenanceId) {
        const descendants = [];
        const record = this.getRecord(provenanceId);
        if (!record) {
            return descendants;
        }
        for (const childId of record.child_provenances) {
            const child = this.getRecord(childId);
            if (child) {
                descendants.push(child);
                descendants.push(...this._getDescendants(childId));
            }
        }
        return descendants;
    }
    /**
     * Verify provenance continuity
     */
    verifyProvenance(provenanceId) {
        const lineage = this.getLineage(provenanceId);
        if (!lineage) {
            return { valid: false, reason: 'PROVENANCE_NOT_FOUND' };
        }
        const issues = [];
        // Check for missing parents
        if (lineage.current.parent_provenance) {
            const parent = this.getRecord(lineage.current.parent_provenance);
            if (!parent) {
                issues.push(`Missing parent: ${lineage.current.parent_provenance}`);
            }
        }
        // Check for missing children
        for (const childId of lineage.current.child_provenances) {
            const child = this.getRecord(childId);
            if (!child) {
                issues.push(`Missing child: ${childId}`);
            }
        }
        return {
            valid: issues.length === 0,
            issues
        };
    }
    /**
     * Export provenance chain
     */
    exportChain(provenanceId, format = 'json') {
        const lineage = this.getLineage(provenanceId);
        if (!lineage) {
            return null;
        }
        const chain = {
            provenance_id: provenanceId,
            current: lineage.current.toJSON(),
            ancestors: lineage.ancestors.map(a => a.toJSON()),
            descendants: lineage.descendants.map(d => d.toJSON()),
            exported_at: new Date().toISOString()
        };
        if (format === 'json') {
            return JSON.stringify(chain, null, 2);
        }
        return chain;
    }
}
/**
 * Provenance Tracker
 */
class ProvenanceTracker {
    constructor() {
        this.graph = new ProvenanceGraph();
    }
    /**
     * Track intent provenance
     */
    trackIntent(intent, context) {
        const record = this.graph.createRecord({
            entity_id: intent.intent_id,
            entity_type: 'intent',
            tenant_id: context.tenant_id
        });
        record.addInput({
            input_type: 'natural_language',
            source: 'user',
            value_hash: this._hash(intent.natural_language_input)
        });
        if (context.caller) {
            record.addActor({
                actor_id: context.caller.id,
                actor_type: 'human',
                role: 'submitter',
                action: 'submit_intent'
            });
        }
        return record;
    }
    /**
     * Track plan provenance
     */
    trackPlan(plan, intent, context) {
        const record = this.graph.createRecord({
            entity_id: plan.plan_id,
            entity_type: 'plan',
            tenant_id: context.tenant_id,
            parent_provenance: intent ? this._getProvenanceId(intent.intent_id, 'intent') : null
        });
        if (intent) {
            record.addInput({
                input_type: 'intent',
                source: 'intent_classifier',
                value_hash: this._hash(JSON.stringify(intent))
            });
        }
        if (context.created_by) {
            record.addActor({
                actor_id: context.created_by.id,
                actor_type: 'service',
                role: 'planner',
                action: 'generate_plan'
            });
        }
        return record;
    }
    /**
     * Track approval provenance
     */
    trackApproval(approval, plan, context) {
        const record = this.graph.createRecord({
            entity_id: approval.approval_id,
            entity_type: 'approval',
            tenant_id: context.tenant_id,
            parent_provenance: this._getProvenanceId(plan.plan_id, 'plan')
        });
        record.addDecision({
            decision_type: 'approval',
            made_by: approval.reviewer,
            decision: approval.decision,
            reason: approval.decision_reason
        });
        record.addActor({
            actor_id: approval.reviewer,
            actor_type: 'human',
            role: 'approver',
            action: approval.decision
        });
        return record;
    }
    /**
     * Track execution provenance
     */
    trackExecution(execution, plan, context) {
        const record = this.graph.createRecord({
            entity_id: execution.execution_id,
            entity_type: 'execution',
            tenant_id: context.tenant_id,
            parent_provenance: this._getProvenanceId(plan.plan_id, 'plan')
        });
        if (context.executor) {
            record.addActor({
                actor_id: context.executor,
                actor_type: 'service',
                role: 'executor',
                action: 'execute_plan'
            });
        }
        if (context.node_id) {
            record.addExecutionNode({
                node_id: context.node_id,
                node_type: context.node_type || 'local'
            });
        }
        return record;
    }
    /**
     * Track verification provenance
     */
    trackVerification(verification, execution, context) {
        const record = this.graph.createRecord({
            entity_id: verification.verification_id,
            entity_type: 'verification',
            tenant_id: context.tenant_id,
            parent_provenance: this._getProvenanceId(execution.execution_id, 'execution')
        });
        record.addActor({
            actor_id: verification.verifier || 'system',
            actor_type: 'service',
            role: 'verifier',
            action: 'verify_execution'
        });
        return record;
    }
    /**
     * Get provenance ID for entity
     */
    _getProvenanceId(entityId, entityType) {
        const record = this.graph.getProvenanceForEntity(entityId, entityType);
        return record ? record.provenance_id : null;
    }
    /**
     * Hash value for provenance
     */
    _hash(value) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(String(value)).digest('hex');
    }
    /**
     * Get full lineage for entity
     */
    getLineage(entityId, entityType) {
        const provenanceId = this._getProvenanceId(entityId, entityType);
        if (!provenanceId) {
            return null;
        }
        return this.graph.getLineage(provenanceId);
    }
    /**
     * Export provenance chain
     */
    exportChain(entityId, entityType, format = 'json') {
        const provenanceId = this._getProvenanceId(entityId, entityType);
        if (!provenanceId) {
            return null;
        }
        return this.graph.exportChain(provenanceId, format);
    }
}
/**
 * Global provenance tracker instance
 */
let globalProvenanceTracker = null;
function getProvenanceTracker() {
    if (!globalProvenanceTracker) {
        globalProvenanceTracker = new ProvenanceTracker();
    }
    return globalProvenanceTracker;
}
module.exports = {
    ProvenanceRecord,
    ProvenanceGraph,
    ProvenanceTracker,
    getProvenanceTracker
};
//# sourceMappingURL=provenance.js.map