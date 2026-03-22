/**
 * Recommendation Store
 * 
 * CRUD operations for learning recommendations
 * Phase 18.1 — Learning Storage
 */

const crypto = require('crypto');

class RecommendationStore {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Create recommendation
   */
  async createRecommendation(recommendation) {
    const recommendationId = recommendation.recommendation_id || this._generateId('rec');

    await this.stateGraph.run(
      `INSERT INTO learning_recommendations (
        recommendation_id, recommendation_type, target_policy_id,
        proposed_change, pattern_id, confidence, evidence,
        auto_apply_eligible, requires_approval, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recommendationId,
        recommendation.recommendation_type,
        recommendation.target_policy_id,
        JSON.stringify(recommendation.proposed_change || {}),
        recommendation.pattern_id,
        recommendation.confidence,
        JSON.stringify(recommendation.evidence || {}),
        recommendation.auto_apply_eligible ? 1 : 0,
        recommendation.requires_approval ? 1 : 0,
        'pending',
        new Date().toISOString()
      ]
    );

    return { ...recommendation, recommendation_id: recommendationId };
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendation(recommendationId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM learning_recommendations WHERE recommendation_id = ?`,
      [recommendationId]
    );

    if (!row) return null;

    return this._deserializeRecommendation(row);
  }

  /**
   * List recommendations
   */
  async listRecommendations(filters = {}) {
    let query = 'SELECT * FROM learning_recommendations WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.recommendation_type) {
      query += ' AND recommendation_type = ?';
      params.push(filters.recommendation_type);
    }

    if (filters.min_confidence !== undefined) {
      query += ' AND confidence >= ?';
      params.push(filters.min_confidence);
    }

    if (filters.auto_apply_eligible !== undefined) {
      query += ' AND auto_apply_eligible = ?';
      params.push(filters.auto_apply_eligible ? 1 : 0);
    }

    query += ' ORDER BY confidence DESC, created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeRecommendation(r));
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(recommendationId, status, metadata = {}) {
    const fields = ['status = ?'];
    const params = [status];

    if (status === 'applied') {
      fields.push('applied_at = ?');
      params.push(new Date().toISOString());
    }

    if (status === 'reverted') {
      fields.push('reverted_at = ?');
      params.push(new Date().toISOString());
    }

    if (status === 'approved') {
      fields.push('approved_by = ?');
      params.push(metadata.approved_by);
    }

    if (status === 'denied') {
      fields.push('denied_by = ?', 'denial_reason = ?');
      params.push(metadata.denied_by, metadata.denial_reason);
    }

    params.push(recommendationId);

    await this.stateGraph.run(
      `UPDATE learning_recommendations SET ${fields.join(', ')} WHERE recommendation_id = ?`,
      params
    );
  }

  /**
   * List applied recommendations (for regression monitoring)
   */
  async listAppliedRecommendations(options = {}) {
    let query = 'SELECT * FROM learning_recommendations WHERE status = ?';
    const params = ['applied'];

    if (options.applied_since) {
      query += ' AND applied_at >= ?';
      params.push(options.applied_since);
    }

    query += ' ORDER BY applied_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeRecommendation(r));
  }

  /**
   * Get recommendation with full context
   */
  async getRecommendationWithContext(recommendationId) {
    const recommendation = await this.getRecommendation(recommendationId);

    if (!recommendation) return null;

    // Get linked pattern
    const pattern = recommendation.pattern_id 
      ? await this.stateGraph.get(`SELECT * FROM learning_patterns WHERE pattern_id = ?`, [recommendation.pattern_id])
      : null;

    return {
      ...recommendation,
      pattern
    };
  }

  /**
   * Archive recommendation
   */
  async archiveRecommendation(recommendationId) {
    const recommendation = await this.getRecommendation(recommendationId);

    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    await this.stateGraph.run(
      `DELETE FROM learning_recommendations WHERE recommendation_id = ?`,
      [recommendationId]
    );

    return recommendation;
  }

  // Helper methods

  _deserializeRecommendation(row) {
    return {
      recommendation_id: row.recommendation_id,
      recommendation_type: row.recommendation_type,
      target_policy_id: row.target_policy_id,
      proposed_change: JSON.parse(row.proposed_change || '{}'),
      pattern_id: row.pattern_id,
      confidence: row.confidence,
      evidence: JSON.parse(row.evidence || '{}'),
      auto_apply_eligible: row.auto_apply_eligible === 1,
      requires_approval: row.requires_approval === 1,
      status: row.status,
      created_at: row.created_at,
      applied_at: row.applied_at,
      reverted_at: row.reverted_at,
      approved_by: row.approved_by,
      denied_by: row.denied_by,
      denial_reason: row.denial_reason
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = RecommendationStore;
