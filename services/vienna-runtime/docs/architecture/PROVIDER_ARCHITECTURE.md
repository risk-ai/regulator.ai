# Vienna Model Provider Architecture

**Goal:** Remove OpenClaw as single point of failure. Make Vienna autonomous with direct LLM access.

**Principle:** Model providers (OpenClaw, Anthropic, local) are interchangeable reasoning engines. Vienna Core remains sole execution authority.

---

## Architecture Overview

```
Dashboard Chat
  ↓
Console API (/api/v1/chat/message)
  ↓
Vienna Core (ChatService)
  ↓
ModelProvider abstraction
  ↓ ↓ ↓
Anthropic | OpenClaw | Local
```

**Key change:** Vienna no longer depends on OpenClaw for LLM access.

---

## Provider Abstraction Layer

**Location:** `vienna-core/lib/providers/`

**Interface:**

```typescript
interface ModelProvider {
  name: string;
  type: 'anthropic' | 'openclaw' | 'local';
  
  // Health
  isHealthy(): Promise<boolean>;
  getStatus(): Promise<ProviderStatus>;
  
  // Message handling
  sendMessage(request: MessageRequest): Promise<MessageResponse>;
  streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
  
  // Classification
  classifyMessage(message: string, context?: Context): Promise<MessageClassification>;
  
  // Reasoning
  requestReasoning(prompt: string, context?: Context): Promise<ReasoningResponse>;
}

interface ProviderStatus {
  name: string;
  healthy: boolean;
  last_heartbeat?: string;
  latency_ms?: number;
  error?: string;
}

interface MessageRequest {
  message: string;
  context?: {
    system_prompt?: string;
    conversation_history?: Message[];
    tools?: Tool[];
    page?: string;
    objective_id?: string;
  };
  operator: string;
  model?: string;
}

interface MessageResponse {
  content: string;
  classification?: MessageClassification;
  tool_calls?: ToolCall[];
  provider: string;
  model: string;
  tokens?: {
    input: number;
    output: number;
  };
}
```

---

## Anthropic Provider

**Location:** `vienna-core/lib/providers/anthropic/`

**Implementation:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic';
  type = 'anthropic' as const;
  
  private client: Anthropic;
  private defaultModel: string;
  
  constructor(config: {
    apiKey: string;
    defaultModel?: string;
  }) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.defaultModel || 'claude-3-7-sonnet-20250219';
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch (error) {
      console.error('Anthropic health check failed:', error);
      return false;
    }
  }
  
  async getStatus(): Promise<ProviderStatus> {
    const healthy = await this.isHealthy();
    return {
      name: this.name,
      healthy,
      last_heartbeat: new Date().toISOString(),
      latency_ms: healthy ? 200 : undefined,
      error: healthy ? undefined : 'API unreachable',
    };
  }
  
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    const messages: Anthropic.MessageParam[] = [
      ...(request.context?.conversation_history?.map(msg => ({
        role: msg.role === 'operator' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })) || []),
      { role: 'user', content: request.message },
    ];
    
    const response = await this.client.messages.create({
      model: request.model || this.defaultModel,
      max_tokens: 4096,
      system: request.context?.system_prompt,
      messages,
      tools: request.context?.tools,
    });
    
    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      tool_calls: response.content
        .filter(c => c.type === 'tool_use')
        .map(c => ({
          id: c.id,
          name: c.name,
          input: c.input,
        })),
      provider: this.name,
      model: response.model,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }
  
  async *streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk> {
    const messages: Anthropic.MessageParam[] = [
      ...(request.context?.conversation_history?.map(msg => ({
        role: msg.role === 'operator' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })) || []),
      { role: 'user', content: request.message },
    ];
    
    const stream = await this.client.messages.create({
      model: request.model || this.defaultModel,
      max_tokens: 4096,
      system: request.context?.system_prompt,
      messages,
      stream: true,
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield {
          type: 'text',
          content: chunk.delta.text,
        };
      }
    }
  }
  
  async classifyMessage(message: string, context?: Context): Promise<MessageClassification> {
    // Use Claude for classification
    const response = await this.client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast model for classification
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Classify this message into one of: informational, reasoning, directive, command, approval, recovery

Message: "${message}"

Classification:`,
      }],
    });
    
    const classification = response.content[0].type === 'text' 
      ? response.content[0].text.trim().toLowerCase()
      : 'informational';
    
    return classification as MessageClassification;
  }
  
  async requestReasoning(prompt: string, context?: Context): Promise<ReasoningResponse> {
    const response = await this.sendMessage({
      message: prompt,
      context: {
        system_prompt: 'You are Vienna, an AI assistant helping with system operations and reasoning.',
        ...context,
      },
      operator: context?.operator || 'system',
    });
    
    return {
      content: response.content,
      provider: this.name,
      model: response.model,
    };
  }
}
```

---

## OpenClaw Provider

**Location:** `vienna-core/lib/providers/openclaw/`

**Implementation:**

```typescript
export class OpenClawProvider implements ModelProvider {
  name = 'openclaw';
  type = 'openclaw' as const;
  
  private gatewayUrl: string;
  private sessionId?: string;
  
  constructor(config: {
    gatewayUrl?: string;
  }) {
    this.gatewayUrl = config.gatewayUrl || 'http://localhost:18789';
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/health`, {
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  async getStatus(): Promise<ProviderStatus> {
    const healthy = await this.isHealthy();
    return {
      name: this.name,
      healthy,
      last_heartbeat: new Date().toISOString(),
      error: healthy ? undefined : 'Gateway unreachable',
    };
  }
  
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    // TODO: Implement OpenClaw session management
    // For now, stub implementation
    throw new Error('OpenClaw provider not fully implemented');
  }
  
  async *streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk> {
    // TODO: Implement OpenClaw streaming
    throw new Error('OpenClaw provider not fully implemented');
  }
  
  async classifyMessage(message: string, context?: Context): Promise<MessageClassification> {
    // Simple keyword-based classification
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/^(pause|resume|retry|cancel|show|list)/)) {
      return 'command';
    }
    
    if (lowerMessage.includes('organize') || 
        lowerMessage.includes('generate') || 
        lowerMessage.includes('create')) {
      return 'directive';
    }
    
    if (lowerMessage.includes('why') || 
        lowerMessage.includes('explain') || 
        lowerMessage.includes('analyze')) {
      return 'reasoning';
    }
    
    if (lowerMessage.includes('restart') ||
        lowerMessage.includes('recover') ||
        lowerMessage.includes('restore')) {
      return 'recovery';
    }
    
    return 'informational';
  }
  
  async requestReasoning(prompt: string, context?: Context): Promise<ReasoningResponse> {
    // Route through OpenClaw sessions API
    throw new Error('Not implemented');
  }
}
```

---

## Provider Manager

**Location:** `vienna-core/lib/providers/manager.ts`

**Responsibilities:**
- Provider registration
- Health monitoring + tracking
- Policy-based selection
- Cooldown management
- Retry backoff
- Sticky session preference

**Provider Health Tracking:**

```typescript
interface ProviderHealth {
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

interface ProviderSelectionPolicy {
  primaryProvider: string;
  fallbackOrder: string[];
  cooldownMs: number; // Time to wait after failure
  maxConsecutiveFailures: number; // Failures before cooldown
  healthCheckInterval: number; // How often to check health
  stickySession: boolean; // Prefer same provider for thread
}
```

**Implementation:**

```typescript
export class ProviderManager {
  private providers: Map<string, ModelProvider> = new Map();
  private healthTracking: Map<string, ProviderHealth> = new Map();
  private activeThreads: Map<string, string> = new Map(); // threadId -> providerName
  
  private policy: ProviderSelectionPolicy = {
    primaryProvider: 'anthropic',
    fallbackOrder: ['anthropic', 'openclaw'],
    cooldownMs: 60000, // 1 minute cooldown after failures
    maxConsecutiveFailures: 3,
    healthCheckInterval: 30000, // Check every 30s
    stickySession: true,
  };
  
  constructor(policy?: Partial<ProviderSelectionPolicy>) {
    if (policy) {
      this.policy = { ...this.policy, ...policy };
    }
    
    // Start background health monitoring
    this.startHealthMonitoring();
  }
  
  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
    this.healthTracking.set(provider.name, {
      provider: provider.name,
      status: 'healthy',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
      cooldownUntil: null,
      latencyMs: null,
      errorRate: null,
      consecutiveFailures: 0,
    });
  }
  
  async getHealthyProvider(threadId?: string): Promise<ModelProvider | null> {
    // Sticky session: prefer provider from active thread
    if (threadId && this.policy.stickySession) {
      const stickyProvider = this.activeThreads.get(threadId);
      if (stickyProvider) {
        const provider = this.providers.get(stickyProvider);
        const health = this.healthTracking.get(stickyProvider);
        
        if (provider && health?.status === 'healthy' && !this.isInCooldown(stickyProvider)) {
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
      if (name === this.policy.primaryProvider) continue; // Already tried
      
      const provider = this.providers.get(name);
      if (provider && await this.isProviderAvailable(name)) {
        console.warn(`Primary provider unavailable, using fallback: ${name}`);
        this.recordThreadProvider(threadId, name);
        return provider;
      }
    }
    
    return null;
  }
  
  private async isProviderAvailable(providerName: string): Promise<boolean> {
    const health = this.healthTracking.get(providerName);
    if (!health) return false;
    
    // Check cooldown
    if (this.isInCooldown(providerName)) {
      return false;
    }
    
    // Check status
    return health.status === 'healthy';
  }
  
  private isInCooldown(providerName: string): boolean {
    const health = this.healthTracking.get(providerName);
    if (!health || !health.cooldownUntil) return false;
    
    const now = new Date();
    const cooldownEnd = new Date(health.cooldownUntil);
    return now < cooldownEnd;
  }
  
  private recordThreadProvider(threadId: string | undefined, providerName: string) {
    if (threadId && this.policy.stickySession) {
      this.activeThreads.set(threadId, providerName);
    }
  }
  
  async recordSuccess(providerName: string, latencyMs: number) {
    const health = this.healthTracking.get(providerName);
    if (!health) return;
    
    health.status = 'healthy';
    health.lastSuccessAt = new Date().toISOString();
    health.latencyMs = latencyMs;
    health.consecutiveFailures = 0;
    health.cooldownUntil = null;
  }
  
  async recordFailure(providerName: string, error: Error) {
    const health = this.healthTracking.get(providerName);
    if (!health) return;
    
    health.lastFailureAt = new Date().toISOString();
    health.consecutiveFailures++;
    
    // Update status
    if (health.consecutiveFailures >= this.policy.maxConsecutiveFailures) {
      health.status = 'unavailable';
      health.cooldownUntil = new Date(Date.now() + this.policy.cooldownMs).toISOString();
      console.warn(`Provider ${providerName} entering cooldown until ${health.cooldownUntil}`);
    } else {
      health.status = 'degraded';
    }
  }
  
  private async startHealthMonitoring() {
    setInterval(async () => {
      for (const [name, provider] of this.providers.entries()) {
        const health = this.healthTracking.get(name);
        if (!health) continue;
        
        // Skip if in cooldown
        if (this.isInCooldown(name)) continue;
        
        // Check health
        const start = Date.now();
        try {
          const isHealthy = await provider.isHealthy();
          const latencyMs = Date.now() - start;
          
          if (isHealthy) {
            await this.recordSuccess(name, latencyMs);
          } else {
            await this.recordFailure(name, new Error('Health check failed'));
          }
        } catch (error) {
          await this.recordFailure(name, error as Error);
        }
        
        health.lastCheckedAt = new Date().toISOString();
      }
    }, this.policy.healthCheckInterval);
  }
  
  async getAllStatuses(): Promise<Record<string, ProviderHealth>> {
    const statuses: Record<string, ProviderHealth> = {};
    
    for (const [name, health] of this.healthTracking.entries()) {
      statuses[name] = { ...health };
    }
    
    return statuses;
  }
  
  async sendMessage(request: MessageRequest, threadId?: string): Promise<MessageResponse> {
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
    } catch (error) {
      await this.recordFailure(provider.name, error as Error);
      throw error;
    }
  }
  
  getProviderForThread(threadId: string): string | undefined {
    return this.activeThreads.get(threadId);
  }
  
  clearThreadProvider(threadId: string) {
    this.activeThreads.delete(threadId);
  }
}
```

---

## Configuration

**Environment variables:**

```bash
# Anthropic provider
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

# OpenClaw provider
OPENCLAW_GATEWAY_URL=http://localhost:18789

# Provider settings
MODEL_PROVIDER_PRIMARY=anthropic
MODEL_PROVIDER_FALLBACK=anthropic,openclaw
```

---

## API Endpoints

### GET /api/v1/providers

**Purpose:** Get provider health status

**Response:**
```typescript
{
  providers: {
    anthropic: {
      name: 'anthropic',
      healthy: true,
      last_heartbeat: '2026-03-11T20:00:00Z',
      latency_ms: 200,
    },
    openclaw: {
      name: 'openclaw',
      healthy: false,
      error: 'Gateway unreachable',
    },
  },
  primary: 'anthropic',
  active: 'anthropic',
}
```

---

### POST /api/v1/providers/test

**Purpose:** Test provider connectivity

**Request:**
```typescript
{
  provider: 'anthropic',
  operator: 'max',
}
```

**Response:**
```typescript
{
  success: true,
  provider: 'anthropic',
  latency_ms: 210,
  test_message: 'Provider responding correctly',
}
```

---

## Chat Integration

**Updated flow:**

```
1. User sends chat message
2. POST /api/v1/chat/message
3. ProviderManager.getHealthyProvider()
4. Provider.classifyMessage()
5. ChatService handles based on classification
6. Provider.sendMessage() or streamMessage()
7. Response returned to user
8. Response includes provider metadata
```

**Chat response includes provider info:**

```typescript
{
  message_id: 'msg_123',
  classification: 'informational',
  response: 'System is healthy...',
  provider: 'anthropic',
  model: 'claude-3-7-sonnet-20250219',
  timestamp: '2026-03-11T20:00:00Z',
}
```

---

## Recovery Directive Type

**New classification type:** `recovery`

**Examples:**
```
Vienna, OpenClaw appears down. Restore connectivity.
Vienna, restart the gateway service
Vienna, recover from network failure
```

**Handling:**

```typescript
async handleRecovery(message: string, context?: Context): Promise<ChatMessageResponse> {
  // Parse recovery intent
  const intent = parseRecoveryIntent(message);
  
  // Create recovery objective
  const result = await viennaRuntime.submitDirective({
    text: `Recover service: ${intent.service}`,
    risk_tier: 'T1',
    operator: context.operator,
    metadata: {
      service: intent.service,
      recovery_type: intent.type,
    },
  });
  
  return {
    message_id: generateMessageId(),
    classification: 'recovery',
    response: `Recovery objective created: ${result.objective_id}. Attempting to restore ${intent.service}...`,
    objective_id: result.objective_id,
    timestamp: new Date().toISOString(),
  };
}
```

---

## Service Monitoring

**OpenClaw as managed service:**

**Location:** `vienna-core/lib/adapters/services/openclaw.ts`

```typescript
export class OpenClawServiceAdapter {
  async getStatus(): Promise<ServiceStatus> {
    try {
      const response = await fetch('http://localhost:18789/health');
      return {
        name: 'openclaw',
        status: response.ok ? 'running' : 'degraded',
        last_heartbeat: new Date().toISOString(),
        connectivity: response.ok ? 'healthy' : 'unhealthy',
      };
    } catch (error) {
      return {
        name: 'openclaw',
        status: 'stopped',
        last_heartbeat: undefined,
        connectivity: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async restart(): Promise<void> {
    // TODO: Implement service restart via systemd or process manager
    throw new Error('Not implemented');
  }
  
  async reconnect(): Promise<void> {
    // TODO: Implement reconnection logic
    throw new Error('Not implemented');
  }
  
  async getLogs(lines: number = 100): Promise<string[]> {
    // TODO: Implement log retrieval
    throw new Error('Not implemented');
  }
}
```

---

## System/Services Page

**Route:** `/system/services`

**Purpose:** Service monitoring and management

**Layout:**

```
┌─────────────────────────────────────┐
│  System Services                     │
├─────────────────────────────────────┤
│  OpenClaw Gateway                    │
│  Status: Running | Healthy           │
│  Last heartbeat: 12s ago             │
│  [Restart] [Reconnect] [View Logs]   │
├─────────────────────────────────────┤
│  Model Providers                     │
│                                      │
│  Anthropic                           │
│  Status: Healthy | 200ms latency     │
│  Model: claude-3-7-sonnet            │
│  [Test Connection]                   │
│                                      │
│  OpenClaw                            │
│  Status: Degraded | Gateway down     │
│  [Test Connection]                   │
├─────────────────────────────────────┤
│  SSE Stream                          │
│  Status: Connected                   │
│  Clients: 1                          │
│  Last event: 2s ago                  │
├─────────────────────────────────────┤
│  Vienna Executor                     │
│  Status: Running                     │
│  Queue: 12 envelopes                 │
│  [Run Integrity Check]               │
└─────────────────────────────────────┘
```

**All actions route through Vienna Core:**
- Restart service → creates recovery objective
- Test connection → calls provider health check
- View logs → reads service logs via adapter

---

## Failover Logic

**Scenario 1: Primary provider unavailable**

```
1. Chat message sent
2. ProviderManager.getHealthyProvider()
3. Primary (anthropic) health check fails
4. Try fallback (openclaw)
5. OpenClaw healthy, use it
6. Response includes provider: "openclaw"
7. User sees: "⚠️ Using fallback provider: openclaw"
```

---

**Scenario 2: All providers unavailable**

```
1. Chat message sent
2. ProviderManager.getHealthyProvider()
3. All providers fail health check
4. Error response: "No healthy providers available"
5. Fallback to simple keyword-based classification
6. Limited functionality (commands still work, reasoning unavailable)
```

---

## Stage 1 Updated Scope

**Must include:**

1. ✅ Global layout
2. ✅ Dashboard with chat
3. ✅ SSE integration
4. ✅ **Provider abstraction layer**
5. ✅ **Anthropic provider implementation**
6. ✅ **Provider manager with failover**
7. ✅ **Provider health endpoint**
8. ✅ Chat with recovery directive support

**Do not defer provider abstraction.** It is foundational.

---

## Benefits

✅ **Vienna autonomous** — No longer depends on OpenClaw for LLM access

✅ **Resilient** — Failover to backup providers automatically

✅ **Recoverable** — Can repair OpenClaw through governed objectives

✅ **Observable** — Provider health visible in UI

✅ **Flexible** — Easy to add new providers (local models, etc.)

✅ **Future-proof** — Provider layer enables multi-model strategies

---

## Implementation Priority

### Week 1 (Stage 1)

1. Implement provider abstraction interface
2. Implement Anthropic provider
3. Implement provider manager with failover
4. Update chat backend to use provider manager
5. Add `/api/v1/providers` endpoint
6. Test failover scenario
7. Update chat UI to show provider info

### Week 2

1. Implement OpenClaw service monitoring adapter
2. Add recovery directive handling
3. Build `/system/services` page
4. Test service recovery flow

---

**Provider architecture complete. Vienna now autonomous with direct Anthropic integration.**
