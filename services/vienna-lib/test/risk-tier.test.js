/**
 * Risk Tier Classification Tests
 * 
 * Tests for T0/T1/T2/T3 classification logic and escalation patterns.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const RiskTier = require('../governance/risk-tier');

describe('Risk Tier Classification', () => {
  let classifier;

  test('setup', () => {
    classifier = new RiskTier();
  });

  describe('T0 Classification - Informational', () => {
    test('read operations are T0', () => {
      const operation = {
        action: 'read_status',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        financialImpact: 0
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0');
    });

    test('status checks are T0', () => {
      const operation = {
        action: 'get_metrics',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        financialImpact: 0
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0');
    });

    test('low-stakes informational queries are T0', () => {
      const operation = {
        action: 'list_files',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        financialImpact: 0,
        piiInScope: false
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0');
    });
  });

  describe('T1 Classification - Low Risk', () => {
    test('T1 actions are classified as T1', () => {
      const t1Actions = [
        'send_email', 'create_ticket', 'write_file', 
        'create_branch', 'post_message', 'update_status',
        'schedule_task', 'generate_report'
      ];

      for (const action of t1Actions) {
        const operation = { action };
        const tier = classifier.classify(operation);
        assert.strictEqual(tier, 'T1', `${action} should be T1`);
      }
    });

    test('medium trading impact is T1', () => {
      const operation = {
        action: 'update_config',
        reversible: true,
        tradingImpact: 'medium',
        blastRadius: 'single_file'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T1');
    });

    test('service-level blast radius is T1', () => {
      const operation = {
        action: 'log_metrics',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'service'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T1');
    });

    test('multiple files blast radius is T1', () => {
      const operation = {
        action: 'update_documentation',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'multiple_files'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T1');
    });
  });

  describe('T2 Classification - Medium Risk', () => {
    test('T2 actions are classified as T2', () => {
      const t2Actions = [
        'deploy_code', 'modify_database', 'restart_service',
        'stop_service', 'write_db', 'update_production',
        'modify_config', 'create_user', 'revoke_access',
        'modify_policy', 'update_integration'
      ];

      for (const action of t2Actions) {
        const operation = { action };
        const tier = classifier.classify(operation);
        assert.strictEqual(tier, 'T2', `${action} should be T2`);
      }
    });

    test('irreversible operations are T2', () => {
      const operation = {
        action: 'send_notification',
        reversible: false,
        tradingImpact: 'low',
        blastRadius: 'single_file'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('high trading impact is T2', () => {
      const operation = {
        action: 'update_strategy',
        reversible: true,
        tradingImpact: 'high',
        blastRadius: 'service'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('system-wide blast radius is T2', () => {
      const operation = {
        action: 'update_config',
        reversible: true,
        tradingImpact: 'low',
        blastRadius: 'system_wide'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('requires approval flag forces T2', () => {
      const operation = {
        action: 'routine_task',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        requiresApproval: true
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('financial impact over $1K is T2', () => {
      const operation = {
        action: 'process_payment',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        financialImpact: 5000
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });
  });

  describe('T3 Classification - High Risk', () => {
    test('T3 actions are classified as T3', () => {
      const t3Actions = [
        'wire_transfer', 'delete_production', 'delete_database',
        'legal_filing', 'financial_transaction', 'pii_export',
        'compliance_override', 'key_rotation', 'user_data_deletion',
        'contract_execution', 'regulatory_submission'
      ];

      for (const action of t3Actions) {
        const operation = { action };
        const tier = classifier.classify(operation);
        assert.strictEqual(tier, 'T3', `${action} should be T3`);
      }
    });

    test('financial impact over $10K is T3', () => {
      const operation = {
        action: 'process_transfer',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        financialImpact: 25000
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('PII + system_wide scope is T3', () => {
      const operation = {
        action: 'export_data',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'system_wide',
        piiInScope: true
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('regulatory scope is T3', () => {
      const operation = {
        action: 'update_compliance',
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file',
        regulatoryScope: true
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('critical trading impact is T3', () => {
      const operation = {
        action: 'emergency_stop',
        reversible: true,
        tradingImpact: 'critical',
        blastRadius: 'service'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });
  });

  describe('Escalation Patterns', () => {
    test('rm -rf escalates to T3', () => {
      const operation = {
        action: 'delete_production',
        reversible: false,
        tradingImpact: 'high',
        blastRadius: 'system_wide'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('sudo commands escalate to T2', () => {
      const operation = {
        action: 'modify_database',
        reversible: false,
        tradingImpact: 'medium',
        blastRadius: 'service'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('database deletion is T3', () => {
      const operation = {
        action: 'delete_database',
        reversible: false,
        tradingImpact: 'critical',
        blastRadius: 'system_wide'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('service restart is T2', () => {
      const operation = {
        action: 'restart_service',
        reversible: true,
        tradingImpact: 'medium',
        blastRadius: 'service'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('production deployment is T2', () => {
      const operation = {
        action: 'deploy_code',
        reversible: false,
        tradingImpact: 'high',
        blastRadius: 'system_wide'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });
  });

  describe('Financial Thresholds', () => {
    test('$100 is T0', () => {
      const operation = {
        action: 'process_payment',
        financialImpact: 100
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0');
    });

    test('$5,000 is T2', () => {
      const operation = {
        action: 'process_payment',
        financialImpact: 5000
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });

    test('$50,000 is T3', () => {
      const operation = {
        action: 'wire_transfer',
        financialImpact: 50000
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('$1,000,000 is T3', () => {
      const operation = {
        action: 'financial_transaction',
        financialImpact: 1000000
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('$10,001 threshold triggers T3', () => {
      const operation = {
        action: 'transfer_funds',
        financialImpact: 10001
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('$9,999 stays T0 without other escalators', () => {
      const operation = {
        action: 'validate_payment',
        financialImpact: 9999,
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0');
    });
  });

  describe('PII + System-Wide Combinations', () => {
    test('PII + single file scope is T1', () => {
      const operation = {
        action: 'read_profile',
        piiInScope: true,
        blastRadius: 'single_file',
        tradingImpact: 'none'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T0'); // No other escalators
    });

    test('PII + service scope is T1', () => {
      const operation = {
        action: 'update_profile',
        piiInScope: true,
        blastRadius: 'service',
        tradingImpact: 'none'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T1');
    });

    test('PII + system_wide scope is T3', () => {
      const operation = {
        action: 'export_users',
        piiInScope: true,
        blastRadius: 'system_wide',
        tradingImpact: 'none'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('non-PII + system_wide scope is T2', () => {
      const operation = {
        action: 'update_settings',
        piiInScope: false,
        blastRadius: 'system_wide',
        tradingImpact: 'low'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T2');
    });
  });

  describe('Regulatory Scope Escalation', () => {
    test('any regulatory scope triggers T3', () => {
      const operation = {
        action: 'log_transaction',
        regulatoryScope: true,
        reversible: true,
        tradingImpact: 'none',
        blastRadius: 'single_file'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('regulatory + other high-risk factors is still T3', () => {
      const operation = {
        action: 'compliance_override',
        regulatoryScope: true,
        financialImpact: 100000,
        piiInScope: true,
        blastRadius: 'system_wide'
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('SEC filing is T3', () => {
      const operation = {
        action: 'regulatory_submission',
        regulatoryScope: true
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });

    test('GDPR compliance is T3', () => {
      const operation = {
        action: 'user_data_deletion',
        regulatoryScope: true,
        piiInScope: true
      };
      
      const tier = classifier.classify(operation);
      assert.strictEqual(tier, 'T3');
    });
  });

  describe('Requirements Validation', () => {
    test('T0 requirements are correct', () => {
      const requirements = classifier.getRequirements('T0');
      
      assert.strictEqual(requirements.warrant_required, false);
      assert.strictEqual(requirements.approval_required, false);
      assert.strictEqual(requirements.approval_count, 0);
      assert.strictEqual(requirements.truth_freshness_minutes, Infinity);
      assert.strictEqual(requirements.documentation_required, false);
      assert.strictEqual(requirements.enhanced_audit, false);
      assert.strictEqual(requirements.max_ttl_minutes, 60);
    });

    test('T1 requirements are correct', () => {
      const requirements = classifier.getRequirements('T1');
      
      assert.strictEqual(requirements.warrant_required, true);
      assert.strictEqual(requirements.approval_required, false);
      assert.strictEqual(requirements.approval_count, 0);
      assert.strictEqual(requirements.truth_freshness_minutes, 30);
      assert.strictEqual(requirements.documentation_required, true);
      assert.strictEqual(requirements.enhanced_audit, false);
      assert.strictEqual(requirements.max_ttl_minutes, 30);
    });

    test('T2 requirements are correct', () => {
      const requirements = classifier.getRequirements('T2');
      
      assert.strictEqual(requirements.warrant_required, true);
      assert.strictEqual(requirements.approval_required, true);
      assert.strictEqual(requirements.approval_count, 1);
      assert.strictEqual(requirements.truth_freshness_minutes, 10);
      assert.strictEqual(requirements.documentation_required, true);
      assert.strictEqual(requirements.enhanced_audit, false);
      assert.strictEqual(requirements.max_ttl_minutes, 15);
    });

    test('T3 requirements are correct', () => {
      const requirements = classifier.getRequirements('T3');
      
      assert.strictEqual(requirements.warrant_required, true);
      assert.strictEqual(requirements.approval_required, true);
      assert.strictEqual(requirements.approval_count, 2);
      assert.strictEqual(requirements.truth_freshness_minutes, 5);
      assert.strictEqual(requirements.documentation_required, true);
      assert.strictEqual(requirements.enhanced_audit, true);
      assert.strictEqual(requirements.max_ttl_minutes, 5);
      assert.strictEqual(requirements.requires_justification, true);
      assert.strictEqual(requirements.requires_rollback_plan, true);
    });

    test('invalid tier returns T0 requirements', () => {
      const requirements = classifier.getRequirements('T99');
      
      assert.deepStrictEqual(requirements, classifier.getRequirements('T0'));
    });
  });

  describe('Static Methods', () => {
    test('TIERS constant is correct', () => {
      const tiers = RiskTier.TIERS;
      
      assert.deepStrictEqual(tiers, ['T0', 'T1', 'T2', 'T3']);
    });

    test('isValid correctly validates tiers', () => {
      assert.strictEqual(RiskTier.isValid('T0'), true);
      assert.strictEqual(RiskTier.isValid('T1'), true);
      assert.strictEqual(RiskTier.isValid('T2'), true);
      assert.strictEqual(RiskTier.isValid('T3'), true);
      
      assert.strictEqual(RiskTier.isValid('T4'), false);
      assert.strictEqual(RiskTier.isValid('T-1'), false);
      assert.strictEqual(RiskTier.isValid(''), false);
      assert.strictEqual(RiskTier.isValid('LOW'), false);
      assert.strictEqual(RiskTier.isValid(null), false);
    });

    test('describe returns correct descriptions', () => {
      assert.strictEqual(
        RiskTier.describe('T0'),
        'Informational — auto-approved, no warrant required'
      );
      assert.strictEqual(
        RiskTier.describe('T1'),
        'Low Risk — policy auto-approved, warrant issued'
      );
      assert.strictEqual(
        RiskTier.describe('T2'),
        'Medium Risk — single human approval required'
      );
      assert.strictEqual(
        RiskTier.describe('T3'),
        'High Risk — multi-party approval required (2+ approvers)'
      );
      assert.strictEqual(
        RiskTier.describe('INVALID'),
        'Unknown tier'
      );
    });
  });
});