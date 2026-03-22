/**
 * Phase 16.1 HARDENED — Governance Pipeline Integration Tests
 * 
 * Validates:
 * 1. All steps flow through real governance (no stubs)
 * 2. Governance rejection stops plan immediately
 * 3. Execution failure stops plan immediately
 * 4. All traces persisted with linked IDs
 * 5. No bypass paths exist
 */

const assert = require('assert');
const { getStateGraph } = require('../../lib/state/state-graph');
const { PlanExecutor } = require('../../lib/core/plan-model');

// Set test environment
process.env.VIENNA_ENV = 'test';

describe('Phase 16.1 — Governance Pipeline Integration (HARDENED)', () => {
  let stateGraph;
  let planExecutor;
  let mockGovernancePipeline;

  beforeEach(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();

    // Create mock governance pipeline
    mockGovernancePipeline = {
      evaluateIntent: async (intent, context) => {
        // Default: approve all
        return { approved: true, intent_id: intent.intent_id };
      }
    };

    planExecutor = new PlanExecutor(stateGraph, mockGovernancePipeline);
  });

  afterEach(async () => {
    if (stateGraph && stateGraph.close) {
      await stateGraph.close();
    }
  });

  // ============================================================
  // TEST CATEGORY 1: NO STUBS (Governance required)
  // ============================================================

  it('T1.1: Should throw if no governance pipeline configured', async () => {
    const executorWithoutGov = new PlanExecutor(stateGraph, null);

    const plan = {
      plan_id: 'plan_no_gov',
      steps: [{
        step_id: 'step_1',
        action: 'restart',
        target_type: 'service',
        target_id: 'test-service',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    const intent = {
      intent_id: 'intent_no_gov',
      intent_type: 'proposed',
      action: 'restart',
      target_type: 'service',
      target_id: 'test-service',
      metadata: { plan_id: plan.plan_id, step_id: 'step_1' }
    };

    try {
      await executorWithoutGov.executeStep(intent, plan, {});
      assert.fail('Should have thrown GOVERNANCE_REQUIRED error');
    } catch (error) {
      assert.ok(error.message.includes('GOVERNANCE_REQUIRED'));
      assert.ok(error.message.includes('No stub execution allowed'));
    }
  });

  it('T1.2: Should execute through real governance pipeline when configured', async () => {
    // Create test service
    stateGraph.createService({
      service_id: 'test-service-real',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_real_gov',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'service',
        target_id: 'test-service-real',
        risk_tier: 'T0',
        dependencies: [],
        parameters: {}
      }]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Should complete (or fail with real governance, but NOT return stub)
    assert.ok(result.status === 'completed' || result.status === 'failed');
    assert.ok(!result.execution_log[0].result.note?.includes('Stub'));
  });

  // ============================================================
  // TEST CATEGORY 2: GOVERNANCE REJECTION STOPS PLAN
  // ============================================================

  it('T2.1: Policy denial should stop plan immediately', async () => {
    // Create policies that deny restart actions
    stateGraph.createPolicy({
      policy_id: 'deny_restart',
      enabled: true,
      decision: 'deny',
      priority: 100,
      scope: {
        actions: ['system_service_restart'],
        environments: ['test']
      },
      conditions: {},
      requirements: {},
      ledger_constraints: {}
    });

    stateGraph.createService({
      service_id: 'test-service-deny',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_deny',
      steps: [
        {
          step_id: 'step_1',
          action: 'system_service_restart',
          target_type: 'service',
          target_id: 'test-service-deny',
          risk_tier: 'T0',
          dependencies: []
        },
        {
          step_id: 'step_2',
          action: 'health_check',
          target_type: 'service',
          target_id: 'test-service-deny',
          risk_tier: 'T0',
          dependencies: ['step_1']
        }
      ]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Plan should be denied
    assert.strictEqual(result.status, 'denied');
    assert.strictEqual(result.denied_at_step, 'step_1');
    assert.strictEqual(result.denial_reason, 'policy_denied');

    // Step 2 should NOT be executed
    assert.strictEqual(result.execution_log.length, 1);
    assert.ok(result.completed_steps.length === 0);
  });

  it('T2.2: Reconciliation denial should stop plan immediately', async () => {
    // Create objective in DEGRADED state (reconciliation gate will deny)
    stateGraph.createObjective({
      objective_id: 'obj_degraded',
      name: 'Test degraded objective',
      objective_type: 'service_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'active' },
      evaluation_interval: 60,
      is_enabled: true,
      status: 'healthy',
      reconciliation_status: 'degraded',
      consecutive_failures: 10
    });

    const plan = {
      plan_id: 'plan_reconciliation_deny',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'objective',
        target_id: 'obj_degraded',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Plan should be denied due to reconciliation gate
    assert.strictEqual(result.status, 'denied');
    assert.strictEqual(result.denial_reason, 'reconciliation_denied');
  });

  // ============================================================
  // TEST CATEGORY 3: EXECUTION FAILURE STOPS PLAN
  // ============================================================

  it('T3.1: Execution failure should stop plan immediately', async () => {
    stateGraph.createService({
      service_id: 'nonexistent-service',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_exec_fail',
      steps: [
        {
          step_id: 'step_1',
          action: 'system_service_restart',
          target_type: 'service',
          target_id: 'nonexistent-service',
          risk_tier: 'T0',
          dependencies: []
        },
        {
          step_id: 'step_2',
          action: 'health_check',
          target_type: 'service',
          target_id: 'nonexistent-service',
          risk_tier: 'T0',
          dependencies: ['step_1']
        }
      ]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Plan should fail at step 1
    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.failed_at_step, 'step_1');

    // Step 2 should NOT be executed
    assert.strictEqual(result.execution_log.length, 1);
  });

  it('T3.2: Verification failure should stop plan immediately', async () => {
    stateGraph.createService({
      service_id: 'test-service-verify-fail',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_verify_fail',
      steps: [
        {
          step_id: 'step_1',
          action: 'system_service_restart',
          target_type: 'service',
          target_id: 'test-service-verify-fail',
          risk_tier: 'T0',
          dependencies: [],
          // Verification that will fail (service stays inactive)
          verification: {
            template_id: 'service_recovery',
            params: {
              service_id: 'test-service-verify-fail',
              expected_status: 'active'
            }
          }
        },
        {
          step_id: 'step_2',
          action: 'health_check',
          target_type: 'service',
          target_id: 'test-service-verify-fail',
          risk_tier: 'T0',
          dependencies: ['step_1']
        }
      ]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Plan should fail at verification
    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.failed_at_step, 'step_1');
    assert.ok(result.error.includes('Verification failed'));

    // Step 2 should NOT be executed
    assert.strictEqual(result.execution_log.length, 1);
  });

  // ============================================================
  // TEST CATEGORY 4: TRACE PERSISTENCE
  // ============================================================

  it('T4.1: All governance events persisted to ledger', async () => {
    stateGraph.createService({
      service_id: 'test-service-trace',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_trace',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'service',
        target_id: 'test-service-trace',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Query ledger events
    const events = stateGraph.listLedgerEvents({ limit: 100 });

    // Should have events for each governance stage
    const eventTypes = events.map(e => e.event_type);

    assert.ok(eventTypes.includes('intent.submitted'));
    assert.ok(eventTypes.includes('policy.approved') || eventTypes.includes('policy.denied'));
    assert.ok(eventTypes.includes('warrant.issued'));
    assert.ok(eventTypes.includes('execution.completed') || eventTypes.includes('execution.failed'));
  });

  it('T4.2: Intent trace linked to execution', async () => {
    stateGraph.createService({
      service_id: 'test-service-link',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_link',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'service',
        target_id: 'test-service-link',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Should have execution_id in result
    const stepResult = result.execution_log[0].result;
    assert.ok(stepResult.execution_id);

    // Intent trace should exist
    const intent_id = stepResult.intent_id;
    const trace = stateGraph.getIntentTrace(intent_id);
    assert.ok(trace);

    // Trace should link to execution
    if (stepResult.execution_id) {
      const events = stateGraph.listLedgerEvents({
        execution_id: stepResult.execution_id
      });
      assert.ok(events.length > 0);
    }
  });

  // ============================================================
  // TEST CATEGORY 5: NO BYPASS PATHS
  // ============================================================

  it('T5.1: Cannot execute without policy evaluation', async () => {
    // This test validates architectural constraint
    // executeStep MUST call _evaluatePolicy before _executeAction

    const plan = {
      plan_id: 'plan_no_bypass',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'service',
        target_id: 'test-service',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    // Spy on policy evaluation
    let policyEvaluated = false;
    const originalEvaluate = planExecutor._evaluatePolicy;
    planExecutor._evaluatePolicy = async (...args) => {
      policyEvaluated = true;
      return originalEvaluate.call(planExecutor, ...args);
    };

    await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Policy MUST have been evaluated
    assert.strictEqual(policyEvaluated, true);
  });

  it('T5.2: Cannot execute without warrant', async () => {
    const plan = {
      plan_id: 'plan_warrant_required',
      steps: [{
        step_id: 'step_1',
        action: 'system_service_restart',
        target_type: 'service',
        target_id: 'test-service',
        risk_tier: 'T0',
        dependencies: []
      }]
    };

    // Spy on warrant issuance
    let warrantIssued = false;
    const originalIssue = planExecutor._issueWarrant;
    planExecutor._issueWarrant = async (...args) => {
      warrantIssued = true;
      return originalIssue.call(planExecutor, ...args);
    };

    await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Warrant MUST have been issued
    assert.strictEqual(warrantIssued, true);
  });

  // ============================================================
  // TEST CATEGORY 6: MULTI-STEP PLAN INTEGRITY
  // ============================================================

  it('T6.1: Multi-step plan stops on first denial', async () => {
    // Create policy that denies restart but allows health_check
    stateGraph.createPolicy({
      policy_id: 'deny_restart_only',
      enabled: true,
      decision: 'deny',
      priority: 100,
      scope: {
        actions: ['system_service_restart'],
        environments: ['test']
      },
      conditions: {},
      requirements: {},
      ledger_constraints: {}
    });

    const plan = {
      plan_id: 'plan_multi_deny',
      steps: [
        {
          step_id: 'step_1',
          action: 'health_check',
          target_type: 'service',
          target_id: 'test-service',
          risk_tier: 'T0',
          dependencies: []
        },
        {
          step_id: 'step_2',
          action: 'system_service_restart',
          target_type: 'service',
          target_id: 'test-service',
          risk_tier: 'T0',
          dependencies: ['step_1']
        },
        {
          step_id: 'step_3',
          action: 'health_check',
          target_type: 'service',
          target_id: 'test-service',
          risk_tier: 'T0',
          dependencies: ['step_2']
        }
      ]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Step 1 should complete
    // Step 2 should be denied
    // Step 3 should NOT execute

    assert.strictEqual(result.status, 'denied');
    assert.strictEqual(result.denied_at_step, 'step_2');
    assert.strictEqual(result.execution_log.length, 2); // step_1 + step_2
    assert.strictEqual(result.completed_steps.length, 1); // Only step_1
    assert.ok(!result.completed_steps.includes('step_3'));
  });

  it('T6.2: All completed steps have full governance trail', async () => {
    stateGraph.createService({
      service_id: 'test-service-multi',
      service_type: 'systemd',
      status: 'inactive'
    });

    const plan = {
      plan_id: 'plan_multi_trail',
      steps: [
        {
          step_id: 'step_1',
          action: 'health_check',
          target_type: 'service',
          target_id: 'test-service-multi',
          risk_tier: 'T0',
          dependencies: []
        },
        {
          step_id: 'step_2',
          action: 'sleep',
          target_type: 'system',
          target_id: 'test',
          risk_tier: 'T0',
          dependencies: ['step_1'],
          parameters: { duration_ms: 100 }
        }
      ]
    };

    const result = await planExecutor.execute(plan, {
      environment: 'test',
      actor: { type: 'test', id: 'phase-16-test' }
    });

    // Both steps should complete
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.completed_steps.length, 2);

    // Each step should have governance_result with full pipeline
    for (const log of result.execution_log) {
      const stepResult = log.result;
      if (stepResult.status === 'completed') {
        assert.ok(stepResult.governance_result);
        assert.ok(stepResult.governance_result.policy_decision);
        assert.ok(stepResult.governance_result.warrant);
        assert.ok(stepResult.governance_result.execution_result);
      }
    }
  });
});

// Run tests
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha({ timeout: 10000 });
  mocha.addFile(__filename);
  mocha.run(failures => {
    process.exit(failures ? 1 : 0);
  });
}
