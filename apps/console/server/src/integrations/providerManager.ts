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

// Inlined types to avoid cross-module type imports
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
  messages: Array<{ role: string; content: string }>;
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

// Dynamic import to handle TypeScript source in CommonJS context
let ProviderManagerClass: any = null;
let AnthropicProviderClass: any = null;
let LocalProviderClass: any = null;

/**
 * Initialize provider classes (lazy load)
 */
async function ensureProviderClasses() {
  if (!ProviderManagerClass) {
    const providerModule = await import('@vienna-lib/providers/index.js');
    ProviderManagerClass = providerModule.ProviderManager;
    AnthropicProviderClass = providerModule.AnthropicProvider;
    LocalProviderClass = providerModule.LocalProvider;
  }
}

/**
 * Provider Manager Bridge
 * 
 * Wraps ProviderManager instance with type-safe interface for server.
 */
export class ProviderManagerBridge {
  private manager: any = null;
  private initialized: boolean = false;

  constructor(private policy?: Partial<ProviderSelectionPolicy>) {}

  /**
   * Initialize provider manager and register providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ProviderManagerBridge] Initializing...');

    try {
      // Load provider classes
      await ensureProviderClasses();

      // Create manager instance
      this.manager = new ProviderManagerClass(this.policy);

      // Register Anthropic provider
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicApiKey) {
        const anthropic = new AnthropicProviderClass({
          apiKey: anthropicApiKey,
          name: 'anthropic',
        });
        this.manager.registerProvider(anthropic);
        console.log('[ProviderManagerBridge] Registered Anthropic provider');
      } else {
        console.warn('[ProviderManagerBridge] ANTHROPIC_API_KEY not set, skipping Anthropic provider');
      }

      // Register local Ollama provider
      const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
      const local = new LocalProviderClass({
        baseUrl: ollamaUrl,
        model: ollamaModel,
        name: 'local',
      });
      this.manager.registerProvider(local);
      console.log('[ProviderManagerBridge] Registered Local (Ollama) provider');

      // Start health monitoring
      this.manager.start();

      this.initialized = true;
      console.log('[ProviderManagerBridge] Initialized successfully');
    } catch (error) {
      console.error('[ProviderManagerBridge] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all provider statuses
   */
  async getAllStatuses(): Promise<Record<string, ProviderHealth>> {
    if (!this.initialized || !this.manager) {
      throw new Error('ProviderManagerBridge not initialized');
    }

    try {
      // Get health tracking map from manager
      const healthMap: Map<string, ProviderHealth> = this.manager.healthTracking;
      
      // Convert Map to plain object
      const statuses: Record<string, ProviderHealth> = {};
      for (const [name, health] of healthMap.entries()) {
        statuses[name] = health;
      }

      return statuses;
    } catch (error) {
      console.error('[ProviderManagerBridge] Failed to get provider statuses:', error);
      throw error;
    }
  }

  /**
   * Get status of specific provider
   */
  async getProviderStatus(providerName: string): Promise<ProviderHealth | null> {
    if (!this.initialized || !this.manager) {
      throw new Error('ProviderManagerBridge not initialized');
    }

    try {
      const healthMap: Map<string, ProviderHealth> = this.manager.healthTracking;
      return healthMap.get(providerName) || null;
    } catch (error) {
      console.error('[ProviderManagerBridge] Failed to get provider status:', error);
      throw error;
    }
  }

  /**
   * Send message through provider manager
   */
  async sendMessage(request: MessageRequest, threadId?: string): Promise<MessageResponse> {
    if (!this.initialized || !this.manager) {
      throw new Error('ProviderManagerBridge not initialized');
    }

    try {
      return await this.manager.sendMessage(request, threadId);
    } catch (error) {
      console.error('[ProviderManagerBridge] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get primary provider name
   */
  getPrimaryProvider(): string {
    if (!this.initialized || !this.manager) {
      return 'anthropic'; // Default
    }

    return this.manager.policy.primaryProvider || 'anthropic';
  }

  /**
   * Get fallback provider order
   */
  getFallbackOrder(): string[] {
    if (!this.initialized || !this.manager) {
      return ['anthropic', 'openclaw']; // Default
    }

    return this.manager.policy.fallbackOrder || ['anthropic', 'local'];
  }

  /**
   * Stop provider manager
   */
  stop(): void {
    if (this.manager) {
      this.manager.stop();
      console.log('[ProviderManagerBridge] Stopped');
    }
  }
}

/**
 * Create and initialize provider manager bridge
 */
export async function createProviderManagerBridge(
  policy?: Partial<ProviderSelectionPolicy>
): Promise<ProviderManagerBridge> {
  const bridge = new ProviderManagerBridge(policy);
  await bridge.initialize();
  return bridge;
}
