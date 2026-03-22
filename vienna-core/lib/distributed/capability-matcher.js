/**
 * Capability Matcher
 * 
 * Match execution requirements to node capabilities
 * Real implementation for distributed execution
 * 
 * Phase 19 Operationalization - Step 2
 */

class CapabilityMatcher {
  constructor(nodeRegistry) {
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Find nodes capable of executing plan
   * 
   * @param {Object} plan - Execution plan
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} Capable nodes ranked by suitability
   */
  async findCapableNodes(plan, options = {}) {
    const {
      excludeNodes = [],
      requireOnline = true,
      minHealthScore = 0.5
    } = options;

    // Get all nodes
    const allNodes = await this.nodeRegistry.listNodes({ status: requireOnline ? 'online' : undefined });

    // Filter by exclusion
    let candidates = allNodes.filter(n => !excludeNodes.includes(n.node_id));

    // Extract requirements from plan
    const requirements = this._extractRequirements(plan);

    // Filter by capability match
    candidates = candidates.filter(node => {
      return this._matchesRequirements(node, requirements);
    });

    // Filter by health score
    if (minHealthScore > 0) {
      candidates = candidates.filter(node => {
        const healthScore = this._calculateHealthScore(node);
        return healthScore >= minHealthScore;
      });
    }

    // Rank by suitability
    candidates = this._rankNodes(candidates, requirements);

    return candidates;
  }

  /**
   * Check if node matches all requirements
   */
  _matchesRequirements(node, requirements) {
    if (!node.capabilities || node.capabilities.length === 0) {
      return false;
    }

    for (const req of requirements) {
      const hasCapability = node.capabilities.some(cap => {
        // Check action type match
        if (cap.action_type !== req.action_type) {
          return false;
        }

        // Check target support
        if (!cap.supported_targets) {
          return false;
        }

        if (cap.supported_targets.includes('*')) {
          return true; // Wildcard support
        }

        if (cap.supported_targets.includes(req.target_id)) {
          return true;
        }

        // Check prefix match (e.g., "service:*" matches "service:gateway")
        const prefixMatch = cap.supported_targets.find(t => {
          if (!t.endsWith(':*')) return false;
          const prefix = t.slice(0, -2);
          return req.target_id.startsWith(prefix);
        });

        return !!prefixMatch;
      });

      if (!hasCapability) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract requirements from plan
   */
  _extractRequirements(plan) {
    const requirements = [];

    for (const step of plan.steps || []) {
      if (step.action) {
        requirements.push({
          action_type: step.action.action_id,
          target_id: step.action.entities?.service || step.action.entities?.target_id || 'unknown'
        });
      }
    }

    return requirements;
  }

  /**
   * Calculate node health score
   */
  _calculateHealthScore(node) {
    let score = 1.0;

    // Penalize high load
    if (node.load && node.load.cpu_percent) {
      if (node.load.cpu_percent > 80) score *= 0.5;
      else if (node.load.cpu_percent > 60) score *= 0.7;
    }

    // Penalize high queue depth
    if (node.queue_depth > 10) score *= 0.6;
    else if (node.queue_depth > 5) score *= 0.8;

    // Penalize low success rate
    if (node.success_rate !== undefined) {
      score *= node.success_rate;
    }

    // Penalize if degraded
    if (node.status === 'degraded') score *= 0.5;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Rank nodes by suitability
   */
  _rankNodes(nodes, requirements) {
    return nodes
      .map(node => ({
        node,
        score: this._calculateSuitabilityScore(node, requirements)
      }))
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.node);
  }

  /**
   * Calculate suitability score
   */
  _calculateSuitabilityScore(node, requirements) {
    let score = this._calculateHealthScore(node);

    // Prefer nodes with exact capability matches (not wildcards)
    const exactMatches = requirements.filter(req => {
      return node.capabilities?.some(cap =>
        cap.action_type === req.action_type &&
        cap.supported_targets?.includes(req.target_id)
      );
    });

    score += exactMatches.length * 0.1;

    // Prefer nodes with lower latency
    if (node.latency_ms) {
      const latencyPenalty = Math.min(1, node.latency_ms / 1000);
      score *= (1 - latencyPenalty * 0.2);
    }

    return score;
  }

  /**
   * Negotiate capabilities with remote node
   */
  async negotiateCapabilities(node) {
    const { HTTPTransport } = require('./http-transport');
    const transport = new HTTPTransport();

    try {
      const capabilities = await transport.negotiateCapabilities(node);
      
      // Update node registry with fresh capabilities
      await this.nodeRegistry.updateNode(node.node_id, {
        capabilities: capabilities.capabilities,
        version: capabilities.version,
        supported_features: capabilities.supported_features,
        last_capability_check: new Date().toISOString()
      });

      return capabilities;
    } catch (err) {
      console.error(`Capability negotiation failed for ${node.node_id}:`, err.message);
      
      // Mark node as degraded if negotiation fails
      await this.nodeRegistry.updateNode(node.node_id, {
        status: 'degraded',
        degraded_reason: 'Capability negotiation failed'
      });

      throw err;
    }
  }
}

module.exports = { CapabilityMatcher };
