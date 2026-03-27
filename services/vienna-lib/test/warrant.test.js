/**
 * Vienna Warrant System Tests
 * 
 * Comprehensive unit tests for warrant issuance, verification, and enforcement.
 * Uses Node.js built-in test runner and assert module.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const Warrant = require('../governance/warrant');
const RiskTier = require('../governance/risk-tier');

// Mock adapter for testing
class MockAdapter {
  constructor() {
    this.warrants = new Map();
    this.truthSnapshots = new Map();
    this.auditEvents = [];
  }

  async saveWarrant(warrant) {
    this.warrants.set(warrant.warrant_id, { ...warrant });
  }

  async loadWarrant(warrantId) {
    return this.warrants.get(warrantId);
  }

  async listWarrants() {
    return Array.from(this.warrants.values());
  }

  async loadTruthSnapshot(truthSnapshotId) {
    return this.truthSnapshots.get(truthSnapshotId);
  }

  async emitAudit(event) {
    this.auditEvents.push({ ...event, timestamp: new Date().toISOString() });
  }

  // Test helpers
  addTruthSnapshot(id, data = {}) {
    this.truthSnapshots.set(id, {
      truth_snapshot_id: id,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:' + crypto.randomBytes(32).toString('hex'),
      ...data
    });
  }

  reset() {
    this.warrants.clear();
    this.truthSnapshots.clear();
    this.auditEvents = [];
  }
}

describe('Warrant System', () => {
  let warrant;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    warrant = new Warrant(mockAdapter, { signingKey: 'test-key-123' });
  });

  afterEach(() => {
    mockAdapter.reset();
  });

  describe('Warrant Issuance', () => {
    test('T0 warrant issuance (auto-approve)', async () => {
      mockAdapter.addTruthSnapshot('truth_001');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_001',
        planId: 'plan_001',
        objective: 'Read system status',
        riskTier: 'T0',
        allowedActions: ['read_status', 'get_metrics'],
        expiresInMinutes: 60
      });

      assert.ok(result.warrant_id.startsWith('wrt_'));
      assert.strictEqual(result.risk_tier, 'T0');
      assert.strictEqual(result.status, 'issued');
      assert.ok(result.signature.startsWith('hmac-sha256:'));
      assert.strictEqual(result.approval_id, null);
      assert.deepStrictEqual(result.approval_ids, []);
    });

    test('T1 warrant issuance (policy auto-approve)', async () => {
      mockAdapter.addTruthSnapshot('truth_002');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_002',
        planId: 'plan_002',
        objective: 'Send notification email',
        riskTier: 'T1',
        allowedActions: ['send_email'],
        constraints: { max: { recipients: 10 } },
        expiresInMinutes: 30
      });

      assert.strictEqual(result.risk_tier, 'T1');
      assert.ok(result.expires_at);
      assert.ok(result.constraints);
      assert.strictEqual(result.enhanced_audit, false);
      
      // Verify TTL is capped at T1 max (30 minutes)
      const issuedTime = new Date(result.issued_at);
      const expiresTime = new Date(result.expires_at);
      const ttlMinutes = (expiresTime - issuedTime) / (1000 * 60);
      assert.ok(ttlMinutes <= 30);
    });

    test('T2 warrant issuance (single approval required)', async () => {
      mockAdapter.addTruthSnapshot('truth_003');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_003',
        planId: 'plan_003',
        approvalId: 'approval_001',
        objective: 'Deploy to staging',
        riskTier: 'T2',
        allowedActions: ['deploy_code', 'restart_service'],
        forbiddenActions: ['delete_database'],
        expiresInMinutes: 15
      });

      assert.strictEqual(result.risk_tier, 'T2');
      assert.strictEqual(result.approval_id, 'approval_001');
      assert.deepStrictEqual(result.approval_ids, ['approval_001']);
      assert.deepStrictEqual(result.forbidden_actions, ['delete_database']);
      
      // Verify TTL is capped at T2 max (15 minutes)
      const issuedTime = new Date(result.issued_at);
      const expiresTime = new Date(result.expires_at);
      const ttlMinutes = (expiresTime - issuedTime) / (1000 * 60);
      assert.ok(ttlMinutes <= 15);
    });

    test('T3 warrant issuance (multi-party approval required)', async () => {
      mockAdapter.addTruthSnapshot('truth_004', {
        last_verified_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 min ago
      });
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_004',
        planId: 'plan_004',
        approvalIds: ['approval_001', 'approval_002', 'approval_003'],
        objective: 'Delete production data',
        riskTier: 'T3',
        allowedActions: ['delete_production', 'user_data_deletion'],
        justification: 'GDPR compliance - user requested data deletion',
        rollbackPlan: 'Restore from backup_20240326_001 within 30 minutes',
        expiresInMinutes: 5
      });

      assert.strictEqual(result.risk_tier, 'T3');
      assert.deepStrictEqual(result.approval_ids, ['approval_001', 'approval_002', 'approval_003']);
      assert.strictEqual(result.justification, 'GDPR compliance - user requested data deletion');
      assert.strictEqual(result.rollback_plan, 'Restore from backup_20240326_001 within 30 minutes');
      assert.strictEqual(result.enhanced_audit, true);
      
      // Verify TTL is capped at T3 max (5 minutes)
      const issuedTime = new Date(result.issued_at);
      const expiresTime = new Date(result.expires_at);
      const ttlMinutes = (expiresTime - issuedTime) / (1000 * 60);
      assert.ok(ttlMinutes <= 5);
    });

    test('T2 warrant fails without approval', async () => {
      mockAdapter.addTruthSnapshot('truth_005');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_005',
          planId: 'plan_005',
          objective: 'Deploy to production',
          riskTier: 'T2',
          allowedActions: ['deploy_code']
        }),
        { message: 'T2 warrants require at least one approvalId' }
      );
    });

    test('T3 warrant fails with insufficient approvals', async () => {
      mockAdapter.addTruthSnapshot('truth_006');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_006',
          planId: 'plan_006',
          approvalId: 'approval_001',
          objective: 'Wire transfer $50,000',
          riskTier: 'T3',
          allowedActions: ['wire_transfer'],
          justification: 'Payment to vendor',
          rollbackPlan: 'Contact bank to reverse transaction'
        }),
        { message: /T3 warrants require 2\+ approvals/ }
      );
    });

    test('T3 warrant fails without justification', async () => {
      mockAdapter.addTruthSnapshot('truth_007');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_007',
          planId: 'plan_007',
          approvalIds: ['approval_001', 'approval_002'],
          objective: 'Regulatory submission',
          riskTier: 'T3',
          allowedActions: ['regulatory_submission']
        }),
        { message: 'T3 warrants require a justification' }
      );
    });

    test('T3 warrant fails without rollback plan', async () => {
      mockAdapter.addTruthSnapshot('truth_008');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_008',
          planId: 'plan_008',
          approvalIds: ['approval_001', 'approval_002'],
          objective: 'Key rotation',
          riskTier: 'T3',
          allowedActions: ['key_rotation'],
          justification: 'Security incident response'
        }),
        { message: 'T3 warrants require a rollback plan' }
      );
    });
  });

  describe('HMAC-SHA256 Signature Generation and Verification', () => {
    test('signature generation is deterministic', async () => {
      mockAdapter.addTruthSnapshot('truth_100');
      
      const options = {
        truthSnapshotId: 'truth_100',
        planId: 'plan_100',
        objective: 'Test signature',
        riskTier: 'T1',
        allowedActions: ['test_action']
      };

      const result1 = await warrant.issue(options);
      
      // Create a second warrant with identical content
      const warrant2 = new Warrant(mockAdapter, { signingKey: 'test-key-123' });
      
      // Create identical warrant manually to test signature function
      const testWarrant = {
        warrant_id: result1.warrant_id,
        issued_by: result1.issued_by,
        issued_at: result1.issued_at,
        expires_at: result1.expires_at,
        risk_tier: result1.risk_tier,
        truth_snapshot_id: result1.truth_snapshot_id,
        truth_snapshot_hash: result1.truth_snapshot_hash,
        plan_id: result1.plan_id,
        approval_ids: result1.approval_ids,
        objective: result1.objective,
        allowed_actions: result1.allowed_actions,
        forbidden_actions: result1.forbidden_actions,
        constraints: result1.constraints
      };
      
      // Create signature directly to test determinism
      const signature1 = warrant._sign(testWarrant);
      const signature2 = warrant2._sign(testWarrant);
      
      // Should have same signature for same content
      assert.strictEqual(signature1, signature2);
    });

    test('signature changes with different signing key', async () => {
      mockAdapter.addTruthSnapshot('truth_101');
      
      const options = {
        truthSnapshotId: 'truth_101',
        planId: 'plan_101',
        objective: 'Test key difference',
        riskTier: 'T1',
        allowedActions: ['test_action']
      };

      const result1 = await warrant.issue(options);
      
      // Different signing key
      const warrant2 = new Warrant(mockAdapter, { signingKey: 'different-key-456' });
      mockAdapter.addTruthSnapshot('truth_102');
      
      const result2 = await warrant2.issue({
        ...options,
        truthSnapshotId: 'truth_102'
      });

      assert.notStrictEqual(result1.signature, result2.signature);
    });

    test('signature format is correct', async () => {
      mockAdapter.addTruthSnapshot('truth_102');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_102',
        planId: 'plan_102',
        objective: 'Test signature format',
        riskTier: 'T1',
        allowedActions: ['test_action']
      });

      assert.ok(result.signature.startsWith('hmac-sha256:'));
      const hash = result.signature.split(':')[1];
      assert.strictEqual(hash.length, 64); // SHA256 hex length
      assert.match(hash, /^[a-f0-9]+$/); // Valid hex
    });
  });

  describe('Tamper Detection', () => {
    test('detect tampered warrant_id', async () => {
      mockAdapter.addTruthSnapshot('truth_200');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_200',
        planId: 'plan_200',
        objective: 'Test tamper detection',
        riskTier: 'T1',
        allowedActions: ['test_action']
      });

      // Tamper with warrant_id
      const tamperedWarrant = { ...result };
      tamperedWarrant.warrant_id = 'wrt_tampered_12345';
      mockAdapter.warrants.set(result.warrant_id, tamperedWarrant);

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, false);
      assert.strictEqual(verification.reason, 'WARRANT_TAMPERED');
      assert.strictEqual(verification.severity, 'critical');
      
      // Verify audit event was emitted
      const tamperedEvents = mockAdapter.auditEvents.filter(e => 
        e.event_type === 'warrant_tamper_detected'
      );
      assert.strictEqual(tamperedEvents.length, 1);
    });

    test('detect tampered allowed_actions', async () => {
      mockAdapter.addTruthSnapshot('truth_201');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_201',
        planId: 'plan_201',
        objective: 'Test action tampering',
        riskTier: 'T2',
        approvalId: 'approval_201',
        allowedActions: ['read_file']
      });

      // Tamper with allowed actions (escalate to dangerous action)
      const tamperedWarrant = { ...result };
      tamperedWarrant.allowed_actions = ['read_file', 'delete_database'];
      mockAdapter.warrants.set(result.warrant_id, tamperedWarrant);

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, false);
      assert.strictEqual(verification.reason, 'WARRANT_TAMPERED');
    });

    test('detect tampered risk_tier', async () => {
      mockAdapter.addTruthSnapshot('truth_202');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_202',
        planId: 'plan_202',
        approvalIds: ['approval_001', 'approval_002'],
        objective: 'Test tier tampering',
        riskTier: 'T3',
        allowedActions: ['regulatory_submission'],
        justification: 'Required filing',
        rollbackPlan: 'Contact regulator'
      });

      // Tamper with risk tier (downgrade from T3 to T1)
      const tamperedWarrant = { ...result };
      tamperedWarrant.risk_tier = 'T1';
      mockAdapter.warrants.set(result.warrant_id, tamperedWarrant);

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, false);
      assert.strictEqual(verification.reason, 'WARRANT_TAMPERED');
    });

    test('valid warrant passes verification', async () => {
      mockAdapter.addTruthSnapshot('truth_203');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_203',
        planId: 'plan_203',
        objective: 'Test valid warrant',
        riskTier: 'T1',
        allowedActions: ['test_action']
      });

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, true);
      assert.ok(verification.warrant);
      assert.ok(verification.remaining_minutes > 0);
    });
  });

  describe('TTL Enforcement', () => {
    test('expired warrant is rejected', async () => {
      mockAdapter.addTruthSnapshot('truth_300');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_300',
        planId: 'plan_300',
        objective: 'Test expiration',
        riskTier: 'T1',
        allowedActions: ['test_action'],
        expiresInMinutes: 0.01 // 0.6 seconds
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 700));

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, false);
      assert.strictEqual(verification.reason, 'WARRANT_EXPIRED');
      assert.ok(verification.expired_at);
    });

    test('warrant within TTL is valid', async () => {
      mockAdapter.addTruthSnapshot('truth_301');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_301',
        planId: 'plan_301',
        objective: 'Test valid TTL',
        riskTier: 'T1',
        allowedActions: ['test_action'],
        expiresInMinutes: 1
      });

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, true);
      assert.ok(verification.remaining_minutes > 0);
      assert.ok(verification.remaining_minutes <= 1);
    });

    test('invalidated warrant is rejected', async () => {
      mockAdapter.addTruthSnapshot('truth_302');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_302',
        planId: 'plan_302',
        objective: 'Test invalidation',
        riskTier: 'T1',
        allowedActions: ['test_action']
      });

      // Invalidate warrant
      await warrant.invalidate(result.warrant_id, 'Test invalidation');

      const verification = await warrant.verify(result.warrant_id);
      
      assert.strictEqual(verification.valid, false);
      assert.strictEqual(verification.reason, 'WARRANT_INVALIDATED');
      assert.strictEqual(verification.invalidation_reason, 'Test invalidation');
      assert.ok(verification.invalidated_at);
    });
  });

  describe('Scope Verification', () => {
    test('allowed action passes scope check', async () => {
      mockAdapter.addTruthSnapshot('truth_400');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_400',
        planId: 'plan_400',
        objective: 'Test scope verification',
        riskTier: 'T1',
        allowedActions: ['read_file', 'write_file']
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'read_file');
      
      assert.strictEqual(scopeCheck.valid, true);
      assert.strictEqual(scopeCheck.action, 'read_file');
      assert.strictEqual(scopeCheck.warrant_id, result.warrant_id);
    });

    test('forbidden action fails scope check', async () => {
      mockAdapter.addTruthSnapshot('truth_401');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_401',
        planId: 'plan_401',
        objective: 'Test forbidden action',
        riskTier: 'T2',
        approvalId: 'approval_401',
        allowedActions: ['read_file'],
        forbiddenActions: ['delete_file']
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'delete_file');
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'ACTION_FORBIDDEN');
      assert.strictEqual(scopeCheck.action, 'delete_file');
    });

    test('out-of-scope action fails check', async () => {
      mockAdapter.addTruthSnapshot('truth_402');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_402',
        planId: 'plan_402',
        objective: 'Test out-of-scope',
        riskTier: 'T1',
        allowedActions: ['read_file']
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'modify_database');
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'ACTION_NOT_IN_SCOPE');
      assert.deepStrictEqual(scopeCheck.allowed, ['read_file']);
    });

    test('wildcard scope allows any action', async () => {
      mockAdapter.addTruthSnapshot('truth_403');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_403',
        planId: 'plan_403',
        approvalIds: ['approval_001', 'approval_002'],
        objective: 'Test wildcard scope',
        riskTier: 'T3',
        allowedActions: ['*'],
        justification: 'Emergency response',
        rollbackPlan: 'Full system restore'
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'any_action');
      
      assert.strictEqual(scopeCheck.valid, true);
    });
  });

  describe('Constraint Checking', () => {
    test('max constraint violation fails', async () => {
      mockAdapter.addTruthSnapshot('truth_500');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_500',
        planId: 'plan_500',
        objective: 'Test max constraint',
        riskTier: 'T1',
        allowedActions: ['send_email'],
        constraints: {
          recipients: { max: 5 }
        }
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'send_email', {
        recipients: 10
      });
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'CONSTRAINT_VIOLATION');
      assert.strictEqual(scopeCheck.constraint.field, 'recipients');
      assert.strictEqual(scopeCheck.constraint.violation, 'exceeds_max');
      assert.strictEqual(scopeCheck.constraint.max, 5);
      assert.strictEqual(scopeCheck.constraint.actual, 10);
    });

    test('min constraint violation fails', async () => {
      mockAdapter.addTruthSnapshot('truth_501');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_501',
        planId: 'plan_501',
        objective: 'Test min constraint',
        riskTier: 'T1',
        allowedActions: ['transfer_funds'],
        constraints: {
          amount: { min: 100 }
        }
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'transfer_funds', {
        amount: 50
      });
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'CONSTRAINT_VIOLATION');
      assert.strictEqual(scopeCheck.constraint.violation, 'below_min');
    });

    test('allowed values constraint violation fails', async () => {
      mockAdapter.addTruthSnapshot('truth_502');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_502',
        planId: 'plan_502',
        objective: 'Test allowed constraint',
        riskTier: 'T1',
        allowedActions: ['deploy_to_env'],
        constraints: {
          environment: { allowed: ['staging', 'development'] }
        }
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'deploy_to_env', {
        environment: 'production'
      });
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'CONSTRAINT_VIOLATION');
      assert.strictEqual(scopeCheck.constraint.violation, 'not_allowed');
      assert.deepStrictEqual(scopeCheck.constraint.allowed, ['staging', 'development']);
    });

    test('pattern constraint violation fails', async () => {
      mockAdapter.addTruthSnapshot('truth_503');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_503',
        planId: 'plan_503',
        objective: 'Test pattern constraint',
        riskTier: 'T1',
        allowedActions: ['create_user'],
        constraints: {
          email: { pattern: '^[a-zA-Z0-9._%+-]+@company\\.com$' }
        }
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'create_user', {
        email: 'user@external.com'
      });
      
      assert.strictEqual(scopeCheck.valid, false);
      assert.strictEqual(scopeCheck.reason, 'CONSTRAINT_VIOLATION');
      assert.strictEqual(scopeCheck.constraint.violation, 'pattern_mismatch');
    });

    test('valid constraints pass', async () => {
      mockAdapter.addTruthSnapshot('truth_504');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_504',
        planId: 'plan_504',
        objective: 'Test valid constraints',
        riskTier: 'T1',
        allowedActions: ['process_order'],
        constraints: {
          amount: { min: 10, max: 1000 },
          currency: { allowed: ['USD', 'EUR'] },
          reference: { pattern: '^ORD-[0-9]{6}$' }
        }
      });

      const scopeCheck = await warrant.verifyScope(result.warrant_id, 'process_order', {
        amount: 250,
        currency: 'USD',
        reference: 'ORD-123456'
      });
      
      assert.strictEqual(scopeCheck.valid, true);
    });
  });

  describe('T3 Multi-party Approval Requirements', () => {
    test('T3 with exactly 2 approvals succeeds', async () => {
      mockAdapter.addTruthSnapshot('truth_600');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_600',
        planId: 'plan_600',
        approvalIds: ['approval_001', 'approval_002'],
        objective: 'Test 2-party approval',
        riskTier: 'T3',
        allowedActions: ['wire_transfer'],
        justification: 'Vendor payment',
        rollbackPlan: 'Contact bank for reversal'
      });

      assert.strictEqual(result.risk_tier, 'T3');
      assert.deepStrictEqual(result.approval_ids, ['approval_001', 'approval_002']);
    });

    test('T3 with 3+ approvals succeeds', async () => {
      mockAdapter.addTruthSnapshot('truth_601');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_601',
        planId: 'plan_601',
        approvalIds: ['approval_001', 'approval_002', 'approval_003', 'approval_004'],
        objective: 'Test multi-party approval',
        riskTier: 'T3',
        allowedActions: ['delete_production'],
        justification: 'Data retention policy compliance',
        rollbackPlan: 'Restore from backup within 1 hour'
      });

      assert.strictEqual(result.approval_ids.length, 4);
    });

    test('T3 with single approval fails', async () => {
      mockAdapter.addTruthSnapshot('truth_602');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_602',
          planId: 'plan_602',
          approvalId: 'approval_001',
          objective: 'Test insufficient approvals',
          riskTier: 'T3',
          allowedActions: ['financial_transaction'],
          justification: 'Payment processing',
          rollbackPlan: 'Reverse transaction'
        }),
        { message: /T3 warrants require 2\+ approvals/ }
      );
    });
  });

  describe('T3 Justification and Rollback Plan Requirements', () => {
    test('T3 with both justification and rollback plan succeeds', async () => {
      mockAdapter.addTruthSnapshot('truth_700');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_700',
        planId: 'plan_700',
        approvalIds: ['approval_001', 'approval_002'],
        objective: 'Test complete T3 requirements',
        riskTier: 'T3',
        allowedActions: ['compliance_override'],
        justification: 'Emergency security incident - bypassing normal approval workflow to contain breach',
        rollbackPlan: 'Re-enable all compliance checks within 2 hours once incident is contained'
      });

      assert.strictEqual(result.risk_tier, 'T3');
      assert.ok(result.justification.includes('security incident'));
      assert.ok(result.rollback_plan.includes('Re-enable all compliance'));
    });

    test('T3 without justification fails', async () => {
      mockAdapter.addTruthSnapshot('truth_701');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_701',
          planId: 'plan_701',
          approvalIds: ['approval_001', 'approval_002'],
          objective: 'Test missing justification',
          riskTier: 'T3',
          allowedActions: ['key_rotation'],
          rollbackPlan: 'Revert to previous keys'
        }),
        { message: 'T3 warrants require a justification' }
      );
    });

    test('T3 without rollback plan fails', async () => {
      mockAdapter.addTruthSnapshot('truth_702');
      
      await assert.rejects(
        warrant.issue({
          truthSnapshotId: 'truth_702',
          planId: 'plan_702',
          approvalIds: ['approval_001', 'approval_002'],
          objective: 'Test missing rollback plan',
          riskTier: 'T3',
          allowedActions: ['legal_filing'],
          justification: 'Regulatory deadline compliance'
        }),
        { message: 'T3 warrants require a rollback plan' }
      );
    });

    test('T1/T2 warrants do not require justification or rollback plan', async () => {
      mockAdapter.addTruthSnapshot('truth_703');
      
      const result = await warrant.issue({
        truthSnapshotId: 'truth_703',
        planId: 'plan_703',
        approvalId: 'approval_001',
        objective: 'Test T2 without justification',
        riskTier: 'T2',
        allowedActions: ['restart_service']
      });

      assert.strictEqual(result.justification, null);
      assert.strictEqual(result.rollback_plan, null);
    });
  });
});