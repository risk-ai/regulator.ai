/**
 * Attestation Integration Tests
 * 
 * Validates: execution → verification → attestation → ledger pipeline
 * 
 * @module tests/attestation-integration.test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('crypto');
const { AttestationEngine } = require('../lib/attestation/attestation-engine');
const { getStateGraph } = require('../lib/state/state-graph');

describe('Attestation Integration', () => {
  let engine;
  let stateGraph;

  before(async () => {
    // Ensure test environment
    process.env.VIENNA_ENV = 'test';
    
    engine = new AttestationEngine();
    await engine.initialize();
    
    stateGraph = getStateGraph();
    await stateGraph.initialize();
  });

  after(async () => {
    // Clean up test data
    if (stateGraph && stateGraph.db) {
      stateGraph.db.prepare('DELETE FROM execution_attestations').run();
    }
  });

  describe('Pipeline: execution → verification → attestation', () => {
    it('should create attestation after execution completes', async () => {
      const execution_id = randomUUID();
      const tenant_id = 'tenant-integration-001';

      // Simulate execution completion
      const attestation = await engine.createAttestation({
        execution_id,
        tenant_id,
        status: 'success',
        metadata: {
          step_id: 'step-001',
          verification_passed: true
        }
      });

      assert.ok(attestation.attestation_id);
      assert.strictEqual(attestation.execution_id, execution_id);
      assert.strictEqual(attestation.tenant_id, tenant_id);
      assert.strictEqual(attestation.status, 'success');

      // Verify attestation is retrievable
      const stored = await engine.getAttestation(execution_id);
      assert.ok(stored);
      assert.strictEqual(stored.attestation_id, attestation.attestation_id);
      assert.ok(stored.metadata.verification_passed);
    });

    it('should handle failed execution with attestation', async () => {
      const execution_id = randomUUID();

      const attestation = await engine.createAttestation({
        execution_id,
        tenant_id: 'tenant-001',
        status: 'failed',
        metadata: {
          error: 'Test failure',
          verification_passed: false
        }
      });

      assert.strictEqual(attestation.status, 'failed');

      const stored = await engine.getAttestation(execution_id);
      assert.strictEqual(stored.status, 'failed');
      assert.ok(stored.metadata.error);
    });

    it('should handle blocked execution with attestation', async () => {
      const execution_id = randomUUID();

      const attestation = await engine.createAttestation({
        execution_id,
        tenant_id: 'tenant-001',
        status: 'blocked',
        metadata: {
          reason: 'Quota exceeded',
          verification_skipped: true
        }
      });

      assert.strictEqual(attestation.status, 'blocked');

      const stored = await engine.getAttestation(execution_id);
      assert.strictEqual(stored.status, 'blocked');
      assert.ok(stored.metadata.reason);
    });
  });

  describe('API response integration', () => {
    it('should include attestation in execution response', async () => {
      const execution_id = randomUUID();
      const tenant_id = 'tenant-api-001';

      // Create attestation
      const attestation = await engine.createAttestation({
        execution_id,
        tenant_id,
        status: 'success'
      });

      // Simulate API response assembly
      const apiResponse = {
        success: true,
        execution_id,
        attestation: {
          attestation_id: attestation.attestation_id,
          status: attestation.status,
          attested_at: attestation.attested_at,
          execution_id: attestation.execution_id
        }
      };

      assert.ok(apiResponse.attestation);
      assert.strictEqual(apiResponse.attestation.status, 'success');
      assert.ok(apiResponse.attestation.attested_at);
    });
  });

  describe('Tenant isolation', () => {
    it('should isolate attestations by tenant', async () => {
      const tenant1_id = 'tenant-isolation-001';
      const tenant2_id = 'tenant-isolation-002';

      // Create attestations for different tenants
      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: tenant1_id,
        status: 'success'
      });

      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: tenant1_id,
        status: 'success'
      });

      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: tenant2_id,
        status: 'success'
      });

      // Query by tenant
      const tenant1Attestations = await engine.listAttestations({
        tenant_id: tenant1_id
      });

      const tenant2Attestations = await engine.listAttestations({
        tenant_id: tenant2_id
      });

      assert.ok(tenant1Attestations.length >= 2);
      assert.ok(tenant2Attestations.length >= 1);

      // Verify no cross-tenant leakage
      tenant1Attestations.forEach(a => {
        assert.strictEqual(a.tenant_id, tenant1_id);
      });

      tenant2Attestations.forEach(a => {
        assert.strictEqual(a.tenant_id, tenant2_id);
      });
    });
  });

  describe('Consistency: execution → attestation linkage', () => {
    it('should link attestation to execution_id', async () => {
      const execution_id = randomUUID();

      await engine.createAttestation({
        execution_id,
        status: 'success'
      });

      const attestation = await engine.getAttestation(execution_id);

      assert.ok(attestation);
      assert.strictEqual(attestation.execution_id, execution_id);
    });

    it('should enforce one attestation per execution', async () => {
      const execution_id = randomUUID();

      await engine.createAttestation({
        execution_id,
        status: 'success'
      });

      // Attempt duplicate
      await assert.rejects(
        async () => {
          await engine.createAttestation({
            execution_id,
            status: 'success'
          });
        },
        /UNIQUE constraint failed/
      );
    });
  });
});
