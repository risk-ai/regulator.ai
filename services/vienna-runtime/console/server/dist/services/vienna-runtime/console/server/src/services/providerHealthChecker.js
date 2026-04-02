/**
 * Provider Health Checker Service
 *
 * Periodically tests provider connectivity and updates State Graph.
 * Ensures provider health is always current, not stale.
 */
export class ProviderHealthChecker {
    interval = null;
    checkIntervalMs;
    running = false;
    constructor(checkIntervalMs = 30000) {
        this.checkIntervalMs = checkIntervalMs;
    }
    /**
     * Start periodic health checks
     */
    start() {
        if (this.running)
            return;
        console.log('[ProviderHealthChecker] Starting periodic health checks (every 30s)');
        this.running = true;
        // Run immediately
        this.checkAllProviders().catch(error => {
            console.error('[ProviderHealthChecker] Initial check failed:', error);
        });
        // Then run periodically
        this.interval = setInterval(() => {
            this.checkAllProviders().catch(error => {
                console.error('[ProviderHealthChecker] Periodic check failed:', error);
            });
        }, this.checkIntervalMs);
    }
    /**
     * Stop periodic health checks
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        console.log('[ProviderHealthChecker] Stopped');
    }
    /**
     * Check all providers and update State Graph
     */
    async checkAllProviders() {
        const timestamp = new Date().toISOString();
        // Check Anthropic
        await this.checkAnthropicProvider(timestamp);
        // Check Local Ollama
        await this.checkLocalProvider(timestamp);
    }
    /**
     * Check Anthropic provider
     */
    async checkAnthropicProvider(timestamp) {
        try {
            const anthropicKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicKey) {
                console.warn('[ProviderHealthChecker] ANTHROPIC_API_KEY not set');
                await this.updateStateGraph('anthropic', 'inactive', 'unhealthy', timestamp, 'No API key');
                return;
            }
            // Dynamic import to avoid module issues
            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: anthropicKey });
            const startTime = Date.now();
            try {
                await client.messages.create({
                    model: 'claude-sonnet-4-5',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'health check' }],
                });
                const latency = Date.now() - startTime;
                await this.updateStateGraph('anthropic', 'active', 'healthy', timestamp, null, latency);
                console.log(`[ProviderHealthChecker] Anthropic: ✓ healthy (${latency}ms)`);
            }
            catch (error) {
                const latency = Date.now() - startTime;
                const errorMessage = error.message || 'Unknown error';
                // Check if it's a rate limit or session timeout
                if (error.status === 429 || errorMessage.includes('rate_limit')) {
                    console.warn('[ProviderHealthChecker] Anthropic: rate limited, trying backup key...');
                    await this.tryBackupAnthropicKey(timestamp);
                }
                else if (error.status === 401 || errorMessage.includes('authentication')) {
                    console.error('[ProviderHealthChecker] Anthropic: authentication failed');
                    await this.updateStateGraph('anthropic', 'degraded', 'unhealthy', timestamp, 'Authentication failed', latency);
                }
                else {
                    console.error('[ProviderHealthChecker] Anthropic: unhealthy -', errorMessage);
                    await this.updateStateGraph('anthropic', 'degraded', 'unhealthy', timestamp, errorMessage, latency);
                }
            }
        }
        catch (error) {
            console.error('[ProviderHealthChecker] Anthropic check error:', error);
            await this.updateStateGraph('anthropic', 'failed', 'unhealthy', timestamp, 'Check failed');
        }
    }
    /**
     * Try backup Anthropic API key if available
     */
    async tryBackupAnthropicKey(timestamp) {
        const backupKey = process.env.ANTHROPIC_API_KEY_BACKUP;
        if (!backupKey) {
            console.warn('[ProviderHealthChecker] No ANTHROPIC_API_KEY_BACKUP configured');
            await this.updateStateGraph('anthropic', 'degraded', 'rate_limited', timestamp, 'Rate limited, no backup key');
            return;
        }
        try {
            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: backupKey });
            const startTime = Date.now();
            await client.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'health check' }],
            });
            const latency = Date.now() - startTime;
            // Swap keys
            process.env.ANTHROPIC_API_KEY = backupKey;
            console.log('[ProviderHealthChecker] ✓ Rotated to backup Anthropic key');
            await this.updateStateGraph('anthropic', 'active', 'healthy', timestamp, 'Using backup key', latency);
        }
        catch (error) {
            console.error('[ProviderHealthChecker] Backup Anthropic key also failed:', error.message);
            await this.updateStateGraph('anthropic', 'failed', 'unhealthy', timestamp, 'Primary and backup keys failed');
        }
    }
    /**
     * Check Local Ollama provider
     */
    async checkLocalProvider(timestamp) {
        try {
            const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
            const startTime = Date.now();
            const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: ollamaModel,
                    prompt: 'health check',
                    stream: false,
                }),
            });
            const latency = Date.now() - startTime;
            if (response.ok) {
                await this.updateStateGraph('local', 'active', 'healthy', timestamp, null, latency);
                console.log(`[ProviderHealthChecker] Local: ✓ healthy (${latency}ms)`);
            }
            else {
                const error = await response.text();
                console.error('[ProviderHealthChecker] Local: unhealthy -', error);
                await this.updateStateGraph('local', 'degraded', 'unhealthy', timestamp, error, latency);
            }
        }
        catch (error) {
            console.error('[ProviderHealthChecker] Local check error:', error.message);
            // Local provider should restart Ollama if down
            await this.updateStateGraph('local', 'failed', 'unhealthy', timestamp, 'Ollama unreachable');
            // Attempt to restart Ollama
            console.log('[ProviderHealthChecker] Attempting to restart Ollama...');
            await this.restartOllama();
        }
    }
    /**
     * Restart Ollama service
     */
    async restartOllama() {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            // Try systemctl restart
            try {
                await execAsync('systemctl --user restart ollama');
                console.log('[ProviderHealthChecker] ✓ Restarted Ollama via systemctl');
            }
            catch {
                // Try direct ollama serve
                console.log('[ProviderHealthChecker] Systemctl failed, starting Ollama directly...');
                exec('nohup ollama serve > /tmp/ollama.log 2>&1 &');
            }
        }
        catch (error) {
            console.error('[ProviderHealthChecker] Failed to restart Ollama:', error);
        }
    }
    /**
     * Update State Graph with provider health
     */
    async updateStateGraph(providerId, status, health, timestamp, errorMessage = null, latencyMs) {
        try {
            const { getStateGraph } = await import('../../../../lib/state/state-graph.js');
            const stateGraph = getStateGraph();
            await stateGraph.initialize();
            // Update provider
            stateGraph.updateProvider(providerId, {
                status,
                health,
                last_health_check: timestamp,
                error_count: errorMessage ? 1 : 0,
                last_error_at: errorMessage ? timestamp : null,
            });
        }
        catch (error) {
            console.error(`[ProviderHealthChecker] Failed to update State Graph for ${providerId}:`, error);
        }
    }
}
//# sourceMappingURL=providerHealthChecker.js.map