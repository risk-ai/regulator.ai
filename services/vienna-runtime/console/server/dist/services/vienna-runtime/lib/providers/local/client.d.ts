/**
 * Local Provider (Ollama)
 *
 * Local model integration via Ollama for Vienna fallback.
 * Enables Vienna to function when external APIs are unavailable.
 */
import type { ModelProvider, ProviderStatus, MessageRequest, MessageResponse, MessageChunk, MessageContext, MessageClassification, ReasoningResponse } from '../types.js';
export interface LocalProviderConfig {
    baseUrl?: string;
    model?: string;
    contextSize?: number;
}
export declare class LocalProvider implements ModelProvider {
    readonly name = "local";
    readonly type: "local";
    private baseUrl;
    private model;
    private contextSize;
    constructor(config?: LocalProviderConfig);
    /**
     * Health check - verify Ollama is running and model is available
     */
    isHealthy(): Promise<boolean>;
    /**
     * Get provider status
     */
    getStatus(): Promise<ProviderStatus>;
    /**
     * Send message to Ollama
     */
    sendMessage(request: MessageRequest): Promise<MessageResponse>;
    /**
     * Stream message from Ollama
     */
    streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
    /**
     * Classify message using local model
     */
    classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification>;
    /**
     * Request reasoning from local model
     */
    requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse>;
}
//# sourceMappingURL=client.d.ts.map