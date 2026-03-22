/**
 * Vienna Model Provider Types
 * 
 * Provider abstraction layer for LLM access.
 * Enables Vienna to function independently of OpenClaw.
 */

export type ProviderType = 'anthropic' | 'openclaw' | 'local';
export type ProviderMode = 'llm' | 'deterministic' | 'keyword' | 'fallback';
export type MessageClassification = 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';

// Provider health tracking
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

// Provider health transition
export interface ProviderHealthTransition {
  from: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  to: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  timestamp: string;
  reason: string;
}

// Provider status
export interface ProviderStatus {
  name: string;
  healthy: boolean;
  last_heartbeat?: string;
  latency_ms?: number;
  error?: string;
}

// Provider selection policy
export interface ProviderSelectionPolicy {
  primaryProvider: string;
  fallbackOrder: string[];
  cooldownMs: number; // Time to wait after failure
  maxConsecutiveFailures: number; // Failures before cooldown
  healthCheckInterval: number; // How often to check health
  stickySession: boolean; // Prefer same provider for thread
}

// Message context
export interface MessageContext {
  operator: string;
  page?: string;
  objective_id?: string;
  envelope_id?: string;
  file_id?: string;
  thread_id?: string;
}

// Message request
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

// Message response
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

// Message chunk (streaming)
export interface MessageChunk {
  type: 'text' | 'tool_use';
  content: string;
}

// Classification result
export interface ClassificationResult {
  classification: MessageClassification;
  mode: ProviderMode;
  provider: string;
  confident: boolean;
}

// Reasoning response
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
  // Provider identification
  name: string;
  type: ProviderType;
  
  // Health checking
  isHealthy(): Promise<boolean>;
  getStatus(): Promise<ProviderStatus>;
  
  // Message handling
  sendMessage(request: MessageRequest): Promise<MessageResponse>;
  streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
  
  // Classification
  classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification>;
  
  // Reasoning
  requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse>;
}
