/**
 * Provider Health Checker Service
 *
 * Periodically tests provider connectivity and updates State Graph.
 * Ensures provider health is always current, not stale.
 */
export declare class ProviderHealthChecker {
    private interval;
    private checkIntervalMs;
    private running;
    constructor(checkIntervalMs?: number);
    /**
     * Start periodic health checks
     */
    start(): void;
    /**
     * Stop periodic health checks
     */
    stop(): void;
    /**
     * Check all providers and update State Graph
     */
    private checkAllProviders;
    /**
     * Check Anthropic provider
     */
    private checkAnthropicProvider;
    /**
     * Try backup Anthropic API key if available
     */
    private tryBackupAnthropicKey;
    /**
     * Check Local Ollama provider
     */
    private checkLocalProvider;
    /**
     * Restart Ollama service (REMOVED - Ollama is optional)
     */
    private restartOllama;
    /**
     * Update State Graph with provider health
     *
     * Note: This method is deprecated and should be removed.
     * Provider health is now tracked in ProviderHealthService only.
     * State Graph updates are not needed for provider health.
     */
    private updateStateGraph;
}
//# sourceMappingURL=providerHealthChecker.d.ts.map