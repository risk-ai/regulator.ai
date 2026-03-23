/**
 * Phase 27 — Explainability Tests
 * 
 * Validates explanation generation for execution outcomes.
 */

process.env.VIENNA_ENV = 'test';

const assert = require('assert');

const { getStateGraph } = require('../../vienna-core/lib/state/state-graph');
const { ExplanationGenerator } = require('../../vienna-core/lib/explainability/explanation-generator');
const { StateDiffTracker } = require('../../vienna-core/lib/explainability/state-diff-tracker');
const { RecommendationEngine } = require('../../vienna-core/lib/explainability/recommendation-engine');

describe('Phase 27 — Execution Explainability', () => {
  let stateGraph;
  let explanationGenerator;
  let stateDiffTracker;
  let recommendationEngine;

  before(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();

    explanationGenerator = new ExplanationGenerator(stateGraph);
    stateDiffTracker = new StateDiffTracker(stateGraph);
    recommendationEngine = new RecommendationEngine();
  });

  after(async () => {
    if (stateGraph) {
      await stateGraph.close();
    }
  });

  describe('ExplanationGenerator', () => {
    it('should explain successful execution', async () => {
      const executionId = `exec_success_${Date.now()}`;

      // Mock execution events
      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'intent_received',
        event_timestamp: new Date().toISOString(),
        payload: {
          action_type: 'restart_service',
          target_id: 'openclaw-gateway'
        }
      });

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'policy_evaluated',
        event_timestamp: new Date().toISOString(),
        payload: {
          policy_id: 'gateway_recovery_policy',
          verdict: 'approved',
          constraints_evaluated: [
            { type: 'service_status', passed: true, status: 'degraded' }
          ]
        }
      });

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'execution_completed',
        event_timestamp: new Date().toISOString(),
        payload: {
          result: 'success'
        }
      });

      const explanation = explanationGenerator.explainSuccess(executionId);

      assert.strictEqual(explanation.type, 'success');
      assert.strictEqual(explanation.action, 'restart_service');
      assert.strictEqual(explanation.target, 'openclaw-gateway');
      assert.strictEqual(explanation.decision_path.policy_verdict, 'approved');
      assert.ok(explanation.outcome.includes('successfully'));
    });

    it('should explain denied execution', async () => {
      const executionId = `exec_denied_${Date.now()}`;

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'intent_received',
        event_timestamp: new Date().toISOString(),
        payload: {
          action_type: 'restart_service',
          target_id: 'kalshi-api'
        }
      });

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'policy_evaluated',
        event_timestamp: new Date().toISOString(),
        payload: {
          policy_id: 'trading_protection_policy',
          verdict: 'denied',
          constraints_evaluated: [
            {
              type: 'time_window',
              passed: false,
              reason: 'Trading window active',
              required: 'Outside trading hours'
            }
          ]
        }
      });

      const explanation = explanationGenerator.explainDenial(executionId);

      assert.strictEqual(explanation.type, 'denied');
      assert.strictEqual(explanation.decision_path.policy_verdict, 'denied');
      assert.strictEqual(explanation.decision_path.blocking_condition.type, 'time_window');
      assert.ok(explanation.recommendations.length > 0);
    });

    it('should explain failed execution', async () => {
      const executionId = `exec_failed_${Date.now()}`;

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'intent_received',
        event_timestamp: new Date().toISOString(),
        payload: {
          action_type: 'restart_service',
          target_id: 'missing-service'
        }
      });

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'execution_failed',
        event_timestamp: new Date().toISOString(),
        payload: {
          error: 'Service not found',
          error_message: 'systemctl: Unit missing-service.service not found'
        }
      });

      const explanation = explanationGenerator.explainFailure(executionId);

      assert.strictEqual(explanation.type, 'failed');
      assert.strictEqual(explanation.decision_path.execution_result, 'failed');
      assert.ok(explanation.decision_path.failure_reason.includes('not found'));
      assert.ok(explanation.recommendations.length > 0);
    });
  });

  describe('StateDiffTracker', () => {
    it('should capture before/after state', async () => {
      const executionId = `exec_diff_${Date.now()}`;
      const serviceId = `test-service-${Date.now()}`;

      // Create test service
      await stateGraph.query(`
        INSERT INTO services (service_id, service_type, name, status, health)
        VALUES (?, ?, ?, ?, ?)
      `, [serviceId, 'systemd', 'Test Service', 'degraded', 'unhealthy']);

      // Capture before
      const before = await stateDiffTracker.captureBeforeState(
        serviceId,
        'service',
        executionId
      );

      assert.strictEqual(before.status, 'degraded');
      assert.strictEqual(before.health, 'unhealthy');

      // Update service
      await stateGraph.query(`
        UPDATE services SET status = ?, health = ? WHERE service_id = ?
      `, ['active', 'healthy', serviceId]);

      // Capture after
      const after = await stateDiffTracker.captureAfterState(
        serviceId,
        'service',
        executionId
      );

      assert.strictEqual(after.status, 'active');
      assert.strictEqual(after.health, 'healthy');

      // Calculate diff
      const diff = stateDiffTracker.calculateDiff(before, after);

      assert.ok(diff.changed_fields.includes('status'));
      assert.ok(diff.changed_fields.includes('health'));
      assert.strictEqual(diff.changes.length, 2);
    });
  });

  describe('RecommendationEngine', () => {
    it('should recommend for not_found failure', () => {
      const execution = {
        execution_id: 'exec_test',
        action_type: 'restart_service',
        target_id: 'missing-service'
      };

      const failure = {
        error: 'Service not found',
        type: 'not_found'
      };

      const recommendations = recommendationEngine.generateRecommendations(execution, failure);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.action === 'check_service' || r.action === 'verify_target'));
    });

    it('should recommend for permission failure', () => {
      const execution = {
        execution_id: 'exec_test',
        action_type: 'restart_service',
        target_id: 'protected-service'
      };

      const failure = {
        error: 'Permission denied',
        type: 'permission'
      };

      const recommendations = recommendationEngine.generateRecommendations(execution, failure);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.action === 'check_permissions'));
    });

    it('should recommend for timeout failure', () => {
      const execution = {
        execution_id: 'exec_test',
        action_type: 'health_check',
        target_id: 'slow-service',
        timeout: 30000
      };

      const failure = {
        error: 'Operation timed out',
        type: 'timeout'
      };

      const recommendations = recommendationEngine.generateRecommendations(execution, failure);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.action === 'retry'));
      assert.ok(recommendations.some(r => r.suggested_timeout));
    });

    it('should generate denial recommendations', () => {
      const blockingCondition = {
        type: 'time_window',
        reason: 'Trading window active',
        details: 'Wait until 4:00 PM'
      };

      const recommendations = recommendationEngine.generateDenialRecommendations(blockingCondition);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.action === 'wait'));
    });
  });

  describe('Integration: Full Explanation Flow', () => {
    it('should generate complete explanation with state diff', async () => {
      const executionId = `exec_full_${Date.now()}`;
      const serviceId = `test-service-full-${Date.now()}`;

      // Create service
      await stateGraph.query(`
        INSERT INTO services (service_id, service_type, name, status, health)
        VALUES (?, ?, ?, ?, ?)
      `, [serviceId, 'systemd', 'Full Test Service', 'degraded', 'unhealthy']);

      // Capture before state
      await stateDiffTracker.captureBeforeState(serviceId, 'service', executionId);

      // Mock execution flow
      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'intent_received',
        event_timestamp: new Date().toISOString(),
        payload: {
          action_type: 'restart_service',
          target_id: serviceId
        }
      });

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'policy_evaluated',
        event_timestamp: new Date().toISOString(),
        payload: {
          policy_id: 'service_recovery_policy',
          verdict: 'approved'
        }
      });

      // Update service (simulate successful restart)
      await stateGraph.query(`
        UPDATE services SET status = ?, health = ? WHERE service_id = ?
      `, ['active', 'healthy', serviceId]);

      // Capture after state
      await stateDiffTracker.captureAfterState(serviceId, 'service', executionId);

      await stateGraph.appendLedgerEvent({
        execution_id: executionId,
        event_type: 'execution_completed',
        event_timestamp: new Date().toISOString(),
        payload: {
          result: 'success'
        }
      });

      // Generate explanation
      const successExplanation = explanationGenerator.explainSuccess(executionId);
      const stateChange = explanationGenerator.explainStateChange(executionId);

      // Validate success explanation
      assert.strictEqual(successExplanation.type, 'success');
      assert.strictEqual(successExplanation.action, 'restart_service');

      // Validate state change
      assert.strictEqual(stateChange.type, 'state_change');
      assert.ok(stateChange.state_diff);
      assert.ok(stateChange.state_diff.changed_fields.length > 0);
      assert.ok(stateChange.summary.includes('changed'));
    });
  });
});
