/**
 * Vienna Provider Manager
 *
 * Policy-based provider selection with health tracking, cooldown management,
 * retry backoff, and sticky session preference.
 */
import type { ModelProvider, ProviderHealth, ProviderSelectionPolicy, MessageRequest, MessageResponse, MessageContext, MessageClassification } from './types.js';
export declare class ProviderManager {
    private providers;
    private healthTracking;
    private activeThreads;
    private healthMonitorInterval;
    private policy;
    constructor(policy?: Partial<ProviderSelectionPolicy>);
    /**
     * Start background health monitoring
     */
    start(): void;
    /**
     * Stop background health monitoring
     */
    stop(): void;
    /**
     * Register a provider
     */
    registerProvider(provider: ModelProvider): void;
    /**
     * Get healthy provider using policy-based selection
     */
    getHealthyProvider(threadId?: string): Promise<ModelProvider | null>;
    /**
     * Check if provider is available (health + cooldown)
     */
    private isProviderAvailable;
    /**
     * Check if provider is in cooldown
     */
    private isInCooldown;
    /**
     * Record provider for thread (sticky session)
     */
    private recordThreadProvider;
    /**
     * Record successful provider call
     */
    recordSuccess(providerName: string, latencyMs: number): Promise<void>;
    /**
     * Record provider failure
     */
    recordFailure(providerName: string, error: Error): Promise<void>;
    /**
     * Run health checks on all providers
     */
    private runHealthChecks;
    /**
     * Get all provider health statuses
     */
    getAllStatuses(): Promise<Record<string, ProviderHealth>>;
    /**
     * Send message with provider selection and tracking
     */
    sendMessage(request: MessageRequest, threadId?: string): Promise<MessageResponse>;
    /**
     * Classify message with provider or fallback
     */
    classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification>;
    /**
     * Simple keyword-based classification fallback
     */
    private simpleClassify;
    /**
     * Get provider for thread
     */
    getProviderForThread(threadId: string): string | undefined;
    /**
     * Clear thread provider (e.g., on thread end)
     */
    clearThreadProvider(threadId: string): void;
}
//# sourceMappingURL=manager.d.ts.map