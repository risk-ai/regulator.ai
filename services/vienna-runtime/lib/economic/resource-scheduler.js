/**
 * Vienna Resource-Aware Scheduler
 * 
 * Schedule executions based on cost, latency, success probability, and resource constraints.
 */

const { getBudgetManager } = require('./cost-model');

/**
 * Resource Requirements
 */
class ResourceRequirements {
  constructor(data) {
    this.compute = data.compute || 'medium'; // light, medium, heavy, intensive
    this.memory_mb = data.memory_mb || 512;
    this.network_bandwidth_mbps = data.network_bandwidth_mbps || 10;
    this.storage_mb = data.storage_mb || 100;
    this.estimated_duration_ms = data.estimated_duration_ms || 5000;
    this.max_cost = data.max_cost || null;
    this.min_success_probability = data.min_success_probability || 0.8;
  }
}

/**
 * Scheduling Strategy
 */
const STRATEGIES = {
  CHEAPEST: 'cheapest',           // Minimize cost
  FASTEST: 'fastest',             // Minimize latency
  MOST_RELIABLE: 'most_reliable', // Maximize success probability
  BALANCED: 'balanced'            // Balance cost, latency, reliability
};

/**
 * Execution Path
 */
class ExecutionPath {
  constructor(data) {
    this.path_id = data.path_id;
    this.node_id = data.node_id;
    this.estimated_cost = data.estimated_cost;
    this.estimated_latency_ms = data.estimated_latency_ms;
    this.success_probability = data.success_probability || 0.95;
    this.node_load = data.node_load || 0.5;
    this.compute_available = data.compute_available !== false;
    this.score = 0;
  }

  /**
   * Calculate score based on strategy
   */
  calculateScore(strategy, weights = {}) {
    const defaultWeights = {
      cost: 0.33,
      latency: 0.33,
      reliability: 0.34
    };

    const w = { ...defaultWeights, ...weights };

    switch (strategy) {
      case STRATEGIES.CHEAPEST:
        this.score = 100 - (this.estimated_cost * 10);
        break;

      case STRATEGIES.FASTEST:
        this.score = 100 - (this.estimated_latency_ms / 100);
        break;

      case STRATEGIES.MOST_RELIABLE:
        this.score = this.success_probability * 100;
        break;

      case STRATEGIES.BALANCED:
        const costScore = 100 - (this.estimated_cost * 10);
        const latencyScore = 100 - (this.estimated_latency_ms / 100);
        const reliabilityScore = this.success_probability * 100;
        this.score = (costScore * w.cost) + (latencyScore * w.latency) + (reliabilityScore * w.reliability);
        break;

      default:
        this.score = this.success_probability * 100;
    }

    // Penalize high node load
    this.score *= (1 - (this.node_load * 0.3));

    // Penalize unavailable compute
    if (!this.compute_available) {
      this.score *= 0.1;
    }

    return this.score;
  }
}

/**
 * Resource-Aware Scheduler
 */
class ResourceScheduler {
  constructor() {
    this.budgetManager = getBudgetManager();
  }

  /**
   * Schedule an execution
   */
  async schedule(plan, context = {}) {
    const strategy = context.strategy || STRATEGIES.BALANCED;
    const resourceReqs = new ResourceRequirements(plan.resource_requirements || {});

    // Get available execution paths
    const paths = await this._getAvailablePaths(plan, context);

    if (paths.length === 0) {
      return {
        scheduled: false,
        reason: 'NO_AVAILABLE_PATHS',
        paths: []
      };
    }

    // Filter by budget
    const affordablePaths = await this._filterByBudget(paths, context);

    if (affordablePaths.length === 0) {
      return {
        scheduled: false,
        reason: 'BUDGET_EXCEEDED',
        paths: paths.map(p => p.toJSON())
      };
    }

    // Filter by resource requirements
    const viablePaths = this._filterByResources(affordablePaths, resourceReqs);

    if (viablePaths.length === 0) {
      return {
        scheduled: false,
        reason: 'NO_VIABLE_PATHS',
        paths: affordablePaths.map(p => p.toJSON())
      };
    }

    // Score and rank paths
    const rankedPaths = this._rankPaths(viablePaths, strategy, context.weights);

    // Select best path
    const selectedPath = rankedPaths[0];

    return {
      scheduled: true,
      selected_path: selectedPath,
      alternative_paths: rankedPaths.slice(1, 3),
      strategy,
      total_paths_considered: paths.length
    };
  }

  /**
   * Get available execution paths
   */
  async _getAvailablePaths(plan, context) {
    const paths = [];

    // Local execution path
    paths.push(new ExecutionPath({
      path_id: 'local',
      node_id: 'local',
      estimated_cost: this.budgetManager.costModel.estimatePlanCost(plan, context),
      estimated_latency_ms: this._estimateLocalLatency(plan),
      success_probability: 0.95,
      node_load: 0.3,
      compute_available: true
    }));

    // Distributed execution paths (if enabled)
    if (context.distributed_nodes) {
      for (const node of context.distributed_nodes) {
        if (node.status === 'active') {
          paths.push(new ExecutionPath({
            path_id: `remote_${node.node_id}`,
            node_id: node.node_id,
            estimated_cost: this.budgetManager.costModel.estimatePlanCost(plan, context) * 1.2, // Remote overhead
            estimated_latency_ms: this._estimateRemoteLatency(plan, node),
            success_probability: node.health_score || 0.9,
            node_load: node.load || 0.5,
            compute_available: node.compute_available !== false
          }));
        }
      }
    }

    return paths;
  }

  /**
   * Filter paths by budget
   */
  async _filterByBudget(paths, context) {
    const affordablePaths = [];

    for (const path of paths) {
      const affordability = await this.budgetManager.checkAffordability(
        { compute_class: 'compute:medium', estimated_tokens: 1000 },
        { ...context, estimated_cost: path.estimated_cost }
      );

      if (affordability.affordable) {
        affordablePaths.push(path);
      }
    }

    return affordablePaths;
  }

  /**
   * Filter paths by resource requirements
   */
  _filterByResources(paths, resourceReqs) {
    return paths.filter(path => {
      // Check max cost constraint
      if (resourceReqs.max_cost !== null && path.estimated_cost > resourceReqs.max_cost) {
        return false;
      }

      // Check minimum success probability
      if (path.success_probability < resourceReqs.min_success_probability) {
        return false;
      }

      // Check compute availability
      if (!path.compute_available) {
        return false;
      }

      return true;
    });
  }

  /**
   * Rank paths by strategy
   */
  _rankPaths(paths, strategy, weights) {
    for (const path of paths) {
      path.calculateScore(strategy, weights);
    }

    return paths.sort((a, b) => b.score - a.score);
  }

  /**
   * Estimate local execution latency
   */
  _estimateLocalLatency(plan) {
    const stepCount = plan.steps ? plan.steps.length : 1;
    const baseLatency = 500; // ms per step
    return stepCount * baseLatency;
  }

  /**
   * Estimate remote execution latency
   */
  _estimateRemoteLatency(plan, node) {
    const localLatency = this._estimateLocalLatency(plan);
    const networkLatency = node.network_latency_ms || 100;
    return localLatency + networkLatency;
  }

  /**
   * Compare scheduling strategies
   */
  async compareStrategies(plan, context = {}) {
    const strategies = [
      STRATEGIES.CHEAPEST,
      STRATEGIES.FASTEST,
      STRATEGIES.MOST_RELIABLE,
      STRATEGIES.BALANCED
    ];

    const results = [];

    for (const strategy of strategies) {
      const result = await this.schedule(plan, { ...context, strategy });
      results.push({
        strategy,
        ...result
      });
    }

    return results;
  }
}

/**
 * Execution Priority Queue
 */
class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  /**
   * Enqueue execution with priority
   */
  enqueue(execution, priority = 5) {
    const item = {
      execution,
      priority,
      enqueued_at: new Date().toISOString(),
      estimated_cost: execution.estimated_cost || 0
    };

    this.queue.push(item);
    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by enqueue time (FIFO within same priority)
      return new Date(a.enqueued_at) - new Date(b.enqueued_at);
    });
  }

  /**
   * Dequeue next execution
   */
  dequeue() {
    return this.queue.shift();
  }

  /**
   * Peek at next execution without removing
   */
  peek() {
    return this.queue[0];
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Get total estimated cost in queue
   */
  getTotalCost() {
    return this.queue.reduce((sum, item) => sum + item.estimated_cost, 0);
  }

  /**
   * List queue items
   */
  list() {
    return this.queue.map(item => ({
      execution_id: item.execution.execution_id,
      priority: item.priority,
      estimated_cost: item.estimated_cost,
      enqueued_at: item.enqueued_at
    }));
  }
}

/**
 * Global scheduler instance
 */
let globalScheduler = null;

function getResourceScheduler() {
  if (!globalScheduler) {
    globalScheduler = new ResourceScheduler();
  }
  return globalScheduler;
}

module.exports = {
  ResourceRequirements,
  STRATEGIES,
  ExecutionPath,
  ResourceScheduler,
  PriorityQueue,
  getResourceScheduler
};
