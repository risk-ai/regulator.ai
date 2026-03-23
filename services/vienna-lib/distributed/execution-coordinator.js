/**
 * Execution Coordinator
 * 
 * Track distributed execution lifecycle
 * Phase 19 — Distributed Execution
 */

const crypto = require('crypto');

class ExecutionCoordinator {
  constructor(stateGraph, nodeRegistry, workDistributor, lockManager) {
    this.stateGraph = stateGraph;
    this.nodeRegistry = nodeRegistry;
    this.workDistributor = workDistributor;
    this.lockManager = lockManager;
  }

  /**
   * Dispatch execution to node
   */
  async dispatchExecution(executionId, plan, context, options = {}) {
    // Select node
    const selection = await this.workDistributor.selectNode(plan, options);

    // Create distribution record
    const distributionId = await this.workDistributor.createDistribution(
      executionId,
      plan.plan_id,
      selection.node,
      selection.candidates,
      selection.strategy
    );

    // Acquire lock
    const lockId = await this.lockManager.acquireLock({
      target_type: 'service',
      target_id: plan.target_id,
      locked_by_node_id: selection.node.node_id,
      locked_by_execution_id: executionId,
      timeout: plan.timeout || 300000
    });

    // Create coordination record
    const coordinationId = await this._createCoordination(
      executionId,
      selection.node.node_id,
      plan,
      context,
      lockId
    );

    // Send execution request to node
    const result = await this._sendExecuteRequest(
      selection.node,
      executionId,
      plan,
      context,
      lockId
    );

    // Update status
    await this._updateCoordination(coordinationId, {
      status: 'dispatched',
      acknowledged_at: new Date().toISOString()
    });

    await this.workDistributor.updateDistributionStatus(distributionId, 'dispatched');

    return {
      coordination_id: coordinationId,
      distribution_id: distributionId,
      node_id: selection.node.node_id,
      lock_id: lockId
    };
  }

  /**
   * Handle execution result
   */
  async handleExecutionResult(coordinationId, result) {
    const coordination = await this.getCoordination(coordinationId);

    if (!coordination) {
      throw new Error(`Coordination not found: ${coordinationId}`);
    }

    // Update coordination
    await this._updateCoordination(coordinationId, {
      status: result.success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      result: JSON.stringify(result)
    });

    // Release lock
    if (coordination.lock_id) {
      await this.lockManager.releaseLock(coordination.lock_id);
    }

    return result;
  }

  /**
   * Handle execution timeout
   */
  async handleExecutionTimeout(coordinationId) {
    const coordination = await this.getCoordination(coordinationId);

    if (!coordination) return;

    // Send cancel request to node
    await this._sendCancelRequest(coordination.node_id, coordination.execution_id);

    // Update coordination
    await this._updateCoordination(coordinationId, {
      status: 'timeout',
      completed_at: new Date().toISOString()
    });

    // Release lock
    if (coordination.lock_id) {
      await this.lockManager.releaseLock(coordination.lock_id);
    }
  }

  /**
   * Get coordination
   */
  async getCoordination(coordinationId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM execution_coordinations WHERE coordination_id = ?`,
      [coordinationId]
    );

    if (!row) return null;

    return {
      coordination_id: row.coordination_id,
      execution_id: row.execution_id,
      node_id: row.node_id,
      plan: JSON.parse(row.plan || '{}'),
      context: JSON.parse(row.context || '{}'),
      lock_id: row.lock_id,
      dispatched_at: row.dispatched_at,
      acknowledged_at: row.acknowledged_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      result: row.result ? JSON.parse(row.result) : null,
      status: row.status
    };
  }

  /**
   * List coordinations
   */
  async listCoordinations(filters = {}) {
    let query = 'SELECT * FROM execution_coordinations WHERE 1=1';
    const params = [];

    if (filters.node_id) {
      query += ' AND node_id = ?';
      params.push(filters.node_id);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...filters.status);
      } else {
        query += ' AND status = ?';
        params.push(filters.status);
      }
    }

    query += ' ORDER BY dispatched_at DESC';

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => ({
      coordination_id: r.coordination_id,
      execution_id: r.execution_id,
      node_id: r.node_id,
      status: r.status,
      dispatched_at: r.dispatched_at,
      completed_at: r.completed_at
    }));
  }

  // Helper methods

  async _createCoordination(executionId, nodeId, plan, context, lockId) {
    const coordinationId = this._generateId('coord');

    await this.stateGraph.run(
      `INSERT INTO execution_coordinations (
        coordination_id, execution_id, node_id, plan, context,
        lock_id, dispatched_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        coordinationId,
        executionId,
        nodeId,
        JSON.stringify(plan),
        JSON.stringify(context),
        lockId,
        new Date().toISOString(),
        'pending'
      ]
    );

    return coordinationId;
  }

  async _updateCoordination(coordinationId, updates) {
    const fields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    params.push(coordinationId);

    await this.stateGraph.run(
      `UPDATE execution_coordinations SET ${fields.join(', ')} WHERE coordination_id = ?`,
      params
    );
  }

  async _sendExecuteRequest(node, executionId, plan, context, lockId) {
    // Delegate to remote dispatcher with real transport
    const { HTTPTransport } = require('./http-transport');
    const transport = new HTTPTransport();
    
    const payload = {
      execution_id: executionId,
      plan: plan,
      context: context,
      lock_id: lockId
    };

    try {
      const response = await transport.sendExecuteRequest(node, payload);
      return response;
    } catch (err) {
      throw new Error(`Failed to dispatch execution to ${node.node_id}: ${err.message}`);
    }
  }

  async _sendCancelRequest(nodeId, executionId) {
    // Get node from registry
    const node = await this.nodeRegistry.getNode(nodeId);
    if (!node) {
      console.warn(`Cannot cancel execution ${executionId}: node ${nodeId} not found`);
      return { cancelled: false };
    }

    const { HTTPTransport } = require('./http-transport');
    const transport = new HTTPTransport();

    try {
      const response = await transport.sendCancelRequest(node, executionId, 'Coordinator initiated cancellation');
      return response;
    } catch (err) {
      console.error(`Failed to cancel execution ${executionId} on ${nodeId}:`, err.message);
      return { cancelled: false, error: err.message };
    }
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = ExecutionCoordinator;
