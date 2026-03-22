/**
 * Vienna Provider Manager
 *
 * Policy-based provider selection with health tracking, cooldown management,
 * retry backoff, and sticky session preference.
 */
export class ProviderManager {
    providers = new Map();
    healthTracking = new Map();
    activeThreads = new Map(); // threadId -> providerName
    healthMonitorInterval = null;
    policy;
    constructor(policy) {
        this.policy = {
            primaryProvider: 'anthropic',
            fallbackOrder: ['anthropic', 'openclaw'],
            cooldownMs: 60000, // 1 minute cooldown after failures
            maxConsecutiveFailures: 3,
            healthCheckInterval: 30000, // Check every 30s
            stickySession: true,
            ...policy,
        };
    }
    /**
     * Start background health monitoring
     */
    start() {
        if (this.healthMonitorInterval)
            return;
        console.log('[ProviderManager] Starting health monitoring');
        this.healthMonitorInterval = setInterval(async () => {
            await this.runHealthChecks();
        }, this.policy.healthCheckInterval);
    }
    /**
     * Stop background health monitoring
     */
    stop() {
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
            this.healthMonitorInterval = null;
            console.log('[ProviderManager] Stopped health monitoring');
        }
    }
    /**
     * Register a provider
     */
    registerProvider(provider) {
        console.log(`[ProviderManager] Registering provider: ${provider.name}`);
        this.providers.set(provider.name, provider);
        this.healthTracking.set(provider.name, {
            provider: provider.name,
            status: 'unknown', // Phase 5D: Start as unknown until proven healthy
            lastCheckedAt: new Date().toISOString(),
            lastSuccessAt: null,
            lastFailureAt: null,
            cooldownUntil: null,
            latencyMs: null,
            errorRate: null,
            consecutiveFailures: 0,
        });
    }
    /**
     * Get healthy provider using policy-based selection
     */
    async getHealthyProvider(threadId) {
        // Sticky session: prefer provider from active thread
        if (threadId && this.policy.stickySession) {
            const stickyProvider = this.activeThreads.get(threadId);
            if (stickyProvider) {
                const provider = this.providers.get(stickyProvider);
                const health = this.healthTracking.get(stickyProvider);
                if (provider && health?.status === 'healthy' && !this.isInCooldown(stickyProvider)) {
                    console.log(`[ProviderManager] Using sticky provider: ${stickyProvider} (thread: ${threadId})`);
                    return provider;
                }
            }
        }
        // Try primary provider
        const primary = this.providers.get(this.policy.primaryProvider);
        if (primary && await this.isProviderAvailable(this.policy.primaryProvider)) {
            this.recordThreadProvider(threadId, this.policy.primaryProvider);
            return primary;
        }
        // Try fallbacks in order
        for (const name of this.policy.fallbackOrder) {
            if (name === this.policy.primaryProvider)
                continue; // Already tried
            const provider = this.providers.get(name);
            if (provider && await this.isProviderAvailable(name)) {
                console.warn(`[ProviderManager] Primary unavailable, using fallback: ${name}`);
                this.recordThreadProvider(threadId, name);
                return provider;
            }
        }
        console.error('[ProviderManager] No healthy providers available');
        return null;
    }
    /**
     * Check if provider is available (health + cooldown)
     */
    async isProviderAvailable(providerName) {
        const health = this.healthTracking.get(providerName);
        if (!health)
            return false;
        // Check cooldown
        if (this.isInCooldown(providerName)) {
            return false;
        }
        // Check status
        return health.status === 'healthy';
    }
    /**
     * Check if provider is in cooldown
     */
    isInCooldown(providerName) {
        const health = this.healthTracking.get(providerName);
        if (!health || !health.cooldownUntil)
            return false;
        const now = new Date();
        const cooldownEnd = new Date(health.cooldownUntil);
        if (now < cooldownEnd) {
            const remainingMs = cooldownEnd.getTime() - now.getTime();
            console.log(`[ProviderManager] Provider ${providerName} in cooldown for ${Math.round(remainingMs / 1000)}s`);
            return true;
        }
        return false;
    }
    /**
     * Record provider for thread (sticky session)
     */
    recordThreadProvider(threadId, providerName) {
        if (threadId && this.policy.stickySession) {
            this.activeThreads.set(threadId, providerName);
        }
    }
    /**
     * Record successful provider call
     */
    async recordSuccess(providerName, latencyMs) {
        const health = this.healthTracking.get(providerName);
        if (!health)
            return;
        health.status = 'healthy';
        health.lastSuccessAt = new Date().toISOString();
        health.latencyMs = latencyMs;
        health.consecutiveFailures = 0;
        health.cooldownUntil = null;
        console.log(`[ProviderManager] Provider ${providerName} success (${latencyMs}ms)`);
    }
    /**
     * Record provider failure
     */
    async recordFailure(providerName, error) {
        const health = this.healthTracking.get(providerName);
        if (!health)
            return;
        health.lastFailureAt = new Date().toISOString();
        health.consecutiveFailures++;
        console.warn(`[ProviderManager] Provider ${providerName} failed (${health.consecutiveFailures} consecutive):`, error.message);
        // Update status
        if (health.consecutiveFailures >= this.policy.maxConsecutiveFailures) {
            health.status = 'unavailable';
            health.cooldownUntil = new Date(Date.now() + this.policy.cooldownMs).toISOString();
            console.warn(`[ProviderManager] Provider ${providerName} entering cooldown until ${health.cooldownUntil}`);
        }
        else {
            health.status = 'degraded';
        }
    }
    /**
     * Run health checks on all providers
     */
    async runHealthChecks() {
        for (const [name, provider] of this.providers.entries()) {
            const health = this.healthTracking.get(name);
            if (!health)
                continue;
            // Skip if in cooldown
            if (this.isInCooldown(name))
                continue;
            // Check health
            const start = Date.now();
            try {
                const isHealthy = await provider.isHealthy();
                const latencyMs = Date.now() - start;
                if (isHealthy) {
                    await this.recordSuccess(name, latencyMs);
                }
                else {
                    await this.recordFailure(name, new Error('Health check failed'));
                }
            }
            catch (error) {
                await this.recordFailure(name, error);
            }
            health.lastCheckedAt = new Date().toISOString();
        }
    }
    /**
     * Get all provider health statuses
     */
    async getAllStatuses() {
        const statuses = {};
        for (const [name, health] of this.healthTracking.entries()) {
            statuses[name] = { ...health };
        }
        return statuses;
    }
    /**
     * Send message with provider selection and tracking
     */
    async sendMessage(request, threadId) {
        const provider = await this.getHealthyProvider(threadId);
        if (!provider) {
            throw new Error('No healthy providers available');
        }
        const start = Date.now();
        try {
            const response = await provider.sendMessage(request);
            const latencyMs = Date.now() - start;
            await this.recordSuccess(provider.name, latencyMs);
            return response;
        }
        catch (error) {
            await this.recordFailure(provider.name, error);
            throw error;
        }
    }
    /**
     * Classify message with provider or fallback
     */
    async classifyMessage(message, context) {
        const provider = await this.getHealthyProvider(context?.thread_id);
        if (!provider) {
            // Fallback to simple keyword classification
            console.warn('[ProviderManager] No provider available, using keyword fallback');
            return this.simpleClassify(message);
        }
        try {
            return await provider.classifyMessage(message, context);
        }
        catch (error) {
            console.error('[ProviderManager] Classification failed:', error);
            return this.simpleClassify(message);
        }
    }
    /**
     * Simple keyword-based classification fallback
     */
    simpleClassify(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.match(/^(pause|resume|retry|cancel|show|list)/)) {
            return 'command';
        }
        if (lowerMessage.includes('restart') ||
            lowerMessage.includes('recover') ||
            lowerMessage.includes('restore')) {
            return 'recovery';
        }
        if (lowerMessage.includes('why') ||
            lowerMessage.includes('explain') ||
            lowerMessage.includes('analyze')) {
            return 'reasoning';
        }
        if (lowerMessage.includes('organize') ||
            lowerMessage.includes('generate') ||
            lowerMessage.includes('create')) {
            return 'directive';
        }
        return 'informational';
    }
    /**
     * Get provider for thread
     */
    getProviderForThread(threadId) {
        return this.activeThreads.get(threadId);
    }
    /**
     * Clear thread provider (e.g., on thread end)
     */
    clearThreadProvider(threadId) {
        this.activeThreads.delete(threadId);
    }
}
//# sourceMappingURL=manager.js.map