/**
 * Verification Dispatcher
 * 
 * Dispatch verification tasks to remote nodes
 * Phase 19 — Distributed Execution
 */

const crypto = require('crypto');

class VerificationDispatcher {
  constructor(stateGraph, nodeRegistry) {
    this.stateGraph = stateGraph;
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Dispatch verification to node
   */
  async dispatchVerification(executionId, verificationTask, options = {}) {
    // Select verification node (can be same or different from execution node)
    const nodes = await this.nodeRegistry.listNodes({ status: 'online' });

    if (nodes.length === 0) {
      throw new Error('No nodes available for verification');
    }

    const selectedNode = options.preferred_node_id
      ? nodes.find(n => n.node_id === options.preferred_node_id)
      : nodes[0];

    if (!selectedNode) {
      throw new Error('Preferred verification node not available');
    }

    // Create verification dispatch record
    const verificationId = this._generateId('verif');

    await this.stateGraph.run(
      `INSERT INTO remote_verifications (
        verification_id, execution_id, verification_node_id,
        verification_task, dispatched_at, status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        verificationId,
        executionId,
        selectedNode.node_id,
        JSON.stringify(verificationTask),
        new Date().toISOString(),
        'pending'
      ]
    );

    // Send verification request to node
    const result = await this._sendVerificationRequest(
      selectedNode,
      verificationId,
      verificationTask
    );

    // Update status
    await this.updateVerificationStatus(verificationId, 'dispatched');

    return {
      verification_id: verificationId,
      node_id: selectedNode.node_id
    };
  }

  /**
   * Handle verification result
   */
  async handleVerificationResult(verificationId, result) {
    await this.stateGraph.run(
      `UPDATE remote_verifications 
       SET status = ?, completed_at = ?, result = ? 
       WHERE verification_id = ?`,
      [
        result.success ? 'completed' : 'failed',
        new Date().toISOString(),
        JSON.stringify(result),
        verificationId
      ]
    );

    return result;
  }

  /**
   * Get verification
   */
  async getVerification(verificationId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM remote_verifications WHERE verification_id = ?`,
      [verificationId]
    );

    if (!row) return null;

    return {
      verification_id: row.verification_id,
      execution_id: row.execution_id,
      verification_node_id: row.verification_node_id,
      verification_task: JSON.parse(row.verification_task || '{}'),
      dispatched_at: row.dispatched_at,
      completed_at: row.completed_at,
      result: row.result ? JSON.parse(row.result) : null,
      status: row.status
    };
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(verificationId, status) {
    await this.stateGraph.run(
      `UPDATE remote_verifications SET status = ? WHERE verification_id = ?`,
      [status, verificationId]
    );
  }

  // Helper methods

  async _sendVerificationRequest(node, verificationId, task) {
    // Mock implementation - would make HTTP request to node
    return { acknowledged: true };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = VerificationDispatcher;
