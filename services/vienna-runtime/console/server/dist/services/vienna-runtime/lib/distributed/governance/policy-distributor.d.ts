export = PolicyDistributor;
declare class PolicyDistributor {
    constructor(stateGraph: any, nodeRegistry: any);
    stateGraph: any;
    nodeRegistry: any;
    /**
     * Distribute policy to all nodes
     */
    distributePolicy(policy: any): Promise<{
        distribution_id: string;
        node_id: any;
    }[]>;
    /**
     * Acknowledge policy distribution
     */
    acknowledgePolicyDistribution(distributionId: any): Promise<{
        acknowledged: boolean;
    }>;
    /**
     * Check policy version on node
     */
    checkPolicyVersion(nodeId: any, policyId: any): Promise<{
        has_policy: boolean;
        version: any;
        status?: undefined;
        distributed_at?: undefined;
    } | {
        has_policy: boolean;
        version: any;
        status: any;
        distributed_at: any;
    }>;
    /**
     * Invalidate policy cache on nodes
     */
    invalidatePolicyCache(policyId: any): Promise<{
        invalidated: any;
    }>;
    /**
     * Evaluate policy on coordinator
     */
    evaluatePolicy(nodeId: any, plan: any, context: any): Promise<{
        decision: string;
        matched_policy_id: string;
        constraints_evaluated: {
            constraint_type: string;
            result: string;
        }[];
        reason: string;
    }>;
    _createDistribution(policyId: any, nodeId: any, version: any): Promise<string>;
    _sendPolicyToNode(node: any, policy: any): Promise<{
        policy_sent: boolean;
    }>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=policy-distributor.d.ts.map