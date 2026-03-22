#!/usr/bin/env node
/**
 * Phase 17 Stage 2 — Manual Test Runner
 * 
 * Direct test execution without Jest (to avoid uuid ESM issues)
 */

process.env.VIENNA_ENV = 'test';

const { determineApprovalRequirement, validateApprovalRequirement } = require('../../lib/core/approval-requirement-normalizer');
const { createPolicyDecision } = require('../../lib/core/policy-decision-schema');
const { DECISION_TYPES } = require('../../lib/core/policy-schema');
const { ApprovalTier } = require('../../lib/core/approval-schema');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failedTests++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertMatch(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(message || `Expected ${actual} to match ${pattern}`);
  }
}

console.log('\n=== Phase 17 Stage 2 — Policy Integration Tests ===\n');

// ============================================================
// Category 1: T0/T1/T2 Decision Logic
// ============================================================

console.log('Category 1: T0/T1/T2 Decision Logic');

test('T1.1: T0 should not require approval', () => {
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

  assertEquals(requirement.required, false, 'Should not require approval');
  assertEquals(requirement.tier, null, 'Tier should be null');
  assertEquals(requirement.fail_closed, false, 'Should not be fail_closed');
  assertMatch(requirement.reason, /T0 actions do not require approval/, 'Reason should mention T0');
});

test('T1.2: T1 should require approval with tier=T1', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T1, 'Tier should be T1');
  assertEquals(requirement.fail_closed, false, 'Should not be fail_closed');
  assertEquals(requirement.ttl, 3600, 'TTL should be 3600');
});

test('T1.3: T2 should require approval with tier=T2', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T2, 'Tier should be T2');
  assertEquals(requirement.fail_closed, false, 'Should not be fail_closed');
  assertEquals(requirement.ttl, 1800, 'TTL should be 1800');
});

// ============================================================
// Category 2: Policy-Driven Approval
// ============================================================

console.log('\nCategory 2: Policy-Driven Approval');

test('T2.1: REQUIRE_APPROVAL decision should require approval', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T1, 'Tier should be T1');
  assertEquals(requirement.fail_closed, false, 'Should not be fail_closed');
});

test('T2.2: requirements.approval_required=true should require approval', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T2, 'Tier should be T2');
});

// ============================================================
// Category 3: Fail-Closed Behavior
// ============================================================

console.log('\nCategory 3: Fail-Closed Behavior');

test('T3.1: Missing approval tier should fail closed to T2', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T2, 'Should fail closed to T2');
  assertEquals(requirement.fail_closed, true, 'Should be fail_closed');
  assertMatch(requirement.reason, /FAIL_CLOSED/, 'Reason should mention FAIL_CLOSED');
});

test('T3.2: Invalid approval tier should fail closed to T2', () => {
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

  assertEquals(requirement.required, true, 'Should require approval');
  assertEquals(requirement.tier, ApprovalTier.T2, 'Should fail closed to T2');
  assertEquals(requirement.fail_closed, true, 'Should be fail_closed');
});

// ============================================================
// Category 4: TTL Determination
// ============================================================

console.log('\nCategory 4: TTL Determination');

test('T4.1: T1 should have 3600s TTL', () => {
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
  assertEquals(req.ttl, 3600, 'T1 should have 3600s TTL');
});

test('T4.2: T2 should have 1800s TTL', () => {
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
  assertEquals(req.ttl, 1800, 'T2 should have 1800s TTL');
});

test('T4.3: Custom policy TTL should override default', () => {
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
  assertEquals(req.ttl, 7200, 'Should use custom TTL');
});

// ============================================================
// Category 5: Validation
// ============================================================

console.log('\nCategory 5: Validation');

test('T5.1: Should validate valid requirement', () => {
  const requirement = {
    required: true,
    tier: ApprovalTier.T1,
    reason: 'Test reason',
    ttl: 3600,
    fail_closed: false
  };

  const validation = validateApprovalRequirement(requirement);
  assertEquals(validation.valid, true, 'Should be valid');
  assertEquals(validation.errors.length, 0, 'Should have no errors');
});

test('T5.2: Should reject requirement without tier when required=true', () => {
  const requirement = {
    required: true,
    tier: null,
    reason: 'Test',
    ttl: 3600,
    fail_closed: false
  };

  const validation = validateApprovalRequirement(requirement);
  assertEquals(validation.valid, false, 'Should be invalid');
  if (!validation.errors.some(e => e.includes('tier required'))) {
    throw new Error('Should have tier required error');
  }
});

test('T5.3: Should reject invalid tier', () => {
  const requirement = {
    required: true,
    tier: 'INVALID',
    reason: 'Test',
    ttl: 3600,
    fail_closed: false
  };

  const validation = validateApprovalRequirement(requirement);
  assertEquals(validation.valid, false, 'Should be invalid');
  if (!validation.errors.some(e => e.includes('tier must be one of'))) {
    throw new Error('Should have invalid tier error');
  }
});

// ============================================================
// Summary
// ============================================================

console.log('\n' + '='.repeat(60));
console.log(`\nTests Passed: ${passedTests}`);
console.log(`Tests Failed: ${failedTests}`);
console.log(`Total Tests: ${passedTests + failedTests}\n`);

if (failedTests > 0) {
  process.exit(1);
}

console.log('✓ All tests passed!\n');
