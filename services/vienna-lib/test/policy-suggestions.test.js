/**
 * Policy Suggestions Tests
 * 
 * Tests for after-hours patterns, high-frequency agent detection,
 * repeated denial detection, and confidence scoring.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { PolicyRecommender, RecommendationType } = require('../learning/policy-recommender');
const PolicyDenialDetector = require('../detection/detectors/policy-denial-detector');

// Mock State Graph for testing
class MockStateGraph {
  constructor() {
    this.policies = new Map();
    this.policyDecisions = [];
    this.approvals = [];
    this.auditEvents = [];
  }

  // Policy methods
  async getPolicy(policyId) {
    return this.policies.get(policyId);
  }

  addPolicy(policyId, policy) {
    this.policies.set(policyId, { policy_id: policyId, ...policy });
  }

  // Policy decision methods
  query(sql, params) {
    if (sql.includes('policy_decisions') && sql.includes("decision = 'deny'")) {
      const lookbackTime = params[0];
      
      return this.policyDecisions.filter(d => 
        d.decision === 'deny' && 
        new Date(d.created_at) >= new Date(lookbackTime)
      );
    }
    return [];
  }

  async listPolicyDecisions(options = {}) {
    let decisions = [...this.policyDecisions];
    
    if (options.policy_id) {
      decisions = decisions.filter(d => d.policy_id === options.policy_id);
    }
    if (options.created_since) {
      decisions = decisions.filter(d => 
        new Date(d.created_at) >= new Date(options.created_since)
      );
    }
    if (options.limit) {
      decisions = decisions.slice(0, options.limit);
    }
    
    return decisions;
  }

  async listApprovals(options = {}) {
    let approvals = [...this.approvals];
    
    if (options.execution_id) {
      approvals = approvals.filter(a => a.execution_id === options.execution_id);
    }
    if (options.limit) {
      approvals = approvals.slice(0, options.limit);
    }
    
    return approvals;
  }

  // Test helpers
  addPolicyDecision(decision) {
    this.policyDecisions.push({
      decision_id: `dec_${this.policyDecisions.length + 1}`,
      created_at: new Date().toISOString(),
      ...decision
    });
  }

  addApproval(approval) {
    this.approvals.push({
      approval_id: `app_${this.approvals.length + 1}`,
      created_at: new Date().toISOString(),
      ...approval
    });
  }

  reset() {
    this.policies.clear();
    this.policyDecisions = [];
    this.approvals = [];
    this.auditEvents = [];
  }
}

describe('Policy Suggestions', () => {
  let stateGraph;
  let policyRecommender;
  let policyDenialDetector;

  beforeEach(() => {
    stateGraph = new MockStateGraph();
    policyRecommender = new PolicyRecommender(stateGraph);
    policyDenialDetector = new PolicyDenialDetector(stateGraph, {
      lookback_minutes: 30,
      denial_threshold: 3
    });
  });

  describe('After-Hours Pattern Detection', () => {
    test('detects after-hours execution pattern', async () => {
      // Create pattern suggesting off-hours restrictions
      const pattern = {
        pattern_id: 'pat_001',
        pattern_type: 'remediation_effectiveness',
        action_type: 'deploy_code',
        target_type: 'production',
        observation_window_days: 7,
        event_count: 20,
        confidence: 0.85,
        metadata: {
          success_rate: 0.2, // Low success rate suggests restriction needed
          evidence: ['exec_001', 'exec_002', 'exec_003']
        }
      };

      const recommendation = await policyRecommender.recommendNewPolicy(pattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.recommendation_type, RecommendationType.NEW_POLICY);
      assert.ok(recommendation.proposed_change.new_policy.constraints.time_window);
      assert.deepStrictEqual(
        recommendation.proposed_change.new_policy.constraints.time_window.allowed_windows,
        [{ start: '00:00', end: '06:00' }]
      );
      assert.strictEqual(recommendation.confidence, pattern.confidence * 0.9);
    });

    test('does not recommend restriction for high success rate', async () => {
      const pattern = {
        pattern_id: 'pat_002',
        pattern_type: 'remediation_effectiveness',
        action_type: 'deploy_code',
        target_type: 'staging',
        observation_window_days: 7,
        event_count: 15,
        confidence: 0.9,
        metadata: {
          success_rate: 0.95, // High success rate - no restriction needed
          evidence: ['exec_004', 'exec_005']
        }
      };

      const recommendation = await policyRecommender.recommendNewPolicy(pattern);
      
      assert.strictEqual(recommendation, null);
    });

    test('considers moderate success rates', async () => {
      const pattern = {
        pattern_id: 'pat_003',
        pattern_type: 'remediation_effectiveness',
        action_type: 'backup_restore',
        target_type: 'database',
        observation_window_days: 14,
        event_count: 25,
        confidence: 0.8,
        metadata: {
          success_rate: 0.4, // Moderate success rate - restriction recommended
          evidence: ['exec_006', 'exec_007', 'exec_008']
        }
      };

      const recommendation = await policyRecommender.recommendNewPolicy(pattern);
      
      assert.ok(recommendation);
      assert.ok(recommendation.proposed_change.new_policy.policy_name.includes('effectiveness pattern'));
    });
  });

  describe('High-Frequency Agent Detection', () => {
    test('detects high-frequency policy denials', async () => {
      // Add multiple denials from same policy
      const policyId = 'pol_rate_limit';
      const now = new Date();
      
      for (let i = 0; i < 5; i++) {
        stateGraph.addPolicyDecision({
          policy_id: policyId,
          decision: 'deny',
          target_id: `agent_${i % 2}`, // Two agents getting denied
          reason: 'Rate limit exceeded',
          created_at: new Date(now.getTime() - i * 60000).toISOString() // 1 min intervals
        });
      }

      const anomalies = await policyDenialDetector.detect();
      
      assert.strictEqual(anomalies.length, 1);
      
      const anomaly = anomalies[0];
      assert.strictEqual(anomaly.entity_id, policyId);
      assert.strictEqual(anomaly.evidence.denial_count, 5);
      assert.strictEqual(anomaly.evidence.affected_targets.length, 2);
      assert.ok(anomaly.evidence.sample_reasons.includes('Rate limit exceeded'));
    });

    test('does not trigger on low denial count', async () => {
      // Add only 2 denials (below threshold of 3)
      const policyId = 'pol_low_activity';
      
      for (let i = 0; i < 2; i++) {
        stateGraph.addPolicyDecision({
          policy_id: policyId,
          decision: 'deny',
          target_id: `agent_${i}`,
          reason: 'Permission denied',
          created_at: new Date().toISOString()
        });
      }

      const anomalies = await policyDenialDetector.detect();
      
      assert.strictEqual(anomalies.length, 0);
    });

    test('severity assessment based on denial count', async () => {
      const testCases = [
        { count: 4, expectedSeverity: 'low' },
        { count: 7, expectedSeverity: 'medium' },
        { count: 12, expectedSeverity: 'high' }
      ];

      for (const testCase of testCases) {
        const detector = new PolicyDenialDetector(stateGraph);
        const severity = detector.assessSeverity(testCase.count);
        
        assert.strictEqual(severity, testCase.expectedSeverity, 
          `Count ${testCase.count} should be ${testCase.expectedSeverity}`);
      }
    });
  });

  describe('Repeated Denial Detection', () => {
    test('recommends constraint relaxation for repeated denials', async () => {
      // Set up policy with rate limit constraint
      const policyId = 'pol_rate_constrained';
      stateGraph.addPolicy(policyId, {
        constraints: '{"max_executions": 3, "window_ms": 3600000}',
        priority: 50
      });

      const pattern = {
        pattern_id: 'pat_004',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        observation_window_days: 7,
        event_count: 15,
        confidence: 0.85,
        metadata: {
          constraint_type: 'rate_limit',
          evidence: ['exec_010', 'exec_011', 'exec_012']
        }
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(pattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.recommendation_type, RecommendationType.CONSTRAINT_RELAXATION);
      assert.strictEqual(recommendation.target_policy_id, policyId);
      
      const proposedConstraints = recommendation.proposed_change.constraints;
      assert.strictEqual(proposedConstraints.max_executions, 5); // 3 * 1.5 = 4.5 -> 5
      assert.ok(proposedConstraints.window_ms);
    });

    test('recommends cooldown reduction for cooldown conflicts', async () => {
      const policyId = 'pol_cooldown_strict';
      stateGraph.addPolicy(policyId, {
        constraints: '{"cooldown_ms": 7200000}', // 2 hours
        priority: 60
      });

      const pattern = {
        pattern_id: 'pat_005',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.9,
        metadata: {
          constraint_type: 'cooldown',
          evidence: ['exec_013', 'exec_014']
        }
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(pattern);
      
      assert.ok(recommendation);
      
      const proposedConstraints = recommendation.proposed_change.constraints;
      assert.strictEqual(proposedConstraints.cooldown_ms, 5400000); // 7200000 * 0.75 = 5400000
    });

    test('handles time window constraint relaxation', async () => {
      const policyId = 'pol_time_restricted';
      stateGraph.addPolicy(policyId, {
        constraints: '{"allowed_windows": [{"start": "09:00", "end": "17:00"}]}',
        priority: 40
      });

      const pattern = {
        pattern_id: 'pat_006',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.8,
        metadata: {
          constraint_type: 'time_window',
          evidence: ['exec_015']
        }
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(pattern);
      
      assert.ok(recommendation);
      
      const proposedConstraints = recommendation.proposed_change.constraints;
      assert.ok(proposedConstraints._suggestion);
      assert.ok(proposedConstraints._suggestion.includes('Expand time window'));
    });

    test('does not recommend relaxation for wrong pattern type', async () => {
      const pattern = {
        pattern_id: 'pat_007',
        pattern_type: 'remediation_effectiveness', // Wrong type
        policy_id: 'pol_some_policy',
        confidence: 0.9
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(pattern);
      
      assert.strictEqual(recommendation, null);
    });
  });

  describe('Confidence Scoring', () => {
    test('high confidence enables auto-apply for constraint relaxation', async () => {
      const policyId = 'pol_auto_eligible';
      stateGraph.addPolicy(policyId, {
        constraints: '{"max_executions": 2}',
        priority: 30
      });

      const highConfidencePattern = {
        pattern_id: 'pat_008',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.95, // Above 0.9 threshold
        metadata: {
          constraint_type: 'rate_limit'
        }
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(highConfidencePattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.auto_apply_eligible, true);
      assert.strictEqual(recommendation.confidence, 0.95);
    });

    test('low confidence requires manual approval', async () => {
      const policyId = 'pol_manual_required';
      stateGraph.addPolicy(policyId, {
        constraints: '{"max_executions": 3}',
        priority: 50
      });

      const lowConfidencePattern = {
        pattern_id: 'pat_009',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.7, // Below 0.9 threshold
        metadata: {
          constraint_type: 'rate_limit'
        }
      };

      const recommendation = await policyRecommender.recommendConstraintRelaxation(lowConfidencePattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.auto_apply_eligible, false);
      assert.strictEqual(recommendation.requires_approval, true);
    });

    test('new policy recommendations are never auto-eligible', async () => {
      const pattern = {
        pattern_id: 'pat_010',
        pattern_type: 'remediation_effectiveness',
        action_type: 'critical_operation',
        confidence: 0.99, // Very high confidence
        metadata: {
          success_rate: 0.1 // Low success rate
        }
      };

      const recommendation = await policyRecommender.recommendNewPolicy(pattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.auto_apply_eligible, false);
      assert.strictEqual(recommendation.requires_approval, true);
    });

    test('confidence adjusted for new policy recommendations', async () => {
      const pattern = {
        pattern_id: 'pat_011',
        pattern_type: 'remediation_effectiveness',
        action_type: 'deploy_service',
        confidence: 0.8,
        metadata: {
          success_rate: 0.25
        }
      };

      const recommendation = await policyRecommender.recommendNewPolicy(pattern);
      
      assert.ok(recommendation);
      assert.strictEqual(Math.round(recommendation.confidence * 100) / 100, 0.72); // 0.8 * 0.9 = 0.72
    });

    test('policy removal confidence based on decision volume', async () => {
      const policyId = 'pol_never_denies';
      
      // Add 50 policy decisions, all approvals
      for (let i = 0; i < 50; i++) {
        stateGraph.addPolicyDecision({
          policy_id: policyId,
          decision: 'allow',
          target_id: `target_${i}`,
          reason: 'Policy allowed',
          created_at: new Date(Date.now() - i * 60000).toISOString()
        });
      }

      const recommendation = await policyRecommender.recommendPolicyRemoval(policyId);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.recommendation_type, RecommendationType.POLICY_REMOVAL);
      
      // Confidence should be high due to large sample size
      const expectedConfidence = Math.min(0.7 + (50 / 100) * 0.2, 0.95); // 0.9
      assert.strictEqual(recommendation.confidence, expectedConfidence);
      assert.strictEqual(recommendation.auto_apply_eligible, false); // Policy removal always requires approval
    });

    test('priority adjustment confidence reduced from pattern', async () => {
      const policyId = 'pol_frequently_overridden';
      const basePattern = {
        pattern_id: 'pat_012',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.9,
        metadata: {
          evidence: ['exec_020', 'exec_021', 'exec_022', 'exec_023']
        }
      };

      // Add approvals showing overrides
      for (let i = 0; i < 4; i++) {
        const executionId = `exec_02${i}`;
        stateGraph.addApproval({
          execution_id: executionId,
          status: 'denied',
          created_at: new Date(Date.now() - i * 120000).toISOString() // 2 min intervals
        });
        stateGraph.addApproval({
          execution_id: executionId,
          status: 'approved',
          created_at: new Date(Date.now() - i * 120000 + 60000).toISOString() // 1 min later
        });
      }

      const recommendation = await policyRecommender.recommendPriorityAdjustment(basePattern);
      
      assert.ok(recommendation);
      assert.strictEqual(recommendation.confidence, 0.765); // 0.9 * 0.85 = 0.765
      assert.strictEqual(recommendation.auto_apply_eligible, false);
      assert.strictEqual(recommendation.evidence.override_count, 4);
    });
  });

  describe('Integration Tests', () => {
    test('generates multiple recommendations from single pattern', async () => {
      const policyId = 'pol_multi_issue';
      stateGraph.addPolicy(policyId, {
        constraints: '{"max_executions": 2, "window_ms": 1800000}',
        priority: 70
      });

      // Add evidence of overrides
      const executionIds = ['exec_100', 'exec_101', 'exec_102'];
      for (const execId of executionIds) {
        stateGraph.addApproval({
          execution_id: execId,
          status: 'denied',
          created_at: new Date(Date.now() - 300000).toISOString()
        });
        stateGraph.addApproval({
          execution_id: execId,
          status: 'approved',
          created_at: new Date(Date.now() - 240000).toISOString()
        });
      }

      const pattern = {
        pattern_id: 'pat_020',
        pattern_type: 'policy_conflict',
        policy_id: policyId,
        confidence: 0.85,
        metadata: {
          constraint_type: 'rate_limit',
          evidence: executionIds
        }
      };

      const recommendations = await policyRecommender.generateRecommendations(pattern);
      
      assert.strictEqual(recommendations.length, 2);
      
      const types = recommendations.map(r => r.recommendation_type);
      assert.ok(types.includes(RecommendationType.CONSTRAINT_RELAXATION));
      assert.ok(types.includes(RecommendationType.PRIORITY_ADJUSTMENT));
    });

    test('handles empty evidence gracefully', async () => {
      const pattern = {
        pattern_id: 'pat_021',
        pattern_type: 'policy_conflict',
        policy_id: 'pol_no_evidence',
        confidence: 0.8,
        metadata: {
          constraint_type: 'rate_limit',
          evidence: []
        }
      };

      const priorityRec = await policyRecommender.recommendPriorityAdjustment(pattern);
      assert.strictEqual(priorityRec, null);

      const constraintRec = await policyRecommender.recommendConstraintRelaxation(pattern);
      // With empty evidence, constraint relaxation may return null (no evidence to base relaxation on)
      // This is valid behavior — the function handles empty evidence without crashing
      assert.strictEqual(constraintRec, null);
    });

    test('recommendation IDs are deterministic', async () => {
      const pattern = {
        pattern_id: 'pat_022',
        pattern_type: 'policy_conflict',
        policy_id: 'pol_deterministic',
        confidence: 0.8,
        metadata: { constraint_type: 'rate_limit' }
      };

      stateGraph.addPolicy('pol_deterministic', {
        constraints: '{"max_executions": 1}'
      });

      // Mock timestamp to ensure deterministic ID
      const originalNow = Date.now;
      Date.now = () => 1640995200000; // Fixed timestamp

      const rec1 = await policyRecommender.recommendConstraintRelaxation(pattern);
      const rec2 = await policyRecommender.recommendConstraintRelaxation(pattern);

      Date.now = originalNow; // Restore

      assert.strictEqual(rec1.recommendation_id, rec2.recommendation_id);
      assert.ok(rec1.recommendation_id.startsWith('rec_'));
    });
  });
});