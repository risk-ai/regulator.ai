/**
 * Capability Matcher
 *
 * Match execution requirements to node capabilities
 * Real implementation for distributed execution
 *
 * Phase 19 Operationalization - Step 2
 */
export class CapabilityMatcher {
    constructor(nodeRegistry: any);
    nodeRegistry: any;
    /**
     * Find nodes capable of executing plan
     *
     * @param {Object} plan - Execution plan
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Capable nodes ranked by suitability
     */
    findCapableNodes(plan: any, options?: any): Promise<any[]>;
    /**
     * Check if node matches all requirements
     */
    _matchesRequirements(node: any, requirements: any): boolean;
    /**
     * Extract requirements from plan
     */
    _extractRequirements(plan: any): {
        action_type: any;
        target_id: any;
    }[];
    /**
     * Calculate node health score
     */
    _calculateHealthScore(node: any): number;
    /**
     * Rank nodes by suitability
     */
    _rankNodes(nodes: any, requirements: any): any;
    /**
     * Calculate suitability score
     */
    _calculateSuitabilityScore(node: any, requirements: any): number;
    /**
     * Negotiate capabilities with remote node
     */
    negotiateCapabilities(node: any): Promise<any>;
}
//# sourceMappingURL=capability-matcher.d.ts.map