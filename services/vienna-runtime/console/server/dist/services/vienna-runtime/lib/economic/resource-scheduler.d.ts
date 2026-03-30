/**
 * Resource Requirements
 */
export class ResourceRequirements {
    constructor(data: any);
    compute: any;
    memory_mb: any;
    network_bandwidth_mbps: any;
    storage_mb: any;
    estimated_duration_ms: any;
    max_cost: any;
    min_success_probability: any;
}
export namespace STRATEGIES {
    let CHEAPEST: string;
    let FASTEST: string;
    let MOST_RELIABLE: string;
    let BALANCED: string;
}
/**
 * Execution Path
 */
export class ExecutionPath {
    constructor(data: any);
    path_id: any;
    node_id: any;
    estimated_cost: any;
    estimated_latency_ms: any;
    success_probability: any;
    node_load: any;
    compute_available: boolean;
    score: number;
    /**
     * Calculate score based on strategy
     */
    calculateScore(strategy: any, weights?: {}): number;
}
/**
 * Resource-Aware Scheduler
 */
export class ResourceScheduler {
    budgetManager: any;
    /**
     * Schedule an execution
     */
    schedule(plan: any, context?: {}): Promise<{
        scheduled: boolean;
        reason: string;
        paths: any[];
        selected_path?: undefined;
        alternative_paths?: undefined;
        strategy?: undefined;
        total_paths_considered?: undefined;
    } | {
        scheduled: boolean;
        selected_path: any;
        alternative_paths: any;
        strategy: any;
        total_paths_considered: number;
        reason?: undefined;
        paths?: undefined;
    }>;
    /**
     * Get available execution paths
     */
    _getAvailablePaths(plan: any, context: any): Promise<ExecutionPath[]>;
    /**
     * Filter paths by budget
     */
    _filterByBudget(paths: any, context: any): Promise<any[]>;
    /**
     * Filter paths by resource requirements
     */
    _filterByResources(paths: any, resourceReqs: any): any;
    /**
     * Rank paths by strategy
     */
    _rankPaths(paths: any, strategy: any, weights: any): any;
    /**
     * Estimate local execution latency
     */
    _estimateLocalLatency(plan: any): number;
    /**
     * Estimate remote execution latency
     */
    _estimateRemoteLatency(plan: any, node: any): any;
    /**
     * Compare scheduling strategies
     */
    compareStrategies(plan: any, context?: {}): Promise<({
        scheduled: boolean;
        reason: string;
        paths: any[];
        selected_path?: undefined;
        alternative_paths?: undefined;
        strategy: string;
        total_paths_considered?: undefined;
    } | {
        scheduled: boolean;
        selected_path: any;
        alternative_paths: any;
        strategy: any;
        total_paths_considered: number;
        reason?: undefined;
        paths?: undefined;
    })[]>;
}
/**
 * Execution Priority Queue
 */
export class PriorityQueue {
    queue: any[];
    /**
     * Enqueue execution with priority
     */
    enqueue(execution: any, priority?: number): void;
    /**
     * Dequeue next execution
     */
    dequeue(): any;
    /**
     * Peek at next execution without removing
     */
    peek(): any;
    /**
     * Get queue size
     */
    size(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Get total estimated cost in queue
     */
    getTotalCost(): any;
    /**
     * List queue items
     */
    list(): {
        execution_id: any;
        priority: any;
        estimated_cost: any;
        enqueued_at: any;
    }[];
}
export function getResourceScheduler(): any;
//# sourceMappingURL=resource-scheduler.d.ts.map