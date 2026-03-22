/**
 * Capability Negotiator
 * 
 * Capability registration and dynamic updates
 * Phase 19.1 — Remote Execution
 */

class CapabilityNegotiator {
  constructor(stateGraph, nodeRegistry) {
    this.stateGraph = stateGraph;
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Validate capability format
   */
  validateCapability(capability) {
    if (!capability.action_type) {
      throw new Error('Capability missing action_type');
    }

    if (!capability.supported_targets) {
      throw new Error('Capability missing supported_targets');
    }

    if (!Array.isArray(capability.supported_targets)) {
      throw new Error('supported_targets must be an array');
    }

    return true;
  }

  /**
   * Add capability to node
   */
  async addCapability(nodeId, capability) {
    this.validateCapability(capability);

    const node = await this.nodeRegistry.getNode(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Check if capability already exists
    const exists = node.capabilities.some(c => c.action_type === capability.action_type);

    if (exists) {
      throw new Error(`Node ${nodeId} already has capability ${capability.action_type}`);
    }

    // Add capability
    const updatedCapabilities = [...node.capabilities, capability];

    await this.nodeRegistry.updateCapabilities(nodeId, updatedCapabilities);

    return { capability_added: true };
  }

  /**
   * Remove capability from node
   */
  async removeCapability(nodeId, actionType, reason) {
    const node = await this.nodeRegistry.getNode(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Remove capability
    const updatedCapabilities = node.capabilities.filter(c => c.action_type !== actionType);

    await this.nodeRegistry.updateCapabilities(nodeId, updatedCapabilities);

    return { capability_removed: true, reason };
  }

  /**
   * Update capability metadata
   */
  async updateCapability(nodeId, actionType, metadata) {
    const node = await this.nodeRegistry.getNode(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedCapabilities = node.capabilities.map(c =>
      c.action_type === actionType
        ? { ...c, metadata: { ...c.metadata, ...metadata } }
        : c
    );

    await this.nodeRegistry.updateCapabilities(nodeId, updatedCapabilities);

    return { capability_updated: true };
  }

  /**
   * Negotiate capabilities for plan
   */
  async negotiateCapabilities(plan) {
    const requiredCapabilities = this._extractCapabilities(plan);
    const capableNodes = await this.nodeRegistry.findCapableNodes(plan);

    if (capableNodes.length === 0) {
      return {
        can_execute: false,
        missing_capabilities: requiredCapabilities.map(c => c.action_type),
        capable_nodes: []
      };
    }

    return {
      can_execute: true,
      missing_capabilities: [],
      capable_nodes: capableNodes.map(n => n.node_id)
    };
  }

  /**
   * Get node capabilities
   */
  async getNodeCapabilities(nodeId) {
    const node = await this.nodeRegistry.getNode(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return node.capabilities;
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
}

module.exports = CapabilityNegotiator;
