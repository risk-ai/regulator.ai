/**
 * Provider Health Checker Service
 * 
 * Periodically tests provider connectivity and updates State Graph.
 * Ensures provider health is always current, not stale.
 */

export class ProviderHealthChecker {
  private interval: NodeJS.Timeout | null = null;
  private checkIntervalMs: number;
  private running: boolean = false;
  
  constructor(checkIntervalMs: number = 30000) {
    this.checkIntervalMs = checkIntervalMs;
  }
  
  /**
   * Start periodic health checks
   */
  start(): void {
    if (this.running) return;
    
    console.log('[ProviderHealthChecker] Starting periodic health checks (every 30s)');
    this.running = true;
    
    // Run immediately
    this.checkAllProviders().catch(error => {
      console.error('[ProviderHealthChecker] Initial check failed:', error);
    });
    
    // Then run periodically
    this.interval = setInterval(() => {
      this.checkAllProviders().catch(error => {
        console.error('[ProviderHealthChecker] Periodic check failed:', error);
      });
    }, this.checkIntervalMs);
  }
  
  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    console.log('[ProviderHealthChecker] Stopped');
  }
  
  /**
   * Check all providers and update State Graph
   */
  private async checkAllProviders(): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Check Anthropic
    await this.checkAnthropicProvider(timestamp);
    
    // Check Local Ollama
    await this.checkLocalProvider(timestamp);
  }
  
  /**
   * Check Anthropic provider
   */
  private async checkAnthropicProvider(timestamp: string): Promise<void> {
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      
      if (!anthropicKey) {
        console.warn('[ProviderHealthChecker] ANTHROPIC_API_KEY not set');
        await this.updateStateGraph('anthropic', 'inactive', 'unhealthy', timestamp, 'No API key');
        return;
      }
      
      // Dynamic import to avoid module issues
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: anthropicKey });
      
      const startTime = Date.now();
      
      try {
        await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'health check' }],
        });
        
        const latency = Date.now() - startTime;
        
        await this.updateStateGraph('anthropic', 'active', 'healthy', timestamp, null, latency);
        console.log(`[ProviderHealthChecker] Anthropic: ✓ healthy (${latency}ms)`);
        
      } catch (error: any) {
        const latency = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error';
        
        // Check if it's a rate limit or session timeout
        if (error.status === 429 || errorMessage.includes('rate_limit')) {
          console.warn('[ProviderHealthChecker] Anthropic: rate limited, trying backup key...');
          await this.tryBackupAnthropicKey(timestamp);
        } else if (error.status === 401 || errorMessage.includes('authentication')) {
          console.error('[ProviderHealthChecker] Anthropic: authentication failed');
          await this.updateStateGraph('anthropic', 'degraded', 'unhealthy', timestamp, 'Authentication failed', latency);
        } else {
          console.error('[ProviderHealthChecker] Anthropic: unhealthy -', errorMessage);
          await this.updateStateGraph('anthropic', 'degraded', 'unhealthy', timestamp, errorMessage, latency);
        }
      }
      
    } catch (error) {
      console.error('[ProviderHealthChecker] Anthropic check error:', error);
      await this.updateStateGraph('anthropic', 'failed', 'unhealthy', timestamp, 'Check failed');
    }
  }
  
  /**
   * Try backup Anthropic API key if available
   */
  private async tryBackupAnthropicKey(timestamp: string): Promise<void> {
    const backupKey = process.env.ANTHROPIC_API_KEY_BACKUP;
    
    if (!backupKey) {
      console.warn('[ProviderHealthChecker] No ANTHROPIC_API_KEY_BACKUP configured');
      await this.updateStateGraph('anthropic', 'degraded', 'rate_limited', timestamp, 'Rate limited, no backup key');
      return;
    }
    
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: backupKey });
      
      const startTime = Date.now();
      
      await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'health check' }],
      });
      
      const latency = Date.now() - startTime;
      
      // Swap keys
      process.env.ANTHROPIC_API_KEY = backupKey;
      console.log('[ProviderHealthChecker] ✓ Rotated to backup Anthropic key');
      
      await this.updateStateGraph('anthropic', 'active', 'healthy', timestamp, 'Using backup key', latency);
      
    } catch (error: any) {
      console.error('[ProviderHealthChecker] Backup Anthropic key also failed:', error.message);
      await this.updateStateGraph('anthropic', 'failed', 'unhealthy', timestamp, 'Primary and backup keys failed');
    }
  }
  
  /**
   * Check Local Ollama provider
   */
  private async checkLocalProvider(timestamp: string): Promise<void> {
    // Skip if Ollama not configured
    if (!process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_ENABLED) {
      // Silent skip - Ollama is optional
      await this.updateStateGraph('local', 'inactive', 'disabled', timestamp, 'Ollama not configured');
      return;
    }
    
    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
      
      const startTime = Date.now();
      
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: 'health check',
          stream: false,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        await this.updateStateGraph('local', 'active', 'healthy', timestamp, null, latency);
        console.log(`[ProviderHealthChecker] Local: ✓ healthy (${latency}ms)`);
      } else {
        const error = await response.text();
        // Only log once, not repeatedly
        await this.updateStateGraph('local', 'degraded', 'unhealthy', timestamp, error, latency);
      }
      
    } catch (error: any) {
      // Silently mark as unavailable (don't spam logs)
      await this.updateStateGraph('local', 'failed', 'unavailable', timestamp, 'Ollama offline');
      // Don't attempt restart - it's optional
    }
  }
  
  /**
   * Restart Ollama service (REMOVED - Ollama is optional)
   */
  private async restartOllama(): Promise<void> {
    // No-op: Ollama restart removed
    // If needed, user can manually start: systemctl --user start ollama
  }
  
  /**
   * Update State Graph with provider health
   * 
   * Note: This method is deprecated and should be removed.
   * Provider health is now tracked in ProviderHealthService only.
   * State Graph updates are not needed for provider health.
   */
  private async updateStateGraph(
    providerId: string,
    status: string,
    health: string,
    timestamp: string,
    errorMessage: string | null = null,
    latencyMs?: number
  ): Promise<void> {
    // Deprecated: Provider health is tracked in ProviderHealthService
    // State Graph updates removed to avoid SQLite/Postgres conflicts
    // This method is kept for API compatibility but does nothing
    return;
  }
}
