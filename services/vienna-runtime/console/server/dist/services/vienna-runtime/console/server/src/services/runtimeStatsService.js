/**
 * Runtime Stats Service
 * Phase 5C: Runtime Statistics Surface
 *
 * Aggregates system-wide execution metrics for operator visibility.
 * Calculates rolling time windows, latency percentiles, and provider health.
 */
export class RuntimeStatsService {
    viennaRuntime;
    providerManager;
    executionHistory = [];
    maxHistorySize = 10000;
    constructor(viennaRuntime, providerManager) {
        this.viennaRuntime = viennaRuntime;
        this.providerManager = providerManager;
        console.log('[RuntimeStatsService] Initialized');
    }
    /**
     * Get runtime statistics for time window
     */
    async getRuntimeStats(timeWindow = '5m') {
        const now = new Date();
        const windowMs = this.getWindowMs(timeWindow);
        const degradedReasons = [];
        // Gather stats from various sources
        const [queueStats, executionStats, latencyStats, objectiveStats, providerStats,] = await Promise.all([
            this.getQueueStats().catch(err => {
                console.error('[RuntimeStatsService] Queue stats error:', err);
                degradedReasons.push('Queue stats unavailable');
                return null;
            }),
            this.getExecutionStats(windowMs).catch(err => {
                console.error('[RuntimeStatsService] Execution stats error:', err);
                degradedReasons.push('Execution stats unavailable');
                return null;
            }),
            this.getLatencyStats(windowMs).catch(err => {
                console.error('[RuntimeStatsService] Latency stats error:', err);
                degradedReasons.push('Latency stats unavailable');
                return null;
            }),
            this.getObjectiveStats().catch(err => {
                console.error('[RuntimeStatsService] Objective stats error:', err);
                degradedReasons.push('Objective stats unavailable');
                return null;
            }),
            this.getProviderStats(windowMs).catch(err => {
                console.error('[RuntimeStatsService] Provider stats error:', err);
                degradedReasons.push('Provider stats unavailable');
                return null;
            }),
        ]);
        const stats = {
            timestamp: now.toISOString(),
            timeWindow,
            queue: queueStats || this.emptyQueueStats(),
            execution: executionStats || this.emptyExecutionStats(),
            latency: latencyStats || this.emptyLatencyStats(),
            objectives: objectiveStats || this.emptyObjectiveStats(),
            providers: providerStats || {},
            degraded: degradedReasons.length > 0,
            degradedReasons: degradedReasons.length > 0 ? degradedReasons : undefined,
        };
        return stats;
    }
    /**
     * Get queue statistics (current snapshot)
     */
    async getQueueStats() {
        const queueState = await this.viennaRuntime.getQueueState();
        // Phase 5E: Align with Vienna Core queue state fields
        const depth = queueState.queued || 0; // queued count is the depth
        const executing = queueState.executing || 0;
        const blocked = queueState.blocked || 0;
        return {
            depth,
            queued: depth, // Same as depth
            executing,
            retryWait: 0, // Not tracked separately, would be in queued
            blocked,
        };
    }
    /**
     * Get execution statistics (rolling window)
     */
    async getExecutionStats(windowMs) {
        // Filter execution history to time window
        const cutoff = Date.now() - windowMs;
        const recentExecutions = this.executionHistory.filter(e => e.timestamp >= cutoff);
        if (recentExecutions.length === 0) {
            return this.emptyExecutionStats();
        }
        const totalExecuted = recentExecutions.length;
        const totalFailed = recentExecutions.filter(e => !e.success).length;
        const totalRetried = 0; // TODO: Track retries in execution records
        const successRate = totalExecuted > 0 ? ((totalExecuted - totalFailed) / totalExecuted) * 100 : 0;
        // Calculate throughput (executions per minute)
        const windowMinutes = windowMs / 60000;
        const throughputPerMinute = totalExecuted / windowMinutes;
        return {
            totalExecuted,
            totalFailed,
            totalRetried,
            successRate: Math.round(successRate * 100) / 100,
            throughputPerMinute: Math.round(throughputPerMinute * 100) / 100,
        };
    }
    /**
     * Get latency statistics (rolling window)
     */
    async getLatencyStats(windowMs) {
        // Filter execution history to time window
        const cutoff = Date.now() - windowMs;
        const recentExecutions = this.executionHistory.filter(e => e.timestamp >= cutoff);
        if (recentExecutions.length === 0) {
            return this.emptyLatencyStats();
        }
        // Sort by duration for percentile calculation
        const durations = recentExecutions.map(e => e.durationMs).sort((a, b) => a - b);
        const avgMs = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const p50Ms = this.percentile(durations, 50);
        const p95Ms = this.percentile(durations, 95);
        const p99Ms = this.percentile(durations, 99);
        return {
            avgMs: Math.round(avgMs),
            p50Ms: Math.round(p50Ms),
            p95Ms: Math.round(p95Ms),
            p99Ms: Math.round(p99Ms),
        };
    }
    /**
     * Get objective statistics (current snapshot)
     */
    async getObjectiveStats() {
        // TODO: Get actual objective counts from Vienna Core
        // For now, return zeros
        return {
            active: 0,
            blocked: 0,
            completed: 0,
            failed: 0,
        };
    }
    /**
     * Get provider statistics (rolling window)
     */
    async getProviderStats(windowMs) {
        if (!this.providerManager) {
            return {};
        }
        const cutoff = Date.now() - windowMs;
        const recentExecutions = this.executionHistory.filter(e => e.timestamp >= cutoff);
        // Group by provider
        const byProvider = {};
        for (const exec of recentExecutions) {
            if (exec.provider) {
                if (!byProvider[exec.provider]) {
                    byProvider[exec.provider] = [];
                }
                byProvider[exec.provider].push(exec);
            }
        }
        // Calculate metrics per provider
        const stats = {};
        for (const [provider, executions] of Object.entries(byProvider)) {
            const requests = executions.length;
            const failures = executions.filter(e => !e.success).length;
            const avgLatencyMs = executions.reduce((sum, e) => sum + e.durationMs, 0) / requests;
            // Determine health
            let health = 'healthy';
            const failureRate = failures / requests;
            if (failureRate > 0.5) {
                health = 'unavailable';
            }
            else if (failureRate > 0.2) {
                health = 'degraded';
            }
            stats[provider] = {
                requests,
                failures,
                avgLatencyMs: Math.round(avgLatencyMs),
                health,
            };
        }
        // Add providers with no recent requests
        try {
            const allProviders = await this.providerManager.getAllStatuses();
            for (const [name, status] of Object.entries(allProviders)) {
                if (!stats[name]) {
                    stats[name] = {
                        requests: 0,
                        failures: 0,
                        avgLatencyMs: 0,
                        health: status.available ? 'healthy' : 'unavailable',
                    };
                }
            }
        }
        catch (error) {
            console.error('[RuntimeStatsService] Error getting provider statuses:', error);
        }
        return stats;
    }
    /**
     * Record execution for rolling window calculations
     */
    recordExecution(execution) {
        this.executionHistory.push({
            timestamp: Date.now(),
            success: execution.success,
            durationMs: execution.durationMs,
            provider: execution.provider,
        });
        // Enforce max history size
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Cleanup old execution records (called periodically)
     */
    cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAgeMs;
        this.executionHistory = this.executionHistory.filter(e => e.timestamp >= cutoff);
        console.log(`[RuntimeStatsService] Cleanup complete. History size: ${this.executionHistory.length}`);
    }
    /**
     * Calculate percentile
     */
    percentile(sorted, p) {
        if (sorted.length === 0)
            return 0;
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    /**
     * Get window duration in milliseconds
     */
    getWindowMs(window) {
        const windows = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
        };
        return windows[window];
    }
    /**
     * Empty stats for graceful degradation
     */
    emptyQueueStats() {
        return { depth: 0, queued: 0, executing: 0, retryWait: 0, blocked: 0 };
    }
    emptyExecutionStats() {
        return { totalExecuted: 0, totalFailed: 0, totalRetried: 0, successRate: 0, throughputPerMinute: 0 };
    }
    emptyLatencyStats() {
        return { avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
    }
    emptyObjectiveStats() {
        return { active: 0, blocked: 0, completed: 0, failed: 0 };
    }
}
//# sourceMappingURL=runtimeStatsService.js.map