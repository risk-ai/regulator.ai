/**
 * Phase 17.2 — Operator Debugging Context Tests
 * 
 * Test coverage:
 * - "Why blocked?" explanations
 * - "Why denied?" reasoning
 * - "Why retried?" decision traces
 * - Policy explanation surfaces
 * - Execution reasoning traces
 */

const {
  ExplanationType,
  explainBlocked,
  explainDenied,
  explainRetried,
  explainPolicyDecision,
  explainVerificationFailure,
  explainExecution,
  buildExecutionTimeline,
  generateOperatorSummary
} = require('../../lib/core/debugging-context-generator');

const { FailureClass } = require('../../lib/core/verification-templates-extended');

describe('Phase 17.2 — Operator Debugging Context', () => {

  // ========================================
  // Category A: "Why Blocked?" Explanations
  // ========================================

  describe('Category A: Why Blocked Explanations', () => {
    
    test('A1: Lock conflict explanation includes conflicting execution ID', () => {
      const blockEvent = {
        reason: 'lock_conflict',
        target_id: 'service:openclaw-gateway',
        conflicting_execution_id: 'exec_123',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.type).toBe(ExplanationType.BLOCKED);
      expect(explanation.summary).toMatch(/another execution/i);
      expect(explanation.reasons[0].category).toBe('concurrency');
      expect(explanation.reasons[0].technical).toContain('exec_123');
      expect(explanation.remediation_steps.length).toBeGreaterThan(0);
    });

    test('A2: Approval pending explanation includes approval ID', () => {
      const blockEvent = {
        reason: 'approval_pending',
        approval_id: 'appr_456',
        risk_tier: 'T1',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.summary).toMatch(/requires operator approval/i);
      expect(explanation.reasons[0].category).toBe('governance');
      expect(explanation.reasons[0].technical).toContain('T1');
      expect(explanation.remediation_steps.some(s => s.includes('appr_456'))).toBe(true);
    });

    test('A3: Policy denial explanation includes policy details', () => {
      const blockEvent = {
        reason: 'policy_denied',
        policy_name: 'trading_window_restriction',
        policy_id: 'pol_789',
        constraint_type: 'time_window',
        policy_details: 'Trading actions only allowed 9am-4pm EST',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.summary).toMatch(/policy.*blocked/i);
      expect(explanation.reasons[0].category).toBe('policy');
      expect(explanation.reasons.some(r => r.description?.includes('9am-4pm'))).toBe(true);
      expect(explanation.remediation_steps.some(s => s.includes('pol_789') || s.includes('trading_window'))).toBe(true);
    });

    test('A4: Rate limit explanation includes reset time', () => {
      const blockEvent = {
        reason: 'rate_limit',
        rate_limit_window_ms: 60000,
        rate_limit_max: 5,
        rate_limit_current: 5,
        rate_limit_reset_at: new Date(Date.now() + 30000).toISOString(),
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.summary).toMatch(/rate limit/i);
      expect(explanation.reasons[0].category).toBe('rate_limit');
      expect(explanation.reasons[0].technical).toContain('5/5');
      expect(explanation.remediation_steps.some(s => s.match(/wait.*\d+s/i))).toBe(true);
    });

    test('A5: Safe mode explanation includes reason', () => {
      const blockEvent = {
        reason: 'safe_mode',
        safe_mode_reason: 'Emergency stop after production incident',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.summary).toMatch(/safe mode/i);
      expect(explanation.reasons[0].category).toBe('safe_mode');
      expect(explanation.reasons[0].technical).toContain('Emergency stop');
      expect(explanation.remediation_steps.some(s => s.match(/release/i))).toBe(true);
    });

    test('A6: Dependency unavailable explanation includes dependency ID', () => {
      const blockEvent = {
        reason: 'dependency_unavailable',
        dependency_id: 'postgres-main',
        dependency_status: 'degraded',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainBlocked(blockEvent);

      expect(explanation.summary).toMatch(/dependency.*unavailable/i);
      expect(explanation.reasons[0].category).toBe('dependency');
      expect(explanation.reasons[0].technical).toContain('postgres-main');
      expect(explanation.remediation_steps.some(s => s.includes('postgres-main'))).toBe(true);
    });
  });

  // ========================================
  // Category B: "Why Denied?" Explanations
  // ========================================

  describe('Category B: Why Denied Explanations', () => {
    
    test('B1: Operator denial includes reviewer and reason', () => {
      const denyEvent = {
        denied_by: 'max@law.ai',
        denial_reason: 'Action too risky during trading hours',
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainDenied(denyEvent);

      expect(explanation.type).toBe(ExplanationType.DENIED);
      expect(explanation.summary).toMatch(/denied by.*max@law.ai/i);
      expect(explanation.reasons[0].technical).toContain('Action too risky');
    });

    test('B2: Policy denial includes constraint evaluation', () => {
      const denyEvent = {
        policy_id: 'pol_123',
        policy_name: 'production_safety',
        constraint_evaluation: {
          time_window: false,
          service_status: true
        },
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainDenied(denyEvent);

      expect(explanation.summary).toMatch(/policy.*denied/i);
      expect(explanation.reasons[0].category).toBe('policy');
      expect(explanation.reasons[0].technical).toContain('time_window');
    });

    test('B3: Risk assessment denial includes score and threshold', () => {
      const denyEvent = {
        risk_assessment: {
          score: 0.85,
          threshold: 0.7,
          summary: 'Risk score exceeded safety threshold'
        },
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainDenied(denyEvent);

      expect(explanation.summary).toMatch(/risk.*threshold/i);
      expect(explanation.reasons[0].category).toBe('risk');
      expect(explanation.reasons[0].technical).toContain('0.85');
      expect(explanation.reasons[0].technical).toContain('0.7');
    });

    test('B4: Precondition failure includes failed checks', () => {
      const denyEvent = {
        precondition_failures: [
          {
            check_id: 'service_active',
            description: 'Service must be running',
            reason: 'Service is in failed state'
          },
          {
            check_id: 'disk_space',
            description: 'Sufficient disk space required',
            reason: 'Disk usage at 95%'
          }
        ],
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainDenied(denyEvent);

      expect(explanation.reasons.length).toBe(2);
      expect(explanation.reasons[0].category).toBe('precondition');
      expect(explanation.reasons[0].description).toMatch(/service must be running/i);
      expect(explanation.reasons[1].description).toMatch(/disk space/i);
    });

    test('B5: Can retry flag preserved in explanation', () => {
      const denyEvent = {
        denied_by: 'operator',
        denial_reason: 'Timing issue',
        can_retry: true,
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainDenied(denyEvent);

      expect(explanation.can_retry).toBe(true);
    });
  });

  // ========================================
  // Category C: "Why Retried?" Explanations
  // ========================================

  describe('Category C: Why Retried Explanations', () => {
    
    test('C1: Transient failure retry explanation', () => {
      const retryHistory = [
        {
          attempt: 1,
          timestamp: '2026-03-21T19:00:00Z',
          failure_class: FailureClass.TRANSIENT,
          checks_failed: ['http_reachable']
        },
        {
          action: 'retry_scheduled',
          backoff_ms: 2000,
          timestamp: '2026-03-21T19:00:02Z'
        },
        {
          attempt: 2,
          timestamp: '2026-03-21T19:00:04Z',
          failure_class: FailureClass.TRANSIENT,
          checks_failed: ['http_reachable']
        }
      ];

      const explanation = explainRetried(retryHistory);

      expect(explanation.type).toBe(ExplanationType.RETRIED);
      expect(explanation.total_attempts).toBe(2);
      expect(explanation.reasons.length).toBe(2);
      expect(explanation.reasons[0].category).toBe(FailureClass.TRANSIENT);
      expect(explanation.reasons[0].operator_action).toMatch(/automatic retry/i);
    });

    test('C2: Permanent failure stops retries', () => {
      const retryHistory = [
        {
          attempt: 1,
          timestamp: '2026-03-21T19:00:00Z',
          failure_class: FailureClass.PERMANENT,
          checks_failed: ['service_active']
        }
      ];

      const explanation = explainRetried(retryHistory);

      expect(explanation.reasons[0].category).toBe(FailureClass.PERMANENT);
      expect(explanation.reasons[0].operator_action).toMatch(/manual intervention/i);
    });

    test('C3: Backoff delays tracked', () => {
      const retryHistory = [
        { attempt: 1, failure_class: FailureClass.TRANSIENT, timestamp: '2026-03-21T19:00:00Z' },
        { action: 'retry_scheduled', backoff_ms: 2000, timestamp: '2026-03-21T19:00:00Z' },
        { attempt: 2, failure_class: FailureClass.TRANSIENT, timestamp: '2026-03-21T19:00:02Z' },
        { action: 'retry_scheduled', backoff_ms: 5000, timestamp: '2026-03-21T19:00:02Z' }
      ];

      const explanation = explainRetried(retryHistory);

      expect(explanation.total_backoff_ms).toBe(7000);
      expect(explanation.reasons[0].backoff_ms).toBe(2000);
      expect(explanation.reasons[1].backoff_ms).toBe(5000);
    });

    test('C4: Configuration failure explanation', () => {
      const retryHistory = [
        {
          attempt: 1,
          timestamp: '2026-03-21T19:00:00Z',
          failure_class: FailureClass.CONFIGURATION,
          checks_failed: ['http_auth_valid']
        }
      ];

      const explanation = explainRetried(retryHistory);

      expect(explanation.reasons[0].category).toBe(FailureClass.CONFIGURATION);
      expect(explanation.reasons[0].description).toMatch(/configuration error/i);
    });
  });

  // ========================================
  // Category D: Policy Explanation
  // ========================================

  describe('Category D: Policy Explanation', () => {
    
    test('D1: Policy allow explanation', () => {
      const policyDecision = {
        policy_name: 'standard_operations',
        decision: 'allow',
        constraints_evaluated: [
          {
            constraint_type: 'time_window',
            result: true,
            description: 'Action within allowed time window'
          },
          {
            constraint_type: 'service_status',
            result: true,
            description: 'All required services healthy'
          }
        ],
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainPolicyDecision(policyDecision);

      expect(explanation.type).toBe(ExplanationType.POLICY_APPLIED);
      expect(explanation.summary).toMatch(/allowed/i);
      expect(explanation.decision).toBe('allow');
      expect(explanation.constraints.length).toBe(2);
      expect(explanation.constraints.every(c => c.result === true)).toBe(true);
    });

    test('D2: Policy deny explanation with failed constraints', () => {
      const policyDecision = {
        policy_name: 'production_safety',
        decision: 'deny',
        constraints_evaluated: [
          {
            constraint_type: 'time_window',
            result: false,
            description: 'Outside maintenance window',
            parameters: { allowed_hours: '2-4am' }
          }
        ],
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainPolicyDecision(policyDecision);

      expect(explanation.summary).toMatch(/denied/i);
      expect(explanation.decision).toBe('deny');
      expect(explanation.constraints[0].result).toBe(false);
      expect(explanation.constraints[0].operator_action).toMatch(/review constraint/i);
    });

    test('D3: Multiple constraints evaluation', () => {
      const policyDecision = {
        policy_name: 'multi_check_policy',
        decision: 'deny',
        constraints_evaluated: [
          { constraint_type: 'rate_limit', result: true },
          { constraint_type: 'cooldown', result: true },
          { constraint_type: 'approval_required', result: false }
        ],
        timestamp: '2026-03-21T19:00:00Z'
      };

      const explanation = explainPolicyDecision(policyDecision);

      expect(explanation.constraints.length).toBe(3);
      expect(explanation.constraints.filter(c => c.result === true).length).toBe(2);
      expect(explanation.constraints.filter(c => c.result === false).length).toBe(1);
    });
  });

  // ========================================
  // Category E: Verification Failure Explanation
  // ========================================

  describe('Category E: Verification Failure Explanation', () => {
    
    test('E1: Transient verification failure is retryable', () => {
      const verificationResult = {
        objective_achieved: false,
        checks_failed: ['http_reachable'],
        check_results: {
          http_reachable: {
            description: 'HTTP endpoint reachable',
            error: 'Connection timeout',
            status_code: null
          }
        },
        verification_metadata: {
          failure_class: FailureClass.TRANSIENT,
          final_failure_reason: 'Temporary failure (may succeed on retry). Failed checks: HTTP endpoint reachable'
        }
      };

      const explanation = explainVerificationFailure(verificationResult);

      expect(explanation.type).toBe(ExplanationType.VERIFICATION_FAILED);
      expect(explanation.failure_class).toBe(FailureClass.TRANSIENT);
      expect(explanation.can_retry).toBe(true);
      expect(explanation.operator_action).toMatch(/automatic retry/i);
    });

    test('E2: Permanent verification failure requires intervention', () => {
      const verificationResult = {
        objective_achieved: false,
        checks_failed: ['service_active'],
        verification_metadata: {
          failure_class: FailureClass.PERMANENT,
          final_failure_reason: 'Permanent failure (requires manual intervention). Failed checks: Service is in failed state'
        }
      };

      const explanation = explainVerificationFailure(verificationResult);

      expect(explanation.failure_class).toBe(FailureClass.PERMANENT);
      expect(explanation.can_retry).toBe(false);
      expect(explanation.operator_action).toMatch(/manual intervention/i);
    });

    test('E3: Multiple check failures listed', () => {
      const verificationResult = {
        objective_achieved: false,
        checks_failed: ['port_listening', 'http_reachable', 'health_response_valid'],
        check_results: {
          port_listening: { error: 'Port closed' },
          http_reachable: { error: 'Connection refused' },
          health_response_valid: { error: 'Invalid response' }
        },
        verification_metadata: {
          failure_class: FailureClass.TRANSIENT
        }
      };

      const explanation = explainVerificationFailure(verificationResult);

      expect(explanation.checks_failed.length).toBe(3);
      expect(explanation.checks_failed.map(c => c.check_id)).toContain('port_listening');
      expect(explanation.checks_failed.map(c => c.check_id)).toContain('http_reachable');
    });
  });

  // ========================================
  // Category F: Comprehensive Execution Explanation
  // ========================================

  describe('Category F: Comprehensive Execution Explanation', () => {
    
    test('F1: Execution with multiple events explained', () => {
      const execution = {
        execution_id: 'exec_001',
        status: 'denied',
        blocked_events: [
          {
            reason: 'rate_limit',
            rate_limit_max: 5,
            timestamp: '2026-03-21T19:00:00Z'
          }
        ],
        denied_events: [
          {
            denied_by: 'operator',
            denial_reason: 'Too risky',
            timestamp: '2026-03-21T19:01:00Z'
          }
        ]
      };

      const explanation = explainExecution(execution);

      expect(explanation.execution_id).toBe('exec_001');
      expect(explanation.explanations.length).toBe(2);
      expect(explanation.explanations.some(e => e.type === ExplanationType.BLOCKED)).toBe(true);
      expect(explanation.explanations.some(e => e.type === ExplanationType.DENIED)).toBe(true);
    });

    test('F2: Execution timeline sorted chronologically', () => {
      const execution = {
        execution_id: 'exec_002',
        status: 'completed',
        intent_received_at: '2026-03-21T19:00:00Z',
        plan_created_at: '2026-03-21T19:00:01Z',
        policy_evaluated_at: '2026-03-21T19:00:02Z',
        execution_started_at: '2026-03-21T19:00:03Z',
        execution_completed_at: '2026-03-21T19:00:10Z',
        verification_completed_at: '2026-03-21T19:00:15Z',
        policy_decision: 'allow',
        objective_achieved: true
      };

      const timeline = buildExecutionTimeline(execution);

      expect(timeline.length).toBe(6);
      expect(timeline[0].stage).toBe('intent');
      expect(timeline[timeline.length - 1].stage).toBe('verification');
      
      // Verify chronological order
      for (let i = 1; i < timeline.length; i++) {
        expect(new Date(timeline[i].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(timeline[i-1].timestamp).getTime());
      }
    });

    test('F3: Operator summary prioritizes denials', () => {
      const explanations = [
        { type: ExplanationType.POLICY_APPLIED, summary: 'Policy allowed' },
        { type: ExplanationType.DENIED, summary: 'Operator denied due to risk' },
        { type: ExplanationType.BLOCKED, summary: 'Lock conflict' }
      ];

      const summary = generateOperatorSummary(explanations);

      expect(summary).toMatch(/denied/i);
      expect(summary).toContain('Operator denied due to risk');
    });

    test('F4: Operator summary for retry indicates attempt count', () => {
      const explanations = [
        {
          type: ExplanationType.RETRIED,
          summary: 'Retried 3 times',
          total_attempts: 3,
          reasons: [
            { category: FailureClass.TRANSIENT },
            { category: FailureClass.TRANSIENT },
            { category: FailureClass.PERMANENT }
          ]
        }
      ];

      const summary = generateOperatorSummary(explanations);

      expect(summary).toMatch(/retried.*3/i);
      expect(summary).toMatch(/permanent/i);
    });

    test('F5: Empty explanations return success summary', () => {
      const summary = generateOperatorSummary([]);

      expect(summary).toMatch(/completed without issues/i);
    });
  });
});
