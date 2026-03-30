/**
 * Provider Manager Integration Bridge
 *
 * Isolates module format complexity between ESM server and Vienna Core providers.
 *
 * RESPONSIBILITY:
 * - Import ProviderManager from TypeScript source
 * - Expose typed methods to server layer
 * - Handle initialization and lifecycle
 *
 * BOUNDARY:
 * - ViennaRuntimeService calls methods here
 * - This module imports ProviderManager
 * - Routes NEVER import ProviderManager directly
 *
 * NOTE: Uses runtime-only imports to avoid TypeScript rootDir issues.
 * All types are inlined to prevent cross-boundary type imports.
 */
export interface ProviderHealth {
    provider: string;
    status: 'healthy' | 'degraded' | 'unavailable';
    lastCheckedAt: string;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    cooldownUntil: string | null;
    latencyMs: number | null;
    errorRate: number | null;
    consecutiveFailures: number;
}
export interface ProviderSelectionPolicy {
    primaryProvider: string;
    fallbackOrder: string[];
    cooldownMs: number;
    maxConsecutiveFailures: number;
    healthCheckInterval: number;
    stickySession: boolean;
}
export interface MessageRequest {
    messages: Array<{
        role: string;
        content: string;
    }>;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface MessageResponse {
    content: string;
    provider: string;
    model: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
    latencyMs: number;
}
/**
 * Provider Manager Bridge
 *
 * Wraps ProviderManager instance with type-safe interface for server.
 */
export declare class ProviderManagerBridge {
    private policy?;
    private manager;
    private initialized;
    constructor(policy?: Partial<ProviderSelectionPolicy>);
    /**
     * Initialize provider manager and register providers
     */
    initialize(): Promise<void>;
    /**
     * Get all provider statuses
     */
    getAllStatuses(): Promise<Record<string, ProviderHealth>>;
    /**
     * Get status of specific provider
     */
    getProviderStatus(providerName: string): Promise<ProviderHealth | null>;
    /**
     * Send message through provider manager
     */
    sendMessage(request: MessageRequest, threadId?: string): Promise<MessageResponse>;
    /**
     * Get primary provider name
     */
    getPrimaryProvider(): string;
    /**
     * Get fallback provider order
     */
    getFallbackOrder(): string[];
    /**
     * Stop provider manager
     */
    stop(): void;
}
/**
 * Create and initialize provider manager bridge
 */
export declare function createProviderManagerBridge(policy?: Partial<ProviderSelectionPolicy>): Promise<ProviderManagerBridge>;
//# sourceMappingURL=providerManager.d.ts.map