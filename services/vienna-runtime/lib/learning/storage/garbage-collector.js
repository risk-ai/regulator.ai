/**
 * Garbage Collector
 * 
 * Confidence decay and retention policy enforcement
 * Phase 18.1 — Learning Storage
 */

class GarbageCollector {
  constructor(stateGraph, patternStore, recommendationStore, historyStore) {
    this.stateGraph = stateGraph;
    this.patternStore = patternStore;
    this.recommendationStore = recommendationStore;
    this.historyStore = historyStore;
  }

  /**
   * Run confidence decay for all active patterns
   */
  async runConfidenceDecay(options = {}) {
    const halfLifeDays = options.halfLifeDays || 30;
    const minConfidence = options.minConfidence || 0.5;
    const decayFactor = 0.5;

    const activePatterns = await this.patternStore.listPatterns({ status: 'active' });

    let decayed = 0;
    let expired = 0;

    for (const pattern of activePatterns) {
      const daysSinceObserved = (Date.now() - new Date(pattern.last_observed_at).getTime()) / (24 * 60 * 60 * 1000);
      const newConfidence = pattern.confidence * Math.pow(decayFactor, daysSinceObserved / halfLifeDays);

      if (newConfidence < minConfidence) {
        await this.patternStore.updatePattern(pattern.pattern_id, { status: 'expired' });
        expired++;
      } else if (newConfidence !== pattern.confidence) {
        await this.patternStore.updatePattern(pattern.pattern_id, { confidence: newConfidence });
        decayed++;
      }
    }

    return { decayed, expired };
  }

  /**
   * Archive old recommendations
   */
  async archiveOldRecommendations(options = {}) {
    const retentionDays = options.retentionDays || 90;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Archive applied recommendations older than retention period
    const applied = await this.recommendationStore.listRecommendations({
      status: 'applied',
      limit: 1000
    });

    const toArchive = applied.filter(r => r.applied_at && r.applied_at < cutoff);

    for (const rec of toArchive) {
      await this.recommendationStore.archiveRecommendation(rec.recommendation_id);
    }

    // Archive denied recommendations older than retention period
    const denied = await this.recommendationStore.listRecommendations({
      status: 'denied',
      limit: 1000
    });

    const deniedToArchive = denied.filter(r => r.created_at < cutoff);

    for (const rec of deniedToArchive) {
      await this.recommendationStore.archiveRecommendation(rec.recommendation_id);
    }

    return { archived: toArchive.length + deniedToArchive.length };
  }

  /**
   * Archive old history
   */
  async archiveOldHistory(options = {}) {
    const retentionDays = options.retentionDays || 365;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await this.stateGraph.all(
      `SELECT * FROM learning_history WHERE timestamp < ?`,
      [cutoff]
    );

    for (const row of rows) {
      await this.historyStore.archiveHistory(row.history_id);
    }

    return { archived: rows.length };
  }

  /**
   * Archive expired patterns
   */
  async archiveExpiredPatterns() {
    const expiredPatterns = await this.patternStore.listPatterns({ status: 'expired' });

    for (const pattern of expiredPatterns) {
      await this.patternStore.archivePattern(pattern.pattern_id);
    }

    return { archived: expiredPatterns.length };
  }

  /**
   * Run full garbage collection
   */
  async runFullGarbageCollection(options = {}) {
    const results = {};

    // Confidence decay
    results.decay = await this.runConfidenceDecay(options);

    // Archive old recommendations
    results.recommendations = await this.archiveOldRecommendations(options);

    // Archive old history
    results.history = await this.archiveOldHistory(options);

    // Archive expired patterns
    results.patterns = await this.archiveExpiredPatterns();

    return results;
  }
}

module.exports = GarbageCollector;
