/**
 * Phase 17 Stage 2 — Policy Integration Tests
 * 
 * Validates:
 * 1. Policy-driven approval requirement determination
 * 2. T0 → no approval required
 * 3. T1 → approval required (tier=T1)
 * 4. T2 → approval required (tier=T2)
 * 5. Ambiguous approval requirement → fail closed
 * 6. Approval-required steps create pending approval requests
 * 7. Approval-required steps do NOT proceed to warrant/execution
 * 8. Request-side ledger events recorded
 */

const assert = require('assert');
const { determineApprovalRequirement } = require('../../lib/core/approval-requirement-normalizer');
const { createPolicyDecision } = require('../../lib/core/policy-decision-schema');
const { DECISION_TYPES } = require('../../lib/core/policy-schema');
const { ApprovalTier } = require('../../lib/core/approval-schema');
const { PlanExecutor } = require('../../lib/core/plan-model');
const { getStateGraph } = require('../../lib/state/state-graph');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Phase 17 Stage 2 — Policy Integration', () => {
  let stateGraph;

  beforeEach(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
  });

  afterEach(async () => {
    if (stateGraph && stateGraph.close) {
      await stateGraph.close();
    }
  });

  // ============================================================
  // TEST CATEGORY 1: Approval Requirement Determination
  // ============================================================

  describe('Category 1: Approval Requirement Determination', () => {
    it('T1.1: T0 action should not require approval', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T0 action'],
        requirements: {
          approval_required: false
        },
        evaluated_context: {
          plan_summary: { risk_tier: 'T0' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T0', action: 'read_logs', target_id: 'service-a' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, false);
      assert.strictEqual(requirement.tier, null);
      assert.strictEqual(requirement.fail_closed, false);
      assert.match(requirement.reason, /T0 actions do not require approval/);
    });

    it('T1.2: T1 action should require approval with tier=T1', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T1 action'],
        requirements: {
          approval_required: false // Policy doesn't explicitly require, but T1 tier does
        },
        evaluated_context: {
          plan_summary: { risk_tier: 'T1' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T1', action: 'restart_service', target_id: 'service-a' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T1);
      assert.strictEqual(requirement.fail_closed, false);
      assert.strictEqual(requirement.ttl, 3600); // 1 hour for T1
    });

    it('T1.3: T2 action should require approval with tier=T2', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.ALLOW,
        reasons: ['T2 action'],
        requirements: {
          approval_required: false
        },
        evaluated_context: {
          plan_summary: { risk_tier: 'T2' },
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T2', action: 'delete_data', target_id: 'database-a' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
      assert.strictEqual(requirement.fail_closed, false);
      assert.strictEqual(requirement.ttl, 1800); // 30 minutes for T2
    });

    it('T1.4: Policy REQUIRE_APPROVAL should require approval', () => {
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

      const stepContext = { risk_tier: 'T1', action: 'modify_config', target_id: 'config-a' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T1);
      assert.strictEqual(requirement.fail_closed, false);
    });

    it('T1.5: Ambiguous approval tier should fail closed to T2', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Sensitive operation'],
        requirements: {
          approval_required: true
          // Missing approval_tier
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'T0', action: 'unknown_action', target_id: 'unknown' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.required, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2); // Fail closed to highest tier
      assert.strictEqual(requirement.fail_closed, true);
      assert.match(requirement.reason, /FAIL_CLOSED/);
    });

    it('T1.6: Invalid approval tier should fail closed', () => {
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

  // ============================================================
  // TEST CATEGORY 2: Approval Request Creation
  // ============================================================

  describe('Category 2: Approval Request Creation', () => {
    it('T2.1: T1 step should create pending approval request', async () => {
      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false, // Policy says no approval needed, but will be overridden by T1
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T1 action'],
              requirements: {
                approval_required: false // T1 tier will override this
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T1' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);

      const plan = {
        plan_id: 'plan_test_001',
        objective: 'test_objective',
        environment: 'test',
        steps: [
          {
            step_id: 'step_1',
            action: 'restart_service',
            risk_tier: 'T1',
            target_type: 'service',
            target_id: 'test-service',
            parameters: {},
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});

      // Plan should stop with pending_approval
      assert.strictEqual(result.status, 'pending_approval');
      assert.strictEqual(result.pending_at_step, 'step_1');
      assert.ok(result.approval_id);
      assert.strictEqual(result.approval_tier, ApprovalTier.T1);

      // Check approval was created in database
      const approval = await stateGraph.getApproval(result.approval_id);
      assert.ok(approval);
      assert.strictEqual(approval.status, 'pending');
      assert.strictEqual(approval.tier, ApprovalTier.T1);
      assert.strictEqual(approval.step_id, 'step_1');
    });

    it('T2.2: T2 step should create pending approval with T2 tier', async () => {
      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false,
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T2 action'],
              requirements: {
                approval_required: false
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T2' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);

      const plan = {
        plan_id: 'plan_test_002',
        objective: 'test_objective',
        environment: 'test',
        steps: [
          {
            step_id: 'step_1',
            action: 'delete_data',
            risk_tier: 'T2',
            target_type: 'database',
            target_id: 'test-db',
            parameters: {},
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});

      assert.strictEqual(result.status, 'pending_approval');
      assert.strictEqual(result.approval_tier, ApprovalTier.T2);

      const approval = await stateGraph.getApproval(result.approval_id);
      assert.strictEqual(approval.tier, ApprovalTier.T2);
      assert.ok(approval.ttl <= 1800); // T2 has shorter TTL
    });

    it('T2.3: T0 step should NOT create approval request', async () => {
      let executionHappened = false;

      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          const policyDecision = createPolicyDecision({
            plan_id: intent.metadata.plan_id,
            policy_id: 'test_policy',
            policy_version: '1.0.0',
            decision: DECISION_TYPES.ALLOW,
            reasons: ['T0 action'],
            requirements: {
              approval_required: false
            },
            evaluated_context: {
              plan_summary: { risk_tier: 'T0' },
              evaluation_time_ms: 10
            }
          });

          return {
            approved: true,
            policy_decision,
            warrant: { warrant_id: 'warrant_test', authorized: true },
            execution_result: { ok: true, result: 'success' }
          };
        }
      };

      // Mock the internal methods that would normally execute
      const executor = new PlanExecutor(stateGraph, mockGovernance);
      const originalIssueWarrant = executor._issueWarrant;
      executor._issueWarrant = async () => {
        executionHappened = true;
        return { warrant_id: 'warrant_test', authorized: true };
      };

      const plan = {
        plan_id: 'plan_test_003',
        objective: 'test_objective',
        environment: 'test',
        steps: [
          {
            step_id: 'step_1',
            action: 'read_logs',
            risk_tier: 'T0',
            target_type: 'service',
            target_id: 'test-service',
            parameters: {},
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});

      // T0 should complete without approval
      assert.notStrictEqual(result.status, 'pending_approval');
      assert.ok(executionHappened); // Execution should proceed
    });
  });

  // ============================================================
  // TEST CATEGORY 3: No Warrant/Execution for Pending Approval
  // ============================================================

  describe('Category 3: No Warrant/Execution After Approval Required', () => {
    it('T3.1: Approval-required step should NOT issue warrant', async () => {
      let warrantIssued = false;

      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false,
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T1 action'],
              requirements: {
                approval_required: false
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T1' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);
      const originalIssueWarrant = executor._issueWarrant;
      executor._issueWarrant = async () => {
        warrantIssued = true;
        return { warrant_id: 'should_not_happen' };
      };

      const plan = {
        plan_id: 'plan_test_004',
        steps: [
          {
            step_id: 'step_1',
            action: 'restart_service',
            risk_tier: 'T1',
            target_type: 'service',
            target_id: 'test-service',
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});

      assert.strictEqual(result.status, 'pending_approval');
      assert.strictEqual(warrantIssued, false); // Warrant should NOT be issued
    });

    it('T3.2: Approval-required step should NOT execute action', async () => {
      let actionExecuted = false;

      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false,
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T2 action'],
              requirements: {
                approval_required: false
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T2' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);
      const originalExecuteAction = executor._executeAction;
      executor._executeAction = async () => {
        actionExecuted = true;
        return { ok: true };
      };

      const plan = {
        plan_id: 'plan_test_005',
        steps: [
          {
            step_id: 'step_1',
            action: 'delete_data',
            risk_tier: 'T2',
            target_type: 'database',
            target_id: 'test-db',
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});

      assert.strictEqual(result.status, 'pending_approval');
      assert.strictEqual(actionExecuted, false); // Action should NOT execute
    });
  });

  // ============================================================
  // TEST CATEGORY 4: Ledger Events
  // ============================================================

  describe('Category 4: Ledger Events', () => {
    it('T4.1: Should record approval_requirement_determined event', async () => {
      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false,
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T1 action'],
              requirements: {
                approval_required: false
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T1' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);

      const plan = {
        plan_id: 'plan_test_006',
        steps: [
          {
            step_id: 'step_1',
            action: 'restart_service',
            risk_tier: 'T1',
            target_type: 'service',
            target_id: 'test-service',
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});
      const executionId = result.metadata?.approval_request?.execution_id;

      assert.ok(executionId);

      // Check ledger for approval_requirement_determined event
      const ledgerEvents = await stateGraph.listExecutionLedgerEvents(executionId);
      const requirementEvent = ledgerEvents.find(e => e.event_type === 'approval_requirement_determined');

      assert.ok(requirementEvent);
      assert.strictEqual(requirementEvent.payload_json.approval_required, true);
      assert.strictEqual(requirementEvent.payload_json.approval_tier, ApprovalTier.T1);
    });

    it('T4.2: Should record approval_requested event', async () => {
      const mockGovernance = {
        evaluateIntent: async (intent, context) => {
          return {
            approved: false,
            policy_decision: createPolicyDecision({
              plan_id: intent.metadata.plan_id,
              policy_id: 'test_policy',
              policy_version: '1.0.0',
              decision: DECISION_TYPES.ALLOW,
              reasons: ['T2 action'],
              requirements: {
                approval_required: false
              },
              evaluated_context: {
                plan_summary: { risk_tier: 'T2' },
                evaluation_time_ms: 10
              }
            })
          };
        }
      };

      const executor = new PlanExecutor(stateGraph, mockGovernance);

      const plan = {
        plan_id: 'plan_test_007',
        steps: [
          {
            step_id: 'step_1',
            action: 'delete_data',
            risk_tier: 'T2',
            target_type: 'database',
            target_id: 'test-db',
            dependencies: []
          }
        ]
      };

      const result = await executor.execute(plan, {});
      const approvalId = result.approval_id;
      const executionId = result.metadata?.approval_request?.execution_id;

      assert.ok(executionId);

      // Check ledger for approval_requested event
      const ledgerEvents = await stateGraph.listExecutionLedgerEvents(executionId);
      const requestedEvent = ledgerEvents.find(e => e.event_type === 'approval_requested');

      assert.ok(requestedEvent);
      assert.strictEqual(requestedEvent.payload_json.approval_id, approvalId);
      assert.strictEqual(requestedEvent.payload_json.tier, ApprovalTier.T2);
      assert.strictEqual(requestedEvent.payload_json.action, 'delete_data');
    });
  });

  // ============================================================
  // TEST CATEGORY 5: Fail-Closed Behavior
  // ============================================================

  describe('Category 5: Fail-Closed Behavior', () => {
    it('T5.1: Missing approval tier with approval required should fail closed', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Approval required but ambiguous tier'],
        requirements: {
          approval_required: true
          // No approval_tier specified
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { action: 'unknown_action' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.fail_closed, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2); // Fail to highest tier
      assert.strictEqual(requirement.required, true);
    });

    it('T5.2: Invalid risk tier with approval required should fail closed', () => {
      const policyDecision = createPolicyDecision({
        plan_id: 'plan_test',
        policy_id: 'test_policy',
        policy_version: '1.0.0',
        decision: DECISION_TYPES.REQUIRE_APPROVAL,
        reasons: ['Invalid tier'],
        requirements: {
          approval_required: true,
          approval_tier: 'INVALID'
        },
        evaluated_context: {
          plan_summary: {},
          evaluation_time_ms: 10
        }
      });

      const stepContext = { risk_tier: 'INVALID', action: 'test_action' };
      const requirement = determineApprovalRequirement(policyDecision, stepContext);

      assert.strictEqual(requirement.fail_closed, true);
      assert.strictEqual(requirement.tier, ApprovalTier.T2);
    });
  });
});
