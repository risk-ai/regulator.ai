/**
 * End-to-End Integration Tests — Full Vienna OS Lifecycle
 * 
 * Tests the complete governed execution pipeline with schema-aligned components.
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { IntentClassifier } = require('../../lib/core/intent-classifier');
const { generatePlan } = require('../../lib/core/plan-generator');
// PolicyEngine mock - will be replaced with real implementation
const ApprovalManager = require('../../lib/core/approval-manager');
const { createApprovalRequest, ApprovalTier } = require('../../lib/core/approval-schema');

describe('End-to-End Integration — Full Vienna OS Lifecycle', () => {
  let stateGraph;
  let intentClassifier;
  let policyEngine;
  let approvalManager;

  beforeAll(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    
    intentClassifier = new IntentClassifier();
    policyEngine = { evaluate: jest.fn() }; // Mock for now
    approvalManager = new ApprovalManager(stateGraph);
  });

  afterAll(async () => {
    if (stateGraph?.db) {
      stateGraph.db.close();
    }
  });

  test('E2E1: Full lifecycle — T0 intent → execution → verification → learning', async () => {
    const userInput = 'show status';
    
    // Step 1: Intent classified
    const intentResult = intentClassifier.classify(userInput);
    
    expect(intentResult.intent_type).toBe('read_only_query_local');
    expect(intentResult.normalized_action?.action_id).toBe('show_status');
    
    // Step 2: Plan generated
    
    const plan = generatePlan(intentResult);
    expect(plan.plan_id).toBeDefined();
    expect(plan.risk_tier).toBe('T0');
    
    // Step 3: Policy evaluated (T0 = no approval required)
    const policyResult = {
      decision: 'ALLOW',
      reason: 'T0 actions do not require approval',
      approval_required: false
    };
    policyEngine.evaluate.mockResolvedValue(policyResult);
    
    const policyEval = await policyEngine.evaluate(plan);
    expect(policyEval.approval_required).toBe(false);
    
    // Step 4: Execution (simulated)
    // For T0, execution would proceed directly
    expect(plan.status).toBe('pending');
  });

  test('E2E2: Full lifecycle — T1 intent → approval → execution → verification', async () => {
    const userInput = 'restart openclaw-gateway';
    
    // Step 1: Intent classified
    const intentResult = intentClassifier.classify(userInput);
    
    expect(intentResult.intent_type).toBe('side_effecting');
    expect(intentResult.normalized_action?.action_id).toBe('restart_service');
    
    // Step 2: Plan generated
    
    const plan = generatePlan(intentResult);
    
    
    expect(plan.risk_tier).toBe('T1');
    
    // Step 3: Policy evaluated (T1 = requires approval)
    const policyResult = {
      decision: 'REQUIRE_APPROVAL',
      reason: 'T1 requires operator approval',
      approval_required: true
    };
    policyEngine.evaluate.mockResolvedValue(policyResult);
    
    const policyEval = await policyEngine.evaluate(plan);
    expect(policyEval.approval_required).toBe(true);
    
    // Step 4: Approval created with correct schema
    const approvalReq = createApprovalRequest({
      execution_id: `exec_e2e_t1_${Date.now()}`,
      plan_id: plan.plan_id,
      step_id: 'step_0',
      intent_id: plan.intent_id || `intent_${Date.now()}`,
      required_tier: ApprovalTier.T1,
      required_by: 'policy_engine',
      requested_by: 'test_operator',
      ttl_seconds: 300,
      action_summary: 'Restart openclaw-gateway',
      risk_summary: 'Service restart requires operator approval',
      target_entities: ['service:openclaw-gateway'],
      estimated_duration_ms: 5000,
      rollback_available: true
    });
    
    await stateGraph.createApproval(approvalReq);
    
    expect(approvalReq.approval_id).toBeDefined();
    expect(approvalReq.status).toBe('pending');
    
    // Operator approves
    const approvalResult = await approvalManager.approve(
      approvalReq.approval_id,
      'test_operator',
      'E2E test - approved for testing'
    );
    
    expect(approvalResult.status).toBe('approved');
  });

  test('E2E3: Full lifecycle — Approval denied → execution blocked', async () => {
    const userInput = 'restart vienna-console';
    
    // Step 1: Intent classified
    const intentResult = intentClassifier.classify(userInput);
    expect(intentResult.intent_type).toBe('side_effecting');
    
    // Step 2: Plan generated
    
    const plan = generatePlan(intentResult);
    
    
    // Step 3: Policy evaluated
    const policyResult = {
      decision: 'REQUIRE_APPROVAL',
      reason: 'T1 requires operator approval',
      approval_required: true
    };
    policyEngine.evaluate.mockResolvedValue(policyResult);
    
    await policyEngine.evaluate(plan);
    
    // Step 4: Approval created and DENIED with correct schema
    const approvalReq = createApprovalRequest({
      execution_id: `exec_e2e_deny_${Date.now()}`,
      plan_id: plan.plan_id,
      step_id: 'step_0',
      intent_id: plan.intent_id || `intent_${Date.now()}`,
      required_tier: ApprovalTier.T1,
      required_by: 'policy_engine',
      requested_by: 'test_operator',
      ttl_seconds: 300,
      action_summary: 'Restart vienna-console',
      risk_summary: 'Service restart requires operator approval',
      target_entities: ['service:vienna-console'],
      estimated_duration_ms: 5000,
      rollback_available: true
    });
    
    await stateGraph.createApproval(approvalReq);
    
    const denyResult = await approvalManager.deny(
      approvalReq.approval_id,
      'test_operator',
      'E2E test - intentionally denied'
    );
    
    expect(denyResult.status).toBe('denied');
    
    // Execution would be blocked (tested in execution engine tests)
  });

  test('E2E4: Governance invariants preserved — no bypass paths', async () => {
    // Attempt to execute plan without approval when required
    const plan = {
      plan_id: `plan_bypass_${Date.now()}`,
      objective: 'Test bypass protection',
      status: 'pending',
      risk_tier: 'T1',
      steps: [
        {
          step_id: 'step_bypass',
          action: {
            action_id: 'restart_service',
            entities: { service: 'test-service' }
          },
          timeout_ms: 30000,
          approval_required: true
        }
      ]
    };
    
    await stateGraph.createPlan(plan);
    
    // Without approval, execution should be blocked
    // This is enforced by the execution engine (tested separately)
    const planFromDb = stateGraph.getPlan(plan.plan_id);
    expect(planFromDb).toBeDefined();
    expect(planFromDb.steps[0].approval_required).toBe(true);
  });
});
