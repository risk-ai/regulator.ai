/**
 * In-Memory Node Registry
 * 
 * Lightweight implementation for testing and single-node deployments
 * Phase 19 — Distributed Execution
 */

class NodeRegistry {
  constructor() {
    this.nodes = new Map();
    this.heartbeatTimeout = 60000; // 1 minute
  }

  registerNode(node) {
    if (!node.node_id) {
      throw new Error('Missing required field: node_id');
    }
    if (!node.capabilities) {
      throw new Error('Missing required field: capabilities');
    }

    const now = new Date().toISOString();
    const existing = this.nodes.get(node.node_id);
    
    const nodeData = {
      ...node,
      registered_at: existing ? existing.registered_at : now,
      last_heartbeat: now,
      health_status: 'healthy',
      current_load: node.current_load !== undefined ? node.current_load : 0,
      failed_heartbeats: 0
    };
    
    this.nodes.set(node.node_id, nodeData);
    return { registered: true, node_id: node.node_id };
  }

  getNode(nodeId) {
    const node = this.nodes.get(nodeId);
    return node || null;
  }

  findNodesByCapability(capability, options = {}) {
    const nodes = Array.from(this.nodes.values())
      .filter(node => node.capabilities.includes(capability));

    // Filter unhealthy nodes
    const filtered = options.excludeUnhealthy
      ? nodes.filter(n => this.checkNodeHealth(n.node_id, options).health_status === 'healthy')
      : nodes;

    // Filter by max load
    const loadFiltered = options.maxLoad !== undefined
      ? filtered.filter(n => n.current_load <= options.maxLoad)
      : filtered;

    // Sort by load if requested
    if (options.sortBy === 'load') {
      loadFiltered.sort((a, b) => a.current_load - b.current_load);
    }

    return loadFiltered;
  }

  findNodesByCapabilities(capabilities) {
    return Array.from(this.nodes.values())
      .filter(node => capabilities.every(cap => node.capabilities.includes(cap)));
  }

  listAllCapabilities() {
    const caps = new Set();
    for (const node of this.nodes.values()) {
      node.capabilities.forEach(c => caps.add(c));
    }
    return Array.from(caps);
  }

  getCapabilityCounts() {
    const counts = {};
    for (const node of this.nodes.values()) {
      node.capabilities.forEach(cap => {
        counts[cap] = (counts[cap] || 0) + 1;
      });
    }
    return counts;
  }

  updateHeartbeat(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    node.last_heartbeat = new Date().toISOString();
    node.health_status = 'healthy';
    node.failed_heartbeats = 0;

    return { node_id: nodeId, last_heartbeat: node.last_heartbeat };
  }

  checkNodeHealth(nodeId, options = {}) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const staleThreshold = options.staleThresholdMs || this.heartbeatTimeout;
    const lastHeartbeat = new Date(node.last_heartbeat).getTime();
    const age = Date.now() - lastHeartbeat;

    if (age > staleThreshold) {
      node.health_status = 'unhealthy';
      return {
        health_status: 'unhealthy',
        reason: 'Stale heartbeat',
        age_ms: age
      };
    }

    return {
      health_status: 'healthy',
      age_ms: age
    };
  }

  recordFailedHeartbeat(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.failed_heartbeats = (node.failed_heartbeats || 0) + 1;

    if (node.failed_heartbeats >= 3) {
      node.health_status = 'unhealthy';
    }
  }

  updateLoad(nodeId, load) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.current_load = load;
  }

  getAverageLoad() {
    if (this.nodes.size === 0) return 0;

    const totalLoad = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + (node.current_load || 0), 0);

    return totalLoad / this.nodes.size;
  }

  getClusterStatus() {
    const avgLoad = this.getAverageLoad();
    
    return {
      total_nodes: this.nodes.size,
      avg_load: avgLoad,
      overloaded: avgLoad > 0.9
    };
  }

  deregisterNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    this.nodes.delete(nodeId);

    return {
      deregistered: true,
      deregistered_at: new Date().toISOString()
    };
  }
}

module.exports = NodeRegistry;
