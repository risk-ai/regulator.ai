/**
 * Phase 17 Stage 2 — Approval Requirement Normalizer Tests
 * 
 * Direct unit tests for approval requirement determination logic.
 */

const assert = require('assert');
const { determineApprovalRequirement, validateApprovalRequirement } = require('../../lib/core/approval-requirement-normalizer');
const { createPolicyDecision } = require('../../lib/core/policy-decision-schema');
const { DECISION_TYPES } = require('../../lib/core/policy-schema');
const { ApprovalTier } = require('../../lib/core/approval-schema');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Approval Requirement Normalizer', () => {
  describe('Category 1: T0/T1/T2 Decision Logic', () => {
    it('T1.1: T0 should not require approval', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T0 action'],
        requirements: { approval_required: false },
        evaluated_context: {
          plan_summary: { risk_tier: 'T0' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T0', action: 'read_logs' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, false);
      assert.strictEqual(requirement.tier, null);
      assert.strictEqual(requirement.fail_closed, false);
      assert.match(requirement.reason, /T0 actions do not require approval/);
    });

    it('T1.2: T1 should require approval with tier=T1', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T1 action'],
        requirements: { approval_required: false },
        evaluated_context: {
          plan_summary: { risk_tier: 'T1' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T1', action: 'restart_service' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T1);
      assert.strictEqual(requirement.fail_closed, false);
      assert.strictEqual(requirement.ttl, 3600);
    });

    it('T1.3: T2 should require approval with tier=T2', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T2 action'],
        requirements: { approval_required: false },
        evaluated_context: {
          plan_summary: { risk_tier: 'T2' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T2', action: 'delete_data' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
      assert.strictEqual(requirement.fail_closed, false);
      assert.strictEqual(requirement.ttl, 1800);
    });
  });

  describe('Category 2: Policy-Driven Approval', () => {
    it('T2.1: REQUIRE_APPROVAL decision should require approval', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Sensitive operation'],
        requirements: {
          approval_required: true,
          approval_tier: ApprovalTier.T1
        },
        evaluated_context: {
          plan_summary: { risk_tier: 'T1' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T1', action: 'modify_config' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T1);
      assert.strictEqual(requirement.fail_closed, false);
    });

    it('T2.2: requirements.approval_required=true should require approval', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['Policy requires approval'],
        requirements: {
          approval_required: true,
          approval_tier: ApprovalTier.T2
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T0', action: 'special_action' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
    });
  });

  describe('Category 3: Fail-Closed Behavior', () => {
    it('T3.1: Missing approval tier should fail closed to T2', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Approval required'],
        requirements: {
          approval_required: true
          // Missing approval_tier
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T0', action: 'unknown_action' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
      assert.strictEqual(requirement.fail_closed, true);
      assert.match(requirement.reason, /FAIL_CLOSED/);
    });

    it('T3.2: Invalid approval tier should fail closed to T2', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Invalid tier'],
        requirements: {
          approval_required: true,
          approval_tier: 'INVALID_TIER'
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { action: 'test_action' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
      assert.strictEqual(requirement.fail_closed, true);
    });
  });

  describe('Category 4: TTL Determination', () => {
    it('T4.1: T1 should have 3600s TTL', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T1'],
        requirements: { approval_required: false },
        evaluated_context: { plan_summary: {}, evaluation_time_ms: 10 }
      });

      const req = determineApprovalRequirement(policyDecision, { risk_tier: 'T1' });
      assert.strictEqual(req.ttl, 3600);
    });

    it('T4.2: T2 should have 1800s TTL', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T2'],
        requirements: { approval_required: false },
        evaluated_context: { plan_summary: {}, evaluation_time_ms: 10 }
      });

      const req = determineApprovalRequirement(policyDecision, { risk_tier: 'T2' });
      assert.strictEqual(req.ttl, 1800);
    });

    it('T4.3: Custom policy TTL should override default', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Custom TTL'],
        requirements: {
          approval_required: true,
          approval_tier: ApprovalTier.T1,
          approval_ttl_seconds: 7200
        },
        evaluated_context: { plan_summary: {}, evaluation_time_ms: 10 }
      });

      const req = determineApprovalRequirement(policyDecision, { risk_tier: 'T1' });
      assert.strictEqual(req.ttl, 7200);
    });
  });

  describe('Category 5: Validation', () => {
    it('T5.1: Should validate valid requirement', () => {
      const requirement = {
        required: true,
        tier: ApprovalTier.T1,
        reason: 'Test reason',
        ttl: 3600,
        fail_closed: false
      };

      const validation = validateApprovalRequirement(requirement);
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    it('T5.2: Should reject requirement without tier when required=true', () => {
      const requirement = {
        required: true,
        tier: null,
        reason: 'Test',
        ttl: 3600,
        fail_closed: false
      };

      const validation = validateApprovalRequirement(requirement);
      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.some(e => e.includes('tier required')));
    });

    it('T5.3: Should reject invalid tier', () => {
      const requirement = {
        required: true,
        tier: 'INVALID',
        reason: 'Test',
        ttl: 3600,
        fail_closed: false
      };

      const validation = validateApprovalRequirement(requirement);
      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.some(e => e.includes('tier must be one of')));
    });
  });
});
