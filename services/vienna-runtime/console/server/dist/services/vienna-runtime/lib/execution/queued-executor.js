/**
 * Queued Executor
 *
 * High-level executor that integrates:
 * - Recursion guard (Phase 7.3)
 * - Execution queue (Phase 7.3)
 * - Replay log (Phase 7.3)
 * - Underlying executor (Phase 7.2)
 * - Execution control / kill switch (Phase 7.4)
 */
const { Executor } = require('./executor');
const { ExecutionQueue, QueueState, BackpressureError } = require('./execution-queue');
const { RecursionGuard, RecursionBlockedError } = require('./recursion-guard');
const ExecutionControl = require('./execution-control');
const RateLimiter = require('./rate-limiter');
const AgentBudget = require('./agent-budget');
const { DeadLetterQueue, DLQReason } = require('./dead-letter-queue');
const { FailureClassifier } = require('./failure-classifier');
const { ExecutorHealth } = require('./executor-health');
const { IntegrityChecker } = require('./integrity-checker');
const ConfigSnapshot = require('./config-snapshot');
const OperationalMetrics = require('./operational-metrics');
// Phase 3D/3E: Runtime tracking
const { ObjectiveTracker } = require('./objective-tracker');
const { LineageValidator } = require('./lineage-validator');
// Phase 4C/4E: Retry and metrics
const { RetryPolicy } = require('./retry-policy');
const { ExecutionMetrics } = require('./execution-metrics');
// Phase 5A: Event stream
const { ViennaEventEmitter } = require('../core/event-emitter');
class RateLimitError extends Error {
    constructor(reason, scope, limitType) {
        super(reason);
        this.name = 'RateLimitError';
        this.scope = scope;
        this.limitType = limitType;
    }
}
class BudgetExceededError extends Error {
    constructor(reason, agentId, limitType) {
        super(reason);
        this.name = 'BudgetExceededError';
        this.agentId = agentId;
        this.limitType = limitType;
    }
}
class ExecutionTimeoutError extends Error {
    constructor(message, timeoutMs, durationMs) {
        super(message);
        this.name = 'ExecutionTimeoutError';
        this.timeoutMs = timeoutMs;
        this.durationMs = durationMs;
        this.code = 'EXECUTION_TIMEOUT';
    }
}
class QueuedExecutor {
    constructor(viennaCore, options = {}) {
        this.viennaCore = viennaCore;
        this.executor = new Executor(viennaCore);
        this.queue = new ExecutionQueue(options.queueOptions);
        this.recursionGuard = new RecursionGuard(options.recursionOptions);
        this.replayLog = options.replayLog;
        this.executionControl = new ExecutionControl(options.controlStateDir);
        this.rateLimiter = new RateLimiter(options.rateLimiterPolicy);
        this.agentBudget = new AgentBudget(options.agentBudgetPolicy);
        this.deadLetterQueue = new DeadLetterQueue(options.dlqOptions);
        this.failureClassifier = new FailureClassifier();
        this.executorHealth = new ExecutorHealth(options.healthThresholds);
        this.integrityChecker = new IntegrityChecker();
        this.configSnapshot = new ConfigSnapshot(options.snapshotDir);
        // Phase 4C: Retry policy with exponential backoff
        this.retryPolicy = new RetryPolicy(options.retryPolicy || {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 60000,
            backoffMultiplier: 2
        });
        // Phase 4B: Concurrency control
        this.maxConcurrency = options.concurrency || 5;
        this.currentExecutions = 0;
        // Phase 4E: Execution metrics
        this.metricsEnabled = options.metricsEnabled !== false;
        this.executionMetrics = new ExecutionMetrics(options.metricsOptions);
        this.executing = false;
        // Phase 3D: Objective tracking
        this.objectiveTracker = new ObjectiveTracker();
        // Phase 3E: Lineage validation
        this.lineageValidator = new LineageValidator();
        // Phase 4A: Timeout policy
        this.timeoutPolicy = options.timeoutPolicy || {
            default_timeout_ms: 3600000, // 1 hour for T1
            t2_timeout_ms: 14400000 // 4 hours for T2
        };
        // Phase 5A: Event emitter
        this.eventEmitter = new ViennaEventEmitter({
            enabled: options.eventsEnabled !== false,
            queueCapacity: options.queueOptions?.maxSize || 1000
        });
    }
    /**
     * Initialize queued executor
     */
    async initialize() {
        await this.queue.initialize();
        await this.deadLetterQueue.initialize();
    }
    /**
     * Register adapter for action type
     */
    registerAdapter(actionType, adapter) {
        this.executor.registerAdapter(actionType, adapter);
    }
    /**
     * Connect event stream for real-time observability (Phase 5A)
     *
     * @param {object} eventStream - ViennaEventStream instance
     */
    connectEventStream(eventStream) {
        this.eventEmitter.connect(eventStream);
        // Also connect objective tracker
        if (this.objectiveTracker && this.objectiveTracker.connectEventEmitter) {
            this.objectiveTracker.connectEventEmitter(this.eventEmitter);
        }
    }
    /**
     * Submit envelope for execution
     *
     * Validates via rate limiter, agent budget, recursion guard, then enqueues.
     *
     * @param {object} envelope - Envelope to execute
     * @returns {Promise<object>} Queue submission result
     */
    async submit(envelope) {
        const agentId = envelope.proposed_by || 'unknown';
        // Phase 7.4 Stage 2: Rate limiting check (before queue insertion)
        const rateLimitCheck = this.rateLimiter.checkAdmission(envelope);
        if (!rateLimitCheck.allowed) {
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'rate_limited',
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    agent_id: agentId,
                    reason: rateLimitCheck.reason,
                    scope: rateLimitCheck.scope,
                    limit_type: rateLimitCheck.limit_type
                });
            }
            throw new RateLimitError(rateLimitCheck.reason, rateLimitCheck.scope, rateLimitCheck.limit_type);
        }
        // Phase 7.4 Stage 2: Agent budget check (before queue insertion)
        const budgetCheck = this.agentBudget.checkAdmission(agentId);
        if (!budgetCheck.allowed) {
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'agent_budget_exceeded',
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    agent_id: agentId,
                    reason: budgetCheck.reason,
                    limit_type: budgetCheck.limit_type
                });
            }
            throw new BudgetExceededError(budgetCheck.reason, agentId, budgetCheck.limit_type);
        }
        // Phase 1: Recursion guard validation
        const validation = this.recursionGuard.validate(envelope);
        if (!validation.allowed) {
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'recursion_rejected',
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    trigger_id: envelope.trigger_id,
                    blocked_by: validation.blocked_by,
                    reason: validation.reason,
                    scope: validation.scope
                });
            }
            throw new RecursionBlockedError(validation.reason, validation.blocked_by, validation.scope);
        }
        // Phase 3D: Track envelope on submission
        if (this.objectiveTracker && envelope.objective_id) {
            this.objectiveTracker.trackEnvelope(envelope.envelope_id, envelope.objective_id, 'queued');
        }
        // Phase 3E: Register envelope for lineage tracking
        if (this.lineageValidator) {
            this.lineageValidator.registerEnvelope({
                envelope_id: envelope.envelope_id,
                parent_envelope_id: envelope.parent_envelope_id || null,
                objective_id: envelope.objective_id || null,
                fanout_index: envelope.fanout_index,
                action_type: envelope.envelope_type || envelope.action_type,
            });
        }
        // Phase 2: Enqueue
        const queueId = await this.queue.enqueue(envelope);
        // Record admission in rate limiter and agent budget
        this.rateLimiter.recordAdmission(envelope);
        this.agentBudget.recordQueued(agentId, envelope.envelope_id);
        if (this.replayLog) {
            await this.replayLog.emit({
                event_type: 'envelope_queued',
                envelope_id: envelope.envelope_id,
                queue_id: queueId,
                objective_id: envelope.objective_id,
                trigger_id: envelope.trigger_id,
                causal_depth: envelope.causal_depth
            });
        }
        // Phase 5A: Check queue depth and emit alert if needed
        const queueStats = this.queue.getStats();
        this.eventEmitter.checkQueueDepth(queueStats.queued);
        // Phase 3: Trigger execution loop if not already running
        this._triggerExecution();
        return {
            queued: true,
            queue_id: queueId,
            envelope_id: envelope.envelope_id
        };
    }
    /**
     * Execute next envelope from queue
     *
     * Internal method called by execution loop.
     */
    async executeNext() {
        if (this.executing) {
            return null; // Already executing
        }
        // Phase 4B: Check concurrency limit
        if (this.currentExecutions >= this.maxConcurrency) {
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'execution_blocked_concurrency',
                    current_executions: this.currentExecutions,
                    max_concurrency: this.maxConcurrency,
                    timestamp: new Date().toISOString()
                });
            }
            // Phase 5A: Emit SSE event
            this.eventEmitter.emitEnvelopeEvent('blocked', {
                envelope_id: null,
                objective_id: null,
                reason: 'concurrency_limit',
                current_executions: this.currentExecutions,
                max_concurrency: this.maxConcurrency
            });
            return null; // Concurrency limit reached
        }
        // Phase 7.4: Check execution control (pause state)
        if (this.executionControl.isPaused()) {
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'execution_blocked_paused',
                    reason: this.executionControl.getPauseReason(),
                    timestamp: new Date().toISOString()
                });
            }
            // Phase 5A: Emit SSE event
            this.eventEmitter.emitEnvelopeEvent('blocked', {
                envelope_id: null,
                objective_id: null,
                reason: 'execution_paused',
                pause_reason: this.executionControl.getPauseReason()
            });
            return null; // Execution paused, do not proceed
        }
        const envelope = await this.queue.next();
        if (!envelope) {
            return null; // Queue empty
        }
        // Phase 4D: Check if already executed (idempotency)
        if (this.queue.isAlreadyExecuted(envelope.envelope_id)) {
            const cachedResult = this.queue.getCachedResult(envelope.envelope_id);
            console.log(`[QueuedExecutor] Envelope ${envelope.envelope_id} already executed, returning cached result`);
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'execution_idempotent_skip',
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    cached_result: cachedResult
                });
            }
            // Remove from queue and return cached result
            await this.queue.remove(envelope.envelope_id);
            return cachedResult;
        }
        // Phase 7.4 Stage 2: Check agent execution budget
        const agentId = envelope.proposed_by || 'unknown';
        const executionBudgetCheck = this.agentBudget.checkExecution(agentId);
        if (!executionBudgetCheck.allowed) {
            // Cannot execute now due to agent budget, leave in queue
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'execution_blocked_budget',
                    envelope_id: envelope.envelope_id,
                    agent_id: agentId,
                    reason: executionBudgetCheck.reason,
                    limit_type: executionBudgetCheck.limit_type
                });
            }
            // Phase 5A: Emit SSE event
            this.eventEmitter.emitEnvelopeEvent('blocked', {
                envelope_id: envelope.envelope_id,
                objective_id: envelope.objective_id,
                reason: 'agent_budget',
                agent_id: agentId,
                limit_type: executionBudgetCheck.limit_type
            });
            return null;
        }
        this.executing = true;
        this.currentExecutions++; // Phase 4B: Increment concurrency counter
        // Phase 4E: Start metrics tracking
        let metricsTracking = null;
        if (this.metricsEnabled) {
            const timeoutMs = this._getTimeoutForEnvelope(envelope);
            metricsTracking = this.executionMetrics.recordStart(envelope.envelope_id, envelope.objective_id, timeoutMs);
        }
        try {
            await this.queue.markExecuting(envelope.envelope_id);
            this.agentBudget.recordExecutionStart(agentId, envelope.envelope_id);
            // Phase 3D: Transition to executing
            if (this.objectiveTracker && envelope.objective_id) {
                this.objectiveTracker.transitionEnvelope(envelope.envelope_id, 'queued', 'executing');
            }
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'execution_started', // Phase 4A: consistent event name
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    trigger_id: envelope.trigger_id,
                    execution_class: envelope.execution_class || 'T1',
                    timeout_ms: this._getTimeoutForEnvelope(envelope)
                });
            }
            // Phase 5A: Emit SSE event
            this.eventEmitter.emitEnvelopeEvent('started', {
                envelope_id: envelope.envelope_id,
                objective_id: envelope.objective_id,
                trigger_id: envelope.trigger_id,
                execution_class: envelope.execution_class || 'T1',
                timeout_ms: this._getTimeoutForEnvelope(envelope)
            });
            // Phase 4A: Execute with timeout protection
            const startTime = Date.now();
            const result = await this._executeWithTimeout(envelope, startTime);
            // Phase 4E: Record successful execution
            if (metricsTracking) {
                this.executionMetrics.recordComplete(metricsTracking, 'success');
            }
            // Mark completed in queue
            await this.queue.markCompleted(envelope.envelope_id, result);
            // Phase 3D: Transition to verified
            if (this.objectiveTracker && envelope.objective_id) {
                this.objectiveTracker.transitionEnvelope(envelope.envelope_id, 'executing', 'verified');
            }
            // Record execution in recursion guard
            this.recursionGuard.recordExecution(envelope);
            // Record execution complete in agent budget
            this.agentBudget.recordExecutionComplete(agentId, envelope.envelope_id);
            if (this.replayLog) {
                await this.replayLog.emit({
                    event_type: 'envelope_completed',
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    trigger_id: envelope.trigger_id,
                    result
                });
            }
            // Phase 5A: Emit SSE event
            this.eventEmitter.emitEnvelopeEvent('completed', {
                envelope_id: envelope.envelope_id,
                objective_id: envelope.objective_id,
                trigger_id: envelope.trigger_id,
                result_summary: result?.success ? 'success' : 'completed'
            });
            // Phase 5A.3: Record success for failure rate tracking
            this.eventEmitter.recordExecutionResult(envelope.envelope_id, false);
            this.executing = false;
            this.currentExecutions--; // Phase 4B: Decrement concurrency counter
            return result;
        }
        catch (error) {
            // Phase 4E: Record failed execution in metrics
            if (metricsTracking) {
                const status = (error instanceof ExecutionTimeoutError || error.code === 'EXECUTION_TIMEOUT')
                    ? 'timeout'
                    : 'failed';
                this.executionMetrics.recordComplete(metricsTracking, status);
            }
            await this.queue.markFailed(envelope.envelope_id, error);
            // Record execution complete in agent budget (even on failure)
            this.agentBudget.recordExecutionComplete(agentId, envelope.envelope_id);
            // Phase 3D: Transition to failed
            if (this.objectiveTracker && envelope.objective_id) {
                this.objectiveTracker.transitionEnvelope(envelope.envelope_id, 'executing', 'failed');
            }
            // Phase 4C: Evaluate retry policy
            const queueEntry = this.queue.getEntry(envelope.envelope_id);
            const retryDecision = this.retryPolicy.shouldRetry(envelope, error, queueEntry?.retry_count || 0);
            // Phase 7.4 Stage 3: Classify failure and route to DLQ if needed
            const classification = this.failureClassifier.classify(error);
            let shouldDeadLetter = false;
            let dlqReason = null;
            // Phase 4C: Check retry decision
            if (!retryDecision.shouldRetry) {
                shouldDeadLetter = true;
                // Determine DLQ reason from retry decision
                if (retryDecision.reason === 'execution_timeout') {
                    dlqReason = DLQReason.EXECUTION_TIMEOUT;
                }
                else if (retryDecision.reason === 'permanent_failure') {
                    dlqReason = DLQReason.PERMANENT_FAILURE;
                }
                else if (retryDecision.reason === 'retry_exhausted') {
                    dlqReason = DLQReason.RETRY_EXHAUSTED;
                }
            }
            if (shouldDeadLetter) {
                // Move to dead letter queue
                await this.deadLetterQueue.deadLetter({
                    envelope_id: envelope.envelope_id,
                    envelope: envelope,
                    objective_id: envelope.objective_id,
                    agent_id: agentId,
                    reason: dlqReason,
                    error: error.message,
                    retry_count: queueEntry?.retry_count || 0,
                    last_state: 'failed'
                });
                // Phase 3D: Transition to dead_lettered
                if (this.objectiveTracker && envelope.objective_id) {
                    this.objectiveTracker.transitionEnvelope(envelope.envelope_id, 'failed', 'dead_lettered');
                }
                // Remove from active queue
                await this.queue.remove(envelope.envelope_id);
                if (this.replayLog) {
                    await this.replayLog.emit({
                        event_type: 'envelope_dead_lettered',
                        envelope_id: envelope.envelope_id,
                        objective_id: envelope.objective_id,
                        trigger_id: envelope.trigger_id,
                        reason: dlqReason,
                        error: error.message,
                        classification: classification.category,
                        retry_count: queueEntry?.retry_count || 0
                    });
                }
                // Phase 5A: Emit SSE event
                this.eventEmitter.emitEnvelopeEvent('failed', {
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    trigger_id: envelope.trigger_id,
                    reason: dlqReason,
                    error: error.message,
                    classification: classification.category,
                    retry_count: queueEntry?.retry_count || 0,
                    dead_lettered: true
                });
                // Phase 5A.3: Record permanent failure for failure rate tracking
                this.eventEmitter.recordExecutionResult(envelope.envelope_id, true);
            }
            else {
                // Phase 4C: Transient failure, schedule retry with exponential backoff
                const delayMs = retryDecision.delayMs;
                if (this.replayLog) {
                    await this.replayLog.emit({
                        event_type: 'envelope_retry_scheduled',
                        envelope_id: envelope.envelope_id,
                        objective_id: envelope.objective_id,
                        trigger_id: envelope.trigger_id,
                        error: error.message,
                        error_code: error.code,
                        classification: classification.category,
                        retry_count: queueEntry?.retry_count || 0,
                        retry_attempt: retryDecision.retryAttempt,
                        max_retries: retryDecision.maxRetries,
                        delay_ms: delayMs,
                        will_retry: true
                    });
                }
                // Phase 5A: Emit SSE event
                this.eventEmitter.emitEnvelopeEvent('retried', {
                    envelope_id: envelope.envelope_id,
                    objective_id: envelope.objective_id,
                    trigger_id: envelope.trigger_id,
                    error: error.message,
                    retry_attempt: retryDecision.retryAttempt,
                    max_retries: retryDecision.maxRetries,
                    delay_ms: delayMs
                });
                // Schedule retry with backoff delay
                setTimeout(() => {
                    this._triggerExecution();
                }, delayMs);
            }
            this.executing = false;
            this.currentExecutions--; // Phase 4B: Decrement concurrency counter
            throw error;
        }
    }
    /**
     * Process queue until empty
     *
     * For testing and batch processing.
     */
    async processQueue() {
        let processed = 0;
        let envelope;
        do {
            envelope = await this.executeNext();
            if (envelope) {
                processed++;
            }
        } while (envelope);
        return processed;
    }
    /**
     * Get queue state
     */
    getQueueState() {
        return this.queue.getStats();
    }
    /**
     * Get recursion guard state
     */
    getRecursionState() {
        return this.recursionGuard.getState();
    }
    /**
     * Get execution control state (Phase 7.4 Stage 1)
     */
    getExecutionControlState() {
        return this.executionControl.getExecutionControlState();
    }
    /**
     * Get rate limiter state (Phase 7.4 Stage 2)
     */
    getRateLimiterState() {
        return this.rateLimiter.getState();
    }
    /**
     * Get agent budget state (Phase 7.4 Stage 2)
     */
    getAgentBudgetState() {
        return this.agentBudget.getState();
    }
    /**
     * Get dead letter queue entries (Phase 7.4 Stage 3)
     *
     * @param {object} filters - Optional filters
     * @returns {Array<object>} Dead letter entries
     */
    getDeadLetters(filters = {}) {
        return this.deadLetterQueue.getEntries(filters);
    }
    /**
     * Get dead letter queue statistics (Phase 7.4 Stage 3)
     *
     * @returns {object} DLQ stats
     */
    getDeadLetterStats() {
        return this.deadLetterQueue.getStats();
    }
    /**
     * Requeue dead-lettered envelope (Phase 7.4 Stage 3)
     *
     * Explicit operator action to return failed envelope to execution queue.
     * Bypasses admission checks since this is an explicit operator override.
     *
     * @param {string} envelopeId - Envelope to requeue
     * @returns {Promise<object>} Requeue result
     */
    async requeueDeadLetter(envelopeId) {
        // Get envelope from DLQ
        const { entry, envelope } = await this.deadLetterQueue.requeue(envelopeId);
        if (!envelope) {
            throw new Error(`Cannot requeue ${envelopeId}: envelope data not available`);
        }
        // Reset recursion guard state for this envelope (operator override)
        this.recursionGuard.reset(envelope.envelope_id);
        // Reset agent budget tracking
        const agentId = envelope.proposed_by || 'unknown';
        this.agentBudget.removeEnvelope(agentId, envelope.envelope_id);
        // Enqueue directly (bypass admission checks for operator action)
        const queueId = await this.queue.enqueue(envelope);
        // Record in agent budget
        this.agentBudget.recordQueued(agentId, envelope.envelope_id);
        if (this.replayLog) {
            await this.replayLog.emit({
                event_type: 'dead_letter_requeued',
                envelope_id: envelopeId,
                queue_id: queueId,
                objective_id: envelope.objective_id,
                original_reason: entry.reason,
                requeued_at: entry.requeued_at
            });
        }
        // Trigger execution
        this._triggerExecution();
        return {
            queued: true,
            queue_id: queueId,
            envelope_id: envelope.envelope_id
        };
    }
    /**
     * Cancel dead-lettered envelope (Phase 7.4 Stage 3)
     *
     * Explicit operator action to permanently cancel failed envelope.
     * Entry remains for audit but no further execution allowed.
     *
     * @param {string} envelopeId - Envelope to cancel
     * @returns {Promise<object>} Updated entry
     */
    async cancelDeadLetter(envelopeId) {
        const entry = await this.deadLetterQueue.cancel(envelopeId);
        if (this.replayLog) {
            await this.replayLog.emit({
                event_type: 'dead_letter_cancelled',
                envelope_id: envelopeId,
                objective_id: entry.objective_id,
                original_reason: entry.reason,
                cancelled_at: entry.cancelled_at
            });
        }
        return entry;
    }
    /**
     * Pause execution (Phase 7.4 Stage 1)
     */
    pauseExecution(reason, pausedBy = 'vienna') {
        const result = this.executionControl.pauseExecution(reason, pausedBy);
        if (this.replayLog) {
            this.replayLog.emit({
                event_type: 'execution_paused',
                reason,
                paused_by: pausedBy,
                paused_at: result.paused_at
            }).catch(err => console.error('Failed to log pause event:', err));
        }
        return result;
    }
    /**
     * Resume execution (Phase 7.4)
     */
    resumeExecution() {
        const result = this.executionControl.resumeExecution();
        if (this.replayLog) {
            this.replayLog.emit({
                event_type: 'execution_resumed',
                resumed_at: result.resumed_at
            }).catch(err => console.error('Failed to log resume event:', err));
        }
        // Trigger execution if queue has work
        this._triggerExecution();
        return result;
    }
    /**
     * Get health status (Phase 7.4 Stage 4)
     *
     * @returns {object} Health report
     */
    getHealth() {
        return this.executorHealth.check(this);
    }
    /**
     * Check system integrity (Phase 7.4 Stage 4)
     *
     * @param {object} viennaCore - Optional Vienna core for deeper checks
     * @returns {object} Integrity report
     */
    checkIntegrity(viennaCore = null) {
        return this.integrityChecker.check(this, viennaCore);
    }
    /**
     * Get operational metrics (Phase 7.4 Stage 5)
     *
     * @returns {object} Comprehensive metrics snapshot
     */
    getMetrics() {
        return OperationalMetrics.collect(this);
    }
    /**
     * Get formatted metrics summary (Phase 7.4 Stage 5)
     *
     * @returns {string} Human-readable metrics
     */
    getMetricsSummary() {
        const metrics = this.getMetrics();
        return OperationalMetrics.formatSummary(metrics);
    }
    /**
     * Capture config snapshot before mutation (Phase 7.4 Stage 5)
     *
     * @param {string} configPath - Config file path
     * @param {string} envelopeId - Envelope performing mutation
     * @returns {Promise<object>} Snapshot metadata
     */
    async captureConfigSnapshot(configPath, envelopeId) {
        return await this.configSnapshot.capture(configPath, envelopeId);
    }
    /**
     * List config snapshots (Phase 7.4 Stage 5)
     *
     * @param {string} configPath - Optional config path filter
     * @param {number} limit - Max snapshots to return
     * @returns {Promise<Array>} Snapshot list
     */
    async listConfigSnapshots(configPath = null, limit = 10) {
        return await this.configSnapshot.list(configPath, limit);
    }
    /**
     * Cleanup (periodic maintenance)
     */
    async cleanup() {
        await this.queue.clearCompleted();
        this.recursionGuard.cleanup();
    }
    /**
     * Get objective progress (Phase 3D)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Progress metrics
     */
    getObjectiveProgress(objectiveId) {
        if (!this.objectiveTracker) {
            return null;
        }
        return this.objectiveTracker.getObjective(objectiveId);
    }
    /**
     * Get all objectives with filter (Phase 3D)
     *
     * @param {object} filter - Optional filter ({ status, limit })
     * @returns {array} Objectives
     */
    getObjectives(filter = {}) {
        if (!this.objectiveTracker) {
            return [];
        }
        return this.objectiveTracker.listObjectives(filter);
    }
    /**
     * Get objective tracker statistics (Phase 3D)
     *
     * @returns {object} Stats summary
     */
    getObjectiveStats() {
        if (!this.objectiveTracker) {
            return {
                total_objectives: 0,
                by_status: {},
                envelope_totals: { total: 0, queued: 0, executing: 0, verified: 0, failed: 0 }
            };
        }
        return this.objectiveTracker.getStats();
    }
    /**
     * Validate lineage integrity (Phase 3E)
     *
     * @returns {object} Validation report
     */
    validateLineage() {
        if (!this.lineageValidator) {
            return { valid: true, issues: [], message: 'Lineage validation disabled' };
        }
        return this.lineageValidator.validate();
    }
    /**
     * Get envelope lineage chain (Phase 3E)
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {array} Lineage chain (root → target)
     */
    getEnvelopeLineage(envelopeId) {
        if (!this.lineageValidator) {
            return [];
        }
        return this.lineageValidator.getLineage(envelopeId);
    }
    /**
     * Get objective fanout tree (Phase 3E)
     *
     * Builds hierarchical tree structure from lineage validator.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Tree structure
     */
    getObjectiveTree(objectiveId) {
        if (!this.lineageValidator) {
            return null;
        }
        // Get all envelopes for objective
        const allEnvelopes = Array.from(this.lineageValidator.envelopes.values());
        const objectiveEnvelopes = allEnvelopes.filter(env => env.objective_id === objectiveId);
        if (objectiveEnvelopes.length === 0) {
            return null;
        }
        // Find roots (envelopes with no parent)
        const roots = objectiveEnvelopes.filter(env => !env.parent_envelope_id);
        // Recursive tree builder
        const buildTree = (envelope) => {
            const children = this.lineageValidator.getChildren(envelope.envelope_id);
            return {
                envelope_id: envelope.envelope_id,
                fanout_index: envelope.fanout_index,
                action_type: envelope.action_type,
                children: children.map(child => {
                    const childEnv = this.lineageValidator.envelopes.get(child.envelope_id);
                    return buildTree(childEnv);
                }),
            };
        };
        return {
            objective_id: objectiveId,
            envelope_count: objectiveEnvelopes.length,
            roots: roots.map(buildTree),
        };
    }
    /**
     * Phase 4A: Get timeout for envelope based on execution class
     */
    _getTimeoutForEnvelope(envelope) {
        // Explicit timeout on envelope takes precedence
        if (envelope.timeout !== undefined) {
            return envelope.timeout;
        }
        // T2 execution class gets extended timeout
        if (envelope.execution_class === 'T2') {
            return this.timeoutPolicy.t2_timeout_ms;
        }
        // Default T1 timeout (1 hour)
        return this.timeoutPolicy.default_timeout_ms;
    }
    /**
     * Phase 4A: Execute with timeout protection
     *
     * Wraps executor.execute() with a timeout timer.
     * If timeout fires, abort execution and move to DLQ.
     */
    async _executeWithTimeout(envelope, startTime) {
        const timeoutMs = this._getTimeoutForEnvelope(envelope);
        return new Promise((resolve, reject) => {
            let timeoutFired = false;
            let executionComplete = false;
            // Set timeout timer
            const timer = setTimeout(async () => {
                timeoutFired = true;
                if (!executionComplete) {
                    const duration = Date.now() - startTime;
                    const timeoutError = new ExecutionTimeoutError(`Execution exceeded timeout of ${timeoutMs}ms (took ${duration}ms)`, timeoutMs, duration);
                    // Emit timeout events
                    await this._handleExecutionTimeout(envelope, timeoutMs, duration);
                    reject(timeoutError);
                }
            }, timeoutMs);
            // Execute envelope
            this.executor.execute(envelope)
                .then(result => {
                executionComplete = true;
                clearTimeout(timer);
                if (!timeoutFired) {
                    resolve(result);
                }
                // If timeout already fired, ignore result (race condition)
            })
                .catch(error => {
                executionComplete = true;
                clearTimeout(timer);
                if (!timeoutFired) {
                    reject(error);
                }
                // If timeout already fired, ignore error (race condition)
            });
        });
    }
    /**
     * Phase 4A: Handle execution timeout
     *
     * Emits timeout events to replay, audit, and objective tracker.
     */
    async _handleExecutionTimeout(envelope, timeoutMs, durationMs) {
        // Emit to replay log
        if (this.replayLog) {
            await this.replayLog.emit({
                event_type: 'execution_timeout',
                envelope_id: envelope.envelope_id,
                objective_id: envelope.objective_id,
                trigger_id: envelope.trigger_id,
                timeout_ms: timeoutMs,
                duration_ms: durationMs,
                execution_class: envelope.execution_class || 'T1',
                timestamp: new Date().toISOString()
            });
        }
        // Phase 5A: Emit SSE event
        this.eventEmitter.emitEnvelopeEvent('timeout', {
            envelope_id: envelope.envelope_id,
            objective_id: envelope.objective_id,
            trigger_id: envelope.trigger_id,
            timeout_ms: timeoutMs,
            duration_ms: durationMs,
            execution_class: envelope.execution_class || 'T1'
        });
        // Emit to audit
        if (this.viennaCore?.audit) {
            await this.viennaCore.audit.emit({
                event_type: 'execution_timeout',
                envelope_id: envelope.envelope_id,
                objective_id: envelope.objective_id,
                timeout_ms: timeoutMs,
                duration_ms: durationMs,
                timestamp: new Date().toISOString()
            });
        }
        // Update objective metrics
        if (this.objectiveTracker && envelope.objective_id) {
            this.objectiveTracker.transitionEnvelope(envelope.envelope_id, 'executing', 'failed');
        }
    }
    /**
     * Trigger execution loop (internal)
     */
    _triggerExecution() {
        if (this.executing) {
            return; // Already running
        }
        // Phase 4B: Check if we can start more executions (concurrency limit)
        if (this.currentExecutions >= this.maxConcurrency) {
            return; // At concurrency limit
        }
        // Start execution loop in background
        setImmediate(async () => {
            try {
                await this.executeNext();
                // Check if more work
                const stats = this.queue.getStats();
                if (stats.queued > 0 && this.currentExecutions < this.maxConcurrency) {
                    this._triggerExecution();
                }
            }
            catch (error) {
                console.error('Execution loop error:', error);
                this.executing = false;
            }
        });
    }
    /**
     * Phase 4E: Get execution metrics
     *
     * @returns {object} Metrics summary
     */
    getExecutionMetrics() {
        if (!this.metricsEnabled) {
            return { enabled: false };
        }
        return this.executionMetrics.getGlobalMetrics();
    }
    /**
     * Phase 4E: Get objective execution metrics
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Objective metrics
     */
    getObjectiveExecutionMetrics(objectiveId) {
        if (!this.metricsEnabled) {
            return null;
        }
        return this.executionMetrics.getObjectiveMetrics(objectiveId);
    }
    /**
     * Phase 4E: Get slow executions
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Slow executions
     */
    getSlowExecutions(limit = 10) {
        if (!this.metricsEnabled) {
            return [];
        }
        return this.executionMetrics.getSlowExecutions(limit);
    }
    /**
     * Phase 4E: Get timeout executions
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Timeout executions
     */
    getTimeoutExecutions(limit = 10) {
        if (!this.metricsEnabled) {
            return [];
        }
        return this.executionMetrics.getTimeouts(limit);
    }
    /**
     * Phase 4C: Get retry policy configuration
     *
     * @returns {object} Retry policy config
     */
    getRetryPolicyConfig() {
        return this.retryPolicy.getConfig();
    }
    /**
     * Phase 4B: Get concurrency state
     *
     * @returns {object} Concurrency info
     */
    getConcurrencyState() {
        return {
            current_executions: this.currentExecutions,
            max_concurrency: this.maxConcurrency,
            available_slots: Math.max(0, this.maxConcurrency - this.currentExecutions)
        };
    }
}
module.exports = { QueuedExecutor, RateLimitError, BudgetExceededError, ExecutionTimeoutError, BackpressureError };
//# sourceMappingURL=queued-executor.js.map