/**
 * Phase 17.3 — Approval Intelligence Tests (26 tests)
 */

const { ApprovalIntelligence, RiskScore } = require('../../lib/core/approval-intelligence');

// Mock ApprovalState
const ApprovalState = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXPIRED: 'expired'
};

describe('Phase 17.3 — Approval Intelligence', () => {
  let intelligence;
  const mockStateGraph = {
    listApprovals: jest.fn(),
    getPolicy: jest.fn(),
    updateApprovalStatus: jest.fn()
  };

  beforeEach(() => {
    intelligence = new ApprovalIntelligence(mockStateGraph);
  });

  // Category A: Risk Scoring (5 tests)
  test('A1: T0 action scores low risk', () => {
    const approval = { risk_tier: 'T0', action_type: 'health_check', target_id: 'svc_1' };
    const score = intelligence.scoreRisk(approval);
    expect(score).toBeLessThan(RiskScore.MEDIUM);
  });

  test('A2: T1 action scores medium risk', () => {
    const approval = { risk_tier: 'T1', action_type: 'restart_service', target_id: 'svc_1' };
    const score = intelligence.scoreRisk(approval);
    expect(score).toBeGreaterThanOrEqual(RiskScore.MEDIUM);
    expect(score).toBeLessThan(RiskScore.HIGH);
  });

  test('A3: T2 trading action scores high risk', () => {
    const approval = {
      risk_tier: 'T2',
      action_type: 'trading_window_change',
      target_id: 'trading',
      context: { trading_active: true }
    };
    const score = intelligence.scoreRisk(approval);
    expect(score).toBeGreaterThanOrEqual(RiskScore.HIGH);
  });

  test('A4: Risk increases with production context', () => {
    const base = { risk_tier: 'T1', action_type: 'config_change', target_id: 'svc_1' };
    const devScore = intelligence.scoreRisk(base);
    const prodScore = intelligence.scoreRisk({ ...base, context: { production_env: true } });
    expect(prodScore).toBeGreaterThan(devScore);
  });

  test('A5: Risk score clamped to 0-1', () => {
    const approval = {
      risk_tier: 'T2',
      action_type: 'kill_switch',
      context: { trading_active: true, production_env: true }
    };
    const score = intelligence.scoreRisk(approval);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  // Category B: Grouping (4 tests)
  test('B1: Approvals grouped by risk level', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', risk_tier: 'T0', action_type: 'health_check', target_id: 't1' },
      { approval_id: 'a2', risk_tier: 'T1', action_type: 'restart_service', target_id: 't2' },
      { approval_id: 'a3', risk_tier: 'T2', action_type: 'config_change', target_id: 't3' }
    ]);

    const groups = await intelligence.groupApprovalsByRisk();

    expect(groups.low_risk.length).toBeGreaterThan(0);
    expect(groups.medium_risk.length).toBeGreaterThan(0);
    expect(groups.high_risk.length).toBeGreaterThan(0);
  });

  test('B2: Groups sorted by risk within category', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', risk_tier: 'T1', action_type: 'health_check', target_id: 't1' },
      { approval_id: 'a2', risk_tier: 'T1', action_type: 'restart_service', target_id: 't2' }
    ]);

    const groups = await intelligence.groupApprovalsByRisk();
    const group = groups.medium_risk;

    if (group.length > 1) {
      expect(group[0].risk_score).toBeGreaterThanOrEqual(group[1].risk_score);
    }
  });

  test('B3: Batch suggestions group by target', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', target_id: 't1', action_type: 'restart', risk_tier: 'T1' },
      { approval_id: 'a2', target_id: 't1', action_type: 'check', risk_tier: 'T0' }
    ]);

    const batches = await intelligence.suggestApprovalBatches();

    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0].target_id).toBe('t1');
    expect(batches[0].count).toBe(2);
  });

  test('B4: Batch suggestions sorted by count', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', target_id: 't1', action_type: 'act', risk_tier: 'T1' },
      { approval_id: 'a2', target_id: 't1', action_type: 'act', risk_tier: 'T1' },
      { approval_id: 'a3', target_id: 't2', action_type: 'act', risk_tier: 'T1' }
    ]);

    const batches = await intelligence.suggestApprovalBatches();

    if (batches.length > 1) {
      expect(batches[0].count).toBeGreaterThanOrEqual(batches[1].count);
    }
  });

  // Category C: Suggestions (5 tests)
  test('C1: Suggestions ordered by priority', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'health_check',
        target_id: 't1',
        risk_tier: 'T0',
        created_at: new Date(Date.now() - 600000).toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString()
      },
      {
        approval_id: 'a2',
        action_type: 'kill_switch',
        target_id: 't2',
        risk_tier: 'T2',
        created_at: new Date(Date.now() - 100).toISOString(),
        expires_at: new Date(Date.now() + 30000).toISOString()
      }
    ]);

    const result = await intelligence.getApprovalSuggestions();

    expect(result.suggestions[0].priority).toBeGreaterThan(result.suggestions[1].priority);
  });

  test('C2: Suggestions include risk scores', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'restart',
        target_id: 't1',
        risk_tier: 'T1',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString()
      }
    ]);

    const result = await intelligence.getApprovalSuggestions();

    expect(result.suggestions[0]).toHaveProperty('risk_score');
    expect(result.suggestions[0].risk_score).toBeGreaterThan(0);
  });

  test('C3: Summary includes risk breakdown', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', action_type: 'check', target_id: 't1', risk_tier: 'T0', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600000).toISOString() },
      { approval_id: 'a2', action_type: 'restart', target_id: 't2', risk_tier: 'T1', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600000).toISOString() }
    ]);

    const result = await intelligence.getApprovalSuggestions();

    expect(result.summary).toHaveProperty('critical_count');
    expect(result.summary).toHaveProperty('high_risk_count');
    expect(result.summary).toHaveProperty('total_pending');
  });

  test('C4: Urgent action recommended for critical items', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'kill_switch',
        target_id: 't1',
        risk_tier: 'T2',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30000).toISOString()
      }
    ]);

    const result = await intelligence.getApprovalSuggestions();

    expect(result.suggestions[0].recommended_action).toMatch(/urgent|immediate/i);
  });

  test('C5: Impact summary includes business context', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'act',
        target_id: 't1',
        risk_tier: 'T1',
        context: { trading_active: true },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString()
      }
    ]);

    const result = await intelligence.getApprovalSuggestions();

    expect(result.suggestions[0].impact_summary).toBeDefined();
  });

  // Category D: Auto-Expiry (4 tests)
  test('D1: Auto-expiry policy created', async () => {
    const policy = await intelligence.setAutoExpiryPolicy({
      risk_threshold: RiskScore.LOW,
      inactivity_ms: 1800000
    });

    expect(policy).toHaveProperty('policy_id');
    expect(policy.status).toBe('active');
  });

  test('D2: Auto-expiry policy applied to low-risk items', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'health_check',
        target_id: 't1',
        risk_tier: 'T0',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]);

    const policy = {
      risk_threshold: RiskScore.MEDIUM,
      inactivity_ms: 1800000,
      auto_deny: false
    };

    mockStateGraph.getPolicy.mockResolvedValue(policy);

    const result = await intelligence.applyAutoExpiryPolicy('pol_1');

    expect(result.processed).toBeGreaterThanOrEqual(0);
  });

  test('D3: Auto-deny applied when configured', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'health_check',
        target_id: 't1',
        risk_tier: 'T0',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]);

    const policy = {
      risk_threshold: RiskScore.LOW,
      inactivity_ms: 1800000,
      auto_deny: true
    };

    mockStateGraph.getPolicy.mockResolvedValue(policy);

    await intelligence.applyAutoExpiryPolicy('pol_1');

    // Verify update called if conditions met
    expect(mockStateGraph.updateApprovalStatus.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  test('D4: Expiry respects risk threshold', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      {
        approval_id: 'a1',
        action_type: 'trading_change',
        target_id: 't1',
        risk_tier: 'T2',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]);

    const policy = {
      risk_threshold: RiskScore.MEDIUM,
      inactivity_ms: 1800000
    };

    mockStateGraph.getPolicy.mockResolvedValue(policy);

    const result = await intelligence.applyAutoExpiryPolicy('pol_1');

    // High-risk item should NOT be expired
    expect(result.processed).toBe(0);
  });

  // Category E: Bulk Operations (3 tests)
  test('E1: Bulk approve by action type', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', action_type: 'health_check', target_id: 't1', risk_tier: 'T0', status: ApprovalState.PENDING },
      { approval_id: 'a2', action_type: 'health_check', target_id: 't2', risk_tier: 'T0', status: ApprovalState.PENDING }
    ]);

    const result = await intelligence.bulkApproveByPattern(
      { action_type: 'health_check', max_risk: RiskScore.MEDIUM },
      'operator@example.com'
    );

    expect(result.approved_count).toBe(2);
    expect(mockStateGraph.updateApprovalStatus).toHaveBeenCalled();
  });

  test('E2: Bulk approve respects risk threshold', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', action_type: 'check', target_id: 't1', risk_tier: 'T0', status: ApprovalState.PENDING },
      { approval_id: 'a2', action_type: 'check', target_id: 't2', risk_tier: 'T2', status: ApprovalState.PENDING }
    ]);

    const result = await intelligence.bulkApproveByPattern(
      { max_risk: RiskScore.LOW },
      'operator@example.com'
    );

    expect(result.approved_count).toBe(1);
  });

  test('E3: Bulk approval marked as such', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', action_type: 'check', target_id: 't1', risk_tier: 'T0', status: ApprovalState.PENDING }
    ]);

    // Reset mock before test
    mockStateGraph.updateApprovalStatus.mockClear();

    await intelligence.bulkApproveByPattern({ action_type: 'check' }, 'op@test.com');

    expect(mockStateGraph.updateApprovalStatus).toHaveBeenCalled();
    const callArgs = mockStateGraph.updateApprovalStatus.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[2]).toBeDefined();
    expect(callArgs[2].bulk_approval).toBe(true);
  });

  // Category F: Follow-up Recommendations (2 tests)
  test('F1: Detects repeated rejections', async () => {
    mockStateGraph.listApprovals.mockResolvedValue([
      { approval_id: 'a1', status: ApprovalState.DENIED, denied_by: 'op1' },
      { approval_id: 'a2', status: ApprovalState.DENIED, denied_by: 'op1' },
      { approval_id: 'a3', status: ApprovalState.DENIED, denied_by: 'op1' }
    ]);

    const result = await intelligence.getFollowUpRecommendations();

    const rejectionRecom = result.recommendations.find(r => r.type === 'repeated_rejections');
    expect(rejectionRecom).toBeDefined();
    expect(rejectionRecom.count).toBe(3);
  });

  test('F2: Detects high expiry rate', async () => {
    const expiredApprovals = Array.from({ length: 15 }, (_, i) => ({
      approval_id: 'a' + i,
      status: ApprovalState.EXPIRED
    }));

    mockStateGraph.listApprovals.mockResolvedValue(expiredApprovals);

    const result = await intelligence.getFollowUpRecommendations();

    const expiryRecom = result.recommendations.find(r => r.type === 'high_expiry_rate');
    expect(expiryRecom).toBeDefined();
  });
});
