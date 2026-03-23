/**
 * Attestation Engine
 * 
 * Generates verifiable execution records AFTER execution completes.
 * Pipeline position: execution → verification → attestation → ledger
 * 
 * @module lib/attestation/attestation-engine
 */

const { randomUUID } = require('crypto');
const { getStateGraph } = require('../state/state-graph');

/**
 * AttestationEngine
 * 
 * Responsibilities:
 * - Generate attestation records after execution completes
 * - Store attestations in State Graph
 * - Link attestations to execution_id
 * - Support success, failed, blocked statuses
 */
class AttestationEngine {
  constructor() {
    this.stateGraph = null;
  }

  async initialize() {
    if (!this.stateGraph) {
      this.stateGraph = getStateGraph();
      await this.stateGraph.initialize();
    }
  }

  /**
   * Create attestation record
   * 
   * @param {Object} params
   * @param {string} params.execution_id - Execution ID (required)
   * @param {string} params.tenant_id - Tenant ID (optional)
   * @param {string} params.status - Attestation status: success | failed | blocked
   * @param {string} params.input_hash - Input hash (optional)
   * @param {string} params.output_hash - Output hash (optional)
   * @param {Object} params.metadata - Additional metadata (optional)
   * @returns {Promise<Object>} Attestation record
   */
  async createAttestation({
    execution_id,
    tenant_id = null,
    status,
    input_hash = null,
    output_hash = null,
    metadata = null
  }) {
    await this.initialize();

    // Validate required fields
    if (!execution_id) {
      throw new Error('execution_id is required');
    }

    if (!['success', 'failed', 'blocked'].includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be success, failed, or blocked`);
    }

    const attestation_id = randomUUID();
    const attested_at = new Date().toISOString();

    const attestation = {
      attestation_id,
      execution_id,
      tenant_id,
      status,
      input_hash,
      output_hash,
      attested_at,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: attested_at
    };

    // Insert attestation
    const stmt = this.stateGraph.db.prepare(`
      INSERT INTO execution_attestations (
        attestation_id,
        execution_id,
        tenant_id,
        status,
        input_hash,
        output_hash,
        attested_at,
        metadata,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      attestation.attestation_id,
      attestation.execution_id,
      attestation.tenant_id,
      attestation.status,
      attestation.input_hash,
      attestation.output_hash,
      attestation.attested_at,
      attestation.metadata,
      attestation.created_at
    );

    return attestation;
  }

  /**
   * Get attestation by execution_id
   * 
   * @param {string} execution_id - Execution ID
   * @returns {Promise<Object|null>} Attestation record or null
   */
  async getAttestation(execution_id) {
    await this.initialize();

    const stmt = this.stateGraph.db.prepare(`
      SELECT * FROM execution_attestations WHERE execution_id = ?
    `);

    const row = stmt.get(execution_id);

    if (!row) {
      return null;
    }

    // Parse metadata if present
    if (row.metadata) {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch (err) {
        // Keep as string if parse fails
      }
    }

    return row;
  }

  /**
   * List attestations (with optional filters)
   * 
   * @param {Object} filters
   * @param {string} filters.tenant_id - Filter by tenant
   * @param {string} filters.status - Filter by status
   * @param {number} filters.limit - Result limit (default: 100)
   * @returns {Promise<Array<Object>>} Attestation records
   */
  async listAttestations(filters = {}) {
    await this.initialize();

    const { tenant_id, status, limit = 100 } = filters;

    let query = 'SELECT * FROM execution_attestations WHERE 1=1';
    const params = [];

    if (tenant_id) {
      query += ' AND tenant_id = ?';
      params.push(tenant_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY attested_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.stateGraph.db.prepare(query);
    const rows = stmt.all(...params);

    // Parse metadata for all rows
    return rows.map(row => {
      if (row.metadata) {
        try {
          row.metadata = JSON.parse(row.metadata);
        } catch (err) {
          // Keep as string if parse fails
        }
      }
      return row;
    });
  }

  /**
   * Check if attestation exists for execution
   * 
   * @param {string} execution_id - Execution ID
   * @returns {Promise<boolean>}
   */
  async hasAttestation(execution_id) {
    await this.initialize();

    const stmt = this.stateGraph.db.prepare(`
      SELECT 1 FROM execution_attestations WHERE execution_id = ? LIMIT 1
    `);

    return !!stmt.get(execution_id);
  }
}

module.exports = { AttestationEngine };
