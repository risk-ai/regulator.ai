/**
 * Attestation Engine Tests
 * 
 * @module tests/attestation-engine.test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('crypto');
const { AttestationEngine } = require('../lib/attestation/attestation-engine');
const { getStateGraph } = require('../lib/state/state-graph');

describe('AttestationEngine', () => {
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

  describe('createAttestation', () => {
    it('should create success attestation', async () => {
      const execution_id = randomUUID();
      const tenant_id = 'tenant-001';

      const attestation = await engine.createAttestation({
        execution_id,
        tenant_id,
        status: 'success'
      });

      assert.ok(attestation.attestation_id);
      assert.strictEqual(attestation.execution_id, execution_id);
      assert.strictEqual(attestation.tenant_id, tenant_id);
      assert.strictEqual(attestation.status, 'success');
      assert.ok(attestation.attested_at);
    });

    it('should create failed attestation', async () => {
      const execution_id = randomUUID();

      const attestation = await engine.createAttestation({
        execution_id,
        status: 'failed',
        metadata: { error: 'Test failure' }
      });

      assert.strictEqual(attestation.status, 'failed');
      assert.ok(attestation.metadata);
    });

    it('should create blocked attestation', async () => {
      const execution_id = randomUUID();

      const attestation = await engine.createAttestation({
        execution_id,
        status: 'blocked',
        metadata: { reason: 'Quota exceeded' }
      });

      assert.strictEqual(attestation.status, 'blocked');
    });

    it('should reject invalid status', async () => {
      const execution_id = randomUUID();

      await assert.rejects(
        async () => {
          await engine.createAttestation({
            execution_id,
            status: 'invalid'
          });
        },
        /Invalid status/
      );
    });

    it('should reject missing execution_id', async () => {
      await assert.rejects(
        async () => {
          await engine.createAttestation({
            status: 'success'
          });
        },
        /execution_id is required/
      );
    });

    it('should include optional hashes', async () => {
      const execution_id = randomUUID();

      const attestation = await engine.createAttestation({
        execution_id,
        status: 'success',
        input_hash: 'sha256:abc123',
        output_hash: 'sha256:def456'
      });

      assert.strictEqual(attestation.input_hash, 'sha256:abc123');
      assert.strictEqual(attestation.output_hash, 'sha256:def456');
    });
  });

  describe('getAttestation', () => {
    it('should retrieve attestation by execution_id', async () => {
      const execution_id = randomUUID();

      await engine.createAttestation({
        execution_id,
        status: 'success'
      });

      const attestation = await engine.getAttestation(execution_id);

      assert.ok(attestation);
      assert.strictEqual(attestation.execution_id, execution_id);
      assert.strictEqual(attestation.status, 'success');
    });

    it('should return null for non-existent attestation', async () => {
      const attestation = await engine.getAttestation('non-existent');
      assert.strictEqual(attestation, null);
    });

    it('should parse metadata JSON', async () => {
      const execution_id = randomUUID();
      const metadata = { key: 'value', count: 42 };

      await engine.createAttestation({
        execution_id,
        status: 'success',
        metadata
      });

      const attestation = await engine.getAttestation(execution_id);

      assert.ok(attestation.metadata);
      assert.strictEqual(attestation.metadata.key, 'value');
      assert.strictEqual(attestation.metadata.count, 42);
    });
  });

  describe('hasAttestation', () => {
    it('should return true if attestation exists', async () => {
      const execution_id = randomUUID();

      await engine.createAttestation({
        execution_id,
        status: 'success'
      });

      const exists = await engine.hasAttestation(execution_id);
      assert.strictEqual(exists, true);
    });

    it('should return false if attestation does not exist', async () => {
      const exists = await engine.hasAttestation('non-existent');
      assert.strictEqual(exists, false);
    });
  });

  describe('listAttestations', () => {
    before(async () => {
      // Clean before list tests
      stateGraph.db.prepare('DELETE FROM execution_attestations').run();

      // Create test data
      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: 'tenant-001',
        status: 'success'
      });

      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: 'tenant-001',
        status: 'failed'
      });

      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: 'tenant-002',
        status: 'success'
      });

      await engine.createAttestation({
        execution_id: randomUUID(),
        tenant_id: 'tenant-002',
        status: 'blocked'
      });
    });

    it('should list all attestations', async () => {
      const attestations = await engine.listAttestations();
      assert.ok(attestations.length >= 4);
    });

    it('should filter by tenant_id', async () => {
      const attestations = await engine.listAttestations({
        tenant_id: 'tenant-001'
      });

      assert.ok(attestations.length >= 2);
      attestations.forEach(a => {
        assert.strictEqual(a.tenant_id, 'tenant-001');
      });
    });

    it('should filter by status', async () => {
      const attestations = await engine.listAttestations({
        status: 'success'
      });

      assert.ok(attestations.length >= 2);
      attestations.forEach(a => {
        assert.strictEqual(a.status, 'success');
      });
    });

    it('should filter by tenant_id AND status', async () => {
      const attestations = await engine.listAttestations({
        tenant_id: 'tenant-002',
        status: 'blocked'
      });

      assert.ok(attestations.length >= 1);
      attestations.forEach(a => {
        assert.strictEqual(a.tenant_id, 'tenant-002');
        assert.strictEqual(a.status, 'blocked');
      });
    });

    it('should respect limit', async () => {
      const attestations = await engine.listAttestations({
        limit: 2
      });

      assert.strictEqual(attestations.length, 2);
    });
  });

  describe('enforcement: one attestation per execution', () => {
    it('should reject duplicate attestations for same execution_id', async () => {
      const execution_id = randomUUID();

      await engine.createAttestation({
        execution_id,
        status: 'success'
      });

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
