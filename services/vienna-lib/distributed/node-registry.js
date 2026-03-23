/**
 * Node Registry
 * 
 * Track available Vienna execution nodes and their capabilities
 * Phase 19 — Distributed Execution
 */

const crypto = require('crypto');

class NodeRegistry {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
    this.heartbeatInterval = 30000; // 30s
    this.heartbeatTimeout = 120000; // 2 minutes
    
    // In-memory fallback when no state graph
    if (!stateGraph) {
      this.nodes = new Map();
      this.useInMemory = true;
    }
  }

  /**
   * Register node
   */
  registerNode(node) {
    if (!node.node_id) {
      throw new Error('Missing required field: node_id');
    }
    if (!node.capabilities) {
      throw new Error('Missing required field: capabilities');
    }

    if (this.useInMemory) {
      const now = new Date().toISOString();
      const nodeData = {
        ...node,
        registered_at: now,
        last_heartbeat: now,
        health_status: 'healthy',
        current_load: node.current_load || 0,
        failed_heartbeats: 0
      };
      
      this.nodes.set(node.node_id, nodeData);
      return { registered: true, node_id: node.node_id };
    }

    // State Graph implementation (async)
    return this._registerNodeAsync(node);
  }

  async _registerNodeAsync(node) {
    const nodeId = node.node_id || this._generateId('node');

    await this.stateGraph.run(
      `INSERT INTO execution_nodes (
        node_id, node_type, capabilities, environment, region,
        host, status, last_heartbeat_at, metadata, registered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nodeId,
        node.node_type,
        JSON.stringify(node.capabilities || []),
        node.environment,
        node.region,
        node.host,
        'online',
        new Date().toISOString(),
        JSON.stringify(node.metadata || {}),
        new Date().toISOString()
      ]
    );

    return { ...node, node_id: nodeId, status: 'online' };
  }

  /**
   * Get node by ID
   */
  async getNode(nodeId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM execution_nodes WHERE node_id = ?`,
      [nodeId]
    );

    if (!row) return null;

    return this._deserializeNode(row);
  }

  /**
   * List nodes
   */
  async listNodes(filters = {}) {
    let query = 'SELECT * FROM execution_nodes WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.node_type) {
      query += ' AND node_type = ?';
      params.push(filters.node_type);
    }

    if (filters.environment) {
      query += ' AND environment = ?';
      params.push(filters.environment);
    }

    if (filters.region) {
      query += ' AND region = ?';
      params.push(filters.region);
    }

    query += ' ORDER BY registered_at DESC';

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeNode(r));
  }

  /**
   * Update node heartbeat
   */
  async updateHeartbeat(nodeId) {
    const now = new Date().toISOString();

    await this.stateGraph.run(
      `UPDATE execution_nodes 
       SET last_heartbeat_at = ?, status = 'online' 
       WHERE node_id = ?`,
      [now, nodeId]
    );

    return { node_id: nodeId, last_heartbeat_at: now };
  }

  /**
   * Update node capabilities
   */
  async updateCapabilities(nodeId, capabilities) {
    await this.stateGraph.run(
      `UPDATE execution_nodes 
       SET capabilities = ? 
       WHERE node_id = ?`,
      [JSON.stringify(capabilities), nodeId]
    );
  }

  /**
   * Update node status
   */
  async updateNodeStatus(nodeId, status) {
    await this.stateGraph.run(
      `UPDATE execution_nodes 
       SET status = ? 
       WHERE node_id = ?`,
      [status, nodeId]
    );
  }

  /**
   * Check for stale nodes and mark offline
   */
  async checkStaleNodes() {
    const threshold = new Date(Date.now() - this.heartbeatTimeout).toISOString();

    const staleNodes = await this.stateGraph.all(
      `SELECT * FROM execution_nodes 
       WHERE status IN ('online', 'degraded') 
       AND last_heartbeat_at < ?`,
      [threshold]
    );

    for (const node of staleNodes) {
      await this.updateNodeStatus(node.node_id, 'offline');
    }

    return staleNodes.map(n => n.node_id);
  }

  /**
   * Find capable nodes for plan
   */
  async findCapableNodes(plan) {
    const requiredCapabilities = this._extractCapabilities(plan);
    const allNodes = await this.listNodes({ status: 'online' });

    return allNodes.filter(node => {
      return requiredCapabilities.every(req => {
        return node.capabilities.some(cap =>
          cap.action_type === req.action_type &&
          (cap.supported_targets.includes('*') || cap.supported_targets.includes(req.target_id))
        );
      });
    });
  }

  /**
   * Deregister node
   */
  async deregisterNode(nodeId) {
    await this.stateGraph.run(
      `DELETE FROM execution_nodes WHERE node_id = ?`,
      [nodeId]
    );
  }

  // Helper methods

  _extractCapabilities(plan) {
    const capabilities = [];

    for (const step of plan.steps || []) {
      capabilities.push({
        action_type: step.action_type,
        target_id: step.target_id
      });
    }

    return capabilities;
  }

  _deserializeNode(row) {
    return {
      node_id: row.node_id,
      node_type: row.node_type,
      capabilities: JSON.parse(row.capabilities || '[]'),
      environment: row.environment,
      region: row.region,
      host: row.host,
      status: row.status,
      last_heartbeat_at: row.last_heartbeat_at,
      metadata: JSON.parse(row.metadata || '{}'),
      registered_at: row.registered_at
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = NodeRegistry;
