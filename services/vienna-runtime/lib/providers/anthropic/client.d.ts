/**
 * Anthropic Provider
 *
 * Direct Claude API integration for Vienna.
 * Enables Vienna to function independently of OpenClaw.
 */
import type { ModelProvider, ProviderStatus, MessageRequest, MessageResponse, MessageChunk, MessageContext, MessageClassification, ReasoningResponse } from '../types.js';
export interface AnthropicConfig {
    apiKey: string;
    defaultModel?: string;
    classificationModel?: string;
}
export declare class AnthropicProvider implements ModelProvider {
    readonly name = "anthropic";
    readonly type: "anthropic";
    private client;
    private defaultModel;
    private classificationModel;
    constructor(config: AnthropicConfig);
    /**
     * Health check (simple ping)
     */
    isHealthy(): Promise<boolean>;
    /**
     * Get provider status
     */
    getStatus(): Promise<ProviderStatus>;
    /**
     * Send message
     */
    sendMessage(request: MessageRequest): Promise<MessageResponse>;
    /**
     * Stream message
     */
    streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
    /**
     * Classify message using fast Haiku model
     */
    classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification>;
    /**
     * Request reasoning
     */
    requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse>;
}
//# sourceMappingURL=client.d.ts.map