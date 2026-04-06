/**
 * Open Warrant Standard (OWS) — Tests
 * 
 * Verifies the standard works correctly and is interoperable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenWarrantStandard, type OWSPayload } from '../governance/open-warrant-standard.js';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

describe('Open Warrant Standard (OWS)', () => {
  let ows: OpenWarrantStandard;

  beforeEach(() => {
    ows = new OpenWarrantStandard();
    ows.registerKey({
      kid: 'test-key-1',
      alg: 'HS256',
      secret: 'super-secret-signing-key-for-tests',
    });
  });

  // ─── Token Format ───

  describe('Token Format', () => {
    it('produces three dot-separated base64url parts', () => {
      const token = ows.issue({
        wid: 'wrt_test_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'api-gateway',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['file.read'],
        obj: 'Read config',
        pid: 'plan_1',
      });

      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      // Each part should be valid base64url
      parts.forEach((part) => {
        expect(() => Buffer.from(part, 'base64url')).not.toThrow();
      });
    });

    it('header contains correct type and version', () => {
      const token = ows.issue({
        wid: 'wrt_test_2',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T0',
        scope: ['*'],
        obj: 'Test',
        pid: 'plan_2',
      });

      const parsed = ows.parse(token);
      expect(parsed.header.typ).toBe('OWS');
      expect(parsed.header.ver).toBe('1.0');
      expect(parsed.header.alg).toBe('HS256');
      expect(parsed.header.kid).toBe('test-key-1');
    });

    it('payload contains all required claims', () => {
      const token = ows.issue({
        wid: 'wrt_test_3',
        iss: 'vienna-os',
        sub: 'billing-agent',
        aud: 'stripe-api',
        exp: nowSeconds() + 900,
        tier: 'T2',
        scope: ['payment.refund'],
        obj: 'Process customer refund',
        pid: 'plan_3',
        aid: ['app_123'],
      });

      const parsed = ows.parse(token);
      expect(parsed.payload.wid).toBe('wrt_test_3');
      expect(parsed.payload.tier).toBe('T2');
      expect(parsed.payload.scope).toEqual(['payment.refund']);
      expect(parsed.payload.iat).toBeGreaterThan(0);
      expect(parsed.payload.hsh).toMatch(/^sha256:/);
    });
  });

  // ─── Signing & Verification ───

  describe('Signature Verification', () => {
    it('valid token passes verification', () => {
      const token = ows.issue({
        wid: 'wrt_sig_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T0',
        scope: ['file.read'],
        obj: 'Read',
        pid: 'plan_1',
      });

      const result = ows.verify(token);
      expect(result.valid).toBe(true);
      expect(result.payload?.wid).toBe('wrt_sig_1');
    });

    it('tampered payload fails verification', () => {
      const token = ows.issue({
        wid: 'wrt_sig_2',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T0',
        scope: ['file.read'],
        obj: 'Read',
        pid: 'plan_1',
      });

      // Tamper with payload
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.scope = ['delete_production', 'wire_transfer'];
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tampered = parts.join('.');

      const result = ows.verify(tampered);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_INVALID');
    });

    it('different key fails verification', () => {
      const token = ows.issue({
        wid: 'wrt_sig_3',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T0',
        scope: ['file.read'],
        obj: 'Read',
        pid: 'plan_1',
      });

      // Create new instance with different key
      const ows2 = new OpenWarrantStandard();
      ows2.registerKey({
        kid: 'test-key-1', // Same kid but different secret
        alg: 'HS256',
        secret: 'completely-different-secret',
      });

      const result = ows2.verify(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_INVALID');
    });
  });

  // ─── Expiration & Timing ───

  describe('Expiration', () => {
    it('expired token fails verification', () => {
      const token = ows.issue({
        wid: 'wrt_exp_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        iat: nowSeconds() - 7200,
        exp: nowSeconds() - 3600, // Expired 1 hour ago
        tier: 'T0',
        scope: ['file.read'],
        obj: 'Read',
        pid: 'plan_1',
      });

      const result = ows.verify(token);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('not-yet-valid token fails verification', () => {
      const token = ows.issue({
        wid: 'wrt_nbf_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 7200,
        nbf: nowSeconds() + 3600, // Not valid for another hour
        tier: 'T0',
        scope: ['file.read'],
        obj: 'Read',
        pid: 'plan_1',
      });

      const result = ows.verify(token);
      expect(result.valid).toBe(false);
      expect(result.not_before_violation).toBe(true);
    });
  });

  // ─── Scope Verification ───

  describe('Scope Enforcement', () => {
    it('allows action in scope', () => {
      const token = ows.issue({
        wid: 'wrt_scope_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['file.read', 'file.write'],
        obj: 'File ops',
        pid: 'plan_1',
      });

      const result = ows.verify(token, { action: 'file.read' });
      expect(result.valid).toBe(true);
    });

    it('denies action not in scope', () => {
      const token = ows.issue({
        wid: 'wrt_scope_2',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['file.read'],
        obj: 'Read only',
        pid: 'plan_1',
      });

      const result = ows.verify(token, { action: 'file.write' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('ACTION_NOT_IN_SCOPE');
    });

    it('deny list overrides scope', () => {
      const token = ows.issue({
        wid: 'wrt_scope_3',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['file.read', 'file.write', 'file.delete'],
        deny: ['file.delete'],
        obj: 'No delete',
        pid: 'plan_1',
      });

      const result = ows.verify(token, { action: 'file.delete' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('ACTION_DENIED');
    });

    it('wildcard scope allows any action', () => {
      const token = ows.issue({
        wid: 'wrt_scope_4',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T0',
        scope: ['*'],
        obj: 'Full access',
        pid: 'plan_1',
      });

      const result = ows.verify(token, { action: 'anything.at.all' });
      expect(result.valid).toBe(true);
    });
  });

  // ─── Constraint Verification ───

  describe('Constraint Enforcement', () => {
    it('enforces max constraint', () => {
      const token = ows.issue({
        wid: 'wrt_cst_1',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['payment.refund'],
        obj: 'Refund',
        pid: 'plan_1',
        cst: { amount: { max: 100 } },
      });

      const ok = ows.verify(token, { action: 'payment.refund', params: { amount: 50 } });
      expect(ok.valid).toBe(true);

      const fail = ows.verify(token, { action: 'payment.refund', params: { amount: 500 } });
      expect(fail.valid).toBe(false);
      expect(fail.reason).toContain('CONSTRAINT_VIOLATION');
    });

    it('enforces enum constraint', () => {
      const token = ows.issue({
        wid: 'wrt_cst_2',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 1800,
        tier: 'T1',
        scope: ['deploy'],
        obj: 'Deploy',
        pid: 'plan_1',
        cst: { environment: { enum: ['staging', 'dev'] } },
      });

      const ok = ows.verify(token, { action: 'deploy', params: { environment: 'staging' } });
      expect(ok.valid).toBe(true);

      const fail = ows.verify(token, { action: 'deploy', params: { environment: 'production' } });
      expect(fail.valid).toBe(false);
    });
  });

  // ─── Tier Enforcement ───

  describe('Tier Requirements', () => {
    it('T2 requires approval IDs', () => {
      expect(() =>
        ows.issue({
          wid: 'wrt_tier_1',
          iss: 'vienna-os',
          sub: 'agent-1',
          aud: 'target',
          exp: nowSeconds() + 900,
          tier: 'T2',
          scope: ['deploy'],
          obj: 'Deploy',
          pid: 'plan_1',
          // No aid
        })
      ).toThrow(/T2.*aid/);
    });

    it('T3 requires approvals + justification + rollback', () => {
      expect(() =>
        ows.issue({
          wid: 'wrt_tier_2',
          iss: 'vienna-os',
          sub: 'agent-1',
          aud: 'target',
          exp: nowSeconds() + 300,
          tier: 'T3',
          scope: ['wire_transfer'],
          obj: 'Transfer',
          pid: 'plan_1',
          aid: ['app_1', 'app_2'],
          // No jst or rbk
        })
      ).toThrow(/T3.*jst/);
    });

    it('T3 accepts full authorization chain', () => {
      const token = ows.issue({
        wid: 'wrt_tier_3',
        iss: 'vienna-os',
        sub: 'agent-1',
        aud: 'target',
        exp: nowSeconds() + 300,
        tier: 'T3',
        scope: ['wire_transfer'],
        obj: 'Transfer',
        pid: 'plan_1',
        aid: ['app_1', 'app_2'],
        jst: 'Required for Q1 settlement',
        rbk: 'Reverse via SWIFT recall',
      });

      const result = ows.verify(token);
      expect(result.valid).toBe(true);
      expect(result.payload?.tier).toBe('T3');
    });
  });

  // ─── Vienna Warrant Conversion ───

  describe('Vienna Warrant Conversion', () => {
    it('converts internal warrant to OWS format', () => {
      const token = ows.fromViennaWarrant({
        warrant_id: 'wrt_vienna_1',
        issued_by: 'vienna-os',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
        risk_tier: 'T1',
        plan_id: 'plan_v1',
        objective: 'Read logs',
        allowed_actions: ['file.read', 'api.call'],
        forbidden_actions: [],
        constraints: {},
        signature: 'hmac-sha256:abc123',
      }, { agentId: 'log-reader' });

      const result = ows.verify(token);
      expect(result.valid).toBe(true);
      expect(result.payload?.wid).toBe('wrt_vienna_1');
      expect(result.payload?.sub).toBe('log-reader');
      expect(result.payload?.scope).toEqual(['file.read', 'api.call']);
    });
  });

  // ─── Specification Export ───

  describe('Specification', () => {
    it('exports a valid JSON Schema', () => {
      const spec = OpenWarrantStandard.getSpecification();
      expect(spec).toHaveProperty('$schema');
      expect(spec).toHaveProperty('title');
      expect(spec).toHaveProperty('header');
      expect(spec).toHaveProperty('payload');
      expect(spec).toHaveProperty('risk_tiers');
      expect((spec as any).version).toBe('1.0');
    });
  });

  // ─── Multiple Keys ───

  describe('Multi-Key Support', () => {
    it('supports multiple signing keys', () => {
      ows.registerKey({
        kid: 'key-2',
        alg: 'HS256',
        secret: 'second-key-secret',
      });

      const token1 = ows.issue({
        wid: 'wrt_mk_1', iss: 'v', sub: 'a', aud: 't',
        exp: nowSeconds() + 1800, tier: 'T0', scope: ['*'], obj: 'T', pid: 'p',
      }, { kid: 'test-key-1' });

      const token2 = ows.issue({
        wid: 'wrt_mk_2', iss: 'v', sub: 'a', aud: 't',
        exp: nowSeconds() + 1800, tier: 'T0', scope: ['*'], obj: 'T', pid: 'p',
      }, { kid: 'key-2' });

      expect(ows.verify(token1).valid).toBe(true);
      expect(ows.verify(token2).valid).toBe(true);

      // Tokens are different
      expect(token1).not.toBe(token2);
    });
  });
});
