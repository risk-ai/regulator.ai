/**
 * Pattern Store
 * 
 * CRUD operations for learning patterns
 * Phase 18.1 — Learning Storage
 */

const crypto = require('crypto');

class PatternStore {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Create pattern
   */
  async createPattern(pattern) {
    const patternId = pattern.pattern_id || this._generateId('pat');

    await this.stateGraph.run(
      `INSERT INTO learning_patterns (
        pattern_id, pattern_type, action_type, target_id,
        observation_window_days, event_count, confidence,
        metadata, created_at, last_observed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patternId,
        pattern.pattern_type,
        pattern.action_type,
        pattern.target_id,
        pattern.observation_window_days,
        pattern.event_count,
        pattern.confidence,
        JSON.stringify(pattern.metadata || {}),
        new Date().toISOString(),
        new Date().toISOString(),
        'active'
      ]
    );

    return { ...pattern, pattern_id: patternId };
  }

  /**
   * Get pattern by ID
   */
  async getPattern(patternId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM learning_patterns WHERE pattern_id = ?`,
      [patternId]
    );

    if (!row) return null;

    return this._deserializePattern(row);
  }

  /**
   * List patterns
   */
  async listPatterns(filters = {}) {
    let query = 'SELECT * FROM learning_patterns WHERE 1=1';
    const params = [];

    if (filters.pattern_type) {
      query += ' AND pattern_type = ?';
      params.push(filters.pattern_type);
    }

    if (filters.action_type) {
      query += ' AND action_type = ?';
      params.push(filters.action_type);
    }

    if (filters.target_id) {
      query += ' AND target_id = ?';
      params.push(filters.target_id);
    }

    if (filters.min_confidence !== undefined) {
      query += ' AND confidence >= ?';
      params.push(filters.min_confidence);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY confidence DESC, last_observed_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializePattern(r));
  }

  /**
   * Update pattern
   */
  async updatePattern(patternId, updates) {
    const fields = [];
    const params = [];

    if (updates.confidence !== undefined) {
      fields.push('confidence = ?');
      params.push(updates.confidence);
    }

    if (updates.event_count !== undefined) {
      fields.push('event_count = ?');
      params.push(updates.event_count);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.superseded_by !== undefined) {
      fields.push('superseded_by = ?');
      params.push(updates.superseded_by);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return;
    }

    params.push(patternId);

    await this.stateGraph.run(
      `UPDATE learning_patterns SET ${fields.join(', ')} WHERE pattern_id = ?`,
      params
    );
  }

  /**
   * Update pattern confidence with decay
   */
  async updatePatternConfidence(patternId, decayFactor) {
    const pattern = await this.getPattern(patternId);

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    const daysSinceObserved = (Date.now() - new Date(pattern.last_observed_at).getTime()) / (24 * 60 * 60 * 1000);
    const newConfidence = pattern.confidence * Math.pow(decayFactor, daysSinceObserved / 30);

    if (newConfidence < 0.5) {
      await this.updatePattern(patternId, { status: 'expired' });
    } else {
      await this.updatePattern(patternId, { confidence: newConfidence });
    }

    return newConfidence;
  }

  /**
   * Supersede pattern
   */
  async supersedePattern(oldPatternId, newPatternId) {
    await this.updatePattern(oldPatternId, {
      status: 'superseded',
      superseded_by: newPatternId
    });
  }

  /**
   * Get pattern evolution chain
   */
  async getPatternEvolution(patternId) {
    const chain = [];
    let currentId = patternId;

    while (currentId) {
      const pattern = await this.getPattern(currentId);
      
      if (!pattern) break;

      chain.push(pattern);

      // Find pattern that supersedes this one
      const next = await this.stateGraph.get(
        `SELECT * FROM learning_patterns WHERE superseded_by = ?`,
        [currentId]
      );

      currentId = next ? next.pattern_id : null;
    }

    return chain;
  }

  /**
   * Archive pattern
   */
  async archivePattern(patternId) {
    const pattern = await this.getPattern(patternId);

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    // Delete from active storage
    await this.stateGraph.run(
      `DELETE FROM learning_patterns WHERE pattern_id = ?`,
      [patternId]
    );

    return pattern;
  }

  // Helper methods

  _deserializePattern(row) {
    return {
      pattern_id: row.pattern_id,
      pattern_type: row.pattern_type,
      action_type: row.action_type,
      target_id: row.target_id,
      observation_window_days: row.observation_window_days,
      event_count: row.event_count,
      confidence: row.confidence,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: row.created_at,
      last_observed_at: row.last_observed_at,
      superseded_by: row.superseded_by,
      status: row.status
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = PatternStore;
