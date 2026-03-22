/**
 * Vienna Model Provider Types
 *
 * Provider abstraction layer for LLM access.
 * Enables Vienna to function independently of OpenClaw.
 */
export type ProviderType = 'anthropic' | 'openclaw' | 'local';
export type ProviderMode = 'llm' | 'deterministic' | 'keyword' | 'fallback';
export type MessageClassification = 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
export interface ProviderHealth {
    provider: string;
    status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    lastCheckedAt: string;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    cooldownUntil: string | null;
    latencyMs: number | null;
    errorRate: number | null;
    consecutiveFailures: number;
}
export interface ProviderHealthTransition {
    from: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    to: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    timestamp: string;
    reason: string;
}
export interface ProviderStatus {
    name: string;
    healthy: boolean;
    last_heartbeat?: string;
    latency_ms?: number;
    error?: string;
}
export interface ProviderSelectionPolicy {
    primaryProvider: string;
    fallbackOrder: string[];
    cooldownMs: number;
    maxConsecutiveFailures: number;
    healthCheckInterval: number;
    stickySession: boolean;
}
export interface MessageContext {
    operator: string;
    page?: string;
    objective_id?: string;
    envelope_id?: string;
    file_id?: string;
    thread_id?: string;
}
export interface MessageRequest {
    message: string;
    context?: {
        system_prompt?: string;
        conversation_history?: Array<{
            role: 'operator' | 'vienna';
            content: string;
        }>;
        tools?: Array<{
            name: string;
            description: string;
            input_schema: Record<string, unknown>;
        }>;
        page?: string;
        objective_id?: string;
    };
    operator: string;
    model?: string;
}
export interface MessageResponse {
    content: string;
    classification?: MessageClassification;
    tool_calls?: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
    }>;
    provider: string;
    model: string;
    tokens?: {
        input: number;
        output: number;
    };
}
export interface MessageChunk {
    type: 'text' | 'tool_use';
    content: string;
}
export interface ClassificationResult {
    classification: MessageClassification;
    mode: ProviderMode;
    provider: string;
    confident: boolean;
}
export interface ReasoningResponse {
    content: string;
    provider: string;
    model: string;
}
/**
 * Model Provider Interface
 *
 * All providers (Anthropic, OpenClaw, local) must implement this interface.
 */
export interface ModelProvider {
    name: string;
    type: ProviderType;
    isHealthy(): Promise<boolean>;
    getStatus(): Promise<ProviderStatus>;
    sendMessage(request: MessageRequest): Promise<MessageResponse>;
    streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
    classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification>;
    requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse>;
}
//# sourceMappingURL=types.d.ts.map