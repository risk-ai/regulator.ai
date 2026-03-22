export = RiskTier;
/**
 * Risk Tier Classification
 *
 * Classifies operations into T0/T1/T2 tiers.
 */
declare class RiskTier {
    /**
     * Classify risk tier based on operation characteristics
     *
     * @param {object} operation - Operation to classify
     * @returns {string} 'T0' | 'T1' | 'T2'
     */
    classify(operation: object): string;
    /**
     * Get requirements for risk tier
     *
     * @param {string} tier - 'T0' | 'T1' | 'T2'
     * @returns {object} Requirements
     */
    getRequirements(tier: string): object;
}
//# sourceMappingURL=risk-tier.d.ts.map