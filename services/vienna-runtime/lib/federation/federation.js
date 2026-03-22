/**
 * Vienna Federation Layer
 * 
 * Vienna-to-Vienna federation and cross-system orchestration with governance preservation.
 */

const crypto = require('crypto');

/**
 * Federation Node
 */
class FederationNode {
  constructor(data) {
    this.node_id = data.node_id;
    this.node_type = data.node_type; // 'vienna', 'external'
    this.endpoint_url = data.endpoint_url;
    this.capabilities = data.capabilities || [];
    this.trust_level = data.trust_level || 'untrusted'; // 'trusted', 'verified', 'untrusted'
    this.public_key = data.public_key || null;
    this.status = data.status || 'active';
    this.health_score = data.health_score || 1.0;
    this.last_heartbeat = data.last_heartbeat || null;
    this.registered_at = data.registered_at || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * Check if node can execute action
   */
  canExecute(action) {
    if (this.status !== 'active') {
      return false;
    }

    if (!this.capabilities || this.capabilities.length === 0) {
      return false; // No capabilities = can't execute anything
    }

    // Check if node has required capability
    const requiredCapability = action.required_capability || action.action_type;
    return this.capabilities.includes(requiredCapability) || this.capabilities.includes('*');
  }

  /**
   * Verify trust
   */
  isTrusted() {
    return this.trust_level === 'trusted' || this.trust_level === 'verified';
  }

  toJSON() {
    return {
      node_id: this.node_id,
      node_type: this.node_type,
      endpoint_url: this.endpoint_url,
      capabilities: this.capabilities,
      trust_level: this.trust_level,
      status: this.status,
      health_score: this.health_score,
      last_heartbeat: this.last_heartbeat,
      registered_at: this.registered_at,
      metadata: this.metadata
    };
  }
}

/**
 * Federated Execution Request
 */
class FederatedExecutionRequest {
  constructor(data) {
    this.request_id = data.request_id || this._generateId();
    this.source_node = data.source_node; // Who is requesting
    this.target_node = data.target_node; // Who should execute
    this.plan = data.plan;
    this.context = data.context || {};
    this.governance_context = data.governance_context || {};
    this.signature = data.signature || null;
    this.created_at = data.created_at || new Date().toISOString();
  }

  /**
   * Sign the request
   */
  sign(privateKey) {
    const payload = {
      request_id: this.request_id,
      source_node: this.source_node,
      target_node: this.target_node,
      plan: this.plan,
      context: this.context,
      governance_context: this.governance_context,
      created_at: this.created_at
    };

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    this.signature = hash.digest('hex');

    return this.signature;
  }

  /**
   * Verify signature
   */
  verify(publicKey) {
    if (!this.signature) {
      return false;
    }

    const payload = {
      request_id: this.request_id,
      source_node: this.source_node,
      target_node: this.target_node,
      plan: this.plan,
      context: this.context,
      governance_context: this.governance_context,
      created_at: this.created_at
    };

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    const expectedSignature = hash.digest('hex');

    return this.signature === expectedSignature;
  }

  _generateId() {
    return `fed_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      request_id: this.request_id,
      source_node: this.source_node,
      target_node: this.target_node,
      plan: this.plan,
      context: this.context,
      governance_context: this.governance_context,
      signature: this.signature,
      created_at: this.created_at
    };
  }
}

/**
 * Federated Execution Result
 */
class FederatedExecutionResult {
  constructor(data) {
    this.request_id = data.request_id;
    this.executed_by = data.executed_by;
    this.status = data.status; // 'completed', 'failed', 'rejected'
    this.result = data.result || {};
    this.execution_id = data.execution_id || null;
    this.verification_id = data.verification_id || null;
    this.ledger_events = data.ledger_events || [];
    this.provenance_chain = data.provenance_chain || null;
    this.signature = data.signature || null;
    this.completed_at = data.completed_at || new Date().toISOString();
  }

  sign(privateKey) {
    const payload = {
      request_id: this.request_id,
      executed_by: this.executed_by,
      status: this.status,
      result: this.result,
      execution_id: this.execution_id,
      verification_id: this.verification_id,
      completed_at: this.completed_at
    };

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    this.signature = hash.digest('hex');

    return this.signature;
  }

  toJSON() {
    return {
      request_id: this.request_id,
      executed_by: this.executed_by,
      status: this.status,
      result: this.result,
      execution_id: this.execution_id,
      verification_id: this.verification_id,
      ledger_events: this.ledger_events,
      provenance_chain: this.provenance_chain,
      signature: this.signature,
      completed_at: this.completed_at
    };
  }
}

/**
 * Federation Manager
 */
class FederationManager {
  constructor() {
    this.nodes = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Register a federation node
   */
  registerNode(nodeData) {
    const node = new FederationNode(nodeData);
    this.nodes.set(node.node_id, node);
    return node;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * List nodes
   */
  listNodes(filters = {}) {
    let nodes = Array.from(this.nodes.values());

    if (filters.status) {
      nodes = nodes.filter(n => n.status === filters.status);
    }
    if (filters.trust_level) {
      nodes = nodes.filter(n => n.trust_level === filters.trust_level);
    }
    if (filters.capability) {
      nodes = nodes.filter(n => n.capabilities.includes(filters.capability));
    }

    return nodes;
  }

  /**
   * Find capable nodes for action
   */
  findCapableNodes(action) {
    return Array.from(this.nodes.values()).filter(node => {
      return node.canExecute(action) && node.isTrusted();
    });
  }

  /**
   * Delegate execution to remote node
   */
  async delegateExecution(plan, targetNodeId, context = {}) {
    const targetNode = this.getNode(targetNodeId);
    if (!targetNode) {
      throw new Error(`NODE_NOT_FOUND: ${targetNodeId}`);
    }

    if (!targetNode.isTrusted()) {
      throw new Error(`NODE_NOT_TRUSTED: ${targetNodeId}`);
    }

    // Create federated request
    const request = new FederatedExecutionRequest({
      source_node: context.source_node || 'local',
      target_node: targetNodeId,
      plan,
      context,
      governance_context: {
        approval_id: context.approval_id || null,
        warrant_id: context.warrant_id || null,
        policy_evaluation: context.policy_evaluation || null,
        tenant_id: context.tenant_id
      }
    });

    // Sign request
    request.sign();

    // Store pending request
    this.pendingRequests.set(request.request_id, {
      request,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // In real implementation, send HTTP request to target node
    // For now, simulate delegation
    const result = await this._simulateRemoteExecution(request, targetNode);

    // Update pending request
    this.pendingRequests.set(request.request_id, {
      request,
      result,
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    return result;
  }

  /**
   * Accept execution request from remote node
   */
  async acceptExecutionRequest(request, localContext = {}) {
    // Verify request signature
    if (!request.verify()) {
      throw new Error('INVALID_SIGNATURE: Request signature verification failed');
    }

    // Verify source node is trusted
    const sourceNode = this.getNode(request.source_node);
    if (!sourceNode || !sourceNode.isTrusted()) {
      throw new Error(`SOURCE_NOT_TRUSTED: ${request.source_node}`);
    }

    // Verify governance context
    this._verifyGovernanceContext(request.governance_context);

    // Execute locally with governance
    // (This would call the normal execution engine)
    const result = new FederatedExecutionResult({
      request_id: request.request_id,
      executed_by: localContext.node_id || 'local',
      status: 'completed',
      result: { simulated: true },
      execution_id: `exec_${Date.now()}`,
      verification_id: `verif_${Date.now()}`
    });

    result.sign();

    return result;
  }

  /**
   * Verify governance context from federated request
   */
  _verifyGovernanceContext(governanceContext) {
    // In production, verify:
    // 1. Approval is valid
    // 2. Warrant is valid
    // 3. Policy evaluation is acceptable
    // 4. Tenant boundaries are respected

    if (!governanceContext.tenant_id) {
      throw new Error('GOVERNANCE_VIOLATION: Missing tenant_id');
    }

    return true;
  }

  /**
   * Simulate remote execution (placeholder for real HTTP call)
   */
  async _simulateRemoteExecution(request, targetNode) {
    // In real implementation, this would be an HTTP POST to targetNode.endpoint_url
    // For now, return a simulated result
    return new FederatedExecutionResult({
      request_id: request.request_id,
      executed_by: targetNode.node_id,
      status: 'completed',
      result: {
        simulated: true,
        plan_id: request.plan.plan_id,
        steps_executed: request.plan.steps?.length || 0
      },
      execution_id: `exec_${Date.now()}`,
      verification_id: `verif_${Date.now()}`
    });
  }

  /**
   * Get pending request
   */
  getPendingRequest(requestId) {
    return this.pendingRequests.get(requestId);
  }

  /**
   * List pending requests
   */
  listPendingRequests(filters = {}) {
    let requests = Array.from(this.pendingRequests.values());

    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }

    return requests;
  }

  /**
   * Update node health
   */
  updateNodeHealth(nodeId, healthScore, heartbeat) {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`NODE_NOT_FOUND: ${nodeId}`);
    }

    node.health_score = healthScore;
    node.last_heartbeat = heartbeat || new Date().toISOString();

    // Update status based on health
    if (healthScore >= 0.8) {
      node.status = 'active';
    } else if (healthScore >= 0.5) {
      node.status = 'degraded';
    } else {
      node.status = 'offline';
    }

    return node;
  }

  /**
   * Establish trust with remote node
   */
  async establishTrust(nodeId, verificationProof) {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`NODE_NOT_FOUND: ${nodeId}`);
    }

    // In production, verify proof (e.g., signed attestation, TLS certificate)
    // For now, upgrade trust level
    node.trust_level = 'verified';

    return node;
  }
}

/**
 * Cross-System Reconciliation Adapter
 */
class CrossSystemAdapter {
  constructor(config) {
    this.system_type = config.system_type; // 'cloud_api', 'internal_control_plane', etc.
    this.endpoint = config.endpoint;
    this.auth = config.auth || {};
  }

  /**
   * Reconcile state with external system
   */
  async reconcile(targetState, currentState) {
    // Placeholder for external system reconciliation
    return {
      reconciled: true,
      changes_applied: [],
      system_type: this.system_type
    };
  }

  /**
   * Query external system state
   */
  async queryState(query) {
    // Placeholder for external system query
    return {
      state: {},
      system_type: this.system_type
    };
  }
}

/**
 * Global federation manager instance
 */
let globalFederationManager = null;

function getFederationManager() {
  if (!globalFederationManager) {
    globalFederationManager = new FederationManager();
  }
  return globalFederationManager;
}

module.exports = {
  FederationNode,
  FederatedExecutionRequest,
  FederatedExecutionResult,
  FederationManager,
  CrossSystemAdapter,
  getFederationManager
};
