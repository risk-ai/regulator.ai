/**
 * History Store
 * 
 * Learning history persistence and impact tracking
 * Phase 18.1 — Learning Storage
 */

const crypto = require('crypto');

class HistoryStore {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Record learning history event
   */
  async recordHistory(history) {
    const historyId = history.history_id || this._generateId('hist');

    await this.stateGraph.run(
      `INSERT INTO learning_history (
        history_id, recommendation_id, action, reason,
        operator, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        history.recommendation_id,
        history.action,
        history.reason,
        history.operator,
        new Date().toISOString(),
        JSON.stringify(history.metadata || {})
      ]
    );

    return { ...history, history_id: historyId };
  }

  /**
   * Get history for recommendation
   */
  async getRecommendationHistory(recommendationId) {
    const rows = await this.stateGraph.all(
      `SELECT * FROM learning_history 
       WHERE recommendation_id = ? 
       ORDER BY timestamp ASC`,
      [recommendationId]
    );

    return rows.map(r => this._deserializeHistory(r));
  }

  /**
   * List history by operator
   */
  async listHistoryByOperator(operator, filters = {}) {
    let query = 'SELECT * FROM learning_history WHERE operator = ?';
    const params = [operator];

    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.since) {
      query += ' AND timestamp >= ?';
      params.push(filters.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeHistory(r));
  }

  /**
   * Get learning impact summary
   */
  async getLearningImpact(filters = {}) {
    const recommendations = filters.recommendation_ids || [];
    
    if (recommendations.length === 0) {
      return null;
    }

    const placeholders = recommendations.map(() => '?').join(',');
    
    const rows = await this.stateGraph.all(
      `SELECT * FROM learning_history 
       WHERE recommendation_id IN (${placeholders})
       AND action = 'applied'`,
      recommendations
    );

    if (rows.length === 0) {
      return null;
    }

    let totalTimeSavings = 0;
    let totalSuccessRateDelta = 0;
    let count = 0;

    for (const row of rows) {
      const metadata = JSON.parse(row.metadata || '{}');
      
      if (metadata.impact) {
        if (metadata.impact.time_reduction_pct) {
          totalTimeSavings += metadata.impact.time_reduction_pct;
        }
        if (metadata.impact.success_rate_delta) {
          totalSuccessRateDelta += metadata.impact.success_rate_delta;
        }
        count++;
      }
    }

    return {
      applied_count: rows.length,
      avg_time_reduction_pct: count > 0 ? totalTimeSavings / count : 0,
      avg_success_rate_delta: count > 0 ? totalSuccessRateDelta / count : 0,
      recommendations_analyzed: recommendations.length
    };
  }

  /**
   * Archive history
   */
  async archiveHistory(historyId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM learning_history WHERE history_id = ?`,
      [historyId]
    );

    if (!row) {
      throw new Error(`History not found: ${historyId}`);
    }

    await this.stateGraph.run(
      `DELETE FROM learning_history WHERE history_id = ?`,
      [historyId]
    );

    return this._deserializeHistory(row);
  }

  // Helper methods

  _deserializeHistory(row) {
    return {
      history_id: row.history_id,
      recommendation_id: row.recommendation_id,
      action: row.action,
      reason: row.reason,
      operator: row.operator,
      timestamp: row.timestamp,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = HistoryStore;
