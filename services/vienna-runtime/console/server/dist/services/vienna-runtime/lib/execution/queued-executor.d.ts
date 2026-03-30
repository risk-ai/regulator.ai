export class QueuedExecutor {
    constructor(viennaCore: any, options?: {});
    viennaCore: any;
    executor: Executor;
    queue: ExecutionQueue;
    recursionGuard: RecursionGuard;
    replayLog: any;
    executionControl: ExecutionControl;
    rateLimiter: RateLimiter;
    agentBudget: AgentBudget;
    deadLetterQueue: DeadLetterQueue;
    failureClassifier: FailureClassifier;
    executorHealth: ExecutorHealth;
    integrityChecker: IntegrityChecker;
    configSnapshot: ConfigSnapshot;
    retryPolicy: RetryPolicy;
    maxConcurrency: any;
    currentExecutions: number;
    metricsEnabled: boolean;
    executionMetrics: ExecutionMetrics;
    executing: boolean;
    objectiveTracker: ObjectiveTracker;
    lineageValidator: LineageValidator;
    timeoutPolicy: any;
    eventEmitter: ViennaEventEmitter;
    /**
     * Initialize queued executor
     */
    initialize(): Promise<void>;
    /**
     * Register adapter for action type
     */
    registerAdapter(actionType: any, adapter: any): void;
    /**
     * Connect event stream for real-time observability (Phase 5A)
     *
     * @param {object} eventStream - ViennaEventStream instance
     */
    connectEventStream(eventStream: object): void;
    /**
     * Submit envelope for execution
     *
     * Validates via rate limiter, agent budget, recursion guard, then enqueues.
     *
     * @param {object} envelope - Envelope to execute
     * @returns {Promise<object>} Queue submission result
     */
    submit(envelope: object): Promise<object>;
    /**
     * Execute next envelope from queue
     *
     * Internal method called by execution loop.
     */
    executeNext(): Promise<any>;
    /**
     * Process queue until empty
     *
     * For testing and batch processing.
     */
    processQueue(): Promise<number>;
    /**
     * Get queue state
     */
    getQueueState(): {
        total: number;
        queued: number;
        executing: number;
        completed: number;
        failed: number;
        blocked: number;
    };
    /**
     * Get recursion guard state
     */
    getRecursionState(): {
        trigger_budgets: any;
        active_cooldowns: {
            target: any;
            envelope_id: any;
            age_seconds: number;
        }[];
        cached_idempotency_keys: number;
    };
    /**
     * Get execution control state (Phase 7.4 Stage 1)
     */
    getExecutionControlState(): any;
    /**
     * Get rate limiter state (Phase 7.4 Stage 2)
     */
    getRateLimiterState(): object;
    /**
     * Get agent budget state (Phase 7.4 Stage 2)
     */
    getAgentBudgetState(): object;
    /**
     * Get dead letter queue entries (Phase 7.4 Stage 3)
     *
     * @param {object} filters - Optional filters
     * @returns {Array<object>} Dead letter entries
     */
    getDeadLetters(filters?: object): Array<object>;
    /**
     * Get dead letter queue statistics (Phase 7.4 Stage 3)
     *
     * @returns {object} DLQ stats
     */
    getDeadLetterStats(): object;
    /**
     * Requeue dead-lettered envelope (Phase 7.4 Stage 3)
     *
     * Explicit operator action to return failed envelope to execution queue.
     * Bypasses admission checks since this is an explicit operator override.
     *
     * @param {string} envelopeId - Envelope to requeue
     * @returns {Promise<object>} Requeue result
     */
    requeueDeadLetter(envelopeId: string): Promise<object>;
    /**
     * Cancel dead-lettered envelope (Phase 7.4 Stage 3)
     *
     * Explicit operator action to permanently cancel failed envelope.
     * Entry remains for audit but no further execution allowed.
     *
     * @param {string} envelopeId - Envelope to cancel
     * @returns {Promise<object>} Updated entry
     */
    cancelDeadLetter(envelopeId: string): Promise<object>;
    /**
     * Pause execution (Phase 7.4 Stage 1)
     */
    pauseExecution(reason: any, pausedBy?: string): any;
    /**
     * Resume execution (Phase 7.4)
     */
    resumeExecution(): any;
    /**
     * Get health status (Phase 7.4 Stage 4)
     *
     * @returns {object} Health report
     */
    getHealth(): object;
    /**
     * Check system integrity (Phase 7.4 Stage 4)
     *
     * @param {object} viennaCore - Optional Vienna core for deeper checks
     * @returns {object} Integrity report
     */
    checkIntegrity(viennaCore?: object): object;
    /**
     * Get operational metrics (Phase 7.4 Stage 5)
     *
     * @returns {object} Comprehensive metrics snapshot
     */
    getMetrics(): object;
    /**
     * Get formatted metrics summary (Phase 7.4 Stage 5)
     *
     * @returns {string} Human-readable metrics
     */
    getMetricsSummary(): string;
    /**
     * Capture config snapshot before mutation (Phase 7.4 Stage 5)
     *
     * @param {string} configPath - Config file path
     * @param {string} envelopeId - Envelope performing mutation
     * @returns {Promise<object>} Snapshot metadata
     */
    captureConfigSnapshot(configPath: string, envelopeId: string): Promise<object>;
    /**
     * List config snapshots (Phase 7.4 Stage 5)
     *
     * @param {string} configPath - Optional config path filter
     * @param {number} limit - Max snapshots to return
     * @returns {Promise<Array>} Snapshot list
     */
    listConfigSnapshots(configPath?: string, limit?: number): Promise<any[]>;
    /**
     * Cleanup (periodic maintenance)
     */
    cleanup(): Promise<void>;
    /**
     * Get objective progress (Phase 3D)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Progress metrics
     */
    getObjectiveProgress(objectiveId: string): object | null;
    /**
     * Get all objectives with filter (Phase 3D)
     *
     * @param {object} filter - Optional filter ({ status, limit })
     * @returns {array} Objectives
     */
    getObjectives(filter?: object): any[];
    /**
     * Get objective tracker statistics (Phase 3D)
     *
     * @returns {object} Stats summary
     */
    getObjectiveStats(): object;
    /**
     * Validate lineage integrity (Phase 3E)
     *
     * @returns {object} Validation report
     */
    validateLineage(): object;
    /**
     * Get envelope lineage chain (Phase 3E)
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {array} Lineage chain (root → target)
     */
    getEnvelopeLineage(envelopeId: string): any[];
    /**
     * Get objective fanout tree (Phase 3E)
     *
     * Builds hierarchical tree structure from lineage validator.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Tree structure
     */
    getObjectiveTree(objectiveId: string): object | null;
    /**
     * Phase 4A: Get timeout for envelope based on execution class
     */
    _getTimeoutForEnvelope(envelope: any): any;
    /**
     * Phase 4A: Execute with timeout protection
     *
     * Wraps executor.execute() with a timeout timer.
     * If timeout fires, abort execution and move to DLQ.
     */
    _executeWithTimeout(envelope: any, startTime: any): Promise<any>;
    /**
     * Phase 4A: Handle execution timeout
     *
     * Emits timeout events to replay, audit, and objective tracker.
     */
    _handleExecutionTimeout(envelope: any, timeoutMs: any, durationMs: any): Promise<void>;
    /**
     * Trigger execution loop (internal)
     */
    _triggerExecution(): void;
    /**
     * Phase 4E: Get execution metrics
     *
     * @returns {object} Metrics summary
     */
    getExecutionMetrics(): object;
    /**
     * Phase 4E: Get objective execution metrics
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Objective metrics
     */
    getObjectiveExecutionMetrics(objectiveId: string): object | null;
    /**
     * Phase 4E: Get slow executions
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Slow executions
     */
    getSlowExecutions(limit?: number): Array<object>;
    /**
     * Phase 4E: Get timeout executions
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Timeout executions
     */
    getTimeoutExecutions(limit?: number): Array<object>;
    /**
     * Phase 4C: Get retry policy configuration
     *
     * @returns {object} Retry policy config
     */
    getRetryPolicyConfig(): object;
    /**
     * Phase 4B: Get concurrency state
     *
     * @returns {object} Concurrency info
     */
    getConcurrencyState(): object;
}
export class RateLimitError extends Error {
    constructor(reason: any, scope: any, limitType: any);
    scope: any;
    limitType: any;
}
export class BudgetExceededError extends Error {
    constructor(reason: any, agentId: any, limitType: any);
    agentId: any;
    limitType: any;
}
export class ExecutionTimeoutError extends Error {
    constructor(message: any, timeoutMs: any, durationMs: any);
    timeoutMs: any;
    durationMs: any;
    code: string;
}
import { BackpressureError } from "./execution-queue";
import { Executor } from "./executor";
import { ExecutionQueue } from "./execution-queue";
import { RecursionGuard } from "./recursion-guard";
import ExecutionControl = require("./execution-control");
import RateLimiter = require("./rate-limiter");
import AgentBudget = require("./agent-budget");
import { DeadLetterQueue } from "./dead-letter-queue";
import { FailureClassifier } from "./failure-classifier";
import { ExecutorHealth } from "./executor-health";
import { IntegrityChecker } from "./integrity-checker";
import ConfigSnapshot = require("./config-snapshot");
import { RetryPolicy } from "./retry-policy";
import { ExecutionMetrics } from "./execution-metrics";
import { ObjectiveTracker } from "./objective-tracker";
import { LineageValidator } from "./lineage-validator";
import { ViennaEventEmitter } from "../core/event-emitter";
export { BackpressureError };
//# sourceMappingURL=queued-executor.d.ts.map