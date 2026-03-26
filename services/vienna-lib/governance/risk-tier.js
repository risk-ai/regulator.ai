/**
 * Risk Tier Classification
 * 
 * Classifies operations into T0/T1/T2/T3 tiers.
 * 
 * T0 — Informational (auto-approve, no warrant)
 * T1 — Low Risk (policy auto-approve, warrant required)
 * T2 — Medium Risk (single human approval, warrant required)
 * T3 — High Risk (multi-party approval, warrant required, enhanced audit)
 */

// Action categories for classification
const T3_ACTIONS = new Set([
  'wire_transfer', 'delete_production', 'delete_database', 'legal_filing',
  'financial_transaction', 'pii_export', 'compliance_override', 'key_rotation',
  'user_data_deletion', 'contract_execution', 'regulatory_submission'
]);

const T2_ACTIONS = new Set([
  'deploy_code', 'modify_database', 'restart_service', 'stop_service',
  'write_db', 'update_production', 'modify_config', 'create_user',
  'revoke_access', 'modify_policy', 'update_integration'
]);

const T1_ACTIONS = new Set([
  'send_email', 'create_ticket', 'write_file', 'create_branch',
  'post_message', 'update_status', 'schedule_task', 'generate_report'
]);

class RiskTier {
  /**
   * Classify risk tier based on operation characteristics
   * 
   * @param {object} operation - Operation to classify
   * @returns {string} 'T0' | 'T1' | 'T2' | 'T3'
   */
  classify(operation) {
    const {
      action = '',
      reversible = true,
      tradingImpact = 'none',
      blastRadius = 'single_file',
      requiresApproval = false,
      financialImpact = 0,
      piiInScope = false,
      regulatoryScope = false
    } = operation;

    // T3: Critical operations — multi-party approval required
    if (
      T3_ACTIONS.has(action) ||
      financialImpact > 10000 ||
      (piiInScope && blastRadius === 'system_wide') ||
      regulatoryScope ||
      tradingImpact === 'critical'
    ) {
      return 'T3';
    }

    // T2: High-stakes, irreversible, or trading-critical
    if (
      T2_ACTIONS.has(action) ||
      !reversible ||
      tradingImpact === 'high' ||
      requiresApproval ||
      blastRadius === 'system_wide' ||
      financialImpact > 1000
    ) {
      return 'T2';
    }
    
    // T1: Moderate stakes, reversible, medium blast radius
    if (
      T1_ACTIONS.has(action) ||
      tradingImpact === 'medium' ||
      blastRadius === 'service' ||
      blastRadius === 'multiple_files'
    ) {
      return 'T1';
    }
    
    // T0: Low stakes, easily reversible (reads, status checks)
    return 'T0';
  }
  
  /**
   * Get requirements for risk tier
   * 
   * @param {string} tier - 'T0' | 'T1' | 'T2' | 'T3'
   * @returns {object} Requirements
   */
  getRequirements(tier) {
    const requirements = {
      T0: {
        warrant_required: false,
        approval_required: false,
        approval_count: 0,
        truth_freshness_minutes: Infinity,
        documentation_required: false,
        enhanced_audit: false,
        max_ttl_minutes: 60
      },
      T1: {
        warrant_required: true,
        approval_required: false,
        approval_count: 0,
        truth_freshness_minutes: 30,
        documentation_required: true,
        enhanced_audit: false,
        max_ttl_minutes: 30
      },
      T2: {
        warrant_required: true,
        approval_required: true,
        approval_count: 1,
        truth_freshness_minutes: 10,
        documentation_required: true,
        enhanced_audit: false,
        max_ttl_minutes: 15
      },
      T3: {
        warrant_required: true,
        approval_required: true,
        approval_count: 2,
        truth_freshness_minutes: 5,
        documentation_required: true,
        enhanced_audit: true,
        max_ttl_minutes: 5,
        requires_justification: true,
        requires_rollback_plan: true
      }
    };
    
    return requirements[tier] || requirements.T0;
  }

  /**
   * Get all valid tiers
   * @returns {string[]}
   */
  static get TIERS() {
    return ['T0', 'T1', 'T2', 'T3'];
  }

  /**
   * Validate a tier string
   * @param {string} tier
   * @returns {boolean}
   */
  static isValid(tier) {
    return RiskTier.TIERS.includes(tier);
  }

  /**
   * Get human-readable description
   * @param {string} tier
   * @returns {string}
   */
  static describe(tier) {
    const descriptions = {
      T0: 'Informational — auto-approved, no warrant required',
      T1: 'Low Risk — policy auto-approved, warrant issued',
      T2: 'Medium Risk — single human approval required',
      T3: 'High Risk — multi-party approval required (2+ approvers)'
    };
    return descriptions[tier] || 'Unknown tier';
  }
}

module.exports = RiskTier;
