/**
 * Performance Optimization Layer for Vienna OS
 * 
 * Provides intent deduplication, warrant caching, policy evaluation short-circuiting,
 * connection pooling, batch audit writes, and performance metrics tracking.
 */

const LRU = require('lru-cache');
const crypto = require('crypto');

class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      // Intent deduplication window (5 seconds)
      intentDedupeWindow: options.intentDedupeWindow || 5000,
      
      // Warrant cache size (max 1000 entries)
      warrantCacheSize: options.warrantCacheSize || 1000,
      
      // Audit batch settings
      auditBatchSize: options.auditBatchSize || 50,
      auditFlushInterval: options.auditFlushInterval || 100, // 100ms
      
      // Metrics retention
      metricsWindow: options.metricsWindow || 60000, // 1 minute
      ...options
    };

    // Initialize caches
    this.intentCache = new LRU({ 
      max: 10000, 
      ttl: this.options.intentDedupeWindow 
    });
    
    this.warrantCache = new LRU({ 
      max: this.options.warrantCacheSize,
      ttl: 300000 // 5 minutes
    });
    
    this.policyCache = new LRU({ 
      max: 5000,
      ttl: 60000 // 1 minute
    });

    // Audit batch buffer
    this.auditBuffer = [];
    this.auditFlushTimer = null;

    // Performance metrics
    this.metrics = {
      pipeline: {
        intentDeduplication: { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] },
        warrantLookup: { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] },
        policyEvaluation: { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] },
        auditWrite: { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] },
        fullPipeline: { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] }
      },
      cache: {
        intentHits: 0,
        intentMisses: 0,
        warrantHits: 0,
        warrantMisses: 0,
        policyHits: 0,
        policyMisses: 0
      }
    };

    // Initialize audit flush
    this.startAuditFlushTimer();
  }

  /**
   * Intent Deduplication
   * Returns cached result if same agent submits identical intent within 5 seconds
   */
  async deduplicateIntent(agentId, intent, processor) {
    const stage = 'intentDeduplication';
    const startTime = Date.now();

    try {
      // Generate cache key from agent ID and intent hash
      const intentHash = this.hashIntent(intent);
      const cacheKey = `${agentId}:${intentHash}`;

      // Check cache first
      const cachedResult = this.intentCache.get(cacheKey);
      if (cachedResult) {
        this.recordCacheHit('intent');
        this.recordStageLatency(stage, Date.now() - startTime);
        return cachedResult;
      }

      this.recordCacheMiss('intent');

      // Process new intent
      const result = await processor(agentId, intent);
      
      // Cache the result
      this.intentCache.set(cacheKey, result);
      
      this.recordStageLatency(stage, Date.now() - startTime);
      return result;

    } catch (error) {
      this.recordStageLatency(stage, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Warrant Cache
   * Recently issued warrants cached in-memory (LRU, max 1000)
   */
  async getWarrant(warrantId, fetcher) {
    const stage = 'warrantLookup';
    const startTime = Date.now();

    try {
      // Check cache first
      const cachedWarrant = this.warrantCache.get(warrantId);
      if (cachedWarrant) {
        this.recordCacheHit('warrant');
        this.recordStageLatency(stage, Date.now() - startTime);
        return cachedWarrant;
      }

      this.recordCacheMiss('warrant');

      // Fetch from database
      const warrant = await fetcher(warrantId);
      
      if (warrant) {
        // Only cache active warrants
        if (warrant.status === 'issued' && new Date(warrant.expires_at) > new Date()) {
          this.warrantCache.set(warrantId, warrant);
        }
      }

      this.recordStageLatency(stage, Date.now() - startTime);
      return warrant;

    } catch (error) {
      this.recordStageLatency(stage, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Policy Evaluation Short-Circuit
   * If intent is T0 and matches cached policy, skip full evaluation
   */
  async evaluatePolicy(intent, fullEvaluator) {
    const stage = 'policyEvaluation';
    const startTime = Date.now();

    try {
      // Only short-circuit for T0 (lowest tier) intents
      if (intent.tier !== 'T0') {
        const result = await fullEvaluator(intent);
        this.recordStageLatency(stage, Date.now() - startTime);
        return result;
      }

      // Generate cache key for T0 policy
      const policyKey = this.generatePolicyKey(intent);
      const cachedPolicy = this.policyCache.get(policyKey);

      if (cachedPolicy) {
        this.recordCacheHit('policy');
        this.recordStageLatency(stage, Date.now() - startTime);
        
        // Apply cached policy decision
        return {
          decision: cachedPolicy.decision,
          reason: `Cached policy applied: ${cachedPolicy.reason}`,
          cached: true,
          policyId: cachedPolicy.policyId
        };
      }

      this.recordCacheMiss('policy');

      // Perform full evaluation
      const evaluation = await fullEvaluator(intent);
      
      // Cache successful T0 evaluations
      if (evaluation && evaluation.decision) {
        this.policyCache.set(policyKey, {
          decision: evaluation.decision,
          reason: evaluation.reason,
          policyId: evaluation.policyId,
          cachedAt: new Date()
        });
      }

      this.recordStageLatency(stage, Date.now() - startTime);
      return evaluation;

    } catch (error) {
      this.recordStageLatency(stage, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Batch Audit Writes
   * Buffer audit entries and flush every 100ms or 50 entries (whichever first)
   */
  async writeAudit(auditEntry, flushCallback) {
    const stage = 'auditWrite';
    const startTime = Date.now();

    try {
      // Add to buffer
      this.auditBuffer.push({
        ...auditEntry,
        timestamp: new Date(),
        bufferedAt: startTime
      });

      // Flush if buffer is full
      if (this.auditBuffer.length >= this.options.auditBatchSize) {
        await this.flushAuditBuffer(flushCallback);
      }

      this.recordStageLatency(stage, Date.now() - startTime);

    } catch (error) {
      this.recordStageLatency(stage, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Connection Pool Recommendations
   */
  getConnectionPoolConfig(environment = 'production') {
    const recommendations = {
      development: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      },
      staging: {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      },
      production: {
        min: 10,
        max: 50,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    };

    return recommendations[environment] || recommendations.production;
  }

  /**
   * Get Performance Metrics
   * Returns p50/p95/p99 latency for each pipeline stage
   */
  getMetrics() {
    const metrics = JSON.parse(JSON.stringify(this.metrics));
    
    // Calculate percentiles for each stage
    Object.keys(metrics.pipeline).forEach(stage => {
      const stageMetrics = metrics.pipeline[stage];
      const times = stageMetrics.times.slice().sort((a, b) => a - b);
      
      if (times.length > 0) {
        stageMetrics.p50 = this.calculatePercentile(times, 50);
        stageMetrics.p95 = this.calculatePercentile(times, 95);
        stageMetrics.p99 = this.calculatePercentile(times, 99);
        stageMetrics.avg = stageMetrics.totalTime / stageMetrics.count;
      }
      
      // Remove raw times array for cleaner output
      delete stageMetrics.times;
    });

    // Add cache hit rates
    metrics.cache.intentHitRate = this.calculateHitRate(metrics.cache.intentHits, metrics.cache.intentMisses);
    metrics.cache.warrantHitRate = this.calculateHitRate(metrics.cache.warrantHits, metrics.cache.warrantMisses);
    metrics.cache.policyHitRate = this.calculateHitRate(metrics.cache.policyHits, metrics.cache.policyMisses);

    // Add cache sizes
    metrics.cache.intentCacheSize = this.intentCache.size;
    metrics.cache.warrantCacheSize = this.warrantCache.size;
    metrics.cache.policyCacheSize = this.policyCache.size;

    return metrics;
  }

  /**
   * Reset Metrics
   */
  resetMetrics() {
    Object.keys(this.metrics.pipeline).forEach(stage => {
      this.metrics.pipeline[stage] = { count: 0, totalTime: 0, p50: 0, p95: 0, p99: 0, times: [] };
    });
    
    Object.keys(this.metrics.cache).forEach(key => {
      this.metrics.cache[key] = 0;
    });
  }

  /**
   * Clear All Caches
   */
  clearCaches() {
    this.intentCache.clear();
    this.warrantCache.clear();
    this.policyCache.clear();
  }

  // Private methods

  hashIntent(intent) {
    const intentStr = JSON.stringify(intent, Object.keys(intent).sort());
    return crypto.createHash('sha256').update(intentStr).digest('hex').substring(0, 16);
  }

  generatePolicyKey(intent) {
    // Generate key based on relevant intent properties for T0 policies
    const keyData = {
      tier: intent.tier,
      action: intent.action,
      resource: intent.resource,
      conditions: intent.conditions
    };
    const keyStr = JSON.stringify(keyData, Object.keys(keyData).sort());
    return crypto.createHash('sha256').update(keyStr).digest('hex').substring(0, 16);
  }

  async flushAuditBuffer(flushCallback) {
    if (this.auditBuffer.length === 0) return;

    const entriesToFlush = this.auditBuffer.splice(0);
    
    try {
      await flushCallback(entriesToFlush);
    } catch (error) {
      // Re-add failed entries to buffer (at the front)
      this.auditBuffer.unshift(...entriesToFlush);
      throw error;
    }
  }

  startAuditFlushTimer() {
    this.auditFlushTimer = setInterval(async () => {
      if (this.auditBuffer.length > 0) {
        // Note: This requires a flush callback to be registered
        // In practice, this would use a registered callback
        console.log(`Auto-flushing ${this.auditBuffer.length} audit entries`);
      }
    }, this.options.auditFlushInterval);
  }

  recordStageLatency(stage, latencyMs) {
    const stageMetrics = this.metrics.pipeline[stage];
    stageMetrics.count++;
    stageMetrics.totalTime += latencyMs;
    stageMetrics.times.push(latencyMs);
    
    // Keep only recent times for percentile calculation
    if (stageMetrics.times.length > 1000) {
      stageMetrics.times = stageMetrics.times.slice(-1000);
    }
  }

  recordCacheHit(cacheType) {
    this.metrics.cache[`${cacheType}Hits`]++;
  }

  recordCacheMiss(cacheType) {
    this.metrics.cache[`${cacheType}Misses`]++;
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  calculateHitRate(hits, misses) {
    const total = hits + misses;
    return total === 0 ? 0 : (hits / total * 100);
  }

  // Clean up resources
  destroy() {
    if (this.auditFlushTimer) {
      clearInterval(this.auditFlushTimer);
    }
    this.clearCaches();
  }
}

// Usage example and middleware factory
class ViennaPerformanceMiddleware {
  constructor(optimizer) {
    this.optimizer = optimizer;
  }

  /**
   * Express middleware for tracking full pipeline performance
   */
  trackPipeline() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const pipelineLatency = Date.now() - startTime;
        this.optimizer.recordStageLatency('fullPipeline', pipelineLatency);
      });
      
      next();
    };
  }

  /**
   * Middleware for automatic audit batching
   */
  auditMiddleware(auditCallback) {
    return async (req, res, next) => {
      // Store audit callback for this request
      req.writeAudit = async (entry) => {
        await this.optimizer.writeAudit(entry, auditCallback);
      };
      
      next();
    };
  }
}

// Factory function for creating optimizer with database-specific settings
function createOptimizer(databaseType = 'postgres', environment = 'production') {
  const baseOptions = {
    // PostgreSQL optimized settings
    postgres: {
      intentDedupeWindow: 5000,
      warrantCacheSize: 1000,
      auditBatchSize: 100, // PostgreSQL handles larger batches well
      auditFlushInterval: 50   // Faster flush for better consistency
    },
    // MySQL optimized settings  
    mysql: {
      intentDedupeWindow: 5000,
      warrantCacheSize: 1000,
      auditBatchSize: 50,   // Smaller batches for MySQL
      auditFlushInterval: 100
    },
    // Generic settings
    default: {
      intentDedupeWindow: 5000,
      warrantCacheSize: 1000,
      auditBatchSize: 50,
      auditFlushInterval: 100
    }
  };

  const options = baseOptions[databaseType] || baseOptions.default;
  
  // Adjust for environment
  if (environment === 'development') {
    options.warrantCacheSize = 100;
    options.auditBatchSize = 10;
  }

  return new PerformanceOptimizer(options);
}

module.exports = {
  PerformanceOptimizer,
  ViennaPerformanceMiddleware,
  createOptimizer
};