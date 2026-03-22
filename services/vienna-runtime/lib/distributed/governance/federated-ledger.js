/**
 * Federated Ledger
 * 
 * Centralized audit trail across all nodes
 * Phase 20 — Distributed Governance
 */

const crypto = require('crypto');

class FederatedLedger {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Emit federated event
   */
  async emitEvent(sourceNodeId, eventType, executionId, metadata = {}) {
    const eventId = this._generateId('fevent');

    await this.stateGraph.run(
      `INSERT INTO federated_ledger_events (
        event_id, source_node_id, event_type, execution_id,
        timestamp, metadata, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        sourceNodeId,
        eventType,
        executionId,
        metadata.timestamp || new Date().toISOString(),
        JSON.stringify(metadata),
        new Date().toISOString()
      ]
    );

    return eventId;
  }

  /**
   * Get events for execution
   */
  async getExecutionEvents(executionId) {
    const rows = await this.stateGraph.all(
      `SELECT * FROM federated_ledger_events 
       WHERE execution_id = ? 
       ORDER BY timestamp ASC`,
      [executionId]
    );

    return rows.map(r => this._deserializeEvent(r));
  }

  /**
   * Get events by node
   */
  async getNodeEvents(sourceNodeId, filters = {}) {
    let query = 'SELECT * FROM federated_ledger_events WHERE source_node_id = ?';
    const params = [sourceNodeId];

    if (filters.event_type) {
      query += ' AND event_type = ?';
      params.push(filters.event_type);
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

    return rows.map(r => this._deserializeEvent(r));
  }

  /**
   * Get execution timeline
   */
  async getExecutionTimeline(executionId) {
    const events = await this.getExecutionEvents(executionId);

    return {
      execution_id: executionId,
      events: events.map(e => ({
        node_id: e.source_node_id,
        event_type: e.event_type,
        timestamp: e.timestamp
      })),
      total: events.length
    };
  }

  /**
   * Query events
   */
  async queryEvents(filters = {}) {
    let query = 'SELECT * FROM federated_ledger_events WHERE 1=1';
    const params = [];

    if (filters.execution_id) {
      query += ' AND execution_id = ?';
      params.push(filters.execution_id);
    }

    if (filters.source_node_id) {
      query += ' AND source_node_id = ?';
      params.push(filters.source_node_id);
    }

    if (filters.event_type) {
      query += ' AND event_type = ?';
      params.push(filters.event_type);
    }

    if (filters.since) {
      query += ' AND timestamp >= ?';
      params.push(filters.since);
    }

    if (filters.until) {
      query += ' AND timestamp <= ?';
      params.push(filters.until);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.stateGraph.all(query, params);

    return rows.map(r => this._deserializeEvent(r));
  }

  // Helper methods

  _deserializeEvent(row) {
    return {
      event_id: row.event_id,
      source_node_id: row.source_node_id,
      event_type: row.event_type,
      execution_id: row.execution_id,
      timestamp: row.timestamp,
      metadata: JSON.parse(row.metadata || '{}'),
      received_at: row.received_at
    };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = FederatedLedger;
