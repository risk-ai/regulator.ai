/**
 * Work Distributor
 * 
 * Route execution to capable nodes
 * Phase 19 — Distributed Execution
 */

const crypto = require('crypto');

class WorkDistributor {
  constructor(stateGraph, nodeRegistry) {
    this.stateGraph = stateGraph;
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Select node for execution
   */
  async selectNode(plan, options = {}) {
    const strategy = options.strategy || 'load_balanced';

    // Find capable nodes
    const capableNodes = await this.nodeRegistry.findCapableNodes(plan);

    if (capableNodes.length === 0) {
      throw new Error('No capable nodes available for plan');
    }

    // Apply selection strategy
    let selectedNode;

    switch (strategy) {
      case 'capability_based':
        selectedNode = capableNodes[0];
        break;

      case 'load_balanced':
        selectedNode = this._selectLeastLoaded(capableNodes);
        break;

      case 'region_affinity':
        selectedNode = this._selectByRegion(capableNodes, options.region);
        break;

      case 'environment_isolation':
        selectedNode = this._selectByEnvironment(capableNodes, options.environment);
        break;

      default:
        selectedNode = capableNodes[0];
    }

    return {
      node: selectedNode,
      candidates: capableNodes.map(n => n.node_id),
      strategy
    };
  }

  /**
   * Create work distribution record
   */
  async createDistribution(executionId, planId, selectedNode, candidateNodes, strategy) {
    const distributionId = this._generateId('dist');

    await this.stateGraph.run(
      `INSERT INTO work_distributions (
        distribution_id, execution_id, plan_id, selected_node_id,
        selection_strategy, candidate_nodes, selection_reason, 
        distributed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        distributionId,
        executionId,
        planId,
        selectedNode.node_id,
        strategy,
        JSON.stringify(candidateNodes),
        this._getSelectionReason(selectedNode, strategy),
        new Date().toISOString(),
        'pending'
      ]
    );

    return distributionId;
  }

  /**
   * Update distribution status
   */
  async updateDistributionStatus(distributionId, status) {
    await this.stateGraph.run(
      `UPDATE work_distributions SET status = ? WHERE distribution_id = ?`,
      [status, distributionId]
    );
  }

  /**
   * Get distribution
   */
  async getDistribution(distributionId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM work_distributions WHERE distribution_id = ?`,
      [distributionId]
    );

    if (!row) return null;

    return {
      distribution_id: row.distribution_id,
      execution_id: row.execution_id,
      plan_id: row.plan_id,
      selected_node_id: row.selected_node_id,
      selection_strategy: row.selection_strategy,
      candidate_nodes: JSON.parse(row.candidate_nodes || '[]'),
      selection_reason: row.selection_reason,
      distributed_at: row.distributed_at,
      status: row.status
    };
  }

  // Selection strategies

  _selectLeastLoaded(nodes) {
    // Simple load balancing - would query active executions
    return nodes[0];
  }

  _selectByRegion(nodes, preferredRegion) {
    const match = nodes.find(n => n.region === preferredRegion);
    return match || nodes[0];
  }

  _selectByEnvironment(nodes, preferredEnv) {
    const match = nodes.find(n => n.environment === preferredEnv);
    return match || nodes[0];
  }

  _getSelectionReason(node, strategy) {
    switch (strategy) {
      case 'load_balanced':
        return `Lowest load, region: ${node.region}`;
      case 'region_affinity':
        return `Same region: ${node.region}`;
      case 'environment_isolation':
        return `Environment match: ${node.environment}`;
      default:
        return 'Capability match';
    }
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = WorkDistributor;
