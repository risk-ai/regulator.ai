/**
 * Phase 17 Stage 1 Tests
 * Core Approval Infrastructure
 * 
 * Tests: Schema, State Machine, Manager, State Graph Integration
 */

// Set test environment FIRST
process.env.VIENNA_ENV = 'test';
process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');

const {
  ApprovalStatus,
  ApprovalTier,
  createApprovalRequest,
  validateApprovalRequest,
  isExpired,
  isTerminalState,
  isApprovalGranted,
  isApprovalBlocked,
  requiresOperatorAction
} = require('../../lib/core/approval-schema');

const {
  validateTransition,
  executeTransition,
  validatePreTransition,
  isTerminal,
  getAllowedNextStates,
  TransitionReason,
  StateValidators
} = require('../../lib/core/approval-state-machine');

const ApprovalManager = require('../../lib/core/approval-manager');
const { getStateGraph, _resetStateGraphForTesting } = require('../../lib/state/state-graph');

describe('Phase 17 Stage 1: Approval Infrastructure', function() {
  let stateGraph;
  let approvalManager;

  beforeEach(async function() {
    // Reset and initialize State Graph for each test
    _resetStateGraphForTesting();
    stateGraph = getStateGraph({ environment: 'test' });
    await stateGraph.initialize();
    
    approvalManager = new ApprovalManager(stateGraph);
  });

  afterEach(function() {
    if (stateGraph) {
      stateGraph.close();
    }
    // Clean up test database
    const fs = require('fs');
    const testDbPath = require('path').join(
      process.env.HOME,
      '.openclaw',
      'runtime',
      'test',
      'state',
      'state-graph.db'
    );
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // ========================================
  // Category A: Schema Validation (6 tests)
  // ========================================

  describe('Category A: Schema Validation', function() {
    it('A1: createApprovalRequest should create valid approval object', function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: 3600,
        action_summary: 'Restart openclaw-gateway',
        risk_summary: 'Service restart requires approval',
        target_entities: ['service:openclaw-gateway'],
        estimated_duration_ms: 5000,
        rollback_available: true
      });

      expect(approval).toHaveProperty('approval_id');
      expect(approval.status).toBe(ApprovalStatus.PENDING);
      expect(approval.required_tier).toBe(ApprovalTier.T1);
      expect(approval.target_entities).toEqual(['service:openclaw-gateway']);
      expect(approval.rollback_available).toBe(true);
    });

    it('A2: validateApprovalRequest should accept valid approval', function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T2,
        required_by: 'elevated',
        requested_by: 'plan-executor',
        action_summary: 'Modify trading config',
        risk_summary: 'Trading configuration requires elevated approval',
        target_entities: ['config:trading'],
        estimated_duration_ms: 1000,
        rollback_available: false
      });

      expect(() => validateApprovalRequest(approval)).not.toThrow();
    });

    it('A3: validateApprovalRequest should reject invalid status', function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      approval.status = 'invalid_status';

      expect(() => validateApprovalRequest(approval)).toThrow('APPROVAL_INVALID_STATUS');
    });

    it('A4: isExpired should detect expired approval', function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: -10,  // Already expired
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      expect(isExpired(approval)).toBe(true);
    });

    it('A5: isTerminalState should correctly identify terminal states', function() {
      expect(isTerminalState(ApprovalStatus.NOT_REQUIRED)).toBe(true);
      expect(isTerminalState(ApprovalStatus.APPROVED)).toBe(true);
      expect(isTerminalState(ApprovalStatus.DENIED)).toBe(true);
      expect(isTerminalState(ApprovalStatus.EXPIRED)).toBe(true);
      expect(isTerminalState(ApprovalStatus.PENDING)).toBe(false);
    });

    it('A6: State validators should work correctly', function() {
      expect(isApprovalGranted(ApprovalStatus.APPROVED)).toBe(true);
      expect(isApprovalGranted(ApprovalStatus.NOT_REQUIRED)).toBe(true);
      expect(isApprovalBlocked(ApprovalStatus.DENIED)).toBe(true);
      expect(isApprovalBlocked(ApprovalStatus.EXPIRED)).toBe(true);
      expect(requiresOperatorAction(ApprovalStatus.PENDING)).toBe(true);
    });
  });

  // ========================================
  // Category B: State Machine (8 tests)
  // ========================================

  describe('Category B: State Machine', function() {
    it('B1: validateTransition should allow PENDING → APPROVED', function() {
      expect(() => validateTransition(ApprovalStatus.PENDING, ApprovalStatus.APPROVED)).not.toThrow();
    });

    it('B2: validateTransition should allow PENDING → DENIED', function() {
      expect(() => validateTransition(ApprovalStatus.PENDING, ApprovalStatus.DENIED)).not.toThrow();
    });

    it('B3: validateTransition should allow PENDING → EXPIRED', function() {
      expect(() => validateTransition(ApprovalStatus.PENDING, ApprovalStatus.EXPIRED)).not.toThrow();
    });

    it('B4: validateTransition should reject APPROVED → PENDING', function() {
      expect(() => validateTransition(ApprovalStatus.APPROVED, ApprovalStatus.PENDING))
        .toThrow('APPROVAL_INVALID_TRANSITION');
    });

    it('B5: validateTransition should reject DENIED → APPROVED', function() {
      expect(() => validateTransition(ApprovalStatus.DENIED, ApprovalStatus.APPROVED))
        .toThrow('APPROVAL_INVALID_TRANSITION');
    });

    it('B6: isTerminal should correctly identify terminal states', function() {
      expect(isTerminal(ApprovalStatus.PENDING)).toBe(false);
      expect(isTerminal(ApprovalStatus.APPROVED)).toBe(true);
      expect(isTerminal(ApprovalStatus.DENIED)).toBe(true);
      expect(isTerminal(ApprovalStatus.EXPIRED)).toBe(true);
    });

    it('B7: getAllowedNextStates should return correct transitions', function() {
      const pendingTransitions = getAllowedNextStates(ApprovalStatus.PENDING);
      expect(pendingTransitions).toEqual([
        ApprovalStatus.APPROVED,
        ApprovalStatus.DENIED,
        ApprovalStatus.EXPIRED
      ]);

      const approvedTransitions = getAllowedNextStates(ApprovalStatus.APPROVED);
      expect(approvedTransitions).toEqual([]);
    });

    it('B8: executeTransition should update approval with transition data', function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const updated = executeTransition(approval, ApprovalStatus.APPROVED, {
        reason: TransitionReason.OPERATOR_APPROVED,
        reviewed_by: 'operator-001',
        decision_reason: 'Approved for testing'
      });

      expect(updated.status).toBe(ApprovalStatus.APPROVED);
      expect(updated.reviewed_by).toBe('operator-001');
      expect(updated.reviewed_at).toBeDefined();
      expect(updated.decision_reason).toBe('Approved for testing');
    });
  });

  // ========================================
  // Category C: Approval Manager (10 tests)
  // ========================================

  describe('Category C: Approval Manager', function() {
    it('C1: createApprovalRequest should persist to State Graph', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_123',
        plan_id: 'plan_456',
        step_id: 'step_789',
        intent_id: 'intent_abc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test action',
        risk_summary: 'Test risk',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      expect(approval).toHaveProperty('approval_id');

      // Verify persisted
      const retrieved = await approvalManager.getApproval(approval.approval_id);
      expect(retrieved).toEqual(approval);
    });

    it('C2: getApprovalByContext should retrieve by execution and step', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_456',
        plan_id: 'plan_789',
        step_id: 'step_abc',
        intent_id: 'intent_def',
        required_tier: ApprovalTier.T2,
        required_by: 'elevated',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const retrieved = await approvalManager.getApprovalByContext('exec_456', 'step_abc');
      expect(retrieved.approval_id).toBe(approval.approval_id);
    });

    it('C3: approve should transition PENDING → APPROVED', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_111',
        plan_id: 'plan_222',
        step_id: 'step_333',
        intent_id: 'intent_444',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const updated = await approvalManager.approve(approval.approval_id, 'operator-001', 'Looks good');

      expect(updated.status).toBe(ApprovalStatus.APPROVED);
      expect(updated.reviewed_by).toBe('operator-001');
      expect(updated.decision_reason).toBe('Looks good');
    });

    it('C4: deny should transition PENDING → DENIED', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_555',
        plan_id: 'plan_666',
        step_id: 'step_777',
        intent_id: 'intent_888',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const updated = await approvalManager.deny(approval.approval_id, 'operator-002', 'Too risky');

      expect(updated.status).toBe(ApprovalStatus.DENIED);
      expect(updated.reviewed_by).toBe('operator-002');
      expect(updated.decision_reason).toBe('Too risky');
    });

    it('C5: expire should transition PENDING → EXPIRED', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_999',
        plan_id: 'plan_aaa',
        step_id: 'step_bbb',
        intent_id: 'intent_ccc',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: -10,  // Already expired
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const updated = await approvalManager.expire(approval.approval_id);

      expect(updated.status).toBe(ApprovalStatus.EXPIRED);
    });

    it('C6: approve should reject expired approval', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_exp1',
        plan_id: 'plan_exp1',
        step_id: 'step_exp1',
        intent_id: 'intent_exp1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: -10,  // Already expired
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      await expect(async () => {
        await approvalManager.approve(approval.approval_id, 'operator-001');
      }).rejects.toThrow('APPROVAL_TRANSITION_INVALID');
    });

    it('C7: approve should reject APPROVED approval', async function() {
      const approval = await approvalManager.createApprovalRequest({
        execution_id: 'exec_app1',
        plan_id: 'plan_app1',
        step_id: 'step_app1',
        intent_id: 'intent_app1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      await approvalManager.approve(approval.approval_id, 'operator-001');

      await expect(async () => {
        await approvalManager.approve(approval.approval_id, 'operator-002');
      }).rejects.toThrow('APPROVAL_TRANSITION_INVALID');
    });

    it('C8: listPendingApprovals should return only pending', async function() {
      // Create mix of approvals
      const pending1 = await approvalManager.createApprovalRequest({
        execution_id: 'exec_p1',
        plan_id: 'plan_p1',
        step_id: 'step_p1',
        intent_id: 'intent_p1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test 1',
        risk_summary: 'Test 1',
        target_entities: ['service:test1'],
        estimated_duration_ms: 1000
      });

      const approved = await approvalManager.createApprovalRequest({
        execution_id: 'exec_p2',
        plan_id: 'plan_p2',
        step_id: 'step_p2',
        intent_id: 'intent_p2',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test 2',
        risk_summary: 'Test 2',
        target_entities: ['service:test2'],
        estimated_duration_ms: 1000
      });
      await approvalManager.approve(approved.approval_id, 'operator-001');

      const pending = await approvalManager.listPendingApprovals();

      expect(pending).toHaveLength(1);
      expect(pending[0].approval_id).toBe(pending1.approval_id);
    });

    it('C9: getEffectiveStatus should detect expiry at read-time', function() {
      const expiredApproval = createApprovalRequest({
        execution_id: 'exec_eff1',
        plan_id: 'plan_eff1',
        step_id: 'step_eff1',
        intent_id: 'intent_eff1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: -10,  // Already expired
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const effectiveStatus = approvalManager.getEffectiveStatus(expiredApproval);
      expect(effectiveStatus).toBe(ApprovalStatus.EXPIRED);
    });

    it('C10: sweepExpired should mark expired approvals', async function() {
      // Create expired approval
      await approvalManager.createApprovalRequest({
        execution_id: 'exec_sweep1',
        plan_id: 'plan_sweep1',
        step_id: 'step_sweep1',
        intent_id: 'intent_sweep1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        ttl_seconds: -10,
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const expiredCount = await approvalManager.sweepExpired();
      expect(expiredCount).toBe(1);

      const pending = await approvalManager.listPendingApprovals();
      expect(pending).toHaveLength(0);
    });
  });

  // ========================================
  // Category D: State Graph Integration (6 tests)
  // ========================================

  describe('Category D: State Graph Integration', function() {
    it('D1: State Graph should persist approval correctly', async function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_sg1',
        plan_id: 'plan_sg1',
        step_id: 'step_sg1',
        intent_id: 'intent_sg1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      stateGraph.createApproval(approval);

      const retrieved = stateGraph.getApproval(approval.approval_id);
      expect(retrieved).toEqual(approval);
    });

    it('D2: State Graph should update approval status', async function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_sg2',
        plan_id: 'plan_sg2',
        step_id: 'step_sg2',
        intent_id: 'intent_sg2',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      stateGraph.createApproval(approval);

      const updated = stateGraph.updateApproval(approval.approval_id, {
        status: ApprovalStatus.APPROVED,
        reviewed_by: 'operator-001',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      expect(updated.status).toBe(ApprovalStatus.APPROVED);
      expect(updated.reviewed_by).toBe('operator-001');
    });

    it('D3: State Graph should list approvals by status', async function() {
      const approval1 = createApprovalRequest({
        execution_id: 'exec_list1',
        plan_id: 'plan_list1',
        step_id: 'step_list1',
        intent_id: 'intent_list1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test 1',
        risk_summary: 'Test 1',
        target_entities: ['service:test1'],
        estimated_duration_ms: 1000
      });

      const approval2 = createApprovalRequest({
        execution_id: 'exec_list2',
        plan_id: 'plan_list2',
        step_id: 'step_list2',
        intent_id: 'intent_list2',
        required_tier: ApprovalTier.T2,
        required_by: 'elevated',
        requested_by: 'plan-executor',
        action_summary: 'Test 2',
        risk_summary: 'Test 2',
        target_entities: ['service:test2'],
        estimated_duration_ms: 2000
      });

      stateGraph.createApproval(approval1);
      stateGraph.createApproval(approval2);

      const pending = stateGraph.listApprovals({ status: ApprovalStatus.PENDING });
      expect(pending).toHaveLength(2);
    });

    it('D4: State Graph should filter by tier', async function() {
      const t1Approval = createApprovalRequest({
        execution_id: 'exec_tier1',
        plan_id: 'plan_tier1',
        step_id: 'step_tier1',
        intent_id: 'intent_tier1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'T1 Test',
        risk_summary: 'T1 Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const t2Approval = createApprovalRequest({
        execution_id: 'exec_tier2',
        plan_id: 'plan_tier2',
        step_id: 'step_tier2',
        intent_id: 'intent_tier2',
        required_tier: ApprovalTier.T2,
        required_by: 'elevated',
        requested_by: 'plan-executor',
        action_summary: 'T2 Test',
        risk_summary: 'T2 Test',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      stateGraph.createApproval(t1Approval);
      stateGraph.createApproval(t2Approval);

      const t2Only = stateGraph.listApprovals({ required_tier: ApprovalTier.T2 });
      expect(t2Only).toHaveLength(1);
      expect(t2Only[0].required_tier).toBe(ApprovalTier.T2);
    });

    it('D5: State Graph should count approvals by status', async function() {
      const approval1 = createApprovalRequest({
        execution_id: 'exec_count1',
        plan_id: 'plan_count1',
        step_id: 'step_count1',
        intent_id: 'intent_count1',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test 1',
        risk_summary: 'Test 1',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      const approval2 = createApprovalRequest({
        execution_id: 'exec_count2',
        plan_id: 'plan_count2',
        step_id: 'step_count2',
        intent_id: 'intent_count2',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test 2',
        risk_summary: 'Test 2',
        target_entities: ['service:test'],
        estimated_duration_ms: 1000
      });

      stateGraph.createApproval(approval1);
      stateGraph.createApproval(approval2);

      const count = stateGraph.countApprovalsByStatus(ApprovalStatus.PENDING);
      expect(count).toBe(2);
    });

    it('D6: State Graph should preserve target_entities as array', async function() {
      const approval = createApprovalRequest({
        execution_id: 'exec_targets',
        plan_id: 'plan_targets',
        step_id: 'step_targets',
        intent_id: 'intent_targets',
        required_tier: ApprovalTier.T1,
        required_by: 'operator',
        requested_by: 'plan-executor',
        action_summary: 'Test',
        risk_summary: 'Test',
        target_entities: ['service:gateway', 'endpoint:openclaw', 'provider:anthropic'],
        estimated_duration_ms: 1000
      });

      stateGraph.createApproval(approval);

      const retrieved = stateGraph.getApproval(approval.approval_id);
      expect(Array.isArray(retrieved.target_entities)).toBe(true);
      expect(retrieved.target_entities).toEqual([
        'service:gateway',
        'endpoint:openclaw',
        'provider:anthropic'
      ]);
    });
  });
});
