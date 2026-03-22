/**
 * Risk Tier Classification
 * 
 * Classifies operations into T0/T1/T2 tiers.
 */

class RiskTier {
  /**
   * Classify risk tier based on operation characteristics
   * 
   * @param {object} operation - Operation to classify
   * @returns {string} 'T0' | 'T1' | 'T2'
   */
  classify(operation) {
    const {
      reversible = true,
      tradingImpact = 'none',
      blastRadius = 'single_file',
      requiresApproval = false
    } = operation;
    
    // T2: High-stakes, irreversible, or trading-critical
    if (
      !reversible ||
      tradingImpact === 'critical' ||
      tradingImpact === 'high' ||
      requiresApproval ||
      blastRadius === 'system_wide'
    ) {
      return 'T2';
    }
    
    // T1: Moderate stakes, reversible, medium blast radius
    if (
      tradingImpact === 'medium' ||
      blastRadius === 'service' ||
      blastRadius === 'multiple_files'
    ) {
      return 'T1';
    }
    
    // T0: Low stakes, easily reversible
    return 'T0';
  }
  
  /**
   * Get requirements for risk tier
   * 
   * @param {string} tier - 'T0' | 'T1' | 'T2'
   * @returns {object} Requirements
   */
  getRequirements(tier) {
    const requirements = {
      T0: {
        warrant_required: false,
        approval_required: false,
        truth_freshness_minutes: Infinity,
        documentation_required: false
      },
      T1: {
        warrant_required: true,
        approval_required: false,
        truth_freshness_minutes: 30,
        documentation_required: true
      },
      T2: {
        warrant_required: true,
        approval_required: true,
        truth_freshness_minutes: 10,
        documentation_required: true
      }
    };
    
    return requirements[tier] || requirements.T0;
  }
}

module.exports = RiskTier;
