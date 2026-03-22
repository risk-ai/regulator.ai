/**
 * Local Provider (Ollama)
 * 
 * Local model integration via Ollama for Vienna fallback.
 * Enables Vienna to function when external APIs are unavailable.
 */

import type {
  ModelProvider,
  ProviderStatus,
  MessageRequest,
  MessageResponse,
  MessageChunk,
  MessageContext,
  MessageClassification,
  ReasoningResponse,
} from '../types.js';

export interface LocalProviderConfig {
  baseUrl?: string;
  model?: string;
  contextSize?: number;
}

export class LocalProvider implements ModelProvider {
  readonly name = 'local';
  readonly type = 'local' as const;
  
  private baseUrl: string;
  private model: string;
  private contextSize: number;
  
  constructor(config: LocalProviderConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
    this.model = config.model || 'qwen2.5:0.5b';
    this.contextSize = config.contextSize || 8192;
    
    console.log(`[LocalProvider] Initialized with Ollama at ${this.baseUrl}, model: ${this.model}`);
  }
  
  /**
   * Health check - verify Ollama is running and model is available
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      const models = data.models || [];
      
      // Check if our model is available
      const hasModel = models.some((m: any) => m.name === this.model);
      
      return hasModel;
    } catch (error) {
      console.error('[LocalProvider] Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    const healthy = await this.isHealthy();
    const latencyMs = Date.now() - start;
    
    return {
      name: this.name,
      healthy,
      last_heartbeat: new Date().toISOString(),
      latency_ms: healthy ? latencyMs : undefined,
      error: healthy ? undefined : `Ollama unreachable or model ${this.model} not found`,
    };
  }
  
  /**
   * Send message to Ollama
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    // Build conversation history
    const messages = [
      ...(request.context?.conversation_history?.map(msg => ({
        role: msg.role === 'operator' ? 'user' : 'assistant',
        content: msg.content,
      })) || []),
      { role: 'user', content: request.message },
    ];
    
    // Add system prompt if provided
    if (request.context?.system_prompt) {
      messages.unshift({
        role: 'system',
        content: request.context.system_prompt,
      });
    }
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          num_ctx: this.contextSize,
        },
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.message?.content || '',
      provider: this.name,
      model: this.model,
      tokens: {
        input: data.prompt_eval_count || 0,
        output: data.eval_count || 0,
      },
    };
  }
  
  /**
   * Stream message from Ollama
   */
  async *streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk> {
    const messages = [
      ...(request.context?.conversation_history?.map(msg => ({
        role: msg.role === 'operator' ? 'user' : 'assistant',
        content: msg.content,
      })) || []),
      { role: 'user', content: request.message },
    ];
    
    if (request.context?.system_prompt) {
      messages.unshift({
        role: 'system',
        content: request.context.system_prompt,
      });
    }
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          num_ctx: this.contextSize,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield {
              type: 'text',
              content: data.message.content,
            };
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  }
  
  /**
   * Classify message using local model
   */
  async classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: `Classify this message into one of: informational, reasoning, directive, command, approval, recovery

Message: "${message}"

Reply with only the classification word.`,
          stream: false,
          options: {
            num_predict: 20,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        return 'informational';
      }
      
      const data = await response.json();
      const classification = data.response?.trim().toLowerCase() || 'informational';
      
      const validTypes: MessageClassification[] = [
        'informational', 'reasoning', 'directive', 'command', 'approval', 'recovery'
      ];
      
      if (validTypes.includes(classification as MessageClassification)) {
        return classification as MessageClassification;
      }
      
      return 'informational';
    } catch (error) {
      console.error('[LocalProvider] Classification failed:', error);
      return 'informational';
    }
  }
  
  /**
   * Request reasoning from local model
   */
  async requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse> {
    const response = await this.sendMessage({
      message: prompt,
      context: {
        system_prompt: 'You are Vienna, an AI assistant helping with system operations and reasoning. Provide clear, structured analysis.',
        ...context,
      },
      operator: context?.operator || 'system',
    });
    
    return {
      content: response.content,
      provider: this.name,
      model: this.model,
    };
  }
}
