/**
 * ProviderManager Tests
 * 
 * Test policy-based provider selection, health tracking,
 * cooldown, failover, and sticky session behavior.
 */

import { ProviderManager } from '../../lib/providers/manager.js';
import type { ModelProvider, MessageRequest, MessageResponse, ProviderStatus, MessageContext, MessageClassification, ReasoningResponse } from '../../lib/providers/types.js';

// Mock provider implementation
class MockProvider implements ModelProvider {
  name: string;
  type: 'anthropic' | 'openclaw' | 'local' = 'local';
  private healthy: boolean = true;
  private latency: number = 10;
  
  constructor(name: string) {
    this.name = name;
  }
  
  setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }
  
  setLatency(latency: number): void {
    this.latency = latency;
  }
  
  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }
  
  async getStatus(): Promise<ProviderStatus> {
    return {
      name: this.name,
      healthy: this.healthy,
      last_heartbeat: new Date().toISOString(),
      latency_ms: this.latency,
    };
  }
  
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    if (!this.healthy) {
      throw new Error(`Provider ${this.name} is unhealthy`);
    }
    
    return {
      content: `Response from ${this.name}`,
      provider: this.name,
      model: 'mock-model',
      tokens: { input: 10, output: 20 },
    };
  }
  
  async *streamMessage(request: MessageRequest): AsyncIterableIterator<any> {
    yield { type: 'text', content: `Stream from ${this.name}` };
  }
  
  async classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification> {
    return 'informational';
  }
  
  async requestReasoning(prompt: string, context?: MessageContext): Promise<ReasoningResponse> {
    return {
      content: `Reasoning from ${this.name}`,
      provider: this.name,
      model: 'mock-model',
    };
  }
}

describe('ProviderManager', () => {
  let manager: ProviderManager;
  let primaryProvider: MockProvider;
  let fallbackProvider: MockProvider;
  
  beforeEach(() => {
    manager = new ProviderManager({
      primaryProvider: 'primary',
      fallbackOrder: ['primary', 'fallback'],
      cooldownMs: 1000,
      maxConsecutiveFailures: 3,
      healthCheckInterval: 60000,
      stickySession: true,
    });
    
    primaryProvider = new MockProvider('primary');
    fallbackProvider = new MockProvider('fallback');
    
    manager.registerProvider(primaryProvider);
    manager.registerProvider(fallbackProvider);
  });
  
  afterEach(() => {
    manager.stop();
  });
  
  /**
   * Test A — Primary Healthy
   * If Anthropic is healthy, getHealthyProvider() returns Anthropic.
   */
  test('Test A: primary healthy returns primary provider', async () => {
    primaryProvider.setHealthy(true);
    fallbackProvider.setHealthy(true);
    
    const provider = await manager.getHealthyProvider();
    
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe('primary');
  });
  
  /**
   * Test B — Cooldown
   * After maxConsecutiveFailures, Anthropic enters cooldown and is skipped.
   */
  test('Test B: provider enters cooldown after max failures', async () => {
    primaryProvider.setHealthy(false);
    fallbackProvider.setHealthy(true);
    
    // Record 3 consecutive failures
    await manager.recordFailure('primary', new Error('Test failure 1'));
    await manager.recordFailure('primary', new Error('Test failure 2'));
    await manager.recordFailure('primary', new Error('Test failure 3'));
    
    // Primary should now be in cooldown
    const provider = await manager.getHealthyProvider();
    
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe('fallback'); // Should skip primary
    
    // Verify primary is in cooldown
    const statuses = await manager.getAllStatuses();
    expect(statuses['primary'].status).toBe('unavailable');
    expect(statuses['primary'].cooldownUntil).not.toBeNull();
  });
  
  /**
   * Test C — Fallback
   * If Anthropic unavailable and OpenClaw healthy, fallback returns OpenClaw.
   */
  test('Test C: fallback to secondary when primary unavailable', async () => {
    primaryProvider.setHealthy(false);
    fallbackProvider.setHealthy(true);
    
    // Record failure on primary
    await manager.recordFailure('primary', new Error('Primary down'));
    
    const provider = await manager.getHealthyProvider();
    
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe('fallback');
  });
  
  /**
   * Test D — Sticky Thread
   * If thread t1 used Anthropic and Anthropic remains healthy,
   * subsequent requests for t1 stay on Anthropic.
   */
  test('Test D: sticky session maintains provider for thread', async () => {
    primaryProvider.setHealthy(true);
    fallbackProvider.setHealthy(true);
    
    const threadId = 'thread-123';
    
    // First request establishes provider for thread
    const provider1 = await manager.getHealthyProvider(threadId);
    expect(provider1!.name).toBe('primary');
    
    // Make primary slightly slower but still healthy
    primaryProvider.setLatency(50);
    
    // Second request should stick to primary (not re-evaluate)
    const provider2 = await manager.getHealthyProvider(threadId);
    expect(provider2!.name).toBe('primary');
    
    // Verify it's the sticky behavior, not just primary preference
    const threadProvider = manager.getProviderForThread(threadId);
    expect(threadProvider).toBe('primary');
  });
  
  /**
   * Test E — Recovery After Cooldown
   * When cooldown expires and health succeeds, Anthropic becomes eligible again.
   */
  test('Test E: provider recovers after cooldown expires', async () => {
    primaryProvider.setHealthy(false);
    fallbackProvider.setHealthy(true);
    
    // Put primary into cooldown with short duration
    const shortCooldownManager = new ProviderManager({
      primaryProvider: 'primary',
      fallbackOrder: ['primary', 'fallback'],
      cooldownMs: 100, // 100ms cooldown
      maxConsecutiveFailures: 2,
      healthCheckInterval: 60000,
      stickySession: false,
    });
    
    shortCooldownManager.registerProvider(primaryProvider);
    shortCooldownManager.registerProvider(fallbackProvider);
    
    // Trigger cooldown
    await shortCooldownManager.recordFailure('primary', new Error('Failure 1'));
    await shortCooldownManager.recordFailure('primary', new Error('Failure 2'));
    
    // Should use fallback now
    const provider1 = await shortCooldownManager.getHealthyProvider();
    expect(provider1!.name).toBe('fallback');
    
    // Wait for cooldown to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Restore health
    primaryProvider.setHealthy(true);
    await shortCooldownManager.recordSuccess('primary', 10);
    
    // Should use primary again
    const provider2 = await shortCooldownManager.getHealthyProvider();
    expect(provider2!.name).toBe('primary');
    
    shortCooldownManager.stop();
  });
  
  /**
   * Additional test: sendMessage with automatic provider selection
   */
  test('sendMessage selects provider and tracks latency', async () => {
    primaryProvider.setHealthy(true);
    
    const request: MessageRequest = {
      message: 'test message',
      operator: 'test',
    };
    
    const response = await manager.sendMessage(request);
    
    expect(response).not.toBeNull();
    expect(response.provider).toBe('primary');
    expect(response.content).toContain('primary');
    
    // Verify success was recorded
    const statuses = await manager.getAllStatuses();
    expect(statuses['primary'].lastSuccessAt).not.toBeNull();
    expect(statuses['primary'].latencyMs).toBeGreaterThan(0);
  });
  
  /**
   * Additional test: sendMessage handles provider failure and retries fallback
   */
  test('sendMessage fails over on provider error', async () => {
    primaryProvider.setHealthy(false);
    fallbackProvider.setHealthy(true);
    
    // First attempt will fail primary, trigger failover
    await manager.recordFailure('primary', new Error('Primary down'));
    
    const request: MessageRequest = {
      message: 'test message',
      operator: 'test',
    };
    
    const response = await manager.sendMessage(request);
    
    expect(response.provider).toBe('fallback');
  });
  
  /**
   * Additional test: classifyMessage falls back to keyword on provider unavailable
   */
  test('classifyMessage uses keyword fallback when no provider available', async () => {
    primaryProvider.setHealthy(false);
    fallbackProvider.setHealthy(false);
    
    await manager.recordFailure('primary', new Error('Down'));
    await manager.recordFailure('fallback', new Error('Down'));
    
    // Should fall back to keyword classification
    const classification = await manager.classifyMessage('pause execution');
    
    expect(classification).toBe('command'); // Keyword fallback should recognize this
  });
});

// Run with: npx jest tests/providers/manager.test.ts
