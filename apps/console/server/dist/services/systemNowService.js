/**
 * System "Now" Service
 * Phase 5E: Operator "Now" View
 *
 * Aggregates current execution state from all observability layers.
 * Answers: What is happening right now? What needs attention?
 */
const DEFAULT_CONFIG = {
    queueCapacityThreshold: 100,
    stalledExecutionMs: 300000, // 5 minutes
    retryLoopThreshold: 3,
    deadLetterGrowthWindow: 3600000, // 1 hour
    failureRateThreshold: 10, // 10%
};
export class SystemNowService {
    viennaRuntime;
    runtimeStats;
    providerHealth;
    objectivesService;
    config;
    recentEvents = [];
    maxEventHistory = 200;
    lastEventAt;
    sseConnected = false;
    constructor(viennaRuntime, runtimeStats, providerHealth, objectivesService, config = DEFAULT_CONFIG) {
        this.viennaRuntime = viennaRuntime;
        this.runtimeStats = runtimeStats;
        this.providerHealth = providerHealth;
        this.objectivesService = objectivesService;
        this.config = config;
        console.log('[SystemNowService] Initialized');
    }
    /**
     * Record SSE connection state
     */
    setSSEConnected(connected) {
        this.sseConnected = connected;
    }
    /**
     * Record activity event
     */
    recordEvent(event) {
        this.recentEvents.unshift(event); // Newest first
        this.lastEventAt = new Date();
        // Trim history
        if (this.recentEvents.length > this.maxEventHistory) {
            this.recentEvents = this.recentEvents.slice(0, this.maxEventHistory);
        }
    }
    /**
     * Get unified "now" snapshot
     */
    async getSystemNow() {
        console.log('[SystemNowService] ========== getSystemNow called ==========');
        const now = new Date();
        const snapshotStart = Date.now();
        // DEBUG: Sequential execution to isolate failures
        console.log('[SystemNowService] Step 1: Getting system state...');
        const systemState = await this.getSystemState();
        console.log('[SystemNowService] System state:', systemState);
        console.log('[SystemNowService] Step 2: Getting queue health...');
        const queueHealth = await this.getQueueHealth();
        console.log('[SystemNowService] Queue health:', queueHealth);
        console.log('[SystemNowService] Step 3: Getting current work...');
        const currentWork = await this.getCurrentWork();
        console.log('[SystemNowService] Current work:', currentWork.length, 'items');
        console.log('[SystemNowService] Step 4: Getting recent failures...');
        const recentFailures = await this.getRecentFailures();
        console.log('[SystemNowService] Recent failures:', recentFailures);
        console.log('[SystemNowService] Step 5: Getting dead letter stats...');
        const deadLetterStats = await this.getDeadLetterStats();
        console.log('[SystemNowService] Dead letters:', deadLetterStats);
        console.log('[SystemNowService] Step 6: Getting provider health...');
        const providerHealthData = await this.getProviderHealthSummary();
        console.log('[SystemNowService] Provider health:', providerHealthData);
        console.log('[SystemNowService] Step 7: Getting attention items...');
        const attentionItems = await this.getAttentionItems();
        console.log('[SystemNowService] Attention items:', attentionItems.length, 'items');
        const snapshotAge = Date.now() - snapshotStart;
        const snapshot = {
            timestamp: now.toISOString(),
            systemState: systemState.state,
            paused: systemState.paused,
            pauseReason: systemState.pauseReason,
            currentActivity: {
                executingEnvelopes: currentWork.length,
                activeObjectives: systemState.activeObjectives,
                queueDepth: queueHealth.depth,
            },
            queueHealth,
            currentWork,
            recentEvents: this.getRecentEventsFiltered(50),
            recentFailures,
            deadLetters: deadLetterStats,
            providerHealth: providerHealthData,
            attention: attentionItems,
            telemetry: {
                live: this.sseConnected,
                lastEventAt: this.lastEventAt?.toISOString(),
                snapshotAge,
                degraded: snapshotAge > 5000, // Degraded only if snapshot is slow (>5s)
            },
        };
        console.log('[SystemNowService] Final snapshot:', {
            systemState: snapshot.systemState,
            paused: snapshot.paused,
            queueDepth: snapshot.currentActivity.queueDepth,
            recentFailures: snapshot.recentFailures?.count
        });
        return snapshot;
    }
    /**
     * Get recent events with optional filtering
     */
    getRecentEventsFiltered(limit = 50, failuresOnly = false) {
        let events = this.recentEvents;
        if (failuresOnly) {
            events = events.filter(e => e.type.includes('failed') ||
                e.severity === 'critical' ||
                e.type === 'alert.created');
        }
        return events.slice(0, limit);
    }
    /**
     * Get system state
     */
    async getSystemState() {
        try {
            const status = await this.viennaRuntime.getSystemStatus();
            return {
                state: this.deriveSystemState(status),
                paused: status.paused || false,
                pauseReason: status.pauseReason,
                activeObjectives: status.activeObjectives || 0,
            };
        }
        catch (error) {
            console.error('[SystemNowService] Error getting system state:', error);
            return {
                state: 'degraded',
                paused: false,
                activeObjectives: 0,
            };
        }
    }
    /**
     * Derive system state from runtime status
     */
    deriveSystemState(status) {
        // Simple heuristic - can be enhanced
        if (status.paused)
            return 'degraded';
        if (status.blocked > 10)
            return 'degraded';
        if (status.deadLetterCount > 20)
            return 'degraded';
        return 'healthy';
    }
    /**
     * Get queue health snapshot
     */
    async getQueueHealth() {
        try {
            const stats = await this.runtimeStats.getRuntimeStats('5m');
            const queue = stats.queue;
            const nearCapacity = queue.depth > this.config.queueCapacityThreshold;
            const healthy = !nearCapacity && queue.blocked < 5;
            return {
                depth: queue.depth,
                executing: queue.executing,
                blocked: queue.blocked,
                retryWait: queue.retryWait,
                nearCapacity,
                healthy,
            };
        }
        catch (error) {
            console.error('[SystemNowService] Error getting queue health:', error);
            return {
                depth: 0,
                executing: 0,
                blocked: 0,
                retryWait: 0,
                nearCapacity: false,
                healthy: false,
            };
        }
    }
    /**
     * Get currently executing work
     */
    async getCurrentWork() {
        try {
            const executing = await this.viennaRuntime.getExecutingEnvelopes();
            const now = Date.now();
            return executing.map(env => {
                const startedAt = new Date(env.startedAt || env.queuedAt).getTime();
                const runtimeMs = now - startedAt;
                const stalled = runtimeMs > this.config.stalledExecutionMs;
                return {
                    objectiveId: env.objectiveId,
                    objectiveName: env.objectiveName || env.objectiveId,
                    envelopeId: env.envelopeId,
                    provider: env.provider,
                    adapter: env.adapter,
                    runtimeMs,
                    attempt: env.attempt || 1,
                    maxAttempts: env.maxAttempts || 3,
                    stalled,
                    blocked: env.state === 'blocked',
                    startedAt: env.startedAt || env.queuedAt,
                };
            });
        }
        catch (error) {
            console.error('[SystemNowService] Error getting current work:', error);
            return [];
        }
    }
    /**
     * Get recent failures
     */
    async getRecentFailures() {
        try {
            const stats = await this.runtimeStats.getRuntimeStats('5m');
            const failures = await this.viennaRuntime.getRecentFailures(20);
            // Aggregate error messages
            const errorCounts = new Map();
            const uniqueEnvelopes = new Set();
            for (const failure of failures) {
                uniqueEnvelopes.add(failure.envelopeId);
                const errorKey = failure.error?.substring(0, 100) || 'Unknown error';
                const existing = errorCounts.get(errorKey);
                if (existing) {
                    existing.count++;
                    if (failure.failedAt > existing.lastSeen) {
                        existing.lastSeen = failure.failedAt;
                    }
                }
                else {
                    errorCounts.set(errorKey, {
                        count: 1,
                        lastSeen: failure.failedAt,
                    });
                }
            }
            // Top 5 errors
            const topErrors = Array.from(errorCounts.entries())
                .map(([error, data]) => ({ error, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            return {
                count: failures.length,
                uniqueEnvelopes: uniqueEnvelopes.size,
                failureRate: 100 - stats.execution.successRate,
                topErrors,
            };
        }
        catch (error) {
            console.error('[SystemNowService] Error getting recent failures:', error);
            return {
                count: 0,
                uniqueEnvelopes: 0,
                failureRate: 0,
                topErrors: [],
            };
        }
    }
    /**
     * Get dead letter statistics
     */
    async getDeadLetterStats() {
        try {
            const deadLetters = await this.viennaRuntime.getDeadLetters();
            const oneHourAgo = Date.now() - this.config.deadLetterGrowthWindow;
            const recentCount = deadLetters.filter(dl => {
                const createdAt = new Date(dl.createdAt).getTime();
                return createdAt > oneHourAgo;
            }).length;
            // Growing if >5 added in last hour
            const growing = recentCount > 5;
            return {
                count: deadLetters.length,
                recentCount,
                growing,
            };
        }
        catch (error) {
            console.error('[SystemNowService] Error getting dead letter stats:', error);
            return {
                count: 0,
                recentCount: 0,
                growing: false,
            };
        }
    }
    /**
     * Get provider health summary
     */
    async getProviderHealthSummary() {
        try {
            if (!this.providerHealth) {
                return {
                    healthy: 0,
                    degraded: 0,
                    unavailable: 0,
                    unknown: 0,
                    providers: [],
                };
            }
            const health = await this.providerHealth.getProvidersHealth();
            const providers = Object.values(health.providers);
            const summary = {
                healthy: 0,
                degraded: 0,
                unavailable: 0,
                unknown: 0,
                providers: providers.map(p => ({
                    name: p.provider,
                    state: p.status,
                    lastRequestAt: p.lastSuccessAt || p.lastCheckedAt,
                    failureRate: 100 - p.metrics.successRate,
                })),
            };
            // Count by state
            for (const provider of providers) {
                summary[provider.status]++;
            }
            return summary;
        }
        catch (error) {
            console.error('[SystemNowService] Error getting provider health:', error);
            return {
                healthy: 0,
                degraded: 0,
                unavailable: 0,
                unknown: 0,
                providers: [],
            };
        }
    }
    /**
     * Get attention items
     */
    async getAttentionItems() {
        const items = [];
        try {
            // Check queue capacity
            const queueHealth = await this.getQueueHealth();
            if (queueHealth.nearCapacity) {
                items.push({
                    type: 'queue_capacity',
                    severity: 'warning',
                    title: 'Queue Near Capacity',
                    message: `Queue depth is ${queueHealth.depth}, approaching capacity threshold`,
                    since: new Date().toISOString(),
                    actionable: true,
                });
            }
            // Check for stalled executions
            const currentWork = await this.getCurrentWork();
            const stalledWork = currentWork.filter(w => w.stalled);
            if (stalledWork.length > 0) {
                items.push({
                    type: 'stalled',
                    severity: 'warning',
                    title: `${stalledWork.length} Stalled Execution(s)`,
                    message: `Executions running longer than ${this.config.stalledExecutionMs / 1000}s`,
                    since: stalledWork[0].startedAt,
                    count: stalledWork.length,
                    actionable: true,
                });
            }
            // Check for retry loops
            const retryLoops = currentWork.filter(w => w.attempt > this.config.retryLoopThreshold);
            if (retryLoops.length > 0) {
                items.push({
                    type: 'retry_loop',
                    severity: 'warning',
                    title: `${retryLoops.length} Retry Loop(s)`,
                    message: `Envelopes with >${this.config.retryLoopThreshold} retry attempts`,
                    since: retryLoops[0].startedAt,
                    count: retryLoops.length,
                    objectiveId: retryLoops[0].objectiveId,
                    envelopeId: retryLoops[0].envelopeId,
                    actionable: true,
                });
            }
            // Check dead letter growth
            const deadLetters = await this.getDeadLetterStats();
            if (deadLetters.growing) {
                items.push({
                    type: 'dead_letter',
                    severity: 'critical',
                    title: 'Dead Letters Growing',
                    message: `${deadLetters.recentCount} dead letters added in last hour`,
                    since: new Date(Date.now() - this.config.deadLetterGrowthWindow).toISOString(),
                    count: deadLetters.count,
                    actionable: true,
                });
            }
            // Check degraded providers
            const providerHealth = await this.getProviderHealthSummary();
            if (providerHealth.degraded > 0 || providerHealth.unavailable > 0) {
                const degradedProviders = providerHealth.providers.filter(p => p.state === 'degraded' || p.state === 'unavailable');
                for (const provider of degradedProviders) {
                    items.push({
                        type: 'degraded_provider',
                        severity: provider.state === 'unavailable' ? 'critical' : 'warning',
                        title: `Provider ${provider.name} ${provider.state}`,
                        message: `Failure rate: ${provider.failureRate.toFixed(1)}%`,
                        since: provider.lastRequestAt || new Date().toISOString(),
                        provider: provider.name,
                        actionable: false,
                    });
                }
            }
            // Check failure rate
            const failures = await this.getRecentFailures();
            if (failures.failureRate > this.config.failureRateThreshold) {
                items.push({
                    type: 'alert',
                    severity: 'warning',
                    title: 'High Failure Rate',
                    message: `${failures.failureRate.toFixed(1)}% of recent executions failing`,
                    since: new Date().toISOString(),
                    count: failures.count,
                    actionable: true,
                });
            }
            // Sort by severity (critical first)
            return items.sort((a, b) => {
                const severityOrder = { critical: 0, warning: 1, info: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            });
        }
        catch (error) {
            console.error('[SystemNowService] Error getting attention items:', error);
            return items;
        }
    }
}
//# sourceMappingURL=systemNowService.js.map