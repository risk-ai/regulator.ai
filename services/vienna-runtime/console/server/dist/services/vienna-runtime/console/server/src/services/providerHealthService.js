/**
 * Provider Health Service
 * Phase 5D: Provider Health Truthfulness
 *
 * Derives provider health from runtime metrics, not config.
 * Tracks health transitions and enforces truthfulness principles.
 */
/**
 * Provider Health Service
 *
 * TRUTHFULNESS PRINCIPLES:
 * - Show "unknown" when evidence insufficient
 * - Show "degraded" when reachable but unhealthy
 * - Show "unavailable" when checks fail
 * - Never show "healthy" from stale/missing data
 */
export class ProviderHealthService {
    providerManager;
    executionHistory = new Map();
    healthTransitions = new Map();
    activeExecutions = new Map();
    maxHistoryPerProvider = 1000;
    maxTransitionsPerProvider = 50;
    staleTelemetryThresholdMs = 5 * 60 * 1000; // 5 minutes
    constructor(providerManager) {
        this.providerManager = providerManager;
        console.log('[ProviderHealthService] Initialized');
    }
    /**
     * Get comprehensive health snapshot for all providers
     */
    async getProvidersHealth() {
        const timestamp = new Date().toISOString();
        const degradedReasons = [];
        try {
            // Get base provider statuses from State Graph first
            let baseStatuses = {};
            try {
                const { getStateGraph } = await import('../../../../lib/state/state-graph.js');
                const stateGraph = getStateGraph();
                await stateGraph.initialize();
                const stateProviders = stateGraph.listProviders();
                for (const provider of stateProviders) {
                    baseStatuses[provider.provider_id] = {
                        status: provider.health === 'healthy' ? 'active' : provider.health === 'degraded' ? 'degraded' : 'unavailable',
                        lastCheckedAt: provider.last_health_check,
                        consecutiveFailures: provider.error_count || 0,
                    };
                }
            }
            catch (error) {
                console.error('[ProviderHealthService] Failed to read from State Graph:', error);
                // Fallback to provider manager
                if (this.providerManager) {
                    try {
                        baseStatuses = await this.providerManager.getAllStatuses();
                    }
                    catch (error) {
                        console.error('[ProviderHealthService] Failed to get provider statuses:', error);
                        degradedReasons.push('Provider manager unavailable');
                    }
                }
                else {
                    degradedReasons.push('Provider manager not initialized');
                }
            }
            // Build health details for each provider
            const providers = {};
            for (const [name, baseStatus] of Object.entries(baseStatuses)) {
                const health = this.calculateProviderHealth(name, baseStatus);
                providers[name] = health;
                if (health.staleTelemetry) {
                    degradedReasons.push(`${name}: stale telemetry`);
                }
            }
            // Add providers we have execution history for but aren't in base statuses
            for (const providerName of this.executionHistory.keys()) {
                if (!providers[providerName]) {
                    const health = this.calculateProviderHealth(providerName, null);
                    providers[providerName] = health;
                    if (health.status === 'unknown') {
                        degradedReasons.push(`${providerName}: no status available`);
                    }
                }
            }
            return {
                timestamp,
                providers,
                degraded: degradedReasons.length > 0,
                degradedReasons: degradedReasons.length > 0 ? degradedReasons : undefined,
            };
        }
        catch (error) {
            console.error('[ProviderHealthService] Error getting providers health:', error);
            return {
                timestamp,
                providers: {},
                degraded: true,
                degradedReasons: ['Health service error: ' + (error instanceof Error ? error.message : 'unknown')],
            };
        }
    }
    /**
     * Get detailed health for specific provider
     */
    async getProviderHealth(providerName) {
        try {
            let baseStatus = null;
            if (this.providerManager) {
                baseStatus = await this.providerManager.getProviderStatus(providerName);
            }
            return this.calculateProviderHealth(providerName, baseStatus);
        }
        catch (error) {
            console.error(`[ProviderHealthService] Error getting health for ${providerName}:`, error);
            return null;
        }
    }
    /**
     * Calculate provider health from runtime metrics
     *
     * TRUTHFULNESS RULES:
     * - Unknown: no recent executions AND no base status
     * - Unavailable: base status unavailable OR >50% failures OR in cooldown
     * - Degraded: >20% failures OR high latency OR recent failures
     * - Healthy: active success with acceptable metrics
     */
    calculateProviderHealth(providerName, baseStatus) {
        const now = Date.now();
        const execHistory = this.executionHistory.get(providerName) || [];
        // Filter to recent executions (last 5 minutes)
        const recentExecutions = execHistory.filter(e => now - e.timestamp < 5 * 60 * 1000);
        // Calculate metrics
        const requestCount = recentExecutions.length;
        const failureCount = recentExecutions.filter(e => !e.success).length;
        const timeoutCount = recentExecutions.filter(e => e.timeout).length;
        // If no execution history exists, don't assume 0% success
        // Use null to indicate "no data" rather than "0% success"
        const successRate = requestCount > 0
            ? ((requestCount - failureCount) / requestCount) * 100
            : null;
        const avgLatencyMs = requestCount > 0
            ? recentExecutions.reduce((sum, e) => sum + e.durationMs, 0) / requestCount
            : null;
        // Determine health status
        let status;
        let lastSuccessAt = null;
        let lastFailureAt = null;
        let lastErrorMessage;
        // Find timestamps
        const successExecs = execHistory.filter(e => e.success);
        if (successExecs.length > 0) {
            lastSuccessAt = new Date(successExecs[successExecs.length - 1].timestamp).toISOString();
        }
        const failureExecs = execHistory.filter(e => !e.success);
        if (failureExecs.length > 0) {
            const lastFailure = failureExecs[failureExecs.length - 1];
            lastFailureAt = new Date(lastFailure.timestamp).toISOString();
            lastErrorMessage = lastFailure.errorMessage;
        }
        // Check for stale telemetry
        const staleTelemetry = requestCount === 0 && (!lastSuccessAt ||
            (now - new Date(lastSuccessAt).getTime() > this.staleTelemetryThresholdMs));
        // Apply truthfulness rules
        if (requestCount === 0 && !baseStatus) {
            // No evidence -> unknown
            status = 'unknown';
        }
        else if (requestCount === 0 && baseStatus) {
            // No execution history but have base status from State Graph -> trust it
            if (baseStatus.status === 'unavailable') {
                status = 'unavailable';
            }
            else if (baseStatus.status === 'degraded') {
                status = 'degraded';
            }
            else if (baseStatus.status === 'active') {
                status = 'healthy';
            }
            else {
                status = 'unknown';
            }
        }
        else if (baseStatus?.status === 'unavailable' || (successRate !== null && successRate < 50)) {
            // Base unavailable or >50% failures -> unavailable
            status = 'unavailable';
        }
        else if ((successRate !== null && successRate < 80) || (baseStatus?.status === 'degraded')) {
            // >20% failures or base degraded -> degraded
            status = 'degraded';
        }
        else if (staleTelemetry && !baseStatus) {
            // Stale data with no base status -> unknown (truthfulness: don't show healthy from old data)
            status = 'unknown';
        }
        else {
            // Active success with good metrics -> healthy
            status = 'healthy';
        }
        // Build health object from base or defaults
        const lastCheckedAt = baseStatus?.lastCheckedAt || new Date().toISOString();
        const cooldownUntil = baseStatus?.cooldownUntil || null;
        const consecutiveFailures = baseStatus?.consecutiveFailures || 0;
        // Track transitions
        const previousStatus = this.getCurrentStatus(providerName);
        if (previousStatus && previousStatus !== status) {
            this.recordTransition(providerName, previousStatus, status, this.getTransitionReason(previousStatus, status, successRate, requestCount));
        }
        const transitions = this.healthTransitions.get(providerName) || [];
        const activeExecs = this.activeExecutions.get(providerName) || 0;
        return {
            provider: providerName,
            status,
            lastCheckedAt,
            lastSuccessAt,
            lastFailureAt,
            cooldownUntil,
            latencyMs: avgLatencyMs > 0 ? Math.round(avgLatencyMs) : null,
            errorRate: requestCount > 0 ? Math.round((failureCount / requestCount) * 100) : null,
            consecutiveFailures,
            metrics: {
                requestCount,
                failureCount,
                timeoutCount,
                avgLatencyMs: avgLatencyMs !== null ? Math.round(avgLatencyMs) : 0,
                successRate: successRate !== null ? Math.round(successRate * 100) / 100 : 100,
            },
            activeExecutions: activeExecs,
            staleTelemetry,
            lastErrorMessage,
            transitions: transitions.slice(-10), // Last 10 transitions
        };
    }
    /**
     * Record provider execution
     */
    recordExecution(execution) {
        const record = {
            timestamp: Date.now(),
            provider: execution.provider,
            success: execution.success,
            durationMs: execution.durationMs,
            timeout: execution.timeout || false,
            errorMessage: execution.errorMessage,
        };
        // Get or create execution history for provider
        let history = this.executionHistory.get(execution.provider);
        if (!history) {
            history = [];
            this.executionHistory.set(execution.provider, history);
        }
        history.push(record);
        // Enforce max history size
        if (history.length > this.maxHistoryPerProvider) {
            history.splice(0, history.length - this.maxHistoryPerProvider);
        }
    }
    /**
     * Record start of execution (for active execution tracking)
     */
    recordExecutionStart(provider) {
        const current = this.activeExecutions.get(provider) || 0;
        this.activeExecutions.set(provider, current + 1);
    }
    /**
     * Record end of execution (for active execution tracking)
     */
    recordExecutionEnd(provider) {
        const current = this.activeExecutions.get(provider) || 0;
        this.activeExecutions.set(provider, Math.max(0, current - 1));
    }
    /**
     * Record health transition
     */
    recordTransition(provider, from, to, reason) {
        const transition = {
            from,
            to,
            timestamp: new Date().toISOString(),
            reason,
        };
        let transitions = this.healthTransitions.get(provider);
        if (!transitions) {
            transitions = [];
            this.healthTransitions.set(provider, transitions);
        }
        transitions.push(transition);
        // Enforce max transitions
        if (transitions.length > this.maxTransitionsPerProvider) {
            transitions.splice(0, transitions.length - this.maxTransitionsPerProvider);
        }
        console.log(`[ProviderHealthService] ${provider}: ${from} → ${to} (${reason})`);
    }
    /**
     * Get current status for provider (for transition tracking)
     */
    getCurrentStatus(provider) {
        const transitions = this.healthTransitions.get(provider);
        if (!transitions || transitions.length === 0) {
            return null;
        }
        return transitions[transitions.length - 1].to;
    }
    /**
     * Get transition reason
     */
    getTransitionReason(from, to, successRate, requestCount) {
        if (to === 'unavailable') {
            return `Success rate dropped to ${successRate.toFixed(1)}%`;
        }
        else if (to === 'degraded') {
            return `Success rate ${successRate.toFixed(1)}% below threshold`;
        }
        else if (to === 'healthy') {
            return `Success rate recovered to ${successRate.toFixed(1)}%`;
        }
        else if (to === 'unknown') {
            if (requestCount === 0) {
                return 'No recent executions';
            }
            return 'Insufficient evidence';
        }
        return 'Status change';
    }
    /**
     * Cleanup old execution records
     */
    cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAgeMs;
        for (const [provider, history] of this.executionHistory.entries()) {
            const filtered = history.filter(e => e.timestamp >= cutoff);
            if (filtered.length === 0) {
                this.executionHistory.delete(provider);
            }
            else {
                this.executionHistory.set(provider, filtered);
            }
        }
        console.log(`[ProviderHealthService] Cleanup complete. Providers tracked: ${this.executionHistory.size}`);
    }
}
//# sourceMappingURL=providerHealthService.js.map