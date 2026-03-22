/**
 * Vienna Provider Manager
 * 
 * Policy-based provider selection with health tracking, cooldown management,
 * retry backoff, and sticky session preference.
 */

import type {
  ModelProvider,
  ProviderHealth,
  ProviderSelectionPolicy,
  MessageRequest,
  MessageResponse,
  MessageContext,
  MessageClassification,
} from './types.js';

export class ProviderManager {
  private providers: Map<string, ModelProvider> = new Map();
  private healthTracking: Map<string, ProviderHealth> = new Map();
  private activeThreads: Map<string, string> = new Map(); // threadId -> providerName
  private healthMonitorInterval: NodeJS.Timeout | null = null;
  
  private policy: ProviderSelectionPolicy;
  
  constructor(policy?: Partial<ProviderSelectionPolicy>) {
    this.policy = {
      primaryProvider: 'anthropic',
      fallbackOrder: ['anthropic', 'openclaw'],
      cooldownMs: 60000, // 1 minute cooldown after failures
      maxConsecutiveFailures: 3,
      healthCheckInterval: 30000, // Check every 30s
      stickySession: true,
      ...policy,
    };
  }
  
  /**
   * Start background health monitoring
   */
  start(): void {
    if (this.healthMonitorInterval) return;
    
    console.log('[ProviderManager] Starting health monitoring');
    
    this.healthMonitorInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, this.policy.healthCheckInterval);
  }
  
  /**
   * Stop background health monitoring
   */
  stop(): void {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
      console.log('[ProviderManager] Stopped health monitoring');
    }
  }
  
  /**
   * Register a provider
   */
  registerProvider(provider: ModelProvider): void {
    console.log(`[ProviderManager] Registering provider: ${provider.name}`);
    
    this.providers.set(provider.name, provider);
    this.healthTracking.set(provider.name, {
      provider: provider.name,
      status: 'unknown', // Phase 5D: Start as unknown until proven healthy
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
      cooldownUntil: null,
      latencyMs: null,
      errorRate: null,
      consecutiveFailures: 0,
    });
  }
  
  /**
   * Get healthy provider using policy-based selection
   */
  async getHealthyProvider(threadId?: string): Promise<ModelProvider | null> {
    // Sticky session: prefer provider from active thread
    if (threadId && this.policy.stickySession) {
      const stickyProvider = this.activeThreads.get(threadId);
      if (stickyProvider) {
        const provider = this.providers.get(stickyProvider);
        const health = this.healthTracking.get(stickyProvider);
        
        if (provider && health?.status === 'healthy' && !this.isInCooldown(stickyProvider)) {
          console.log(`[ProviderManager] Using sticky provider: ${stickyProvider} (thread: ${threadId})`);
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
        console.warn(`[ProviderManager] Primary unavailable, using fallback: ${name}`);
        this.recordThreadProvider(threadId, name);
        return provider;
      }
    }
    
    console.error('[ProviderManager] No healthy providers available');
    return null;
  }
  
  /**
   * Check if provider is available (health + cooldown)
   */
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
  
  /**
   * Check if provider is in cooldown
   */
  private isInCooldown(providerName: string): boolean {
    const health = this.healthTracking.get(providerName);
    if (!health || !health.cooldownUntil) return false;
    
    const now = new Date();
    const cooldownEnd = new Date(health.cooldownUntil);
    
    if (now < cooldownEnd) {
      const remainingMs = cooldownEnd.getTime() - now.getTime();
      console.log(`[ProviderManager] Provider ${providerName} in cooldown for ${Math.round(remainingMs / 1000)}s`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Record provider for thread (sticky session)
   */
  private recordThreadProvider(threadId: string | undefined, providerName: string): void {
    if (threadId && this.policy.stickySession) {
      this.activeThreads.set(threadId, providerName);
    }
  }
  
  /**
   * Record successful provider call
   */
  async recordSuccess(providerName: string, latencyMs: number): Promise<void> {
    const health = this.healthTracking.get(providerName);
    if (!health) return;
    
    health.status = 'healthy';
    health.lastSuccessAt = new Date().toISOString();
    health.latencyMs = latencyMs;
    health.consecutiveFailures = 0;
    health.cooldownUntil = null;
    
    console.log(`[ProviderManager] Provider ${providerName} success (${latencyMs}ms)`);
  }
  
  /**
   * Record provider failure
   */
  async recordFailure(providerName: string, error: Error): Promise<void> {
    const health = this.healthTracking.get(providerName);
    if (!health) return;
    
    health.lastFailureAt = new Date().toISOString();
    health.consecutiveFailures++;
    
    console.warn(`[ProviderManager] Provider ${providerName} failed (${health.consecutiveFailures} consecutive):`, error.message);
    
    // Update status
    if (health.consecutiveFailures >= this.policy.maxConsecutiveFailures) {
      health.status = 'unavailable';
      health.cooldownUntil = new Date(Date.now() + this.policy.cooldownMs).toISOString();
      console.warn(`[ProviderManager] Provider ${providerName} entering cooldown until ${health.cooldownUntil}`);
    } else {
      health.status = 'degraded';
    }
  }
  
  /**
   * Run health checks on all providers
   */
  private async runHealthChecks(): Promise<void> {
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
  }
  
  /**
   * Get all provider health statuses
   */
  async getAllStatuses(): Promise<Record<string, ProviderHealth>> {
    const statuses: Record<string, ProviderHealth> = {};
    
    for (const [name, health] of this.healthTracking.entries()) {
      statuses[name] = { ...health };
    }
    
    return statuses;
  }
  
  /**
   * Send message with provider selection and tracking
   */
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
  
  /**
   * Classify message with provider or fallback
   */
  async classifyMessage(message: string, context?: MessageContext): Promise<MessageClassification> {
    const provider = await this.getHealthyProvider(context?.thread_id);
    
    if (!provider) {
      // Fallback to simple keyword classification
      console.warn('[ProviderManager] No provider available, using keyword fallback');
      return this.simpleClassify(message);
    }
    
    try {
      return await provider.classifyMessage(message, context);
    } catch (error) {
      console.error('[ProviderManager] Classification failed:', error);
      return this.simpleClassify(message);
    }
  }
  
  /**
   * Simple keyword-based classification fallback
   */
  private simpleClassify(message: string): MessageClassification {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/^(pause|resume|retry|cancel|show|list)/)) {
      return 'command';
    }
    
    if (lowerMessage.includes('restart') ||
        lowerMessage.includes('recover') ||
        lowerMessage.includes('restore')) {
      return 'recovery';
    }
    
    if (lowerMessage.includes('why') ||
        lowerMessage.includes('explain') ||
        lowerMessage.includes('analyze')) {
      return 'reasoning';
    }
    
    if (lowerMessage.includes('organize') ||
        lowerMessage.includes('generate') ||
        lowerMessage.includes('create')) {
      return 'directive';
    }
    
    return 'informational';
  }
  
  /**
   * Get provider for thread
   */
  getProviderForThread(threadId: string): string | undefined {
    return this.activeThreads.get(threadId);
  }
  
  /**
   * Clear thread provider (e.g., on thread end)
   */
  clearThreadProvider(threadId: string): void {
    this.activeThreads.delete(threadId);
  }
}
