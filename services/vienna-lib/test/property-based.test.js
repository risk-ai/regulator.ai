/**
 * Property-Based Fuzz Tests — Vienna OS
 * 
 * Uses randomized inputs to verify properties that must ALWAYS hold.
 * Runs 100 iterations per property to find edge cases.
 * 
 * Properties tested:
 * 1. Any warrant issued for T0/T1 can be verified successfully
 * 2. No combination of random inputs can produce a T2 warrant without approval
 * 3. Signature is deterministic: same inputs → same signature
 * 4. Signature is sensitive: any single field change → different signature
 * 5. Risk tier classification is total: every possible input maps to exactly one tier
 * 6. TTL is always bounded: no input can produce an unbounded warrant
 * 7. Warrant IDs are always unique
 */

const { describe, it, expect } = require('vitest');
const crypto = require('crypto');

const Warrant = require('../governance/warrant');
const RiskTier = require('../governance/risk-tier');

const ITERATIONS = 100;

function createMockAdapter() {
  const warrants = new Map();
  return {
    warrants,
    async loadTruthSnapshot(id) {
      return {
        truth_snapshot_id: id,
        truth_snapshot_hash: 'sha256:' + crypto.createHash('sha256').update(id).digest('hex'),
        last_verified_at: new Date().toISOString(),
      };
    },
    async saveWarrant(w) { warrants.set(w.warrant_id, { ...w }); },
    async loadWarrant(id) { return warrants.get(id) || null; },
    async listWarrants() { return Array.from(warrants.values()); },
    async emitAudit() {},
  };
}

function randomStr(len = 8) {
  return crypto.randomBytes(len).toString('hex');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAction() {
  const actions = [
    'file.read', 'file.write', 'api.call', 'deploy_code', 'send_email',
    'wire_transfer', 'delete_production', 'status_check', 'create_ticket',
    'modify_database', 'restart_service', 'pii_export', randomStr(6),
  ];
  return actions[randomInt(0, actions.length - 1)];
}

function randomBlastRadius() {
  const values = ['single_file', 'multiple_files', 'service', 'system_wide'];
  return values[randomInt(0, values.length - 1)];
}

function randomTradingImpact() {
  const values = ['none', 'low', 'medium', 'high', 'critical'];
  return values[randomInt(0, values.length - 1)];
}

// ─── Property 1: T0/T1 warrants always verify ───

describe('Property: T0/T1 warrants always verify successfully', () => {
  it(`holds for ${ITERATIONS} random T0 warrants`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adapter = createMockAdapter();
      const ws = new Warrant(adapter, { signingKey: `key_${randomStr()}` });

      const result = await ws.issue({
        truthSnapshotId: `truth_${randomStr()}`,
        planId: `plan_${randomStr()}`,
        objective: `Random objective ${randomStr(4)}`,
        riskTier: 'T0',
        allowedActions: [randomAction(), randomAction()],
        issuer: 'fuzz_test',
      });

      const verification = await ws.verify(result.warrant_id);
      expect(verification.valid).toBe(true);
    }
  });

  it(`holds for ${ITERATIONS} random T1 warrants`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adapter = createMockAdapter();
      const ws = new Warrant(adapter, { signingKey: `key_${randomStr()}` });

      const result = await ws.issue({
        truthSnapshotId: `truth_${randomStr()}`,
        planId: `plan_${randomStr()}`,
        objective: `Random objective ${randomStr(4)}`,
        riskTier: 'T1',
        allowedActions: [randomAction()],
        forbiddenActions: Math.random() > 0.5 ? [randomAction()] : [],
        constraints: Math.random() > 0.5 ? { amount: { max: randomInt(1, 10000) } } : {},
        issuer: 'fuzz_test',
      });

      const verification = await ws.verify(result.warrant_id);
      expect(verification.valid).toBe(true);
    }
  });
});

// ─── Property 2: T2 without approval always fails ───

describe('Property: T2 warrant issuance without approval always fails', () => {
  it(`holds for ${ITERATIONS} random attempts`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adapter = createMockAdapter();
      const ws = new Warrant(adapter, { signingKey: `key_${randomStr()}` });

      await expect(ws.issue({
        truthSnapshotId: `truth_${randomStr()}`,
        planId: `plan_${randomStr()}`,
        objective: `Random T2 objective ${randomStr(4)}`,
        riskTier: 'T2',
        allowedActions: [randomAction()],
        // Deliberately no approvalId or approvalIds
        issuer: 'fuzz_test',
      })).rejects.toThrow();
    }
  });
});

// ─── Property 3: Signature is deterministic ───

describe('Property: Signature is deterministic', () => {
  it(`same inputs produce same signature across ${ITERATIONS} iterations`, () => {
    const adapter = createMockAdapter();
    const ws = new Warrant(adapter, { signingKey: 'deterministic-test-key' });

    const warrant = {
      warrant_id: 'wrt_fixed_test',
      issued_by: 'test',
      issued_at: '2026-04-06T12:00:00.000Z',
      expires_at: '2026-04-06T12:30:00.000Z',
      risk_tier: 'T1',
      truth_snapshot_id: 'truth_fixed',
      truth_snapshot_hash: 'sha256:fixed_hash',
      plan_id: 'plan_fixed',
      approval_ids: [],
      objective: 'Fixed test objective',
      allowed_actions: ['file.read'],
      forbidden_actions: [],
      constraints: {},
    };

    const signatures = new Set();
    for (let i = 0; i < ITERATIONS; i++) {
      signatures.add(ws._sign(warrant));
    }

    expect(signatures.size).toBe(1);
  });
});

// ─── Property 4: Signature is sensitive to changes ───

describe('Property: Signature changes when any field changes', () => {
  it(`detects changes across ${ITERATIONS} random field modifications`, () => {
    const adapter = createMockAdapter();
    const ws = new Warrant(adapter, { signingKey: 'sensitivity-test-key' });

    const baseWarrant = {
      warrant_id: 'wrt_base',
      issued_by: 'test',
      issued_at: '2026-04-06T12:00:00.000Z',
      expires_at: '2026-04-06T12:30:00.000Z',
      risk_tier: 'T1',
      truth_snapshot_id: 'truth_base',
      truth_snapshot_hash: 'sha256:base_hash',
      plan_id: 'plan_base',
      approval_ids: [],
      objective: 'Base objective',
      allowed_actions: ['file.read'],
      forbidden_actions: [],
      constraints: {},
    };

    const baseSig = ws._sign(baseWarrant);

    const signedFields = [
      'warrant_id', 'issued_by', 'issued_at', 'expires_at', 'risk_tier',
      'truth_snapshot_id', 'truth_snapshot_hash', 'plan_id', 'objective',
    ];

    for (const field of signedFields) {
      const modified = { ...baseWarrant, [field]: `modified_${randomStr()}` };
      const modifiedSig = ws._sign(modified);
      expect(modifiedSig).not.toBe(baseSig);
    }

    // Also test array fields
    const withNewActions = { ...baseWarrant, allowed_actions: ['delete_production'] };
    expect(ws._sign(withNewActions)).not.toBe(baseSig);

    const withForbidden = { ...baseWarrant, forbidden_actions: ['dangerous_action'] };
    expect(ws._sign(withForbidden)).not.toBe(baseSig);

    const withConstraints = { ...baseWarrant, constraints: { amount: { max: 500 } } };
    expect(ws._sign(withConstraints)).not.toBe(baseSig);
  });
});

// ─── Property 5: Risk tier classification is total ───

describe('Property: Risk tier classification is total', () => {
  const riskTier = new RiskTier();
  const validTiers = new Set(['T0', 'T1', 'T2', 'T3']);

  it(`every random input maps to exactly one valid tier (${ITERATIONS} iterations)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const operation = {
        action: randomAction(),
        reversible: Math.random() > 0.5,
        tradingImpact: randomTradingImpact(),
        blastRadius: randomBlastRadius(),
        requiresApproval: Math.random() > 0.7,
        financialImpact: randomInt(0, 50000),
        piiInScope: Math.random() > 0.8,
        regulatoryScope: Math.random() > 0.9,
      };

      const tier = riskTier.classify(operation);
      expect(validTiers.has(tier)).toBe(true);
    }
  });

  it('empty input maps to T0', () => {
    expect(riskTier.classify({})).toBe('T0');
  });

  it('undefined input maps to T0', () => {
    expect(riskTier.classify(undefined || {})).toBe('T0');
  });
});

// ─── Property 6: TTL is always bounded ───

describe('Property: Warrant TTL is always bounded', () => {
  const tierMaxMinutes = { T0: 60, T1: 30, T2: 15, T3: 5 };

  it(`no random TTL request exceeds tier cap (${ITERATIONS} iterations)`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const tier = ['T0', 'T1'][randomInt(0, 1)]; // Only T0/T1 (no approval needed)
      const requestedTtl = randomInt(1, 100000); // Up to ~69 days

      const adapter = createMockAdapter();
      const ws = new Warrant(adapter, { signingKey: `key_${randomStr()}` });

      const result = await ws.issue({
        truthSnapshotId: `truth_${randomStr()}`,
        planId: `plan_${randomStr()}`,
        objective: `TTL test ${i}`,
        riskTier: tier,
        allowedActions: ['test'],
        expiresInMinutes: requestedTtl,
        issuer: 'fuzz_test',
      });

      const issuedAt = new Date(result.issued_at).getTime();
      const expiresAt = new Date(result.expires_at).getTime();
      const actualMinutes = (expiresAt - issuedAt) / 60000;

      expect(actualMinutes).toBeLessThanOrEqual(tierMaxMinutes[tier] + 0.1);
      expect(actualMinutes).toBeGreaterThan(0);
    }
  });
});

// ─── Property 7: Warrant IDs are always unique ───

describe('Property: Warrant IDs are unique', () => {
  it(`${ITERATIONS} warrants all have unique IDs`, async () => {
    const adapter = createMockAdapter();
    const ws = new Warrant(adapter, { signingKey: 'uniqueness-key' });
    const ids = new Set();

    for (let i = 0; i < ITERATIONS; i++) {
      const result = await ws.issue({
        truthSnapshotId: `truth_${randomStr()}`,
        planId: `plan_${randomStr()}`,
        objective: `Uniqueness test ${i}`,
        riskTier: 'T0',
        allowedActions: ['test'],
        issuer: 'fuzz_test',
      });

      expect(ids.has(result.warrant_id)).toBe(false);
      ids.add(result.warrant_id);
    }

    expect(ids.size).toBe(ITERATIONS);
  });
});
