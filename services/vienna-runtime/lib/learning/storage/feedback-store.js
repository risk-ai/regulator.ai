/**
 * Feedback Store
 * 
 * Operator feedback persistence and aggregation
 * Phase 18.1 — Learning Storage
 */

const crypto = require('crypto');

class FeedbackStore {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Record operator feedback
   */
  async recordFeedback(feedback) {
    const feedbackId = feedback.feedback_id || this._generateId('fb');

    await this.stateGraph.run(
      `INSERT INTO operator_feedback (
        feedback_id, source, action_type, target_id, operator,
        decision, reason, timestamp, context, processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedbackId,
        feedback.source,
        feedback.action_type,
        feedback.target_id,
        feedback.operator,
        feedback.decision,
        feedback.reason,
        new Date().toISOString(),
        JSON.stringify(feedback.context || {}),
        0
      ]
    );

    return { ...feedback, feedback_id: feedbackId };
  }

  /**
   * List unprocessed feedback
   */
  async listUnprocessedFeedback(filters = {}) {
    let query = 'SELECT * FROM operator_feedback WHERE processed = 0';
    const params = [];

    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    if (filters.action_type) {
      query += ' AND action_type = ?';
      params.push(filters.action_type);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeFeedback(r));
  }

  /**
   * Mark feedback as processed
   */
  async markFeedbackProcessed(feedbackId, metadata = {}) {
    await this.stateGraph.run(
      `UPDATE operator_feedback 
       SET processed = 1, processed_at = ? 
       WHERE feedback_id = ?`,
      [new Date().toISOString(), feedbackId]
    );
  }

  /**
   * Get feedback summary by action
   */
  async getFeedbackSummary(filters = {}) {
    let query = 'SELECT * FROM operator_feedback WHERE 1=1';
    const params = [];

    if (filters.action_type) {
      query += ' AND action_type = ?';
      params.push(filters.action_type);
    }

    if (filters.target_id) {
      query += ' AND target_id = ?';
      params.push(filters.target_id);
    }

    if (filters.since) {
      query += ' AND timestamp >= ?';
      params.push(filters.since);
    }

    const rows = await this.stateGraph.all(query, params);

    if (rows.length === 0) {
      return {
        total: 0,
        approved: 0,
        denied: 0,
        avg_approval_time_ms: 0
      };
    }

    const approved = rows.filter(r => r.decision === 'approved');
    const denied = rows.filter(r => r.decision === 'denied');

    const approvalTimes = approved
      .map(r => {
        const context = JSON.parse(r.context || '{}');
        return context.time_to_decision_ms || 0;
      })
      .filter(t => t > 0);

    return {
      total: rows.length,
      approved: approved.length,
      denied: denied.length,
      avg_approval_time_ms: approvalTimes.length > 0 
        ? approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length 
        : 0
    };
  }

  /**
   * Archive feedback
   */
  async archiveFeedback(feedbackId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM operator_feedback WHERE feedback_id = ?`,
      [feedbackId]
    );

    if (!row) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    await this.stateGraph.run(
      `DELETE FROM operator_feedback WHERE feedback_id = ?`,
      [feedbackId]
    );

    return this._deserializeFeedback(row);
  }

  // Helper methods

  _deserializeFeedback(row) {
    return {
      feedback_id: row.feedback_id,
      source: row.source,
      action_type: row.action_type,
      target_id: row.target_id,
      operator: row.operator,
      decision: row.decision,
      reason: row.reason,
      timestamp: row.timestamp,
      context: JSON.parse(row.context || '{}'),
      processed: row.processed === 1,
      processed_at: row.processed_at
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = FeedbackStore;
