/**
 * Policy Distributor
 *
 * Distribute policies to nodes for centralized governance
 * Phase 20 — Distributed Governance
 */
const crypto = require('crypto');
class PolicyDistributor {
    constructor(stateGraph, nodeRegistry) {
        this.stateGraph = stateGraph;
        this.nodeRegistry = nodeRegistry;
    }
    /**
     * Distribute policy to all nodes
     */
    async distributePolicy(policy) {
        const nodes = await this.nodeRegistry.listNodes({ status: 'online' });
        const distributions = [];
        for (const node of nodes) {
            const distributionId = await this._createDistribution(policy.policy_id, node.node_id, policy.version || 1);
            // Send policy to node
            await this._sendPolicyToNode(node, policy);
            distributions.push({
                distribution_id: distributionId,
                node_id: node.node_id
            });
        }
        return distributions;
    }
    /**
     * Acknowledge policy distribution
     */
    async acknowledgePolicyDistribution(distributionId) {
        await this.stateGraph.run(`UPDATE policy_distributions 
       SET acknowledged_at = ?, status = 'acknowledged' 
       WHERE distribution_id = ?`, [new Date().toISOString(), distributionId]);
        return { acknowledged: true };
    }
    /**
     * Check policy version on node
     */
    async checkPolicyVersion(nodeId, policyId) {
        const row = await this.stateGraph.get(`SELECT * FROM policy_distributions 
       WHERE node_id = ? AND policy_id = ? 
       ORDER BY distributed_at DESC LIMIT 1`, [nodeId, policyId]);
        if (!row) {
            return { has_policy: false, version: null };
        }
        return {
            has_policy: true,
            version: row.policy_version,
            status: row.status,
            distributed_at: row.distributed_at
        };
    }
    /**
     * Invalidate policy cache on nodes
     */
    async invalidatePolicyCache(policyId) {
        const distributions = await this.stateGraph.all(`SELECT * FROM policy_distributions 
       WHERE policy_id = ? AND status = 'acknowledged'`, [policyId]);
        for (const dist of distributions) {
            await this.stateGraph.run(`UPDATE policy_distributions 
         SET status = 'outdated' 
         WHERE distribution_id = ?`, [dist.distribution_id]);
        }
        return { invalidated: distributions.length };
    }
    /**
     * Evaluate policy on coordinator
     */
    async evaluatePolicy(nodeId, plan, context) {
        // Central policy evaluation
        // Would load policies from State Graph and evaluate
        return {
            decision: 'permit',
            matched_policy_id: 'policy_001',
            constraints_evaluated: [
                { constraint_type: 'time_window', result: 'pass' },
                { constraint_type: 'rate_limit', result: 'pass' }
            ],
            reason: 'All constraints satisfied'
        };
    }
    // Helper methods
    async _createDistribution(policyId, nodeId, version) {
        const distributionId = this._generateId('pdist');
        await this.stateGraph.run(`INSERT INTO policy_distributions (
        distribution_id, policy_id, node_id, policy_version,
        distributed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?)`, [
            distributionId,
            policyId,
            nodeId,
            version,
            new Date().toISOString(),
            'pending'
        ]);
        return distributionId;
    }
    async _sendPolicyToNode(node, policy) {
        // Mock implementation - would make HTTP POST to node
        return { policy_sent: true };
    }
    _generateId(prefix) {
        return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
    }
}
module.exports = PolicyDistributor;
//# sourceMappingURL=policy-distributor.js.map